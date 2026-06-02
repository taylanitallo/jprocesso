const express = require('express');
const router = express.Router();
const {
  uploadDocumento,
  downloadDocumento,
  listDocumentos,
  deleteDocumento
} = require('../controllers/documentoController');
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateFileContent } = require('../middleware/upload');

// A-1: validateFileContent verifica magic bytes após o multer receber o buffer
router.post('/upload', tenantMiddleware, requireTenant, authenticate, upload.single('file'), validateFileContent, uploadDocumento);
router.get('/download/:id', tenantMiddleware, requireTenant, authenticate, downloadDocumento);
router.get('/', tenantMiddleware, requireTenant, authenticate, listDocumentos);
router.delete('/:id', tenantMiddleware, requireTenant, authenticate, deleteDocumento);

module.exports = router;
