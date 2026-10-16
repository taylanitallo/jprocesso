const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant, authorize, requirePermission, requireAlgumaPermissao, requireModulo } = require('../middleware/auth');
const {
  getDashboard,
  listItens, createItem, updateItem, deleteItem, getCategorias, getEstoque,
  listOrdensCompraDisponiveis, getOrdemByNumero,
  listMovimentacoes, registrarEntrada, registrarSaida,
  listLotes, registrarEntradaLote,
  importarNFe, consultarNFSe,
  listRequisicoes, getRequisicao, createRequisicao,
  autorizarRequisicao, iniciarSeparacao, aguardandoRetirada, entregarComToken, regenerarToken,
  atenderRequisicao, cancelarRequisicao,
  relatorioConsumo,
  listAuditLog,
  getRessuprimento,
  listCotas, createCota, deleteCota,
  listInventarios, createInventario, getInventario, registrarContagem, concluirInventario,
  updateInventario, deleteInventario,
  exportarTransparencia
} = require('../controllers/almoxarifadoController');

// Todas as rotas: módulo contratado + Almoxarifado › acesso. As leituras cruzam
// abas, então conferem só o acesso; as gravações conferem a ação da aba.
router.use(tenantMiddleware, requireTenant, authenticate, requireModulo('almoxarifado'), requirePermission('almoxarifado', 'acessar'));
const mid = [];
const midGestor = [authorize('admin', 'gestor')];
const midAdmin = [authorize('admin')];
const perm = (aba, acao) => requirePermission('almoxarifado', aba, acao);

// Dashboard
router.get('/dashboard', mid, getDashboard);

// Estoque (itens com saldo > 0)
router.get('/estoque', mid, getEstoque);

// Ordens de Compra — listagem de disponíveis e busca por número
router.get('/ordens-compra-disponiveis', mid, listOrdensCompraDisponiveis);
router.get('/ordem-compra/:numero',      mid, getOrdemByNumero);

// Itens
router.get('/itens',        mid, listItens);
router.post('/itens',       mid, perm('estoque', 'editar'), createItem);
router.put('/itens/:id',    mid, perm('estoque', 'editar'), updateItem);
router.delete('/itens/:id', midAdmin, perm('estoque', 'editar'), deleteItem);
router.get('/categorias',   mid, getCategorias);

// Movimentações (legado)
router.get('/movimentacoes',           mid, listMovimentacoes);
router.post('/movimentacoes/entrada',  mid, perm('entradas', 'registrar'), registrarEntrada);
router.post('/movimentacoes/saida',    mid, perm('saidas', 'registrar'), registrarSaida);

// Lotes — entradas com empenho/NF (método preferencial)
router.get('/lotes',   mid,       listLotes);
router.post('/lotes',  midGestor, perm('entradas', 'registrar'), registrarEntradaLote);

// Requisições — fluxo digital completo (separar/entregar = Solicitações › Gerenciar)
router.get('/requisicoes',                        mid,       listRequisicoes);
router.get('/requisicoes/:id',                    mid,       getRequisicao);
router.post('/requisicoes',                       mid,       perm('requisicoes', 'criar'), createRequisicao);
router.put('/requisicoes/:id/autorizar',          midGestor, perm('requisicoes', 'aprovar'), autorizarRequisicao);
router.put('/requisicoes/:id/separacao',          mid,       perm('cotas', 'gerenciar'), iniciarSeparacao);
router.put('/requisicoes/:id/aguardando-retirada', mid,      perm('cotas', 'gerenciar'), aguardandoRetirada);
router.put('/requisicoes/:id/entregar',           mid,       perm('cotas', 'gerenciar'), entregarComToken);
router.put('/requisicoes/:id/atender',            mid,       perm('cotas', 'gerenciar'), atenderRequisicao);   // legado
router.put('/requisicoes/:id/cancelar',           mid,
  requireAlgumaPermissao(['almoxarifado', 'requisicoes', 'cancelar'], ['almoxarifado', 'cotas', 'gerenciar']), cancelarRequisicao);

// Relatórios
router.get('/relatorio/consumo', mid, relatorioConsumo);

// NF-e — importação de XML
router.post('/nfe/importar',   midGestor, perm('entradas', 'registrar'), importarNFe);

// NFS-e — consulta por chave de acesso ou QR Code
router.post('/nfse/consultar', midGestor, perm('entradas', 'registrar'), consultarNFSe);

// Ressuprimento — itens abaixo do ponto de ressuprimento
router.get('/ressuprimento', mid, getRessuprimento);

// Cotas mensais
router.get('/cotas',       mid,       listCotas);
router.post('/cotas',      midGestor, perm('cotas', 'gerenciar'), createCota);
router.delete('/cotas/:id', midGestor, perm('cotas', 'gerenciar'), deleteCota);

// Inventário periódico
router.get('/inventarios',                          mid,       listInventarios);
router.post('/inventarios',                         midGestor, perm('inventario', 'realizar'), createInventario);
router.get('/inventarios/:id',                      mid,       getInventario);
router.put('/inventarios/:id/itens/:itemId/contar', mid,       perm('inventario', 'realizar'), registrarContagem);
router.put('/inventarios/:id/concluir',             midGestor, perm('inventario', 'realizar'), concluirInventario);
router.put('/inventarios/:id',                      midGestor, perm('inventario', 'realizar'), updateInventario);
router.delete('/inventarios/:id',                   midGestor, perm('inventario', 'realizar'), deleteInventario);

// Exportação transparência
router.get('/exportar', mid, exportarTransparencia);

// Auditoria
router.get('/auditlog', midGestor, perm('auditoria', 'ver'), listAuditLog);

module.exports = router;
