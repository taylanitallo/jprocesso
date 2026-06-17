const express = require('express');
const router = express.Router();
const { listReceitas, createReceita, updateReceita, deleteReceita } = require('../controllers/receitasController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

router.get('/receitas',        tenantMiddleware, requireTenant, authenticate, listReceitas);
router.post('/receitas',       tenantMiddleware, requireTenant, authenticate, createReceita);
router.put('/receitas/:id',    tenantMiddleware, requireTenant, authenticate, updateReceita);
router.delete('/receitas/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), deleteReceita);

module.exports = router;
