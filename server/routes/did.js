const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');
const { getByProcesso, createOrUpdate, getProximoNumero, getEstoque, getAlmEstoque, uploadCertidao, downloadCertidaoUrl, deleteCertidao } = require('../controllers/didController');
const upload = require('../middleware/upload');
const { validateFileContent } = require('../middleware/upload');

const mid = [tenantMiddleware, requireTenant, authenticate];

router.get('/proximo-numero', mid, getProximoNumero);
router.get('/alm-estoque', mid, getAlmEstoque);
router.get('/estoque/:contratoRef', mid, getEstoque);
router.get('/processo/:processoId', mid, getByProcesso);
router.post('/processo/:processoId', mid, createOrUpdate);
router.post('/processo/:processoId/certidao/:certKey', mid, upload.single('file'), validateFileContent, uploadCertidao);
router.get('/processo/:processoId/certidao/:certKey/url', mid, downloadCertidaoUrl);
router.delete('/processo/:processoId/certidao/:certKey', mid, deleteCertidao);

module.exports = router;
