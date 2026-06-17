const express = require('express');
const router = express.Router();
const { listReceitas, createReceita, updateReceita, deleteReceita } = require('../controllers/receitasController');
const { listDespesas, registrarPagamento, updatePagamento, estornarPagamento } = require('../controllers/despesasController');
const { saldoContas, fluxoMensal, extratoConta } = require('../controllers/relatoriosController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

// ── Receitas ──────────────────────────────────────────────────────────────────
router.get('/receitas',        tenantMiddleware, requireTenant, authenticate, listReceitas);
router.post('/receitas',       tenantMiddleware, requireTenant, authenticate, createReceita);
router.put('/receitas/:id',    tenantMiddleware, requireTenant, authenticate, updateReceita);
router.delete('/receitas/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), deleteReceita);

// ── Despesas (ordens de compra/serviço + pagamento) ───────────────────────────
router.get('/despesas',                   tenantMiddleware, requireTenant, authenticate, listDespesas);
router.post('/despesas/:ordem_id',        tenantMiddleware, requireTenant, authenticate, registrarPagamento);
router.put('/despesas/pagamento/:id',     tenantMiddleware, requireTenant, authenticate, updatePagamento);
router.delete('/despesas/pagamento/:id',  tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), estornarPagamento);

// ── Relatórios ────────────────────────────────────────────────────────────────
router.get('/relatorios/saldo-contas', tenantMiddleware, requireTenant, authenticate, saldoContas);
router.get('/relatorios/fluxo-mensal', tenantMiddleware, requireTenant, authenticate, fluxoMensal);
router.get('/relatorios/extrato',      tenantMiddleware, requireTenant, authenticate, extratoConta);

module.exports = router;
