const express = require('express');
const router = express.Router();
const { login, register, getProfile, listUsers, updateUser, deleteUser } = require('../controllers/authController');
const { mockLogin } = require('../mock-auth');
const { authenticate, tenantMiddleware } = require('../middleware/auth');

// Usar mock login se não houver conexão com banco
const useMock = process.env.USE_MOCK_AUTH === 'true';

router.post('/login', useMock ? mockLogin : login);
router.post('/register', tenantMiddleware, authenticate, register);
router.get('/profile', tenantMiddleware, authenticate, getProfile);
router.get('/users', tenantMiddleware, authenticate, listUsers);
router.put('/users/:id', tenantMiddleware, authenticate, updateUser);
router.delete('/users/:id', tenantMiddleware, authenticate, deleteUser);

module.exports = router;
