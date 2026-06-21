const express = require('express');
const router = express.Router();
const {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem, getDnaItem,
  importarItensUrl, excluirItensInativos, contarItensSemVinculo, excluirItensSemVinculo, verificarItensUrl,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
} = require('../controllers/contratosController');
const {
  listOrdens, listOrdemDisponivelDid, getSaldoContrato, getItensContrato, createOrdem, updateOrdem, deleteOrdem,
} = require('../controllers/ordensController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

// Todos os endpoints exigem autenticaÃ§Ã£o + tenant
router.use(tenantMiddleware, requireTenant, authenticate);

// Credores
router.get('/credores',       listCredores);
router.post('/credores',      createCredor);
router.put('/credores/:id',   updateCredor);
router.delete('/credores/:id', deleteCredor);

// Catálogo de Itens
router.post('/itens/verificar-url',  authorize('admin', 'jeos'), verificarItensUrl);
router.post('/itens/importar-url',   authorize('admin', 'jeos'), importarItensUrl);
router.delete('/itens/inativos',     authorize('admin', 'jeos'), excluirItensInativos);
router.get('/itens/sem-vinculo/count', authorize('admin', 'jeos'), contarItensSemVinculo);
router.delete('/itens/sem-vinculo',    authorize('admin', 'jeos'), excluirItensSemVinculo);
router.get('/itens',            listItens);
router.get('/itens/:id/dna',   getDnaItem);
router.post('/itens',          createItem);
router.put('/itens/:id',       updateItem);
router.delete('/itens/:id',    deleteItem);

// Ordens de Compra/Serviço
router.get('/ordens',                              listOrdens);
router.get('/ordens/disponiveis-did',              listOrdemDisponivelDid);
router.get('/ordens/saldo/:contrato_id',           getSaldoContrato);
router.get('/ordens/itens-contrato/:contrato_id',  getItensContrato);
router.post('/ordens',                             createOrdem);
router.put('/ordens/:id',                          updateOrdem);
router.delete('/ordens/:id',                       deleteOrdem);

// Contratos // SSE â€” deve vir antes de /:id
router.get('/',       listContratos);
router.post('/',      createContrato);
router.put('/:id',    updateContrato);
router.delete('/:id', deleteContrato);

// SincronizaÃ§Ã£o: importa credores dos DIDs existentes para a tabela credores
router.post('/sync-from-dids', syncFromDids);

module.exports = router;

