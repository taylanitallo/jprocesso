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
  consultarProcessoPublico
} = require('../controllers/processoController');
const { authenticate, tenantMiddleware } = require('../middleware/auth');

router.get('/dashboard', tenantMiddleware, authenticate, getDashboardStats);
router.post('/', tenantMiddleware, authenticate, createProcesso);
router.get('/', tenantMiddleware, authenticate, listProcessos);
router.get('/enviados', tenantMiddleware, authenticate, listProcessosEnviados);
router.get('/:id', tenantMiddleware, authenticate, getProcessoById);
router.post('/:id/tramitar', tenantMiddleware, authenticate, tramitarProcesso);
router.post('/:id/devolver', tenantMiddleware, authenticate, devolverProcesso);
router.post('/:id/concluir', tenantMiddleware, authenticate, concluirProcesso);

router.get('/publico/:numero', tenantMiddleware, consultarProcessoPublico);

module.exports = router;
