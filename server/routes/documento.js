const express = require('express');
const router = express.Router();
const {
  uploadDocumento,
  downloadDocumento,
  listDocumentos,
  deleteDocumento
} = require('../controllers/documentoController');
const { authenticate, tenantMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload', tenantMiddleware, authenticate, upload.single('file'), uploadDocumento);
router.get('/download/:id', tenantMiddleware, authenticate, downloadDocumento);
router.get('/', tenantMiddleware, authenticate, listDocumentos);
router.delete('/:id', tenantMiddleware, authenticate, deleteDocumento);

module.exports = router;
