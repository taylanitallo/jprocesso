const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const { getTenantConnection, getCachedModels } = require('../config/database');
const initTenantModels = require('../models');

// Cache de tenants em memória (TTL: 5 min) para evitar query a cada requisição
const tenantCache = new Map(); // subdomain → { tenant, expiresAt }
const TENANT_CACHE_TTL = 5 * 60 * 1000;

const getCachedTenant = async (subdomain) => {
  const cached = tenantCache.get(subdomain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }
  const tenant = await Tenant.findOne({ where: { subdominio: subdomain, ativo: true } });
  if (tenant) {
    tenantCache.set(subdomain, { tenant, expiresAt: Date.now() + TENANT_CACHE_TTL });
  }
  return tenant;
};

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // C-3: algoritmo fixado para prevenir ataques de confusão de algoritmo
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // C-1 / SEC: binding token↔tenant. Um token emitido para um município jamais
    // pode operar sobre outro. Enforçado sempre que a rota resolveu um tenant
    // (req.tenant) e o token não é do admin global (isAdmin usa requireSuperAdmin).
    // Verifica subdomain E tenantId — assim tokens sem subdomain (ex.: emitidos no
    // /register) também ficam presos ao seu município de origem.
    if (req.tenant && !decoded.isAdmin) {
      if (decoded.subdomain && decoded.subdomain !== req.tenant.subdominio) {
        return res.status(403).json({ error: 'Token não autorizado para este município' });
      }
      if (decoded.tenantId != null && String(decoded.tenantId) !== String(req.tenant.id)) {
        return res.status(403).json({ error: 'Token não autorizado para este município' });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const tenantMiddleware = async (req, res, next) => {
  try {
    const subdomain = req.headers['x-tenant-subdomain'] || req.query.subdomain;

    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomínio não fornecido' });
    }

    // Admin global não tem tenant — apenas autentica e segue
    if (subdomain === 'admin') {
      return next();
    }

    // Busca tenant com cache
    const tenant = await getCachedTenant(subdomain);

    if (!tenant) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Garante conexão com o schema do tenant
    const tenantDb = await getTenantConnection(tenant.schema);

    // Reutiliza models já definidos (nunca re-define nas próximas requisições)
    const models = getCachedModels(tenant.schema, initTenantModels);

    req.tenantDb = tenantDb;
    req.tenant   = tenant;
    req.models   = models;

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar tenant' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    // Administrador Jeos tem acesso irrestrito a todas as rotas do tenant
    if (req.user.tipo === 'jeos') return next();

    if (!roles.includes(req.user.tipo)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};

// Garante que a requisição vem de um SuperAdmin global (token com isAdmin: true).
// Deve ser usado APÓS `authenticate`.
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores do sistema' });
  }
  next();
};

// Garante que req.models e req.tenant estão disponíveis (tenant foi resolvido).
// O admin global (subdomain='admin') não possui schema próprio, portanto esta
// rota não é acessível para ele — retorna 403 antes de chegar ao controller.
// Deve ser usado APÓS `tenantMiddleware`.
const requireTenant = (req, res, next) => {
  if (!req.models || !req.tenant) {
    return res.status(403).json({
      error: 'Esta operação requer acesso a um município específico. O administrador global não possui dados de processos.'
    });
  }
  next();
};

// Verifica permissão nested no JSONB do usuário. Ex: requirePermission('almoxarifado','estoque','criar')
// Admin e jeos bypassam. undefined = permitido; false = negado.
const requirePermission = (...path) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  if (req.user.tipo === 'admin' || req.user.tipo === 'jeos') return next();
  try {
    const { User } = req.models;
    const u = await User.findByPk(req.user.id, { attributes: ['permissoes', 'tipo'] });
    if (!u) return res.status(401).json({ error: 'Usuário não encontrado' });
    if (u.tipo === 'admin' || u.tipo === 'jeos') return next();
    let obj = u.permissoes;
    for (const key of path) {
      if (obj == null || typeof obj !== 'object') { obj = undefined; break; }
      obj = obj[key];
    }
    if (obj === false) return res.status(403).json({ error: 'Sem permissão para esta ação' });
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar permissão' });
  }
};

module.exports = {
  authenticate,
  tenantMiddleware,
  requireTenant,
  authorize,
  requireSuperAdmin,
  requirePermission,
};
