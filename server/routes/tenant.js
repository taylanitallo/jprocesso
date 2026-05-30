const express = require('express');
const router = express.Router();
const {
  createTenant,
  listTenants,
  getTenantById,
  getTenantInfo,
  updateTenant,
  updateTenantConfiguracoes,
  deleteTenant,
  getStatistics
} = require('../controllers/tenantController');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

// Atalho: garante que o caller é SuperAdmin autenticado
const superAdmin = [authenticate, requireSuperAdmin];

// ── Rotas PÚBLICAS ────────────────────────────────────────────────────────────
// Info por subdomain — usada na tela de Login antes de qualquer autenticação
router.get('/info', getTenantInfo);

// ── Rotas PROTEGIDAS (SuperAdmin apenas) ─────────────────────────────────────
// Estatísticas do painel admin
router.get('/statistics', ...superAdmin, getStatistics);

// Atualizar configurações do tenant autenticado (logo, cores etc.)
// Mantém apenas `authenticate` — qualquer admin do próprio tenant pode configurar
router.put('/configuracoes', authenticate, updateTenantConfiguracoes);

// CRUD completo de tenants
router.post('/',    ...superAdmin, createTenant);
router.get('/',     ...superAdmin, listTenants);
router.get('/:id',  ...superAdmin, getTenantById);
router.put('/:id',  ...superAdmin, updateTenant);
router.delete('/:id', ...superAdmin, deleteTenant);

module.exports = router;
