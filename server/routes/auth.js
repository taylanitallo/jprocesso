const express = require('express');
const router = express.Router();
const { login, register, getProfile, listUsers, updateUser, deleteUser, refreshToken, logoutUser } = require('../controllers/authController');
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');

// ── Autenticação ──────────────────────────────────────────────────────────────
router.post('/login',   login);
router.post('/refresh', refreshToken);  // lê cookie httpOnly — sem middleware de tenant
router.post('/logout',  logoutUser);    // revoga refresh token + limpa cookie

// ── Usuários (protegidos) ─────────────────────────────────────────────────────
router.post('/register',       tenantMiddleware, requireTenant, authenticate, register);
router.get('/profile',         tenantMiddleware, requireTenant, authenticate, getProfile);
router.get('/users',           tenantMiddleware, requireTenant, authenticate, listUsers);
router.put('/users/:id',       tenantMiddleware, requireTenant, authenticate, updateUser);
router.delete('/users/:id',    tenantMiddleware, requireTenant, authenticate, deleteUser);

module.exports = router;
