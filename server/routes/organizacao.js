const express = require('express');
const router = express.Router();
const {
  createSecretaria,
  listSecretarias,
  listSecretariasPublico,
  updateSecretaria,
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
const { authenticate, tenantMiddleware, authorize } = require('../middleware/auth');

router.get('/secretarias/publico', tenantMiddleware, listSecretariasPublico);
router.post('/secretarias', tenantMiddleware, authenticate, authorize('admin', 'gestor'), createSecretaria);
router.get('/secretarias', tenantMiddleware, authenticate, listSecretarias);
router.get('/secretarias/:secretariaId/setores', tenantMiddleware, authenticate, getSetoresBySecretaria);
router.put('/secretarias/:id', tenantMiddleware, authenticate, authorize('admin', 'gestor'), updateSecretaria);
router.delete('/secretarias/:id', tenantMiddleware, authenticate, authorize('admin'), deleteSecretaria);

router.post('/setores', tenantMiddleware, authenticate, authorize('admin', 'gestor'), createSetor);
router.get('/setores', tenantMiddleware, authenticate, listSetores);
router.get('/setores/:setorId/usuarios', tenantMiddleware, authenticate, getUsuariosBySetor);
router.put('/setores/:id', tenantMiddleware, authenticate, authorize('admin', 'gestor'), updateSetor);
router.delete('/setores/:id', tenantMiddleware, authenticate, authorize('admin'), deleteSetor);

router.get('/entidade', tenantMiddleware, authenticate, getEntidade);
router.put('/entidade', tenantMiddleware, authenticate, authorize('admin', 'gestor'), updateEntidade);

router.get('/agentes', tenantMiddleware, authenticate, listAgentes);
router.post('/agentes', tenantMiddleware, authenticate, createAgente);
router.put('/agentes/:id', tenantMiddleware, authenticate, updateAgente);
router.delete('/agentes/:id', tenantMiddleware, authenticate, deleteAgente);

// SSE — importar secretarias + agentes do site de Irauçuba
router.get('/importar-iraucuba', tenantMiddleware, authenticate, importarSecretariasAgentes);

module.exports = router;
