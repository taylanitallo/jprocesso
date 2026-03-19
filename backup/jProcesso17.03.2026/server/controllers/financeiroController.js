const { Op, fn, col, literal } = require('sequelize');

const initializedSchemas = new Set();

async function ensureTables(req) {
  const schema = req.tenant.schema;
  if (initializedSchemas.has(schema)) return;
  const { FinanceiroLancamento } = req.models;
  await FinanceiroLancamento.sync({ force: false });
  initializedSchemas.add(schema);
}

// ============================================================
// DASHBOARD / PAINEL
// ============================================================
const getDashboard = async (req, res) => {
  try {
    await ensureTables(req);
    const { FinanceiroLancamento, Processo, Setor, User, Did } = req.models;
    const {
      ano = new Date().getFullYear(),
      // novos filtros DID — valores podem vir como string separada por vírgula ou array
      meses_ref,      // ex: '01,03' ou ['01','03']
      data_inicio,    // data pagamento início
      data_fim,       // data pagamento fim
      status,         // 'pago' | 'pendente' | 'todos'
      secretarias,    // ex: 'Sec. Educação,Sec. Saúde'
      credores,
      fontes,
      tipos           // 'fixas' | 'variaveis'
    } = req.query;

    // ── Helpers de parse de listas ────────────────────────────────────────
    const parseList = v => {
      if (!v) return [];
      return (Array.isArray(v) ? v : String(v).split(','))
        .map(s => s.trim()).filter(Boolean);
    };
    const mesesRefList   = parseList(meses_ref);
    const secretariaList = parseList(secretarias);
    const credorList     = parseList(credores);
    const fonteList      = parseList(fontes);
    const tipoList       = parseList(tipos);

    // ── Filtro base para DIDs ──────────────────────────────────────────────
    const didFiltro = {};

    // Intervalo de data_did pelo ano selecionado
    didFiltro.data_did = { [Op.between]: [`${ano}-01-01`, `${ano}-12-31`] };

    // Intervalo de data de pagamento (tesouraria)
    if (data_inicio || data_fim) {
      const ini = data_inicio || `${ano}-01-01`;
      const fim = data_fim   || `${ano}-12-31`;
      didFiltro.data_did = { [Op.between]: [ini, fim] };
    }

    // Mês de referência (campo mes_referencia)
    if (mesesRefList.length > 0) {
      didFiltro.mes_referencia = { [Op.in]: mesesRefList };
    }

    // Status de pagamento
    if (status && status !== 'todos') {
      didFiltro.pago = status === 'pago' ? 'sim' : { [Op.or]: ['nao', null] };
    }

    // Secretaria
    if (secretariaList.length > 0) {
      didFiltro.secretaria_sec1 = { [Op.in]: secretariaList };
    }

    // Credor
    if (credorList.length > 0) {
      didFiltro.credor_sec1 = { [Op.in]: credorList };
    }

    // Fonte de recurso
    if (fonteList.length > 0) {
      didFiltro.fonte_recurso = { [Op.in]: fonteList };
    }

    // Tipo
    if (tipoList.length > 0) {
      didFiltro.tipo_did = { [Op.in]: tipoList };
    }

    // ── Filtro base para FinanceiroLancamento (mantido) ───────────────────
    const whereBase = {};
    whereBase.data_lancamento = { [Op.between]: [`${ano}-01-01`, `${ano}-12-31`] };

    // Totais gerais (lançamentos)
    const totalLancamentos = await FinanceiroLancamento.count({ where: whereBase });

    const somaTotal = await FinanceiroLancamento.sum('valor', {
      where: { ...whereBase, status: { [Op.not]: 'cancelado' } }
    }) || 0;

    const somaPago = await FinanceiroLancamento.sum('valor', {
      where: { ...whereBase, status: 'pago' }
    }) || 0;

    const somaPendente = await FinanceiroLancamento.sum('valor', {
      where: { ...whereBase, status: 'pendente' }
    }) || 0;

    const somaVencido = await FinanceiroLancamento.sum('valor', {
      where: { ...whereBase, status: 'vencido' }
    }) || 0;

    // Contagem de processos DID vinculados no período
    const totalProcessosDid = await Processo.count({
      where: { tipo_processo: 'Did', data_abertura: { [Op.between]: [`${ano}-01-01T00:00:00`, `${ano}-12-31T23:59:59`] } }
    });

    // ── Estatísticas dos DIDs (com filtro completo) ───────────────────────
    const didFiltroAno = didFiltro; // alias legível

    // contagens fixas/variáveis respeitam o filtro de tipo se não especificado
    const filtroFixas     = tipoList.length > 0 ? didFiltroAno : { ...didFiltroAno, tipo_did: 'fixas' };
    const filtroVariaveis = tipoList.length > 0 ? didFiltroAno : { ...didFiltroAno, tipo_did: 'variaveis' };

    const [totalDidsFixas, totalDidsVariaveis, somaDidBruto, somaDidPago, somaDidPendente, ultimosDids] = await Promise.all([
      Did.count({ where: filtroFixas }),
      Did.count({ where: filtroVariaveis }),
      Did.sum('valor_bruto', { where: didFiltroAno }),
      Did.sum('valor_bruto', { where: { ...didFiltroAno, pago: 'sim' } }),
      Did.sum('valor_bruto', { where: { ...didFiltroAno, [Op.or]: [{ pago: 'nao' }, { pago: null }] } }),
      Did.findAll({
        where: didFiltroAno,
        include: [{ model: Processo, as: 'processo', attributes: ['numero', 'status', 'id'] }],
        order: [['created_at', 'DESC']],
        limit: 10,
        attributes: ['id', 'numero_did', 'tipo_did', 'credor_sec1', 'secretaria_sec1', 'valor_bruto', 'pago', 'data_did', 'processo_id']
      })
    ]);

    // ── Analytics detalhados dos DIDs ─────────────────────────────────────
    const [porMesDid, porSecretariaDid, didsPendentes, porCredorDid] = await Promise.all([
      // Valor bruto por mês (gráfico de barras)
      Did.findAll({
        attributes: [
          [fn('DATE_TRUNC', 'month', col('data_did')), 'mes'],
          [fn('SUM', col('valor_bruto')), 'total'],
          [fn('COUNT', col('id')), 'qtd']
        ],
        where: { data_did: { [Op.between]: [`${ano}-01-01`, `${ano}-12-31`] } },
        group: [fn('DATE_TRUNC', 'month', col('data_did'))],
        order: [[fn('DATE_TRUNC', 'month', col('data_did')), 'ASC']]
      }),
      // Valor bruto por secretaria (barras de categoria)
      Did.findAll({
        attributes: [
          ['secretaria_sec1', 'secretaria'],
          [fn('SUM', col('valor_bruto')), 'total'],
          [fn('COUNT', col('id')), 'qtd']
        ],
        where: { ...didFiltroAno, secretaria_sec1: { [Op.not]: null } },
        group: ['secretaria_sec1'],
        order: [[literal('total'), 'DESC']],
        limit: 8
      }),
      // DIDs pendentes (não pagos) — alerta
      Did.findAll({
        where: { ...didFiltroAno, [Op.or]: [{ pago: 'nao' }, { pago: null }] },
        include: [{ model: Processo, as: 'processo', attributes: ['numero', 'id'] }],
        order: [['data_did', 'ASC']],
        limit: 10,
        attributes: ['id', 'numero_did', 'tipo_did', 'credor_sec1', 'secretaria_sec1', 'valor_bruto', 'pago', 'data_did', 'mes_referencia', 'processo_id']
      }),
      // Top credores por valor
      Did.findAll({
        attributes: [
          ['credor_sec1', 'credor'],
          [fn('SUM', col('valor_bruto')), 'total'],
          [fn('COUNT', col('id')), 'qtd']
        ],
        where: { ...didFiltroAno, credor_sec1: { [Op.not]: null } },
        group: ['credor_sec1'],
        order: [[literal('total'), 'DESC']],
        limit: 8
      })
    ]);

    // Lançamentos (mantidos para compatibilidade — exibidos se houver dados)
    const hoje = new Date().toISOString().split('T')[0];
    const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const [vencimentosProximos, porCategoria, porMes, ultimosLancamentos] = await Promise.all([
      FinanceiroLancamento.findAll({
        where: { status: 'pendente', data_vencimento: { [Op.between]: [hoje, em30dias] } },
        include: [{ model: Setor, as: 'setor', attributes: ['nome'] }, { model: Processo, as: 'processo', attributes: ['numero', 'assunto'] }],
        order: [['data_vencimento', 'ASC']], limit: 10
      }),
      FinanceiroLancamento.findAll({
        attributes: ['categoria', [fn('SUM', col('valor')), 'total'], [fn('COUNT', col('id')), 'qtd']],
        where: { ...whereBase, status: { [Op.not]: 'cancelado' } },
        group: ['categoria'], order: [[literal('total'), 'DESC']]
      }),
      FinanceiroLancamento.findAll({
        attributes: [[fn('DATE_TRUNC', 'month', col('data_lancamento')), 'mes'], [fn('SUM', col('valor')), 'total'], [fn('COUNT', col('id')), 'qtd']],
        where: { data_lancamento: { [Op.between]: [`${ano}-01-01`, `${ano}-12-31`] }, status: { [Op.not]: 'cancelado' } },
        group: [fn('DATE_TRUNC', 'month', col('data_lancamento'))],
        order: [[fn('DATE_TRUNC', 'month', col('data_lancamento')), 'ASC']]
      }),
      FinanceiroLancamento.findAll({
        include: [{ model: Setor, as: 'setor', attributes: ['nome'] }, { model: Processo, as: 'processo', attributes: ['numero', 'assunto'] }],
        order: [['data_lancamento', 'DESC'], ['created_at', 'DESC']], limit: 8
      })
    ]);

    res.json({
      totais: {
        lancamentos: totalLancamentos,
        processoDid: totalProcessosDid,
        valorTotal: parseFloat(somaTotal).toFixed(2),
        valorPago: parseFloat(somaPago).toFixed(2),
        valorPendente: parseFloat(somaPendente).toFixed(2),
        valorVencido: parseFloat(somaVencido).toFixed(2)
      },
      dids: {
        totalFixas: totalDidsFixas || 0,
        totalVariaveis: totalDidsVariaveis || 0,
        valorBrutoTotal: parseFloat(somaDidBruto || 0).toFixed(2),
        valorPago: parseFloat(somaDidPago || 0).toFixed(2),
        valorPendente: parseFloat(somaDidPendente || 0).toFixed(2),
        ultimos: ultimosDids,
        porMes: porMesDid,
        porSecretaria: porSecretariaDid,
        pendentes: didsPendentes,
        porCredor: porCredorDid
      },
      vencimentosProximos,
      porCategoria,
      porMes,
      ultimosLancamentos
    });
  } catch (error) {
    console.error('Erro getDashboard financeiro:', error);
    res.status(500).json({ error: 'Erro ao buscar painel financeiro' });
  }
};

// ============================================================
// OPTIONS — valores únicos para preencher filtros do Painel
// ============================================================
const getDashboardOptions = async (req, res) => {
  try {
    const { Did } = req.models;
    const { ano = new Date().getFullYear() } = req.query;
    const filtroAno = { data_did: { [Op.between]: [`${ano}-01-01`, `${ano}-12-31`] } };

    const [secretarias, credores, fontes, mesesRef] = await Promise.all([
      Did.findAll({
        attributes: [[fn('DISTINCT', col('secretaria_sec1')), 'v']],
        where: { ...filtroAno, secretaria_sec1: { [Op.not]: null, [Op.ne]: '' } },
        raw: true
      }),
      Did.findAll({
        attributes: [[fn('DISTINCT', col('credor_sec1')), 'v']],
        where: { ...filtroAno, credor_sec1: { [Op.not]: null, [Op.ne]: '' } },
        raw: true
      }),
      Did.findAll({
        attributes: [[fn('DISTINCT', col('fonte_recurso')), 'v']],
        where: { ...filtroAno, fonte_recurso: { [Op.not]: null, [Op.ne]: '' } },
        raw: true
      }),
      Did.findAll({
        attributes: [[fn('DISTINCT', col('mes_referencia')), 'v']],
        where: { ...filtroAno, mes_referencia: { [Op.not]: null, [Op.ne]: '' } },
        raw: true
      })
    ]);

    res.json({
      secretarias: secretarias.map(r => r.v).filter(Boolean).sort(),
      credores: credores.map(r => r.v).filter(Boolean).sort(),
      fontes: fontes.map(r => r.v).filter(Boolean).sort(),
      mesesRef: mesesRef.map(r => r.v).filter(Boolean).sort()
    });
  } catch (error) {
    console.error('Erro getDashboardOptions:', error);
    res.status(500).json({ error: 'Erro ao buscar opções' });
  }
};

// ============================================================
// LANÇAMENTOS
// ============================================================
const listLancamentos = async (req, res) => {
  try {
    await ensureTables(req);
    const { FinanceiroLancamento, Processo, Setor, User } = req.models;
    const {
      status, tipo, categoria, setor_id, processo_id,
      data_inicio, data_fim, busca,
      page = 1, limit = 20
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (setor_id) where.setor_id = setor_id;
    if (processo_id) where.processo_id = processo_id;
    if (data_inicio || data_fim) {
      where.data_lancamento = {};
      if (data_inicio) where.data_lancamento[Op.gte] = data_inicio;
      if (data_fim) where.data_lancamento[Op.lte] = data_fim;
    }
    if (busca) {
      where[Op.or] = [
        { descricao: { [Op.iLike]: `%${busca}%` } },
        { fornecedor_nome: { [Op.iLike]: `%${busca}%` } },
        { numero_documento: { [Op.iLike]: `%${busca}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await FinanceiroLancamento.findAndCountAll({
      where,
      include: [
        { model: Setor, as: 'setor', attributes: ['nome'] },
        { model: Processo, as: 'processo', attributes: ['numero', 'assunto', 'status'] },
        { model: User, as: 'usuario', attributes: ['nome'] }
      ],
      order: [['data_lancamento', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      subQuery: false
    });

    res.json({ total: count, pagina: parseInt(page), lancamentos: rows });
  } catch (error) {
    console.error('Erro listLancamentos:', error);
    res.status(500).json({ error: 'Erro ao listar lançamentos' });
  }
};

const createLancamento = async (req, res) => {
  try {
    await ensureTables(req);
    const { FinanceiroLancamento, Processo } = req.models;
    const {
      processo_id, numero_documento, tipo, categoria,
      fornecedor_nome, fornecedor_cpf_cnpj, descricao,
      valor, data_lancamento, data_vencimento, setor_id, observacao
    } = req.body;

    if (!descricao || !valor || !data_lancamento) {
      return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios' });
    }

    // Validar que o processo vinculado é do tipo DID
    if (processo_id) {
      const proc = await Processo.findByPk(processo_id);
      if (!proc) return res.status(404).json({ error: 'Processo não encontrado' });
      if (proc.tipo_processo !== 'Did') {
        return res.status(400).json({ error: 'Apenas processos do tipo DID podem ser vinculados' });
      }
    }

    const lancamento = await FinanceiroLancamento.create({
      processo_id: processo_id || null,
      numero_documento,
      tipo: tipo || 'outros',
      categoria: categoria || 'outros',
      fornecedor_nome,
      fornecedor_cpf_cnpj,
      descricao,
      valor: parseFloat(valor),
      data_lancamento,
      data_vencimento: data_vencimento || null,
      setor_id: setor_id || null,
      status: 'pendente',
      usuario_id: req.user.id,
      observacao
    });

    res.status(201).json(lancamento);
  } catch (error) {
    console.error('Erro createLancamento:', error);
    res.status(500).json({ error: 'Erro ao criar lançamento' });
  }
};

const updateLancamento = async (req, res) => {
  try {
    await ensureTables(req);
    const { FinanceiroLancamento } = req.models;
    const lancamento = await FinanceiroLancamento.findByPk(req.params.id);
    if (!lancamento) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const campos = [
      'numero_documento', 'tipo', 'categoria', 'fornecedor_nome', 'fornecedor_cpf_cnpj',
      'descricao', 'valor', 'data_lancamento', 'data_vencimento', 'data_pagamento',
      'status', 'setor_id', 'observacao'
    ];
    const updates = {};
    campos.forEach(c => { if (req.body[c] !== undefined) updates[c] = req.body[c]; });
    if (updates.valor) updates.valor = parseFloat(updates.valor);

    await lancamento.update(updates);
    res.json(lancamento);
  } catch (error) {
    console.error('Erro updateLancamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar lançamento' });
  }
};

const deleteLancamento = async (req, res) => {
  try {
    await ensureTables(req);
    const { FinanceiroLancamento } = req.models;
    const lancamento = await FinanceiroLancamento.findByPk(req.params.id);
    if (!lancamento) return res.status(404).json({ error: 'Lançamento não encontrado' });
    await lancamento.destroy();
    res.json({ message: 'Lançamento excluído' });
  } catch (error) {
    console.error('Erro deleteLancamento:', error);
    res.status(500).json({ error: 'Erro ao excluir lançamento' });
  }
};

// Quitar (pagar) um lançamento
const pagarLancamento = async (req, res) => {
  try {
    await ensureTables(req);
    const { FinanceiroLancamento } = req.models;
    const lancamento = await FinanceiroLancamento.findByPk(req.params.id);
    if (!lancamento) return res.status(404).json({ error: 'Lançamento não encontrado' });
    if (lancamento.status === 'pago') return res.status(400).json({ error: 'Lançamento já quitado' });

    const hoje = new Date().toISOString().split('T')[0];
    await lancamento.update({ status: 'pago', data_pagamento: req.body.data_pagamento || hoje });
    res.json(lancamento);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao quitar lançamento' });
  }
};

// ============================================================
// PROCESSOS DID
// ============================================================
const getProcessosDid = async (req, res) => {
  try {
    const { Processo, Setor, User, FinanceiroLancamento, Did } = req.models;
    await ensureTables(req);
    const {
      status, setor_id, data_inicio, data_fim, busca,
      page = 1, limit = 20,
      // filtros do painel
      ano, status_pago, tipo_did, secretaria, credor, mes_ref
    } = req.query;

    const where = { tipo_processo: 'Did' };
    if (status) where.status = status;
    if (setor_id) where.setor_atual_id = setor_id;

    // Filtro por ano de abertura
    if (ano && !data_inicio && !data_fim) {
      where.data_abertura = {
        [Op.gte]: new Date(`${ano}-01-01`),
        [Op.lte]: new Date(`${ano}-12-31T23:59:59`)
      };
    }
    if (data_inicio || data_fim) {
      where.data_abertura = {};
      if (data_inicio) where.data_abertura[Op.gte] = new Date(data_inicio);
      if (data_fim) where.data_abertura[Op.lte] = new Date(data_fim + 'T23:59:59');
    }
    if (busca) {
      where[Op.or] = [
        { assunto: { [Op.iLike]: `%${busca}%` } },
        { numero: { [Op.iLike]: `%${busca}%` } },
        { interessado_nome: { [Op.iLike]: `%${busca}%` } }
      ];
    }

    // Filtros aplicados sobre o DID
    const didWhere = {};
    if (status_pago) didWhere.pago = status_pago === 'pago' ? 'sim' : 'nao';
    if (tipo_did) {
      const tipos = tipo_did.split(',').map(t => t.trim()).filter(Boolean)
      if (tipos.length === 1) didWhere.tipo_did = tipos[0]
      else if (tipos.length > 1) didWhere.tipo_did = { [Op.in]: tipos }
    }
    if (secretaria) {
      const secs = secretaria.split(',').map(s => s.trim()).filter(Boolean)
      didWhere.secretaria_sec1 = secs.length === 1 ? { [Op.iLike]: `%${secs[0]}%` } : { [Op.in]: secs }
    }
    if (credor) {
      const creds = credor.split(',').map(c => c.trim()).filter(Boolean)
      didWhere.credor_sec1 = creds.length === 1 ? { [Op.iLike]: `%${creds[0]}%` } : { [Op.in]: creds }
    }
    if (mes_ref) {
      const meses = mes_ref.split(',').map(m => m.trim()).filter(Boolean)
      didWhere.mes_referencia = meses.length === 1 ? meses[0] : { [Op.in]: meses }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Processo.findAndCountAll({
      where,
      subQuery: false,
      include: [
        { model: Setor, as: 'setorAtual', attributes: ['nome'] },
        { model: User, as: 'criadoPor', attributes: ['nome'] },
        { model: FinanceiroLancamento, as: 'lancamentos', attributes: ['id', 'valor', 'status'] },
        {
          model: Did, as: 'did',
          required: true,  // só processos que têm DID preenchido
          where: Object.keys(didWhere).length > 0 ? didWhere : undefined,
          attributes: ['id', 'numero_did', 'tipo_did', 'credor_sec1', 'secretaria_sec1',
                       'valor_bruto', 'pago', 'data_did', 'empenho_numero', 'mes_referencia']
        }
      ],
      order: [['data_abertura', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ total: count, pagina: parseInt(page), processos: rows });
  } catch (error) {
    console.error('Erro getProcessosDid:', error);
    res.status(500).json({ error: 'Erro ao listar processos DID' });
  }
};

// ============================================================
// RELATÓRIO RESUMIDO
// ============================================================
const getRelatorio = async (req, res) => {
  try {
    await ensureTables(req);
    const { FinanceiroLancamento, Setor } = req.models;
    const { data_inicio, data_fim, categoria, setor_id } = req.query;

    const where = { status: { [Op.not]: 'cancelado' } };
    if (data_inicio || data_fim) {
      where.data_lancamento = {};
      if (data_inicio) where.data_lancamento[Op.gte] = data_inicio;
      if (data_fim) where.data_lancamento[Op.lte] = data_fim;
    }
    if (categoria) where.categoria = categoria;
    if (setor_id) where.setor_id = setor_id;

    const porStatus = await FinanceiroLancamento.findAll({
      attributes: ['status', [fn('SUM', col('valor')), 'total'], [fn('COUNT', col('id')), 'qtd']],
      where,
      group: ['status'],
      raw: true
    });

    const porCategoria = await FinanceiroLancamento.findAll({
      attributes: ['categoria', [fn('SUM', col('valor')), 'total'], [fn('COUNT', col('id')), 'qtd']],
      where,
      group: ['categoria'],
      order: [[literal('total'), 'DESC']],
      raw: true
    });

    const porSetor = await FinanceiroLancamento.findAll({
      attributes: ['setor_id', [fn('SUM', col('valor')), 'total'], [fn('COUNT', col('FinanceiroLancamento.id')), 'qtd']],
      where,
      include: [{ model: Setor, as: 'setor', attributes: ['nome'] }],
      group: ['FinanceiroLancamento.setor_id', 'setor.id', 'setor.nome'],
      order: [[literal('total'), 'DESC']]
    });

    const porTipo = await FinanceiroLancamento.findAll({
      attributes: ['tipo', [fn('SUM', col('valor')), 'total'], [fn('COUNT', col('id')), 'qtd']],
      where,
      group: ['tipo'],
      raw: true
    });

    const valorTotal = await FinanceiroLancamento.sum('valor', { where }) || 0;

    res.json({ valorTotal: parseFloat(valorTotal).toFixed(2), porStatus, porCategoria, porSetor, porTipo });
  } catch (error) {
    console.error('Erro getRelatorio financeiro:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
};

module.exports = {
  getDashboard,
  getDashboardOptions,
  listLancamentos, createLancamento, updateLancamento, deleteLancamento, pagarLancamento,
  getProcessosDid,
  getRelatorio
};
