const { Op, fn, col, literal } = require('sequelize');
const { registrarLog } = require('../middleware/activityLogger');
const { registrarExclusao } = require('../services/lixeiraService');
const { applyScopeToWhereByName } = require('../utils/scopeFilter');
const { anexarCota, resumoCotas } = require('../utils/cotasContrato');

// Ordens que não consomem saldo do contrato
const STATUS_SEM_SALDO = ['CANCELADA', 'EXCLUÍDA'];

const notFound = (res, entity) => res.status(404).json({ error: `${entity} não encontrado(a)` });

// Escopo de secretarias da permissão (Contratos › Ordem de Serviço/Compra): "Só sua sec."
// vê e mexe só nas ordens da própria secretaria (campo texto ContratoOrdem.secretaria)
const escopoOrdens = async (req, acao) => {
  const where = {};
  await applyScopeToWhereByName(where, req, 'secretaria', 'contratos', 'ordens', acao);
  return where;
};
const ordemNoEscopo = async (req, ordem, acao) => {
  const escopo = await escopoOrdens(req, acao);
  if (!Object.keys(escopo).length) return true;
  return (await req.models.ContratoOrdem.count({ where: { ...escopo, id: ordem.id } })) > 0;
};
const secretariaNoEscopo = async (req, nome, acao) => {
  const escopo = await escopoOrdens(req, acao);
  if (!Object.keys(escopo).length) return true;
  const { Op: O } = require('sequelize');
  const cond = escopo.secretaria;
  const alvo = String(nome || '').trim().toLowerCase();
  if (cond?.[O.iLike] !== undefined) return alvo === String(cond[O.iLike]).trim().toLowerCase();
  if (Array.isArray(cond?.[O.in])) return cond[O.in].some(n => String(n).trim().toLowerCase() === alvo);
  return false;
};
const SEM_ACESSO_SECRETARIA = 'Esta ordem é de outra secretaria — você só tem acesso às ordens da sua secretaria.';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Gera próximo número de ordem: OC 001/2026 ou OS 001/2026 */
const gerarNumeroOrdem = async (ContratoOrdem, tipo) => {
  const ano = new Date().getFullYear();
  const prefixo = tipo === 'COMPRA' ? 'OC' : 'OS';
  const count = await ContratoOrdem.count({
    where: {
      tipo,
      created_at: { [Op.gte]: new Date(`${ano}-01-01`) },
    },
  });
  return `${prefixo} ${String(count + 1).padStart(3, '0')}/${ano}`;
};

/** Campos obrigatórios da ordem (rótulos exibidos ao usuário) */
const vazio = (v) => v === undefined || v === null || String(v).trim() === '';
const CAMPOS_OBRIGATORIOS_ORDEM = [
  ['tipo',                  () => 'Tipo de ordem'],
  ['contrato_id',           () => 'Contrato'],
  ['data_emissao',          () => 'Data de emissão'],
  ['data_entrega_prevista', (b) => b.tipo === 'SERVICO' ? 'Data de conclusão prevista' : 'Data de entrega prevista'],
  ['objeto',                () => 'Objeto / descrição'],
];

/**
 * Lista os campos obrigatórios ausentes.
 * parcial=true (edição): só valida os campos enviados no corpo.
 */
const camposFaltandoOrdem = (body, itens, { parcial = false, tipoAtual } = {}) => {
  const tipo = body.tipo ?? tipoAtual;
  const faltando = [];
  for (const [campo, rotulo] of CAMPOS_OBRIGATORIOS_ORDEM) {
    if (parcial && !(campo in body)) continue;
    if (vazio(body[campo])) faltando.push(rotulo({ ...body, tipo }));
  }
  if (tipo === 'SERVICO' && (!parcial || 'destino_did' in body) && vazio(body.destino_did)) {
    faltando.push('Destino da ordem (Conta Fixa ou Conta Variável)');
  }
  if (itens !== undefined) {
    if (!Array.isArray(itens) || itens.length === 0) faltando.push('Ao menos um item');
    else if (itens.some(it => vazio(it.descricao))) faltando.push('Descrição de todos os itens');
  }
  return faltando;
};

const respostaCamposFaltando = (res, faltando) => res.status(400).json({
  error: `Preencha os campos obrigatórios: ${faltando.join(', ')}.`,
  campos_faltando: faltando,
});

/**
 * Quanto cada item já saiu da cota (unidade/dotação) em ordens que consomem saldo:
 * { [item_id]: quantidade }. ignorarOrdemId: a própria ordem, na edição.
 */
const usoDaCota = async (models, contratoId, cotaId, ignorarOrdemId = null) => {
  const where = { contrato_id: contratoId, cota_id: cotaId, status: { [Op.notIn]: STATUS_SEM_SALDO } };
  if (ignorarOrdemId) where.id = { [Op.ne]: ignorarOrdemId };
  const ordens = await models.ContratoOrdem.findAll({ where, attributes: ['id'], raw: true });
  if (!ordens.length) return {};
  const usos = await models.ContratoOrdemItem.findAll({
    attributes: ['item_id', [fn('SUM', col('quantidade')), 'qtd_usada']],
    where: { ordem_id: { [Op.in]: ordens.map(o => o.id) } },
    group: ['item_id'],
    raw: true,
  });
  return Object.fromEntries(usos.map(u => [u.item_id, parseFloat(u.qtd_usada || 0)]));
};

/**
 * Contrato com cotas: a ordem tem de dizer de qual cota sai, e cada item não pode passar
 * o saldo daquela cota. Devolve a mensagem de erro, ou null.
 */
const conferirCotaDaOrdem = async (models, contrato, cotaId, itens, ignorarOrdemId = null) => {
  const cotas = Array.isArray(contrato?.cotas) ? contrato.cotas : [];
  if (!cotas.length) return null;
  const cota = cotas.find(c => c.id === cotaId);
  if (!cota) return 'Escolha a cota (unidade/dotação) de onde a ordem sai.';
  const vinculos = await models.ContratoItemVinculo.findAll({ where: { contrato_id: contrato.id }, attributes: ['item_id', 'descricao', 'cotas_qtd'], raw: true });
  const uso = await usoDaCota(models, contrato.id, cotaId, ignorarOrdemId);
  const pedido = {};
  (Array.isArray(itens) ? itens : []).forEach(it => {
    if (it.item_id) pedido[it.item_id] = (pedido[it.item_id] || 0) + parseFloat(it.quantidade || 1);
  });
  for (const [itemId, qtd] of Object.entries(pedido)) {
    const v = vinculos.find(x => String(x.item_id) === String(itemId));
    if (!v) continue;
    const disponivel = parseFloat(v.cotas_qtd?.[cotaId] || 0) - (uso[itemId] || 0);
    if (qtd > disponivel + 1e-9) {
      return `Saldo da cota ${cota.nome} insuficiente para "${String(v.descricao || '').slice(0, 60)}": disponível ${Math.max(0, disponivel)}, pedido ${qtd}.`;
    }
  }
  return null;
};

/** Calcula saldo disponível de um contrato */
const calcularSaldo = async (ContratoOrdem, contrato_id, ignorarOrdemId = null) => {
  const { Contrato } = global._tmpModels || {};
  // Soma das ordens não canceladas nem excluídas
  const where = {
    contrato_id,
    status: { [Op.notIn]: STATUS_SEM_SALDO },
  };
  if (ignorarOrdemId) where.id = { [Op.ne]: ignorarOrdemId };

  const result = await ContratoOrdem.findOne({
    attributes: [[fn('SUM', col('valor_total')), 'total_usado']],
    where,
    raw: true,
  });
  return parseFloat(result?.total_usado || 0);
};

// ── LIST ─────────────────────────────────────────────────────────────────────

const listOrdens = async (req, res) => {
  try {
    const { ContratoOrdem, ContratoOrdemItem, Contrato, Credor } = req.models;
    const { tipo, status, contrato_id, q } = req.query;

    const where = {};
    if (tipo)        where.tipo = tipo;
    where.status = status || { [Op.ne]: 'EXCLUÍDA' };
    if (contrato_id) where.contrato_id = contrato_id;
    if (q) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${q}%` } },
        { objeto:  { [Op.iLike]: `%${q}%` } },
      ];
    }

    Object.assign(where, await escopoOrdens(req, 'ver'));

    const ordens = await ContratoOrdem.findAll({
      where,
      include: [
        {
          model: Contrato,
          as: 'contrato',
          attributes: ['id', 'numero_contrato', 'objeto', 'valor', 'status'],
          include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf'] }],
        },
        { model: ContratoOrdemItem, as: 'itens' },
      ],
      order: [['created_at', 'DESC']],
    });
    // Contrato com cotas: de qual cota (unidade/dotação) cada ordem saiu
    await anexarCota(req.models, ordens);

    // Calcular saldo de cada contrato associado
    const contratosVistos = new Map();
    for (const o of ordens) {
      const cid = o.contrato_id;
      if (!contratosVistos.has(cid)) {
        const totalUsado = await calcularSaldo(ContratoOrdem, cid);
        const valorContrato = parseFloat(o.contrato?.valor || 0);
        contratosVistos.set(cid, {
          valor_contrato: valorContrato,
          total_usado: totalUsado,
          saldo: valorContrato - totalUsado,
        });
      }
      o.dataValues.saldo_info = contratosVistos.get(cid);
    }

    // Marcar ordens vinculadas a DIDs e incluir número do processo
    try {
      const { Did, Processo } = req.models;
      const idsOrdens = ordens.map(o => o.id);
      if (idsOrdens.length > 0) {
        const didsVinculados = await Did.findAll({
          attributes: ['ordem_compra_id', 'processo_id'],
          where: { ordem_compra_id: { [Op.in]: idsOrdens } },
          include: [{ model: Processo, as: 'processo', attributes: ['id', 'numero'] }],
        });
        const vinculadosMap = new Map(
          didsVinculados.map(d => [d.ordem_compra_id, d.processo?.numero || null])
        );
        ordens.forEach(o => {
          o.dataValues.did_vinculado = vinculadosMap.has(o.id);
          o.dataValues.numero_processo_vinculado = vinculadosMap.get(o.id) || null;
        });
      }
    } catch (_) {
      // Silencia se coluna ainda não existe
    }

    res.json(ordens);
  } catch (err) {
    console.error('listOrdens:', err);
    res.status(500).json({ error: 'Erro ao listar ordens' });
  }
};

// ── SALDO de um contrato ──────────────────────────────────────────────────────

const getSaldoContrato = async (req, res) => {
  try {
    const { ContratoOrdem, Contrato } = req.models;
    const { contrato_id } = req.params;

    const contrato = await Contrato.findByPk(contrato_id, {
      attributes: ['id', 'numero_contrato', 'objeto', 'valor', 'status', 'cotas'],
    });
    if (!contrato) return notFound(res, 'Contrato');

    const totalUsado = await calcularSaldo(ContratoOrdem, contrato_id);
    const valorContrato = parseFloat(contrato.valor || 0);
    const saldo = valorContrato - totalUsado;

    res.json({
      contrato_id: parseInt(contrato_id),
      valor_contrato: valorContrato,
      total_usado: totalUsado,
      saldo,
      percentual_usado: valorContrato > 0 ? (totalUsado / valorContrato) * 100 : 0,
      alerta_baixo: valorContrato > 0 && saldo < valorContrato * 0.1,
      sem_saldo: saldo <= 0,
      // Contrato com cotas: saldo de cada uma (valor e quantidade por item)
      cotas: await resumoCotas(req.models, contrato),
    });
  } catch (err) {
    console.error('getSaldoContrato:', err);
    res.status(500).json({ error: 'Erro ao calcular saldo' });
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────

const createOrdem = async (req, res) => {
  try {
    const { ContratoOrdem, ContratoOrdemItem, Contrato } = req.models;
    const { itens = [], ...body } = req.body;
    const faltando = camposFaltandoOrdem(body, itens);
    if (faltando.length > 0) return respostaCamposFaltando(res, faltando);
    if (!(await secretariaNoEscopo(req, body.secretaria, 'criar'))) {
      return res.status(403).json({ error: 'Você só pode emitir ordens para a sua secretaria.' });
    }

    // Verificar contrato
    const contrato = await Contrato.findByPk(body.contrato_id);
    if (!contrato) return notFound(res, 'Contrato');
    if (contrato.status === 'CONCLUÍDO') return res.status(400).json({ error: 'Contrato concluído não recebe novas ordens.' });
    const erroCota = await conferirCotaDaOrdem(req.models, contrato, body.cota_id, itens);
    if (erroCota) return res.status(422).json({ error: erroCota });
    if (!(contrato.cotas || []).length) body.cota_id = null;

    // Calcular valor total da nova ordem
    const valorOrdem = itens.reduce((acc, it) => {
      return acc + (parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 1));
    }, 0);

    // Verificar saldo
    const totalUsado = await calcularSaldo(ContratoOrdem, body.contrato_id);
    const valorContrato = parseFloat(contrato.valor || 0);
    const saldo = valorContrato - totalUsado;

    if (valorContrato > 0 && valorOrdem > saldo) {
      return res.status(422).json({
        error: 'Saldo insuficiente no contrato',
        saldo_disponivel: saldo,
        valor_ordem: valorOrdem,
      });
    }

    // Gerar número
    const numero = body.numero || await gerarNumeroOrdem(ContratoOrdem, body.tipo);

    // Criar ordem
    const ordem = await ContratoOrdem.create({ ...body, numero, valor_total: valorOrdem });

    // Criar itens
    if (itens.length > 0) {
      const itensData = itens.map((it, idx) => ({
        ordem_id: ordem.id,
        item_id: it.item_id || null,
        descricao: it.descricao,
        unidade: it.unidade || '',
        lote: it.lote || null,
        codigo_item: it.codigo_item || null,
        quantidade: parseFloat(it.quantidade || 1),
        valor_unitario: parseFloat(it.valor_unitario || 0),
        valor_total: parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 1),
        ordem: idx,
      }));
      await ContratoOrdemItem.bulkCreate(itensData);
    }

    const ordemCompleta = await ContratoOrdem.findByPk(ordem.id, {
      include: [{ model: ContratoOrdemItem, as: 'itens' }],
    });

    await registrarLog(req, {
      acao: 'criar_ordem',
      modulo: 'contratos',
      descricao: `Fez uma ordem de ${ordem.tipo === 'COMPRA' ? 'compra' : 'serviço'} (${numero}) — contrato ${contrato.numero_contrato || contrato.id}`,
      referencia_id: ordem.id,
      referencia_numero: numero
    });

    res.status(201).json(ordemCompleta);
  } catch (err) {
    console.error('createOrdem:', err);
    res.status(500).json({ error: 'Erro ao criar ordem' });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────

const updateOrdem = async (req, res) => {
  try {
    const { ContratoOrdem, ContratoOrdemItem, Contrato } = req.models;
    const { itens, ...body } = req.body;

    const ordem = await ContratoOrdem.findByPk(req.params.id);
    if (!ordem) return notFound(res, 'Ordem');
    if (!(await ordemNoEscopo(req, ordem, 'editar'))) return res.status(403).json({ error: SEM_ACESSO_SECRETARIA });
    if (body.secretaria !== undefined && !(await secretariaNoEscopo(req, body.secretaria, 'editar'))) {
      return res.status(403).json({ error: 'Você só pode deixar a ordem na sua secretaria.' });
    }

    const faltando = camposFaltandoOrdem(body, itens, { parcial: true, tipoAtual: ordem.tipo });
    if (faltando.length > 0) return respostaCamposFaltando(res, faltando);

    const contrato = await Contrato.findByPk(ordem.contrato_id);
    const valorContrato = parseFloat(contrato?.valor || 0);

    // Contrato com cotas: confere a cota (trocada ou não) contra os itens da ordem
    if (contrato && (itens !== undefined || body.cota_id !== undefined)) {
      const cotaId = body.cota_id !== undefined ? body.cota_id : ordem.cota_id;
      const itensConferir = itens !== undefined
        ? itens
        : await ContratoOrdemItem.findAll({ where: { ordem_id: ordem.id }, attributes: ['item_id', 'quantidade'], raw: true });
      const erroCota = await conferirCotaDaOrdem(req.models, contrato, cotaId, itensConferir, ordem.id);
      if (erroCota) return res.status(422).json({ error: erroCota });
    }

    // Recalcular valor se itens foram enviados
    let valorOrdem = parseFloat(ordem.valor_total || 0);
    if (itens) {
      valorOrdem = itens.reduce((acc, it) => {
        return acc + (parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 1));
      }, 0);

      // Verificar saldo (excluindo a própria ordem)
      const totalUsado = await calcularSaldo(ContratoOrdem, ordem.contrato_id, ordem.id);
      const saldo = valorContrato - totalUsado;
      if (valorContrato > 0 && valorOrdem > saldo) {
        return res.status(422).json({
          error: 'Saldo insuficiente no contrato',
          saldo_disponivel: saldo,
          valor_ordem: valorOrdem,
        });
      }

      // Recriar itens
      await ContratoOrdemItem.destroy({ where: { ordem_id: ordem.id } });
      if (itens.length > 0) {
        const itensData = itens.map((it, idx) => ({
          ordem_id: ordem.id,
          item_id: it.item_id || null,
          descricao: it.descricao,
          unidade: it.unidade || '',
          lote: it.lote || null,
          codigo_item: it.codigo_item || null,
          quantidade: parseFloat(it.quantidade || 1),
          valor_unitario: parseFloat(it.valor_unitario || 0),
          valor_total: parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 1),
          ordem: idx,
        }));
        await ContratoOrdemItem.bulkCreate(itensData);
      }
    }

    await ordem.update({ ...body, valor_total: valorOrdem });

    const ordemCompleta = await ContratoOrdem.findByPk(ordem.id, {
      include: [{ model: ContratoOrdemItem, as: 'itens' }],
    });
    res.json(ordemCompleta);
  } catch (err) {
    console.error('updateOrdem:', err);
    res.status(500).json({ error: 'Erro ao atualizar ordem' });
  }
};

// ── DELETE (cancelar) ─────────────────────────────────────────────────────────

const deleteOrdem = async (req, res) => {
  try {
    const { ContratoOrdem, Did, AlmoxLote } = req.models;
    const ordem = await ContratoOrdem.findByPk(req.params.id);
    if (!ordem) return notFound(res, 'Ordem');
    if (!(await ordemNoEscopo(req, ordem, 'excluir'))) return res.status(403).json({ error: SEM_ACESSO_SECRETARIA });

    if (Did) {
      const totalDids = await Did.count({ where: { ordem_compra_id: ordem.id } });
      if (totalDids > 0) {
        return res.status(409).json({
          error: `Esta ordem está vinculada a ${totalDids} DID(s). Exclua o(s) DID(s) primeiro.`
        });
      }
    }
    if (AlmoxLote) {
      const totalLotes = await AlmoxLote.count({ where: { ordem_id: ordem.id, ativo: true } });
      if (totalLotes > 0) {
        return res.status(409).json({
          error: 'Esta ordem já possui material recebido no almoxarifado. Reverta a entrada de estoque antes de cancelar.'
        });
      }
    }

    await ordem.update({ status: 'CANCELADA' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteOrdem:', err);
    res.status(500).json({ error: 'Erro ao cancelar ordem' });
  }
};

// ── EXCLUIR DEFINITIVAMENTE (apenas ordens já canceladas, apenas admin) ───────

const excluirOrdemDefinitivo = async (req, res) => {
  try {
    if (req.user?.tipo !== 'admin' && req.user?.tipo !== 'jeos') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir definitivamente uma ordem.' });
    }

    const { ContratoOrdem, ContratoOrdemItem, Did, AlmoxLote, TesDespesa } = req.models;
    const ordem = await ContratoOrdem.findByPk(req.params.id);
    if (!ordem) return notFound(res, 'Ordem');

    if (ordem.status !== 'CANCELADA') {
      return res.status(400).json({ error: 'Apenas ordens já canceladas podem ser excluídas definitivamente.' });
    }

    if (Did) {
      const totalDids = await Did.count({ where: { ordem_compra_id: ordem.id } });
      if (totalDids > 0) {
        return res.status(409).json({
          error: `Esta ordem está vinculada a ${totalDids} DID(s). Exclua o(s) DID(s) primeiro.`
        });
      }
    }
    if (AlmoxLote) {
      const totalLotes = await AlmoxLote.count({ where: { ordem_id: ordem.id, ativo: true } });
      if (totalLotes > 0) {
        return res.status(409).json({
          error: 'Esta ordem já possui material recebido no almoxarifado. Reverta a entrada de estoque primeiro.'
        });
      }
    }
    if (TesDespesa) {
      const totalPagamentos = await TesDespesa.count({ where: { ordem_id: ordem.id } });
      if (totalPagamentos > 0) {
        return res.status(409).json({
          error: 'Esta ordem possui um pagamento vinculado na Tesouraria. Remova o pagamento primeiro.'
        });
      }
    }

    // Itens ficam com a ordem: vão para a lixeira e só somem se o admin apagar de vez
    await registrarExclusao(req, 'ordens', ordem);
    await ordem.update({ status: 'EXCLUÍDA' });

    await registrarLog(req, {
      acao: 'excluir_ordem',
      modulo: 'contratos',
      descricao: `Excluiu a ordem cancelada ${ordem.numero}`,
      referencia_id: ordem.id,
      referencia_numero: ordem.numero
    });

    res.json({ success: true });
  } catch (err) {
    console.error('excluirOrdemDefinitivo:', err);
    res.status(500).json({ error: 'Erro ao excluir ordem' });
  }
};

// ── ITENS DO CONTRATO com uso ─────────────────────────────────────────────────

const getItensContrato = async (req, res) => {
  try {
    const { ContratoOrdem, ContratoOrdemItem, ContratoItemVinculo, ContratoItem } = req.models;
    const { contrato_id } = req.params;
    // Contrato com cotas: ?cota_id= dá o saldo daquela cota (unidade/dotação)
    const cotaId = req.query.cota_id ? String(req.query.cota_id) : null;

    // Busca os vínculos do contrato (itens contratados com qtd e preço)
    const vinculos = await ContratoItemVinculo.findAll({
      where: { contrato_id },
      include: [{ model: ContratoItem, as: 'catalogo', attributes: ['id', 'codigo', 'descricao', 'categoria', 'unidade_medida'], required: false }],
      order: [['ordem', 'ASC'], ['id', 'ASC']],
    });

    // Para cada vínculo, soma qtd já usada em ordens não canceladas deste contrato
    const ordens = await ContratoOrdem.findAll({
      where: { contrato_id, status: { [Op.notIn]: STATUS_SEM_SALDO }, ...(cotaId ? { cota_id: cotaId } : {}) },
      attributes: ['id'],
      raw: true,
    });
    const ordemIds = ordens.map(o => o.id);

    let usoPorItem = {};
    if (ordemIds.length > 0) {
      const usos = await ContratoOrdemItem.findAll({
        attributes: ['item_id', [fn('SUM', col('quantidade')), 'qtd_usada']],
        where: { ordem_id: { [Op.in]: ordemIds } },
        group: ['item_id'],
        raw: true,
      });
      usos.forEach(u => { usoPorItem[u.item_id] = parseFloat(u.qtd_usada || 0); });
    }

    const resultado = vinculos.map(v => {
      const qtd_contratada = cotaId ? parseFloat(v.cotas_qtd?.[cotaId] || 0) : parseFloat(v.quantidade || 0);
      const qtd_usada = usoPorItem[v.item_id] || 0;
      const qtd_disponivel = Math.max(0, qtd_contratada - qtd_usada);
      return {
        id: v.id,
        item_id: v.item_id,
        descricao: v.descricao || v.catalogo?.descricao || '',
        unidade: v.unidade || v.catalogo?.unidade_medida || '',
        valor_unitario: parseFloat(v.valor_unitario || 0),
        // Item distribuído por setor: valor_unitario já é a média mensal
        distribuicao: v.distribuicao || null,
        valor_unitario_base: v.valor_unitario_base != null ? parseFloat(v.valor_unitario_base) : null,
        cotas_qtd: v.cotas_qtd || null,
        qtd_contratada,
        qtd_usada,
        qtd_disponivel,
        percentual_uso: qtd_contratada > 0 ? Math.min(100, (qtd_usada / qtd_contratada) * 100) : 0,
        esgotado: qtd_disponivel <= 0,
      };
    });

    res.json(resultado);
  } catch (err) {
    console.error('getItensContrato:', err);
    res.status(500).json({ error: 'Erro ao buscar itens do contrato' });
  }
};

// ── ORDENS DISPONÍVEIS PARA DID ───────────────────────────────────────────────
// Retorna ordens com status EMITIDA que ainda não foram vinculadas a nenhum DID,
// filtradas pela secretaria do usuário logado (exceto admin/jeos que veem todas).

const listOrdemDisponivelDid = async (req, res) => {
  try {
    const { ContratoOrdem, ContratoOrdemItem, Contrato, Credor, Did, Secretaria } = req.models;
    const { q, destino } = req.query;

    // IDs de ordens já vinculadas a algum DID (coluna pode não existir em bancos antigos)
    let idsVinculados = [];
    try {
      const vinculadas = await Did.findAll({
        where: { ordem_compra_id: { [Op.not]: null } },
        attributes: ['ordem_compra_id'],
        raw: true,
      });
      idsVinculados = vinculadas.map(d => d.ordem_compra_id).filter(Boolean);
    } catch (_) { /* coluna ainda não existe — ignora */ }

    const where = { status: 'EMITIDA' };
    if (idsVinculados.length > 0) {
      where.id = { [Op.notIn]: idsVinculados };
    }

    // Condições combinadas com AND (destino, secretaria, busca)
    const andConds = [];

    // Filtro por destino do DID (Opção A: OS legadas sem destino aparecem nos dois)
    // - fixas:     só Ordens de Serviço marcadas como FIXA (ou sem marcação)
    // - variaveis: todas as OCs + OSs marcadas como VARIAVEL (ou sem marcação)
    if (destino === 'fixas') {
      andConds.push({ tipo: 'SERVICO' });
      andConds.push({ [Op.or]: [{ destino_did: 'FIXA' }, { destino_did: { [Op.is]: null } }] });
    } else if (destino === 'variaveis') {
      andConds.push({
        [Op.or]: [
          { tipo: 'COMPRA' },
          {
            tipo: 'SERVICO',
            [Op.or]: [{ destino_did: 'VARIAVEL' }, { destino_did: { [Op.is]: null } }],
          },
        ],
      });
    }

    // Usuários não-admin/jeos só veem ordens da própria secretaria
    const userTipo = req.user?.tipo;
    if (userTipo !== 'admin' && userTipo !== 'jeos') {
      const secretariaId = req.user?.secretariaId;
      if (secretariaId && Secretaria) {
        // Busca nome e sigla da secretaria para comparar com o campo texto das ordens
        const sec = await Secretaria.findByPk(secretariaId, { attributes: ['nome', 'sigla'], raw: true });
        if (sec) {
          const filtros = [];
          if (sec.nome)  filtros.push({ secretaria: { [Op.iLike]: `%${sec.nome}%`  } });
          if (sec.sigla) filtros.push({ secretaria: { [Op.iLike]: `%${sec.sigla}%` } });
          if (filtros.length > 0) {
            andConds.push({ [Op.or]: filtros });
          }
        }
      } else if (req.user?.secretariaNome) {
        // Fallback: usar nome do JWT quando Secretaria model não disponível
        where.secretaria = { [Op.iLike]: `%${req.user.secretariaNome}%` };
      }
    }

    if (q) {
      const qLike = `%${q}%`;
      andConds.push({ [Op.or]: [{ numero: { [Op.iLike]: qLike } }, { objeto: { [Op.iLike]: qLike } }] });
    }

    if (andConds.length > 0) where[Op.and] = andConds;

    const ordens = await ContratoOrdem.findAll({
      where,
      include: [
        {
          model: Contrato,
          as: 'contrato',
          attributes: ['id', 'numero_contrato', 'objeto', 'valor', 'status', 'modalidade', 'numero_licitacao', 'banco', 'agencia', 'conta', 'fontes_recurso'],
          include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf'] }],
        },
        { model: ContratoOrdemItem, as: 'itens' },
      ],
      order: [['created_at', 'DESC']],
    });

    await anexarCota(req.models, ordens);
    res.json(ordens);
  } catch (err) {
    console.error('listOrdemDisponivelDid:', err);
    res.status(500).json({ error: 'Erro ao listar ordens disponíveis para DID' });
  }
};

module.exports = { listOrdens, listOrdemDisponivelDid, getSaldoContrato, getItensContrato, createOrdem, updateOrdem, deleteOrdem, excluirOrdemDefinitivo };
