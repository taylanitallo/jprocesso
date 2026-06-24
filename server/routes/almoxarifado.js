const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');
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

const mid = [tenantMiddleware, requireTenant, authenticate];
const midGestor = [tenantMiddleware, requireTenant, authenticate, authorize('admin', 'gestor')];

// Dashboard
router.get('/dashboard', mid, getDashboard);

// Estoque (itens com saldo > 0)
router.get('/estoque', mid, getEstoque);

// Ordens de Compra — listagem de disponíveis e busca por número
router.get('/ordens-compra-disponiveis', mid, listOrdensCompraDisponiveis);
router.get('/ordem-compra/:numero',      mid, getOrdemByNumero);

// Itens
router.get('/itens',        mid, listItens);
router.post('/itens',       mid, createItem);
router.put('/itens/:id',    mid, updateItem);
router.delete('/itens/:id', mid, deleteItem);
router.get('/categorias',   mid, getCategorias);

// Movimentações (legado)
router.get('/movimentacoes',           mid, listMovimentacoes);
router.post('/movimentacoes/entrada',  mid, registrarEntrada);
router.post('/movimentacoes/saida',    mid, registrarSaida);

// Lotes — entradas com empenho/NF (método preferencial)
router.get('/lotes',   mid,       listLotes);
router.post('/lotes',  midGestor, registrarEntradaLote);

// Requisições — fluxo digital completo
router.get('/requisicoes',                        mid,       listRequisicoes);
router.get('/requisicoes/:id',                    mid,       getRequisicao);
router.post('/requisicoes',                       mid,       createRequisicao);
router.put('/requisicoes/:id/autorizar',          midGestor, autorizarRequisicao);
router.put('/requisicoes/:id/separacao',          mid,       iniciarSeparacao);
router.put('/requisicoes/:id/aguardando-retirada', mid,      aguardandoRetirada);
router.put('/requisicoes/:id/entregar',           mid,       entregarComToken);
router.put('/requisicoes/:id/atender',            mid,       atenderRequisicao);   // legado
router.put('/requisicoes/:id/cancelar',           mid,       cancelarRequisicao);

// Relatórios
router.get('/relatorio/consumo', mid, relatorioConsumo);

// NF-e — importação de XML
router.post('/nfe/importar',   midGestor, importarNFe);

// NFS-e — consulta por chave de acesso ou QR Code
router.post('/nfse/consultar', midGestor, consultarNFSe);

// Ressuprimento — itens abaixo do ponto de ressuprimento
router.get('/ressuprimento', mid, getRessuprimento);

// Cotas mensais
router.get('/cotas',       mid,       listCotas);
router.post('/cotas',      midGestor, createCota);
router.delete('/cotas/:id', midGestor, deleteCota);

// Inventário periódico
router.get('/inventarios',                          mid,       listInventarios);
router.post('/inventarios',                         midGestor, createInventario);
router.get('/inventarios/:id',                      mid,       getInventario);
router.put('/inventarios/:id/itens/:itemId/contar', mid,       registrarContagem);
router.put('/inventarios/:id/concluir',             midGestor, concluirInventario);
router.put('/inventarios/:id',                      midGestor, updateInventario);
router.delete('/inventarios/:id',                   midGestor, deleteInventario);

// Exportação transparência
router.get('/exportar', mid, exportarTransparencia);

// Auditoria
router.get('/auditlog', midGestor, listAuditLog);

module.exports = router;
