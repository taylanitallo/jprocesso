const express = require('express');
const router = express.Router();
const { login, register, getProfile, getUsersBySecretaria, listUsers, updateUser, deleteUser, refreshToken, logoutUser, buscarMunicipiosPorEmail } = require('../controllers/authController');
const { authenticate, tenantMiddleware, requireTenant, authorize, requirePermission } = require('../middleware/auth');

// M-4: em produção, valida Origin nos endpoints que recebem o cookie cross-site
// (refresh e logout). Previne CSRF: sem Origin válido → 403.
// Em dev, qualquer origem é aceita para facilitar o desenvolvimento local.
const _buildRefreshOrigins = () => {
  const set = new Set();
  [process.env.CLIENT_URL, process.env.ALLOWED_ORIGINS].forEach(env => {
    if (env) env.split(',').map(s => s.trim()).filter(Boolean).forEach(o => set.add(o));
  });
  return set;
};

const validateRefreshOrigin = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const allowed = _buildRefreshOrigins();
  const origin  = req.headers.origin;
  if (!origin || !allowed.has(origin)) {
    return res.status(403).json({ error: 'Origem não autorizada' });
  }
  next();
};

// ── Autenticação ──────────────────────────────────────────────────────────────
router.post('/buscar-municipios', buscarMunicipiosPorEmail); // pública — passo 1 do login por e-mail
router.post('/login',   login);
router.post('/refresh', validateRefreshOrigin, refreshToken);  // lê cookie httpOnly
router.post('/logout',  validateRefreshOrigin, logoutUser);    // revoga refresh + limpa cookie

// ── Usuários (protegidos) ─────────────────────────────────────────────────────
// A-5: register/updateUser/deleteUser requerem papel admin para evitar privilege escalation
router.post('/register',       tenantMiddleware, requireTenant, authenticate, authorize('admin'), requirePermission('organizacao', 'usuarios', 'criar'), register);
router.get('/profile',                 tenantMiddleware, requireTenant, authenticate, getProfile);
router.get('/users/por-secretaria',    tenantMiddleware, requireTenant, authenticate, getUsersBySecretaria);
router.get('/users',                   tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), listUsers);
router.put('/users/:id',       tenantMiddleware, requireTenant, authenticate, authorize('admin'), requirePermission('organizacao', 'usuarios', 'editar'), updateUser);
router.delete('/users/:id',    tenantMiddleware, requireTenant, authenticate, authorize('admin'), requirePermission('organizacao', 'usuarios', 'excluir'), deleteUser);

module.exports = router;
