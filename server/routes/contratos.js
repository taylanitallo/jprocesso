const express = require('express');
const router = express.Router();
const {
  listLicitacoes, createLicitacao, updateLicitacao, deleteLicitacao,
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem, getDnaItem,
  importarItensUrl, excluirItensInativos, contarItensSemVinculo, excluirItensSemVinculo, verificarItensUrl,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
} = require('../controllers/contratosController');
const {
  listOrdens, listOrdemDisponivelDid, getSaldoContrato, getItensContrato, createOrdem, updateOrdem, deleteOrdem,
  excluirOrdemDefinitivo,
} = require('../controllers/ordensController');
const { concluirContrato } = require('../controllers/contratoConclusaoController');
const { authenticate, tenantMiddleware, requireTenant, authorize, requirePermission, requireModulo } = require('../middleware/auth');

// Todos os endpoints exigem autenticação + tenant
router.use(tenantMiddleware, requireTenant, authenticate);

// Listas que o DID (Processos) consulta: só exigem estar autenticado
router.get('/',                       listContratos);
router.get('/credores',               listCredores);
router.get('/ordens/disponiveis-did', listOrdemDisponivelDid);

// Daqui em diante: módulo contratado + Contratos › acesso. As leituras cruzam
// abas (Ordens lê Contratos e Itens, Relatórios lê tudo), então conferem só o
// acesso; as gravações conferem a ação da aba.
router.use(requireModulo('contratos'), requirePermission('contratos', 'acessar'));
const perm = (aba, acao) => requirePermission('contratos', aba, acao);

// Credores
router.post('/credores',      perm('credores', 'criar'), createCredor);
router.put('/credores/:id',   perm('credores', 'editar'), updateCredor);
router.delete('/credores/:id', perm('credores', 'excluir'), deleteCredor);

// Licitações
router.get('/licitacoes',        listLicitacoes);
router.post('/licitacoes',       perm('licitacoes', 'criar'), createLicitacao);
router.put('/licitacoes/:id',    perm('licitacoes', 'editar'), updateLicitacao);
router.delete('/licitacoes/:id', perm('licitacoes', 'excluir'), deleteLicitacao);

// Catálogo de Itens
router.post('/itens/verificar-url',  authorize('admin', 'jeos'), perm('itens', 'criar'), verificarItensUrl);
router.post('/itens/importar-url',   authorize('admin', 'jeos'), perm('itens', 'criar'), importarItensUrl);
router.delete('/itens/inativos',     authorize('admin', 'jeos'), perm('itens', 'excluir'), excluirItensInativos);
router.get('/itens/sem-vinculo/count', authorize('admin', 'jeos'), contarItensSemVinculo);
router.delete('/itens/sem-vinculo',    authorize('admin', 'jeos'), perm('itens', 'excluir'), excluirItensSemVinculo);
router.get('/itens',            listItens);
router.get('/itens/:id/dna',   getDnaItem);
router.post('/itens',          perm('itens', 'criar'), createItem);
router.put('/itens/:id',       perm('itens', 'editar'), updateItem);
router.delete('/itens/:id',    perm('itens', 'excluir'), deleteItem);

// Ordens de Compra/Serviço
router.get('/ordens',                              listOrdens);
router.get('/ordens/saldo/:contrato_id',           getSaldoContrato);
router.get('/ordens/itens-contrato/:contrato_id',  getItensContrato);
router.post('/ordens',                             perm('ordens', 'criar'), createOrdem);
router.put('/ordens/:id',                          perm('ordens', 'editar'), updateOrdem);
router.delete('/ordens/:id',                       perm('ordens', 'excluir'), deleteOrdem);
router.delete('/ordens/:id/definitivo',            authorize('admin', 'jeos'), perm('ordens', 'excluir'), excluirOrdemDefinitivo);

// Contratos
router.post('/',      perm('contratos', 'criar'), createContrato);
router.put('/:id',    perm('contratos', 'editar'), updateContrato);
router.delete('/:id', perm('contratos', 'excluir'), deleteContrato);
// Concluir (assinado). Com saldo sobrando: só gestor/administrador, com justificativa
router.post('/:id/concluir', perm('contratos', 'concluir'), concluirContrato);

// Sincronização: importa credores dos DIDs existentes para a tabela credores
router.post('/sync-from-dids', perm('credores', 'criar'), syncFromDids);

module.exports = router;

