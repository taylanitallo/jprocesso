const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant, requirePermission, requireAlgumaPermissao, requireModulo } = require('../middleware/auth');
const {
  getDashboard,
  getDashboardOptions,
  getProcessosDid,
  getRelatorio
} = require('../controllers/financeiroController');

// Módulo contratado + Financeiro › acesso; cada aba confere o seu "Ver"
router.use(tenantMiddleware, requireTenant, authenticate, requireModulo('financeiro'), requirePermission('financeiro', 'acessar'));
const aba = (...abas) => requireAlgumaPermissao(...abas.map(a => ['financeiro', a, 'ver']));

// Painel (as opções de filtro também servem ao Relatório)
router.get('/dashboard', aba('painel'), getDashboard);
router.get('/dashboard/options', aba('painel', 'relatorio'), getDashboardOptions);

// Processos DID (o Relatório também lista os DIDs)
router.get('/processos-did', aba('processos_did', 'relatorio'), getProcessosDid);

// Relatório
router.get('/relatorio', aba('relatorio'), getRelatorio);

module.exports = router;
