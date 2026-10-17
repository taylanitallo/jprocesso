// ─────────────────────────────────────────────────────────────────────────────
//  FLUXO DO DID POR ETAPAS
//
//  A sequência vem do fluxo configurado pelo município (Configurações › Fluxos de
//  Processo; catálogo em config/didBlocos.js). Cada DID guarda a "foto" do fluxo
//  com que foi aberto (dids.fluxo) e segue com ela; DIDs anteriores usam o fluxo
//  padrão (a sequência que o sistema tinha). Os setores de cada etapa, porém,
//  vêm da configuração atual quando a etapa ainda existe nela — corrigir um setor
//  vale também para quem está no meio do caminho.
//
//  Quem preenche a etapa atual:
//    1. a anterior está concluída (etapa atual = primeira não concluída);
//    2. o usuário é de um setor da etapa;
//    3. o processo está no setor do usuário e já foi recebido — e, se foi
//       enviado a uma pessoa, é essa pessoa.
//  Concluir grava só os campos da etapa, exige os obrigatórios configurados,
//  carimba responsável e data de recebimento e assina o ato.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const { Op } = require('sequelize');
const cat = require('../config/didBlocos');
const { situacaoRecebimento } = require('../utils/recebimento');

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tipoDe = (did) => (did?.tipo_did === 'variaveis' ? 'variaveis' : 'fixas');

class EtapaErro extends Error {
  constructor(msg, status = 400, extra = {}) { super(msg); this.status = status; Object.assign(this, extra); }
}

// ── Configuração do município ────────────────────────────────────────────────

/**
 * Fluxo atual do município para o tipo. Sem configuração, o padrão — com os
 * setores que já tivessem sido escolhidos na aba antiga "Fluxo do DID".
 */
function fluxoConfigurado(tenant, tipo) {
  const conf = tenant?.configuracoes?.did_fluxos?.[tipo];
  if (conf?.etapas?.length) return { ...conf, configurado: true };
  const base = cat.fluxoPadrao(tipo);
  const antigo = tenant?.configuracoes?.did_etapas?.[tipo]; // { "2": { setores } } por posição
  if (antigo) {
    base.etapas.forEach((e, i) => {
      const c = antigo[String(i + 1)];
      if (c?.setores?.length) { e.setores = c.setores; e.todos = false; }
    });
  }
  return { ...base, configurado: false };
}

/** Foto do fluxo que vai para um DID novo */
const fotoDoFluxo = (tenant, tipo) => {
  const f = fluxoConfigurado(tenant, tipo);
  return { tipo, versao: f.versao || 0, etapas: f.etapas };
};

/** Fluxo que este DID segue: a foto dele, ou o padrão para DIDs anteriores */
const fluxoDoDid = (did) => (did?.fluxo?.etapas?.length ? did.fluxo : { ...cat.fluxoPadrao(tipoDe(did)), tipo: tipoDe(did) });

// ── Setores ──────────────────────────────────────────────────────────────────

/** Sugestão pelo nome: setor que casa; senão gabinete da secretaria; senão a secretaria toda */
function sugerirSetores(sugestao, setores) {
  if (!sugestao || sugestao === 'todas') return setores.map(s => s.id);
  const casa = (txt, palavras) => palavras.some(p => norm(txt).includes(norm(p)));
  const porSetor = setores.filter(s => casa(`${s.nome} ${s.sigla || ''}`, sugestao.setor || []));
  if (porSetor.length) return porSetor.map(s => s.id);
  const daSecretaria = setores.filter(s => s.secretaria && casa(`${s.secretaria.nome} ${s.secretaria.sigla || ''}`, sugestao.secretaria || []));
  if (sugestao.gabinete) {
    const gabinetes = daSecretaria.filter(s => norm(s.nome).includes('gabinete'));
    if (gabinetes.length) return gabinetes.map(s => s.id);
  }
  return daSecretaria.map(s => s.id);
}

async function carregarSetores(req) {
  if (req._didSetores) return req._didSetores;
  const { Setor, Secretaria } = req.models;
  const setores = await Setor.findAll({
    where: { ativo: true, excluido_em: null },
    attributes: ['id', 'nome', 'sigla', 'secretariaId'],
    include: [{ model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] }],
    order: [['nome', 'ASC']],
  });
  req._didSetores = setores.map(s => s.toJSON());
  return req._didSetores;
}

/** Setores efetivos de uma etapa: todos · escolhidos · sugestão pelo nome */
function setoresDaEtapa(etapa, setores) {
  if (etapa.todos) return { ids: setores.map(s => s.id), todos: true, sugerido: false };
  const escolhidos = Array.isArray(etapa.setores) ? etapa.setores.filter(id => setores.some(s => s.id === id)) : [];
  if (escolhidos.length) return { ids: escolhidos, todos: false, sugerido: false };
  if (etapa.bloco === 'personalizada') return { ids: [], todos: false, sugerido: false };
  return { ids: sugerirSetores(cat.BLOCOS[etapa.bloco]?.sugestao, setores), todos: false, sugerido: true };
}

// ── Etapas montadas (posição, título, campos, setores) ───────────────────────

/** Campos da etapa com a obrigatoriedade já resolvida pela configuração */
function camposDaEtapa(etapa, tipo) {
  if (etapa.bloco === 'personalizada') {
    return (etapa.personalizada?.campos || []).map(c => ({
      campo: c.id, rotulo: c.rotulo, personalizado: c.tipo, itens: c.itens || [],
      obrigatorio: c.obrigatorio !== false,
    }));
  }
  return cat.camposDoBloco(etapa.bloco, tipo).map(c => ({
    ...c,
    obrigatorio: c.travado ? true : (etapa.obrigatorios?.[c.campo] ?? !c.opcionalPadrao),
  }));
}

/**
 * Etapas do fluxo do DID, com número, título, campos e setores (estes da
 * configuração atual quando a etapa ainda existe nela).
 */
async function etapasDoDid(req, did) {
  const tipo = tipoDe(did);
  const fluxo = fluxoDoDid(did);
  const atualConf = fluxoConfigurado(req.tenant, tipo);
  const setores = await carregarSetores(req);
  return fluxo.etapas.filter(e => e.ativa !== false).map((e, i) => {
    const naConf = atualConf.etapas.find(x => x.id === e.id);
    const fonteSetor = naConf ? { ...e, setores: naConf.setores, todos: naConf.todos } : e;
    const tramitacao = (naConf || e).tramitacao || { todas: true, secretarias: [] };
    const bloco = cat.BLOCOS[e.bloco] || {};
    return {
      ...e,
      numero: i + 1,
      secao: `Seção ${cat.ROMANOS[i] || i + 1}`,
      titulo: `Seção ${cat.ROMANOS[i] || i + 1} — ${e.nome}`,
      campos: camposDaEtapa(e, tipo),
      recebidoEm: bloco.recebidoEm || null,
      responsavel: bloco.responsavel || null,
      extras: bloco.extras || [],
      setoresEfetivos: setoresDaEtapa(fonteSetor, setores),
      tramitacao: { todas: tramitacao.todas !== false || !(tramitacao.secretarias || []).length, secretarias: tramitacao.secretarias || [] },
    };
  });
}

/**
 * Regra de tramitação que vale agora: a da última etapa concluída pelo setor onde o
 * processo está (ele acabou de cumprir a etapa e vai enviar adiante); se o setor ainda
 * não concluiu nenhuma, a da etapa atual. Devolve { todas, secretarias: [ids], etapa }.
 */
async function tramitacaoPermitida(req, did, processo) {
  const etapas = await etapasDoDid(req, did);
  const estado = estadoEtapas(did, etapas);
  const doSetor = etapas.filter(e => estado[e.id]?.status === 'concluida' &&
    (e.setoresEfetivos.todos || e.setoresEfetivos.ids.includes(processo.setor_atual_id)));
  const etapa = doSetor[doSetor.length - 1] || etapaAtualDe(etapas, estado);
  if (!etapa) return { todas: true, secretarias: [], etapa: null };
  return { ...etapa.tramitacao, etapa: { numero: etapa.numero, titulo: etapa.titulo } };
}

// ── Estado ───────────────────────────────────────────────────────────────────

/**
 * Registro de cada etapa, indexado pelo id da etapa. Converte:
 *  - DIDs anteriores ao fluxo (etapas NULL): deduz pelos campos preenchidos;
 *  - registros por posição ("1", "2"…) da versão anterior: pela ordem do fluxo.
 */
function estadoEtapas(did, etapas) {
  const salvo = did.etapas;
  if (salvo && typeof salvo === 'object') {
    const chaves = Object.keys(salvo);
    if (chaves.length && chaves.every(k => /^\d+$/.test(k))) {
      const convertido = {};
      chaves.forEach(k => { const e = etapas[parseInt(k, 10) - 1]; if (e) convertido[e.id] = salvo[k]; });
      return convertido;
    }
    return { ...salvo };
  }
  const deduzido = {};
  for (const e of etapas) {
    const regra = cat.LEGADO[e.bloco];
    if (!regra || !regra(did)) break;
    deduzido[e.id] = { status: 'concluida', legado: true, nome: e.responsavel ? did[e.responsavel] || null : null };
  }
  return deduzido;
}

const etapaAtualDe = (etapas, estado) => etapas.find(e => estado[e.id]?.status !== 'concluida') || null;

/** Obrigatórios ainda não atendidos (rótulos), olhando o DID já mesclado */
function pendencias(etapa, did) {
  const vazio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  const dados = did.etapas_dados?.[etapa.id] || {};
  return etapa.campos.filter((c) => {
    if (!c.obrigatorio) return false;
    if (c.personalizado) {
      const v = dados[c.campo];
      if (c.personalizado === 'checklist') return !(c.itens || []).every((_, i) => v?.[i] === true);
      return vazio(v);
    }
    if (c.se && did[c.se.campo] !== c.se.igual) return false;
    if (c.itens) return !(Array.isArray(did.itens_did) && did.itens_did.some(it => parseFloat(it.valor_total) > 0));
    if (c.checkbox) return did[c.campo] !== true;
    if (c.igual) return did[c.campo] !== c.igual;
    if (c.numero) return vazio(did[c.campo]) || Number.isNaN(parseFloat(did[c.campo]));
    return vazio(did[c.campo]);
  }).map(c => c.rotulo);
}

async function usuarioCompleto(req, transaction) {
  const { User, Setor, Secretaria } = req.models;
  return User.findByPk(req.user.id, {
    attributes: ['id', 'nome', 'cpf', 'cargo', 'portaria_nomeacao', 'setorId', 'secretariaId', 'tipo'],
    include: [
      { model: Setor, as: 'setor', attributes: ['id', 'nome', 'sigla'] },
      { model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] },
    ],
    transaction,
  });
}

/** Pode o usuário preencher a etapa atual? Devolve o motivo quando não. */
async function podePreencher(req, { processo, etapaAtual, usuario }) {
  if (!etapaAtual) return { pode: false, motivo: 'Todas as etapas deste DID estão concluídas.', codigo: 'concluido' };
  if (processo && ['concluido', 'arquivado'].includes(processo.status)) {
    return { pode: false, motivo: 'O processo está concluído ou arquivado.', codigo: 'processo_encerrado' };
  }
  if (!usuario?.setorId || !etapaAtual.setoresEfetivos.ids.includes(usuario.setorId)) {
    return { pode: false, motivo: `${etapaAtual.titulo} é preenchida por outro setor.`, codigo: 'outro_setor' };
  }
  if (!processo) return { pode: true }; // DID novo: quem abre o processo preenche a Abertura
  if (processo.setor_atual_id !== usuario.setorId) {
    return { pode: false, motivo: 'O processo não está no seu setor. Ele precisa ser tramitado para cá e recebido.', codigo: 'processo_fora' };
  }
  if (processo.usuario_atual_id && processo.usuario_atual_id !== usuario.id) {
    return { pode: false, motivo: 'O processo foi enviado a outra pessoa do seu setor.', codigo: 'outra_pessoa' };
  }
  if ((await situacaoRecebimento(req, processo)).bloqueado) {
    return { pode: false, motivo: 'Receba o processo antes de preencher esta etapa.', codigo: 'receber' };
  }
  return { pode: true };
}

/** Situação completa (etapas montadas, estado, atual e permissão) */
async function situacao(req, did, processo, transaction) {
  const etapas = await etapasDoDid(req, did);
  const estado = estadoEtapas(did, etapas);
  const atual = etapaAtualDe(etapas, estado);
  const usuario = await usuarioCompleto(req, transaction);
  const permissao = await podePreencher(req, { processo, etapaAtual: atual, usuario });
  return { etapas, estado, atual, usuario, permissao };
}

/** Tudo que a tela precisa para desenhar o DID por etapas */
async function resumo(req, did, processo) {
  const { etapas, estado, atual, usuario, permissao } = await situacao(req, did, processo);
  const todosSetores = await carregarSetores(req);
  const nomeSetor = (id) => {
    const s = todosSetores.find(x => x.id === id);
    return s ? { id: s.id, nome: s.nome, sigla: s.sigla, secretaria: s.secretaria?.sigla || s.secretaria?.nome || null } : null;
  };

  return {
    tipo: tipoDe(did),
    fluxo_versao: fluxoDoDid(did).versao || 0,
    atual: atual?.numero || null,
    atual_id: atual?.id || null,
    pode: permissao.pode,
    motivo: permissao.motivo || null,
    codigo: permissao.codigo || null,
    usuario: usuario && {
      id: usuario.id, nome: usuario.nome, cargo: usuario.cargo || null,
      setor: usuario.setor ? { id: usuario.setor.id, nome: usuario.setor.nome, sigla: usuario.setor.sigla } : null,
      secretaria: usuario.secretaria ? { nome: usuario.secretaria.nome, sigla: usuario.secretaria.sigla } : null,
    },
    processo: processo && { setor_atual: nomeSetor(processo.setor_atual_id) },
    // Para onde pode tramitar agora (janela de tramitar filtra as secretarias)
    tramitacao: processo ? await tramitacaoPermitida(req, did, processo) : null,
    etapas: etapas.map(e => ({
      id: e.id,
      bloco: e.bloco,
      numero: e.numero,
      secao: e.secao,
      nome: e.nome,
      titulo: e.titulo,
      status: estado[e.id]?.status === 'concluida' ? 'concluida'
        : e.id === atual?.id ? (estado[e.id]?.status === 'devolvida' ? 'devolvida' : 'atual')
        : 'pendente',
      registro: estado[e.id] || null,
      setores: e.setoresEfetivos.todos ? [{ todos: true, nome: 'Qualquer secretaria' }] : e.setoresEfetivos.ids.map(nomeSetor).filter(Boolean),
      sugerido: e.setoresEfetivos.sugerido,
      recebidoEm: e.recebidoEm,
      responsavel: e.responsavel,
      personalizada: e.bloco === 'personalizada' ? e.personalizada : null,
      campos: e.campos.map(({ campo, rotulo, obrigatorio, se, checkbox, igual, numero, itens, personalizado }) =>
        ({ campo, rotulo, obrigatorio, se: se || null, checkbox: !!checkbox, igual: igual || null, numero: !!numero,
           itens: personalizado ? itens : !!itens, personalizado: personalizado || null })),
    })),
  };
}

// ── Gravação ─────────────────────────────────────────────────────────────────

// Campos de todos os blocos (exceto a Abertura) e carimbos automáticos
const CAMPOS_DE_BLOCOS = new Set(Object.entries(cat.BLOCOS).filter(([k]) => k !== 'abertura')
  .flatMap(([k, b]) => [...cat.camposDoBloco(k, 'fixas'), ...cat.camposDoBloco(k, 'variaveis')].map(c => c.campo).concat(b.extras || [])));
const AUTOMATICOS = new Set(Object.values(cat.BLOCOS).flatMap(b => [b.recebidoEm, b.responsavel]).filter(Boolean));
const CAMPOS_ABERTURA = new Set([
  ...cat.camposDoBloco('abertura', 'fixas'), ...cat.camposDoBloco('abertura', 'variaveis'),
].map(c => c.campo).concat(cat.BLOCOS.abertura.extras));

/**
 * Filtra um salvamento do DID: só passam os campos da etapa atual (Abertura:
 * tudo que não é de outro bloco). Responsável, "recebido em", etapas, fluxo e
 * dados de etapas personalizadas nunca vêm por aqui.
 */
function filtrarCampos(etapa, body) {
  const limpo = {};
  const doBloco = etapa.bloco === 'abertura' || etapa.bloco === 'personalizada'
    ? null
    : new Set([...etapa.campos.map(c => c.campo), ...etapa.extras]);
  for (const [k, v] of Object.entries(body || {})) {
    if (AUTOMATICOS.has(k) || ['etapas', 'fluxo', 'etapas_dados'].includes(k)) continue;
    if (etapa.bloco === 'personalizada') continue;
    if (doBloco ? doBloco.has(k) : (!CAMPOS_DE_BLOCOS.has(k) || CAMPOS_ABERTURA.has(k))) limpo[k] = v;
  }
  if (etapa.bloco !== 'abertura') delete limpo.tipo_did;
  return limpo;
}

/** Respostas de uma etapa personalizada (só os campos que ela tem) */
function dadosPersonalizados(etapa, did, body) {
  if (etapa.bloco !== 'personalizada') return null;
  const vindos = body?.etapas_dados?.[etapa.id];
  if (!vindos || typeof vindos !== 'object') return null;
  const atuais = did?.etapas_dados?.[etapa.id] || {};
  const limpo = { ...atuais };
  for (const c of etapa.campos) {
    if (!(c.campo in vindos)) continue;
    const v = vindos[c.campo];
    limpo[c.campo] = c.personalizado === 'checklist'
      ? Object.fromEntries((c.itens || []).map((_, i) => [i, v?.[i] === true]))
      : (v === null || v === undefined ? '' : String(v).slice(0, 5000));
  }
  return { ...(did?.etapas_dados || {}), [etapa.id]: limpo };
}

/** Data em que o setor atual recebeu o processo (ou hoje) */
async function dataRecebimento(req, processo, transaction) {
  const { Tramitacao } = req.models;
  const t = await Tramitacao.findOne({
    where: { processo_id: processo.id, tipo_acao: 'recebimento', destino_setor_id: processo.setor_atual_id },
    order: [['data_hora', 'DESC']],
    transaction,
  });
  const d = t?.data_hora ? new Date(t.data_hora) : new Date();
  return d.toISOString().slice(0, 10);
}

const ipDe = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;

/**
 * Conclui a etapa atual com assinatura eletrônica.
 * @param validar/assinar — injetados pelo controller (assinatura dos atos de tramitação)
 */
async function concluir(req, { processoId, etapaId, body, validar, assinar }) {
  const { Did, Processo, Tramitacao } = req.models;
  const transaction = await req.tenantDb.transaction();
  try {
    const did = await Did.findOne({ where: { processo_id: processoId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!did) throw new EtapaErro('DID não encontrado.', 404);
    const processo = await Processo.findByPk(processoId, { transaction });
    if (!processo) throw new EtapaErro('Processo não encontrado.', 404);

    const { estado, atual, usuario, permissao } = await situacao(req, did, processo, transaction);
    if (!atual || atual.id !== etapaId) {
      throw new EtapaErro(atual ? `A etapa atual é a ${atual.titulo}.` : 'Todas as etapas já estão concluídas.', 409);
    }
    if (!permissao.pode) throw new EtapaErro(permissao.motivo, 403, { codigo: permissao.codigo });

    const dados = filtrarCampos(atual, body);
    if (atual.responsavel) dados[atual.responsavel] = usuario.nome;
    if (atual.recebidoEm) dados[atual.recebidoEm] = await dataRecebimento(req, processo, transaction);
    if (atual.bloco === 'abertura' && body?.itens_did) dados.itens_did = body.itens_did;
    const personalizados = dadosPersonalizados(atual, did, body);
    if (personalizados) dados.etapas_dados = personalizados;

    const mesclado = { ...did.toJSON(), ...dados };
    const faltando = pendencias(atual, mesclado);
    if (faltando.length) throw new EtapaErro(`Preencha os campos obrigatórios da ${atual.titulo}.`, 400, { faltando });

    await validar(transaction, usuario);

    const tramitacao = await Tramitacao.create({
      processo_id: processo.id,
      tipo_acao: 'did_etapa',
      despacho: `DID ${did.numero_did || ''} — ${atual.titulo} concluída por ${usuario.nome}${usuario.cargo ? ` (${usuario.cargo})` : ''}`.replace(/\s+/g, ' '),
      origem_usuario_id: usuario.id,
      origem_setor_id: usuario.setorId,
      destino_setor_id: processo.setor_atual_id,
      destino_usuario_id: processo.usuario_atual_id || null,
      data_hora: new Date(),
      ip_origem: ipDe(req),
      assinatura_digital: crypto.createHash('sha256').update(`${processo.id}|did|${atual.id}|${usuario.id}|${Date.now()}`).digest('hex'),
    }, { transaction });
    const assinatura = await assinar(transaction, processo, tramitacao, usuario);

    estado[atual.id] = {
      status: 'concluida',
      usuario_id: usuario.id,
      nome: usuario.nome,
      cargo: usuario.cargo || null,
      setor_id: usuario.setorId,
      setor: usuario.setor?.nome || null,
      secretaria: usuario.secretaria?.sigla || usuario.secretaria?.nome || null,
      concluida_em: new Date().toISOString(),
      tramitacao_id: tramitacao.id,
      assinatura: assinatura ? { codigo_verificador: assinatura.codigo_verificador, codigo_crc: assinatura.codigo_crc } : null,
      ...(estado[atual.id]?.devolucao ? { devolucao_anterior: estado[atual.id].devolucao } : {}),
    };
    // DID anterior ao fluxo por etapas recebe a foto do fluxo que vinha seguindo
    const extra = did.fluxo?.etapas?.length ? {} : { fluxo: fluxoDoDid(did) };
    await did.update({ ...dados, ...extra, etapas: estado }, { transaction });
    await transaction.commit();

    const etapas = await etapasDoDid(req, did);
    const proxima = etapaAtualDe(etapas, estado);
    return { did, etapa: atual, proxima, assinatura };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Devolve à etapa anterior: quem pode a etapa atual reabre a anterior e o
 * processo volta (com devolução assinada) para quem a concluiu.
 */
async function devolver(req, { processoId, etapaId, justificativa, validar, assinar }) {
  const { Did, Processo, Tramitacao } = req.models;
  if (!justificativa || justificativa.trim().length < 20) {
    throw new EtapaErro('Explique o motivo da devolução (mínimo de 20 caracteres).');
  }
  const transaction = await req.tenantDb.transaction();
  try {
    const did = await Did.findOne({ where: { processo_id: processoId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!did) throw new EtapaErro('DID não encontrado.', 404);
    const processo = await Processo.findByPk(processoId, { transaction });
    const { etapas, estado, atual, usuario, permissao } = await situacao(req, did, processo, transaction);
    if (!atual || atual.id !== etapaId) throw new EtapaErro('Só a etapa atual pode devolver.', 409);
    if (atual.numero < 2) throw new EtapaErro('A Abertura não tem etapa anterior.');
    if (!permissao.pode) throw new EtapaErro(permissao.motivo, 403, { codigo: permissao.codigo });

    const anterior = etapas[atual.numero - 2];
    const reg = estado[anterior.id] || {};

    // Para onde volta: quem concluiu a etapa anterior; registro antigo usa quem
    // mandou o processo para cá (mesma regra da devolução de processo)
    let destinoSetor = reg.setor_id || null;
    let destinoUsuario = reg.usuario_id || null;
    if (!destinoSetor) {
      const ultimaVinda = await Tramitacao.findOne({
        where: { processo_id: processo.id, tipo_acao: { [Op.in]: ['tramite', 'devolucao'] } },
        order: [['data_hora', 'DESC']],
        transaction,
      });
      destinoSetor = ultimaVinda?.origem_setor_id || null;
      destinoUsuario = ultimaVinda?.origem_usuario_id || null;
    }
    if (!destinoSetor) throw new EtapaErro('Não foi possível identificar o setor da etapa anterior.');

    await validar(transaction, usuario);

    const tramitacao = await Tramitacao.create({
      processo_id: processo.id,
      tipo_acao: 'devolucao',
      despacho: `DID ${did.numero_did || ''} — ${atual.titulo} devolveu para a ${anterior.titulo}`.replace(/\s+/g, ' '),
      justificativa_devolucao: justificativa.trim(),
      origem_usuario_id: usuario.id,
      origem_setor_id: usuario.setorId,
      destino_setor_id: destinoSetor,
      destino_usuario_id: destinoUsuario,
      data_hora: new Date(),
      ip_origem: ipDe(req),
      assinatura_digital: crypto.createHash('sha256').update(`${processo.id}|did-devolucao|${atual.id}|${usuario.id}|${Date.now()}`).digest('hex'),
    }, { transaction });
    const assinatura = await assinar(transaction, processo, tramitacao, usuario);

    estado[anterior.id] = {
      ...reg,
      status: 'devolvida',
      devolucao: {
        por: usuario.nome,
        por_id: usuario.id,
        etapa: atual.titulo,
        justificativa: justificativa.trim(),
        em: new Date().toISOString(),
        tramitacao_id: tramitacao.id,
      },
    };
    const extra = did.fluxo?.etapas?.length ? {} : { fluxo: fluxoDoDid(did) };
    await did.update({ ...extra, etapas: estado }, { transaction });
    await processo.update({ status: 'devolvido', setor_atual_id: destinoSetor, usuario_atual_id: destinoUsuario }, { transaction });
    await transaction.commit();
    return { anterior, assinatura };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ── Configuração (Configurações › Fluxos de Processo) ────────────────────────

const novoId = () => `p_${crypto.randomBytes(5).toString('hex')}`;

/** Normaliza o fluxo vindo da tela: só campos conhecidos, ids garantidos */
function normalizarFluxo(etapas) {
  return (Array.isArray(etapas) ? etapas : []).map((e) => {
    const personalizada = e.bloco === 'personalizada';
    const base = {
      id: personalizada ? (/^p_[a-f0-9]{10}$/.test(e.id || '') ? e.id : novoId()) : e.bloco,
      bloco: personalizada ? 'personalizada' : String(e.bloco || ''),
      nome: String(e.nome || '').trim().slice(0, 120),
      todos: !!e.todos,
      setores: Array.isArray(e.setores) ? e.setores.filter(x => typeof x === 'string') : [],
      // Para onde o processo pode ser tramitado ao sair desta etapa (todas = sem restrição)
      tramitacao: {
        todas: e.tramitacao?.todas !== false,
        secretarias: Array.isArray(e.tramitacao?.secretarias) ? [...new Set(e.tramitacao.secretarias.filter(x => typeof x === 'string'))] : [],
      },
      obrigatorios: {},
    };
    if (!personalizada && e.obrigatorios && typeof e.obrigatorios === 'object') {
      for (const [k, v] of Object.entries(e.obrigatorios)) base.obrigatorios[k] = v === true;
    }
    if (personalizada) {
      base.personalizada = {
        campos: (e.personalizada?.campos || []).map((c) => ({
          id: /^c_[a-z0-9]{1,12}$/.test(c.id || '') ? c.id : `c_${crypto.randomBytes(3).toString('hex')}`,
          tipo: String(c.tipo || ''),
          rotulo: String(c.rotulo || '').trim().slice(0, 160),
          obrigatorio: c.obrigatorio !== false,
          ...(c.tipo === 'checklist' ? { itens: (c.itens || []).map(x => String(x).trim().slice(0, 160)).filter(Boolean) } : {}),
        })),
      };
    }
    return base;
  });
}

module.exports = {
  EtapaErro,
  tipoDe,
  fluxoConfigurado,
  fotoDoFluxo,
  fluxoDoDid,
  etapasDoDid,
  estadoEtapas,
  etapaAtualDe,
  carregarSetores,
  sugerirSetores,
  setoresDaEtapa,
  pendencias,
  usuarioCompleto,
  podePreencher,
  situacao,
  resumo,
  filtrarCampos,
  dadosPersonalizados,
  concluir,
  devolver,
  normalizarFluxo,
  tramitacaoPermitida,
};
