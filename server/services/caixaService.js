// ─────────────────────────────────────────────────────────────────────────────
//  CAIXA DAS CONTAS BANCÁRIAS — fonte única de saldo, extrato, fluxo e disponível
//
//  Entradas: receitas lançadas na Tesouraria; transferências recebidas de outra conta.
//  Saídas:   transferências enviadas a outra conta;
//            DID pago → debita o LÍQUIDO na data do pagamento;
//            retenções do DID (INSS, ISS, IRRF, consignados…) → debitadas quando a
//            Tesouraria registra o recolhimento (até lá ficam "a recolher");
//            pagamentos antigos registrados direto na Tesouraria (tes_despesas) →
//            líquido, exceto se o DID da mesma ordem já estiver pago (não duplica).
//  Reservas: DID com conta de pagamento escolhida e ainda não pago = comprometido.
//  Disponível = saldo − comprometido − retenções a recolher.
// ─────────────────────────────────────────────────────────────────────────────
const { Op } = require('sequelize');

const DESCONTOS = [
  'desconto_inss', 'desconto_iss', 'desconto_irrf', 'desconto_sindicato',
  'desconto_bb', 'desconto_caixa', 'desconto_pensao', 'desconto_outros',
];
const num = (v) => parseFloat(v || 0) || 0;
const centavos = (v) => Math.round(v * 100) / 100;

const retencoesDoDid = (d) => centavos(DESCONTOS.reduce((s, k) => s + num(d[k]), 0));
const liquidoDoDid = (d) => centavos(num(d.valor_bruto) - retencoesDoDid(d));
// DIDs pagos antes do campo data_pagamento usam a data em que a Tesouraria recebeu
const dataPagamentoDoDid = (d) => d.data_pagamento || d.tesouraria_recebido_em || null;

const descricaoDid = (d) => {
  const o = d.ordemCompra;
  const base = o ? `${o.tipo === 'COMPRA' ? 'OC' : 'OS'} ${o.numero} — ${o.objeto}` : `DID ${d.numero_did || ''}`.trim();
  return d.credor_sec1 ? `${base} · ${d.credor_sec1}` : base;
};

const dentro = (data, de, ate) => !!data && (!de || data >= de) && (!ate || data <= ate);
const contaFiltro = (campo, contaIds) => (contaIds ? { [campo]: { [Op.in]: contaIds } } : { [campo]: { [Op.ne]: null } });

/**
 * Movimentos de caixa (entradas e saídas) das contas.
 * @param contaIds lista de ids ou null (todas)
 * @param de/ate   'YYYY-MM-DD' opcionais (inclusive)
 * @returns [{ conta_id, tipo: 'R'|'D', origem, data, descricao, valor, ... }]
 */
async function movimentos(models, { contaIds = null, de = null, ate = null } = {}) {
  const { TesReceita, TesDespesa, Did, ContratoOrdem } = models;

  const receitaWhere = contaFiltro('conta_id', contaIds);
  if (de || ate) {
    receitaWhere.data = {};
    if (de) receitaWhere.data[Op.gte] = de;
    if (ate) receitaWhere.data[Op.lte] = ate;
  }

  const [receitas, dids, legado] = await Promise.all([
    TesReceita.findAll({ where: receitaWhere, raw: true }),
    // Datas de pagamento e de recolhimento são diferentes: filtra o período em JS
    Did.findAll({
      where: { pago: 'sim', ...contaFiltro('conta_pagamento_id', contaIds) },
      include: [{ model: ContratoOrdem, as: 'ordemCompra', attributes: ['id', 'numero', 'objeto', 'tipo'], required: false }],
    }),
    TesDespesa
      ? TesDespesa.findAll({
          where: contaFiltro('conta_id', contaIds),
          include: [{ model: ContratoOrdem, as: 'ordem', attributes: ['id', 'numero', 'objeto', 'tipo'], required: false }],
        })
      : [],
  ]);

  const lista = receitas.map((r) => ({
    conta_id: r.conta_id,
    tipo: 'R',
    origem: 'receita',
    data: r.data,
    descricao: r.descricao,
    valor: num(r.valor),
    observacao: r.observacao || null,
  }));

  // Ordens já pagas pelo DID: o pagamento antigo da Tesouraria não conta de novo
  const ordensPagasPorDid = new Set();
  for (const inst of dids) {
    const d = inst.toJSON();
    if (d.ordem_compra_id) ordensPagasPorDid.add(d.ordem_compra_id);
    const dataPag = dataPagamentoDoDid(d);
    const ret = retencoesDoDid(d);
    if (dentro(dataPag, de, ate)) {
      lista.push({
        conta_id: d.conta_pagamento_id,
        tipo: 'D',
        origem: 'did',
        data: dataPag,
        descricao: descricaoDid(d),
        valor: liquidoDoDid(d),
        valor_bruto: num(d.valor_bruto),
        retencoes: ret,
        doc_caixa: d.doc_caixa || null,
        did_id: d.id,
        processo_id: d.processo_id,
      });
    }
    if (ret > 0 && dentro(d.retencoes_recolhidas_em, de, ate)) {
      lista.push({
        conta_id: d.conta_pagamento_id,
        tipo: 'D',
        origem: 'retencoes',
        data: d.retencoes_recolhidas_em,
        descricao: `Recolhimento de retenções — ${descricaoDid(d)}`,
        valor: ret,
        did_id: d.id,
        processo_id: d.processo_id,
      });
    }
  }

  for (const inst of legado) {
    const p = inst.toJSON();
    if (p.ordem_id && ordensPagasPorDid.has(p.ordem_id)) continue;
    if (!dentro(p.data_pagamento, de, ate)) continue;
    const o = p.ordem;
    const descricao = o ? `${o.tipo === 'COMPRA' ? 'OC' : 'OS'} ${o.numero} — ${o.objeto}` : `Pagamento #${p.ordem_id}`;
    const bruto = num(p.valor_bruto);
    const liquido = num(p.valor_liquido || p.valor_bruto);
    lista.push({
      conta_id: p.conta_id,
      tipo: 'D',
      origem: 'pagamento_tesouraria',
      data: p.data_pagamento,
      descricao,
      valor: liquido,
      valor_bruto: bruto,
      observacao: p.observacao || null,
    });
    // Pagamento antigo não tem controle de recolhimento: as retenções contam como
    // recolhidas na data do pagamento (mantém o saldo que já era exibido)
    if (bruto - liquido > 0.004) {
      lista.push({
        conta_id: p.conta_id,
        tipo: 'D',
        origem: 'retencoes',
        data: p.data_pagamento,
        descricao: `Recolhimento de retenções — ${descricao}`,
        valor: centavos(bruto - liquido),
      });
    }
  }

  // Transferências entre contas: saída na origem e entrada no destino, na mesma data
  if (models.TesTransferencia) {
    const { TesTransferencia, ContaBancaria } = models;
    const tWhere = {};
    if (contaIds) tWhere[Op.or] = [{ conta_origem_id: { [Op.in]: contaIds } }, { conta_destino_id: { [Op.in]: contaIds } }];
    if (de || ate) {
      tWhere.data = {};
      if (de) tWhere.data[Op.gte] = de;
      if (ate) tWhere.data[Op.lte] = ate;
    }
    const transfs = await TesTransferencia.findAll({
      where: tWhere,
      include: [
        { model: ContaBancaria, as: 'origem', attributes: ['nome'], required: false },
        { model: ContaBancaria, as: 'destino', attributes: ['nome'], required: false },
      ],
    }).catch(() => []); // tabela ainda não criada neste município
    const inclui = (id) => !contaIds || contaIds.map(String).includes(String(id));
    for (const inst of transfs) {
      const t = inst.toJSON();
      const base = { origem: 'transferencia', data: t.data, valor: num(t.valor), observacao: t.observacao || null, transferencia_id: t.id };
      if (inclui(t.conta_origem_id)) {
        lista.push({ ...base, conta_id: t.conta_origem_id, tipo: 'D', descricao: `Transferência para ${t.destino?.nome || 'outra conta'}` });
      }
      if (inclui(t.conta_destino_id)) {
        lista.push({ ...base, conta_id: t.conta_destino_id, tipo: 'R', descricao: `Transferência de ${t.origem?.nome || 'outra conta'}` });
      }
    }
  }

  // Ordem cronológica; no mesmo dia, entradas antes das saídas
  return lista.sort((a, b) => String(a.data).localeCompare(String(b.data)) || (a.tipo === 'R' ? -1 : 1));
}

/**
 * O que ainda vai sair das contas: DIDs com conta escolhida e não pagos
 * (comprometido, pelo bruto) e retenções de DIDs pagos ainda não recolhidas.
 * @param ignorarDidId DID em edição — não reserva contra ele mesmo
 * @returns Map conta_id → { comprometido, a_recolher, dids_comprometidos, dids_a_recolher }
 */
async function pendencias(models, { contaIds = null, ignorarDidId = null } = {}) {
  const { Did } = models;
  const base = contaFiltro('conta_pagamento_id', contaIds);
  if (ignorarDidId) base.id = { [Op.ne]: ignorarDidId };

  const [abertos, pagos] = await Promise.all([
    Did.findAll({
      where: { ...base, [Op.or]: [{ pago: { [Op.ne]: 'sim' } }, { pago: null }] },
      attributes: ['id', 'conta_pagamento_id', 'valor_bruto'],
      raw: true,
    }),
    Did.findAll({
      where: { ...base, pago: 'sim', retencoes_recolhidas_em: null },
      attributes: ['id', 'conta_pagamento_id', ...DESCONTOS],
      raw: true,
    }),
  ]);

  const mapa = new Map();
  const de = (id) => {
    if (!mapa.has(id)) mapa.set(id, { comprometido: 0, a_recolher: 0, dids_comprometidos: 0, dids_a_recolher: 0 });
    return mapa.get(id);
  };
  for (const d of abertos) {
    const p = de(d.conta_pagamento_id);
    p.comprometido = centavos(p.comprometido + num(d.valor_bruto));
    p.dids_comprometidos += 1;
  }
  for (const d of pagos) {
    const ret = retencoesDoDid(d);
    if (ret <= 0) continue;
    const p = de(d.conta_pagamento_id);
    p.a_recolher = centavos(p.a_recolher + ret);
    p.dids_a_recolher += 1;
  }
  return mapa;
}

/** Situação de cada conta: saldo atual, comprometido, a recolher e disponível */
async function situacaoContas(models, { contaIds = null, ignorarDidId = null } = {}) {
  const [movs, pend] = await Promise.all([
    movimentos(models, { contaIds }),
    pendencias(models, { contaIds, ignorarDidId }),
  ]);
  const saldo = new Map();
  for (const m of movs) saldo.set(m.conta_id, (saldo.get(m.conta_id) || 0) + (m.tipo === 'R' ? m.valor : -m.valor));

  const ids = new Set([...saldo.keys(), ...pend.keys()]);
  const resultado = new Map();
  for (const id of ids) {
    const s = centavos(saldo.get(id) || 0);
    const p = pend.get(id) || { comprometido: 0, a_recolher: 0, dids_comprometidos: 0, dids_a_recolher: 0 };
    resultado.set(id, { saldo: s, ...p, disponivel: centavos(s - p.comprometido - p.a_recolher) });
  }
  return resultado;
}

module.exports = {
  DESCONTOS,
  retencoesDoDid,
  liquidoDoDid,
  dataPagamentoDoDid,
  movimentos,
  pendencias,
  situacaoContas,
};
