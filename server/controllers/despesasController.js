const { Op } = require('sequelize');
const initializedSchemas = new Set();
const { applyScopeToWhereByName, ensurePermissoes } = require('../utils/scopeFilter');
const { registrarLog } = require('../middleware/activityLogger');
const caixa = require('../services/caixaService');

async function ensureTable(req) {
  const schema = req.tenant?.schema;
  if (!schema || initializedSchemas.has(schema)) return;
  const { TesDespesa } = req.models;
  await TesDespesa.sync({ force: false });
  initializedSchemas.add(schema);
}

const listDespesas = async (req, res) => {
  try {
    await ensureTable(req); // pagamentos antigos (tes_despesas) entram no include
    const { ContratoOrdem, TesDespesa, Contrato, Credor, ContaBancaria, Did, Processo, Secretaria } = req.models;
    const { tipo, pago, data_de, data_ate, busca, secretaria, processo } = req.query;

    const where = {};
    where.status = { [Op.notIn]: ['CANCELADA', 'EXCLUÍDA'] };
    if (tipo && tipo !== 'TODOS') where.tipo = tipo;
    if (secretaria) {
      where.secretaria = { [Op.iLike]: `%${secretaria}%` };
    } else {
      await applyScopeToWhereByName(where, req, 'secretaria', 'tesouraria', 'despesas', 'ver');
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
          attributes: ['id', 'pago', 'valor_bruto', 'desconto_inss', 'desconto_iss', 'desconto_irrf', 'desconto_sindicato', 'desconto_bb', 'desconto_caixa', 'desconto_pensao', 'desconto_outros', 'doc_caixa', 'tesouraria_recebido_em', 'data_pagamento', 'retencoes_recolhidas_em', 'conta_pagamento_id', 'processo_id'],
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

// ── Retenções a recolher ─────────────────────────────────────────────────────
// O DID pago debita só o líquido; as retenções saem da conta quando recolhidas.
// Quem pode registrar: quem edita Despesas na Tesouraria (sem configuração = pode).
const podeRecolher = async (req) => {
  if (req.user.tipo === 'admin' || req.user.tipo === 'jeos') return true;
  await ensurePermissoes(req);
  return req.user.permissoes?.tesouraria?.despesas?.editar !== false;
};

const listRetencoes = async (req, res) => {
  try {
    const { Did, ContaBancaria, Processo } = req.models;
    const recolhidas = req.query.situacao === 'recolhidas';
    const dids = await Did.findAll({
      where: {
        pago: 'sim',
        conta_pagamento_id: { [Op.ne]: null },
        retencoes_recolhidas_em: recolhidas ? { [Op.ne]: null } : null,
      },
      include: [{ model: Processo, as: 'processo', attributes: ['id', 'numero'], required: false }],
      order: [[recolhidas ? 'retencoes_recolhidas_em' : 'data_pagamento', 'DESC']],
      limit: recolhidas ? 300 : undefined,
    });
    const contas = await ContaBancaria.findAll({ attributes: ['id', 'nome'], paranoid: false, raw: true });
    const nomeConta = Object.fromEntries(contas.map(c => [c.id, c.nome]));

    const lista = dids
      .map(i => i.toJSON())
      .map(d => ({
        id: d.id,
        numero_did: d.numero_did,
        processo: d.processo?.numero || null,
        processo_id: d.processo_id,
        credor: d.credor_sec1 || null,
        secretaria: d.secretaria_sec1 || null,
        conta_id: d.conta_pagamento_id,
        conta: nomeConta[d.conta_pagamento_id] || null,
        data_pagamento: caixa.dataPagamentoDoDid(d),
        recolhidas_em: d.retencoes_recolhidas_em,
        valor_bruto: parseFloat(d.valor_bruto || 0),
        inss: parseFloat(d.desconto_inss || 0),
        iss: parseFloat(d.desconto_iss || 0),
        irrf: parseFloat(d.desconto_irrf || 0),
        outros: ['desconto_sindicato', 'desconto_bb', 'desconto_caixa', 'desconto_pensao', 'desconto_outros']
          .reduce((s, k) => s + parseFloat(d[k] || 0), 0),
        total: caixa.retencoesDoDid(d),
      }))
      .filter(r => r.total > 0);

    res.json({ retencoes: lista });
  } catch (err) {
    console.error('listRetencoes:', err);
    res.status(500).json({ error: 'Erro ao listar retenções' });
  }
};

const recolherRetencoes = async (req, res) => {
  try {
    if (!(await podeRecolher(req))) return res.status(403).json({ error: 'Sem permissão para registrar recolhimentos.' });
    const { did_ids, data } = req.body || {};
    if (!Array.isArray(did_ids) || did_ids.length === 0) return res.status(400).json({ error: 'Selecione ao menos um DID.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return res.status(400).json({ error: 'Informe a data do recolhimento.' });

    const { Did } = req.models;
    const [qtd] = await Did.update(
      { retencoes_recolhidas_em: data },
      { where: { id: { [Op.in]: did_ids }, pago: 'sim', retencoes_recolhidas_em: null } }
    );
    await registrarLog(req, {
      acao: 'recolher_retencoes',
      modulo: 'tesouraria',
      descricao: `Registrou o recolhimento das retenções de ${qtd} DID(s) em ${data.split('-').reverse().join('/')}`,
      dados_extras: { did_ids },
    });
    res.json({ recolhidos: qtd });
  } catch (err) {
    console.error('recolherRetencoes:', err);
    res.status(500).json({ error: 'Erro ao registrar recolhimento' });
  }
};

const desfazerRecolhimento = async (req, res) => {
  try {
    if (!(await podeRecolher(req))) return res.status(403).json({ error: 'Sem permissão para desfazer recolhimentos.' });
    const { did_ids } = req.body || {};
    if (!Array.isArray(did_ids) || did_ids.length === 0) return res.status(400).json({ error: 'Selecione ao menos um DID.' });

    const { Did } = req.models;
    const [qtd] = await Did.update(
      { retencoes_recolhidas_em: null },
      { where: { id: { [Op.in]: did_ids }, retencoes_recolhidas_em: { [Op.ne]: null } } }
    );
    await registrarLog(req, {
      acao: 'desfazer_recolhimento_retencoes',
      modulo: 'tesouraria',
      descricao: `Desfez o recolhimento das retenções de ${qtd} DID(s)`,
      dados_extras: { did_ids },
    });
    res.json({ desfeitos: qtd });
  } catch (err) {
    console.error('desfazerRecolhimento:', err);
    res.status(500).json({ error: 'Erro ao desfazer recolhimento' });
  }
};

module.exports = { listDespesas, listRetencoes, recolherRetencoes, desfazerRecolhimento };
