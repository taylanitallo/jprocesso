const { Op } = require('sequelize');
const initializedSchemas = new Set();
const { applyScopeToWhere } = require('../utils/scopeFilter');
const { excluir } = require('../services/lixeiraService');

async function ensureTable(req) {
  const schema = req.tenant?.schema;
  if (!schema || initializedSchemas.has(schema)) return;
  const { TesReceita } = req.models;
  await TesReceita.sync({ force: false });
  initializedSchemas.add(schema);
}

const listReceitas = async (req, res) => {
  try {
    await ensureTable(req);
    const { TesReceita, ContaBancaria } = req.models;
    const { conta_id, data_de, data_ate, busca, banco, num_conta } = req.query;

    const where = {};
    if (conta_id) where.conta_id = conta_id;
    if (data_de || data_ate) {
      where.data = {};
      if (data_de) where.data[Op.gte] = data_de;
      if (data_ate) where.data[Op.lte] = data_ate;
    }
    if (busca) where.descricao = { [Op.iLike]: `%${busca}%` };

    const contaWhere = {};
    if (banco)     contaWhere.banco_nome = { [Op.iLike]: `%${banco}%` };
    if (num_conta) contaWhere.conta      = { [Op.iLike]: `%${num_conta}%` };
    await applyScopeToWhere(contaWhere, req, 'secretaria_id', 'tesouraria', 'receitas', 'ver');
    const hasContaFilter = Object.keys(contaWhere).length > 0;

    const receitas = await TesReceita.findAll({
      where,
      include: [{
        model: ContaBancaria,
        as: 'conta',
        attributes: ['id', 'nome', 'banco_nome', 'banco_codigo', 'agencia', 'conta'],
        where: hasContaFilter ? contaWhere : undefined,
        required: hasContaFilter,
      }],
      order: [['data', 'DESC'], ['created_at', 'DESC']],
    });

    const total = receitas.reduce((s, r) => s + parseFloat(r.valor), 0);
    res.json({ receitas, total });
  } catch (err) {
    console.error('listReceitas:', err);
    res.status(500).json({ error: 'Erro ao listar receitas' });
  }
};

const createReceita = async (req, res) => {
  try {
    await ensureTable(req);
    const { TesReceita } = req.models;
    const { conta_id, data, descricao, valor, observacao } = req.body;
    if (!conta_id) return res.status(400).json({ error: 'Conta é obrigatória' });
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });
    if (!descricao) return res.status(400).json({ error: 'Descrição é obrigatória' });
    if (!valor || isNaN(parseFloat(valor))) return res.status(400).json({ error: 'Valor inválido' });

    const nova = await TesReceita.create({
      conta_id, data, descricao,
      valor: parseFloat(valor),
      observacao: observacao || null,
    });
    res.status(201).json({ receita: nova });
  } catch (err) {
    console.error('createReceita:', err);
    res.status(500).json({ error: 'Erro ao criar receita' });
  }
};

const updateReceita = async (req, res) => {
  try {
    const { TesReceita } = req.models;
    const receita = await TesReceita.findByPk(req.params.id);
    if (!receita) return res.status(404).json({ error: 'Lançamento não encontrado' });
    const { conta_id, data, descricao, valor, observacao } = req.body;
    await receita.update({
      conta_id, data, descricao,
      valor: parseFloat(valor),
      observacao: observacao || null,
    });
    res.json({ receita });
  } catch (err) {
    console.error('updateReceita:', err);
    res.status(500).json({ error: 'Erro ao atualizar receita' });
  }
};

const deleteReceita = async (req, res) => {
  try {
    const { TesReceita } = req.models;
    const receita = await TesReceita.findByPk(req.params.id);
    if (!receita) return res.status(404).json({ error: 'Lançamento não encontrado' });
    await excluir(req, 'receitas', receita); // vai para os Excluídos
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteReceita:', err);
    res.status(500).json({ error: 'Erro ao excluir receita' });
  }
};

module.exports = { listReceitas, createReceita, updateReceita, deleteReceita };
