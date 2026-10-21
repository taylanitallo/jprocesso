// Cotas do contrato por unidade/dotação (ex.: SEDUC › SEC e CAPECI).
// O contrato guarda as cotas [{ id, nome, dotacao, setor }], o item do contrato guarda
// { [cotaId]: quantidade } e a ordem guarda de qual cota saiu (cota_id).
const { Op, fn, col } = require('sequelize');

const STATUS_SEM_SALDO = ['CANCELADA', 'EXCLUÍDA'];

/** { id, nome, dotacao, setor } da cota da ordem, ou null */
const cotaDaOrdem = (contrato, cotaId) => {
  if (!cotaId) return null;
  const cotas = Array.isArray(contrato?.cotas) ? contrato.cotas : [];
  return cotas.find(c => c.id === cotaId) || null;
};

/**
 * Põe `cota` em cada ordem (instâncias Sequelize com o contrato incluído, ou objetos simples).
 * Ordens sem contrato carregado buscam as cotas do contrato numa consulta só.
 */
const anexarCota = async (models, ordens) => {
  const lista = Array.isArray(ordens) ? ordens : [ordens];
  const semContrato = [...new Set(lista.filter(o => o?.cota_id && !Array.isArray(o.contrato?.cotas)).map(o => o.contrato_id))];
  const cotasPorContrato = {};
  if (semContrato.length) {
    const contratos = await models.Contrato.findAll({ where: { id: { [Op.in]: semContrato } }, attributes: ['id', 'cotas'], raw: true });
    contratos.forEach(c => { cotasPorContrato[c.id] = c; });
  }
  lista.forEach(o => {
    if (!o) return;
    const contrato = Array.isArray(o.contrato?.cotas) ? o.contrato : cotasPorContrato[o.contrato_id];
    const cota = cotaDaOrdem(contrato, o.cota_id);
    if (o.dataValues) o.dataValues.cota = cota; else o.cota = cota;
  });
  return ordens;
};

/**
 * Saldo de cada cota do contrato: valor e quantidade contratados × o que já saiu em ordens.
 * [{ id, nome, dotacao, setor, valor_contratado, valor_usado, saldo, percentual_usado,
 *    itens: [{ item_id, descricao, unidade, qtd_contratada, qtd_usada, qtd_disponivel }] }]
 */
const resumoCotas = async (models, contrato) => {
  const cotas = Array.isArray(contrato?.cotas) ? contrato.cotas : [];
  if (!cotas.length) return [];
  const vinculos = await models.ContratoItemVinculo.findAll({
    where: { contrato_id: contrato.id }, attributes: ['item_id', 'descricao', 'unidade', 'valor_unitario', 'cotas_qtd'],
    order: [['ordem', 'ASC'], ['id', 'ASC']], raw: true,
  });
  const ordens = await models.ContratoOrdem.findAll({
    where: { contrato_id: contrato.id, cota_id: { [Op.ne]: null }, status: { [Op.notIn]: STATUS_SEM_SALDO } },
    attributes: ['id', 'cota_id', 'valor_total'], raw: true,
  });
  const valorPorCota = {};
  ordens.forEach(o => { valorPorCota[o.cota_id] = (valorPorCota[o.cota_id] || 0) + (parseFloat(o.valor_total) || 0); });
  const qtdUsada = {}; // `${cotaId}|${itemId}` → quantidade
  if (ordens.length) {
    const cotaDaOrdemId = Object.fromEntries(ordens.map(o => [o.id, o.cota_id]));
    const usos = await models.ContratoOrdemItem.findAll({
      where: { ordem_id: { [Op.in]: ordens.map(o => o.id) } },
      attributes: ['ordem_id', 'item_id', [fn('SUM', col('quantidade')), 'qtd']],
      group: ['ordem_id', 'item_id'], raw: true,
    });
    usos.forEach(u => {
      const k = `${cotaDaOrdemId[u.ordem_id]}|${u.item_id}`;
      qtdUsada[k] = (qtdUsada[k] || 0) + (parseFloat(u.qtd) || 0);
    });
  }
  return cotas.map(c => {
    const itens = vinculos
      .filter(v => parseFloat(v.cotas_qtd?.[c.id]) > 0)
      .map(v => {
        const qtd_contratada = parseFloat(v.cotas_qtd[c.id]) || 0;
        const qtd_usada = qtdUsada[`${c.id}|${v.item_id}`] || 0;
        return {
          item_id: v.item_id, descricao: v.descricao, unidade: v.unidade,
          valor_unitario: parseFloat(v.valor_unitario) || 0,
          qtd_contratada, qtd_usada, qtd_disponivel: Math.max(0, qtd_contratada - qtd_usada),
        };
      });
    const valor_contratado = Math.round(itens.reduce((s, it) => s + it.qtd_contratada * it.valor_unitario, 0) * 100) / 100;
    const valor_usado = Math.round((valorPorCota[c.id] || 0) * 100) / 100;
    return {
      ...c, valor_contratado, valor_usado,
      saldo: Math.round((valor_contratado - valor_usado) * 100) / 100,
      percentual_usado: valor_contratado > 0 ? Math.min(100, (valor_usado / valor_contratado) * 100) : 0,
      itens,
    };
  });
};

module.exports = { cotaDaOrdem, anexarCota, resumoCotas };
