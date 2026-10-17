const express = require('express');
const router = express.Router();
const {
  createSecretaria,
  listSecretarias,
  listSecretariasPublico,
  updateSecretaria,
  updateSecretariaLogo,
  obterTimbradoSecretaria,
  assinantesSecretaria,
  salvarTimbradoSecretaria,
  deleteSecretaria,
  createSetor,
  listSetores,
  updateSetor,
  deleteSetor,
  getSetoresBySecretaria,
  getUsuariosBySetor,
  getEntidade,
  updateEntidade,
  listAgentes,
  createAgente,
  importarAgentes,
  updateAgente,
  deleteAgente,
} = require('../controllers/organizacaoController');
const { listBancos, listContas, createConta, updateConta, deleteConta } = require('../controllers/contasBancariasController');
const { authenticate, tenantMiddleware, requireTenant, authorize, requirePermission, requireAbaOrganizacao } = require('../middleware/auth');

// Permissões de Organização (editor de permissões › Organização)
const perm = (aba, acao) => requirePermission('organizacao', aba, acao);
// A tela Organização abre com Administração › Gerenciar Organização
// Acesso ao módulo + aba (Organização no editor; permissões antigas: Administração)
const aba = (...abas) => requireAbaOrganizacao(...abas);
// Contas bancárias são cadastradas na Tesouraria › Contas Bancárias
const permConta = (acao) => requirePermission('tesouraria', 'contas', acao);

// Responsáveis ficam dentro da secretaria (mesma rota PUT). Quando o corpo traz a
// lista, a ação sai da comparação com a atual: mais = incluir, menos = excluir.
const permEdicaoSecretaria = async (req, res, next) => {
  if (!Array.isArray(req.body?.responsaveis)) return perm('secretarias', 'editar')(req, res, next);
  try {
    const sec = await req.models.Secretaria.findByPk(req.params.id, { attributes: ['responsaveis'] });
    const antes = Array.isArray(sec?.responsaveis) ? sec.responsaveis.length : 0;
    const depois = req.body.responsaveis.length;
    const acao = depois > antes ? 'criar' : depois < antes ? 'excluir' : 'editar';
    return perm('responsaveis', acao)(req, res, next);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar permissão' });
  }
};

router.get('/secretarias/publico', tenantMiddleware, requireTenant, listSecretariasPublico);
router.post('/secretarias', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), aba('secretarias'), perm('secretarias', 'criar'), createSecretaria);
router.get('/secretarias', tenantMiddleware, requireTenant, authenticate, listSecretarias);
router.get('/secretarias/:secretariaId/setores', tenantMiddleware, requireTenant, authenticate, getSetoresBySecretaria);
router.put('/secretarias/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), aba('secretarias', 'responsaveis'), permEdicaoSecretaria, updateSecretaria);
router.patch('/secretarias/:id/logo', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), perm('secretarias', 'editar'), updateSecretariaLogo);
// Timbrado da secretaria (Configurações › Layout): todos leem; gestor (própria), admin e Jeos alteram
// Assinantes (secretário vigente e responsáveis) para documentos — antes de /secretarias/:id
router.get('/secretarias/assinantes', tenantMiddleware, requireTenant, authenticate, assinantesSecretaria);
router.get('/secretarias/:id/timbrado', tenantMiddleware, requireTenant, authenticate, obterTimbradoSecretaria);
router.put('/secretarias/:id/timbrado', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), requirePermission('configuracoes', 'tema', 'editar'), salvarTimbradoSecretaria);
router.delete('/secretarias/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin'), aba('secretarias'), perm('secretarias', 'excluir'), deleteSecretaria);

router.post('/setores', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), aba('secretarias'), perm('secretarias', 'criar'), createSetor);
router.get('/setores', tenantMiddleware, requireTenant, authenticate, listSetores);
router.get('/setores/:setorId/usuarios', tenantMiddleware, requireTenant, authenticate, getUsuariosBySetor);
router.put('/setores/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), aba('secretarias'), perm('secretarias', 'editar'), updateSetor);
router.delete('/setores/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin'), aba('secretarias'), perm('secretarias', 'excluir'), deleteSetor);

router.get('/entidade', tenantMiddleware, requireTenant, authenticate, getEntidade);
router.put('/entidade', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), aba('entidade'), perm('entidade', 'editar'), updateEntidade);

router.get('/agentes', tenantMiddleware, requireTenant, authenticate, listAgentes);
router.post('/agentes', tenantMiddleware, requireTenant, authenticate, aba('agentes'), perm('agentes', 'criar'), createAgente);
// Importação por planilha: só administradores e gestores
router.post('/agentes/importar', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), aba('agentes'), perm('agentes', 'criar'), perm('agentes', 'importar'), importarAgentes);
router.put('/agentes/:id', tenantMiddleware, requireTenant, authenticate, aba('agentes'), perm('agentes', 'editar'), updateAgente);
router.delete('/agentes/:id', tenantMiddleware, requireTenant, authenticate, aba('agentes'), perm('agentes', 'excluir'), deleteAgente);

router.get('/bancos',                  authenticate, listBancos);
router.get('/contas-bancarias',        tenantMiddleware, requireTenant, authenticate, listContas);
router.post('/contas-bancarias',       tenantMiddleware, requireTenant, authenticate, permConta('criar'), createConta);
router.put('/contas-bancarias/:id',    tenantMiddleware, requireTenant, authenticate, permConta('editar'), updateConta);
router.delete('/contas-bancarias/:id', tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor'), permConta('excluir'), deleteConta);

module.exports = router;

