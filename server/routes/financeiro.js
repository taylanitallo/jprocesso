const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware } = require('../middleware/auth');
const {
  getDashboard,
  getDashboardOptions,
  listLancamentos, createLancamento, updateLancamento, deleteLancamento, pagarLancamento,
  getProcessosDid,
  getRelatorio
} = require('../controllers/financeiroController');

const mid = [tenantMiddleware, authenticate];

// Painel
router.get('/dashboard', mid, getDashboard);
router.get('/dashboard/options', mid, getDashboardOptions);

// Lançamentos
router.get('/lancamentos', mid, listLancamentos);
router.post('/lancamentos', mid, createLancamento);
router.put('/lancamentos/:id', mid, updateLancamento);
router.delete('/lancamentos/:id', mid, deleteLancamento);
router.put('/lancamentos/:id/pagar', mid, pagarLancamento);

// Processos DID
router.get('/processos-did', mid, getProcessosDid);

// Relatório
router.get('/relatorio', mid, getRelatorio);

module.exports = router;
