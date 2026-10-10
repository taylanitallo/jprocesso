const { Op, fn, col } = require('sequelize');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Normaliza uma lista de UUIDs vinda do cliente (CSV ou array), descartando lixo.
// Evita que um id malformado derrube a query com erro de cast do Postgres.
const parseUuidList = (v) => {
  const raw = Array.isArray(v) ? v : String(v || '').split(',');
  return [...new Set(raw.map(s => String(s).trim()).filter(s => UUID_RE.test(s)))];
};

const saldoContas = async (req, res) => {
  try {
    const { ContaBancaria, TesReceita, TesDespesa, Did, TesGrupoConta } = req.models;
    const { data_de, data_ate, contas_ids, grupo_id } = req.query;

    // Filtro de contas: grupo salvo tem precedência sobre a seleção manual.
    // Sem nenhum dos dois, o relatório sai com todas as contas ativas (comportamento padrão).
    let filtroContasIds = null;
    let grupo = null;

    if (grupo_id && UUID_RE.test(grupo_id)) {
      grupo = await TesGrupoConta.findOne({
        where: { id: grupo_id, usuario_id: req.user.id, ativo: true },
      });
      if (!grupo) return res.status(404).json({ error: 'Grupo de contas não encontrado' });
      filtroContasIds = parseUuidList(grupo.contas_ids);
    } else if (contas_ids) {
      filtroContasIds = parseUuidList(contas_ids);
    }

    const contaWhere = { ativo: true };
    if (filtroContasIds) contaWhere.id = { [Op.in]: filtroContasIds };

    const receitaWhere = {};
    if (data_de || data_ate) {
      receitaWhere.data = {};
      if (data_de) receitaWhere.data[Op.gte] = data_de;
      if (data_ate) receitaWhere.data[Op.lte] = data_ate;
    }

    const despesaWhere = {};
    if (data_de || data_ate) {
      despesaWhere.data_pagamento = {};
      if (data_de) despesaWhere.data_pagamento[Op.gte] = data_de;
      if (data_ate) despesaWhere.data_pagamento[Op.lte] = data_ate;
    }

    const didWhere = { pago: 'sim', conta_pagamento_id: { [Op.not]: null } };
    if (data_de || data_ate) {
      didWhere.tesouraria_recebido_em = {};
      if (data_de) didWhere.tesouraria_recebido_em[Op.gte] = data_de;
      if (data_ate) didWhere.tesouraria_recebido_em[Op.lte] = data_ate;
    }

    // Restringe também as agregações às contas filtradas (Op.in de UUIDs já implica NOT NULL)
    if (filtroContasIds) {
      receitaWhere.conta_id = { [Op.in]: filtroContasIds };
      despesaWhere.conta_id = { [Op.in]: filtroContasIds };
      didWhere.conta_pagamento_id = { [Op.in]: filtroContasIds };
    }

    const [contas, receitas, despesas, didDespesas] = await Promise.all([
      ContaBancaria.findAll({ where: contaWhere, order: [['nome', 'ASC']] }),
      TesReceita.findAll({
        attributes: ['conta_id', [fn('SUM', col('valor')), 'total']],
        where: receitaWhere,
        group: ['conta_id'],
        raw: true,
      }),
      TesDespesa.findAll({
        attributes: ['conta_id', [fn('SUM', col('valor_bruto')), 'total']],
        where: despesaWhere,
        group: ['conta_id'],
        raw: true,
      }),
      Did.findAll({
        attributes: ['conta_pagamento_id', [fn('SUM', col('valor_bruto')), 'total']],
        where: didWhere,
        group: ['conta_pagamento_id'],
        raw: true,
      }),
    ]);

    const result = contas.map(c => {
      const r  = parseFloat(receitas.find(x => x.conta_id === c.id)?.total || 0);
      const d1 = parseFloat(despesas.find(x => x.conta_id === c.id)?.total || 0);
      const d2 = parseFloat(didDespesas.find(x => x.conta_pagamento_id === c.id)?.total || 0);
      const d  = d1 + d2;
      return { ...c.toJSON(), total_receitas: r, total_despesas: d, saldo: r - d };
    });

    const totais = {
      receitas: result.reduce((s, c) => s + c.total_receitas, 0),
      despesas: result.reduce((s, c) => s + c.total_despesas, 0),
      saldo:    result.reduce((s, c) => s + c.saldo, 0),
    };

    // Contas do grupo que não voltaram na consulta (excluídas ou desativadas depois
    // que o grupo foi salvo) — o front avisa o usuário sem quebrar o relatório.
    const filtro = filtroContasIds
      ? {
          grupo_id: grupo?.id || null,
          grupo_nome: grupo?.nome || null,
          solicitadas: filtroContasIds.length,
          indisponiveis: filtroContasIds.length - result.length,
        }
      : null;

    res.json({ contas: result, totais, filtro });
  } catch (err) {
    console.error('saldoContas:', err);
    res.status(500).json({ error: 'Erro ao calcular saldo das contas' });
  }
};

const fluxoMensal = async (req, res) => {
  try {
    const { TesReceita, TesDespesa, Did } = req.models;
    const { conta_id, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const sequelize = TesReceita.sequelize;

    const receitaWhere = {
      data: { [Op.between]: [`${anoNum}-01-01`, `${anoNum}-12-31`] },
    };
    if (conta_id) receitaWhere.conta_id = conta_id;

    const despesaWhere = {
      data_pagamento: { [Op.between]: [`${anoNum}-01-01`, `${anoNum}-12-31`] },
    };
    if (conta_id) despesaWhere.conta_id = conta_id;

    const didWhere = {
      pago: 'sim',
      conta_pagamento_id: { [Op.not]: null },
      tesouraria_recebido_em: { [Op.between]: [`${anoNum}-01-01`, `${anoNum}-12-31`] },
    };
    if (conta_id) didWhere.conta_pagamento_id = conta_id;

    const mesTrunc = (campo) => sequelize.fn('DATE_TRUNC', 'month', sequelize.col(campo));

    const [receitas, despesas, didDespesas] = await Promise.all([
      TesReceita.findAll({
        attributes: [
          [sequelize.fn('TO_CHAR', mesTrunc('data'), 'YYYY-MM'), 'mes'],
          [fn('SUM', col('valor')), 'total'],
        ],
        where: receitaWhere,
        group: [mesTrunc('data')],
        order: [[mesTrunc('data'), 'ASC']],
        raw: true,
      }),
      TesDespesa.findAll({
        attributes: [
          [sequelize.fn('TO_CHAR', mesTrunc('data_pagamento'), 'YYYY-MM'), 'mes'],
          [fn('SUM', col('valor_bruto')), 'total'],
        ],
        where: despesaWhere,
        group: [mesTrunc('data_pagamento')],
        order: [[mesTrunc('data_pagamento'), 'ASC']],
        raw: true,
      }),
      Did.findAll({
        attributes: [
          [sequelize.fn('TO_CHAR', mesTrunc('tesouraria_recebido_em'), 'YYYY-MM'), 'mes'],
          [fn('SUM', col('valor_bruto')), 'total'],
        ],
        where: didWhere,
        group: [mesTrunc('tesouraria_recebido_em')],
        order: [[mesTrunc('tesouraria_recebido_em'), 'ASC']],
        raw: true,
      }),
    ]);

    const mesesSet = new Set([
      ...receitas.map(r => r.mes),
      ...despesas.map(d => d.mes),
      ...didDespesas.map(d => d.mes),
    ]);
    const meses = [...mesesSet].sort().map(mes => {
      const r  = parseFloat(receitas.find(x => x.mes === mes)?.total || 0);
      const d1 = parseFloat(despesas.find(x => x.mes === mes)?.total || 0);
      const d2 = parseFloat(didDespesas.find(x => x.mes === mes)?.total || 0);
      const d  = d1 + d2;
      return { mes, receitas: r, despesas: d, resultado: r - d };
    });

    const totais = {
      receitas:  meses.reduce((s, m) => s + m.receitas, 0),
      despesas:  meses.reduce((s, m) => s + m.despesas, 0),
      resultado: meses.reduce((s, m) => s + m.resultado, 0),
    };

    res.json({ meses, totais, ano: anoNum });
  } catch (err) {
    console.error('fluxoMensal:', err);
    res.status(500).json({ error: 'Erro ao calcular fluxo mensal' });
  }
};

const extratoConta = async (req, res) => {
  try {
    const { ContaBancaria, TesReceita, TesDespesa, ContratoOrdem, Did } = req.models;
    const { conta_id, data_de, data_ate } = req.query;
    if (!conta_id) return res.status(400).json({ error: 'Conta é obrigatória' });

    const conta = await ContaBancaria.findByPk(conta_id);
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

    const receitaWhere = { conta_id };
    if (data_de || data_ate) {
      receitaWhere.data = {};
      if (data_de) receitaWhere.data[Op.gte] = data_de;
      if (data_ate) receitaWhere.data[Op.lte] = data_ate;
    }

    const despesaWhere = { conta_id };
    if (data_de || data_ate) {
      despesaWhere.data_pagamento = {};
      if (data_de) despesaWhere.data_pagamento[Op.gte] = data_de;
      if (data_ate) despesaWhere.data_pagamento[Op.lte] = data_ate;
    }

    const didWhere = { pago: 'sim', conta_pagamento_id: conta_id };
    if (data_de || data_ate) {
      didWhere.tesouraria_recebido_em = {};
      if (data_de) didWhere.tesouraria_recebido_em[Op.gte] = data_de;
      if (data_ate) didWhere.tesouraria_recebido_em[Op.lte] = data_ate;
    }

    const [receitas, despesas, dids] = await Promise.all([
      TesReceita.findAll({ where: receitaWhere, raw: true }),
      TesDespesa.findAll({
        where: despesaWhere,
        include: [{
          model: ContratoOrdem,
          as: 'ordem',
          attributes: ['id', 'numero', 'objeto', 'tipo'],
          required: false,
        }],
      }),
      Did.findAll({
        where: didWhere,
        include: [{
          model: ContratoOrdem,
          as: 'ordemCompra',
          attributes: ['id', 'numero', 'objeto', 'tipo'],
          required: false,
        }],
      }),
    ]);

    const lancamentos = [
      ...receitas.map(r => ({
        tipo: 'R',
        data: r.data,
        descricao: r.descricao,
        valor: parseFloat(r.valor),
        observacao: r.observacao || null,
      })),
      ...despesas.map(d => ({
        tipo: 'D',
        data: d.data_pagamento,
        descricao: d.ordem
          ? `${d.ordem.tipo === 'COMPRA' ? 'OC' : 'OS'} ${d.ordem.numero} — ${d.ordem.objeto}`
          : `Pagamento #${d.ordem_id}`,
        valor: parseFloat(d.valor_bruto),
        valor_liquido: parseFloat(d.valor_liquido),
        observacao: d.observacao || null,
      })),
      ...dids.map(d => ({
        tipo: 'D',
        data: d.tesouraria_recebido_em,
        descricao: d.ordemCompra
          ? `${d.ordemCompra.tipo === 'COMPRA' ? 'OC' : 'OS'} ${d.ordemCompra.numero} — ${d.ordemCompra.objeto}`
          : `DID ${d.numero_did || d.id}`,
        valor: parseFloat(d.valor_bruto || 0),
        valor_liquido: parseFloat(d.valor_bruto || 0) - ['desconto_inss','desconto_iss','desconto_irrf','desconto_sindicato','desconto_bb','desconto_caixa','desconto_pensao','desconto_outros'].reduce((s, k) => s + parseFloat(d[k] || 0), 0),
        doc_caixa: d.doc_caixa || null,
        observacao: null,
      })),
    ].sort((a, b) => {
      const diff = String(a.data).localeCompare(String(b.data));
      return diff !== 0 ? diff : (a.tipo === 'R' ? -1 : 1);
    });

    let saldo = 0;
    lancamentos.forEach(l => {
      saldo += l.tipo === 'R' ? l.valor : -l.valor;
      l.saldo = saldo;
    });

    const totalReceitas = receitas.reduce((s, r) => s + parseFloat(r.valor), 0);
    const totalDespesas =
      despesas.reduce((s, d) => s + parseFloat(d.valor_bruto || 0), 0) +
      dids.reduce((s, d) => s + parseFloat(d.valor_bruto || 0), 0);

    res.json({
      conta: conta.toJSON(),
      lancamentos,
      totais: { receitas: totalReceitas, despesas: totalDespesas, saldo: totalReceitas - totalDespesas },
    });
  } catch (err) {
    console.error('extratoConta:', err);
    res.status(500).json({ error: 'Erro ao gerar extrato' });
  }
};

module.exports = { saldoContas, fluxoMensal, extratoConta };
