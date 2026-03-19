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
const { authenticate } = require('../middleware/auth');

// Estatísticas gerais do sistema multi-tenant
router.get('/statistics', getStatistics);

// Info pública por subdomain (usada na tela de Login — deve vir ANTES de /:id)
router.get('/info', getTenantInfo);

// Atualizar configurações gerais (logos, cores) — requer autenticação
router.put('/configuracoes', authenticate, updateTenantConfiguracoes);

// CRUD de tenants
router.post('/', createTenant);
router.get('/', listTenants);
router.get('/:id', getTenantById);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);

module.exports = router;
