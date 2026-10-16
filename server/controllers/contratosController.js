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

const createCredor = async (req, res) => {
  try {
    const { Credor } = req.models;
    const credor = await Credor.create(req.body);
    res.status(201).json(credor);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'CNPJ/CPF jÃ¡ cadastrado' });
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
    await credor.update(req.body);
    res.json(credor);
  } catch (err) {
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

// Retorna status automático: ativo se categoria estiver preenchida (código é sempre gerado automaticamente)
const calcStatusItem = (data) => {
  const categoria = (data.categoria || '').trim();
  return categoria ? 'ATIVO' : 'INATIVO';
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

// Salva/substitui os itens vinculados ao contrato
const syncItens = async (ContratoItemVinculo, contratoId, itens) => {
  await ContratoItemVinculo.destroy({ where: { contrato_id: contratoId } });
  if (!Array.isArray(itens) || itens.length === 0) return;
  const num = (v) => (v === undefined || v === null || v === '') ? null : parseFloat(String(v).replace(',', '.'));
  const rows = itens
    .filter(it => it.descricao && String(it.descricao).trim())
    .map((it, idx) => {
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
        // valor_total é GENERATED ALWAYS (quantidade * valor_unitario) — não incluir no INSERT
        ordem:          idx,
      };
    });
  if (rows.length) await ContratoItemVinculo.bulkCreate(rows);
};

const createContrato = async (req, res) => {
  try {
    const { Contrato, ContratoItemVinculo } = req.models;
    const { itens, ...dados } = req.body;
    if (dados.valor != null && typeof dados.valor === 'string') {
      dados.valor = parseFloat(dados.valor.replace(/[^\d,.]/g, '').replace(',', '.')) || null;
    }
    const contrato = await Contrato.create(dados);
    await syncItens(ContratoItemVinculo, contrato.id, itens);
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
    const { itens, ...dados } = req.body;
    if (dados.valor != null && typeof dados.valor === 'string') {
      dados.valor = parseFloat(dados.valor.replace(/[^\d,.]/g, '').replace(',', '.')) || null;
    }
    await contrato.update(dados);
    if (itens !== undefined) await syncItens(ContratoItemVinculo, contrato.id, itens);
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
