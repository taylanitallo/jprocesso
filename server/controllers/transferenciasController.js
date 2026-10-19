// Tesouraria › Transferências entre contas bancárias.
// A transferência entra no caixa pela caixaService (saída na origem, entrada no
// destino); aqui ficam a lista (com quem registrou) e o registro de uma nova.
const { Op } = require('sequelize');
const { applyScopeToWhere } = require('../utils/scopeFilter');
const caixa = require('../services/caixaService');

const ATRIBUTOS_CONTA = ['id', 'nome', 'banco_nome', 'banco_codigo', 'agencia', 'agencia_digito', 'conta', 'conta_digito'];
const centavos = (v) => Math.round(v * 100) / 100;

// Contas que o usuário enxerga na Tesouraria (mesmo escopo de secretarias da aba)
async function contasVisiveis(req, acao) {
  const where = {};
  await applyScopeToWhere(where, req, 'secretaria_id', 'tesouraria', 'transferencias', acao);
  if (!Object.keys(where).length) return null; // todas
  const contas = await req.models.ContaBancaria.findAll({ where, attributes: ['id'], raw: true });
  return contas.map(c => String(c.id));
}

const listTransferencias = async (req, res) => {
  try {
    const { TesTransferencia, ContaBancaria } = req.models;
    const { data_de, data_ate, conta_id } = req.query;

    const where = {};
    if (data_de || data_ate) {
      where.data = {};
      if (data_de) where.data[Op.gte] = data_de;
      if (data_ate) where.data[Op.lte] = data_ate;
    }
    const visiveis = await contasVisiveis(req, 'ver');
    const ou = [];
    if (conta_id) ou.push({ conta_origem_id: conta_id }, { conta_destino_id: conta_id });
    if (visiveis) {
      where[Op.and] = [{ [Op.or]: [{ conta_origem_id: { [Op.in]: visiveis } }, { conta_destino_id: { [Op.in]: visiveis } }] }];
    }
    if (ou.length) where[Op.or] = ou;

    const transferencias = await TesTransferencia.findAll({
      where,
      include: [
        { model: ContaBancaria, as: 'origem', attributes: ATRIBUTOS_CONTA, required: false, paranoid: false },
        { model: ContaBancaria, as: 'destino', attributes: ATRIBUTOS_CONTA, required: false, paranoid: false },
      ],
      order: [['data', 'DESC'], ['created_at', 'DESC']],
    });
    const total = centavos(transferencias.reduce((s, t) => s + parseFloat(t.valor), 0));
    res.json({ transferencias, total });
  } catch (err) {
    console.error('listTransferencias:', err);
    res.status(500).json({ error: 'Erro ao listar as transferências' });
  }
};

const createTransferencia = async (req, res) => {
  try {
    const { TesTransferencia, ContaBancaria, User } = req.models;
    const { data, conta_origem_id, conta_destino_id, observacao } = req.body;
    const valor = centavos(parseFloat(req.body.valor));

    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(String(data))) return res.status(400).json({ error: 'Informe a data da transferência' });
    if (!conta_origem_id) return res.status(400).json({ error: 'Selecione a conta de origem' });
    if (!conta_destino_id) return res.status(400).json({ error: 'Selecione a conta de destino' });
    if (String(conta_origem_id) === String(conta_destino_id)) return res.status(400).json({ error: 'A conta de destino deve ser diferente da conta de origem' });
    if (!(valor > 0)) return res.status(400).json({ error: 'Informe um valor maior que zero' });

    const [origem, destino] = await Promise.all([ContaBancaria.findByPk(conta_origem_id), ContaBancaria.findByPk(conta_destino_id)]);
    if (!origem || !destino) return res.status(404).json({ error: 'Conta bancária não encontrada' });
    if (origem.ativo === false || destino.ativo === false) return res.status(400).json({ error: 'Não é possível transferir com conta inativa' });

    const visiveis = await contasVisiveis(req, 'criar');
    if (visiveis && (!visiveis.includes(String(origem.id)) || !visiveis.includes(String(destino.id)))) {
      return res.status(403).json({ error: 'Você não tem acesso a uma das contas desta transferência' });
    }

    // Não deixa a conta de origem ficar negativa
    const situacao = await caixa.situacaoContas(req.models, { contaIds: [origem.id] });
    const saldo = situacao.get(origem.id)?.saldo ?? 0;
    if (valor > saldo + 0.004) {
      return res.status(400).json({
        error: `Saldo insuficiente na conta de origem (saldo atual: ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
        saldo,
      });
    }

    const usuario = await User.findByPk(req.user.id, { attributes: ['nome'] }).catch(() => null);
    const nova = await TesTransferencia.create({
      data, valor,
      conta_origem_id: origem.id,
      conta_destino_id: destino.id,
      observacao: String(observacao || '').trim() || null,
      usuario_id: req.user.id,
      usuario_nome: usuario?.nome || req.user.nome || null,
    });
    res.status(201).json({ transferencia: nova });
  } catch (err) {
    console.error('createTransferencia:', err);
    res.status(500).json({ error: 'Erro ao registrar a transferência' });
  }
};

module.exports = { listTransferencias, createTransferencia };
