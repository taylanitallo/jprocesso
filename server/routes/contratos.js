const express = require('express');
const router = express.Router();
const {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
} = require('../controllers/contratosController');
const {
  listOrdens, listOrdemDisponivelDid, getSaldoContrato, getItensContrato, createOrdem, updateOrdem, deleteOrdem,
} = require('../controllers/ordensController');
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');

// Todos os endpoints exigem autenticaÃ§Ã£o + tenant
router.use(tenantMiddleware, requireTenant, authenticate);

// Credores
router.get('/credores',       listCredores);
router.post('/credores',      createCredor);
router.put('/credores/:id',   updateCredor);
router.delete('/credores/:id', deleteCredor);

// CatÃ¡logo de Itens
// (rota SSE /itens/importar-transparencia removida)
router.get('/itens',       listItens);
router.post('/itens',      createItem);
router.put('/itens/:id',   updateItem);
router.delete('/itens/:id', deleteItem);

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

