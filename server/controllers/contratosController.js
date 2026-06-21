// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  CONTRATOS CONTROLLER  â€“  CRUD para Credores, Itens de CatÃ¡logo e Contratos
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { Op } = require('sequelize');
const { registrarLog } = require('../middleware/activityLogger');

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const notFound = (res, entity) => res.status(404).json({ error: `${entity} nÃ£o encontrado` });

// â”€â”€ CREDORES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const listCredores = async (req, res) => {
  try {
    const { Credor } = req.models;
    const { status, q } = req.query;

    const where = {};
    if (status) where.status = status;
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
    const { Credor } = req.models;
    const credor = await Credor.findByPk(req.params.id);
    if (!credor) return notFound(res, 'Credor');
    await credor.update({ status: 'EXCLUÃDO' });
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
    const { ContratoItem } = req.models;
    const item = await ContratoItem.findByPk(req.params.id);
    if (!item) return notFound(res, 'Item');
    await item.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteItem:', err);
    res.status(500).json({ error: 'Erro ao excluir item' });
  }
};

// â”€â”€ CONTRATOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const listContratos = async (req, res) => {
  try {
    const { Contrato, Credor, ContratoItemVinculo, Secretaria } = req.models;
    const { status, q } = req.query;

    const where = {};
    if (status) where.status = status;
    if (q) {
      where[Op.or] = [
        { numero_contrato: { [Op.iLike]: `%${q}%` } },
        { objeto: { [Op.iLike]: `%${q}%` } },
      ];
    }
    // Restringe ao usuÃ¡rio nÃ£o-admin a apenas sua secretaria
    if (req.user.tipo !== 'admin' && req.user.secretariaId && Secretaria) {
      const sec = await Secretaria.findByPk(req.user.secretariaId, { attributes: ['nome'] });
      if (sec) where.secretaria = sec.nome;
    }

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
  const rows = itens
    .filter(it => it.descricao && String(it.descricao).trim())
    .map((it, idx) => ({
      contrato_id:    contratoId,
      item_id:        it.item_id || null,
      lote:           it.lote || null,
      codigo_item:    it.codigo_item || null,
      descricao:      String(it.descricao).trim(),
      unidade:        it.unidade || null,
      quantidade:     it.quantidade ? parseFloat(String(it.quantidade).replace(',', '.')) : null,
      valor_unitario: it.valor_unitario ? parseFloat(String(it.valor_unitario).replace(',', '.')) : null,
      // valor_total Ã© GENERATED ALWAYS (quantidade * valor_unitario) â€” nÃ£o incluir no INSERT
      ordem:          idx,
    }));
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
    const { Contrato } = req.models;
    const contrato = await Contrato.findByPk(req.params.id);
    if (!contrato) return notFound(res, 'Contrato');
    await contrato.update({ status: 'EXCLUÃDO' });
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


// ── IMPORTAR ITENS VIA URL EXTERNA ─────────────────────────────────────────
const importarItensUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL não informada' });

    const axios = require('axios');
    const { data } = await axios.get(url, { timeout: 30000 });

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'A URL deve retornar um array JSON de itens' });
    }

    const { ContratoItem } = req.models;
    const ultimo = await ContratoItem.findOne({
      order: [['codigo', 'DESC']],
      where: { codigo: { [Op.not]: null } },
    });
    let proxNum = ultimo ? (parseInt(ultimo.codigo, 10) || 0) + 1 : 1;

    let importados = 0;
    let ignorados = 0;

    for (const item of data) {
      if (!item.descricao) { ignorados++; continue; }
      const descNorm = item.descricao.toString().toUpperCase().trim();
      const existe = await ContratoItem.findOne({
        where: { descricao: descNorm, status: { [Op.ne]: 'EXCLUÍDO' } },
      });
      if (existe) { ignorados++; continue; }

      const codigo = String(proxNum).padStart(5, '0');
      proxNum++;

      await ContratoItem.create({
        descricao:        descNorm,
        categoria:        item.categoria || 'COMPRAS',
        unidade_medida:   item.unidade_medida || item.unidadeMedida || 'UNIDADE',
        codigo,
        especificacao:    item.especificacao || item.detalhes || '',
        palavra1:         item.palavra1 || '',
        palavra2:         item.palavra2 || '',
        palavra3:         item.palavra3 || '',
        palavra4:         item.palavra4 || '',
        catalogo:         item.catalogo || '',
        classificacao:    item.classificacao || '',
        subclassificacao: item.subclassificacao || '',
        catmat_serv:      item.catmat_serv || item.catmatServ || '',
        lote:             item.lote || '',
        status:           'ATIVO',
        validado:         false,
      });
      importados++;
    }

    res.json({ importados, ignorados, total: data.length });
  } catch (err) {
    console.error('importarItensUrl:', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(422).json({ error: `URL inacessível: ${err.message}` });
    }
    if (err.response) {
      return res.status(422).json({ error: `Erro ao acessar URL: status ${err.response.status}` });
    }
    res.status(500).json({ error: 'Erro ao importar itens' });
  }
};

// ── EXCLUIR TODOS OS ITENS INATIVOS ────────────────────────────────────────
const excluirItensInativos = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const [count] = await ContratoItem.update(
      { status: 'EXCLUÍDO' },
      { where: { status: 'INATIVO' } }
    );
    res.json({ excluidos: count });
  } catch (err) {
    console.error('excluirItensInativos:', err);
    res.status(500).json({ error: 'Erro ao excluir itens inativos' });
  }
};

module.exports = {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem,
  importarItensUrl, excluirItensInativos,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
};
