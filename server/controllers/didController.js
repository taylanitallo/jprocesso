const { Op } = require('sequelize');
const path = require('path');
const storage = require('../services/storageService');
const etapasSvc = require('../services/didEtapasService');
const blocos = require('../config/didBlocos');
const { registrarLog } = require('../middleware/activityLogger');
const { AssinaturaError } = require('../services/assinaturaService');
// Mesma assinatura eletrônica dos atos de tramitação
const { validarAssinante, assinarTramitacao, responderErroAssinatura } = require('./processoController');

const migratedSchemas = new Set();
async function ensureDidColumns(req) {
  const schema = req.tenant?.schema;
  if (!schema || migratedSchemas.has(schema)) return;
  const { Did } = req.models;
  await Did.sequelize.query(
    `ALTER TABLE IF EXISTS "${schema}"."dids" ADD COLUMN IF NOT EXISTS "conta_pagamento_id" UUID;`
  );
  migratedSchemas.add(schema);
}

const getByProcesso = async (req, res) => {
  try {
    await ensureDidColumns(req);
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

    // Inclui valor_total da ordem de compra vinculada para preencher valor_bruto na Tesouraria
    if (did.ordem_compra_id) {
      try {
        const { ContratoOrdem } = req.models;
        const ordem = await ContratoOrdem.findByPk(did.ordem_compra_id, {
          attributes: ['id', 'numero', 'valor_total'],
        });
        if (ordem) did.dataValues.ordem_valor_total = parseFloat(ordem.valor_total) || 0;
      } catch (_) {}
    }

    // Retroativamente atribui numero_did para registros antigos com o campo nulo
    if (!did.numero_did) {
      const pos = await Did.count({ where: { createdAt: { [Op.lt]: did.createdAt } }, paranoid: false });
      const numero = String(pos + 1);
      await did.update({ numero_did: numero });
      did.dataValues.numero_did = numero;
    }

    res.json({ did });
  } catch (err) {
    console.error('Erro getByProcesso DID:', err);
    res.status(500).json({ error: err.message });
  }
};

const NUMERIC_FIELDS = [
  'valor_did', 'nf_valor', 'valor_bruto',
  'desconto_inss', 'desconto_iss', 'desconto_irrf', 'desconto_sindicato',
  'desconto_bb', 'desconto_caixa', 'desconto_pensao', 'desconto_outros',
  'ordem_compra_id', 'conta_pagamento_id'
];

const ENUM_FIELDS = ['tipo_did', 'tipo_empenho', 'status'];

const DATE_FIELDS = [
  'data_did', 'ci_recebido_em', 'compras_recebido_em', 'data_compras',
  'data_empenho', 'data_liquidacao', 'contabil_recebido_em',
  'financas_recebido_em', 'financas2_recebido_em', 'financas2_enviado_pagamento',
  'tesouraria_recebido_em', 'data_pagamento', 'receb_data', 'receb_nf_data', 'receb_nf_enviado_compras',
  // Compras 2 (Solicitação Empenho — Contas Variáveis)
  'compras2_recebido_em', 'compras2_data',
  // Compras 3 (Ateste NF — Contas Variáveis)
  'compras3_recebido_em', 'compras3_data', 'compras3_local_entrega',
  // Contabilidade Pós Compras (Liquidação — Contas Variáveis)
  'contabil_pc_recebido_em', 'contabil_pc_data_empenho', 'contabil_pc_data_liquidacao'
];

const sanitizeBody = (body) => {
  const cleaned = { ...body };
  // Recolhimento das retenções é da Tesouraria (retencoesController), não do formulário
  delete cleaned.retencoes_recolhidas_em;
  // Só normaliza o que veio no corpo: campo ausente fica como está no banco
  // (salvamentos por etapa mandam apenas os campos da etapa)
  for (const field of [...NUMERIC_FIELDS, ...ENUM_FIELDS]) {
    if (field in cleaned && (cleaned[field] === '' || cleaned[field] === undefined)) {
      cleaned[field] = null;
    }
  }
  for (const field of DATE_FIELDS) {
    if (field in cleaned && (!cleaned[field] || cleaned[field] === 'Invalid date')) {
      cleaned[field] = null;
    }
  }
  // Pago sem data: o débito precisa de uma data para entrar no extrato da conta
  if (cleaned.pago === 'sim' && !cleaned.data_pagamento) {
    cleaned.data_pagamento = cleaned.tesouraria_recebido_em || new Date().toISOString().slice(0, 10);
  }
  return cleaned;
};

const createOrUpdate = async (req, res) => {
  try {
    await ensureDidColumns(req);
    const { processoId } = req.params;
    const { Did, Processo, Setor, Secretaria } = req.models;
    let body = sanitizeBody(req.body);

    let did = await Did.findOne({ where: { processo_id: processoId } });

    // Fluxo por etapas: só quem pode a etapa atual salva, e só os campos dela.
    // DID novo nasce com a foto do fluxo atual do município para o tipo escolhido.
    const processo = await Processo.findByPk(processoId);
    const tipoNovo = body.tipo_did === 'variaveis' ? 'variaveis' : 'fixas';
    const base = did || { tipo_did: tipoNovo, etapas: {}, fluxo: etapasSvc.fotoDoFluxo(req.tenant, tipoNovo) };
    const { atual, permissao } = await etapasSvc.situacao(req, base, processo);
    if (!atual) return res.status(409).json({ error: 'Todas as etapas deste DID estão concluídas.' });
    if (!permissao.pode) return res.status(403).json({ error: permissao.motivo, codigo: permissao.codigo });
    const itensDid = body.itens_did;
    const personalizados = etapasSvc.dadosPersonalizados(atual, did, body);
    body = etapasSvc.filtrarCampos(atual, body);
    if (atual.bloco === 'abertura' && itensDid) body.itens_did = itensDid;
    if (personalizados) body.etapas_dados = personalizados;
    // Troca de tipo durante a Abertura: o DID passa a seguir o fluxo do novo tipo
    if (did && atual.bloco === 'abertura' && body.tipo_did && body.tipo_did !== did.tipo_did) {
      body.fluxo = etapasSvc.fotoDoFluxo(req.tenant, body.tipo_did === 'variaveis' ? 'variaveis' : 'fixas');
      body.etapas = {};
    }

    if (!did) {
      // Usa o numero_did fornecido (gerado no início do processo) ou calcula
      // a partir da sequência própria da secretaria do processo.
      let numeroDid = body.numero_did ? String(body.numero_did).trim() : '';
      if (!numeroDid) {
        const { formatado } = await resolverProximoNumeroDid(req, { processoId });
        numeroDid = formatado;
      }
      did = await Did.create({
        ...body,
        processo_id: processoId,
        numero_did: numeroDid,
        criado_por_id: req.user.id,
        etapas: {}, // DID novo já nasce no fluxo por etapas
        fluxo: base.fluxo,
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

    res.json({ did: didAtualizado || did });
  } catch (err) {
    console.error('Erro createOrUpdate DID:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Etapas do DID ────────────────────────────────────────────────────────────
const responderEtapaErro = (res, err, msg) => {
  if (err instanceof etapasSvc.EtapaErro) {
    return res.status(err.status).json({ error: err.message, codigo: err.codigo, faltando: err.faltando });
  }
  if (err instanceof AssinaturaError) return responderErroAssinatura(res, err);
  console.error(msg, err);
  res.status(500).json({ error: msg });
};

// Linha de etapas: status, etapa atual, se o usuário pode preenchê-la e por quê
const getEtapas = async (req, res) => {
  try {
    const { Did, Processo } = req.models;
    const processo = req.params.processoId === 'novo' ? null : await Processo.findByPk(req.params.processoId);
    const did = processo ? await Did.findOne({ where: { processo_id: processo.id } }) : null;
    const tipo = req.query.tipo === 'variaveis' ? 'variaveis' : 'fixas';
    // Sem DID ainda (ou Abertura trocando de tipo): mostra o fluxo atual do município
    const base = did && (!req.query.tipo || did.tipo_did === tipo)
      ? did
      : { tipo_did: tipo, etapas: {}, fluxo: etapasSvc.fotoDoFluxo(req.tenant, tipo) };
    res.json(await etapasSvc.resumo(req, base, processo));
  } catch (err) {
    responderEtapaErro(res, err, 'Erro ao carregar as etapas do DID');
  }
};

// Assinatura do ato: valida senha + código do app e assina a tramitação
const assinadorEtapa = (req) => ({
  validar: (transaction, usuario) => validarAssinante(req, usuario, transaction),
  assinar: (transaction, processo, tramitacao, usuario) => assinarTramitacao(req, transaction, processo, tramitacao, usuario),
});

const concluirEtapa = async (req, res) => {
  try {
    const { did, etapa, proxima, assinatura } = await etapasSvc.concluir(req, {
      processoId: req.params.processoId, etapaId: req.params.etapa, body: sanitizeBody(req.body), ...assinadorEtapa(req),
    });
    await registrarLog(req, {
      acao: 'did_concluir_etapa',
      modulo: 'processos',
      descricao: `DID ${did.numero_did} — ${etapa.titulo} concluída e assinada`,
      referencia_id: req.params.processoId,
    });
    res.json({ ok: true, etapa: etapa.titulo, proxima: proxima?.titulo || null, assinatura });
  } catch (err) {
    responderEtapaErro(res, err, 'Erro ao concluir a etapa');
  }
};

const devolverEtapa = async (req, res) => {
  try {
    const { anterior, assinatura } = await etapasSvc.devolver(req, {
      processoId: req.params.processoId, etapaId: req.params.etapa, justificativa: req.body?.justificativa, ...assinadorEtapa(req),
    });
    await registrarLog(req, {
      acao: 'did_devolver_etapa',
      modulo: 'processos',
      descricao: `DID devolvido para a ${anterior.titulo}`,
      referencia_id: req.params.processoId,
    });
    res.json({ ok: true, anterior: anterior.titulo, assinatura });
  } catch (err) {
    responderEtapaErro(res, err, 'Erro ao devolver a etapa');
  }
};

// ─── Configuração do fluxo (Configurações › Fluxos de Processo) ──────────────
const TIPOS_DID = ['fixas', 'variaveis'];

const getFluxos = async (req, res) => {
  try {
    const catalogo = Object.entries(blocos.BLOCOS).map(([key, b]) => ({
      key, nome: b.nome, tipos: b.tipos, fixo: !!b.fixo, ultimo: !!b.ultimo, conflita: b.conflita || [],
      sugerido: b.sugestao === 'todas' ? 'todas' : null,
      campos: Object.fromEntries(TIPOS_DID.map(t => [t, blocos.camposDoBloco(key, t).map(c => ({
        campo: c.campo, rotulo: c.rotulo, travado: !!c.travado, opcionalPadrao: !!c.opcionalPadrao,
      }))])),
    }));
    const setores = await etapasSvc.carregarSetores(req);
    // Setores que a sugestão automática escolheria para cada bloco (para mostrar na tela)
    const sugestoes = Object.fromEntries(Object.entries(blocos.BLOCOS).map(([key, b]) =>
      [key, b.sugestao === 'todas' ? 'todas' : etapasSvc.sugerirSetores(b.sugestao, setores)]));
    const conf = req.tenant?.configuracoes || {};
    res.json({
      catalogo,
      sugestoes,
      tiposCampo: blocos.TIPOS_CAMPO_PERSONALIZADO,
      fluxos: Object.fromEntries(TIPOS_DID.map(t => [t, etapasSvc.fluxoConfigurado(req.tenant, t)])),
      padrao: Object.fromEntries(TIPOS_DID.map(t => [t, blocos.fluxoPadrao(t)])),
      historico: conf.did_fluxos_historico || { fixas: [], variaveis: [] },
    });
  } catch (err) {
    console.error('getFluxos:', err);
    res.status(500).json({ error: 'Erro ao carregar os fluxos' });
  }
};

// body: { etapas } · { etapas, somenteValidar: true } · { restaurarPadrao: true }
const salvarFluxo = async (req, res) => {
  try {
    if (!['admin', 'jeos'].includes(req.user?.tipo)) {
      return res.status(403).json({ error: 'Só administradores alteram os fluxos de processo.' });
    }
    const tipo = req.params.tipo;
    if (!TIPOS_DID.includes(tipo)) return res.status(404).json({ error: 'Tipo de fluxo desconhecido.' });

    const tenant = req.tenant;
    const conf = tenant.configuracoes || {};
    const anterior = conf.did_fluxos?.[tipo] || null;
    const autor = await etapasSvc.usuarioCompleto(req);
    const carimbo = { atualizado_em: new Date().toISOString(), atualizado_por: autor ? { id: autor.id, nome: autor.nome } : null };

    let novo;
    if (req.body?.restaurarPadrao) {
      novo = null; // sem configuração = fluxo padrão
    } else {
      const etapas = etapasSvc.normalizarFluxo(req.body?.etapas);
      const setores = await etapasSvc.carregarSetores(req);
      const { erros, avisos } = blocos.validarFluxo(tipo, etapas, new Set(setores.map(s => s.id)));
      // Validação ao vivo da tela: só responde, não grava
      if (req.body?.somenteValidar) return res.json({ erros, avisos });
      if (erros.length) return res.status(400).json({ error: 'O fluxo tem erros e não foi salvo.', erros, avisos });
      novo = { versao: (anterior?.versao || 0) + 1, ...carimbo, etapas };
    }

    // Histórico: guarda a versão que está saindo (últimas 20)
    const historico = { fixas: [], variaveis: [], ...(conf.did_fluxos_historico || {}) };
    if (anterior) historico[tipo] = [{ ...anterior, substituida_em: carimbo.atualizado_em, substituida_por: carimbo.atualizado_por }, ...(historico[tipo] || [])].slice(0, 20);

    const didFluxos = { ...(conf.did_fluxos || {}) };
    if (novo) didFluxos[tipo] = novo; else delete didFluxos[tipo];
    // A aba antiga guardava só setores por posição: o fluxo novo já os incorporou
    const didEtapas = { ...(conf.did_etapas || {}) };
    delete didEtapas[tipo];

    await tenant.update({ configuracoes: { ...conf, did_fluxos: didFluxos, did_fluxos_historico: historico, did_etapas: didEtapas } });
    await registrarLog(req, {
      acao: 'configurar_fluxo_did',
      modulo: 'configuracoes',
      descricao: novo
        ? `Fluxo do DID ${tipo === 'fixas' ? 'Contas Fixas' : 'Contas Variáveis'} salvo (versão ${novo.versao}, ${novo.etapas.length} etapas)`
        : `Fluxo do DID ${tipo === 'fixas' ? 'Contas Fixas' : 'Contas Variáveis'} restaurado para o padrão`,
    });
    res.json({ ok: true, fluxo: etapasSvc.fluxoConfigurado(tenant, tipo) });
  } catch (err) {
    console.error('salvarFluxo:', err);
    res.status(500).json({ error: 'Erro ao salvar o fluxo' });
  }
};

module.exports = {
  getByProcesso, createOrUpdate, getProximoNumero, getEstoque, getAlmEstoque, uploadCertidao, downloadCertidaoUrl, deleteCertidao,
  getEtapas, concluirEtapa, devolverEtapa, getFluxos, salvarFluxo,
};

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

// ─── Numeração de DID por secretaria ──────────────────────────────────────
// Cada secretaria tem sua própria sequência (ex: SEJUV-001, SEAD-001, ...),
// contando apenas os DIDs já registrados com aquela secretaria.
async function resolverProximoNumeroDid(req, { secretariaId, secretariaNomeOuSigla, processoId } = {}) {
  const { Did, Secretaria, Processo, Setor } = req.models;
  let sigla = '';
  let nomeFiltro = null;

  if (secretariaId && Secretaria) {
    const sec = await Secretaria.findByPk(secretariaId);
    if (sec) { sigla = sec.sigla || ''; nomeFiltro = sec.nome; }
  }
  if (!nomeFiltro && secretariaNomeOuSigla && Secretaria) {
    const sec = await Secretaria.findOne({
      where: { [Op.or]: [{ nome: secretariaNomeOuSigla }, { sigla: secretariaNomeOuSigla }] }
    });
    if (sec) { sigla = sec.sigla || ''; nomeFiltro = sec.nome; }
    else nomeFiltro = secretariaNomeOuSigla;
  }
  if (!nomeFiltro && processoId && processoId !== 'novo' && Processo && Setor && Secretaria) {
    const processo = await Processo.findByPk(processoId, {
      include: [{ model: Setor, as: 'setorAtual', include: [{ model: Secretaria, as: 'secretaria' }] }]
    });
    const sec = processo?.setorAtual?.secretaria;
    if (sec) { sigla = sec.sigla || ''; nomeFiltro = sec.nome; }
  }

  const where = nomeFiltro ? { secretaria_sec1: nomeFiltro } : {};
  // Conta também os excluídos: número de DID não é reaproveitado
  const count = await Did.count({ where, paranoid: false });
  const proximo = count + 1;
  const formatado = sigla ? `${sigla}-${String(proximo).padStart(3, '0')}` : String(proximo);
  return { proximo, sigla, formatado };
}

async function getProximoNumero(req, res) {
  try {
    const { secretariaId, secretaria } = req.query;
    const resultado = await resolverProximoNumeroDid(req, { secretariaId, secretariaNomeOuSigla: secretaria });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const CERT_KEYS = ['municipal', 'trabalhista', 'fgts', 'estadual', 'federal', 'simples_nac'];

async function uploadCertidao(req, res) {
  try {
    const { processoId, certKey } = req.params;
    if (!CERT_KEYS.includes(certKey)) return res.status(400).json({ error: 'Chave de certidão inválida.' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const { Did } = req.models;
    const did = await Did.findOne({ where: { processo_id: processoId } });
    if (!did) return res.status(404).json({ error: 'DID não encontrado.' });

    const ext = path.extname(req.file.originalname);
    const storagePath = `${req.tenant.schema}/dids/${did.id}/cert_${certKey}${ext}`;

    // upsert: true para permitir re-upload da mesma certidão
    await storage.uploadArquivo({
      buffer: req.file.buffer,
      path: storagePath,
      contentType: req.file.mimetype,
    });

    const arquivos = { ...(did.cert_sec1_arquivos || {}), [certKey]: { nome: req.file.originalname, path: storagePath } };
    // Forçar detecção da mudança no campo JSONB pelo Sequelize
    did.cert_sec1_arquivos = arquivos;
    did.changed('cert_sec1_arquivos', true);
    await did.save();

    res.json({ cert_sec1_arquivos: arquivos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function downloadCertidaoUrl(req, res) {
  try {
    const { processoId, certKey } = req.params;
    const { Did } = req.models;
    const did = await Did.findOne({ where: { processo_id: processoId } });
    if (!did) return res.status(404).json({ error: 'DID não encontrado.' });

    const arq = (did.cert_sec1_arquivos || {})[certKey];
    if (!arq?.path) return res.status(404).json({ error: 'Arquivo não encontrado.' });

    const url = await storage.createSignedUrl(arq.path, 120);
    res.json({ url, nome: arq.nome });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteCertidao(req, res) {
  try {
    const { processoId, certKey } = req.params;
    const { Did } = req.models;
    const did = await Did.findOne({ where: { processo_id: processoId } });
    if (!did) return res.status(404).json({ error: 'DID não encontrado.' });

    const arquivos = { ...(did.cert_sec1_arquivos || {}) };
    const arq = arquivos[certKey];
    if (arq?.path) {
      try { await storage.deleteDocumento(arq.path); } catch (_) {}
    }
    delete arquivos[certKey];
    await did.update({ cert_sec1_arquivos: arquivos });

    res.json({ cert_sec1_arquivos: arquivos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
