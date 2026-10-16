const express = require('express');
const router = express.Router();
const {
  uploadDocumento,
  downloadDocumento,
  viewDocumento,
  downloadZip,
  downloadMerged,
  moverDocumento,
  listDocumentos,
  deleteDocumento,
  reorderDocumentos,
  salvarDocumentoGerado,
  listarDocumentosGerados,
} = require('../controllers/documentoController');
const { authenticate, tenantMiddleware, requireTenant, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateFileContent } = require('../middleware/upload');

const tenantAuth = [tenantMiddleware, requireTenant, authenticate];
const arquivo = (aba, acao) => [requirePermission('arquivo', 'acessar'), requirePermission('arquivo', aba, acao)];

// A-1: validateFileContent verifica magic bytes após o multer receber o buffer
router.post('/upload',              ...tenantAuth, requirePermission('processos', 'anexar_documento'), upload.single('file'), validateFileContent, uploadDocumento);
router.post('/salvar-gerado',       ...tenantAuth, upload.single('file'), salvarDocumentoGerado);
router.get('/gerados',              ...tenantAuth, ...arquivo('gerados', 'ver'), listarDocumentosGerados);
router.get('/download/:id',         ...tenantAuth, downloadDocumento);
router.get('/view/:id',             ...tenantAuth, viewDocumento);
router.get('/zip/:processoId',      ...tenantAuth, downloadZip);
router.get('/merged/:processoId',   ...tenantAuth, downloadMerged);
router.patch('/:id/mover',          ...tenantAuth, ...arquivo('processos', 'mover'), moverDocumento);
router.get('/',                     ...tenantAuth, listDocumentos);
router.put('/reorder',              ...tenantAuth, reorderDocumentos);
// A permissão depende do tipo do documento — conferida no controller
router.delete('/:id',               ...tenantAuth, deleteDocumento);

module.exports = router;
