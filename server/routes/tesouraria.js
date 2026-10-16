const express = require('express');
const router = express.Router();
const { listReceitas, createReceita, updateReceita, deleteReceita } = require('../controllers/receitasController');
const { listDespesas, listRetencoes, recolherRetencoes, desfazerRecolhimento } = require('../controllers/despesasController');
const { saldoContas, fluxoMensal, extratoConta, disponivelConta } = require('../controllers/relatoriosController');
const { listGrupos, createGrupo, updateGrupo, deleteGrupo } = require('../controllers/gruposContasController');
const { authenticate, tenantMiddleware, requireTenant, authorize, requirePermission, requireModulo } = require('../middleware/auth');

// Saldo disponível da conta — usado no DID (Processos), fica fora do acesso à Tesouraria
router.get('/contas/:id/disponivel',   tenantMiddleware, requireTenant, authenticate, disponivelConta);

// Daqui em diante: módulo contratado + Tesouraria › acesso; gravações conferem a ação da aba
router.use(tenantMiddleware, requireTenant, authenticate, requireModulo('tesouraria'), requirePermission('tesouraria', 'acessar'));
const perm = (aba, acao) => requirePermission('tesouraria', aba, acao);

// ── Receitas ──────────────────────────────────────────────────────────────────
router.get('/receitas',        perm('receitas', 'ver'), listReceitas);
router.post('/receitas',       perm('receitas', 'criar'), createReceita);
router.put('/receitas/:id',    perm('receitas', 'editar'), updateReceita);
router.delete('/receitas/:id', authorize('admin', 'gestor'), perm('receitas', 'excluir'), deleteReceita);

// ── Despesas (ordens de compra/serviço — o pagamento é feito no DID) ──────────
router.get('/despesas', perm('despesas', 'ver'), listDespesas);

// ── Retenções dos DIDs pagos (INSS, ISS, IRRF…) a recolher ────────────────────
router.get('/retencoes',           perm('despesas', 'ver'), listRetencoes);
router.post('/retencoes/recolher', perm('despesas', 'editar'), recolherRetencoes);
router.post('/retencoes/desfazer', perm('despesas', 'editar'), desfazerRecolhimento);

// ── Relatórios ────────────────────────────────────────────────────────────────
router.get('/relatorios/saldo-contas', perm('relatorios', 'ver'), saldoContas);
router.get('/relatorios/fluxo-mensal', perm('relatorios', 'ver'), fluxoMensal);
// Extrato também abre pelo link da conta nas outras abas — só exige o acesso ao módulo
router.get('/relatorios/extrato',      extratoConta);

// ── Grupos de contas do "Saldo por Conta" (privados por usuário) ──────────────
router.get('/grupos-contas',        perm('relatorios', 'ver'), listGrupos);
router.post('/grupos-contas',       perm('relatorios', 'ver'), createGrupo);
router.put('/grupos-contas/:id',    perm('relatorios', 'ver'), updateGrupo);
router.delete('/grupos-contas/:id', perm('relatorios', 'ver'), deleteGrupo);

module.exports = router;
