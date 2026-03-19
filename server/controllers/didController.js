const { Op } = require('sequelize');

const getByProcesso = async (req, res) => {
  try {
    const { processoId } = req.params;
    const { Did, Processo, Setor, Secretaria } = req.models;

    const did = await Did.findOne({
      where: { processo_id: processoId },
      include: [{
        model: Processo,
        as: 'processo',
        include: [{
          model: Setor,
          as: 'setorAtual',
          include: [{ model: Secretaria, as: 'secretaria' }]
        }]
      }]
    });

    if (!did) return res.status(404).json({ error: 'DID não encontrado' });
    res.json({ did });
  } catch (err) {
    console.error('Erro getByProcesso DID:', err);
    res.status(500).json({ error: err.message });
  }
};

const NUMERIC_FIELDS = [
  'valor_did', 'nf_valor', 'valor_bruto',
  'desconto_inss', 'desconto_iss', 'desconto_irrf', 'desconto_sindicato',
  'desconto_bb', 'desconto_caixa', 'desconto_pensao', 'desconto_outros'
];

const ENUM_FIELDS = ['tipo_did', 'tipo_empenho', 'status'];

const DATE_FIELDS = [
  'data_did', 'ci_recebido_em', 'compras_recebido_em', 'data_compras',
  'data_empenho', 'data_liquidacao', 'contabil_recebido_em',
  'financas_recebido_em', 'financas2_recebido_em', 'financas2_enviado_pagamento',
  'tesouraria_recebido_em', 'receb_data', 'receb_nf_data', 'receb_nf_enviado_compras',
  // Compras 2 (Solicitação Empenho — Contas Variáveis)
  'compras2_recebido_em', 'compras2_data',
  // Compras 3 (Ateste NF — Contas Variáveis)
  'compras3_recebido_em', 'compras3_data', 'compras3_local_entrega',
  // Contabilidade Pós Compras (Liquidação — Contas Variáveis)
  'contabil_pc_recebido_em', 'contabil_pc_data_empenho', 'contabil_pc_data_liquidacao'
];

const sanitizeBody = (body) => {
  const cleaned = { ...body };
  for (const field of NUMERIC_FIELDS) {
    if (cleaned[field] === '' || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }
  for (const field of ENUM_FIELDS) {
    if (cleaned[field] === '' || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }
  for (const field of DATE_FIELDS) {
    if (!cleaned[field] || cleaned[field] === '' || cleaned[field] === 'Invalid date') {
      cleaned[field] = null;
    }
  }
  return cleaned;
};

const createOrUpdate = async (req, res) => {
  try {
    const { processoId } = req.params;
    const { Did, Processo, Setor, Secretaria } = req.models;
    const body = sanitizeBody(req.body);

    let did = await Did.findOne({ where: { processo_id: processoId } });

    if (!did) {
      const count = await Did.count();
      did = await Did.create({
        ...body,
        processo_id: processoId,
        numero_did: count + 1,
        criado_por_id: req.user.id
      });
    } else {
      await did.update(body);
    }

    // Sincroniza saídas no almoxarifado (não-bloqueante)
    if (body.itens_did && body.itens_did.length > 0) {
      sincronizarAlmoxarifado(req.models, did, body.itens_did).catch(err =>
        console.error('[DID] Almoxarifado sync error:', err)
      );
    }

    const didAtualizado = await Did.findByPk(did.id, {
      include: [{
        model: Processo,
        as: 'processo',
        include: [{
          model: Setor,
          as: 'setorAtual',
          include: [{ model: Secretaria, as: 'secretaria' }]
        }]
      }]
    });

    res.json({ did: didAtualizado });
  } catch (err) {
    console.error('Erro createOrUpdate DID:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getByProcesso, createOrUpdate, getProximoNumero, getEstoque, getAlmEstoque };

// ─── Sincronização automática DID → Almoxarifado ────────────────────────────
// Ao salvar um DID com itens, registra SAÍDA no almoxarifado para cada item
// que tiver correspondência por nome. Ao re-salvar, reverte o lançamento
// anterior (identifica pelo documento_referencia = "DID-{numero_did}") e
// cria um novo. Erros não bloqueiam o salvamento do DID.
async function sincronizarAlmoxarifado(models, did, novosItens) {
  const { AlmoxarifadoItem, AlmoxarifadoMovimentacao } = models;
  const docRef = `DID-${did.numero_did}`;

  // 1. Desfaz lançamentos anteriores deste DID
  const movAnteriores = await AlmoxarifadoMovimentacao.findAll({
    where: { documento_referencia: docRef, tipo: 'SAIDA' }
  });
  for (const mov of movAnteriores) {
    const item = await AlmoxarifadoItem.findByPk(mov.item_id);
    if (item) {
      await item.update({
        estoque_atual: Math.max(0, parseFloat(item.estoque_atual) + parseFloat(mov.quantidade))
      });
    }
    await mov.destroy();
  }

  // 2. Registra novas saídas
  for (const it of (novosItens || [])) {
    const qtd = parseFloat(it.quantidade) || 0;
    if (!it.descricao || qtd <= 0) continue;

    // Tenta correspondência exata, depois parcial
    let almoxItem = await AlmoxarifadoItem.findOne({
      where: { ativo: true, nome: it.descricao.trim() }
    });
    if (!almoxItem) {
      almoxItem = await AlmoxarifadoItem.findOne({
        where: { ativo: true, nome: { [Op.iLike]: `%${it.descricao.trim()}%` } }
      });
    }
    if (!almoxItem) continue; // sem correspondência no almoxarifado

    const estoqueAtual = parseFloat(almoxItem.estoque_atual) || 0;
    const qtdSaida = Math.min(qtd, Math.max(0, estoqueAtual)); // não deixa negativo
    if (qtdSaida <= 0) continue;

    const valUnit = parseFloat(it.valor_unitario) || parseFloat(almoxItem.valor_unitario) || 0;
    await AlmoxarifadoMovimentacao.create({
      item_id: almoxItem.id,
      tipo: 'SAIDA',
      quantidade: qtdSaida,
      valor_unitario: valUnit,
      valor_total: (qtdSaida * valUnit).toFixed(2),
      data_movimentacao: did.data_did || new Date().toISOString().slice(0, 10),
      documento_referencia: docRef,
      observacao: `Gerado pelo DID Nº ${did.numero_did}${did.objeto ? ' — ' + did.objeto.slice(0, 100) : ''}`,
      usuario_id: did.criado_por_id || null
    });
    await almoxItem.update({ estoque_atual: Math.max(0, estoqueAtual - qtdSaida) });
  }
}

// Retorna estoque atual do almoxarifado para uma lista de descrições de itens do DID
async function getAlmEstoque(req, res) {
  try {
    const { AlmoxarifadoItem } = req.models;
    const { descricoes } = req.query;
    if (!descricoes) return res.json({ itens: [] });

    const lista = descricoes.split(',').map(d => d.trim()).filter(Boolean);
    const resultado = [];
    for (const desc of lista) {
      let item = await AlmoxarifadoItem.findOne({
        where: { ativo: true, nome: desc },
        attributes: ['id', 'nome', 'codigo', 'unidade', 'estoque_atual', 'valor_unitario']
      });
      if (!item) {
        item = await AlmoxarifadoItem.findOne({
          where: { ativo: true, nome: { [Op.iLike]: `%${desc}%` } },
          attributes: ['id', 'nome', 'codigo', 'unidade', 'estoque_atual', 'valor_unitario']
        });
      }
      if (item) {
        resultado.push({
          descricao_did: desc,
          almox_nome: item.nome,
          almox_codigo: item.codigo,
          unidade: item.unidade,
          estoque_atual: item.estoque_atual,
          valor_unitario: item.valor_unitario
        });
      }
    }
    res.json({ itens: resultado });
  } catch (err) {
    console.error('Erro getAlmEstoque:', err);
    res.status(500).json({ error: err.message });
  }
}

// Retorna qtd usada por item (descrição) em todos os DIDs que referenciam o contrato.
// Query param: ?did_id=<uuid>  → exclui o DID atual do cálculo (edição)
async function getEstoque(req, res) {
  try {
    const { contratoRef } = req.params
    const { didId } = req.query
    const { Did } = req.models

    const dids = await Did.findAll({
      where: { contrato_ref: contratoRef },
      attributes: ['id', 'itens_did']
    })

    // Soma quantidades usadas por descrição normalizada
    const map = {}
    for (const did of dids) {
      if (didId && did.id === didId) continue
      const itens = did.itens_did || []
      for (const it of itens) {
        if (!it.descricao) continue
        const key = it.descricao.trim().toLowerCase()
        if (!map[key]) map[key] = { descricao: it.descricao, qtd_usada: 0 }
        map[key].qtd_usada += parseFloat(it.quantidade) || 0
      }
    }

    res.json({ estoque: Object.values(map) })
  } catch (err) {
    console.error('Erro getEstoque DID:', err)
    res.status(500).json({ error: err.message })
  }
}

async function getProximoNumero(req, res) {
  try {
    const { Did } = req.models;
    const count = await Did.count();
    res.json({ proximo: count + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
