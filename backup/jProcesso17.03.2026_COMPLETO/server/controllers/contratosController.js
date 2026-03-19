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
    const { Contrato, Credor } = req.models;
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
    res.json(contratos);
  } catch (err) {
    console.error('listContratos:', err);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
};

const createContrato = async (req, res) => {
  try {
    const { Contrato } = req.models;
    const contrato = await Contrato.create(req.body);
    res.status(201).json(contrato);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Número de contrato já cadastrado' });
    }
    console.error('createContrato:', err);
    res.status(500).json({ error: 'Erro ao criar contrato' });
  }
};

const updateContrato = async (req, res) => {
  try {
    const { Contrato } = req.models;
    const contrato = await Contrato.findByPk(req.params.id);
    if (!contrato) return notFound(res, 'Contrato');
    await contrato.update(req.body);
    res.json(contrato);
  } catch (err) {
    console.error('updateContrato:', err);
    res.status(500).json({ error: 'Erro ao atualizar contrato' });
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

module.exports = {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem,
  listContratos, createContrato, updateContrato, deleteContrato,
};
