// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  CONTRATOS CONTROLLER  â€“  CRUD para Credores, Itens de CatÃ¡logo e Contratos
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { Op } = require('sequelize');
const { registrarLog } = require('../middleware/activityLogger');
const { applyScopeToWhereByName } = require('../utils/scopeFilter');
const { registrarExclusao } = require('../services/lixeiraService');

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const notFound = (res, entity) => res.status(404).json({ error: `${entity} nÃ£o encontrado` });

// â”€â”€ CREDORES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const listCredores = async (req, res) => {
  try {
    const { Credor } = req.models;
    const { status, q } = req.query;

    const where = {};
    where.status = status || { [Op.ne]: 'EXCLUÍDO' };
    if (q) where.razao_social = { [Op.iLike]: `%${q}%` };

    const credores = await Credor.findAll({ where, order: [['razao_social', 'ASC']] });
    res.json(credores);
  } catch (err) {
    console.error('listCredores:', err);
    res.status(500).json({ error: 'Erro ao listar credores' });
  }
};

// CNPJ/CPF já usado por outro credor NÃO excluído (compara só os dígitos, para
// "12.345.678/0001-90" e "12345678000190" contarem como o mesmo). Devolve o credor ou null.
const credorComMesmoDocumento = async (req, cnpjCpf, ignorarId = null) => {
  const digitos = String(cnpjCpf || '').replace(/\D/g, '');
  if (digitos.length !== 11 && digitos.length !== 14) return null; // mascarado/incompleto: só o índice confere
  const [rows] = await req.tenantDb.query(
    `SELECT id, razao_social FROM "${req.tenant.schema}".credores
      WHERE status <> 'EXCLUÍDO' AND regexp_replace(cnpj_cpf, '[^0-9]', '', 'g') = :digitos
        ${ignorarId ? 'AND id <> :ignorarId' : ''} LIMIT 1`,
    { replacements: { digitos, ignorarId } }
  );
  return rows[0] || null;
};
const msgDocumentoRepetido = (c) => `CNPJ/CPF já cadastrado para ${c.razao_social}.`;

const createCredor = async (req, res) => {
  try {
    const { Credor } = req.models;
    const existente = await credorComMesmoDocumento(req, req.body?.cnpj_cpf);
    if (existente) return res.status(409).json({ error: msgDocumentoRepetido(existente) });
    const credor = await Credor.create(req.body);
    res.status(201).json(credor);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'CNPJ/CPF já cadastrado em outro credor ativo.' });
    }
    console.error('createCredor:', err);
    res.status(500).json({ error: 'Erro ao criar credor' });
  }
};

const updateCredor = async (req, res) => {
  try {
    const { Credor } = req.models;
    const credor = await Credor.findByPk(req.params.id);
    if (!credor) return notFound(res, 'Credor');
    if (req.body?.cnpj_cpf !== undefined) {
      const existente = await credorComMesmoDocumento(req, req.body.cnpj_cpf, credor.id);
      if (existente) return res.status(409).json({ error: msgDocumentoRepetido(existente) });
    }
    await credor.update(req.body);
    res.json(credor);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'CNPJ/CPF já cadastrado em outro credor ativo.' });
    }
    console.error('updateCredor:', err);
    res.status(500).json({ error: 'Erro ao atualizar credor' });
  }
};

const deleteCredor = async (req, res) => {
  try {
    const { Credor, Contrato } = req.models;
    const credor = await Credor.findByPk(req.params.id);
    if (!credor) return notFound(res, 'Credor');
    if (Contrato) {
      const totalContratos = await Contrato.count({
        where: { credor_id: credor.id, status: { [Op.ne]: 'EXCLUÍDO' } }
      });
      if (totalContratos > 0) {
        return res.status(409).json({ error: `Este credor esta vinculado a ${totalContratos} contrato(s). Exclua ou desvincule os contratos primeiro.` });
      }
    }

    await registrarExclusao(req, 'credores', credor);
    await credor.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteCredor:', err);
    res.status(500).json({ error: 'Erro ao excluir credor' });
  }
};

// â”€â”€ ITENS DE CATÃLOGO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const listItens = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const { status, q } = req.query;

    const where = {};
    if (status) where.status = status;
    if (q) where.descricao = { [Op.iLike]: `%${q}%` };

    const itens = await ContratoItem.findAll({ where, order: [['descricao', 'ASC']] });
    res.json(itens);
  } catch (err) {
    console.error('listItens:', err);
    res.status(500).json({ error: 'Erro ao listar itens' });
  }
};

// Status automático: só fica ATIVO com categoria e especificação preenchidas (sem
// especificação o item não pode ser vinculado a contrato — ver conferirItensAtivos)
const calcStatusItem = (data) => {
  const categoria = String(data.categoria || '').trim();
  const especificacao = String(data.especificacao || '').trim();
  return categoria && especificacao ? 'ATIVO' : 'INATIVO';
};

const createItem = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    // Gera codigo automaticamente no servidor — ignora qualquer valor enviado pelo front
    const ultimo = await ContratoItem.findOne({ order: [['codigo', 'DESC']], where: { codigo: { [Op.not]: null } } });
    const proxNum = ultimo ? (parseInt(ultimo.codigo, 10) || 0) + 1 : 1;
    const codigo = String(proxNum).padStart(5, '0');
    const { codigo: _ignorado, ...body } = req.body;
    const payload = { ...body, codigo, status: calcStatusItem({ ...body, codigo }) };
    const item = await ContratoItem.create(payload);
    res.status(201).json(item);
  } catch (err) {
    console.error('createItem:', err);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const item = await ContratoItem.findByPk(req.params.id);
    if (!item) return notFound(res, 'Item');
    // Item ATIVO do banco de itens: só administradores alteram (enquanto o banco é preenchido)
    if (item.status === 'ATIVO' && !['admin', 'jeos'].includes(req.user?.tipo)) {
      return res.status(403).json({ error: 'Item ativo só pode ser alterado por administradores.' });
    }
    // Nunca usa o codigo vindo do frontend — é sempre imutável após setado
    const { codigo: _ignorado, ...rest } = req.body;
    // Se o item ainda não tem código, gera um novo primeiro (antes de calcular o status)
    let codigoFinal = item.codigo || null;
    if (!codigoFinal) {
      const ultimo = await ContratoItem.findOne({
        order: [['codigo', 'DESC']],
        where: { codigo: { [Op.not]: null } },
      });
      const proxNum = ultimo ? (parseInt(ultimo.codigo, 10) || 0) + 1 : 1;
      codigoFinal = String(proxNum).padStart(5, '0');
    }
    const merged = { ...item.toJSON(), ...rest, codigo: codigoFinal };
    const payload = { ...rest, codigo: codigoFinal, status: calcStatusItem(merged) };
    await item.update(payload);
    res.json(item);
  } catch (err) {
    console.error('updateItem:', err);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { ContratoItem, ContratoItemVinculo, ContratoOrdemItem, Contrato, ContratoOrdem } = req.models;
    const item = await ContratoItem.findByPk(req.params.id);
    if (!item) return notFound(res, 'Item');

    // Só conta vínculos com contratos/ordens ainda ativos (contrato/ordem já
    // excluído ou ordem cancelada não deve bloquear a exclusão do item).
    const totalVinculos = (ContratoItemVinculo && Contrato) ? await ContratoItemVinculo.count({
      where: { item_id: item.id },
      include: [{ model: Contrato, as: 'contrato', where: { status: { [Op.ne]: 'EXCLUÍDO' } }, attributes: [] }]
    }) : 0;
    const totalOrdens = (ContratoOrdemItem && ContratoOrdem) ? await ContratoOrdemItem.count({
      where: { item_id: item.id },
      include: [{ model: ContratoOrdem, as: 'ordemPai', where: { status: { [Op.notIn]: ['CANCELADA', 'EXCLUÍDA'] } }, attributes: [] }]
    }) : 0;
    if (totalVinculos > 0 || totalOrdens > 0) {
      const partes = [];
      if (totalVinculos > 0) partes.push(`${totalVinculos} contrato(s)`);
      if (totalOrdens > 0) partes.push(`${totalOrdens} ordem(ns) de compra/servico`);
      return res.status(409).json({
        error: `Este item esta vinculado a ${partes.join(' e ')}. Remova esses vinculos primeiro.`,
        vinculos: { contratos: totalVinculos, ordens: totalOrdens }
      });
    }

    await registrarExclusao(req, 'itens', item);
    await item.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteItem:', err);
    res.status(500).json({ error: 'Erro ao excluir item' });
  }
};

// ── DNA DO ITEM ────────────────────────────────────────────────────────────────
const getDnaItem = async (req, res) => {
  try {
    const models = req.models;
    const { id } = req.params;

    // Valida que os modelos necessários existem
    if (!models.ContratoItem) return res.status(500).json({ error: 'Modelo ContratoItem não disponível' });
    if (!models.ContratoItemVinculo) return res.status(500).json({ error: 'Modelo ContratoItemVinculo não disponível' });
    if (!models.ContratoOrdemItem) return res.status(500).json({ error: 'Modelo ContratoOrdemItem não disponível' });

    const { ContratoItem, ContratoItemVinculo, ContratoOrdemItem, ContratoOrdem, Contrato, Credor } = models;

    const item = await ContratoItem.findByPk(id);
    if (!item) return notFound(res, 'Item');

    // Contratos que têm este item no quadro de itens
    const vinculosContrato = await ContratoItemVinculo.findAll({
      where: { item_id: id },
      include: [{
        model: Contrato,
        as: 'contrato',
        include: [{ model: Credor, as: 'credor', attributes: ['razao_social', 'nome_fantasia'] }],
      }],
    });

    // Ordens de compra/serviço que usam este item
    const vinculosOrdem = await ContratoOrdemItem.findAll({
      where: { item_id: id },
      include: [{
        model: ContratoOrdem,
        as: 'ordemPai',
        include: [{
          model: Contrato,
          as: 'contrato',
          attributes: ['id', 'numero_contrato', 'secretaria'],
        }],
      }],
    });

    res.json({ item, vinculosContrato, vinculosOrdem });
  } catch (err) {
    console.error('getDnaItem:', err.message, '\n', err.stack?.split('\n').slice(1,3).join('\n'));
    res.status(500).json({ error: `Erro ao buscar DNA: ${err.message}` });
  }
};

// â”€â”€ CONTRATOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const listContratos = async (req, res) => {
  try {
    const { Contrato, Credor, ContratoItemVinculo, Secretaria } = req.models;
    const { status, q } = req.query;

    const where = {};
    where.status = status || { [Op.ne]: 'EXCLUÍDO' };
    if (q) {
      where[Op.or] = [
        { numero_contrato: { [Op.iLike]: `%${q}%` } },
        { objeto: { [Op.iLike]: `%${q}%` } },
      ];
    }
    await applyScopeToWhereByName(where, req, 'secretaria', 'contratos', 'contratos', 'ver');

    const contratos = await Contrato.findAll({
      where,
      include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf', 'tipo'] }],
      order: [['numero_contrato', 'ASC']],
    });

    // Busca itens separadamente para evitar conflito de associaÃ§Ã£o multi-tenant
    if (ContratoItemVinculo && contratos.length > 0) {
      const ids = contratos.map(c => c.id);
      const todosItens = await ContratoItemVinculo.findAll({
        where: { contrato_id: ids },
        order: [['ordem', 'ASC']],
      });
      const itensPorContrato = {};
      todosItens.forEach(it => {
        if (!itensPorContrato[it.contrato_id]) itensPorContrato[it.contrato_id] = [];
        itensPorContrato[it.contrato_id].push(it);
      });
      const result = contratos.map(c => ({
        ...c.toJSON(),
        itens: itensPorContrato[c.id] || [],
      }));
      return res.json(result);
    }

    res.json(contratos);
  } catch (err) {
    console.error('listContratos:', err);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
};

// Cotas do contrato por unidade/dotação (ex.: SEDUC › SEC e CAPECI): [{ id, nome, dotacao, setor }]
const normalizarCotas = (cotas) => {
  const vistos = new Set();
  return (Array.isArray(cotas) ? cotas : [])
    .map(c => ({
      id:      String(c?.id || '').trim().slice(0, 40),
      nome:    String(c?.nome || '').trim().toUpperCase().slice(0, 80),
      dotacao: String(c?.dotacao || '').trim().slice(0, 200),
      setor:   String(c?.setor || '').trim().slice(0, 120),
    }))
    .filter(c => c.id && c.nome && !vistos.has(c.id) && vistos.add(c.id));
};

// Quantidade de cada cota no item: { [cotaId]: quantidade } (só cotas do contrato, > 0)
const qtdPorCota = (it, cotas) => {
  const num = (v) => (v === undefined || v === null || v === '') ? 0 : (parseFloat(String(v).replace(',', '.')) || 0);
  const out = {};
  cotas.forEach(c => { const q = num(it?.cotas_qtd?.[c.id]); if (q > 0) out[c.id] = q; });
  return out;
};

// Salva/substitui os itens vinculados ao contrato
const syncItens = async (ContratoItemVinculo, contratoId, itens, cotas = []) => {
  await ContratoItemVinculo.destroy({ where: { contrato_id: contratoId } });
  if (!Array.isArray(itens) || itens.length === 0) return;
  const num = (v) => (v === undefined || v === null || v === '') ? null : parseFloat(String(v).replace(',', '.'));
  const rows = itens
    .filter(it => it.descricao && String(it.descricao).trim())
    .map((it, idx) => {
      // Contrato com cotas: a quantidade do item é a soma das cotas (sem distribuição por setor)
      if (cotas.length) {
        const porCota = qtdPorCota(it, cotas);
        return {
          contrato_id:    contratoId,
          item_id:        it.item_id || null,
          lote:           it.lote || null,
          codigo_item:    it.codigo_item || null,
          descricao:      String(it.descricao).trim(),
          unidade:        it.unidade || null,
          quantidade:     Object.values(porCota).reduce((s, q) => s + q, 0),
          valor_unitario: num(it.valor_unitario),
          distribuicao:        null,
          valor_unitario_base: null,
          cotas_qtd:      porCota,
          ordem:          idx,
        };
      }
      // Distribuição por setor: só linhas com local e quantidade > 0
      const distribuicao = Array.isArray(it.distribuicao)
        ? it.distribuicao
            .map(d => ({ local: String(d?.local || '').trim().slice(0, 120), quantidade: num(d?.quantidade) || 0 }))
            .filter(d => d.local && d.quantidade > 0)
        : [];
      const base = num(it.valor_unitario_base);
      const totalDistribuido = distribuicao.reduce((s, d) => s + d.quantidade, 0);
      const comDistribuicao = distribuicao.length > 0 && base != null;
      return {
        contrato_id:    contratoId,
        item_id:        it.item_id || null,
        lote:           it.lote || null,
        codigo_item:    it.codigo_item || null,
        descricao:      String(it.descricao).trim(),
        unidade:        it.unidade || null,
        quantidade:     num(it.quantidade),
        // Com distribuição, o valor unitário do contrato é a média mensal (base × total
        // distribuído): o total do item e o saldo das ordens seguem por mês
        valor_unitario: comDistribuicao ? Math.round(base * totalDistribuido * 100) / 100 : num(it.valor_unitario),
        distribuicao:        comDistribuicao ? distribuicao : null,
        valor_unitario_base: comDistribuicao ? base : null,
        cotas_qtd:      null,
        // valor_total é GENERATED ALWAYS (quantidade * valor_unitario) — não incluir no INSERT
        ordem:          idx,
      };
    });
  if (rows.length) await ContratoItemVinculo.bulkCreate(rows);
};

// Só itens ATIVOS do catálogo podem entrar num contrato. Os que já estavam vinculados
// (itensJaNoContrato) continuam, para a edição de contratos antigos não travar.
// Devolve a mensagem de erro, ou null.
const conferirItensAtivos = async (models, itens, itensJaNoContrato = []) => {
  const ids = [...new Set((Array.isArray(itens) ? itens : []).map(it => it?.item_id).filter(Boolean).map(Number))]
    .filter(id => !itensJaNoContrato.includes(id));
  if (!ids.length) return null;
  const inativos = await models.ContratoItem.findAll({
    where: { id: { [Op.in]: ids }, status: { [Op.ne]: 'ATIVO' } }, attributes: ['descricao'], raw: true,
  });
  if (!inativos.length) return null;
  return `Item inativo não pode ser vinculado ao contrato (cadastre a especificação no catálogo): ${inativos.map(i => i.descricao).join('; ')}`;
};

// Item distribuído por setor: o local tem de ser um setor ativo cadastrado e a soma das
// quantidades dos setores não pode passar a quantidade do item. Locais que o contrato já
// tinha (digitados antes dessa regra) continuam valendo, para a edição não travar.
// Com secretaria no contrato, só valem os setores dela.
// Devolve a mensagem de erro, ou null.
const chaveSecretaria = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const conferirDistribuicao = async (models, contratoId, itens, secretaria) => {
  const num = (v) => (v === undefined || v === null || v === '') ? 0 : (parseFloat(String(v).replace(',', '.')) || 0);
  const comDist = (Array.isArray(itens) ? itens : []).map(it => ({
    it,
    linhas: (Array.isArray(it?.distribuicao) ? it.distribuicao : [])
      .map(d => ({ local: String(d?.local || '').trim(), quantidade: num(d?.quantidade) }))
      .filter(d => d.local && d.quantidade > 0),
  })).filter(x => x.linhas.length);
  if (!comDist.length) return null;

  for (const { it, linhas } of comDist) {
    const total = linhas.reduce((s, d) => s + d.quantidade, 0);
    if (total > num(it.quantidade)) {
      return `A soma das quantidades dos setores (${total}) não pode passar a quantidade do item (${num(it.quantidade)}): ${String(it.descricao || '').trim().slice(0, 80)}`;
    }
  }

  // Contratos gravam o nome ou a sigla da secretaria ("Secretaria de…" ou "SECRETARIA DE…")
  let sec = null;
  if (chaveSecretaria(secretaria)) {
    const secretarias = await models.Secretaria.findAll({ attributes: ['id', 'nome', 'sigla'], raw: true });
    sec = secretarias.find(s => chaveSecretaria(s.sigla) === chaveSecretaria(secretaria) || chaveSecretaria(s.nome) === chaveSecretaria(secretaria)) || null;
  }
  const whereSetor = sec ? { ativo: true, secretaria_id: sec.id } : { ativo: true };
  const setores = await models.Setor.findAll({ where: whereSetor, attributes: ['nome'], raw: true });
  const validos = new Set(setores.map(s => String(s.nome || '').trim()));
  if (contratoId) {
    const anteriores = await models.ContratoItemVinculo.findAll({ where: { contrato_id: contratoId }, attributes: ['distribuicao'], raw: true });
    anteriores.forEach(v => (Array.isArray(v.distribuicao) ? v.distribuicao : []).forEach(d => validos.add(String(d?.local || '').trim())));
  }
  const fora = [...new Set(comDist.flatMap(x => x.linhas.map(d => d.local)).filter(l => !validos.has(l)))];
  if (fora.length) {
    return sec
      ? `Escolha setores da secretaria do contrato (${sec.nome}). Fora dela: ${fora.join(', ')}`
      : `Escolha setores cadastrados no sistema. Não cadastrado: ${fora.join(', ')}`;
  }
  return null;
};

// Cotas do contrato (já normalizadas): nomes sem repetir, dotação das cadastradas na
// secretaria do contrato, todo item com quantidade em alguma cota e sem distribuição por
// setor, e — ao editar — nenhuma cota abaixo do que já saiu em ordens.
// Devolve a mensagem de erro, ou null.
const conferirCotas = async (models, contratoId, cotas, itens, secretaria) => {
  const anteriores = contratoId
    ? ((await models.Contrato.findByPk(contratoId, { attributes: ['cotas'], raw: true }))?.cotas || [])
    : [];
  // Ordens que já saíram de cotas que deixariam de existir
  const removidas = anteriores.filter(a => !cotas.some(c => c.id === a.id));
  if (contratoId && removidas.length) {
    const comOrdem = await models.ContratoOrdem.findAll({
      where: { contrato_id: contratoId, cota_id: { [Op.in]: removidas.map(r => r.id) }, status: { [Op.notIn]: ['CANCELADA', 'EXCLUÍDA'] } },
      attributes: ['cota_id'], raw: true,
    });
    const nomes = [...new Set(comOrdem.map(o => removidas.find(r => r.id === o.cota_id)?.nome))].filter(Boolean);
    if (nomes.length) return `A cota ${nomes.join(', ')} já tem ordens emitidas e não pode ser removida.`;
  }
  if (!cotas.length) return null;

  const nomes = cotas.map(c => c.nome);
  const repetido = nomes.find((n, i) => nomes.indexOf(n) !== i);
  if (repetido) return `Cota repetida no contrato: ${repetido}`;

  // Nada digitado à mão: a cota é um setor ativo cadastrado (da secretaria do contrato,
  // se houver) e a dotação é uma das cadastradas na secretaria (Organização › Secretarias).
  // O que o contrato já tinha gravado continua valendo, para a edição não travar.
  let sec = null;
  if (chaveSecretaria(secretaria)) {
    const secretarias = await models.Secretaria.findAll({ attributes: ['id', 'nome', 'sigla', 'dotacoes'], raw: true });
    sec = secretarias.find(s => chaveSecretaria(s.sigla) === chaveSecretaria(secretaria) || chaveSecretaria(s.nome) === chaveSecretaria(secretaria)) || null;
  }
  const jaGravada = (c, campo) => anteriores.some(a => a.id === c.id && String(a[campo] || '').trim().toUpperCase() === String(c[campo] || '').trim().toUpperCase());

  const setores = await models.Setor.findAll({ where: sec ? { ativo: true, secretaria_id: sec.id } : { ativo: true }, attributes: ['nome'], raw: true });
  const setoresValidos = new Set(setores.map(s => String(s.nome || '').trim().toUpperCase()));
  const foraSetor = cotas.filter(c => !setoresValidos.has(c.nome) && !jaGravada(c, 'nome'));
  if (foraSetor.length) {
    return `A cota tem de ser um setor cadastrado${sec ? ` na secretaria do contrato (${sec.nome})` : ''}. Não cadastrado: ${foraSetor.map(c => c.nome).join(', ')}`;
  }

  const dotacoesValidas = new Set((Array.isArray(sec?.dotacoes) ? sec.dotacoes : []).map(d => String(d?.codigo || d?.descricao || '').trim()).filter(Boolean));
  const foraDotacao = cotas.filter(c => c.dotacao && !dotacoesValidas.has(c.dotacao) && !jaGravada(c, 'dotacao'));
  if (foraDotacao.length) {
    return `Escolha dotações cadastradas na secretaria do contrato${sec ? ` (${sec.nome})` : ''}. Fora dela: ${foraDotacao.map(c => `${c.nome} (${c.dotacao})`).join(', ')}`;
  }

  const lista = (Array.isArray(itens) ? itens : []).filter(it => it?.descricao && String(it.descricao).trim());
  for (const it of lista) {
    const desc = String(it.descricao).trim().slice(0, 80);
    if (Array.isArray(it.distribuicao) && it.distribuicao.some(d => String(d?.local || '').trim())) {
      return `Contrato com cotas não usa distribuição por setor no item: ${desc}`;
    }
    if (!Object.keys(qtdPorCota(it, cotas)).length) return `Informe a quantidade de ao menos uma cota no item: ${desc}`;
  }

  // Editando: a cota de cada item não pode ficar abaixo do já pedido em ordens dela
  if (contratoId) {
    const ordens = await models.ContratoOrdem.findAll({
      where: { contrato_id: contratoId, cota_id: { [Op.ne]: null }, status: { [Op.notIn]: ['CANCELADA', 'EXCLUÍDA'] } },
      attributes: ['id', 'cota_id'], raw: true,
    });
    if (ordens.length) {
      const cotaDaOrdem = Object.fromEntries(ordens.map(o => [o.id, o.cota_id]));
      const usados = await models.ContratoOrdemItem.findAll({ where: { ordem_id: { [Op.in]: ordens.map(o => o.id) } }, attributes: ['ordem_id', 'item_id', 'quantidade'], raw: true });
      const uso = {}; // `${cotaId}|${itemId}` → quantidade
      usados.forEach(u => { if (!u.item_id) return; const k = `${cotaDaOrdem[u.ordem_id]}|${u.item_id}`; uso[k] = (uso[k] || 0) + (parseFloat(u.quantidade) || 0); });
      for (const it of lista) {
        if (!it.item_id) continue;
        const porCota = qtdPorCota(it, cotas);
        for (const c of cotas) {
          const usado = uso[`${c.id}|${it.item_id}`] || 0;
          if (usado > (porCota[c.id] || 0)) {
            return `A cota ${c.nome} do item "${String(it.descricao).trim().slice(0, 60)}" não pode ficar abaixo do já pedido em ordens (${usado}).`;
          }
        }
      }
    }
  }
  return null;
};

// Descrição do item no contrato = descrição + especificação do banco de itens
// (mesma regra de client/src/pages/contratos/ContratosShared.jsx › descricaoComEspecificacao)
const descricaoComEspecificacao = (item) => {
  const desc = String(item?.descricao || '').trim();
  const esp = String(item?.especificacao || '').trim();
  if (!esp || desc.toLowerCase().includes(esp.toLowerCase())) return desc;
  return desc ? `${desc} - ${esp}` : esp;
};
const chaveTexto = (t) => String(t || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Itens do contrato vêm do banco de itens e não podem ser alterados no contrato:
//  - item novo no contrato: descrição e unidade sempre as do banco de itens;
//  - item que já estava no contrato: mantém a descrição/unidade gravadas;
//  - sem vínculo com o banco: só os que já existiam assim (contratos antigos).
// Devolve { erro } ou { itens } prontos para o syncItens.
const travarItensNoBanco = async (models, contratoId, itens) => {
  if (!Array.isArray(itens)) return { itens };
  const anteriores = contratoId
    ? await models.ContratoItemVinculo.findAll({ where: { contrato_id: contratoId }, attributes: ['item_id', 'descricao', 'unidade'], raw: true })
    : [];
  const porItem = new Map(anteriores.filter(a => a.item_id).map(a => [Number(a.item_id), a]));
  const semVinculo = new Set(anteriores.filter(a => !a.item_id).map(a => chaveTexto(a.descricao)));

  const ids = [...new Set(itens.map(it => it?.item_id).filter(Boolean).map(Number))].filter(id => !porItem.has(id));
  const catalogo = ids.length
    ? await models.ContratoItem.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'descricao', 'especificacao', 'unidade_medida'], raw: true })
    : [];
  const doBanco = new Map(catalogo.map(c => [Number(c.id), c]));

  const fora = [];
  const prontos = itens
    .filter(it => it && String(it.descricao || '').trim())
    .map(it => {
      const id = it.item_id ? Number(it.item_id) : null;
      if (id && porItem.has(id)) {
        const ant = porItem.get(id);
        return { ...it, descricao: ant.descricao, unidade: ant.unidade };
      }
      if (id && doBanco.has(id)) {
        const c = doBanco.get(id);
        return { ...it, descricao: descricaoComEspecificacao(c), unidade: c.unidade_medida || it.unidade || null };
      }
      if (id) { fora.push(String(it.descricao).trim()); return it; } // vínculo com item que não existe
      if (semVinculo.has(chaveTexto(it.descricao))) return it;       // item antigo, já estava assim
      fora.push(String(it.descricao).trim());
      return it;
    });
  if (fora.length) {
    return { erro: `Escolha o item no banco de itens (não é permitido item digitado à mão): ${fora.slice(0, 5).join('; ')}` };
  }
  return { itens: prontos };
};

const createContrato = async (req, res) => {
  try {
    const { Contrato, ContratoItemVinculo } = req.models;
    const { itens, conclusao: _conclusao, ...dados } = req.body;
    if (dados.status === 'CONCLUÍDO') dados.status = 'ATIVO'; // concluir só pelo botão, assinado
    if (dados.valor != null && typeof dados.valor === 'string') {
      dados.valor = parseFloat(dados.valor.replace(/[^\d,.]/g, '').replace(',', '.')) || null;
    }
    const erroItens = await conferirItensAtivos(req.models, itens);
    if (erroItens) return res.status(400).json({ error: erroItens });
    dados.cotas = normalizarCotas(dados.cotas);
    const erroCotas = await conferirCotas(req.models, null, dados.cotas, itens, dados.secretaria);
    if (erroCotas) return res.status(400).json({ error: erroCotas });
    const erroDist = await conferirDistribuicao(req.models, null, itens, dados.secretaria);
    if (erroDist) return res.status(400).json({ error: erroDist });
    const travados = await travarItensNoBanco(req.models, null, itens);
    if (travados.erro) return res.status(400).json({ error: travados.erro });
    const contrato = await Contrato.create(dados);
    await syncItens(ContratoItemVinculo, contrato.id, travados.itens, dados.cotas);
    const itensDoContrato = ContratoItemVinculo ? await ContratoItemVinculo.findAll({ where: { contrato_id: contrato.id }, order: [['ordem', 'ASC']] }) : [];
    res.status(201).json({ ...contrato.toJSON(), itens: itensDoContrato });
    await registrarLog(req, {
      acao: 'criar_contrato',
      modulo: 'contratos',
      descricao: `Contrato criado: ${contrato.numero || contrato.id}`,
      referencia_id: contrato.id,
      referencia_numero: contrato.numero
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'NÃºmero de contrato jÃ¡ cadastrado' });
    }
    console.error('createContrato:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar contrato' });
  }
};

const updateContrato = async (req, res) => {
  try {
    const { Contrato, ContratoItemVinculo } = req.models;
    const contrato = await Contrato.findByPk(req.params.id);
    if (!contrato) return notFound(res, 'Contrato');
    // Contrato concluído (assinado) não se altera — só administradores
    if (contrato.status === 'CONCLUÍDO' && !['admin', 'jeos'].includes(req.user?.tipo)) {
      return res.status(403).json({ error: 'Contrato concluído não pode ser alterado.' });
    }
    const { itens, conclusao: _conclusao, ...dados } = req.body;
    // A conclusão só acontece pelo botão Concluir (POST /contratos/:id/concluir), assinada
    if (dados.status === 'CONCLUÍDO' && contrato.status !== 'CONCLUÍDO') {
      return res.status(400).json({ error: 'Use o botão Concluir para concluir o contrato (com assinatura eletrônica).' });
    }
    if (dados.valor != null && typeof dados.valor === 'string') {
      dados.valor = parseFloat(dados.valor.replace(/[^\d,.]/g, '').replace(',', '.')) || null;
    }
    // Cotas só mudam junto com os itens (a quantidade de cada item depende delas)
    if (itens === undefined) delete dados.cotas;
    else dados.cotas = dados.cotas !== undefined ? normalizarCotas(dados.cotas) : normalizarCotas(contrato.cotas);
    if (itens !== undefined) {
      const jaVinculados = (await ContratoItemVinculo.findAll({ where: { contrato_id: contrato.id }, attributes: ['item_id'], raw: true }))
        .map(v => Number(v.item_id)).filter(Boolean);
      const erroItens = await conferirItensAtivos(req.models, itens, jaVinculados);
      if (erroItens) return res.status(400).json({ error: erroItens });
      const erroCotas = await conferirCotas(req.models, contrato.id, dados.cotas, itens, dados.secretaria !== undefined ? dados.secretaria : contrato.secretaria);
      if (erroCotas) return res.status(400).json({ error: erroCotas });
      const erroDist = await conferirDistribuicao(req.models, contrato.id, itens, dados.secretaria !== undefined ? dados.secretaria : contrato.secretaria);
      if (erroDist) return res.status(400).json({ error: erroDist });
    }
    const travados = itens !== undefined ? await travarItensNoBanco(req.models, contrato.id, itens) : null;
    if (travados?.erro) return res.status(400).json({ error: travados.erro });
    await contrato.update(dados);
    if (itens !== undefined) await syncItens(ContratoItemVinculo, contrato.id, travados.itens, dados.cotas);
    const itensDoContrato = ContratoItemVinculo ? await ContratoItemVinculo.findAll({ where: { contrato_id: contrato.id }, order: [['ordem', 'ASC']] }) : [];
    res.json({ ...contrato.toJSON(), itens: itensDoContrato });
  } catch (err) {
    console.error('updateContrato:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar contrato' });
  }
};

const deleteContrato = async (req, res) => {
  try {
    const { Contrato, ContratoOrdem } = req.models;
    const contrato = await Contrato.findByPk(req.params.id);
    if (!contrato) return notFound(res, 'Contrato');
    if (ContratoOrdem) {
      const totalOrdens = await ContratoOrdem.count({
        where: { contrato_id: contrato.id, status: { [Op.notIn]: ['CANCELADA', 'EXCLUÍDA'] } }
      });
      if (totalOrdens > 0) {
        return res.status(409).json({ error: `Este contrato possui ${totalOrdens} ordem(ns) de compra/servico vinculada(s). Exclua as ordens primeiro.` });
      }
    }

    await registrarExclusao(req, 'contratos', contrato);
    await contrato.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteContrato:', err);
    res.status(500).json({ error: 'Erro ao excluir contrato' });
  }
};

// â”€â”€ SINCRONIZAÃ‡ÃƒO: importa credores dos DIDs para a tabela credores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const syncFromDids = async (req, res) => {
  try {
    const { Credor, Did } = req.models;
    if (!Did) return res.status(400).json({ error: 'Modelo DID nÃ£o disponÃ­vel' });

    // Busca todos os pares credor_sec1 / cnpj_cpf Ãºnicos dos DIDs
    const dids = await Did.findAll({
      attributes: ['credor_sec1', 'cnpj_cpf_credor_sec1'],
      where: { credor_sec1: { [Op.not]: null, [Op.ne]: '' } },
      raw: true,
    });

    // Deduplica por cnpj_cpf (ou por razao_social quando cnpj ausente)
    const vistos = new Set();
    const pares = [];
    for (const d of dids) {
      const nome = (d.credor_sec1 || '').trim();
      const doc  = (d.cnpj_cpf_credor_sec1 || '').replace(/\D/g, '').trim();
      if (!nome) continue;
      const chave = doc || nome.toLowerCase();
      if (!vistos.has(chave)) { vistos.add(chave); pares.push({ nome, doc }); }
    }

    let criados = 0;
    let ignorados = 0;
    const detalhes = [];

    for (const { nome, doc } of pares) {
      // Verifica se jÃ¡ existe (por cnpj ou por razao_social)
      const where = doc
        ? { [Op.or]: [{ cnpj_cpf: doc }, { razao_social: { [Op.iLike]: nome } }] }
        : { razao_social: { [Op.iLike]: nome } };

      const existente = await Credor.findOne({ where });
      if (existente) {
        ignorados++;
        detalhes.push({ acao: 'ignorado', razao_social: nome, motivo: 'jÃ¡ cadastrado' });
        continue;
      }

      // Detecta tipo pela quantidade de dÃ­gitos do CNPJ/CPF
      const tipo = doc.length === 11 ? 'FÃ­sica' : 'JurÃ­dica';
      const cnpj_cpf = doc
        ? (doc.length === 11
            ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
            : doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'))
        : null;

      await Credor.create({ razao_social: nome, tipo, cnpj_cpf });
      criados++;
      detalhes.push({ acao: 'criado', razao_social: nome });
    }

    res.json({ total: pares.length, criados, ignorados, detalhes });
  } catch (err) {
    console.error('syncFromDids:', err);
    res.status(500).json({ error: err.message || 'Erro ao sincronizar credores dos DIDs' });
  }
};


// ── HELPER: parsing de itens de uma resposta (JSON ou HTML) ────────────────
function _parseItensFromResponse(responseData, contentType) {
  const ct = (contentType || '').toLowerCase();

  if (ct.includes('application/json')) {
    let json = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    if (!Array.isArray(json)) return null;
    return json.map(item => ({
      descricao:      (item.descricao || '').toString().toUpperCase().trim(),
      categoria:      item.categoria || 'COMPRAS',
      unidade_medida: (item.unidade_medida || item.unidadeMedida || 'UNIDADE').toUpperCase(),
      especificacao:  item.especificacao || item.detalhes || '',
      catalogo: item.catalogo || '', classificacao: item.classificacao || '',
      subclassificacao: item.subclassificacao || '', catmat_serv: item.catmat_serv || '',
      lote: item.lote || '',
      palavra1: item.palavra1 || '', palavra2: item.palavra2 || '',
      palavra3: item.palavra3 || '', palavra4: item.palavra4 || '',
    }));
  }

  // HTML scraping
  const html = Buffer.isBuffer(responseData)
    ? responseData.toString('utf-8')
    : String(responseData);

  const descs = [];
  const units = [];
  const cats  = [];

  const descRe = /data-title="Descri[^"]*"[^>]*><p[^>]*>\s*([\s\S]*?)\s*<\/p>/gi;
  const unitRe = /data-title="Unid[^"]*"[^>]*><p[^>]*>\s*([\s\S]*?)\s*<\/p>/gi;
  const catRe  = /data-title="Categoria"[^>]*><p[^>]*>\s*([\s\S]*?)\s*<\/p>/gi;

  let m;
  while ((m = descRe.exec(html)) !== null) descs.push(m[1].replace(/<[^>]+>/g, '').trim());
  while ((m = unitRe.exec(html)) !== null) units.push(m[1].replace(/<[^>]+>/g, '').trim());
  while ((m = catRe.exec(html))  !== null)  cats.push(m[1].replace(/<[^>]+>/g, '').trim());

  if (descs.length === 0) return null;

  const mapCat = (c) => {
    const u = (c || '').toUpperCase();
    if (u.includes('MATERIAL')) return 'COMPRAS';
    return 'SERVIÇOS';
  };

  return descs.map((desc, i) => ({
    descricao:      desc.toUpperCase(),
    categoria:      mapCat(cats[i] || ''),
    unidade_medida: (units[i] || 'UNIDADE').toUpperCase(),
    especificacao: '', catalogo: '', classificacao: '', subclassificacao: '',
    catmat_serv: '', lote: '',
    palavra1: '', palavra2: '', palavra3: '', palavra4: '',
  }));
}

// ── VERIFICAR URL (sem inserir — retorna estatísticas) ──────────────────────
const verificarItensUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL não informada' });

    const axios = require('axios');
    const response = await axios.get(url, {
      timeout: 60000,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    const ct = response.headers['content-type'] || 'text/html';
    const candidatos = _parseItensFromResponse(response.data, ct);

    if (!candidatos) {
      return res.status(400).json({ error: 'Não foi possível encontrar itens na página. Verifique se a URL está correta.' });
    }

    const { ContratoItem } = req.models;
    const existentes = await ContratoItem.findAll({
      attributes: ['descricao'],
      where: { status: { [Op.ne]: 'EXCLUÍDO' } },
    });
    const descSet = new Set(existentes.map(i => i.descricao.toUpperCase().trim()));

    let novos = 0, jaExistem = 0;
    for (const item of candidatos) {
      if (!item.descricao || descSet.has(item.descricao)) jaExistem++;
      else novos++;
    }

    res.json({
      total: candidatos.length,
      novos,
      ja_existem: jaExistem,
      amostra: candidatos.slice(0, 3).map(i => i.descricao),
    });
  } catch (err) {
    console.error('verificarItensUrl:', err.message);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(422).json({ error: `URL inacessível: ${err.message}` });
    }
    res.status(500).json({ error: `Erro ao verificar URL: ${err.message}` });
  }
};

// ── IMPORTAR ITENS VIA URL EXTERNA ─────────────────────────────────────────
const importarItensUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL não informada' });

    const axios = require('axios');
    const response = await axios.get(url, {
      timeout: 60000,
      headers: { 'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
                 'User-Agent': 'Mozilla/5.0 (compatible; jProcesso/2.0)' },
      responseType: 'arraybuffer',
    });

    const contentType = response.headers['content-type'] || '';
    const candidatos = _parseItensFromResponse(response.data, contentType);

    if (!candidatos || candidatos.length === 0) {
      return res.status(400).json({ error: 'Não foi possível encontrar itens na página. Verifique se a URL está correta.' });
    }

    // ── Deduplicação ─────────────────────────────────────────────────────────
    const { ContratoItem } = req.models;

    // Carrega todas as descrições existentes de uma vez (O(1) lookup)
    const existentes = await ContratoItem.findAll({
      attributes: ['descricao'],
      where: { status: { [Op.ne]: 'EXCLUÍDO' } },
    });
    const descSet = new Set(existentes.map(i => i.descricao.toUpperCase().trim()));

    // Filtrar e preparar registros novos (sem código — ficam INATIVO até validação)
    const novos = [];
    let ignorados = 0;
    for (const item of candidatos) {
      if (!item.descricao || descSet.has(item.descricao)) { ignorados++; continue; }
      descSet.add(item.descricao);
      novos.push({
        ...item,
        codigo: null,
        status: 'INATIVO',
        validado: false,
      });
    }

    // ── Inserção em lotes de 500 ─────────────────────────────────────────────
    const LOTE = 500;
    for (let i = 0; i < novos.length; i += LOTE) {
      await ContratoItem.bulkCreate(novos.slice(i, i + LOTE));
    }

    res.json({ importados: novos.length, ignorados, total: candidatos.length });
  } catch (err) {
    console.error('importarItensUrl:', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(422).json({ error: `URL inacessível: ${err.message}` });
    }
    if (err.response) {
      return res.status(422).json({ error: `Erro ao acessar URL: status ${err.response.status}` });
    }
    res.status(500).json({ error: `Erro ao importar itens: ${err.message}` });
  }
};

// ── EXCLUIR TODOS OS ITENS INATIVOS ────────────────────────────────────────
const excluirItensInativos = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const { Sequelize } = require('sequelize');
    const alvos = await ContratoItem.findAll({
      where: Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('status')), 'INATIVO'),
    });
    if (alvos.length === 0) return res.json({ excluidos: 0 });
    await registrarExclusao(req, 'itens', alvos);
    const [count] = await ContratoItem.update(
      { status: 'EXCLUÍDO' },
      { where: { id: { [Op.in]: alvos.map(i => i.id) } } }
    );
    res.json({ excluidos: count });
  } catch (err) {
    console.error('excluirItensInativos:', err);
    res.status(500).json({ error: 'Erro ao excluir itens inativos' });
  }
};

// ── HELPER: IDs de itens vinculados a algum contrato ou ordem ──────────────
async function _idsVinculados(models) {
  const { ContratoItemVinculo, ContratoOrdemItem } = models;
  const [vinc, ordens] = await Promise.all([
    ContratoItemVinculo.findAll({ attributes: ['item_id'], where: { item_id: { [Op.not]: null } } }),
    ContratoOrdemItem.findAll({ attributes: ['item_id'], where: { item_id: { [Op.not]: null } } }),
  ]);
  return new Set([...vinc, ...ordens].map(r => r.item_id).filter(Boolean));
}

// ── CONTAR ITENS SEM VÍNCULO ────────────────────────────────────────────────
const contarItensSemVinculo = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const vinculados = await _idsVinculados(req.models);
    const whereClause = {
      status: { [Op.ne]: 'EXCLUÍDO' },
      ...(vinculados.size > 0 ? { id: { [Op.notIn]: [...vinculados] } } : {}),
    };
    const total = await ContratoItem.count({ where: whereClause });
    res.json({ total });
  } catch (err) {
    console.error('contarItensSemVinculo:', err);
    res.status(500).json({ error: 'Erro ao contar itens' });
  }
};

// ── EXCLUIR ITENS SEM VÍNCULO ───────────────────────────────────────────────
const excluirItensSemVinculo = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const vinculados = await _idsVinculados(req.models);
    const whereClause = {
      status: { [Op.ne]: 'EXCLUÍDO' },
      ...(vinculados.size > 0 ? { id: { [Op.notIn]: [...vinculados] } } : {}),
    };
    const alvos = await ContratoItem.findAll({ where: whereClause });
    if (alvos.length === 0) return res.json({ excluidos: 0 });
    await registrarExclusao(req, 'itens', alvos);
    const [count] = await ContratoItem.update(
      { status: 'EXCLUÍDO' },
      { where: { id: { [Op.in]: alvos.map(i => i.id) } } }
    );
    res.json({ excluidos: count });
  } catch (err) {
    console.error('excluirItensSemVinculo:', err);
    res.status(500).json({ error: 'Erro ao excluir itens sem vínculo' });
  }
};

// ── LICITAÇÕES ───────────────────────────────────────────────────────────────

const CAMPOS_LICITACAO = [
  'numero_licitacao', 'numero_processo', 'modalidade', 'tipo_objeto', 'criterio_julgamento',
  'registro_preco', 'objeto', 'secretaria', 'agente_contratacao', 'valor_estimado',
  'valor_homologado', 'data_publicacao', 'data_abertura', 'data_homologacao',
  'link_pncp', 'observacoes', 'status',
];

// Mantém apenas campos conhecidos e converte '' em null (datas/valores vazios)
const sanitizeLicitacao = (body = {}) => {
  const data = {};
  for (const k of CAMPOS_LICITACAO) {
    if (body[k] === undefined) continue;
    data[k] = body[k] === '' ? null : body[k];
  }
  if (data.status === 'EXCLUÍDO') delete data.status;
  return data;
};

const listLicitacoes = async (req, res) => {
  try {
    const { Licitacao, Contrato } = req.models;
    const licitacoes = await Licitacao.findAll({
      where: { status: { [Op.ne]: 'EXCLUÍDO' } },
      order: [['data_abertura', 'DESC NULLS LAST'], ['numero_licitacao', 'DESC']],
      raw: true,
    });

    // Quantidade de contratos vinculados (pelo nº da licitação informado no contrato)
    const contagem = await Contrato.findAll({
      attributes: ['numero_licitacao', [Contrato.sequelize.fn('COUNT', Contrato.sequelize.col('id')), 'total']],
      where: { status: { [Op.ne]: 'EXCLUÍDO' }, numero_licitacao: { [Op.ne]: null } },
      group: ['numero_licitacao'],
      raw: true,
    });
    const porNumero = Object.fromEntries(contagem.map(c => [String(c.numero_licitacao).trim().toUpperCase(), Number(c.total)]));

    res.json(licitacoes.map(l => ({
      ...l,
      total_contratos: porNumero[String(l.numero_licitacao).trim().toUpperCase()] || 0,
    })));
  } catch (err) {
    console.error('listLicitacoes:', err);
    res.status(500).json({ error: 'Erro ao listar licitações' });
  }
};

const createLicitacao = async (req, res) => {
  try {
    const { Licitacao } = req.models;
    const data = sanitizeLicitacao(req.body);
    if (!data.numero_licitacao || !data.objeto) {
      return res.status(400).json({ error: 'Nº da licitação e objeto são obrigatórios' });
    }
    const licitacao = await Licitacao.create(data);
    registrarLog(req, { acao: 'criar_licitacao', modulo: 'contratos', referencia_id: String(licitacao.id), referencia_numero: licitacao.numero_licitacao, descricao: `Licitação ${licitacao.numero_licitacao} cadastrada` });
    res.status(201).json({ ...licitacao.toJSON(), total_contratos: 0 });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Já existe uma licitação com este número' });
    }
    console.error('createLicitacao:', err);
    res.status(500).json({ error: 'Erro ao criar licitação' });
  }
};

const updateLicitacao = async (req, res) => {
  try {
    const { Licitacao } = req.models;
    const licitacao = await Licitacao.findByPk(req.params.id);
    if (!licitacao || licitacao.status === 'EXCLUÍDO') return notFound(res, 'Licitação');
    await licitacao.update(sanitizeLicitacao(req.body));
    registrarLog(req, { acao: 'editar_licitacao', modulo: 'contratos', referencia_id: String(licitacao.id), referencia_numero: licitacao.numero_licitacao, descricao: `Licitação ${licitacao.numero_licitacao} alterada` });
    res.json(licitacao);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Já existe uma licitação com este número' });
    }
    console.error('updateLicitacao:', err);
    res.status(500).json({ error: 'Erro ao atualizar licitação' });
  }
};

const deleteLicitacao = async (req, res) => {
  try {
    const { Licitacao, Contrato } = req.models;
    const licitacao = await Licitacao.findByPk(req.params.id);
    if (!licitacao || licitacao.status === 'EXCLUÍDO') return notFound(res, 'Licitação');
    const totalContratos = await Contrato.count({
      where: { numero_licitacao: licitacao.numero_licitacao, status: { [Op.ne]: 'EXCLUÍDO' } }
    });
    if (totalContratos > 0) {
      return res.status(409).json({ error: `Esta licitação está vinculada a ${totalContratos} contrato(s). Exclua ou desvincule os contratos primeiro.` });
    }
    await registrarExclusao(req, 'licitacoes', licitacao);
    await licitacao.update({ status: 'EXCLUÍDO' });
    registrarLog(req, { acao: 'excluir_licitacao', modulo: 'contratos', referencia_id: String(licitacao.id), referencia_numero: licitacao.numero_licitacao, descricao: `Licitação ${licitacao.numero_licitacao} excluída` });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteLicitacao:', err);
    res.status(500).json({ error: 'Erro ao excluir licitação' });
  }
};

module.exports = {
  listLicitacoes, createLicitacao, updateLicitacao, deleteLicitacao,
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem, getDnaItem,
  importarItensUrl, excluirItensInativos, contarItensSemVinculo, excluirItensSemVinculo, verificarItensUrl,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
};
