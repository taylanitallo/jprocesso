const express = require('express');
const router = express.Router();
const {
  login, register, getProfile, getUsersBySecretaria, listUsers, updateUser, deleteUser, refreshToken, logoutUser, buscarMunicipiosPorEmail,
  trocarSenhaPrimeiroAcesso, criarConvite, listarConvites, desativarConvite, verConvite, cadastrarPorConvite,
} = require('../controllers/authController');
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
// IP de onde vem a requisição (mostrado no rodapé). Atrás do proxy do Railway,
// req.ip já vem do X-Forwarded-For (trust proxy no index.js).
router.get('/meu-ip', (req, res) => {
  res.json({ ip: String(req.ip || '').replace(/^::ffff:/, '') || null });
});
router.post('/refresh', validateRefreshOrigin, refreshToken);  // lê cookie httpOnly
router.post('/logout',  validateRefreshOrigin, logoutUser);    // revoga refresh + limpa cookie

// ── Usuários (protegidos) ─────────────────────────────────────────────────────
// A-5: register/updateUser/deleteUser: admin, ou gestor só na própria secretaria e sem criar/promover
// administradores (regras em authController › conferirGestor)
// Administrador precisa de Administração › Usuários; o gestor administra a própria secretaria pelo papel.
const acessoUsuarios = (req, res, next) => req.user?.tipo === 'gestor'
  ? next()
  : requirePermission('administracao', 'gerenciar_usuarios')(req, res, next);
router.post('/register',       tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), acessoUsuarios, requirePermission('organizacao', 'usuarios', 'criar'), register);
router.get('/profile',                 tenantMiddleware, requireTenant, authenticate, getProfile);
router.get('/users/por-secretaria',    tenantMiddleware, requireTenant, authenticate, getUsersBySecretaria);
router.get('/users',                   tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), listUsers);
router.put('/users/:id',       tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), acessoUsuarios, requirePermission('organizacao', 'usuarios', 'editar'), updateUser);
router.delete('/users/:id',    tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), acessoUsuarios, requirePermission('organizacao', 'usuarios', 'excluir'), deleteUser);

// ── Primeiro acesso: troca obrigatória da senha recebida de quem cadastrou ───
router.post('/primeiro-acesso/senha', tenantMiddleware, requireTenant, authenticate, trocarSenhaPrimeiroAcesso);

// ── Convites de cadastro (link / QR Code) ─────────────────────────────────────
// Gerar/listar/desativar: administrador ou gestor com Organização › Usuários › Incluir e Link de cadastro
router.post('/convites',       tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), acessoUsuarios, requirePermission('organizacao', 'usuarios', 'criar'), requirePermission('organizacao', 'usuarios', 'convite'), criarConvite);
router.get('/convites',        tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), acessoUsuarios, requirePermission('organizacao', 'usuarios', 'criar'), requirePermission('organizacao', 'usuarios', 'convite'), listarConvites);
router.delete('/convites/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), acessoUsuarios, requirePermission('organizacao', 'usuarios', 'criar'), requirePermission('organizacao', 'usuarios', 'convite'), desativarConvite);
// Públicas: página do link (o próprio link é a credencial; expira e pode ser desativado)
router.get('/convite/:token',          tenantMiddleware, requireTenant, verConvite);
router.post('/convite/:token/cadastro', tenantMiddleware, requireTenant, cadastrarPorConvite);

module.exports = router;
