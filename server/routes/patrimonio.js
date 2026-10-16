const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/patrimonioController');
const { authenticate, tenantMiddleware, requireTenant, authorize, requirePermission, requireAlgumaPermissao, requireModulo } = require('../middleware/auth');

// Todas as rotas: módulo contratado + Patrimônio › acesso. As leituras cruzam
// abas, então conferem só o acesso; as gravações conferem a ação da aba.
router.use(tenantMiddleware, requireTenant, authenticate, requireModulo('patrimonio'), requirePermission('patrimonio', 'acessar'));
const auth = [];
const admin = [authorize('admin')];
const gestor = [authorize('admin', 'gestor')];
const perm = (aba, acao) => requirePermission('patrimonio', aba, acao);

// Dashboard
router.get('/dashboard',          ...auth,   ctrl.getDashboard);

// Grupos
router.get('/grupos',             ...auth,   ctrl.listarGrupos);
router.post('/grupos',            ...admin,  perm('grupos', 'gerenciar'), ctrl.criarGrupo);
router.put('/grupos/:id',         ...admin,  perm('grupos', 'gerenciar'), ctrl.atualizarGrupo);

// Bens (o registro sai da aba Tombamento ou de Bens › Incluir)
router.get('/bens',               ...auth,   ctrl.listarBens);
router.get('/bens/proximo-tombamento', ...gestor, ctrl.proximoTombamento);
router.get('/bens/:id',           ...auth,   ctrl.buscarBem);
router.post('/bens',              ...gestor,
  requireAlgumaPermissao(['patrimonio', 'tombamento', 'realizar'], ['patrimonio', 'bens', 'criar']), ctrl.registrarBem);
router.put('/bens/:id',           ...gestor, perm('bens', 'editar'), ctrl.atualizarBem);
router.post('/bens/:id/transferir', ...gestor, perm('transferencia', 'realizar'), ctrl.transferirBem);
router.post('/bens/:id/baixar',   ...admin,  perm('baixa', 'realizar'), ctrl.baixarBem);

// Responsabilidades
router.get('/responsabilidades',  ...auth,   ctrl.listarResponsabilidades);

// Inventário
router.get('/inventarios',            ...auth,   ctrl.listarInventarios);
router.post('/inventarios',           ...gestor, perm('inventario', 'realizar'), ctrl.criarInventario);
router.get('/inventarios/:id',        ...auth,   ctrl.buscarInventario);
router.put('/inventarios/:id/itens/:item_id/conferir', ...auth, perm('inventario', 'realizar'), ctrl.conferirItemInventario);
router.put('/inventarios/:id/concluir', ...gestor, perm('inventario', 'realizar'), ctrl.concluirInventario);

// Relatório (CSV/JSON)
router.get('/relatorio',          ...auth,   ctrl.getRelatorio);

module.exports = router;
