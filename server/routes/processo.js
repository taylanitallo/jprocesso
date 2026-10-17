const express = require('express');
const router = express.Router();
const {
  createProcesso,
  listProcessos,
  getDashboardStats,
  getProcessoById,
  tramitarProcesso,
  devolverProcesso,
  concluirProcesso,
  receberProcesso,
  listProcessosEnviados,
  getArquivoProcessos,
  moverProcessoTipo,
  buscarProcessosPublico,
  consultarProcessoPublico,
  deleteProcesso,
  salvarDespachoDoc,
} = require('../controllers/processoController');
const { authenticate, tenantMiddleware, requireTenant, authorize, requirePermission, requireModulo } = require('../middleware/auth');

// Todas as rotas de processo exigem tenant resolvido (req.models)
const tenantAuth = [tenantMiddleware, requireTenant, authenticate, requireModulo('processos')];
const perm = (acao) => [requirePermission('processos', acao)];
// Lista, Enviados, Dashboard e criar: também o acesso ao módulo (editor › Processos).
// As ações num processo aberto por link (ex.: DID vindo do Financeiro) seguem só a ação.
const permModulo = (acao) => [requirePermission('processos', 'acessar'), requirePermission('processos', acao)];
// Ger. de Arquivos: acesso ao módulo + a aba Processos Concluídos
const arquivo = (acao) => [requirePermission('arquivo', 'acessar'), requirePermission('arquivo', 'processos', acao)];

// O detalhe (GET /:id) não confere "Ver": outros módulos (ex.: Financeiro) abrem o processo por link
router.get('/dashboard', ...tenantAuth, ...permModulo('ver'), getDashboardStats);
router.post('/', ...tenantAuth, ...permModulo('criar'), createProcesso);
router.get('/', ...tenantAuth, ...permModulo('ver'), listProcessos);
router.get('/enviados', ...tenantAuth, ...permModulo('ver'), listProcessosEnviados);
router.get('/arquivo',       ...tenantAuth, ...arquivo('ver'), getArquivoProcessos);
router.patch('/:id/tipo',   ...tenantAuth, ...arquivo('mover'), moverProcessoTipo);
router.get('/:id',          ...tenantAuth, getProcessoById);
router.post('/:id/tramitar', ...tenantAuth, ...perm('tramitar'), tramitarProcesso);
router.post('/:id/devolver', ...tenantAuth, ...perm('devolver'), devolverProcesso);
router.post('/:id/concluir', ...tenantAuth, ...perm('concluir'), concluirProcesso);
router.post('/:id/receber',  ...tenantAuth, receberProcesso);
router.patch('/:id/despacho-doc', ...tenantAuth, salvarDespachoDoc);
router.delete('/:id', ...tenantAuth, authorize('admin'), ...perm('excluir'), deleteProcesso);

// Rotas públicas (sem autenticação) — ainda exigem tenant válido
router.get('/publico/busca', tenantMiddleware, requireTenant, buscarProcessosPublico);
router.get('/publico/:numero', tenantMiddleware, requireTenant, consultarProcessoPublico);

module.exports = router;
