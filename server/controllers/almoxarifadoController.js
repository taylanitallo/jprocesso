const { Op, literal } = require('sequelize');
const crypto = require('crypto');
const xml2js = require('xml2js');
const nfseService = require('../services/nfseService');
const { registrarLog } = require('../middleware/activityLogger');
const { applyScopeToWhere, getScope, ensurePermissoes } = require('../utils/scopeFilter');
const { excluir } = require('../services/lixeiraService');

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Rastreia quais schemas jÃ¡ tiveram as tabelas inicializadas
const initializedSchemas = new Set();

async function ensureTables(req) {
  const schema = req.tenant.schema;
  if (initializedSchemas.has(schema)) return;

  const {
    AlmoxarifadoItem, AlmoxarifadoMovimentacao,
    AlmoxarifadoRequisicao, AlmoxarifadoRequisicaoItem,
    AlmoxLote, AlmoxAuditLog, AlmoxCota, AlmoxInventario, AlmoxInventarioItem
  } = req.models;

  await AlmoxarifadoItem.sync({ force: false });
  await AlmoxarifadoRequisicao.sync({ force: false });
  await AlmoxarifadoRequisicaoItem.sync({ force: false });
  await AlmoxarifadoMovimentacao.sync({ force: false });
  await AlmoxLote.sync({ force: false });
  if (req.models.ContratoOrdem)     await req.models.ContratoOrdem.sync({ force: false });
  if (req.models.ContratoOrdemItem) await req.models.ContratoOrdemItem.sync({ force: false });
  await AlmoxAuditLog.sync({ force: false });
  if (AlmoxCota) await AlmoxCota.sync({ force: false });
  if (AlmoxInventario) await AlmoxInventario.sync({ force: false });
  if (AlmoxInventarioItem) await AlmoxInventarioItem.sync({ force: false });

  // Adiciona colunas novas com segurança (IF NOT EXISTS — nunca derruba dados)
  const seq = AlmoxarifadoItem.sequelize;
  const addCol = async (sql) => { try { await seq.query(sql); } catch (_) {} };
  const s = `"${schema}"`;
  await addCol(`ALTER TABLE ${s}."almoxarifado_itens"  ADD COLUMN IF NOT EXISTS secretaria  VARCHAR(100)`);
  await addCol(`ALTER TABLE ${s}."almoxarifado_lotes"  ADD COLUMN IF NOT EXISTS ordem_id     INTEGER`);
  await addCol(`ALTER TABLE ${s}."almoxarifado_lotes"  ADD COLUMN IF NOT EXISTS ordem_item_id INTEGER`);
  await addCol(`ALTER TABLE ${s}."almoxarifado_lotes"  ALTER COLUMN numero_empenho DROP NOT NULL`);
  // unidade_medida é coluna legada (antes renomeada para unidade) — garante que não bloqueia INSERT
  await addCol(`ALTER TABLE ${s}."almoxarifado_itens"        ALTER COLUMN unidade_medida        DROP NOT NULL`);
  await addCol(`ALTER TABLE ${s}."almoxarifado_itens"        ALTER COLUMN unidade_medida        SET DEFAULT 'UN'`);
  // usuario_id é coluna legada em requisicoes — modelo usa usuario_solicitante_id
  await addCol(`ALTER TABLE ${s}."almoxarifado_requisicoes"  ALTER COLUMN usuario_id            DROP NOT NULL`);
  await addCol(`ALTER TABLE ${s}."almoxarifado_requisicoes"  ADD COLUMN IF NOT EXISTS secretaria_id      UUID`);
  await addCol(`ALTER TABLE ${s}."almoxarifado_requisicoes"  ADD COLUMN IF NOT EXISTS hash_solicitante   VARCHAR(128)`);
  await addCol(`ALTER TABLE ${s}."almoxarifado_requisicoes"  ADD COLUMN IF NOT EXISTS hash_entrega       VARCHAR(128)`);
  // Estende o ENUM com o novo status AGUARDANDO_RETIRADA — tenta schema do tenant e public
  await addCol(`ALTER TYPE ${s}."enum_almoxarifado_requisicoes_status" ADD VALUE IF NOT EXISTS 'AGUARDANDO_RETIRADA'`);
  await addCol(`ALTER TYPE "public"."enum_almoxarifado_requisicoes_status" ADD VALUE IF NOT EXISTS 'AGUARDANDO_RETIRADA'`);

  initializedSchemas.add(schema);
}

/** Registra uma entrada no log de auditoria */
async function audit(models, { tabela, registro_id, acao, descricao, antes, depois, user, ip }) {
  try {
    await models.AlmoxAuditLog.create({
      tabela,
      registro_id: String(registro_id),
      acao,
      descricao,
      dados_anteriores: antes || null,
      dados_novos: depois || null,
      user_id: user?.id || null,
      user_nome: user?.nome || null,
      ip: ip || null
    });
  } catch (_) { /* auditoria nÃ£o bloqueia a operaÃ§Ã£o principal */ }
}

/**
 * Despeja estoque usando FIFO (lote com menor data_validade / mais antigo primeiro).
 * Cria as movimentaÃ§Ãµes de SAIDA e decrementa quantidade_atual dos lotes.
 * Retorna { ok: true } ou { ok: false, msg }
 */
async function fifoDispatch(models, { item_id, quantidade, data, requisicao_id, user_id }) {
  const { AlmoxarifadoItem, AlmoxarifadoMovimentacao, AlmoxLote } = models;
  const item = await AlmoxarifadoItem.findByPk(item_id);
  if (!item) return { ok: false, msg: 'Item nÃ£o encontrado' };

  const qtdNecessaria = parseFloat(quantidade);
  const estoqueAtual = parseFloat(item.estoque_atual);
  if (estoqueAtual < qtdNecessaria) {
    return {
      ok: false,
      msg: `Estoque insuficiente para "${item.nome}". DisponÃ­vel: ${estoqueAtual} ${item.unidade}`
    };
  }

  // Pega lotes com saldo > 0, ordenados FIFO (menor validade â†’ null ao final; depois por data_entrada)
  const lotes = await AlmoxLote.findAll({
    where: { item_id, ativo: true, quantidade_atual: { [Op.gt]: 0 } },
    order: [
      [literal(`CASE WHEN data_validade IS NULL THEN 1 ELSE 0 END`), 'ASC'],
      ['data_validade', 'ASC'],
      ['data_entrada', 'ASC']
    ]
  });

  let restante = qtdNecessaria;
  const vlrUnit = parseFloat(item.valor_unitario) || 0;

  for (const lote of lotes) {
    if (restante <= 0) break;
    const disponivel = parseFloat(lote.quantidade_atual);
    const usar = Math.min(disponivel, restante);

    await AlmoxarifadoMovimentacao.create({
      item_id,
      lote_id: lote.id,
      tipo: 'SAIDA',
      quantidade: usar,
      valor_unitario: vlrUnit,
      valor_total: usar * vlrUnit,
      data_movimentacao: data,
      documento_referencia: requisicao_id || null,
      observacao: requisicao_id ? `Req. ${requisicao_id}` : 'SaÃ­da FIFO',
      requisicao_id: requisicao_id || null,
      usuario_id: user_id
    });

    const novaQtd = disponivel - usar;
    await lote.update({
      quantidade_atual: novaQtd,
      ativo: novaQtd > 0
    });

    restante -= usar;
  }

  // Fallback: se ainda restou mas nÃ£o havia lotes (saÃ­da manual antiga)
  if (restante > 0) {
    await AlmoxarifadoMovimentacao.create({
      item_id,
      tipo: 'SAIDA',
      quantidade: restante,
      valor_unitario: vlrUnit,
      valor_total: restante * vlrUnit,
      data_movimentacao: data,
      documento_referencia: requisicao_id || null,
      observacao: 'SaÃ­da sem lote vinculado',
      requisicao_id: requisicao_id || null,
      usuario_id: user_id
    });
  }

  await item.update({ estoque_atual: estoqueAtual - qtdNecessaria });
  return { ok: true };
}

// â”€â”€â”€ DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getDashboard = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem, AlmoxarifadoMovimentacao, AlmoxarifadoRequisicao, AlmoxLote } = req.models;

    const totalItens = await AlmoxarifadoItem.count({ where: { ativo: true, estoque_atual: { [Op.gt]: 0 } } });

    // Itens no estoque crítico (abaixo do mínimo)
    const itensCriticos = await AlmoxarifadoItem.findAll({
      where: {
        ativo: true,
        estoque_minimo: { [Op.gt]: 0 },
        estoque_atual: { [Op.lte]: literal('"estoque_minimo"') }
      },
      order: [['estoque_atual', 'ASC']],
      limit: 10
    });

    // Itens abaixo do ponto de ressuprimento (mas acima do mínimo) — sugestão de compra
    const itensRessuprimento = await AlmoxarifadoItem.findAll({
      where: {
        ativo: true,
        ponto_ressuprimento: { [Op.gt]: 0 },
        estoque_atual: { [Op.lte]: literal('"ponto_ressuprimento"'), [Op.gt]: literal('"estoque_minimo"') }
      },
      attributes: ['id', 'codigo', 'nome', 'unidade', 'estoque_atual', 'ponto_ressuprimento', 'estoque_minimo', 'categoria'],
      order: [['nome', 'ASC']],
      limit: 20
    });

    const ultimasMovimentacoes = await AlmoxarifadoMovimentacao.findAll({
      include: [{ model: AlmoxarifadoItem, as: 'item', attributes: ['nome', 'unidade', 'codigo'] }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // 'PENDENTE' é status legado e NÃO existe no enum do banco. Incluí-lo aqui fazia o
    // Postgres rejeitar a comparação inteira (22P02), derrubando o painel com erro 500 —
    // e zerando os cartões de estoque crítico e requisições no Dashboard.
    const requisicoesPendentes = await AlmoxarifadoRequisicao.count({
      where: { status: 'PENDENTE_AUTORIZACAO' }
    });

    const itensParaValor = await AlmoxarifadoItem.findAll({
      where: { ativo: true },
      attributes: ['estoque_atual', 'valor_unitario']
    });
    const valorTotalEstoque = itensParaValor.reduce(
      (acc, i) => acc + (parseFloat(i.estoque_atual) || 0) * (parseFloat(i.valor_unitario) || 0),
      0
    );

    // Lotes próximos do vencimento (30 dias)
    const hoje = new Date();
    const em30dias = new Date(hoje);
    em30dias.setDate(em30dias.getDate() + 30);
    const lotesVencendoList = await AlmoxLote.findAll({
      where: {
        ativo: true,
        quantidade_atual: { [Op.gt]: 0 },
        data_validade: { [Op.between]: [hoje.toISOString().split('T')[0], em30dias.toISOString().split('T')[0]] }
      },
      include: [{ model: AlmoxarifadoItem, as: 'item', attributes: ['nome', 'codigo', 'unidade'] }],
      order: [['data_validade', 'ASC']],
      limit: 20
    });

    // Predição básica: média de consumo dos últimos 3 meses por item
    const tresAtras = new Date(hoje);
    tresAtras.setMonth(tresAtras.getMonth() - 3);
    const consumoRecente = await AlmoxarifadoMovimentacao.findAll({
      where: { tipo: 'SAIDA', data_movimentacao: { [Op.gte]: tresAtras.toISOString().split('T')[0] } },
      attributes: ['item_id', [literal('SUM(quantidade)'), 'total_consumido']],
      group: ['item_id'],
      raw: true
    });
    // Mapa: item_id → media mensal estimada
    const predicaoMap = {};
    consumoRecente.forEach(r => {
      predicaoMap[r.item_id] = (parseFloat(r.total_consumido) || 0) / 3;
    });

    res.json({
      totalItens,
      itensCriticos,
      itensRessuprimento,
      ultimasMovimentacoes,
      requisicoesPendentes,
      valorTotalEstoque: valorTotalEstoque.toFixed(2),
      lotesVencendo: lotesVencendoList.length,
      lotesVencendoList,
      predicaoConsumoMensal: predicaoMap
    });
  } catch (error) {
    console.error('Erro getDashboard almoxarifado:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do painel' });
  }
};

// â”€â”€â”€ ITENS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const listItens = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem } = req.models;
    const { busca, categoria, criticos } = req.query;

    const where = { excluido_em: null }; // excluídos ficam na tela Excluídos
    if (busca) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${busca}%` } },
        { codigo: { [Op.iLike]: `%${busca}%` } },
        { categoria: { [Op.iLike]: `%${busca}%` } }
      ];
    }
    if (categoria) where.categoria = categoria;
    if (criticos === 'true') {
      where.estoque_minimo = { [Op.gt]: 0 };
      where.estoque_atual = { [Op.lte]: literal('"estoque_minimo"') };
    }

    const itens = await AlmoxarifadoItem.findAll({ where, order: [['nome', 'ASC']] });
    res.json(itens);
  } catch (error) {
    console.error('Erro listItens:', error);
    res.status(500).json({ error: 'Erro ao listar itens' });
  }
};

const createItem = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem } = req.models;
    const { codigo, nome, descricao, unidade, categoria, estoque_minimo, estoque_maximo, valor_unitario, localizacao } = req.body;

    if (!codigo || !nome || !unidade) {
      return res.status(400).json({ error: 'CÃ³digo, nome e unidade sÃ£o obrigatÃ³rios' });
    }
    const existe = await AlmoxarifadoItem.findOne({ where: { codigo } });
    if (existe) return res.status(400).json({ error: 'CÃ³digo jÃ¡ cadastrado' });

    const item = await AlmoxarifadoItem.create({
      codigo, nome, descricao, unidade, categoria,
      estoque_atual: 0,
      estoque_minimo: estoque_minimo || 0,
      estoque_maximo: estoque_maximo || null,
      valor_unitario: valor_unitario || 0,
      localizacao
    });
    res.status(201).json(item);
    await registrarLog(req, {
      acao: 'criar_item_almoxarifado',
      modulo: 'almoxarifado',
      descricao: `Adicionou o item "${nome}" ao catálogo do almoxarifado`,
      referencia_id: item.id
    });
  } catch (error) {
    console.error('Erro createItem:', error);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
};

const updateItem = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem } = req.models;
    const item = await AlmoxarifadoItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item nÃ£o encontrado' });

    const {
      codigo, nome, descricao, unidade, categoria,
      estoque_minimo, estoque_maximo, valor_unitario,
      localizacao, corredor, prateleira, gaveta, secretaria,
      tipo_item, ponto_ressuprimento, ativo
    } = req.body;
    if (codigo && codigo !== item.codigo) {
      const existe = await AlmoxarifadoItem.findOne({ where: { codigo } });
      if (existe) return res.status(400).json({ error: 'CÃ³digo jÃ¡ utilizado por outro item' });
    }
    await item.update({
      codigo, nome, descricao, unidade, categoria,
      estoque_minimo, estoque_maximo, valor_unitario,
      localizacao, corredor, prateleira, gaveta, secretaria,
      tipo_item, ponto_ressuprimento, ativo
    });
    res.json(item);
  } catch (error) {
    console.error('Erro updateItem:', error);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
};

const deleteItem = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem } = req.models;
    const item = await AlmoxarifadoItem.findByPk(req.params.id);
    if (!item || item.excluido_em) return res.status(404).json({ error: 'Item não encontrado' });
    await excluir(req, 'almox_itens', item);
    res.json({ message: 'Item excluído com sucesso' });
  } catch (error) {
    console.error('Erro deleteItem:', error);
    res.status(500).json({ error: 'Erro ao desativar item' });
  }
};

const getCategorias = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem } = req.models;
    const result = await AlmoxarifadoItem.findAll({
      attributes: [[literal('DISTINCT categoria'), 'categoria']],
      where: { categoria: { [Op.not]: null }, ativo: true },
      order: [['categoria', 'ASC']]
    });
    res.json(result.map(r => r.categoria).filter(Boolean));
  } catch (error) {
    res.json([]);
  }
};

// â”€â”€â”€ MOVIMENTAÃ‡Ã•ES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const listMovimentacoes = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem, AlmoxarifadoMovimentacao, AlmoxLote } = req.models;
    const { tipo, item_id, data_inicio, data_fim, page = 1, limit = 30 } = req.query;

    const where = {};
    if (tipo) where.tipo = tipo;
    if (item_id) where.item_id = item_id;
    if (data_inicio || data_fim) {
      where.data_movimentacao = {};
      if (data_inicio) where.data_movimentacao[Op.gte] = data_inicio;
      if (data_fim)    where.data_movimentacao[Op.lte] = data_fim;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AlmoxarifadoMovimentacao.findAndCountAll({
      where,
      include: [
        { model: AlmoxarifadoItem, as: 'item', attributes: ['nome', 'unidade', 'codigo'] },
        { model: AlmoxLote, as: 'lote', attributes: ['numero_empenho', 'numero_nf', 'fornecedor_nome', 'data_validade'], required: false }
      ],
      order: [['data_movimentacao', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      subQuery: false
    });

    res.json({ total: count, pagina: parseInt(page), movimentacoes: rows });
  } catch (error) {
    console.error('Erro listMovimentacoes:', error);
    res.status(500).json({ error: 'Erro ao listar movimentaÃ§Ãµes' });
  }
};

/** Entrada avulsa (sem lote/empenho) â€” mantida para compatibilidade legada */
const registrarEntrada = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem, AlmoxarifadoMovimentacao } = req.models;
    const { item_id, quantidade, valor_unitario, data_movimentacao, documento_referencia, observacao } = req.body;

    if (!item_id || !quantidade || !data_movimentacao) {
      return res.status(400).json({ error: 'Item, quantidade e data sÃ£o obrigatÃ³rios' });
    }
    const item = await AlmoxarifadoItem.findByPk(item_id);
    if (!item) return res.status(404).json({ error: 'Item nÃ£o encontrado' });

    const qtd = parseFloat(quantidade);
    const vlrUnit = parseFloat(valor_unitario) || parseFloat(item.valor_unitario) || 0;
    const vlrTotal = qtd * vlrUnit;

    const mov = await AlmoxarifadoMovimentacao.create({
      item_id, tipo: 'ENTRADA', quantidade: qtd,
      valor_unitario: vlrUnit, valor_total: vlrTotal,
      data_movimentacao, documento_referencia, observacao,
      usuario_id: req.user.id
    });

    const novoEstoque = parseFloat(item.estoque_atual) + qtd;
    const estoqueAntes = parseFloat(item.estoque_atual);
    let novoValor = item.valor_unitario;
    if (novoEstoque > 0 && vlrUnit > 0) {
      novoValor = ((estoqueAntes * parseFloat(item.valor_unitario)) + (qtd * vlrUnit)) / novoEstoque;
    }
    await item.update({ estoque_atual: novoEstoque, valor_unitario: novoValor.toFixed(2) });

    res.status(201).json({ movimentacao: mov, estoque_atual: novoEstoque });
  } catch (error) {
    console.error('Erro registrarEntrada:', error);
    res.status(500).json({ error: 'Erro ao registrar entrada' });
  }
};

const registrarSaida = async (req, res) => {
  try {
    await ensureTables(req);
    const { item_id, quantidade, data_movimentacao, documento_referencia, observacao, requisicao_id } = req.body;

    if (!item_id || !quantidade || !data_movimentacao) {
      return res.status(400).json({ error: 'Item, quantidade e data sÃ£o obrigatÃ³rios' });
    }
    const result = await fifoDispatch(req.models, {
      item_id, quantidade: parseFloat(quantidade),
      data: data_movimentacao, requisicao_id: null, user_id: req.user.id
    });
    if (!result.ok) return res.status(400).json({ error: result.msg });

    res.status(201).json({ message: 'SaÃ­da registrada com FIFO' });
  } catch (error) {
    console.error('Erro registrarSaida:', error);
    res.status(500).json({ error: 'Erro ao registrar saÃ­da' });
  }
};

// â”€â”€â”€ LOTES (ENTRADA COM EMPENHO/NF) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const listLotes = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxLote, AlmoxarifadoItem } = req.models;
    const { item_id, ativo, page = 1, limit = 30 } = req.query;

    const where = {};
    if (item_id) where.item_id = item_id;
    if (ativo !== undefined) where.ativo = ativo === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AlmoxLote.findAndCountAll({
      where,
      include: [{ model: AlmoxarifadoItem, as: 'item', attributes: ['nome', 'unidade', 'codigo', 'categoria'] }],
      order: [
        [literal(`CASE WHEN data_validade IS NULL THEN 1 ELSE 0 END`), 'ASC'],
        ['data_validade', 'ASC'],
        ['data_entrada', 'ASC']
      ],
      limit: parseInt(limit),
      offset,
      subQuery: false
    });

    res.json({ total: count, pagina: parseInt(page), lotes: rows });
  } catch (error) {
    console.error('Erro listLotes:', error);
    res.status(500).json({ error: 'Erro ao listar lotes' });
  }
};

/** Helper: calcula itens com saldo de uma ordem */
async function calcularItensComSaldo(ordem, AlmoxarifadoItem, AlmoxLote) {
  const itensComSaldo = [];
  for (const item of (ordem.itens || [])) {
    const totalRecebido = await AlmoxLote.sum('quantidade_inicial', {
      where: { ordem_item_id: item.id }
    }) || 0;
    const saldo = parseFloat(item.quantidade) - parseFloat(totalRecebido);
    if (saldo <= 0.001) continue;
    let almoxItem = null;
    if (item.codigo_item) {
      almoxItem = await AlmoxarifadoItem.findOne({ where: { codigo: item.codigo_item, ativo: true } });
    }
    itensComSaldo.push({
      ...item.toJSON(),
      quantidade_recebida: parseFloat(totalRecebido),
      saldo: parseFloat(saldo.toFixed(4)),
      almox_item_id: almoxItem?.id || null
    });
  }
  return itensComSaldo;
}

/** Lista ordens de compra disponíveis para entrada no almoxarifado */
/** Helper: IDs de ordens cujo DID vinculado já foi marcado como "recebido" na Seção de Recebimento (Almoxarifado) */
async function idsOrdensRecebidasNoDid(Did, ordemIds) {
  if (!Did || ordemIds.length === 0) return new Set();
  const dids = await Did.findAll({
    where: { ordem_compra_id: { [Op.in]: ordemIds }, receb_ordem_recebida: 'sim' },
    attributes: ['ordem_compra_id'],
    raw: true,
  });
  return new Set(dids.map(d => d.ordem_compra_id));
}

const listOrdensCompraDisponiveis = async (req, res) => {
  try {
    await ensureTables(req);
    const { ContratoOrdem, ContratoOrdemItem, Contrato, Credor, AlmoxarifadoItem, AlmoxLote, Did } = req.models;
    if (!ContratoOrdem) return res.status(503).json({ error: 'Módulo de contratos não disponível' });

    const { q } = req.query;
    const where = { tipo: 'COMPRA', status: 'EMITIDA' };
    if (q) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${q}%` } },
        { objeto:  { [Op.iLike]: `%${q}%` } },
      ];
    }

    const ordens = await ContratoOrdem.findAll({
      where,
      include: [
        {
          model: Contrato,
          as: 'contrato',
          attributes: ['id', 'numero_contrato', 'objeto'],
          include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf'] }]
        },
        { model: ContratoOrdemItem, as: 'itens' }
      ],
      order: [['data_emissao', 'DESC']],
      limit: 100
    });

    // Só entram ordens cujo DID vinculado teve o recebimento confirmado (Seção de Recebimento)
    const recebidas = await idsOrdensRecebidasNoDid(Did, ordens.map(o => o.id));

    const result = [];
    for (const ordem of ordens) {
      if (!recebidas.has(ordem.id)) continue;
      const itensComSaldo = await calcularItensComSaldo(ordem, AlmoxarifadoItem, AlmoxLote);
      if (itensComSaldo.length > 0) {
        result.push({ ...ordem.toJSON(), itens: itensComSaldo });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Erro listOrdensCompraDisponiveis:', error);
    res.status(500).json({ error: 'Erro ao listar ordens de compra' });
  }
};

/** Busca uma Ordem de Compra pelo número e retorna com saldo disponível por item */
const getOrdemByNumero = async (req, res) => {
  try {
    await ensureTables(req);
    const { ContratoOrdem, ContratoOrdemItem, Contrato, Credor, AlmoxarifadoItem, AlmoxLote, Did } = req.models;
    if (!ContratoOrdem) return res.status(503).json({ error: 'Módulo de contratos não disponível' });

    const numero = decodeURIComponent(req.params.numero).trim();

    const ordem = await ContratoOrdem.findOne({
      where: { numero: { [Op.iLike]: numero }, tipo: 'COMPRA', status: 'EMITIDA' },
      include: [
        {
          model: Contrato,
          as: 'contrato',
          attributes: ['id', 'numero_contrato', 'objeto'],
          include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf'] }]
        },
        { model: ContratoOrdemItem, as: 'itens' }
      ]
    });

    if (!ordem) {
      return res.status(404).json({ error: `Ordem de compra "${numero}" não encontrada, cancelada ou já atendida` });
    }

    const recebidas = await idsOrdensRecebidasNoDid(Did, [ordem.id]);
    if (!recebidas.has(ordem.id)) {
      return res.status(404).json({ error: 'Esta ordem ainda não foi confirmada como recebida no DID (Seção de Recebimento)' });
    }

    const itensComSaldo = await calcularItensComSaldo(ordem, AlmoxarifadoItem, AlmoxLote);
    if (itensComSaldo.length === 0) {
      return res.status(404).json({ error: 'Todos os itens desta ordem já foram totalmente recebidos' });
    }

    res.json({ ...ordem.toJSON(), itens: itensComSaldo });
  } catch (error) {
    console.error('Erro getOrdemByNumero:', error);
    res.status(500).json({ error: 'Erro ao buscar ordem de compra' });
  }
};

/** Retorna itens com estoque atual > 0 (visão de estoque real) */
const getEstoque = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem, Secretaria } = req.models;
    const where = { estoque_atual: { [Op.gt]: 0 }, ativo: true };

    // Escopo por secretaria — a coluna `secretaria` é texto (nome).
    // Usuários do almoxarifado/admin (scope 'todas') veem todas; usuários de
    // secretaria veem apenas itens da própria secretaria.
    const user = req.user;
    if (user && user.tipo !== 'admin' && user.tipo !== 'jeos') {
      await ensurePermissoes(req);
      const { scope, secretarias } = getScope(user, 'almoxarifado', 'estoque', 'ver');

      const resolverNomes = async (ids) => {
        if (!ids.length || !Secretaria) return [];
        const secs = await Secretaria.findAll({
          where: { id: { [Op.in]: ids } }, attributes: ['nome'], raw: true,
        });
        return secs.map(s => s.nome).filter(Boolean);
      };

      if (scope === 'none') {
        where.secretaria = { [Op.in]: [] };
      } else if (scope === 'propria') {
        const nomes = await resolverNomes(user.secretariaId ? [user.secretariaId] : []);
        where.secretaria = nomes.length ? { [Op.in]: nomes } : { [Op.in]: [] };
      } else if (scope === 'algumas') {
        const nomes = await resolverNomes(secretarias);
        where.secretaria = nomes.length ? { [Op.in]: nomes } : { [Op.in]: [] };
      }
      // scope 'todas': sem filtro
    }

    // Filtros opcionais vindos da query
    if (req.query.secretaria) where.secretaria = req.query.secretaria;
    if (req.query.tipo_item)  where.tipo_item = req.query.tipo_item;

    const itens = await AlmoxarifadoItem.findAll({ where, order: [['nome', 'ASC']] });
    res.json(itens);
  } catch (error) {
    console.error('Erro getEstoque:', error);
    res.status(500).json({ error: 'Erro ao buscar estoque' });
  }
};

/** Registra entrada com lote (empenho, NF, validade) â€” mÃ©todo preferencial */
const registrarEntradaLote = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem, AlmoxarifadoMovimentacao, AlmoxLote } = req.models;
    const {
      item_id: item_id_body, quantidade, valor_unitario, data_entrada,
      numero_empenho, numero_nf, fornecedor_nome, data_validade, observacao,
      corredor, prateleira, gaveta, secretaria,
      chave_nfe, numero_contrato, fornecedor_cnpj, conferencia_cega_qtd,
      ordem_id, ordem_item_id,
      // campos para auto-criar AlmoxarifadoItem quando não existir
      _codigo_item, _descricao_item, _unidade_item
    } = req.body;

    const { ContratoOrdem, ContratoOrdemItem } = req.models;

    if (!quantidade || !data_entrada) {
      return res.status(400).json({ error: 'Quantidade e data de entrada são obrigatórios' });
    }

    // Se a entrada está vinculada a uma ordem, valida saldo disponível
    let ordemItem = null;
    if (ordem_item_id) {
      if (!ContratoOrdemItem) return res.status(503).json({ error: 'Módulo de contratos indisponível' });
      ordemItem = await ContratoOrdemItem.findByPk(ordem_item_id);
      if (!ordemItem) return res.status(404).json({ error: 'Item da ordem de compra não encontrado' });

      const totalRecebido = await AlmoxLote.sum('quantidade_inicial', {
        where: { ordem_item_id }
      }) || 0;
      const saldo = parseFloat(ordemItem.quantidade) - parseFloat(totalRecebido);
      if (parseFloat(quantidade) > saldo + 0.001) {
        return res.status(400).json({
          error: `Quantidade excede o saldo da ordem. Saldo disponível: ${saldo} ${ordemItem.unidade || ''}`.trim()
        });
      }
    }

    // Resolve o AlmoxarifadoItem: usa item_id fornecido ou busca/cria pelo código da ordem
    let item_id = item_id_body;
    if (!item_id && ordemItem) {
      const codigo = ordemItem.codigo_item || _codigo_item;
      if (codigo) {
        let almoxItem = await AlmoxarifadoItem.findOne({ where: { codigo } });
        if (!almoxItem) {
          almoxItem = await AlmoxarifadoItem.create({
            codigo,
            nome: ordemItem.descricao || _descricao_item || codigo,
            unidade: ordemItem.unidade || _unidade_item || 'UN',
            estoque_atual: 0,
            estoque_minimo: 0,
            valor_unitario: parseFloat(ordemItem.valor_unitario) || 0,
          });
        }
        item_id = almoxItem.id;
      }
    }

    if (!item_id) {
      return res.status(400).json({ error: 'Item obrigatório. Selecione um item ou vincule uma ordem de compra.' });
    }
    const item = await AlmoxarifadoItem.findByPk(item_id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const qtd = parseFloat(quantidade);
    const vlrUnit = parseFloat(valor_unitario) || parseFloat(item.valor_unitario) || 0;

    // Cria o lote
    const lote = await AlmoxLote.create({
      item_id,
      numero_empenho: numero_empenho || null,
      numero_nf: numero_nf || null,
      chave_nfe: chave_nfe || null,
      numero_contrato: numero_contrato || null,
      fornecedor_nome: fornecedor_nome || null,
      fornecedor_cnpj: fornecedor_cnpj || null,
      data_entrada,
      data_validade: data_validade || null,
      quantidade_inicial: qtd,
      quantidade_atual: qtd,
      valor_unitario: vlrUnit,
      observacao: observacao || null,
      conferencia_cega_qtd: conferencia_cega_qtd ? parseFloat(conferencia_cega_qtd) : null,
      conferencia_cega_ok: conferencia_cega_qtd ? parseFloat(conferencia_cega_qtd) === qtd : null,
      ordem_id: ordem_id || null,
      ordem_item_id: ordem_item_id || null,
      usuario_id: req.user.id
    });

    // Se vinculado a ordem, verifica se todos os itens foram totalmente recebidos
    if (ordem_id && ContratoOrdem) {
      const todosItens = await ContratoOrdemItem.findAll({ where: { ordem_id } });
      let totalmenteRecebida = true;
      for (const oi of todosItens) {
        const recebido = await AlmoxLote.sum('quantidade_inicial', { where: { ordem_item_id: oi.id } }) || 0;
        if (parseFloat(recebido) < parseFloat(oi.quantidade) - 0.001) {
          totalmenteRecebida = false;
          break;
        }
      }
      if (totalmenteRecebida) {
        await ContratoOrdem.update({ status: 'ATENDIDA' }, { where: { id: ordem_id } });
      }
    }

    // Registra movimentaÃ§Ã£o de ENTRADA vinculada ao lote
    const mov = await AlmoxarifadoMovimentacao.create({
      item_id,
      lote_id: lote.id,
      tipo: 'ENTRADA',
      quantidade: qtd,
      valor_unitario: vlrUnit,
      valor_total: qtd * vlrUnit,
      data_movimentacao: data_entrada,
      documento_referencia: numero_empenho || numero_nf || null,
      numero_empenho: numero_empenho || null,
      numero_nf: numero_nf || null,
      fornecedor_nome: fornecedor_nome || null,
      observacao: observacao || null,
      usuario_id: req.user.id
    });

    // Atualiza estoque (mÃ©dia ponderada)
    const estoqueAntes = parseFloat(item.estoque_atual);
    const novoEstoque = estoqueAntes + qtd;
    let novoVal = parseFloat(item.valor_unitario) || 0;
    if (novoEstoque > 0 && vlrUnit > 0) {
      novoVal = ((estoqueAntes * novoVal) + (qtd * vlrUnit)) / novoEstoque;
    }
    const locationUpdate = {};
    if (corredor  !== undefined) locationUpdate.corredor  = corredor  || null;
    if (prateleira !== undefined) locationUpdate.prateleira = prateleira || null;
    if (gaveta    !== undefined) locationUpdate.gaveta    = gaveta    || null;
    if (secretaria !== undefined) locationUpdate.secretaria = secretaria || null;
    await item.update({ estoque_atual: novoEstoque, valor_unitario: novoVal.toFixed(2), ...locationUpdate });

    await audit(req.models, {
      tabela: 'almoxarifado_lotes',
      registro_id: lote.id,
      acao: 'ENTRADA',
      descricao: `Entrada de ${qtd} ${item.unidade} â€” ${item.nome} (Emp: ${numero_empenho || '-'}, NF: ${numero_nf || '-'})`,
      antes: { estoque_atual: estoqueAntes },
      depois: { estoque_atual: novoEstoque, lote_id: lote.id },
      user: req.user,
      ip: req.ip
    });

    await registrarLog(req, {
      acao: 'registrar_entrada_estoque',
      modulo: 'almoxarifado',
      descricao: `Registrou entrada de ${qtd} ${item.unidade} de "${item.nome}" no estoque`,
      referencia_id: lote.id,
      referencia_numero: item.codigo || null
    });

    res.status(201).json({ lote, movimentacao: mov, estoque_atual: novoEstoque });
  } catch (error) {
    console.error('Erro registrarEntradaLote:', error);
    res.status(500).json({ error: 'Erro ao registrar entrada', detail: error.message, sql: error.sql });
  }
};

// â”€â”€â”€ REQUISIÃ‡Ã•ES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const listRequisicoes = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoRequisicao, AlmoxarifadoRequisicaoItem, AlmoxarifadoItem, User, Setor, Secretaria } = req.models;
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) {
      const statusList = String(status).split(',').map(s => s.trim()).filter(Boolean);
      where.status = statusList.length === 1 ? statusList[0] : { [Op.in]: statusList };
    }
    await applyScopeToWhere(where, req, 'secretaria_id', 'almoxarifado', 'requisicoes', 'ver');

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AlmoxarifadoRequisicao.findAndCountAll({
      where,
      include: [
        { model: Setor, as: 'setor', attributes: ['nome'] },
        { model: User, as: 'solicitante', attributes: ['nome'] },
        { model: User, as: 'autorizador', attributes: ['nome'], required: false },
        { model: User, as: 'atendente', attributes: ['nome'], required: false },
        { model: Secretaria, as: 'secretaria', attributes: ['nome'], required: false },
        {
          model: AlmoxarifadoRequisicaoItem, as: 'itens',
          include: [{ model: AlmoxarifadoItem, as: 'item', attributes: ['nome', 'unidade', 'codigo'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      subQuery: false
    });

    res.json({ total: count, pagina: parseInt(page), requisicoes: rows });
  } catch (error) {
    console.error('Erro listRequisicoes:', error);
    res.status(500).json({ error: 'Erro ao listar requisiÃ§Ãµes' });
  }
};

const getRequisicao = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoRequisicao, AlmoxarifadoRequisicaoItem, AlmoxarifadoItem, User, Setor, Secretaria } = req.models;
    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id, {
      include: [
        { model: Setor, as: 'setor', attributes: ['nome'] },
        { model: User, as: 'solicitante', attributes: ['id', 'nome'] },
        { model: User, as: 'autorizador', attributes: ['id', 'nome'], required: false },
        { model: User, as: 'atendente', attributes: ['id', 'nome'], required: false },
        { model: Secretaria, as: 'secretaria', attributes: ['nome'], required: false },
        {
          model: AlmoxarifadoRequisicaoItem, as: 'itens',
          include: [{ model: AlmoxarifadoItem, as: 'item', attributes: ['nome', 'unidade', 'codigo'] }]
        }
      ]
    });
    if (!requisicao) return res.status(404).json({ error: 'Requisição não encontrada' });
    res.json(requisicao);
  } catch (error) {
    console.error('Erro getRequisicao:', error);
    res.status(500).json({ error: 'Erro ao buscar requisição' });
  }
};

const createRequisicao = async (req, res) => {
  try {
    await ensureTables(req);
    const bcrypt = require('bcryptjs');
    const { AlmoxarifadoRequisicao, AlmoxarifadoRequisicaoItem, AlmoxarifadoItem, User } = req.models;
    const { setor_id, secretaria_id, observacao, prioridade, data_solicitacao, itens, senhaConfirmacao } = req.body;

    if (!setor_id || !itens || itens.length === 0) {
      return res.status(400).json({ error: 'Setor e pelo menos um item são obrigatórios' });
    }
    if (!senhaConfirmacao) {
      return res.status(400).json({ error: 'Senha obrigatória para assinatura eletrônica' });
    }
    const userDb = await User.findByPk(req.user.id, { attributes: ['senha'] });
    if (!userDb || !(await bcrypt.compare(senhaConfirmacao, userDb.senha))) {
      return res.status(401).json({ error: 'Senha incorreta. Assinatura eletrônica não autorizada.' });
    }

    const ano = new Date().getFullYear();
    const count = await AlmoxarifadoRequisicao.count();
    const numero = `REQ-${ano}-${String(count + 1).padStart(4, '0')}`;

    const hash_solicitante = crypto.createHash('sha256')
      .update(`${numero}|SOLICITACAO|${req.user.id}|${Date.now()}`)
      .digest('hex');

    const requisicao = await AlmoxarifadoRequisicao.create({
      numero,
      setor_id,
      secretaria_id: secretaria_id || null,
      usuario_solicitante_id: req.user.id,
      status: 'PENDENTE_AUTORIZACAO',
      prioridade: prioridade || 'NORMAL',
      data_solicitacao: data_solicitacao || new Date().toISOString().split('T')[0],
      observacao,
      hash_solicitante
    });

    for (const it of itens) {
      const itemDb = await AlmoxarifadoItem.findByPk(it.item_id);
      if (!itemDb) continue;
      await AlmoxarifadoRequisicaoItem.create({
        requisicao_id: requisicao.id,
        item_id: it.item_id,
        quantidade_solicitada: parseFloat(it.quantidade_solicitada),
        quantidade_atendida: 0,
        observacao: it.observacao || null
      });
    }

    await audit(req.models, {
      tabela: 'almoxarifado_requisicoes', registro_id: requisicao.id,
      acao: 'CRIOU', descricao: `Criou requisicao ${numero}`,
      depois: requisicao.toJSON(), user: req.user, ip: req.ip
    });

    await registrarLog(req, {
      acao: 'criar_requisicao',
      modulo: 'almoxarifado',
      descricao: `Fez uma requisição de material (${numero}) — ${itens.length} item(ns)`,
      referencia_id: requisicao.id,
      referencia_numero: numero
    });

    res.status(201).json(requisicao);
  } catch (error) {
    console.error('Erro createRequisicao:', error);
    res.status(500).json({ error: 'Erro ao criar requisiÃ§Ã£o' });
  }
};

/**
 * Autorizar â†’ AUTORIZADA
 * Verifica estoque suficiente para todos os itens.
 * Gera hash de assinatura e token OTP de 6 dÃ­gitos para entrega.
 * Papel: gestor | admin
 */
const autorizarRequisicao = async (req, res) => {
  try {
    await ensureTables(req);
    const bcrypt = require('bcryptjs');
    const { AlmoxarifadoRequisicao, AlmoxarifadoRequisicaoItem, AlmoxarifadoItem, User } = req.models;
    const { senhaConfirmacao } = req.body;

    if (!senhaConfirmacao) {
      return res.status(400).json({ error: 'Senha obrigatória para assinatura eletrônica' });
    }
    const userDb = await User.findByPk(req.user.id, { attributes: ['senha'] });
    if (!userDb || !(await bcrypt.compare(senhaConfirmacao, userDb.senha))) {
      return res.status(401).json({ error: 'Senha incorreta. Assinatura eletrônica não autorizada.' });
    }

    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id, {
      include: [{ model: AlmoxarifadoRequisicaoItem, as: 'itens' }]
    });
    if (!requisicao) return res.status(404).json({ error: 'Requisição não encontrada' });
    if (!['PENDENTE', 'PENDENTE_AUTORIZACAO'].includes(requisicao.status)) {
      return res.status(400).json({ error: `Requisição não pode ser autorizada no status ${requisicao.status}` });
    }

    // Valida estoque para todos os itens
    const semEstoque = [];
    for (const ri of requisicao.itens) {
      const item = await AlmoxarifadoItem.findByPk(ri.item_id);
      if (!item) continue;
      const pendente = parseFloat(ri.quantidade_solicitada) - parseFloat(ri.quantidade_atendida);
      if (parseFloat(item.estoque_atual) < pendente) {
        semEstoque.push(`${item.nome}: solicitado ${pendente} ${item.unidade}, disponÃ­vel ${item.estoque_atual}`);
      }
    }
    if (semEstoque.length > 0) {
      return res.status(400).json({
        error: 'Estoque insuficiente para alguns itens',
        detalhes: semEstoque
      });
    }

    // Gera hash de assinatura digital
    const ts = Date.now();
    const hash_assinatura = crypto
      .createHash('sha256')
      .update(`${requisicao.numero}|${req.user.id}|${ts}`)
      .digest('hex');

    const antes = { status: requisicao.status };
    await requisicao.update({
      status: 'AUTORIZADA',
      data_autorizacao: new Date(),
      usuario_autorizador_id: req.user.id,
      hash_assinatura
    });

    await audit(req.models, {
      tabela: 'almoxarifado_requisicoes', registro_id: requisicao.id,
      acao: 'AUTORIZOU',
      descricao: `${req.user.nome || req.user.id} autorizou ${requisicao.numero}`,
      antes, depois: { status: 'AUTORIZADA', hash_assinatura },
      user: req.user, ip: req.ip
    });

    await registrarLog(req, {
      acao: 'autorizar_requisicao',
      modulo: 'almoxarifado',
      descricao: `Autorizou a requisição de material ${requisicao.numero}`,
      referencia_id: requisicao.id,
      referencia_numero: requisicao.numero
    });

    res.json({ message: 'Requisição autorizada', hash_assinatura });
  } catch (error) {
    console.error('Erro autorizarRequisicao:', error);
    res.status(500).json({ error: 'Erro ao autorizar requisiÃ§Ã£o' });
  }
};

/**
 * Iniciar separaÃ§Ã£o â†’ EM_SEPARACAO
 * Papel: almoxarife (qualquer usuÃ¡rio autenticado pode iniciar a separaÃ§Ã£o apÃ³s autorizaÃ§Ã£o)
 */
const iniciarSeparacao = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoRequisicao } = req.models;

    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id);
    if (!requisicao) return res.status(404).json({ error: 'RequisiÃ§Ã£o nÃ£o encontrada' });
    if (requisicao.status !== 'AUTORIZADA') {
      return res.status(400).json({ error: 'A requisiÃ§Ã£o precisa estar Autorizada para iniciar separaÃ§Ã£o' });
    }

    const antes = { status: requisicao.status };
    await requisicao.update({ status: 'EM_SEPARACAO', data_separacao: new Date() });

    await audit(req.models, {
      tabela: 'almoxarifado_requisicoes', registro_id: requisicao.id,
      acao: 'SEPAROU', descricao: `Iniciou separacao de ${requisicao.numero}`,
      antes, depois: { status: 'EM_SEPARACAO' },
      user: req.user, ip: req.ip
    });

    res.json({ message: 'SeparaÃ§Ã£o iniciada', status: 'EM_SEPARACAO' });
  } catch (error) {
    console.error('Erro iniciarSeparacao:', error);
    res.status(500).json({ error: 'Erro ao iniciar separaÃ§Ã£o' });
  }
};

/**
 * Marcar como AGUARDANDO_RETIRADA → itens separados, aguardando retirada pelo solicitante.
 */
const aguardandoRetirada = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoRequisicao } = req.models;

    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id);
    if (!requisicao) return res.status(404).json({ error: 'Requisição não encontrada' });
    if (requisicao.status !== 'EM_SEPARACAO') {
      return res.status(400).json({ error: 'A requisição precisa estar Em Separação para marcar como aguardando retirada' });
    }

    const antes = { status: requisicao.status };
    await requisicao.update({ status: 'AGUARDANDO_RETIRADA' });

    await audit(req.models, {
      tabela: 'almoxarifado_requisicoes', registro_id: requisicao.id,
      acao: 'AGUARDANDO_RETIRADA', descricao: `Requisição ${requisicao.numero} pronta para retirada`,
      antes, depois: { status: 'AGUARDANDO_RETIRADA' },
      user: req.user, ip: req.ip
    });

    res.json({ message: 'Aguardando retirada', status: 'AGUARDANDO_RETIRADA' });
  } catch (error) {
    console.error('Erro aguardandoRetirada:', error?.message, error?.original?.message, error);
    res.status(500).json({ error: error?.original?.message || error?.message || 'Erro ao atualizar status' });
  }
};

/**
 * Confirmar entrega → ENTREGUE
 * Autentica com senha, despacha estoque via FIFO, marca como ENTREGUE.
 */
const entregarComToken = async (req, res) => {
  try {
    await ensureTables(req);
    const bcrypt = require('bcryptjs');
    const { AlmoxarifadoRequisicao, AlmoxarifadoRequisicaoItem, User } = req.models;
    const { senhaConfirmacao } = req.body;

    if (!senhaConfirmacao) return res.status(400).json({ error: 'Senha obrigatória para assinatura eletrônica' });
    const userDb = await User.findByPk(req.user.id, { attributes: ['senha'] });
    if (!userDb || !(await bcrypt.compare(senhaConfirmacao, userDb.senha))) {
      return res.status(401).json({ error: 'Senha incorreta. Assinatura eletrônica não autorizada.' });
    }

    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id, {
      include: [{ model: AlmoxarifadoRequisicaoItem, as: 'itens' }]
    });
    if (!requisicao) return res.status(404).json({ error: 'Requisição não encontrada' });
    if (requisicao.status !== 'AGUARDANDO_RETIRADA') {
      return res.status(400).json({ error: 'A requisição precisa estar com status Aguardando Retirada para ser entregue' });
    }

    const hoje = new Date().toISOString().split('T')[0];
    const erros = [];

    for (const ri of requisicao.itens) {
      const pendente = parseFloat(ri.quantidade_solicitada) - parseFloat(ri.quantidade_atendida);
      if (pendente <= 0) continue;

      const result = await fifoDispatch(req.models, {
        item_id: ri.item_id,
        quantidade: pendente,
        data: hoje,
        requisicao_id: requisicao.id,
        user_id: req.user.id
      });

      if (result.ok) {
        await ri.update({ quantidade_atendida: parseFloat(ri.quantidade_solicitada) });
      } else {
        erros.push(result.msg);
      }
    }

    if (erros.length > 0 && erros.length === requisicao.itens.length) {
      return res.status(400).json({ error: 'NÃ£o foi possÃ­vel entregar nenhum item', detalhes: erros });
    }

    const hash_entrega = crypto.createHash('sha256')
      .update(`${requisicao.numero}|ENTREGUE|${req.user.id}|${Date.now()}`)
      .digest('hex');

    const antes = { status: requisicao.status };
    await requisicao.update({
      status: 'ENTREGUE',
      data_entrega: new Date(),
      data_atendimento: hoje,
      usuario_atendente_id: req.user.id,
      hash_entrega
    });

    await audit(req.models, {
      tabela: 'almoxarifado_requisicoes', registro_id: requisicao.id,
      acao: 'ENTREGOU',
      descricao: `${req.user.nome || req.user.id} entregou ${requisicao.numero} (token confirmado)`,
      antes, depois: { status: 'ENTREGUE' },
      user: req.user, ip: req.ip
    });

    res.json({ message: 'Entrega confirmada', status: 'ENTREGUE', alertas: erros });
  } catch (error) {
    console.error('Erro entregarComToken:', error);
    res.status(500).json({ error: 'Erro ao confirmar entrega' });
  }
};

/** Regenera token OTP (ex: expirou) â€” papel: gestor/admin */
const regenerarToken = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoRequisicao } = req.models;
    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id);
    if (!requisicao) return res.status(404).json({ error: 'RequisiÃ§Ã£o nÃ£o encontrada' });
    if (!['AUTORIZADA', 'EM_SEPARACAO'].includes(requisicao.status)) {
      return res.status(400).json({ error: 'RequisiÃ§Ã£o nÃ£o estÃ¡ pronta para entrega' });
    }

    const token_entrega = String(Math.floor(100000 + Math.random() * 900000));
    const token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await requisicao.update({ token_entrega, token_expiry });

    await audit(req.models, {
      tabela: 'almoxarifado_requisicoes', registro_id: requisicao.id,
      acao: 'REGENEROU_TOKEN', descricao: `Novo token gerado para ${requisicao.numero}`,
      user: req.user, ip: req.ip
    });

    res.json({ token_entrega, token_expiry });
  } catch (error) {
    console.error('Erro regenerarToken:', error);
    res.status(500).json({ error: 'Erro ao regenerar token' });
  }
};

/** Compat. legado â€” mantido para telas antigas */
const atenderRequisicao = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoRequisicao, AlmoxarifadoRequisicaoItem, AlmoxarifadoItem, AlmoxarifadoMovimentacao } = req.models;
    const { itens_atendidos, observacao } = req.body;

    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id, {
      include: [{ model: AlmoxarifadoRequisicaoItem, as: 'itens' }]
    });
    if (!requisicao) return res.status(404).json({ error: 'RequisiÃ§Ã£o nÃ£o encontrada' });
    if (['ENTREGUE', 'ATENDIDA', 'CANCELADA'].includes(requisicao.status)) {
      return res.status(400).json({ error: 'RequisiÃ§Ã£o jÃ¡ finalizada' });
    }

    const hoje = new Date().toISOString().split('T')[0];
    let totalAtendido = 0, totalItens = 0;

    for (const atend of itens_atendidos) {
      const reqItem = requisicao.itens.find(i => i.item_id === atend.item_id);
      if (!reqItem) continue;
      const qtdAtender = parseFloat(atend.quantidade_atendida);
      if (qtdAtender <= 0) continue;

      const r = await fifoDispatch(req.models, {
        item_id: atend.item_id, quantidade: qtdAtender,
        data: hoje, requisicao_id: requisicao.numero, user_id: req.user.id
      });
      if (!r.ok) continue;

      await reqItem.update({ quantidade_atendida: qtdAtender });
      totalAtendido++;
      if (qtdAtender >= parseFloat(reqItem.quantidade_solicitada)) totalItens++;
    }

    const totalReqItens = requisicao.itens.length;
    const novoStatus = totalItens === totalReqItens ? 'ENTREGUE' : (totalAtendido > 0 ? 'EM_SEPARACAO' : requisicao.status);
    await requisicao.update({
      status: novoStatus,
      data_atendimento: novoStatus === 'ENTREGUE' ? hoje : null,
      data_entrega: novoStatus === 'ENTREGUE' ? new Date() : null,
      usuario_atendente_id: req.user.id,
      observacao: observacao || requisicao.observacao
    });

    await registrarLog(req, {
      acao: 'atender_requisicao',
      modulo: 'almoxarifado',
      descricao: novoStatus === 'ENTREGUE'
        ? `Entregou a requisição de material ${requisicao.numero}`
        : `Atendeu parcialmente a requisição de material ${requisicao.numero}`,
      referencia_id: requisicao.id,
      referencia_numero: requisicao.numero
    });

    res.json({ message: 'RequisiÃ§Ã£o processada', status: novoStatus });
  } catch (error) {
    console.error('Erro atenderRequisicao:', error);
    res.status(500).json({ error: 'Erro ao atender requisiÃ§Ã£o' });
  }
};

const cancelarRequisicao = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoRequisicao } = req.models;
    const { justificativa } = req.body;

    const requisicao = await AlmoxarifadoRequisicao.findByPk(req.params.id);
    if (!requisicao) return res.status(404).json({ error: 'RequisiÃ§Ã£o nÃ£o encontrada' });
    if (['ENTREGUE', 'ATENDIDA', 'CANCELADA'].includes(requisicao.status)) {
      return res.status(400).json({ error: 'NÃ£o Ã© possÃ­vel cancelar requisiÃ§Ã£o jÃ¡ finalizada' });
    }

    const antes = { status: requisicao.status };
    await requisicao.update({ status: 'CANCELADA', justificativa: justificativa || null });

    await audit(req.models, {
      tabela: 'almoxarifado_requisicoes', registro_id: requisicao.id,
      acao: 'CANCELOU', descricao: `Cancelou ${requisicao.numero}: ${justificativa || '-'}`,
      antes, depois: { status: 'CANCELADA' },
      user: req.user, ip: req.ip
    });

    res.json({ message: 'RequisiÃ§Ã£o cancelada' });
  } catch (error) {
    console.error('Erro cancelarRequisicao:', error);
    res.status(500).json({ error: 'Erro ao cancelar requisiÃ§Ã£o' });
  }
};

// â”€â”€â”€ RELATÃ“RIO DE CONSUMO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const relatorioConsumo = async (req, res) => {
  try {
    await ensureTables(req);
    const { data_inicio, data_fim } = req.query;

    const schema = req.tenant.schema;
    // Query raw para performance â€” agrupa saÃ­das por secretaria
    const [rows] = await req.tenantDb.query(`
      SET search_path = "${schema}";
      SELECT
        COALESCE(s.nome, 'Sem Secretaria') AS secretaria_nome,
        ai.categoria,
        ai.nome AS item_nome,
        ai.unidade,
        SUM(am.quantidade) AS total_quantidade,
        SUM(am.valor_total) AS total_valor
      FROM almoxarifado_movimentacoes am
        JOIN almoxarifado_itens ai ON ai.id = am.item_id
        LEFT JOIN almoxarifado_requisicoes ar ON ar.numero = am.documento_referencia
        LEFT JOIN setores se ON se.id = ar.setor_id
        LEFT JOIN secretarias s ON s.id = se."secretariaId"
      WHERE am.tipo = 'SAIDA'
        ${data_inicio ? `AND am.data_movimentacao >= '${data_inicio}'` : ''}
        ${data_fim    ? `AND am.data_movimentacao <= '${data_fim}'`    : ''}
      GROUP BY s.nome, ai.categoria, ai.nome, ai.unidade
      ORDER BY s.nome, ai.categoria, ai.nome
    `);

    res.json(rows);
  } catch (error) {
    console.error('Erro relatorioConsumo:', error);
    res.status(500).json({ error: 'Erro ao gerar relatÃ³rio de consumo' });
  }
};

// â”€â”€â”€ AUDITORIA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const listAuditLog = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxAuditLog, User } = req.models;
    const { tabela, acao, user_id, user_nome, data_de, data_ate, page = 1, limit = 50 } = req.query;

    const where = {};
    if (tabela)    where.tabela    = tabela;
    if (acao)      where.acao      = acao;
    if (user_id)   where.user_id   = user_id;
    if (user_nome) where.user_nome = { [Op.iLike]: `%${user_nome}%` };

    if (data_de || data_ate) {
      where.created_at = {};
      if (data_de)  where.created_at[Op.gte] = new Date(data_de + 'T00:00:00');
      if (data_ate) where.created_at[Op.lte]  = new Date(data_ate + 'T23:59:59');
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AlmoxAuditLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Enriquece registros antigos: busca nome pelo user_id quando user_nome está vazio
    const semNome = rows.filter(r => !r.user_nome && r.user_id);
    if (semNome.length > 0 && User) {
      const ids = [...new Set(semNome.map(r => r.user_id))];
      const users = await User.findAll({ where: { id: ids }, attributes: ['id', 'nome'] });
      const mapa  = Object.fromEntries(users.map(u => [u.id, u.nome]));
      rows.forEach(r => {
        if (!r.user_nome && r.user_id && mapa[r.user_id]) {
          r.dataValues.user_nome = mapa[r.user_id];
        }
      });
    }

    res.json({ total: count, pagina: parseInt(page), logs: rows });
  } catch (error) {
    console.error('Erro listAuditLog:', error);
    res.status(500).json({ error: 'Erro ao listar auditoria' });
  }
};

// ─── IMPORTAR NF-e (XML) ─────────────────────────────────────────────────────
// Faz parse do XML da NF-e e devolve os dados estruturados (prévia para conferência)
const importarNFe = async (req, res) => {
  try {
    const { xmlContent } = req.body;
    if (!xmlContent) return res.status(400).json({ error: 'XML não enviado' });

    let parsed;
    try {
      parsed = await xml2js.parseStringPromise(xmlContent, { explicitArray: false, mergeAttrs: true });
    } catch (e) {
      return res.status(400).json({ error: 'XML inválido: ' + e.message });
    }

    const nfeProc = parsed.nfeProc || parsed.NFe;
    const infNFe = nfeProc?.NFe?.infNFe || parsed.NFe?.infNFe;
    if (!infNFe) return res.status(400).json({ error: 'Estrutura de NF-e não reconhecida' });

    const emit = infNFe.emit || {};
    const ide  = infNFe.ide || {};
    const total = infNFe.total?.ICMSTot || {};

    const dets = Array.isArray(infNFe.det) ? infNFe.det : (infNFe.det ? [infNFe.det] : []);
    const itens = dets.map((det, i) => {
      const prod = det.prod || {};
      return {
        seq:            i + 1,
        codigo_produto: prod.cProd || '',
        descricao:      prod.xProd || '',
        ncm:            prod.NCM || '',
        cfop:           prod.CFOP || '',
        unidade:        prod.uCom || 'UN',
        quantidade:     parseFloat(prod.qCom || 0),
        valor_unitario: parseFloat(prod.vUnCom || 0),
        valor_total:    parseFloat(prod.vProd || 0)
      };
    });

    res.json({
      chave_nfe:      infNFe.Id ? infNFe.Id.replace('NFe', '') : '',
      numero_nf:      ide.nNF || '',
      serie:          ide.serie || '',
      data_emissao:   ide.dhEmi ? ide.dhEmi.split('T')[0] : '',
      fornecedor_cnpj: emit.CNPJ || emit.CPF || '',
      fornecedor_nome: emit.xNome || emit.xFant || '',
      valor_total_nf:  parseFloat(total.vNF || 0),
      itens
    });
  } catch (error) {
    console.error('Erro importarNFe:', error);
    res.status(500).json({ error: 'Erro ao processar NF-e' });
  }
};

// ─── RESSUPRIMENTO ───────────────────────────────────────────────────────────
// Itens que atingiram o ponto de ressuprimento (sugestão de nova compra)
const getRessuprimento = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem, AlmoxarifadoMovimentacao } = req.models;

    const itens = await AlmoxarifadoItem.findAll({
      where: {
        ativo: true,
        ponto_ressuprimento: { [Op.gt]: 0 },
        estoque_atual: { [Op.lte]: literal('"ponto_ressuprimento"') }
      },
      order: [['estoque_atual', 'ASC']]
    });

    // Para cada item, calcula consumo médio mensal (últimos 3 meses)
    const hoje = new Date();
    const tresAtras = new Date(hoje);
    tresAtras.setMonth(tresAtras.getMonth() - 3);

    const resultado = await Promise.all(itens.map(async (item) => {
      const consumo = await AlmoxarifadoMovimentacao.findAll({
        where: {
          item_id: item.id,
          tipo: 'SAIDA',
          data_movimentacao: { [Op.gte]: tresAtras.toISOString().split('T')[0] }
        },
        attributes: [[literal('SUM(quantidade)'), 'total']],
        raw: true
      });
      const totalConsumido = parseFloat(consumo[0]?.total || 0);
      const mediaConsumoMensal = totalConsumido / 3;
      // Meses de estoque restantes com base na média
      const mesesRestantes = mediaConsumoMensal > 0
        ? parseFloat(item.estoque_atual) / mediaConsumoMensal
        : null;

      return {
        ...item.toJSON(),
        media_consumo_mensal: mediaConsumoMensal.toFixed(3),
        meses_restantes: mesesRestantes ? mesesRestantes.toFixed(1) : null,
        sugestao_compra: mediaConsumoMensal > 0
          ? Math.max(0, parseFloat(item.estoque_maximo || item.ponto_ressuprimento * 2) - parseFloat(item.estoque_atual)).toFixed(3)
          : null
      };
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Erro getRessuprimento:', error);
    res.status(500).json({ error: 'Erro ao buscar itens para ressuprimento' });
  }
};

// ─── COTAS ───────────────────────────────────────────────────────────────────
const listCotas = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxCota, AlmoxarifadoItem, Setor } = req.models;
    const { setor_id, mes_ano } = req.query;

    const where = { ativo: true };
    if (setor_id) where.setor_id = setor_id;
    if (mes_ano)  where.mes_ano  = mes_ano;

    const cotas = await AlmoxCota.findAll({
      where,
      include: [
        { model: AlmoxarifadoItem, as: 'item', attributes: ['id', 'codigo', 'nome', 'unidade'] },
        { model: Setor, as: 'setor', attributes: ['id', 'nome'] }
      ],
      order: [['mes_ano', 'DESC'], ['created_at', 'ASC']]
    });
    res.json(cotas);
  } catch (error) {
    console.error('Erro listCotas:', error);
    res.status(500).json({ error: 'Erro ao listar cotas' });
  }
};

const createCota = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxCota } = req.models;
    const { setor_id, item_id, mes_ano, quantidade_cota, observacao } = req.body;

    if (!setor_id || !item_id || !mes_ano || !quantidade_cota) {
      return res.status(400).json({ error: 'setor_id, item_id, mes_ano e quantidade_cota são obrigatórios' });
    }

    const [cota, created] = await AlmoxCota.findOrCreate({
      where: { setor_id, item_id, mes_ano },
      defaults: { quantidade_cota, observacao, usuario_id: req.user?.id }
    });

    if (!created) {
      // Mesma cota já existia (inclusive excluída): volta a valer com os novos dados
      const estavaExcluida = !!cota.excluido_em;
      await cota.update({ quantidade_cota, observacao, ativo: true, excluido_em: null });
      if (estavaExcluida) {
        await req.models.RegistroExcluido.destroy({ where: { entidade: 'almox_cotas', registro_id: String(cota.id) } });
      }
    }

    res.status(created ? 201 : 200).json(cota);
  } catch (error) {
    console.error('Erro createCota:', error);
    res.status(500).json({ error: 'Erro ao salvar cota' });
  }
};

const deleteCota = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxCota } = req.models;
    const { AlmoxarifadoItem, Setor } = req.models;
    const cota = await AlmoxCota.findByPk(req.params.id, {
      include: [
        { model: Setor, as: 'setor', attributes: ['nome'] },
        { model: AlmoxarifadoItem, as: 'item', attributes: ['nome'] },
      ],
    });
    if (!cota || cota.excluido_em) return res.status(404).json({ error: 'Cota não encontrada' });
    await excluir(req, 'almox_cotas', cota);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover cota' });
  }
};

// ─── INVENTÁRIO ──────────────────────────────────────────────────────────────
const listInventarios = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxInventario, User } = req.models;
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const inventarios = await AlmoxInventario.findAll({
      where,
      include: [{ model: User, as: 'responsavel', attributes: ['id', 'nome'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(inventarios);
  } catch (error) {
    console.error('Erro listInventarios:', error);
    res.status(500).json({ error: 'Erro ao listar inventários' });
  }
};

const createInventario = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxInventario, AlmoxInventarioItem, AlmoxarifadoItem } = req.models;
    const { observacao } = req.body;

    // Gera número sequencial
    // Conta também os excluídos: o número do inventário é único e não se repete
    const count = await AlmoxInventario.count({ paranoid: false });
    const ano = new Date().getFullYear();
    const numero = `INV-${ano}-${String(count + 1).padStart(3, '0')}`;

    const inventario = await AlmoxInventario.create({
      numero,
      data_inicio: new Date().toISOString().split('T')[0],
      status: 'EM_ANDAMENTO',
      usuario_responsavel_id: req.user?.id,
      observacao: observacao || null
    });

    // Popula com todos os itens ativos + saldo atual (foto do momento)
    const itens = await AlmoxarifadoItem.findAll({
      where: { ativo: true },
      attributes: ['id', 'estoque_atual', 'valor_unitario']
    });

    const linhas = itens.map(item => ({
      inventario_id:      inventario.id,
      item_id:            item.id,
      quantidade_sistema: parseFloat(item.estoque_atual),
      valor_unitario:     parseFloat(item.valor_unitario)
    }));

    await AlmoxInventarioItem.bulkCreate(linhas);
    await inventario.update({ total_itens: linhas.length });

    res.status(201).json(inventario);
  } catch (error) {
    console.error('Erro createInventario:', error);
    res.status(500).json({ error: 'Erro ao criar inventário' });
  }
};

const getInventario = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxInventario, AlmoxInventarioItem, AlmoxarifadoItem } = req.models;

    const inv = await AlmoxInventario.findByPk(req.params.id, {
      include: [{
        model: AlmoxInventarioItem,
        as: 'itens',
        include: [{ model: AlmoxarifadoItem, as: 'item', attributes: ['id', 'codigo', 'nome', 'unidade', 'categoria', 'corredor', 'prateleira', 'gaveta'] }]
      }]
    });
    if (!inv) return res.status(404).json({ error: 'Inventário não encontrado' });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar inventário' });
  }
};

const registrarContagem = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxInventarioItem, AlmoxInventario } = req.models;
    const { quantidade_contada, observacao } = req.body;

    const linha = await AlmoxInventarioItem.findByPk(req.params.itemId);
    if (!linha) return res.status(404).json({ error: 'Item de inventário não encontrado' });

    const diferenca = parseFloat(quantidade_contada) - parseFloat(linha.quantidade_sistema);
    const valorDiv  = diferenca * parseFloat(linha.valor_unitario);

    await linha.update({
      quantidade_contada: parseFloat(quantidade_contada),
      diferenca,
      valor_divergencia: valorDiv,
      contado: true,
      observacao: observacao || null
    });

    // Atualiza contador de divergências no cabeçalho
    const inv = await AlmoxInventario.findByPk(linha.inventario_id);
    if (inv) {
      const divCount = await AlmoxInventarioItem.count({
        where: { inventario_id: inv.id, contado: true, diferenca: { [Op.ne]: 0 } }
      });
      await inv.update({ total_divergencias: divCount });
    }

    res.json(linha);
  } catch (error) {
    console.error('Erro registrarContagem:', error);
    res.status(500).json({ error: 'Erro ao registrar contagem' });
  }
};

const concluirInventario = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxInventario } = req.models;

    const inv = await AlmoxInventario.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Inventário não encontrado' });
    if (inv.status !== 'EM_ANDAMENTO') {
      return res.status(400).json({ error: 'Inventário não está em andamento' });
    }

    await inv.update({
      status: 'CONCLUIDO',
      data_conclusao: new Date().toISOString().split('T')[0]
    });

    await audit(req.models, {
      tabela: 'almox_inventarios',
      registro_id: inv.id,
      acao: 'CONCLUIU',
      descricao: `Inventário ${inv.numero} concluído`,
      user: req.user
    });

    res.json(inv);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao concluir inventário' });
  }
};


// ─── EDITAR INVENTÁRIO ────────────────────────────────────────────────────────
const updateInventario = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxInventario } = req.models;
    const inv = await AlmoxInventario.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Inventário não encontrado' });
    if (inv.status === 'CONCLUIDO') {
      return res.status(400).json({ error: 'Não é possível editar um inventário concluído' });
    }
    const { observacao } = req.body;
    await inv.update({ observacao });
    await audit(req.models, {
      tabela: 'almox_inventarios',
      registro_id: inv.id,
      acao: 'ATUALIZOU',
      descricao: `Inventário ${inv.numero} editado`,
      user: req.user
    });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar inventário' });
  }
};

// ─── EXCLUIR INVENTÁRIO ───────────────────────────────────────────────────────
const deleteInventario = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxInventario, AlmoxInventarioItem } = req.models;
    const inv = await AlmoxInventario.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Inventário não encontrado' });
    if (inv.status === 'CONCLUIDO') {
      return res.status(400).json({ error: 'Não é possível excluir um inventário concluído' });
    }
    // Itens contados ficam com o inventário (vão juntos para os Excluídos)
    await excluir(req, 'almox_inventarios', inv);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir inventário' });
  }
};

// ─── EXPORTAR TRANSPARÊNCIA ──────────────────────────────────────────────────
const exportarTransparencia = async (req, res) => {
  try {
    await ensureTables(req);
    const { AlmoxarifadoItem, AlmoxarifadoMovimentacao } = req.models;
    const { formato = 'json', data_inicio, data_fim } = req.query;

    const whereMov = { tipo: 'SAIDA' };
    if (data_inicio) whereMov.data_movimentacao = { [Op.gte]: data_inicio };
    if (data_fim) {
      whereMov.data_movimentacao = {
        ...(whereMov.data_movimentacao || {}),
        [Op.lte]: data_fim
      };
    }

    const movimentacoes = await AlmoxarifadoMovimentacao.findAll({
      where: whereMov,
      include: [{ model: AlmoxarifadoItem, as: 'item', attributes: ['codigo', 'nome', 'unidade', 'categoria'] }],
      order: [['data_movimentacao', 'DESC']],
      limit: 5000
    });

    const dados = movimentacoes.map(m => ({
      data: m.data_movimentacao,
      codigo_item: m.item?.codigo,
      nome_item: m.item?.nome,
      unidade: m.item?.unidade,
      categoria: m.item?.categoria,
      quantidade: parseFloat(m.quantidade),
      valor_unitario: parseFloat(m.valor_unitario),
      valor_total: parseFloat(m.valor_total),
      documento_referencia: m.documento_referencia,
      numero_empenho: m.numero_empenho
    }));

    if (formato === 'csv') {
      const cabecalho = 'data,codigo_item,nome_item,unidade,categoria,quantidade,valor_unitario,valor_total,documento_referencia,numero_empenho';
      const linhas = dados.map(d =>
        [d.data, d.codigo_item, `"${d.nome_item}"`, d.unidade, `"${d.categoria || ''}"`,
         d.quantidade, d.valor_unitario, d.valor_total, d.documento_referencia || '', d.numero_empenho || ''].join(',')
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="almoxarifado_transparencia.csv"');
      return res.send('\uFEFF' + cabecalho + '\n' + linhas.join('\n'));
    }

    res.json({ total: dados.length, gerado_em: new Date().toISOString(), movimentacoes: dados });
  } catch (error) {
    console.error('Erro exportarTransparencia:', error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
};

// ─── CONSULTAR NFS-e (Chave de Acesso ou QR Code) ────────────────────────────────────
const consultarNFSe = async (req, res) => {
  try {
    const { chave, qrcode_url } = req.body;
    const input = qrcode_url || chave;

    if (!input || !input.trim()) {
      return res.status(400).json({
        error: 'Informe a chave de acesso NFS-e ou a URL do QR Code'
      });
    }

    const dados = await nfseService.processarNFSe(input.trim());

    // Aviso visual se resultado veio do mock (API inacessível por rede)
    if (dados.is_mock) {
      dados._aviso = (
        'API NFS-e Nacional inacessível no momento — dados simulados (modo demo). ' +
        'Verifique sua conexão ou configure NFSE_API_URL/NFSE_API_TOKEN no server/.env.'
      );
    }

    return res.json(dados);
  } catch (err) {
    // Erro de tomador inválido (422 Unprocessable Entity)
    if (err.code === 'TOMADOR_INVALIDO') {
      return res.status(422).json({
        error: err.message,
        code:  'TOMADOR_INVALIDO'
      });
    }
    // Erro de autenticação na API (401) — orientar o usuário
    if (err.code === 'NFSE_AUTH_REQUIRED') {
      return res.status(401).json({
        error: err.message,
        code:  'NFSE_AUTH_REQUIRED'
      });
    }
    console.error('Erro consultarNFSe:', err);
    return res.status(500).json({ error: err.message || 'Erro ao consultar NFS-e' });
  }
};

module.exports = {
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
};
