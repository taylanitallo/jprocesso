const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');
const { getByProcesso, createOrUpdate, getProximoNumero, getEstoque, getAlmEstoque, uploadCertidao, downloadCertidaoUrl, deleteCertidao } = require('../controllers/didController');
const upload = require('../middleware/upload');
const { validateFileContent } = require('../middleware/upload');

const { exigirRecebimento } = require('../utils/recebimento');

const mid = [tenantMiddleware, requireTenant, authenticate];
// DID do processo só fica acessível ao destino depois que ele recebe o processo
const midProcesso = [...mid, exigirRecebimento];

router.get('/proximo-numero', mid, getProximoNumero);
router.get('/alm-estoque', mid, getAlmEstoque);
router.get('/estoque/:contratoRef', mid, getEstoque);
router.get('/processo/:processoId', midProcesso, getByProcesso);
router.post('/processo/:processoId', midProcesso, createOrUpdate);
router.post('/processo/:processoId/certidao/:certKey', midProcesso, upload.single('file'), validateFileContent, uploadCertidao);
router.get('/processo/:processoId/certidao/:certKey/url', midProcesso, downloadCertidaoUrl);
router.delete('/processo/:processoId/certidao/:certKey', midProcesso, deleteCertidao);

module.exports = router;
