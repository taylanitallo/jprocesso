// ─────────────────────────────────────────────────────────────────────────────
//  CONTRATOS CONTROLLER  –  CRUD para Credores, Itens de Catálogo e Contratos
// ─────────────────────────────────────────────────────────────────────────────
const { Op } = require('sequelize');

// ── Helpers ──────────────────────────────────────────────────────────────────

const notFound = (res, entity) => res.status(404).json({ error: `${entity} não encontrado` });

// ── CREDORES ─────────────────────────────────────────────────────────────────

const listCredores = async (req, res) => {
  try {
    const { Credor } = req.models;
    const { status, q } = req.query;

    const where = {};
    if (status) where.status = status;
    if (q) where.razao_social = { [Op.iLike]: `%${q}%` };

    const credores = await Credor.findAll({ where, order: [['razao_social', 'ASC']] });
    res.json(credores);
  } catch (err) {
    console.error('listCredores:', err);
    res.status(500).json({ error: 'Erro ao listar credores' });
  }
};

const createCredor = async (req, res) => {
  try {
    const { Credor } = req.models;
    const credor = await Credor.create(req.body);
    res.status(201).json(credor);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'CNPJ/CPF já cadastrado' });
    }
    console.error('createCredor:', err);
    res.status(500).json({ error: 'Erro ao criar credor' });
  }
};

const updateCredor = async (req, res) => {
  try {
    const { Credor } = req.models;
    const credor = await Credor.findByPk(req.params.id);
    if (!credor) return notFound(res, 'Credor');
    await credor.update(req.body);
    res.json(credor);
  } catch (err) {
    console.error('updateCredor:', err);
    res.status(500).json({ error: 'Erro ao atualizar credor' });
  }
};

const deleteCredor = async (req, res) => {
  try {
    const { Credor } = req.models;
    const credor = await Credor.findByPk(req.params.id);
    if (!credor) return notFound(res, 'Credor');
    await credor.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteCredor:', err);
    res.status(500).json({ error: 'Erro ao excluir credor' });
  }
};

// ── ITENS DE CATÁLOGO ────────────────────────────────────────────────────────

const listItens = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const { status, q } = req.query;

    const where = {};
    if (status) where.status = status;
    if (q) where.descricao = { [Op.iLike]: `%${q}%` };

    const itens = await ContratoItem.findAll({ where, order: [['descricao', 'ASC']] });
    res.json(itens);
  } catch (err) {
    console.error('listItens:', err);
    res.status(500).json({ error: 'Erro ao listar itens' });
  }
};

const createItem = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const item = await ContratoItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    console.error('createItem:', err);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const item = await ContratoItem.findByPk(req.params.id);
    if (!item) return notFound(res, 'Item');
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    console.error('updateItem:', err);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const item = await ContratoItem.findByPk(req.params.id);
    if (!item) return notFound(res, 'Item');
    await item.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteItem:', err);
    res.status(500).json({ error: 'Erro ao excluir item' });
  }
};

// ── CONTRATOS ────────────────────────────────────────────────────────────────

const listContratos = async (req, res) => {
  try {
    const { Contrato, Credor, ContratoItemVinculo } = req.models;
    const { status, q } = req.query;

    const where = {};
    if (status) where.status = status;
    if (q) {
      where[Op.or] = [
        { numero_contrato: { [Op.iLike]: `%${q}%` } },
        { objeto: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const contratos = await Contrato.findAll({
      where,
      include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf', 'tipo'] }],
      order: [['numero_contrato', 'ASC']],
    });

    // Busca itens separadamente para evitar conflito de associação multi-tenant
    if (ContratoItemVinculo && contratos.length > 0) {
      const ids = contratos.map(c => c.id);
      const todosItens = await ContratoItemVinculo.findAll({
        where: { contrato_id: ids },
        order: [['ordem', 'ASC']],
      });
      const itensPorContrato = {};
      todosItens.forEach(it => {
        if (!itensPorContrato[it.contrato_id]) itensPorContrato[it.contrato_id] = [];
        itensPorContrato[it.contrato_id].push(it);
      });
      const result = contratos.map(c => ({
        ...c.toJSON(),
        itens: itensPorContrato[c.id] || [],
      }));
      return res.json(result);
    }

    res.json(contratos);
  } catch (err) {
    console.error('listContratos:', err);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
};

// Salva/substitui os itens vinculados ao contrato
const syncItens = async (ContratoItemVinculo, contratoId, itens) => {
  await ContratoItemVinculo.destroy({ where: { contrato_id: contratoId } });
  if (!Array.isArray(itens) || itens.length === 0) return;
  const rows = itens
    .filter(it => it.descricao && String(it.descricao).trim())
    .map((it, idx) => ({
      contrato_id:    contratoId,
      item_id:        it.item_id || null,
      lote:           it.lote || null,
      descricao:      String(it.descricao).trim(),
      unidade:        it.unidade || null,
      quantidade:     it.quantidade ? parseFloat(String(it.quantidade).replace(',', '.')) : null,
      valor_unitario: it.valor_unitario ? parseFloat(String(it.valor_unitario).replace(',', '.')) : null,
      valor_total:    it.valor_total ? parseFloat(String(it.valor_total).replace(',', '.')) : null,
      ordem:          idx,
    }));
  if (rows.length) await ContratoItemVinculo.bulkCreate(rows);
};

const createContrato = async (req, res) => {
  try {
    const { Contrato, ContratoItemVinculo } = req.models;
    const { itens, ...dados } = req.body;
    if (dados.valor != null && typeof dados.valor === 'string') {
      dados.valor = parseFloat(dados.valor.replace(/[^\d,.]/g, '').replace(',', '.')) || null;
    }
    const contrato = await Contrato.create(dados);
    await syncItens(ContratoItemVinculo, contrato.id, itens);
    const itensDoContrato = ContratoItemVinculo ? await ContratoItemVinculo.findAll({ where: { contrato_id: contrato.id }, order: [['ordem', 'ASC']] }) : [];
    res.status(201).json({ ...contrato.toJSON(), itens: itensDoContrato });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Número de contrato já cadastrado' });
    }
    console.error('createContrato:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar contrato' });
  }
};

const updateContrato = async (req, res) => {
  try {
    const { Contrato, ContratoItemVinculo } = req.models;
    const contrato = await Contrato.findByPk(req.params.id);
    if (!contrato) return notFound(res, 'Contrato');
    const { itens, ...dados } = req.body;
    if (dados.valor != null && typeof dados.valor === 'string') {
      dados.valor = parseFloat(dados.valor.replace(/[^\d,.]/g, '').replace(',', '.')) || null;
    }
    await contrato.update(dados);
    if (itens !== undefined) await syncItens(ContratoItemVinculo, contrato.id, itens);
    const itensDoContrato = ContratoItemVinculo ? await ContratoItemVinculo.findAll({ where: { contrato_id: contrato.id }, order: [['ordem', 'ASC']] }) : [];
    res.json({ ...contrato.toJSON(), itens: itensDoContrato });
  } catch (err) {
    console.error('updateContrato:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar contrato' });
  }
};

const deleteContrato = async (req, res) => {
  try {
    const { Contrato } = req.models;
    const contrato = await Contrato.findByPk(req.params.id);
    if (!contrato) return notFound(res, 'Contrato');
    await contrato.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteContrato:', err);
    res.status(500).json({ error: 'Erro ao excluir contrato' });
  }
};

// ── SINCRONIZAÇÃO: importa credores dos DIDs para a tabela credores ────────────
const syncFromDids = async (req, res) => {
  try {
    const { Credor, Did } = req.models;
    if (!Did) return res.status(400).json({ error: 'Modelo DID não disponível' });

    // Busca todos os pares credor_sec1 / cnpj_cpf únicos dos DIDs
    const dids = await Did.findAll({
      attributes: ['credor_sec1', 'cnpj_cpf_credor_sec1'],
      where: { credor_sec1: { [Op.not]: null, [Op.ne]: '' } },
      raw: true,
    });

    // Deduplica por cnpj_cpf (ou por razao_social quando cnpj ausente)
    const vistos = new Set();
    const pares = [];
    for (const d of dids) {
      const nome = (d.credor_sec1 || '').trim();
      const doc  = (d.cnpj_cpf_credor_sec1 || '').replace(/\D/g, '').trim();
      if (!nome) continue;
      const chave = doc || nome.toLowerCase();
      if (!vistos.has(chave)) { vistos.add(chave); pares.push({ nome, doc }); }
    }

    let criados = 0;
    let ignorados = 0;
    const detalhes = [];

    for (const { nome, doc } of pares) {
      // Verifica se já existe (por cnpj ou por razao_social)
      const where = doc
        ? { [Op.or]: [{ cnpj_cpf: doc }, { razao_social: { [Op.iLike]: nome } }] }
        : { razao_social: { [Op.iLike]: nome } };

      const existente = await Credor.findOne({ where });
      if (existente) {
        ignorados++;
        detalhes.push({ acao: 'ignorado', razao_social: nome, motivo: 'já cadastrado' });
        continue;
      }

      // Detecta tipo pela quantidade de dígitos do CNPJ/CPF
      const tipo = doc.length === 11 ? 'Física' : 'Jurídica';
      const cnpj_cpf = doc
        ? (doc.length === 11
            ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
            : doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'))
        : null;

      await Credor.create({ razao_social: nome, tipo, cnpj_cpf });
      criados++;
      detalhes.push({ acao: 'criado', razao_social: nome });
    }

    res.json({ total: pares.length, criados, ignorados, detalhes });
  } catch (err) {
    console.error('syncFromDids:', err);
    res.status(500).json({ error: err.message || 'Erro ao sincronizar credores dos DIDs' });
  }
};

module.exports = {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
};
