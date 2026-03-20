const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/patrimonioController');
const { authenticate, tenantMiddleware, authorize } = require('../middleware/auth');

const auth = [tenantMiddleware, authenticate];
const admin = [...auth, authorize('admin')];
const gestor = [...auth, authorize('admin', 'gestor')];

// Dashboard
router.get('/dashboard',          ...auth,   ctrl.getDashboard);

// Grupos
router.get('/grupos',             ...auth,   ctrl.listarGrupos);
router.post('/grupos',            ...admin,  ctrl.criarGrupo);
router.put('/grupos/:id',         ...admin,  ctrl.atualizarGrupo);

// Bens
router.get('/bens',               ...auth,   ctrl.listarBens);
router.get('/bens/proximo-tombamento', ...gestor, ctrl.proximoTombamento);
router.get('/bens/:id',           ...auth,   ctrl.buscarBem);
router.post('/bens',              ...gestor, ctrl.registrarBem);
router.put('/bens/:id',           ...gestor, ctrl.atualizarBem);
router.post('/bens/:id/transferir', ...gestor, ctrl.transferirBem);
router.post('/bens/:id/baixar',   ...admin,  ctrl.baixarBem);

// Responsabilidades
router.get('/responsabilidades',  ...auth,   ctrl.listarResponsabilidades);

// Inventário
router.get('/inventarios',            ...auth,   ctrl.listarInventarios);
router.post('/inventarios',           ...gestor, ctrl.criarInventario);
router.get('/inventarios/:id',        ...auth,   ctrl.buscarInventario);
router.put('/inventarios/:id/itens/:item_id/conferir', ...auth, ctrl.conferirItemInventario);
router.put('/inventarios/:id/concluir', ...gestor, ctrl.concluirInventario);

// Relatório (CSV/JSON)
router.get('/relatorio',          ...auth,   ctrl.getRelatorio);

module.exports = router;
