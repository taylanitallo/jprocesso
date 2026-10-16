const express = require('express');
const router = express.Router();
const {
  createTenant,
  listTenants,
  getTenantById,
  getTenantInfo,
  getTenantLogo,
  updateTenant,
  updateTenantConfiguracoes,
  deleteTenant,
  getStatistics
} = require('../controllers/tenantController');
const { authenticate, requireSuperAdmin, tenantMiddleware, requireTenant, authorize, requirePermission, requireAlgumaPermissao } = require('../middleware/auth');

// Atalho: garante que o caller é SuperAdmin autenticado
const superAdmin = [authenticate, requireSuperAdmin];

// ── Rotas PÚBLICAS ────────────────────────────────────────────────────────────
// Info por subdomain — usada na tela de Login antes de qualquer autenticação
router.get('/info', getTenantInfo);

// Logo (login/interna) por subdomain — servida do bucket privado via proxy
router.get('/:subdomain/logo/:tipo', getTenantLogo);

// Legislação do município (botão "Legislação" da tela de login)
const legislacao = require('../controllers/legislacaoController');
router.get('/:subdomain/legislacoes', legislacao.listarPublico);
router.get('/:subdomain/legislacoes/:lid/arquivo', legislacao.arquivoPublico);

// Lista pública de tenants ativos — usada no seletor de município
router.get('/public', async (req, res) => {
  try {
    const tenants = await require('../models/Tenant').findAll({
      where: { ativo: true },
      order: [['nome_municipio', 'ASC']],
      attributes: ['id', 'nome_municipio', 'subdominio', 'cidade', 'estado', 'configuracoes']
    });
    res.json({ success: true, tenants });
  } catch (e) {
    console.error('❌ Erro ao listar tenants públicos:', e);
    res.status(500).json({ error: 'Erro ao listar municípios' });
  }
});

// ── Rotas PROTEGIDAS (SuperAdmin apenas) ─────────────────────────────────────
// Estatísticas do painel admin
router.get('/statistics', ...superAdmin, getStatistics);

// A-3: tenantMiddleware resolve req.tenant; requireTenant bloqueia admin global;
// authenticate verifica JWT (inclui binding JWT↔tenant da SEC-01A);
// authorize restringe a admin e gestor — operacional recebe 403
// Permissões: Administração › Configurações + Gerais › Alterar (ou Import/Export › Importar,
// que salva a URL de importação de itens)
router.put('/configuracoes', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'),
  requirePermission('administracao', 'gerenciar_configuracoes'),
  requireAlgumaPermissao(['configuracoes', 'gerais', 'editar'], ['configuracoes', 'importexport', 'importar']),
  updateTenantConfiguracoes);

// CRUD completo de tenants
router.post('/',    ...superAdmin, createTenant);
router.get('/',     ...superAdmin, listTenants);
router.get('/:id',  ...superAdmin, getTenantById);
router.put('/:id',  ...superAdmin, updateTenant);
router.delete('/:id', ...superAdmin, deleteTenant);

module.exports = router;
