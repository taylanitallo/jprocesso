const express = require('express');
const router = express.Router();
const {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem,
  listContratos, createContrato, updateContrato, deleteContrato,
} = require('../controllers/contratosController');
const { authenticate, tenantMiddleware } = require('../middleware/auth');

// Todos os endpoints exigem autenticação + tenant
router.use(tenantMiddleware, authenticate);

// Credores
router.get('/credores',       listCredores);
router.post('/credores',      createCredor);
router.put('/credores/:id',   updateCredor);
router.delete('/credores/:id', deleteCredor);

// Catálogo de Itens
router.get('/itens',       listItens);
router.post('/itens',      createItem);
router.put('/itens/:id',   updateItem);
router.delete('/itens/:id', deleteItem);

// Contratos
router.get('/',       listContratos);
router.post('/',      createContrato);
router.put('/:id',    updateContrato);
router.delete('/:id', deleteContrato);

module.exports = router;
