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

// Permissões iniciais por perfil (operacional / gestor)
const { permissoesPadraoDoTipo } = require('../config/permissoesPadrao');

// B-2: mínimo 8 chars, ao menos uma letra e um número
const SENHA_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// ── Primeiro acesso: troca obrigatória de senha ──────────────────────────────
// Quem foi cadastrado (ou teve a senha redefinida) por outra pessoa fica com
// usuarios.trocar_senha = true: no próximo login precisa informar a senha atual
// e escolher uma nova, para que só ele saiba a senha. Coluna lida por SQL (não
// está no model) — schema ainda sem a migração simplesmente não exige a troca.
const lerTrocarSenha = async (db, schema, id) => {
  try {
    const [rows] = await db.query(`SELECT trocar_senha FROM "${schema}".usuarios WHERE id = :id`, { replacements: { id } });
    return !!rows[0]?.trocar_senha;
  } catch { return false; }
};
const marcarTrocarSenha = (db, schema, id, valor, transaction) =>
  db.query(`UPDATE "${schema}".usuarios SET trocar_senha = :valor WHERE id = :id`, { replacements: { id, valor }, transaction })
    .catch((e) => console.error('[trocar_senha]', e.message));

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

// ── Gestor: administra só os usuários da própria secretaria ──────────────────
// Regras: administrador cria gestor; gestor cria só operacional (nem administrador, nem gestor).
// O gestor também não concede permissão que ele mesmo não tem.
const TIPOS_DO_GESTOR = ['operacional'];

const ESCOPO_VER = { todas: 3, algumas: 2 }; // demais valores = só a própria secretaria
const tudoDesligado = (v) => (v && typeof v === 'object' && !Array.isArray(v))
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Array.isArray(x) ? x : tudoDesligado(x)]))
  : false;
const limitarPermissoes = (novas, minhas) => {
  if (!novas || typeof novas !== 'object' || Array.isArray(novas)) return novas;
  const out = {};
  for (const [k, v] of Object.entries(novas)) {
    const meu = minhas && typeof minhas === 'object' ? minhas[k] : undefined;
    if (Array.isArray(v) || k === '_v') out[k] = v;
    else if (meu === false) out[k] = tudoDesligado(v);
    else if (v && typeof v === 'object') out[k] = limitarPermissoes(v, meu);
    else if (k === 'ver' && v !== false && (ESCOPO_VER[v] || 1) > (ESCOPO_VER[meu] || 1)) out[k] = 'propria';
    else out[k] = v;
  }
  return out;
};

// Confere o pedido do gestor; devolve a mensagem de erro (ou null) e as permissões limitadas
const conferirGestor = async (req, { alvo, tipo, secretariaId, setorId, permissoes }) => {
  const { User, Setor } = req.models;
  const eu = await User.findByPk(req.user.id, { attributes: ['secretariaId', 'permissoes'] });
  const minhaSec = eu?.secretariaId ? String(eu.secretariaId) : null;
  if (!minhaSec) return { erro: 'Gestor sem secretaria não pode administrar usuários' };
  const ehProprio = alvo && String(alvo.id) === String(req.user.id);
  if (alvo && !ehProprio) {
    if (!TIPOS_DO_GESTOR.includes(alvo.tipo)) return { erro: 'Gestor só administra operacionais' };
    if (String(alvo.secretariaId || '') !== minhaSec) return { erro: 'Gestor só administra usuários da própria secretaria' };
  }
  if (secretariaId !== undefined && String(secretariaId || '') !== minhaSec) {
    return { erro: 'Gestor só cadastra usuários na própria secretaria' };
  }
  // O próprio gestor pode manter o tipo dele (a tela de edição sempre manda o tipo atual)
  if (tipo !== undefined && !TIPOS_DO_GESTOR.includes(tipo) && !(ehProprio && tipo === alvo.tipo)) {
    return { erro: 'Gestor só cadastra operacionais' };
  }
  if (setorId) {
    const setor = await Setor.findByPk(setorId, { attributes: ['secretariaId'] });
    if (!setor || String(setor.secretariaId) !== minhaSec) return { erro: 'Setor não pertence à sua secretaria' };
  }
  return { erro: null, permissoes: permissoes === undefined ? undefined : limitarPermissoes(permissoes, eu.permissoes || {}) };
};

const register = async (req, res) => {
  try {
    const { nome, nomeReduzido, email, senha, cpf, telefone, tipo, secretariaId, setorId } = req.body;
    let { permissoes } = req.body;
    const { User } = req.models;

    if (req.user?.tipo === 'gestor') {
      const r = await conferirGestor(req, { tipo: tipo || 'operacional', secretariaId: secretariaId ?? null, setorId, permissoes });
      if (r.erro) return res.status(403).json({ error: r.erro });
      permissoes = r.permissoes;
    }

    if (!senha || !SENHA_RE.test(senha)) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número' });
    }

    // Verificar se email já existe
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verificar se CPF já existe
    const existingCpf = await User.findOne({ where: { cpf, excluido_em: null } });
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
      permissoes: permissoes || permissoesPadraoDoTipo(tipo || 'operacional')
    });

    // Senha definida por quem cadastrou: o usuário troca no primeiro acesso
    await marcarTrocarSenha(req.tenantDb, req.tenant.schema, user.id, true);

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
        ? { [Op.and]: [sqlWhere(fn('LOWER', col('User.email')), email.trim().toLowerCase()), { ativo: true, excluido_em: null }] }
        : { cpf, ativo: true, excluido_em: null },
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

    // Primeiro acesso: enquanto não trocar a senha, o token só abre a troca (middleware/auth)
    const trocarSenha = await lerTrocarSenha(tenantDb, tenant.schema, user.id);

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
        setorId: user.setorId || null,
        ...(trocarSenha ? { trocarSenha: true } : {}),
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
        setor: user.setor,
        trocarSenha,
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

    const trocarSenha = await lerTrocarSenha(req.tenantDb, req.tenant.schema, user.id);
    res.json({ user: { ...user.toJSON(), trocarSenha } });
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
    const { nome, nomeReduzido, email, cpf, telefone, tipo, secretariaId, setorId, ativo, novaSenha } = req.body;
    let { permissoes } = req.body;
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

    if (req.user?.tipo === 'gestor') {
      const r = await conferirGestor(req, { alvo: user, tipo, secretariaId, setorId, permissoes });
      if (r.erro) return res.status(403).json({ error: r.erro });
      permissoes = r.permissoes;
    }

    // Promovido a gestor: começa no padrão do perfil gestor (depois ajusta no editor)
    if (tipo === 'gestor' && user.tipo !== 'gestor' && permissoes === undefined) {
      permissoes = permissoesPadraoDoTipo('gestor');
    }

    // Validar unicidade de email (excluindo o próprio usuário)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email, id: { [Op.ne]: id }, excluido_em: null } });
      if (emailExists) return res.status(400).json({ error: 'Email já cadastrado para outro usuário' });
    }

    // CPF: só o Administrador Jeos ou um Administrador (a rota já exige Alterar em
    // Organização › Usuários) trocam; 11 dígitos e sem repetir o de outro usuário
    let cpfNovo;
    if (cpf !== undefined && cpf !== null) {
      const digitos = String(cpf).replace(/\D/g, '');
      if (digitos !== String(user.cpf || '').replace(/\D/g, '')) {
        if (!['jeos', 'admin'].includes(req.user?.tipo)) {
          return res.status(403).json({ error: 'Só o Administrador Jeos ou um Administrador pode alterar o CPF' });
        }
        if (digitos.length !== 11) return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
        // excluídos não contam: ficam na tela Excluídos e a restauração confere o CPF
        const cpfExiste = await User.findOne({ where: { cpf: digitos, id: { [Op.ne]: id }, excluido_em: null } });
        if (cpfExiste) return res.status(400).json({ error: 'CPF já cadastrado para outro usuário' });
        cpfNovo = digitos;
      }
    }

    // Só grava o que veio na requisição (ex.: a janela de Permissões manda só permissoes)
    const updatePayload = Object.fromEntries(Object.entries(
      { nome, nomeReduzido: nomeReduzido ?? undefined, email, cpf: cpfNovo, telefone, tipo, secretariaId, setorId, permissoes, ativo }
    ).filter(([, v]) => v !== undefined));

    // B-2: mesma regra do register — 8+ chars, letra + número
    if (novaSenha) {
      if (!SENHA_RE.test(novaSenha.trim())) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número' });
      }
      updatePayload.senha = await bcrypt.hash(novaSenha.trim(), 10);
    }

    await user.update(updatePayload);

    // Senha redefinida por outra pessoa: o usuário troca no próximo acesso
    if (novaSenha) await marcarTrocarSenha(req.tenantDb, req.tenant.schema, user.id, !isSelf);

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
    if (req.user?.tipo === 'gestor') {
      const r = await conferirGestor(req, { alvo: user });
      if (r.erro) return res.status(403).json({ error: r.erro });
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

// ── Primeiro acesso: troca a senha recebida de quem cadastrou ────────────────
// Corpo: { senhaAtual, novaSenha }. Devolve um token novo, já sem a marca de troca.
const trocarSenhaPrimeiroAcesso = async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body || {};
    if (!senhaAtual || !novaSenha) return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });
    const nova = String(novaSenha).trim();
    if (!SENHA_RE.test(nova)) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número' });
    }

    const { User, Secretaria } = req.models;
    const user = await User.findByPk(req.user.id, { include: [{ model: Secretaria, as: 'secretaria', attributes: ['nome'] }] });
    if (!user || user.ativo === false || user.excluido_em) return res.status(401).json({ error: 'Usuário sem acesso ao sistema' });

    if (!(await bcrypt.compare(String(senhaAtual), user.senha))) {
      return res.status(400).json({ error: 'Senha atual incorreta', codigo: 'SENHA_ATUAL' });
    }
    if (await bcrypt.compare(nova, user.senha)) {
      return res.status(400).json({ error: 'A nova senha precisa ser diferente da atual' });
    }

    await user.update({ senha: await bcrypt.hash(nova, 10) });
    await marcarTrocarSenha(req.tenantDb, req.tenant.schema, user.id, false);

    const { iat, exp, trocarSenha: _t, ...payload } = req.user;
    const token = generateAccessToken({ ...payload, secretariaNome: user.secretaria?.nome || payload.secretariaNome || null });

    if (req.models.Log) {
      req.models.Log.create({
        usuario_id: user.id, acao: 'trocar_senha', modulo: 'sessao',
        descricao: `${user.nome} trocou a senha no primeiro acesso`, created_at: new Date(),
      }).catch(() => {});
    }
    res.json({ message: 'Senha alterada com sucesso', token });
  } catch (error) {
    console.error('Erro ao trocar senha do primeiro acesso:', error);
    res.status(500).json({ error: 'Erro ao trocar a senha' });
  }
};

// ── Convites de cadastro (link / QR Code) ────────────────────────────────────
// O gestor (ou administrador) gera um link com o tipo de usuário e a validade e
// manda ao grupo dos colaboradores; cada um cria o próprio usuário pelo link.
// Gestor: só operacionais da própria secretaria. Administrador: gestor ou operacional.
const VALIDADE_MAX_DIAS = 90;
const TIPOS_CONVITE_ADMIN = ['gestor', 'operacional'];

const conviteValido = (c) => c && c.ativo && new Date(c.expira_em) > new Date();

const criarConvite = async (req, res) => {
  try {
    const { tipo = 'operacional', setorId = null, expiraEm } = req.body || {};
    let { secretariaId } = req.body || {};
    const { User, Setor } = req.models;
    const ehGestor = req.user.tipo === 'gestor';

    if (ehGestor) {
      if (!TIPOS_DO_GESTOR.includes(tipo)) return res.status(403).json({ error: 'Gestor só convida operacionais' });
      const eu = await User.findByPk(req.user.id, { attributes: ['secretariaId'] });
      if (!eu?.secretariaId) return res.status(403).json({ error: 'Gestor sem secretaria não pode gerar convites' });
      if (secretariaId && String(secretariaId) !== String(eu.secretariaId)) {
        return res.status(403).json({ error: 'Gestor só convida para a própria secretaria' });
      }
      secretariaId = eu.secretariaId;
    } else if (!TIPOS_CONVITE_ADMIN.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido para convite' });
    }
    if (!secretariaId) return res.status(400).json({ error: 'Informe a secretaria' });

    if (setorId) {
      const setor = await Setor.findByPk(setorId, { attributes: ['secretariaId'] });
      if (!setor || String(setor.secretariaId) !== String(secretariaId)) {
        return res.status(400).json({ error: 'Setor não pertence à secretaria escolhida' });
      }
    }

    const expira = new Date(expiraEm);
    const agora = Date.now();
    if (!expiraEm || Number.isNaN(expira.getTime()) || expira.getTime() <= agora) {
      return res.status(400).json({ error: 'Informe uma validade no futuro' });
    }
    if (expira.getTime() - agora > VALIDADE_MAX_DIAS * 86400000) {
      return res.status(400).json({ error: `A validade máxima é de ${VALIDADE_MAX_DIAS} dias` });
    }

    const token = crypto.randomBytes(24).toString('base64url');
    const [rows] = await req.tenantDb.query(
      `INSERT INTO "${req.tenant.schema}".convites_usuario (token, tipo, secretaria_id, setor_id, criado_por_id, expira_em)
       VALUES (:token, :tipo, :secretariaId, :setorId, :criadoPor, :expira) RETURNING id, token, tipo, expira_em`,
      { replacements: { token, tipo, secretariaId, setorId: setorId || null, criadoPor: req.user.id, expira } }
    );
    await registrarLog(req, {
      acao: 'criar_convite', modulo: 'usuarios',
      descricao: `Link de cadastro (${tipo}) válido até ${expira.toLocaleString('pt-BR')}`,
      referencia_id: rows[0].id,
    });
    res.status(201).json({ convite: rows[0] });
  } catch (error) {
    console.error('Erro ao criar convite:', error);
    res.status(500).json({ error: 'Erro ao gerar o link de cadastro' });
  }
};

// Administrador vê todos; gestor, os que ele gerou
const listarConvites = async (req, res) => {
  try {
    const s = req.tenant.schema;
    const soMeus = req.user.tipo === 'gestor';
    const [rows] = await req.tenantDb.query(
      `SELECT c.id, c.token, c.tipo, c.expira_em, c.usos, c.ativo, c.created_at,
              sec.nome AS secretaria_nome, sec.sigla AS secretaria_sigla, st.nome AS setor_nome, u.nome AS criado_por_nome
         FROM "${s}".convites_usuario c
         LEFT JOIN "${s}".secretarias sec ON sec.id = c.secretaria_id
         LEFT JOIN "${s}".setores st ON st.id = c.setor_id
         LEFT JOIN "${s}".usuarios u ON u.id = c.criado_por_id
        WHERE c.created_at > NOW() - INTERVAL '120 days' ${soMeus ? 'AND c.criado_por_id = :eu' : ''}
        ORDER BY c.created_at DESC LIMIT 100`,
      { replacements: { eu: req.user.id } }
    );
    res.json({ convites: rows });
  } catch (error) {
    console.error('Erro ao listar convites:', error);
    res.status(500).json({ error: 'Erro ao listar os links de cadastro' });
  }
};

const desativarConvite = async (req, res) => {
  try {
    const s = req.tenant.schema;
    const [rows] = await req.tenantDb.query(`SELECT criado_por_id FROM "${s}".convites_usuario WHERE id = :id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Link não encontrado' });
    if (req.user.tipo === 'gestor' && String(rows[0].criado_por_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Gestor só desativa os links que ele gerou' });
    }
    await req.tenantDb.query(`UPDATE "${s}".convites_usuario SET ativo = false WHERE id = :id`, { replacements: { id: req.params.id } });
    res.json({ message: 'Link desativado' });
  } catch (error) {
    console.error('Erro ao desativar convite:', error);
    res.status(500).json({ error: 'Erro ao desativar o link' });
  }
};

const buscarConvitePorToken = async (req) => {
  const s = req.tenant.schema;
  const [rows] = await req.tenantDb.query(
    `SELECT c.*, sec.nome AS secretaria_nome, sec.sigla AS secretaria_sigla, st.nome AS setor_nome
       FROM "${s}".convites_usuario c
       LEFT JOIN "${s}".secretarias sec ON sec.id = c.secretaria_id
       LEFT JOIN "${s}".setores st ON st.id = c.setor_id
      WHERE c.token = :token LIMIT 1`,
    { replacements: { token: String(req.params.token || '') } }
  );
  return rows[0] || null;
};

// Público: dados do convite para a página de cadastro
const verConvite = async (req, res) => {
  try {
    const c = await buscarConvitePorToken(req);
    if (!conviteValido(c)) return res.status(410).json({ error: 'Este link de cadastro expirou ou foi desativado. Peça um novo ao seu gestor.' });
    const setores = c.setor_id ? [] : await req.models.Setor.findAll({
      where: { secretariaId: c.secretaria_id, ativo: true }, attributes: ['id', 'nome'], order: [['nome', 'ASC']],
    }).catch(() => []);
    res.json({
      convite: {
        tipo: c.tipo, expiraEm: c.expira_em,
        secretaria: { nome: c.secretaria_nome, sigla: c.secretaria_sigla },
        setor: c.setor_id ? { id: c.setor_id, nome: c.setor_nome } : null,
        setores,
        municipio: req.tenant.nome_municipio,
      },
    });
  } catch (error) {
    console.error('Erro ao abrir convite:', error);
    res.status(500).json({ error: 'Erro ao abrir o link de cadastro' });
  }
};

// Público: o colaborador cria o próprio usuário. Ele escolhe a senha, então não
// precisa trocá-la no primeiro acesso.
const cadastrarPorConvite = async (req, res) => {
  try {
    const c = await buscarConvitePorToken(req);
    if (!conviteValido(c)) return res.status(410).json({ error: 'Este link de cadastro expirou ou foi desativado. Peça um novo ao seu gestor.' });

    const { nome, nomeReduzido, email, telefone, senha } = req.body || {};
    const cpf = String(req.body?.cpf || '').replace(/\D/g, '');
    const setorId = c.setor_id || req.body?.setorId;
    if (!nome || !String(nome).trim()) return res.status(400).json({ error: 'Informe o nome completo' });
    if (cpf.length !== 11) return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
    if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim())) return res.status(400).json({ error: 'Informe um e-mail válido' });
    if (!senha || !SENHA_RE.test(String(senha))) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número' });
    }

    const { User, Setor } = req.models;
    const { Op } = require('sequelize');
    const setor = setorId ? await Setor.findByPk(setorId, { attributes: ['id', 'secretariaId'] }) : null;
    if (!setor || String(setor.secretariaId) !== String(c.secretaria_id)) return res.status(400).json({ error: 'Escolha o seu setor' });

    const emailNorm = String(email).trim().toLowerCase();
    const jaExiste = await User.findOne({ where: { [Op.or]: [{ cpf }, { email: emailNorm }] }, attributes: ['cpf', 'excluido_em'] });
    if (jaExiste) {
      return res.status(400).json({
        error: jaExiste.cpf === cpf ? 'Já existe um usuário com este CPF. Fale com o seu gestor.' : 'Já existe um usuário com este e-mail.',
      });
    }

    // Permissões: o padrão, limitado às de quem gerou o link quando foi um gestor
    let permissoes = permissoesPadraoDoTipo(c.tipo);
    const criador = await User.findByPk(c.criado_por_id, { attributes: ['tipo', 'permissoes'] });
    if (criador?.tipo === 'gestor') permissoes = limitarPermissoes(permissoes, criador.permissoes || {});

    const user = await User.create({
      nome: String(nome).trim(),
      nomeReduzido: nomeReduzido ? String(nomeReduzido).trim().slice(0, 60) : null,
      email: emailNorm,
      senha: await bcrypt.hash(String(senha), 10),
      cpf,
      telefone: telefone ? String(telefone).replace(/\D/g, '').slice(0, 11) : null,
      tipo: c.tipo,
      secretariaId: c.secretaria_id,
      setorId: setor.id,
      permissoes,
    });
    await req.tenantDb.query(`UPDATE "${req.tenant.schema}".convites_usuario SET usos = usos + 1 WHERE id = :id`, { replacements: { id: c.id } });

    if (req.models.Log) {
      req.models.Log.create({
        usuario_id: user.id, acao: 'cadastro_por_convite', modulo: 'usuarios',
        descricao: `${user.nome} criou o próprio usuário (${c.tipo}) pelo link de cadastro`, created_at: new Date(),
      }).catch(() => {});
    }
    res.status(201).json({ message: 'Usuário criado! Entre com o seu CPF e a senha que você escolheu.' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'CPF ou e-mail já cadastrado. Fale com o seu gestor.' });
    }
    console.error('Erro no cadastro por convite:', error);
    res.status(500).json({ error: 'Erro ao criar o usuário' });
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
const _logRetomadaSessao = async (tenantDb, schema, models, userId, nome, req) => {
  const schemaQ = tenantDb.getQueryInterface().quoteIdentifier(schema);
  const [recente] = await tenantDb.query(
    `SELECT 1 FROM ${schemaQ}.logs
      WHERE usuario_id = :userId AND modulo = 'sessao'
        AND created_at > NOW() - INTERVAL '30 minutes'
      LIMIT 1`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  if (recente) return;
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
  await models.Log.create({
    usuario_id: userId, acao: 'login', modulo: 'sessao',
    descricao:  `${nome} entrou no sistema (sessão salva)`,
    ip, user_agent: (req.headers['user-agent'] || '').substring(0, 300),
    created_at: new Date()
  });
};

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
            // O filtro "só a própria secretaria" de Contratos/Ordens/DIDs compara pelo nome:
            // sem ele no token renovado, o usuário passava a ver os de todas as secretarias
            const sec = freshUser.secretariaId && modelsForRefresh.Secretaria
              ? await modelsForRefresh.Secretaria.findByPk(freshUser.secretariaId, { attributes: ['nome'] })
              : null;
            freshPayload.secretariaNome = sec?.nome || null;
            delete freshPayload.trocarSenha;
            if (await lerTrocarSenha(tenantDbForRefresh, tenantForRefresh.schema, decoded.id)) freshPayload.trocarSenha = true;

            // Abriu o sistema pela sessão salva (sem digitar senha): também é um acesso.
            // Sem isso o Relatório de Acessos só via quem fazia login com senha.
            // F5/abas em sequência não duplicam: ignora se já houve entrada/saída nos últimos 30 min.
            if (req.body?.inicio && freshUser.tipo !== 'jeos' && modelsForRefresh.Log) {
              _logRetomadaSessao(tenantDbForRefresh, tenantForRefresh.schema, modelsForRefresh, decoded.id, freshPayload.nome, req)
                .catch(() => {});
            }
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
  trocarSenhaPrimeiroAcesso,
  criarConvite,
  listarConvites,
  desativarConvite,
  verConvite,
  cadastrarPorConvite,
};
