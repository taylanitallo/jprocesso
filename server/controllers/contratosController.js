// ─────────────────────────────────────────────────────────────────────────────
//  CONTRATOS CONTROLLER  –  CRUD para Credores, Itens de Catálogo e Contratos
// ─────────────────────────────────────────────────────────────────────────────
const { Op } = require('sequelize');
const https  = require('https');

// ── Helpers ──────────────────────────────────────────────────────────────────

const notFound = (res, entity) => res.status(404).json({ error: `${entity} não encontrado` });

// ── CREDORES ─────────────────────────────────────────────────────────────────

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
      return res.status(409).json({ error: 'CNPJ/CPF já cadastrado' });
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
    await credor.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteCredor:', err);
    res.status(500).json({ error: 'Erro ao excluir credor' });
  }
};

// ── ITENS DE CATÁLOGO ────────────────────────────────────────────────────────

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

const createItem = async (req, res) => {
  try {
    const { ContratoItem } = req.models;
    const item = await ContratoItem.create(req.body);
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
    await item.update(req.body);
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

// ── CONTRATOS ────────────────────────────────────────────────────────────────

const listContratos = async (req, res) => {
  try {
    const { Contrato, Credor, ContratoItemVinculo } = req.models;
    const { status, q } = req.query;

    const where = {};
    if (status) where.status = status;
    if (q) {
      where[Op.or] = [
        { numero_contrato: { [Op.iLike]: `%${q}%` } },
        { objeto: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const contratos = await Contrato.findAll({
      where,
      include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf', 'tipo'] }],
      order: [['numero_contrato', 'ASC']],
    });

    // Busca itens separadamente para evitar conflito de associação multi-tenant
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
      descricao:      String(it.descricao).trim(),
      unidade:        it.unidade || null,
      quantidade:     it.quantidade ? parseFloat(String(it.quantidade).replace(',', '.')) : null,
      valor_unitario: it.valor_unitario ? parseFloat(String(it.valor_unitario).replace(',', '.')) : null,
      // valor_total é GENERATED ALWAYS (quantidade * valor_unitario) — não incluir no INSERT
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
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Número de contrato já cadastrado' });
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
    await contrato.update({ status: 'EXCLUÍDO' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteContrato:', err);
    res.status(500).json({ error: 'Erro ao excluir contrato' });
  }
};

// ── SINCRONIZAÇÃO: importa credores dos DIDs para a tabela credores ────────────
const syncFromDids = async (req, res) => {
  try {
    const { Credor, Did } = req.models;
    if (!Did) return res.status(400).json({ error: 'Modelo DID não disponível' });

    // Busca todos os pares credor_sec1 / cnpj_cpf únicos dos DIDs
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
      // Verifica se já existe (por cnpj ou por razao_social)
      const where = doc
        ? { [Op.or]: [{ cnpj_cpf: doc }, { razao_social: { [Op.iLike]: nome } }] }
        : { razao_social: { [Op.iLike]: nome } };

      const existente = await Credor.findOne({ where });
      if (existente) {
        ignorados++;
        detalhes.push({ acao: 'ignorado', razao_social: nome, motivo: 'já cadastrado' });
        continue;
      }

      // Detecta tipo pela quantidade de dígitos do CNPJ/CPF
      const tipo = doc.length === 11 ? 'Física' : 'Jurídica';
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

// ── IMPORTAÇÃO DO PORTAL DE TRANSPARÊNCIA ───────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + (u.search || ''), headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => { const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => resolve(Buffer.concat(ch).toString('utf8'))); }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function normalizeKey(s) {
  return (s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function parseListPage(html) {
  const itens = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return itens;
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(tbodyMatch[1])) !== null) {
    const row = m[1];
    const idMatch = row.match(/href="\/pmiraucuba\/itens\/(\d+)"/);
    if (!idMatch) continue;
    const getTd = (attr) => {
      const tm = row.match(new RegExp(`data-title="${attr}[^"]*"[^>]*>[\\s\\S]*?<p[^>]*>\\s*([^<]+?)\\s*<\/p>`, 'i'));
      return tm ? tm[1].trim() : '';
    };
    const descricao = getTd('Descri');
    if (!descricao) continue;
    itens.push({ id_externo: idMatch[1], descricao, unidade_medida: getTd('Unid'), categoria: getTd('Categoria') });
  }
  return itens;
}

function parseDetailPage(html) {
  const campos = {};
  const re = /<strong>\s*([^<]+?)\s*:?\s*<\/strong>\s*([^<]*)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const key = normalizeKey(m[1]);
    const val = m[2].trim();
    if (key && val && !campos[key]) campos[key] = val;
  }
  return {
    especificacao:    campos['especificacao']    || '',
    classificacao:    campos['classificacao']    || '',
    subclassificacao: campos['subclassificacao'] || '',
  };
}

async function concurrentPool(items, fn, concurrency) {
  let i = 0;
  const worker = async () => { while (i < items.length) { const idx = i++; await fn(items[idx], idx).catch(() => {}); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

const importarItensTransparencia = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sse = (data) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} if (res.flush) res.flush(); };

  try {
    const { ContratoItem } = req.models;
    const schema = req.tenant?.schema;
    sse({ tipo: 'inicio', msg: 'Conectado. Buscando lista de itens do Portal...' });

    // Garantir que a coluna categoria suporte valores maiores (correção automática)
    try {
      const alterSql = schema
        ? `ALTER TABLE "${schema}".contratos_itens ALTER COLUMN categoria TYPE varchar(100)`
        : `ALTER TABLE contratos_itens ALTER COLUMN categoria TYPE varchar(100)`;
      await req.tenantDb.query(alterSql);
    } catch (e) { /* já era varchar(100) ou maior — não precisa alterar */ }

    const listHtml = await httpGet('https://transparencia.acontratacao.com.br/pmiraucuba/itens');
    const itens = parseListPage(listHtml);

    if (!itens.length) {
      sse({ tipo: 'erro', msg: 'Nenhum item encontrado na página de lista.' });
      return res.end();
    }

    sse({ tipo: 'lista_ok', msg: `${itens.length} itens encontrados. Buscando detalhes (aguarde)...`, total: itens.length });

    let processados = 0;
    let erros = 0;

    await concurrentPool(itens, async (item) => {
      try {
        const html = await httpGet(`https://transparencia.acontratacao.com.br/pmiraucuba/itens/${item.id_externo}`);
        const det = parseDetailPage(html);
        item.especificacao    = det.especificacao;
        item.classificacao    = det.classificacao;
        item.subclassificacao = det.subclassificacao;
      } catch { erros++; }
      processados++;
      if (processados % 50 === 0) sse({ tipo: 'progresso', atual: processados, total: itens.length });
    }, 30);

    sse({ tipo: 'salvando', msg: 'Salvando no banco de dados...', atual: itens.length, total: itens.length });

    const existentesDocs = await ContratoItem.findAll({ attributes: ['descricao'] });
    const descSet = new Set(existentesDocs.map(d => (d.descricao || '').trim().toLowerCase()));
    const novos = itens.filter(it => !descSet.has((it.descricao || '').trim().toLowerCase()));
    const duplicados = itens.length - novos.length;

    const BATCH = 500;
    for (let k = 0; k < novos.length; k += BATCH) {
      await ContratoItem.bulkCreate(
        novos.slice(k, k + BATCH).map(it => ({
          descricao:        it.descricao,
          unidade_medida:   it.unidade_medida   || null,
          categoria:        it.categoria         || null,
          classificacao:    it.classificacao     || null,
          subclassificacao: it.subclassificacao  || null,
          especificacao:    it.especificacao     || null,
          status:           'ATIVO',
          validado:         false,
        })),
        { validate: false }
      );
    }

    sse({ tipo: 'concluido', msg: 'Importação concluída!', importados: novos.length, duplicados, erros, total: itens.length });
  } catch (err) {
    console.error('importarItensTransparencia:', err);
    sse({ tipo: 'erro', msg: err.message || 'Erro desconhecido' });
  }
  res.end();
};

// ── IMPORTAÇÃO CONTRATOS DE IRAUÇUBA ─────────────────────────────────────────

const IRAUCUBA_SECS_NOMES = [
  'AUTARQUIA MUNICIPAL DE MEIO AMBIENTE DE IRAUÇUBA',
  'CONTROLADORIA GERAL DO MUNICÍPIO',
  'GABINETE DO PREFEITO',
  'INSTITUTO DE PREVIDÊNCIA DO MUNICÍPIO DE IRAUÇUBA',
  'PROCURADORIA GERAL JURÍDICA MUNICIPAL',
  'SECRETARIA DA INCLUSÃO E PROMOÇÃO SOCIAL',
  'SECRETARIA DA JUVENTUDE, CULTURA, ESPORTE E LAZER',
  'SECRETARIA DE ADMINISTRAÇÃO',
  'SECRETARIA DE EDUCAÇÃO',
  'SECRETARIA DE FINANÇAS',
  'SECRETARIA DE GOVERNO, PLANEJAMENTO E SEGURANÇA CIDADÃ',
  'SECRETARIA DE INFRAESTRUTURA',
  'SECRETARIA DE SAÚDE',
  'SECRETARIA DO DESENVOLVIMENTO ECONÔMICO',
  'SECRETARIA DO DESENVOLVIMENTO RURAL, MEIO AMBIENTE E RECURSOS HÍDRICOS',
];

function _parseDateBR(s) {
  const m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function _cleanCtHtml(s) {
  return (s || '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function _parseContratosListIraucuba(html) {
  const contratos = [];
  const tbodyM = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyM) return contratos;
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(tbodyM[1])) !== null) {
    const rowHtml = m[0];
    const cells = (rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(c => _cleanCtHtml(c));
    if (cells.length < 5) continue;
    const col0parts = cells[0].trim().split(/\s+/);
    const numero    = col0parts[0] || '';
    const modalidade = col0parts.slice(1).join(' ') || '';
    const cnpjM = cells[1].match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    const cpfM  = cells[1].match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    const docStr = cnpjM ? cnpjM[0] : (cpfM ? cpfM[0] : '');
    const razao_social = docStr ? cells[1].replace(docStr, '').trim() : cells[1].trim();
    const tipo = (cpfM && !cnpjM) ? 'Física' : 'Jurídica';
    let secretaria = '', objeto = cells[2];
    for (const sn of IRAUCUBA_SECS_NOMES) {
      if (cells[2].toUpperCase().startsWith(sn)) {
        secretaria = sn; objeto = cells[2].slice(sn.length).replace(/^\s*NOVO\s*/i, '').trim(); break;
      }
    }
    const dates3 = cells[3].match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    const data_assinatura = dates3[0] ? _parseDateBR(dates3[0]) : null;
    const valorStr = cells[3].replace(/\d{2}\/\d{2}\/\d{4}/g, '').trim();
    const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.')) || null;
    const dates4 = cells[4].match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    const vigencia_inicio = dates4[0] ? _parseDateBR(dates4[0]) : null;
    const vigencia_fim    = dates4[1] ? _parseDateBR(dates4[1]) : null;
    const linkM = rowHtml.match(/contratos\.php\?id=(\d+)/);
    if (!numero) continue;
    contratos.push({ numero, modalidade, razao_social, cnpj_cpf: docStr, tipo, secretaria, objeto, data_assinatura, valor, vigencia_inicio, vigencia_fim, id_externo: linkM ? linkM[1] : null });
  }
  return contratos;
}

const importarContratosIraucuba = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const sse = (data) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} if (res.flush) res.flush(); };
  try {
    const { Contrato, Credor } = req.models;
    sse({ tipo: 'inicio', msg: 'Buscando lista de contratos de iraucuba.ce.gov.br...' });
    const html = await httpGet('https://iraucuba.ce.gov.br/contratos.php');
    const linhas = _parseContratosListIraucuba(html);
    if (!linhas.length) {
      sse({ tipo: 'erro', msg: 'Nenhum contrato encontrado na página.' });
      return res.end();
    }
    sse({ tipo: 'lista_ok', msg: `${linhas.length} contrato(s) encontrado(s). Importando...`, total: linhas.length });
    let criados = 0, duplicados = 0, erros = 0;
    for (let i = 0; i < linhas.length; i++) {
      const ct = linhas[i];
      sse({ tipo: 'progresso', atual: i + 1, total: linhas.length });
      try {
        let credor = null;
        if (ct.cnpj_cpf) {
          credor = await Credor.findOne({ where: { cnpj_cpf: ct.cnpj_cpf } });
          if (!credor && ct.razao_social) {
            credor = await Credor.create({ razao_social: ct.razao_social, cnpj_cpf: ct.cnpj_cpf, tipo: ct.tipo, status: 'ATIVO' });
          }
        } else if (ct.razao_social) {
          credor = await Credor.findOne({ where: { razao_social: { [Op.iLike]: ct.razao_social } } });
          if (!credor) credor = await Credor.create({ razao_social: ct.razao_social, cnpj_cpf: ct.razao_social.slice(0, 20), tipo: ct.tipo, status: 'ATIVO' });
        }
        const existente = await Contrato.findOne({ where: { numero_contrato: ct.numero } });
        if (existente) { duplicados++; continue; }
        const tipoContrato = /adit/i.test(ct.modalidade) ? 'ADITIVO' : 'CONTRATO';
        await Contrato.create({
          tipo_contrato: tipoContrato,
          numero_contrato: ct.numero,
          objeto: ct.objeto || 'Sem descrição',
          modalidade: ct.modalidade || null,
          credor_id: credor?.id || null,
          valor: ct.valor,
          vigencia_inicio: ct.vigencia_inicio,
          vigencia_fim: ct.vigencia_fim,
          data_assinatura: ct.data_assinatura,
          secretaria: ct.secretaria || null,
          status: 'ATIVO',
        });
        criados++;
      } catch (err) {
        erros++;
        const errMsg = err.message || String(err);
        console.error(`importarContratosIraucuba linha=${i}:`, errMsg);
        sse({ tipo: 'detalhe', msg: `❌ ${ct.numero || '?'}: ${errMsg}` });
      }
    }
    sse({ tipo: 'concluido', msg: 'Importação concluída!', criados, duplicados, erros, total: linhas.length });
  } catch (err) {
    console.error('importarContratosIraucuba:', err);
    sse({ tipo: 'erro', msg: err.message || 'Erro desconhecido' });
  }
  res.end();
};

module.exports = {
  listCredores, createCredor, updateCredor, deleteCredor,
  listItens, createItem, updateItem, deleteItem,
  listContratos, createContrato, updateContrato, deleteContrato,
  syncFromDids,
  importarItensTransparencia,
  importarContratosIraucuba,
};
