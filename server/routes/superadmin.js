const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const {
  // Tenants
  listTenants, getTenant, createTenant, updateTenant, deleteTenant,

  // Usuários
  listTenantUsers, listTenantSecretarias, createTenantUser, updateTenantUser, deleteTenantUser,

  // Logs
  listTenantLogs, clearTenantLogs, listAccessReport,

  // Backup
  listBackups, createBackup, downloadBackup, deleteBackup, clearBackupHistory,

  // Agendamento
  getSchedule, updateSchedule, runBackupNow,

  // Restore
  restoreTenant,

  // Logos e Config
  updateLogos, deleteLogo, updateConfig, getTimbrado,

  // Utilitários
  criarBucket, ativarTenant,
} = require('../controllers/superadminController');

// Middleware de autenticação + autorização SuperAdmin
const sa = [authenticate, requireSuperAdmin];

// Multer: memória, até 500 MB (para restores grandes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }
});

// ─── Utilitários ──────────────────────────────────────────────────────────────
router.post('/bucket', ...sa, criarBucket);

// ─── Tenants ──────────────────────────────────────────────────────────────────
router.get   ('/tenants',     ...sa, listTenants);
router.post  ('/tenants',     ...sa, createTenant);
router.get   ('/tenants/:id', ...sa, getTenant);
router.put   ('/tenants/:id', ...sa, updateTenant);
router.delete('/tenants/:id', ...sa, deleteTenant);

// Ativar tenant
router.patch('/tenants/:id/ativar', ...sa, ativarTenant);

// ─── Usuários ─────────────────────────────────────────────────────────────────
router.get   ('/tenants/:id/usuarios',             ...sa, listTenantUsers);
router.get   ('/tenants/:id/users',                ...sa, listTenantUsers);
router.get   ('/tenants/:id/secretarias-setores',  ...sa, listTenantSecretarias);
router.post  ('/tenants/:id/usuarios',         ...sa, createTenantUser);
router.post  ('/tenants/:id/users',            ...sa, createTenantUser);
router.put   ('/tenants/:id/usuarios/:userId', ...sa, updateTenantUser);
router.put   ('/tenants/:id/users/:userId',    ...sa, updateTenantUser);
router.delete('/tenants/:id/usuarios/:userId', ...sa, deleteTenantUser);
router.delete('/tenants/:id/users/:userId',    ...sa, deleteTenantUser);

// ─── Logs ─────────────────────────────────────────────────────────────────────
router.get   ('/tenants/:id/logs',          ...sa, listTenantLogs);
router.delete('/tenants/:id/logs',          ...sa, clearTenantLogs);
router.get   ('/tenants/:id/access-report', ...sa, listAccessReport);

// ─── Backup ───────────────────────────────────────────────────────────────────
router.get   ('/tenants/:id/backups',                        ...sa, listBackups);
router.post  ('/tenants/:id/backups',                        ...sa, createBackup);
router.post  ('/tenants/:id/backup',                         ...sa, createBackup);  // alias rota antiga
router.get   ('/tenants/:id/backups/:backupId/download',     ...sa, downloadBackup);
router.delete('/tenants/:id/backups/:backupId',              ...sa, deleteBackup);
router.delete('/tenants/:id/backups',                        ...sa, clearBackupHistory);

// ─── Agendamento ──────────────────────────────────────────────────────────────
router.get ('/tenants/:id/schedule',       ...sa, getSchedule);
router.put ('/tenants/:id/schedule',       ...sa, updateSchedule);
router.post('/tenants/:id/schedule/run',   ...sa, runBackupNow);

// ─── Restore ──────────────────────────────────────────────────────────────────
router.post('/tenants/:id/restore', ...sa, upload.single('backup'), restoreTenant);
// Alias: campo 'arquivo' (compatibilidade com versão anterior do frontend)
router.post('/tenants/:id/restore-v1', ...sa, upload.single('arquivo'), restoreTenant);

// ─── Logos e Config ───────────────────────────────────────────────────────────
router.post  ('/tenants/:id/logos/:tipo', ...sa, upload.single('logo'), updateLogos);
router.delete('/tenants/:id/logos/:tipo', ...sa, deleteLogo);
router.put   ('/tenants/:id/config',      ...sa, updateConfig);
router.get   ('/tenants/:id/timbrado',    ...sa, getTimbrado);

module.exports = router;
