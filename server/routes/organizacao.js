const express = require('express');
const router = express.Router();
const {
  createSecretaria,
  listSecretarias,
  listSecretariasPublico,
  updateSecretaria,
  updateSecretariaLogo,
  deleteSecretaria,
  createSetor,
  listSetores,
  updateSetor,
  deleteSetor,
  getSetoresBySecretaria,
  getUsuariosBySetor,
  getEntidade,
  updateEntidade,
  listAgentes,
  createAgente,
  updateAgente,
  deleteAgente,
  importarSecretariasAgentes,
} = require('../controllers/organizacaoController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

router.get('/secretarias/publico', tenantMiddleware, requireTenant, listSecretariasPublico);
router.post('/secretarias', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), createSecretaria);
router.get('/secretarias', tenantMiddleware, requireTenant, authenticate, listSecretarias);
router.get('/secretarias/:secretariaId/setores', tenantMiddleware, requireTenant, authenticate, getSetoresBySecretaria);
router.put('/secretarias/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), updateSecretaria);
router.patch('/secretarias/:id/logo', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), updateSecretariaLogo);
router.delete('/secretarias/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin'), deleteSecretaria);

router.post('/setores', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), createSetor);
router.get('/setores', tenantMiddleware, requireTenant, authenticate, listSetores);
router.get('/setores/:setorId/usuarios', tenantMiddleware, requireTenant, authenticate, getUsuariosBySetor);
router.put('/setores/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), updateSetor);
router.delete('/setores/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin'), deleteSetor);

router.get('/entidade', tenantMiddleware, requireTenant, authenticate, getEntidade);
router.put('/entidade', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), updateEntidade);

router.get('/agentes', tenantMiddleware, requireTenant, authenticate, listAgentes);
router.post('/agentes', tenantMiddleware, requireTenant, authenticate, createAgente);
router.put('/agentes/:id', tenantMiddleware, requireTenant, authenticate, updateAgente);
router.delete('/agentes/:id', tenantMiddleware, requireTenant, authenticate, deleteAgente);

// SSE — importar secretarias + agentes do site de Irauçuba
router.get('/importar-iraucuba', tenantMiddleware, requireTenant, authenticate, importarSecretariasAgentes);

module.exports = router;
