const { Op } = require('sequelize');
const caixa = require('../services/caixaService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Normaliza uma lista de UUIDs vinda do cliente (CSV ou array), descartando lixo.
// Evita que um id malformado derrube a query com erro de cast do Postgres.
const parseUuidList = (v) => {
  const raw = Array.isArray(v) ? v : String(v || '').split(',');
  return [...new Set(raw.map(s => String(s).trim()).filter(s => UUID_RE.test(s)))];
};

const soma = (lista, fn) => Math.round(lista.reduce((s, x) => s + fn(x), 0) * 100) / 100;

// Saldo por conta. Receitas/despesas respeitam o período; saldo atual,
// comprometido, a recolher e disponível são sempre a situação de hoje.
const saldoContas = async (req, res) => {
  try {
    const { ContaBancaria, TesGrupoConta } = req.models;
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
    const contas = await ContaBancaria.findAll({ where: contaWhere, order: [['nome', 'ASC']] });
    const ids = contas.map(c => c.id);

    const [movs, situacao] = await Promise.all([
      caixa.movimentos(req.models, { contaIds: ids, de: data_de || null, ate: data_ate || null }),
      caixa.situacaoContas(req.models, { contaIds: ids }),
    ]);

    const result = contas.map(c => {
      const daConta = movs.filter(m => m.conta_id === c.id);
      const r = soma(daConta.filter(m => m.tipo === 'R'), m => m.valor);
      const d = soma(daConta.filter(m => m.tipo === 'D'), m => m.valor);
      const s = situacao.get(c.id) || { saldo: 0, comprometido: 0, a_recolher: 0, disponivel: 0 };
      return {
        ...c.toJSON(),
        total_receitas: r,
        total_despesas: d,
        saldo: Math.round((r - d) * 100) / 100,   // resultado do período
        saldo_atual: s.saldo,
        comprometido: s.comprometido,
        a_recolher: s.a_recolher,
        disponivel: s.disponivel,
      };
    });

    const totais = {
      receitas:     soma(result, c => c.total_receitas),
      despesas:     soma(result, c => c.total_despesas),
      saldo:        soma(result, c => c.saldo),
      saldo_atual:  soma(result, c => c.saldo_atual),
      comprometido: soma(result, c => c.comprometido),
      a_recolher:   soma(result, c => c.a_recolher),
      disponivel:   soma(result, c => c.disponivel),
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
    const { conta_id, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();

    const movs = await caixa.movimentos(req.models, {
      contaIds: conta_id ? [conta_id] : null,
      de: `${anoNum}-01-01`,
      ate: `${anoNum}-12-31`,
    });

    const porMes = new Map();
    for (const m of movs) {
      const mes = String(m.data).slice(0, 7);
      if (!porMes.has(mes)) porMes.set(mes, { mes, receitas: 0, despesas: 0 });
      porMes.get(mes)[m.tipo === 'R' ? 'receitas' : 'despesas'] += m.valor;
    }
    const meses = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map(m => ({
      mes: m.mes,
      receitas: Math.round(m.receitas * 100) / 100,
      despesas: Math.round(m.despesas * 100) / 100,
      resultado: Math.round((m.receitas - m.despesas) * 100) / 100,
    }));

    const totais = {
      receitas:  soma(meses, m => m.receitas),
      despesas:  soma(meses, m => m.despesas),
      resultado: soma(meses, m => m.resultado),
    };

    res.json({ meses, totais, ano: anoNum });
  } catch (err) {
    console.error('fluxoMensal:', err);
    res.status(500).json({ error: 'Erro ao calcular fluxo mensal' });
  }
};

const extratoConta = async (req, res) => {
  try {
    const { ContaBancaria } = req.models;
    const { conta_id, data_de, data_ate } = req.query;
    if (!conta_id) return res.status(400).json({ error: 'Conta é obrigatória' });

    const conta = await ContaBancaria.findByPk(conta_id);
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

    const todos = await caixa.movimentos(req.models, { contaIds: [conta_id], ate: data_ate || null });
    // Com data inicial, o extrato parte do saldo acumulado até o dia anterior
    const anteriores = data_de ? todos.filter(m => m.data < data_de) : [];
    const lancamentos = data_de ? todos.filter(m => m.data >= data_de) : todos;
    const saldoAnterior = soma(anteriores, m => (m.tipo === 'R' ? m.valor : -m.valor));

    let saldo = saldoAnterior;
    lancamentos.forEach(l => {
      saldo += l.tipo === 'R' ? l.valor : -l.valor;
      l.saldo = Math.round(saldo * 100) / 100;
    });

    const totalReceitas = soma(lancamentos.filter(l => l.tipo === 'R'), l => l.valor);
    const totalDespesas = soma(lancamentos.filter(l => l.tipo === 'D'), l => l.valor);
    const situacao = (await caixa.situacaoContas(req.models, { contaIds: [conta_id] })).get(conta_id)
      || { saldo: 0, comprometido: 0, a_recolher: 0, disponivel: 0 };

    res.json({
      conta: conta.toJSON(),
      lancamentos,
      totais: {
        saldo_anterior: saldoAnterior,
        receitas: totalReceitas,
        despesas: totalDespesas,
        saldo: Math.round((saldoAnterior + totalReceitas - totalDespesas) * 100) / 100,
      },
      situacao,
    });
  } catch (err) {
    console.error('extratoConta:', err);
    res.status(500).json({ error: 'Erro ao gerar extrato' });
  }
};

// Situação de uma conta para o DID: quanto dá para pagar sem estourar
const disponivelConta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Conta inválida' });
    const ignorar = req.query.ignorar_did && UUID_RE.test(req.query.ignorar_did) ? req.query.ignorar_did : null;
    const situacao = (await caixa.situacaoContas(req.models, { contaIds: [id], ignorarDidId: ignorar })).get(id)
      || { saldo: 0, comprometido: 0, a_recolher: 0, disponivel: 0, dids_comprometidos: 0, dids_a_recolher: 0 };
    res.json(situacao);
  } catch (err) {
    console.error('disponivelConta:', err);
    res.status(500).json({ error: 'Erro ao calcular o disponível da conta' });
  }
};

module.exports = { saldoContas, fluxoMensal, extratoConta, disponivelConta };
