const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Tenant = require('../models/Tenant');
const { getTenantConnection, masterDb } = require('../config/database');
const initTenantModels = require('../models');
const { registrarLog } = require('../middleware/activityLogger');

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
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: REFRESH_EXPIRE_MS,
  path: '/api/auth', // restringe o cookie apenas às rotas de auth
};

const setRefreshTokenCookie = (res, token) =>
  res.cookie('refreshToken', token, REFRESH_COOKIE_OPTS);

const clearRefreshTokenCookie = (res) =>
  res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTS, maxAge: 0 });

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
        criar_processo: true,
        editar_processo: true,
        excluir_processo: false,
        tramitar_processo: true,
        acessar_almoxarifado: false,
        acessar_financeiro: false,
        acessar_contratos: false,
        visualizar_relatorios: false,
        gerenciar_usuarios: false,
        gerenciar_secretarias: false,
        gerenciar_configuracoes: false,
        visualizar_registros: false
      }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        tipo: user.tipo,
        tenantId: req.tenant.id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
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
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      // Setar refresh token em cookie httpOnly (aditivo — não altera resposta existente)
      const { token: rtAdmin, jti: jtiAdmin, tokenHash: hashAdmin } = _buildRefreshToken({ id: admin.id, isAdmin: true });
      await _saveRefreshToken(masterDb, true, {
        jti: jtiAdmin, userId: admin.id, tokenHash: hashAdmin, expiresAt: Date.now() + REFRESH_EXPIRE_MS,
      });
      setRefreshTokenCookie(res, rtAdmin);

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
    
    const tenant = await Tenant.findOne({ where: { subdominio: subdomain, ativo: true } });
    if (!tenant) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const tenantDb = await getTenantConnection(tenant.schema);
    const models = initTenantModels(tenantDb);
    const { User } = models;

    const user = await User.findOne({ 
      where: { cpf, ativo: true },
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
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
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
    res.status(500).json({ error: 'Erro ao fazer login' });
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

    const where = {};
    if (req.user.tipo !== 'admin' && req.user.secretariaId) {
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
    const isSensivel = req.user?.tipo !== 'admin' && req.user?.tipo !== 'gestor';
    const result = isSensivel
      ? users.map(u => { const o = u.toJSON(); delete o.cpf; delete o.telefone; return o; })
      : users;

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
    const isSelf = req.user && req.user.id === id;
    if (isSelf && (tipo !== undefined || permissoes !== undefined)) {
      return res.status(403).json({ error: 'Não é permitido alterar o próprio tipo ou permissões' });
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

    const updatePayload = { nome, nomeReduzido: nomeReduzido ?? undefined, email, cpf, telefone, tipo, secretariaId, setorId, permissoes, ativo };

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
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await user.destroy();

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const cookieToken = req.cookies?.refreshToken;
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
            attributes: ['nome', 'tipo', 'email', 'secretariaId', 'setorId']
          });
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
  try {
    const cookieToken = req.cookies?.refreshToken;
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

    clearRefreshTokenCookie(res);
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('[logoutUser] Erro:', error.message);
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};

module.exports = {
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
