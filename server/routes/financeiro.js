const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');
const {
  getDashboard,
  getDashboardOptions,
  getProcessosDid,
  getRelatorio
} = require('../controllers/financeiroController');

const mid = [tenantMiddleware, requireTenant, authenticate];

// Painel
router.get('/dashboard', mid, getDashboard);
router.get('/dashboard/options', mid, getDashboardOptions);

// Processos DID
router.get('/processos-did', mid, getProcessosDid);

// Relatório
router.get('/relatorio', mid, getRelatorio);

module.exports = router;
