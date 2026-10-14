const express = require('express');
const router = express.Router();
const { listReceitas, createReceita, updateReceita, deleteReceita } = require('../controllers/receitasController');
const { listDespesas, listRetencoes, recolherRetencoes, desfazerRecolhimento } = require('../controllers/despesasController');
const { saldoContas, fluxoMensal, extratoConta, disponivelConta } = require('../controllers/relatoriosController');
const { listGrupos, createGrupo, updateGrupo, deleteGrupo } = require('../controllers/gruposContasController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

// ── Receitas ──────────────────────────────────────────────────────────────────
router.get('/receitas',        tenantMiddleware, requireTenant, authenticate, listReceitas);
router.post('/receitas',       tenantMiddleware, requireTenant, authenticate, createReceita);
router.put('/receitas/:id',    tenantMiddleware, requireTenant, authenticate, updateReceita);
router.delete('/receitas/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), deleteReceita);

// ── Despesas (ordens de compra/serviço — o pagamento é feito no DID) ──────────
router.get('/despesas', tenantMiddleware, requireTenant, authenticate, listDespesas);

// ── Retenções dos DIDs pagos (INSS, ISS, IRRF…) a recolher ────────────────────
router.get('/retencoes',           tenantMiddleware, requireTenant, authenticate, listRetencoes);
router.post('/retencoes/recolher', tenantMiddleware, requireTenant, authenticate, recolherRetencoes);
router.post('/retencoes/desfazer', tenantMiddleware, requireTenant, authenticate, desfazerRecolhimento);

// ── Relatórios ────────────────────────────────────────────────────────────────
router.get('/contas/:id/disponivel',   tenantMiddleware, requireTenant, authenticate, disponivelConta);
router.get('/relatorios/saldo-contas', tenantMiddleware, requireTenant, authenticate, saldoContas);
router.get('/relatorios/fluxo-mensal', tenantMiddleware, requireTenant, authenticate, fluxoMensal);
router.get('/relatorios/extrato',      tenantMiddleware, requireTenant, authenticate, extratoConta);

// ── Grupos de contas do "Saldo por Conta" (privados por usuário) ──────────────
router.get('/grupos-contas',        tenantMiddleware, requireTenant, authenticate, listGrupos);
router.post('/grupos-contas',       tenantMiddleware, requireTenant, authenticate, createGrupo);
router.put('/grupos-contas/:id',    tenantMiddleware, requireTenant, authenticate, updateGrupo);
router.delete('/grupos-contas/:id', tenantMiddleware, requireTenant, authenticate, deleteGrupo);

module.exports = router;
