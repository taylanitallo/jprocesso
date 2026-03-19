const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware } = require('../middleware/auth');
const { getByProcesso, createOrUpdate, getProximoNumero, getEstoque, getAlmEstoque } = require('../controllers/didController');

const mid = [tenantMiddleware, authenticate];

router.get('/proximo-numero', mid, getProximoNumero);
router.get('/alm-estoque', mid, getAlmEstoque);
router.get('/estoque/:contratoRef', mid, getEstoque);
router.get('/processo/:processoId', mid, getByProcesso);
router.post('/processo/:processoId', mid, createOrUpdate);

module.exports = router;
