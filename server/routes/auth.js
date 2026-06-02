const express = require('express');
const router = express.Router();
const { login, register, getProfile, listUsers, updateUser, deleteUser, refreshToken, logoutUser } = require('../controllers/authController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

// ── Autenticação ──────────────────────────────────────────────────────────────
router.post('/login',   login);
router.post('/refresh', refreshToken);  // lê cookie httpOnly — sem middleware de tenant
router.post('/logout',  logoutUser);    // revoga refresh token + limpa cookie

// ── Usuários (protegidos) ─────────────────────────────────────────────────────
// A-5: register/updateUser/deleteUser requerem papel admin para evitar privilege escalation
router.post('/register',       tenantMiddleware, requireTenant, authenticate, authorize('admin'), register);
router.get('/profile',         tenantMiddleware, requireTenant, authenticate, getProfile);
router.get('/users',           tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), listUsers);
router.put('/users/:id',       tenantMiddleware, requireTenant, authenticate, authorize('admin'), updateUser);
router.delete('/users/:id',    tenantMiddleware, requireTenant, authenticate, authorize('admin'), deleteUser);

module.exports = router;
