const { Op } = require('sequelize');
const initializedSchemas = new Set();

async function ensureTable(req) {
  const schema = req.tenant?.schema;
  if (!schema || initializedSchemas.has(schema)) return;
  const { TesDespesa } = req.models;
  await TesDespesa.sync({ force: false });
  initializedSchemas.add(schema);
}

const listDespesas = async (req, res) => {
  try {
    const { ContratoOrdem, TesDespesa, Contrato, Credor, ContaBancaria, Did, Processo, Secretaria } = req.models;
    const { tipo, pago, data_de, data_ate, busca, secretaria, processo } = req.query;

    const where = {};
    if (tipo && tipo !== 'TODOS') where.tipo = tipo;
    if (secretaria) {
      where.secretaria = { [Op.iLike]: `%${secretaria}%` };
    } else if (req.user.tipo !== 'admin' && req.user.tipo !== 'jeos' && req.user.secretariaNome) {
      where.secretaria = { [Op.iLike]: req.user.secretariaNome };
    }
    if (data_de || data_ate) {
      where.data_emissao = {};
      if (data_de) where.data_emissao[Op.gte] = data_de;
      if (data_ate) where.data_emissao[Op.lte] = data_ate;
    }
    if (busca) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${busca}%` } },
        { objeto:  { [Op.iLike]: `%${busca}%` } },
      ];
    }

    const [ordens, secretarias] = await Promise.all([
      ContratoOrdem.findAll({
      where,
      include: [
        {
          model: Contrato,
          as: 'contrato',
          attributes: ['id', 'numero_contrato', 'objeto'],
          required: false,
          include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social'], required: false }],
        },
        {
          model: TesDespesa,
          as: 'pagamento',
          required: false,
          include: [{
            model: ContaBancaria,
            as: 'conta',
            attributes: ['id', 'nome', 'banco_nome'],
            required: false,
          }],
        },
        {
          model: Did,
          as: 'did',
          attributes: ['id', 'pago', 'valor_bruto', 'desconto_inss', 'desconto_iss', 'desconto_irrf', 'desconto_sindicato', 'desconto_bb', 'desconto_caixa', 'desconto_pensao', 'desconto_outros', 'doc_caixa', 'tesouraria_recebido_em', 'conta_pagamento_id', 'processo_id'],
          required: false,
          include: [{
            model: Processo,
            as: 'processo',
            attributes: ['id', 'numero'],
            required: false,
          }],
        },
      ],
        order: [['data_emissao', 'DESC'], ['id', 'DESC']],
      }),
      Secretaria.findAll({ attributes: ['nome', 'sigla'], raw: true }),
    ]);

    const siglaMap = Object.fromEntries(secretarias.map(s => [s.nome?.toLowerCase(), s.sigla]));

    // filtro por número de processo (pós-query, via DID)
    const filtroProcesso = processo?.trim();


    const isPago = o => o.pagamento || o.did?.pago === 'sim';
    let result = ordens;
    if (pago === 'pago')     result = result.filter(o => isPago(o));
    if (pago === 'pendente') result = result.filter(o => !isPago(o));
    if (filtroProcesso)      result = result.filter(o => o.did?.processo?.numero?.toLowerCase().includes(filtroProcesso.toLowerCase()));

    const ordens_final = result.map(o => {
      const j = o.toJSON();
      j.secretaria_sigla = siglaMap[j.secretaria?.toLowerCase()] || j.secretaria || null;
      return j;
    });

    res.json({ ordens: ordens_final });
  } catch (err) {
    console.error('listDespesas:', err.message);
    res.status(500).json({ error: 'Erro ao listar despesas', detalhe: err.message });
  }
};

const registrarPagamento = async (req, res) => {
  try {
    await ensureTable(req);
    const { TesDespesa, ContratoOrdem } = req.models;
    const { ordem_id } = req.params;
    const { conta_id, data_pagamento, valor_bruto, valor_liquido, observacao } = req.body;

    const ordem = await ContratoOrdem.findByPk(ordem_id);
    if (!ordem) return res.status(404).json({ error: 'Ordem não encontrada' });

    const existing = await TesDespesa.findOne({ where: { ordem_id: parseInt(ordem_id) } });
    if (existing) return res.status(400).json({ error: 'Esta ordem já possui pagamento registrado' });

    if (!conta_id)       return res.status(400).json({ error: 'Conta bancária é obrigatória' });
    if (!data_pagamento) return res.status(400).json({ error: 'Data do pagamento é obrigatória' });
    if (!valor_bruto)    return res.status(400).json({ error: 'Valor bruto é obrigatório' });

    const vb = parseFloat(valor_bruto);
    const vl = parseFloat(valor_liquido || valor_bruto);
    if (isNaN(vb) || vb <= 0) return res.status(400).json({ error: 'Valor bruto inválido' });

    const despesa = await TesDespesa.create({
      ordem_id: parseInt(ordem_id),
      conta_id,
      data_pagamento,
      valor_bruto: vb,
      valor_liquido: vl,
      observacao: observacao || null,
    });

    res.status(201).json({ despesa });
  } catch (err) {
    console.error('registrarPagamento:', err);
    res.status(500).json({ error: 'Erro ao registrar pagamento' });
  }
};

const updatePagamento = async (req, res) => {
  try {
    const { TesDespesa } = req.models;
    const despesa = await TesDespesa.findByPk(req.params.id);
    if (!despesa) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const { conta_id, data_pagamento, valor_bruto, valor_liquido, observacao } = req.body;
    const vb = parseFloat(valor_bruto);
    const vl = parseFloat(valor_liquido || valor_bruto);
    if (isNaN(vb) || vb <= 0) return res.status(400).json({ error: 'Valor bruto inválido' });

    await despesa.update({ conta_id, data_pagamento, valor_bruto: vb, valor_liquido: vl, observacao: observacao || null });
    res.json({ despesa });
  } catch (err) {
    console.error('updatePagamento:', err);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
};

const estornarPagamento = async (req, res) => {
  try {
    const { TesDespesa } = req.models;
    const despesa = await TesDespesa.findByPk(req.params.id);
    if (!despesa) return res.status(404).json({ error: 'Pagamento não encontrado' });
    await despesa.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('estornarPagamento:', err);
    res.status(500).json({ error: 'Erro ao estornar pagamento' });
  }
};

module.exports = { listDespesas, registrarPagamento, updatePagamento, estornarPagamento };
