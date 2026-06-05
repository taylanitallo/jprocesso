const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const {
  getTenantUsers, createTenantUser, updateTenantUser, deleteTenantUser,
  getTenantLogs,
  createBackup, listBackups, downloadBackup, deleteBackup, restoreBackup,
  uploadLogo, deleteLogo,
  criarBucket, ativarTenant,
} = require('../controllers/superadminController');

const sa     = [authenticate, requireSuperAdmin];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// Bucket
router.post('/bucket',                          ...sa, criarBucket);

// Usuários por tenant
router.get   ('/tenants/:id/usuarios',          ...sa, getTenantUsers);
router.post  ('/tenants/:id/usuarios',          ...sa, createTenantUser);
router.put   ('/tenants/:id/usuarios/:userId',  ...sa, updateTenantUser);
router.delete('/tenants/:id/usuarios/:userId',  ...sa, deleteTenantUser);

// Logs por tenant
router.get('/tenants/:id/logs',                 ...sa, getTenantLogs);

// Backup
router.post  ('/tenants/:id/backup',            ...sa, createBackup);
router.get   ('/tenants/:id/backups',           ...sa, listBackups);
router.get   ('/tenants/:id/backups/:backupId/download', ...sa, downloadBackup);
router.delete('/tenants/:id/backups/:backupId', ...sa, deleteBackup);

// Restore
router.post('/tenants/:id/restore',             ...sa, upload.single('arquivo'), restoreBackup);

// Logos
router.post  ('/tenants/:id/logos/:tipo',       ...sa, upload.single('logo'), uploadLogo);
router.delete('/tenants/:id/logos/:tipo',       ...sa, deleteLogo);

// Ativar tenant
router.patch('/tenants/:id/ativar',             ...sa, ativarTenant);

module.exports = router;
