const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, authorize } = require('../middleware/auth');
const {
  getDashboard,
  listItens, createItem, updateItem, deleteItem, getCategorias,
  listMovimentacoes, registrarEntrada, registrarSaida,
  listLotes, registrarEntradaLote,
  importarNFe, consultarNFSe,
  listRequisicoes, createRequisicao,
  autorizarRequisicao, iniciarSeparacao, entregarComToken, regenerarToken,
  atenderRequisicao, cancelarRequisicao,
  relatorioConsumo,
  listAuditLog,
  getRessuprimento,
  listCotas, createCota, deleteCota,
  listInventarios, createInventario, getInventario, registrarContagem, concluirInventario,
  exportarTransparencia
} = require('../controllers/almoxarifadoController');

const mid = [tenantMiddleware, authenticate];
const midGestor = [tenantMiddleware, authenticate, authorize('admin', 'gestor')];

// Dashboard
router.get('/dashboard', mid, getDashboard);

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
router.post('/requisicoes',                       mid,       createRequisicao);
router.put('/requisicoes/:id/autorizar',          midGestor, autorizarRequisicao);
router.put('/requisicoes/:id/separacao',          mid,       iniciarSeparacao);
router.put('/requisicoes/:id/entregar',           mid,       entregarComToken);
router.put('/requisicoes/:id/token',              midGestor, regenerarToken);
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

// Exportação transparência
router.get('/exportar', mid, exportarTransparencia);

// Auditoria
router.get('/auditlog', midGestor, listAuditLog);

module.exports = router;
