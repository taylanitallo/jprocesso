const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Tenant = require('../models/Tenant');
const { getTenantConnection, masterDb } = require('../config/database');
const initTenantModels = require('../models');
const { registrarLog } = require('../middleware/activityLogger');
const { excluir } = require('../services/lixeiraService');

// ── Refresh Tokens — persistidos em PostgreSQL (por schema) ──────────────────
// Tenant users  → tabela refresh_tokens no schema do tenant
// Admin users   → tabela public.refresh_tokens no masterDb
// Substitui o Map em memória anterior que era perdido a cada redeploy.

const REFRESH_EXPIRE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Retorna o segredo do refresh token; lança erro em produção se a variável
// obrigatória REFRESH_TOKEN_SECRET não estiver definida.
const _getRefreshSecret = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(
      '[SEGURANÇA] REFRESH_TOKEN_SECRET é obrigatório em NODE_ENV=production. '
      + 'Configure a variável de ambiente com um segredo distinto de JWT_SECRET.'
    );
  }
  return process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
};

// Gera o JWT do refresh token e calcula seu hash (sem gravar no banco).
const _buildRefreshToken = (payload) => {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, _getRefreshSecret(), { expiresIn: '30d' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, jti, tokenHash };
};

// Retorna { db, isAdmin } com a conexão correta para refresh_tokens.
const _getRefreshDb = async (decoded) => {
  if (decoded.isAdmin) return { db: masterDb, isAdmin: true };
  if (!decoded.subdomain) throw new Error('subdomain ausente no refresh token');
  const tenant = await Tenant.findOne({ where: { subdominio: decoded.subdomain, ativo: true } });
  if (!tenant) throw new Error('Tenant não encontrado');
  const db = await getTenantConnection(tenant.schema);
  return { db, isAdmin: false };
};

// Helpers de tabela (admin usa schema public explícito)
const _tbl = (isAdmin) => isAdmin ? '"public"."refresh_tokens"' : 'refresh_tokens';

const _saveRefreshToken = (db, isAdmin, { jti, userId, tokenHash, expiresAt }) =>
  db.query(
    `INSERT INTO ${_tbl(isAdmin)} (jti, user_id, token_hash, expires_at)
     VALUES (:jti, :userId, :tokenHash, :expiresAt)`,
    { replacements: { jti, userId: String(userId), tokenHash, expiresAt: new Date(expiresAt) } }
  );

const _findRefreshToken = async (db, isAdmin, jti) => {
  const rows = await db.query(
    `SELECT id, jti, revoked_at, expires_at
     FROM ${_tbl(isAdmin)} WHERE jti = :jti LIMIT 1`,
    { replacements: { jti }, type: QueryTypes.SELECT }
  );
  return rows[0] || null;
};

const _revokeRefreshToken = (db, isAdmin, jti) =>
  db.query(
    `UPDATE ${_tbl(isAdmin)}
     SET revoked_at = NOW(), updated_at = NOW()
     WHERE jti = :jti`,
    { replacements: { jti } }
  );

// Gera access token (payload e expiração sem alterações)
// M-2: TTL curto — 15 min. Sessões longas são mantidas pelo refresh token (30d).
const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30m',
  });
// Front (Vercel) e API (Railway) ficam em domínios diferentes: em HTTPS o cookie
// precisa de SameSite=None; Secure para o navegador enviá-lo de volta — em qualquer
// ambiente (produção ou teste). Só o HTTP local (localhost, mesmo site via proxy
// do Vite) usa Lax. Decidir pelo NODE_ENV derrubava a sessão do ambiente de teste
// a cada recarga da página.
const _cookieOpts = (req) => {
  const https = process.env.NODE_ENV === 'production' || !!req?.secure;
  return {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    maxAge: REFRESH_EXPIRE_MS,
    path: '/api/auth', // restringe o cookie apenas às rotas de auth
  };
};

// Sessões separadas: superadmin e município usam cookies distintos, para que
// entrar num município no mesmo navegador não derrube a sessão do superadmin.
// O front informa o contexto da página no header x-auth-context ('admin' | 'tenant').
const REFRESH_COOKIE_TENANT = 'refreshToken';
const REFRESH_COOKIE_ADMIN  = 'refreshTokenAdmin';
const _cookieName = (isAdmin) => isAdmin ? REFRESH_COOKIE_ADMIN : REFRESH_COOKIE_TENANT;
const _isAdminContext = (req) => req.headers['x-auth-context'] === 'admin';

const setRefreshTokenCookie = (res, token, isAdmin = false) =>
  res.cookie(_cookieName(isAdmin), token, _cookieOpts(res.req));

const clearRefreshTokenCookie = (res, isAdmin = false) =>
  res.clearCookie(_cookieName(isAdmin), { ..._cookieOpts(res.req), maxAge: 0 });

// ── Busca de municípios por e-mail ──────────────────────────────────────────
// Usuários vivem em {schema}.usuarios (um schema por município) — o e-mail só
// é único dentro de cada schema. Para descobrir em quais municípios um e-mail
// tem conta ativa, iteramos os tenants ativos e consultamos cada schema.
const qi = () => masterDb.getQueryInterface();

const buscarMunicipiosPorEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'E-mail válido é obrigatório' });
    }
    const emailNormalizado = email.trim().toLowerCase();

    const tenants = await Tenant.findAll({
      where: { ativo: true },
      attributes: ['nome_municipio', 'subdominio', 'cidade', 'estado', 'schema', 'configuracoes'],
    });

    const resultados = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const schemaQ = qi().quoteIdentifier(tenant.schema);
          const rows = await masterDb.query(
            `SELECT 1 FROM ${schemaQ}.usuarios WHERE LOWER(email) = :email AND ativo = true LIMIT 1`,
            { replacements: { email: emailNormalizado }, type: QueryTypes.SELECT }
          );
          return rows.length > 0 ? tenant : null;
        } catch {
          // Schema sem tabela usuarios/coluna esperada — ignora silenciosamente
          return null;
        }
      })
    );

    const municipios = resultados
      .filter(Boolean)
      .map(t => {
        // Enviar apenas os campos de logo usados na tela de seleção.
        // Nunca incluir o timbrado (imagem base64 pesada) nem margens — isso
        // inflava a resposta para vários MB e travava/atrasava o login.
        const c = t.configuracoes || {};
        return {
          nome_municipio: t.nome_municipio,
          subdominio: t.subdominio,
          cidade: t.cidade,
          estado: t.estado,
          configuracoes: {
            logo_login_url:   c.logo_login_url   ?? null,
            logo_interna_url: c.logo_interna_url ?? null,
            logo_url:         c.logo_url         ?? null,
            brasao_url:       c.brasao_url       ?? null,
            imagem_url:       c.imagem_url       ?? null,
          },
        };
      })
      .sort((a, b) => a.nome_municipio.localeCompare(b.nome_municipio));

    res.json({ municipios });
  } catch (error) {
    console.error('Erro ao buscar municípios por e-mail:', error);
    res.status(500).json({ error: 'Erro ao buscar municípios' });
  }
};

const register = async (req, res) => {
  try {
    const { nome, nomeReduzido, email, senha, cpf, telefone, tipo, secretariaId, setorId, permissoes } = req.body;
    const { User } = req.models;

    // B-2: mínimo 8 chars, ao menos uma letra e um número
    const senhaRe = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!senha || !senhaRe.test(senha)) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número' });
    }

    // Verificar se email já existe
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verificar se CPF já existe
    const existingCpf = await User.findOne({ where: { cpf } });
    if (existingCpf) {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const user = await User.create({
      nome,
      nomeReduzido: nomeReduzido || null,
      email,
      senha: hashedPassword,
      cpf,
      telefone,
      tipo: tipo || 'operacional',
      secretariaId,
      setorId,
      permissoes: permissoes || {
        processos:     { ver: true, criar: true, editar: true, excluir: false, tramitar: true, devolver: true, concluir: true, arquivar: false, anexar_documento: true, excluir_documento: false },
        arquivo:       { acessar: false },
        almoxarifado:  { acessar: false, painel: { ver: true }, estoque: { ver: true, editar: true }, entradas: { ver: true, registrar: true }, saidas: { ver: true, registrar: true }, requisicoes: { ver: true, criar: true, aprovar: false, cancelar: false }, cotas: { ver: true, gerenciar: false }, inventario: { ver: true, realizar: false }, auditoria: { ver: false } },
        patrimonio:    { acessar: false, painel: { ver: true }, bens: { ver: true, criar: false, editar: false, excluir: false }, tombamento: { ver: true, realizar: false }, transferencia: { ver: true, realizar: false }, baixa: { ver: true, realizar: false }, inventario: { ver: true, realizar: false }, grupos: { ver: false, gerenciar: false } },
        financeiro:    { acessar: false, painel: { ver: true }, processos_did: { ver: true }, relatorio: { ver: false } },
        contratos:     { acessar: false, itens: { ver: true, criar: false, editar: false, excluir: false }, credores: { ver: true, criar: false, editar: false, excluir: false }, contratos: { ver: true, criar: false, editar: false, excluir: false }, ordens: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
        tesouraria:    { acessar: false, contas: { ver: true, criar: false, editar: false, excluir: false }, receitas: { ver: true, criar: false, editar: false, excluir: false }, despesas: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
        administracao: { gerenciar_usuarios: false, gerenciar_secretarias: false, gerenciar_configuracoes: false, visualizar_relatorios: false, visualizar_registros: false },
      }
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        tipo: user.tipo,
        tenantId: req.tenant.id,
        subdomain: req.tenant.subdominio
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30m' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo
      },
      token
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

const login = async (req, res) => {
  try {
    const { cpf, email, senha, subdomain } = req.body;

    // Se o subdomain for 'admin', fazer login na tabela global de admins
    if (subdomain === 'admin') {
      // Queries separadas para email e CPF (evita ambiguidade de named replacements)
      let rows;
      if (email) {
        rows = await masterDb.query(
          'SELECT * FROM public.admins WHERE email = :email AND ativo = true',
          { replacements: { email }, type: QueryTypes.SELECT }
        );
      } else if (cpf) {
        rows = await masterDb.query(
          'SELECT * FROM public.admins WHERE cpf = :cpf AND ativo = true',
          { replacements: { cpf }, type: QueryTypes.SELECT }
        );
      } else {
        return res.status(400).json({ error: 'E-mail ou CPF é obrigatório' });
      }

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const admin = rows[0];
      const validPassword = await bcrypt.compare(senha, admin.senha);

      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { 
          id: admin.id, 
          cpf: admin.cpf, 
          papel: 'admin',
          isAdmin: true
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30m' }
      );

      // Setar refresh token em cookie httpOnly (aditivo — não altera resposta existente)
      const { token: rtAdmin, jti: jtiAdmin, tokenHash: hashAdmin } = _buildRefreshToken({ id: admin.id, isAdmin: true });
      await _saveRefreshToken(masterDb, true, {
        jti: jtiAdmin, userId: admin.id, tokenHash: hashAdmin, expiresAt: Date.now() + REFRESH_EXPIRE_MS,
      });
      setRefreshTokenCookie(res, rtAdmin, true);

      return res.json({
        message: 'Login admin realizado com sucesso',
        user: {
          id: admin.id,
          nome: admin.nome,
          cpf: admin.cpf,
          papel: 'admin'
        },
        token
      });
    }
    
    if (!cpf && !email) {
      return res.status(400).json({ error: 'CPF ou e-mail é obrigatório' });
    }

    const tenant = await Tenant.findOne({ where: { subdominio: subdomain, ativo: true } });
    if (!tenant) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const tenantDb = await getTenantConnection(tenant.schema);
    const models = initTenantModels(tenantDb);
    const { User } = models;

    const { Op, fn, col, where: sqlWhere } = require('sequelize');
    const user = await User.findOne({
      where: email
        ? { [Op.and]: [sqlWhere(fn('LOWER', col('User.email')), email.trim().toLowerCase()), { ativo: true }] }
        : { cpf, ativo: true },
      include: [
        { model: models.Secretaria, as: 'secretaria' },
        { model: models.Setor, as: 'setor' }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(senha, user.senha);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        tenantId: tenant.id,
        subdomain: tenant.subdominio,
        secretariaId: user.secretariaId,
        secretariaNome: user.secretaria?.nome,
        setorId: user.setorId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30m' }
    );

    // Setar refresh token em cookie httpOnly (aditivo — não altera resposta existente)
    const { token: rtTenant, jti: jtiTenant, tokenHash: hashTenant } = _buildRefreshToken({
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo,
      tenantId: tenant.id,
      subdomain: tenant.subdominio,
      secretariaId: user.secretariaId || null,
      setorId: user.setorId || null,
    });
    await _saveRefreshToken(tenantDb, false, {
      jti: jtiTenant, userId: user.id, tokenHash: hashTenant, expiresAt: Date.now() + REFRESH_EXPIRE_MS,
    });
    setRefreshTokenCookie(res, rtTenant);

    // Log de sessão (exceto Administrador Jeos)
    if (user.tipo !== 'jeos' && models.Log) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
      models.Log.create({
        usuario_id: user.id, acao: 'login', modulo: 'sessao',
        descricao:  `${user.nome} entrou no sistema`,
        ip, user_agent: (req.headers['user-agent'] || '').substring(0, 300),
        created_at: new Date()
      }).catch(() => {});
    }

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        nomeReduzido: user.nomeReduzido,
        email: user.email,
        tipo: user.tipo,
        secretariaId: user.secretariaId,
        permissoes: user.permissoes,
        secretaria: user.secretaria,
        setor: user.setor
      },
      token,
      tenant: {
        id: tenant.id,
        nome: tenant.nome_municipio,
        subdominio: tenant.subdominio,
        configuracoes: tenant.configuracoes || {}
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    // Erro de banco (ex: coluna ausente em schema desatualizado) — expõe a causa real
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({
        error: `Erro no banco de dados ao fazer login: ${error.original?.message || error.message}`
      });
    }
    res.status(500).json({ error: error.message || 'Erro ao fazer login' });
  }
};

const getProfile = async (req, res) => {
  try {
    // Admin global: busca na tabela public.admins
    if (req.user.isAdmin) {
      const rows = await masterDb.query(
        'SELECT id, nome, cpf, email FROM public.admins WHERE id = :id',
        { replacements: { id: req.user.id }, type: masterDb.QueryTypes.SELECT }
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Admin não encontrado' });
      return res.json({ user: { ...rows[0], papel: 'admin', tipo: 'admin' } });
    }

    const { User, Secretaria, Setor } = req.models;

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['senha'] },
      include: [
        { model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla', 'logo'] },
        { model: Setor,      as: 'setor',      attributes: ['id', 'nome'] }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
};

const getUsersBySecretaria = async (req, res) => {
  try {
    const { User, Secretaria } = req.models;
    const { nome } = req.query;
    const { Op } = require('sequelize');

    const where = { ativo: true };

    if (nome) {
      const secretarias = await Secretaria.findAll({
        attributes: ['id'],
        where: { nome: { [Op.iLike]: `%${nome}%` } },
      });
      const ids = secretarias.map(s => s.id);
      // Filtra pela secretaria se encontrou, senão retorna todos (fallback)
      if (ids.length) where.secretariaId = { [Op.in]: ids };
    }

    const users = await User.findAll({
      attributes: ['id', 'nome'],
      where,
      order: [['nome', 'ASC']],
    });
    res.json({ users });
  } catch (error) {
    console.error('getUsersBySecretaria:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { User, Secretaria, Setor } = req.models;

    const where = { excluido_em: null }; // excluídos ficam na tela Excluídos
    if (!['admin', 'jeos'].includes(req.user.tipo) && req.user.secretariaId) {
      where.secretariaId = req.user.secretariaId;
    }

    const users = await User.findAll({
      attributes: ['id', 'nome', 'nomeReduzido', 'email', 'cpf', 'telefone', 'tipo', 'ativo', 'permissoes', 'secretariaId', 'setorId'],
      where,
      include: [
        {
          model: Secretaria,
          as: 'secretaria',
          attributes: ['id', 'nome', 'sigla']
        },
        {
          model: Setor,
          as: 'setor',
          attributes: ['id', 'nome']
        }
      ],
      order: [['nome', 'ASC']]
    });

    // B-5: operacional não recebe CPF nem telefone de outros usuários
    // (o Administrador Jeos não estava na lista e a busca por CPF não achava ninguém)
    const isSensivel = !['admin', 'gestor', 'jeos'].includes(req.user?.tipo);
    // Quem já tem o app autenticador ativo (ícone de configurar × revogar na tela)
    const comTotp = new Set(
      (await req.tenantDb.query('SELECT usuario_id FROM usuario_totp WHERE ativo = true', { type: require('sequelize').QueryTypes.SELECT })
        .catch(() => [])).map(r => String(r.usuario_id))
    );
    const result = users.map(u => {
      const o = u.toJSON();
      if (isSensivel) { delete o.cpf; delete o.telefone; }
      o.autenticador = comTotp.has(String(o.id));
      return o;
    });

    res.json({ users: result });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, nomeReduzido, email, cpf, telefone, tipo, secretariaId, setorId, permissoes, ativo, novaSenha } = req.body;
    const { User } = req.models;
    const { Op } = require('sequelize');

    // A-5: impede que um admin altere seu próprio tipo/permissões
    // (evita auto-escalada acidental e lockout de último admin)
    // (o tipo só conta se mudar — a tela de edição sempre manda o tipo atual)
    const isSelf = req.user && String(req.user.id) === String(id);
    if (isSelf && (permissoes !== undefined || (tipo !== undefined && tipo !== req.user.tipo))) {
      return res.status(403).json({ error: 'Não é permitido alterar o próprio tipo ou permissões' });
    }

    // Alterar permissões de outro usuário depende de Organização › Usuários › Permissões
    if (permissoes !== undefined) {
      const eu = await User.findByPk(req.user.id, { attributes: ['tipo', 'permissoes'] });
      const { ignoraPermissoes } = require('../middleware/auth');
      if (!ignoraPermissoes(eu) && eu?.permissoes?.organizacao?.usuarios?.permissoes === false) {
        return res.status(403).json({ error: 'Sem permissão para alterar permissões de usuários' });
      }
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Validar unicidade de email (excluindo o próprio usuário)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
      if (emailExists) return res.status(400).json({ error: 'Email já cadastrado para outro usuário' });
    }

    // Só grava o que veio na requisição (ex.: a janela de Permissões manda só permissoes)
    const updatePayload = Object.fromEntries(Object.entries(
      { nome, nomeReduzido: nomeReduzido ?? undefined, email, cpf, telefone, tipo, secretariaId, setorId, permissoes, ativo }
    ).filter(([, v]) => v !== undefined));

    // B-2: mesma regra do register — 8+ chars, letra + número
    const senhaRe = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (novaSenha) {
      if (!senhaRe.test(novaSenha.trim())) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número' });
      }
      updatePayload.senha = await bcrypt.hash(novaSenha.trim(), 10);
    }

    await user.update(updatePayload);

    const { senha: _, ...userSafe } = user.toJSON();
    res.json({ message: 'Usuário atualizado com sucesso', user: userSafe });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { User } = req.models;

    const user = await User.findByPk(id);
    if (!user || user.excluido_em) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir o próprio usuário.' });
    }

    // Vai para os Excluídos: perde o acesso (ativo=false), mas o nome segue no
    // histórico dos processos que movimentou
    await excluir(req, 'usuarios', user);

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const adminCtx = _isAdminContext(req);
    const cookieToken = req.cookies?.[_cookieName(adminCtx)];
    if (!cookieToken) {
      return res.status(401).json({ error: 'Refresh token não encontrado' });
    }

    let decoded;
    try {
      // C-3: algoritmo fixado
      decoded = jwt.verify(cookieToken, _getRefreshSecret(), { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }

    // O token precisa ser do mesmo tipo do contexto (superadmin × município)
    if (!!decoded.isAdmin !== adminCtx) {
      return res.status(401).json({ error: 'Sessão não corresponde a este acesso' });
    }

    const { jti } = decoded;
    if (!jti) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Obter conexão de banco para o schema correto (tenant ou public/admin)
    let dbCtx;
    try {
      dbCtx = await _getRefreshDb(decoded);
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Verificar se o token existe, não foi revogado e não está expirado
    const record = await _findRefreshToken(dbCtx.db, dbCtx.isAdmin, jti);
    if (!record) {
      return res.status(401).json({ error: 'Refresh token revogado ou inexistente' });
    }
    if (record.revoked_at) {
      return res.status(401).json({ error: 'Refresh token revogado' });
    }
    if (new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expirado' });
    }

    // Montar novo access token — busca tipo atualizado do banco para não perder permissões
    const { iat, exp, jti: _jti, ...cleanPayload } = decoded;
    let freshPayload = { ...cleanPayload };
    if (decoded.subdomain && decoded.id && !decoded.isAdmin) {
      try {
        const tenantForRefresh = await Tenant.findOne({ where: { subdominio: decoded.subdomain, ativo: true } });
        if (tenantForRefresh) {
          const tenantDbForRefresh = await getTenantConnection(tenantForRefresh.schema);
          const modelsForRefresh   = initTenantModels(tenantDbForRefresh);
          const freshUser = await modelsForRefresh.User?.findByPk(decoded.id, {
            attributes: ['nome', 'tipo', 'email', 'secretariaId', 'setorId', 'ativo', 'excluido_em']
          });
          // Usuário desativado ou excluído perde a sessão na próxima renovação
          if (freshUser && (freshUser.ativo === false || freshUser.excluido_em)) {
            await _revokeRefreshToken(tenantDbForRefresh, false, decoded.jti).catch(() => {});
            return res.status(401).json({ error: 'Usuário sem acesso ao sistema' });
          }
          if (freshUser) {
            freshPayload.nome        = freshUser.nome || cleanPayload.nome;
            freshPayload.tipo        = freshUser.tipo;
            freshPayload.email       = freshUser.email || cleanPayload.email;
            freshPayload.secretariaId = freshUser.secretariaId || null;
            freshPayload.setorId     = freshUser.setorId || null;
          }
        }
      } catch { /* mantém cleanPayload se falhar */ }
    }
    const newAccessToken = generateAccessToken(freshPayload);

    res.json({ success: true, token: newAccessToken });
  } catch (error) {
    console.error('[refreshToken] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
const logoutUser = async (req, res) => {
  const adminCtx = _isAdminContext(req);
  try {
    const cookieToken = req.cookies?.[_cookieName(adminCtx)];
    let decoded = null;
    if (cookieToken) {
      try {
        // C-3: algoritmo fixado
        decoded = jwt.verify(cookieToken, _getRefreshSecret(), { algorithms: ['HS256'] });
        if (decoded?.jti) {
          const dbCtx = await _getRefreshDb(decoded);
          await _revokeRefreshToken(dbCtx.db, dbCtx.isAdmin, decoded.jti);
        }
      } catch {
        // Token inválido/expirado — apenas limpar o cookie
      }
    }

    // Log de sessão (apenas tenant users, exceto Administrador Jeos)
    if (decoded?.subdomain && decoded?.id && !decoded?.isAdmin) {
      try {
        const tenant = await Tenant.findOne({ where: { subdominio: decoded.subdomain, ativo: true } });
        if (tenant) {
          const tenantDb = await getTenantConnection(tenant.schema);
          const models   = initTenantModels(tenantDb);
          const user = await models.User?.findByPk(decoded.id, { attributes: ['nome', 'tipo'] }).catch(() => null);
          if (user && user.tipo !== 'jeos' && models.Log) {
            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
            models.Log.create({
              usuario_id: decoded.id, acao: 'logout', modulo: 'sessao',
              descricao:  `${user.nome} saiu do sistema`,
              ip, user_agent: (req.headers['user-agent'] || '').substring(0, 300),
              created_at: new Date()
            }).catch(() => {});
          }
        }
      } catch { /* não bloqueia o logout se o log falhar */ }
    }

    clearRefreshTokenCookie(res, adminCtx);
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('[logoutUser] Erro:', error.message);
    clearRefreshTokenCookie(res, adminCtx);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};

module.exports = {
  buscarMunicipiosPorEmail,
  register,
  login,
  getProfile,
  getUsersBySecretaria,
  listUsers,
  updateUser,
  deleteUser,
  refreshToken,
  logoutUser,
};
