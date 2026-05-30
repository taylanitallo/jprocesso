const express = require('express');
const router = express.Router();
const {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
} = require('../controllers/contratosController');
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

// Contratos // SSE â€” deve vir antes de /:id
router.get('/',       listContratos);
router.post('/',      createContrato);
router.put('/:id',    updateContrato);
router.delete('/:id', deleteContrato);

// SincronizaÃ§Ã£o: importa credores dos DIDs existentes para a tabela credores
router.post('/sync-from-dids', syncFromDids);

module.exports = router;

