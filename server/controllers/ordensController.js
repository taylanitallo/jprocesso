const { Op, fn, col, literal } = require('sequelize');

const notFound = (res, entity) => res.status(404).json({ error: `${entity} não encontrado(a)` });

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

/** Calcula saldo disponível de um contrato */
const calcularSaldo = async (ContratoOrdem, contrato_id, ignorarOrdemId = null) => {
  const { Contrato } = global._tmpModels || {};
  // Soma das ordens não canceladas
  const where = {
    contrato_id,
    status: { [Op.ne]: 'CANCELADA' },
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
    if (status)      where.status = status;
    if (contrato_id) where.contrato_id = contrato_id;
    if (q) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${q}%` } },
        { objeto:  { [Op.iLike]: `%${q}%` } },
      ];
    }

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
      attributes: ['id', 'numero_contrato', 'objeto', 'valor', 'status'],
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

    // Verificar contrato
    const contrato = await Contrato.findByPk(body.contrato_id);
    if (!contrato) return notFound(res, 'Contrato');

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

    const contrato = await Contrato.findByPk(ordem.contrato_id);
    const valorContrato = parseFloat(contrato?.valor || 0);

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
    const { ContratoOrdem } = req.models;
    const ordem = await ContratoOrdem.findByPk(req.params.id);
    if (!ordem) return notFound(res, 'Ordem');
    await ordem.update({ status: 'CANCELADA' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteOrdem:', err);
    res.status(500).json({ error: 'Erro ao cancelar ordem' });
  }
};

// ── ITENS DO CONTRATO com uso ─────────────────────────────────────────────────

const getItensContrato = async (req, res) => {
  try {
    const { ContratoOrdem, ContratoOrdemItem, ContratoItemVinculo, ContratoItem } = req.models;
    const { contrato_id } = req.params;

    // Busca os vínculos do contrato (itens contratados com qtd e preço)
    const vinculos = await ContratoItemVinculo.findAll({
      where: { contrato_id },
      include: [{ model: ContratoItem, as: 'catalogo', attributes: ['id', 'codigo', 'descricao', 'categoria', 'unidade_medida'], required: false }],
      order: [['ordem', 'ASC'], ['id', 'ASC']],
    });

    // Para cada vínculo, soma qtd já usada em ordens não canceladas deste contrato
    const ordens = await ContratoOrdem.findAll({
      where: { contrato_id, status: { [Op.ne]: 'CANCELADA' } },
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
      const qtd_contratada = parseFloat(v.quantidade || 0);
      const qtd_usada = usoPorItem[v.item_id] || 0;
      const qtd_disponivel = Math.max(0, qtd_contratada - qtd_usada);
      return {
        id: v.id,
        item_id: v.item_id,
        descricao: v.descricao || v.catalogo?.descricao || '',
        unidade: v.unidade || v.catalogo?.unidade_medida || '',
        valor_unitario: parseFloat(v.valor_unitario || 0),
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
    const { q } = req.query;

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
            where[Op.or] = filtros;
          }
        }
      } else if (req.user?.secretariaNome) {
        // Fallback: usar nome do JWT quando Secretaria model não disponível
        where.secretaria = { [Op.iLike]: `%${req.user.secretariaNome}%` };
      }
    }

    if (q) {
      const qLike = `%${q}%`;
      // Só substitui o Op.or se não houver filtro de secretaria (senão usa Op.and)
      if (where[Op.or]) {
        where[Op.and] = [
          { [Op.or]: where[Op.or] },
          { [Op.or]: [{ numero: { [Op.iLike]: qLike } }, { objeto: { [Op.iLike]: qLike } }] },
        ];
        delete where[Op.or];
      } else {
        where[Op.or] = [
          { numero: { [Op.iLike]: qLike } },
          { objeto:  { [Op.iLike]: qLike } },
        ];
      }
    }

    const ordens = await ContratoOrdem.findAll({
      where,
      include: [
        {
          model: Contrato,
          as: 'contrato',
          attributes: ['id', 'numero_contrato', 'objeto', 'valor', 'status', 'modalidade', 'numero_licitacao'],
          include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf'] }],
        },
        { model: ContratoOrdemItem, as: 'itens' },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(ordens);
  } catch (err) {
    console.error('listOrdemDisponivelDid:', err);
    res.status(500).json({ error: 'Erro ao listar ordens disponíveis para DID' });
  }
};

module.exports = { listOrdens, listOrdemDisponivelDid, getSaldoContrato, getItensContrato, createOrdem, updateOrdem, deleteOrdem };
