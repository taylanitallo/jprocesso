// ─────────────────────────────────────────────────────────────────────────────
//  FLUXO DO DID POR ETAPAS
//
//  Regras de quem preenche a etapa atual:
//    1. a etapa anterior está concluída (etapa atual = primeira não concluída);
//    2. o usuário é de um setor configurado para a etapa (Configurações › Fluxo do
//       DID; sem configuração, sugestão pelo nome do setor — didEtapas.js);
//    3. o processo está no setor do usuário e já foi recebido (recebimento
//       obrigatório) — e, se foi enviado a uma pessoa, é essa pessoa.
//  Concluir grava só os campos da etapa, exige todos os obrigatórios, carimba o
//  responsável (usuário logado) e a data de recebimento, e assina o ato.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const { Op } = require('sequelize');
const spec = require('../config/didEtapas');
const { situacaoRecebimento } = require('../utils/recebimento');

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

class EtapaErro extends Error {
  constructor(msg, status = 400, extra = {}) { super(msg); this.status = status; Object.assign(this, extra); }
}

// ── Setores de cada etapa ────────────────────────────────────────────────────

/** Sugestão pelo nome: setor que casa; senão gabinete da secretaria; senão a secretaria toda */
function sugerirSetores(sugestao, setores) {
  if (sugestao === 'todas') return setores.map(s => s.id);
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

/**
 * Setores permitidos para cada etapa: configuração do município ou sugestão.
 * @returns { [numero]: { ids: string[], configurado: boolean } }
 */
async function setoresPorEtapa(req, tipo) {
  const setores = await carregarSetores(req);
  const conf = req.tenant?.configuracoes?.did_etapas?.[tipo] || {};
  const mapa = {};
  for (const etapa of spec.etapasDo(tipo)) {
    const c = conf[String(etapa.numero)];
    const ids = Array.isArray(c?.setores) && c.setores.length ? c.setores.filter(id => setores.some(s => s.id === id)) : null;
    mapa[etapa.numero] = ids && ids.length
      ? { ids, configurado: true }
      : { ids: sugerirSetores(etapa.sugestao, setores), configurado: false };
  }
  return mapa;
}

// ── Estado das etapas ────────────────────────────────────────────────────────

/** Etapas do DID; DIDs anteriores ao fluxo (etapas NULL) são deduzidos dos campos */
function estadoEtapas(did) {
  const tipo = did.tipo_did === 'variaveis' ? 'variaveis' : 'fixas';
  if (did.etapas && typeof did.etapas === 'object') return { tipo, etapas: { ...did.etapas } };
  const etapas = {};
  const regras = spec.LEGADO[tipo];
  for (let i = 0; i < regras.length; i++) {
    if (!regras[i](did)) break;
    const etapa = spec.etapasDo(tipo)[i];
    etapas[i + 1] = {
      status: 'concluida',
      legado: true,
      nome: etapa.responsavel ? did[etapa.responsavel] || null : null,
    };
  }
  return { tipo, etapas };
}

const etapaAtualDe = (tipo, etapas) =>
  spec.etapasDo(tipo).find(e => etapas[e.numero]?.status !== 'concluida') || null;

async function usuarioCompleto(req, transaction) {
  const { User, Setor, Secretaria } = req.models;
  const u = await User.findByPk(req.user.id, {
    attributes: ['id', 'nome', 'cpf', 'cargo', 'portaria_nomeacao', 'setorId', 'secretariaId', 'tipo'],
    include: [
      { model: Setor, as: 'setor', attributes: ['id', 'nome', 'sigla'] },
      { model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] },
    ],
    transaction,
  });
  return u;
}

/**
 * Pode o usuário preencher a etapa atual? Devolve o motivo quando não.
 * @returns { pode, motivo, codigo }
 */
async function podePreencher(req, { processo, tipo, etapaAtual, setores, usuario }) {
  if (!etapaAtual) return { pode: false, motivo: 'Todas as etapas deste DID estão concluídas.', codigo: 'concluido' };
  if (processo && ['concluido', 'arquivado'].includes(processo.status)) {
    return { pode: false, motivo: 'O processo está concluído ou arquivado.', codigo: 'processo_encerrado' };
  }
  const permitidos = setores[etapaAtual.numero]?.ids || [];
  if (!usuario?.setorId || !permitidos.includes(usuario.setorId)) {
    return { pode: false, motivo: `${etapaAtual.titulo} é preenchida por outro setor.`, codigo: 'outro_setor' };
  }
  if (!processo) return { pode: true }; // DID novo: quem abre o processo preenche a Seção I
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

/** Tudo que a tela precisa para desenhar a linha de etapas e decidir o que abrir */
async function resumo(req, did, processo) {
  const { tipo, etapas } = estadoEtapas(did);
  const setores = await setoresPorEtapa(req, tipo);
  const todosSetores = await carregarSetores(req);
  const usuario = await usuarioCompleto(req);
  const atual = etapaAtualDe(tipo, etapas);
  const permissao = await podePreencher(req, { processo, tipo, etapaAtual: atual, setores, usuario });
  const nomeSetor = (id) => {
    const s = todosSetores.find(x => x.id === id);
    return s ? { id: s.id, nome: s.nome, sigla: s.sigla, secretaria: s.secretaria?.sigla || s.secretaria?.nome || null } : null;
  };

  return {
    tipo,
    atual: atual?.numero || null,
    pode: permissao.pode,
    motivo: permissao.motivo || null,
    codigo: permissao.codigo || null,
    usuario: usuario && {
      id: usuario.id, nome: usuario.nome, cargo: usuario.cargo || null,
      setor: usuario.setor ? { id: usuario.setor.id, nome: usuario.setor.nome, sigla: usuario.setor.sigla } : null,
      secretaria: usuario.secretaria ? { nome: usuario.secretaria.nome, sigla: usuario.secretaria.sigla } : null,
    },
    processo: processo && {
      setor_atual: nomeSetor(processo.setor_atual_id),
    },
    etapas: spec.etapasDo(tipo).map(e => ({
      numero: e.numero,
      secao: e.secao,
      nome: e.nome,
      titulo: e.titulo,
      status: etapas[e.numero]?.status === 'concluida' ? 'concluida'
        : e.numero === atual?.numero ? (etapas[e.numero]?.status === 'devolvida' ? 'devolvida' : 'atual')
        : 'pendente',
      registro: etapas[e.numero] || null,
      configurado: setores[e.numero].configurado,
      setores_ids: setores[e.numero].ids,
      setores: e.sugestao === 'todas' && !setores[e.numero].configurado
        ? [{ todos: true, nome: 'Qualquer secretaria' }]
        : setores[e.numero].ids.map(nomeSetor).filter(Boolean),
      recebidoEm: e.recebidoEm,
      responsavel: e.responsavel,
      campos: e.campos.map(({ campo, rotulo, opcional, se, checkbox, igual, numero, itens }) =>
        ({ campo, rotulo, opcional: !!opcional, se: se || null, checkbox: !!checkbox, igual: igual || null, numero: !!numero, itens: !!itens })),
    })),
  };
}

// ── Gravação ─────────────────────────────────────────────────────────────────

/**
 * Filtra o corpo de um salvamento comum do DID: só passam os campos da etapa
 * atual (Seção I: tudo que não é de etapa posterior). Responsável e "recebido em"
 * nunca vêm do formulário.
 */
function filtrarCampos(tipo, etapaAtual, body) {
  const todas = spec.etapasDo(tipo);
  const deEtapaPosterior = new Set(todas.filter(e => e.numero > 1).flatMap(spec.camposGravaveis));
  const automaticos = new Set(todas.flatMap(e => [e.recebidoEm, e.responsavel]).filter(Boolean));
  const permitidos = etapaAtual.numero === 1 ? null : new Set(spec.camposGravaveis(etapaAtual));
  const limpo = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (automaticos.has(k)) continue;
    if (k === 'etapas') continue;
    if (permitidos ? permitidos.has(k) : !deEtapaPosterior.has(k) || spec.camposGravaveis(todas[0]).includes(k)) limpo[k] = v;
  }
  // Seção I também define o tipo; nas demais o tipo não muda
  if (etapaAtual.numero !== 1) delete limpo.tipo_did;
  return limpo;
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

/**
 * Conclui a etapa atual com assinatura eletrônica.
 * @param assinar (transaction, processo, tramitacao, usuario) → assinatura — injetado
 *        pelo controller (validarAssinante + assinarTramitacao do processoController)
 */
async function concluir(req, { processoId, numero, body, validar, assinar }) {
  const { Did, Processo, Tramitacao } = req.models;
  const transaction = await req.tenantDb.transaction();
  try {
    const did = await Did.findOne({ where: { processo_id: processoId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!did) throw new EtapaErro('DID não encontrado.', 404);
    const processo = await Processo.findByPk(processoId, { transaction });
    if (!processo) throw new EtapaErro('Processo não encontrado.', 404);

    const { tipo, etapas } = estadoEtapas(did);
    const atual = etapaAtualDe(tipo, etapas);
    if (!atual || atual.numero !== numero) {
      throw new EtapaErro(atual ? `A etapa atual é a ${atual.titulo}.` : 'Todas as etapas já estão concluídas.', 409);
    }
    const setores = await setoresPorEtapa(req, tipo);
    const usuario = await usuarioCompleto(req, transaction);
    const permissao = await podePreencher(req, { processo, tipo, etapaAtual: atual, setores, usuario });
    if (!permissao.pode) throw new EtapaErro(permissao.motivo, 403, { codigo: permissao.codigo });

    // Campos da etapa + automáticos
    const dados = filtrarCampos(tipo, atual, body);
    if (atual.responsavel) dados[atual.responsavel] = usuario.nome;
    if (atual.recebidoEm) dados[atual.recebidoEm] = await dataRecebimento(req, processo, transaction);
    if (atual.numero === 1 && body?.itens_did) dados.itens_did = body.itens_did;

    const mesclado = { ...did.toJSON(), ...dados };
    const faltando = spec.pendencias(atual, mesclado);
    if (faltando.length) throw new EtapaErro(`Preencha todos os campos da ${atual.titulo}.`, 400, { faltando });

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
      ip_origem: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
      assinatura_digital: crypto.createHash('sha256').update(`${processo.id}|did|${atual.numero}|${usuario.id}|${Date.now()}`).digest('hex'),
    }, { transaction });
    const assinatura = await assinar(transaction, processo, tramitacao, usuario);

    // DID anterior ao fluxo: grava as etapas deduzidas junto com a nova
    etapas[atual.numero] = {
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
      ...(etapas[atual.numero]?.devolucao ? { devolucao_anterior: etapas[atual.numero].devolucao } : {}),
    };
    await did.update({ ...dados, etapas }, { transaction });
    await transaction.commit();

    const proxima = etapaAtualDe(tipo, etapas);
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
async function devolver(req, { processoId, numero, justificativa, validar, assinar }) {
  const { Did, Processo, Tramitacao } = req.models;
  if (!justificativa || justificativa.trim().length < 20) {
    throw new EtapaErro('Explique o motivo da devolução (mínimo de 20 caracteres).');
  }
  const transaction = await req.tenantDb.transaction();
  try {
    const did = await Did.findOne({ where: { processo_id: processoId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!did) throw new EtapaErro('DID não encontrado.', 404);
    const processo = await Processo.findByPk(processoId, { transaction });
    const { tipo, etapas } = estadoEtapas(did);
    const atual = etapaAtualDe(tipo, etapas);
    if (!atual || atual.numero !== numero) throw new EtapaErro('Só a etapa atual pode devolver.', 409);
    if (numero < 2) throw new EtapaErro('A Seção I não tem etapa anterior.');

    const setores = await setoresPorEtapa(req, tipo);
    const usuario = await usuarioCompleto(req, transaction);
    const permissao = await podePreencher(req, { processo, tipo, etapaAtual: atual, setores, usuario });
    if (!permissao.pode) throw new EtapaErro(permissao.motivo, 403, { codigo: permissao.codigo });

    const anterior = spec.etapasDo(tipo)[numero - 2];
    const reg = etapas[anterior.numero] || {};

    // Para onde volta: quem concluiu a etapa anterior; DID anterior ao fluxo usa
    // quem mandou o processo para cá (mesma regra da devolução de processo)
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
      ip_origem: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
      assinatura_digital: crypto.createHash('sha256').update(`${processo.id}|did-devolucao|${numero}|${usuario.id}|${Date.now()}`).digest('hex'),
    }, { transaction });
    const assinatura = await assinar(transaction, processo, tramitacao, usuario);

    etapas[anterior.numero] = {
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
    await did.update({ etapas }, { transaction });
    await processo.update({ status: 'devolvido', setor_atual_id: destinoSetor, usuario_atual_id: destinoUsuario }, { transaction });
    await transaction.commit();
    return { anterior, assinatura };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  EtapaErro,
  estadoEtapas,
  etapaAtualDe,
  setoresPorEtapa,
  sugerirSetores,
  carregarSetores,
  podePreencher,
  usuarioCompleto,
  resumo,
  filtrarCampos,
  concluir,
  devolver,
};
