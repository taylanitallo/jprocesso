const express = require('express');
const router = express.Router();
const {
  createProcesso,
  listProcessos,
  getDashboardStats,
  getProcessoById,
  tramitarProcesso,
  devolverProcesso,
  concluirProcesso,
  listProcessosEnviados,
  getArquivoProcessos,
  buscarProcessosPublico,
  consultarProcessoPublico,
  deleteProcesso,
} = require('../controllers/processoController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

// Todas as rotas de processo exigem tenant resolvido (req.models)
const tenantAuth = [tenantMiddleware, requireTenant, authenticate];

router.get('/dashboard', ...tenantAuth, getDashboardStats);
router.post('/', ...tenantAuth, createProcesso);
router.get('/', ...tenantAuth, listProcessos);
router.get('/enviados', ...tenantAuth, listProcessosEnviados);
router.get('/arquivo',  ...tenantAuth, getArquivoProcessos);
router.get('/:id', ...tenantAuth, getProcessoById);
router.post('/:id/tramitar', ...tenantAuth, tramitarProcesso);
router.post('/:id/devolver', ...tenantAuth, devolverProcesso);
router.post('/:id/concluir', ...tenantAuth, concluirProcesso);
router.delete('/:id', ...tenantAuth, authorize('admin'), deleteProcesso);

// Rotas públicas (sem autenticação) — ainda exigem tenant válido
router.get('/publico/busca', tenantMiddleware, requireTenant, buscarProcessosPublico);
router.get('/publico/:numero', tenantMiddleware, requireTenant, consultarProcessoPublico);

module.exports = router;
