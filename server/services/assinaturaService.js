// ══════════════════════════════════════════════════════════════════════════════
//  ASSINATURA ELETRÔNICA AVANÇADA — Lei Federal nº 14.063/2020, art. 4º, II
//
//  Modelo equivalente ao Suite/CE (Decreto Estadual nº 34.097/2021, art. 16, II):
//  validação por login, senha e código de verificação (2º fator — app autenticador).
//
//  Requisitos atendidos (art. 4º, II, da Lei 14.063/2020):
//   a) associada ao signatário de maneira unívoca → usuário autenticado + senha
//      + código TOTP do dispositivo pessoal (uso pessoal e intransferível);
//   b) dados de criação sob controle exclusivo do signatário → senha e app;
//   c) qualquer modificação posterior é detectável → hash SHA-256 do conteúdo
//      completo do ato, assinado com chave Ed25519 do sistema, e encadeado ao
//      ato anterior do mesmo processo (remoção/reordenação também é detectada).
//
//  Conferência pública por código verificador + código CRC (tarja de assinatura).
// ══════════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const zlib = require('zlib');
const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');

const FUNDAMENTO_LEGAL = 'Lei Federal nº 14.063/2020';
const NIVEL = 'avancada';
const METODO = 'senha+totp';
const PREFIXO_MENSAGEM = 'jprocesso-assinatura-v1';

// ── Segredo do sistema ────────────────────────────────────────────────────────
// ASSINATURA_SEGREDO deve ser definido em produção e NUNCA alterado (altera a
// chave de assinatura e invalida o cadastro dos apps autenticadores).
let _avisoSegredo = false;
const segredo = () => {
  const s = process.env.ASSINATURA_SEGREDO || process.env.JWT_SECRET;
  if (!s) throw new Error('ASSINATURA_SEGREDO (ou JWT_SECRET) não configurado');
  if (!process.env.ASSINATURA_SEGREDO && !_avisoSegredo) {
    _avisoSegredo = true;
    console.warn('[assinatura] ASSINATURA_SEGREDO não definido — usando JWT_SECRET. Defina ASSINATURA_SEGREDO em produção.');
  }
  return s;
};

class AssinaturaError extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  Chave Ed25519 do sistema
// ══════════════════════════════════════════════════════════════════════════════
let _chave = null;
const obterChave = () => {
  if (_chave) return _chave;
  const seed = crypto.createHash('sha256').update(`jprocesso|assinatura|ed25519|${segredo()}`).digest();
  // PKCS#8 de uma chave Ed25519 = prefixo fixo + seed de 32 bytes
  const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
  const privateKey = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  const publicKey = crypto.createPublicKey(privateKey);
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const kid = crypto.createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex').slice(0, 16);
  _chave = { privateKey, publicKey, publicPem, kid };
  return _chave;
};

// Registro público das chaves (permite verificar assinaturas antigas após rotação)
let _chaveRegistrada = false;
const registrarChavePublica = async (masterDb) => {
  if (_chaveRegistrada) return;
  const { kid, publicPem } = obterChave();
  await masterDb.query(
    `INSERT INTO public.assinatura_chaves (kid, chave_publica_pem) VALUES (:kid, :pem) ON CONFLICT (kid) DO NOTHING`,
    { replacements: { kid, pem: publicPem } }
  );
  _chaveRegistrada = true;
};

const chavePublicaPorKid = async (masterDb, kid) => {
  const atual = obterChave();
  if (kid === atual.kid) return atual.publicKey;
  const rows = await masterDb.query(
    `SELECT chave_publica_pem FROM public.assinatura_chaves WHERE kid = :kid`,
    { replacements: { kid }, type: QueryTypes.SELECT }
  );
  return rows[0] ? crypto.createPublicKey(rows[0].chave_publica_pem) : null;
};

// ══════════════════════════════════════════════════════════════════════════════
//  TOTP (RFC 6238) — código de 6 dígitos do app autenticador
// ══════════════════════════════════════════════════════════════════════════════
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32Encode = (buf) => {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
};
const base32Decode = (str) => {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0; const out = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
};

const TOTP_PASSO = 30;
const hotp = (segredoBuf, contador, digitos = 6) => {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(contador));
  const h = crypto.createHmac('sha1', segredoBuf).update(msg).digest();
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digitos).padStart(digitos, '0');
};
const passoAtual = (agoraMs = Date.now()) => Math.floor(agoraMs / 1000 / TOTP_PASSO);

/** Retorna o passo (contador) que validou o código, ou null. Janela de ±1 passo. */
const verificarTotp = (segredoBase32, codigo, agoraMs = Date.now()) => {
  const c = String(codigo || '').replace(/\D/g, '');
  if (c.length !== 6) return null;
  const key = base32Decode(segredoBase32);
  const atual = passoAtual(agoraMs);
  for (const passo of [atual, atual - 1, atual + 1]) {
    const esperado = hotp(key, passo);
    if (crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(c))) return passo;
  }
  return null;
};

// Segredo TOTP cifrado em repouso (AES-256-GCM)
const chaveTotp = () => crypto.createHash('sha256').update(`jprocesso|totp|${segredo()}`).digest();
const cifrar = (texto) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chaveTotp(), iv);
  const ct = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map(b => b.toString('base64')).join('.');
};
const decifrar = (payload) => {
  const [iv, tag, ct] = String(payload).split('.').map(p => Buffer.from(p, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', chaveTotp(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
};

// Segredo que não decifra (ASSINATURA_SEGREDO foi alterado): o cadastro antigo
// é inválido — o usuário recadastra o app em vez de receber erro 500.
const decifrarOuRecadastrar = (payload) => {
  try { return decifrar(payload); } catch {
    throw new AssinaturaError(428, 'TOTP_NAO_CONFIGURADO', 'Seu aplicativo autenticador precisa ser cadastrado novamente.');
  }
};

const gerarSegredoTotp = () => base32Encode(crypto.randomBytes(20));
const uriOtpAuth = ({ segredoBase32, conta, emissor }) =>
  `otpauth://totp/${encodeURIComponent(`${emissor}:${conta}`)}?secret=${segredoBase32}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=6&period=${TOTP_PASSO}`;

// ── Cadastro do autenticador (tabela usuario_totp, no schema do tenant) ──────
const statusTotp = async (db, usuarioId) => {
  const rows = await db.query(
    `SELECT ativo, ativado_em FROM usuario_totp WHERE usuario_id = :id`,
    { replacements: { id: usuarioId }, type: QueryTypes.SELECT }
  );
  return { configurado: !!rows[0]?.ativo, ativado_em: rows[0]?.ativado_em || null };
};

const iniciarCadastroTotp = async (db, usuarioId) => {
  const segredoBase32 = gerarSegredoTotp();
  await db.query(
    `INSERT INTO usuario_totp (usuario_id, segredo_cifrado, ativo, ultimo_passo, updated_at)
     VALUES (:id, :seg, false, NULL, NOW())
     ON CONFLICT (usuario_id) DO UPDATE SET segredo_cifrado = :seg, ativo = false, ultimo_passo = NULL, ativado_em = NULL, updated_at = NOW()`,
    { replacements: { id: usuarioId, seg: cifrar(segredoBase32) } }
  );
  return segredoBase32;
};

const ativarTotp = async (db, usuarioId, codigo) => {
  const rows = await db.query(
    `SELECT segredo_cifrado, ativo FROM usuario_totp WHERE usuario_id = :id`,
    { replacements: { id: usuarioId }, type: QueryTypes.SELECT }
  );
  if (!rows[0]) throw new AssinaturaError(400, 'TOTP_NAO_INICIADO', 'Inicie o cadastro do aplicativo autenticador.');
  const passo = verificarTotp(decifrarOuRecadastrar(rows[0].segredo_cifrado), codigo);
  if (passo === null) throw new AssinaturaError(400, 'TOTP_INVALIDO', 'Código do aplicativo inválido. Confira o horário do celular e tente de novo.');
  // O código de ativação não assina ato algum: não entra no controle anti-reuso,
  // para a primeira assinatura não ter de esperar o próximo código.
  await db.query(
    `UPDATE usuario_totp SET ativo = true, ativado_em = NOW(), ultimo_passo = NULL, updated_at = NOW() WHERE usuario_id = :id`,
    { replacements: { id: usuarioId } }
  );
};

const removerTotp = (db, usuarioId) =>
  db.query(`DELETE FROM usuario_totp WHERE usuario_id = :id`, { replacements: { id: usuarioId } });

/**
 * Valida senha + código do app (2º fator) do signatário. Lança AssinaturaError.
 * O mesmo código não pode ser reutilizado (anti-replay por passo TOTP).
 */
const validarCredenciais = async ({ db, transaction, usuario, senha, codigo }) => {
  if (!senha) throw new AssinaturaError(400, 'SENHA_OBRIGATORIA', 'Informe sua senha para assinar eletronicamente.');
  if (!(await bcrypt.compare(String(senha), usuario.senha))) {
    throw new AssinaturaError(400, 'SENHA_INVALIDA', 'Senha incorreta. A assinatura eletrônica requer a sua senha.');
  }
  const rows = await db.query(
    `SELECT segredo_cifrado, ativo, ultimo_passo FROM usuario_totp WHERE usuario_id = :id FOR UPDATE`,
    { replacements: { id: usuario.id }, type: QueryTypes.SELECT, transaction }
  );
  if (!rows[0]?.ativo) {
    throw new AssinaturaError(428, 'TOTP_NAO_CONFIGURADO', 'Configure o aplicativo autenticador para assinar eletronicamente.');
  }
  if (!codigo) throw new AssinaturaError(400, 'CODIGO_OBRIGATORIO', 'Informe o código de 6 dígitos do aplicativo autenticador.');
  const passo = verificarTotp(decifrarOuRecadastrar(rows[0].segredo_cifrado), codigo);
  if (passo === null) throw new AssinaturaError(400, 'TOTP_INVALIDO', 'Código do aplicativo inválido ou expirado.');
  if (rows[0].ultimo_passo !== null && passo <= Number(rows[0].ultimo_passo)) {
    throw new AssinaturaError(400, 'TOTP_REUTILIZADO', 'Este código já foi usado. Aguarde o próximo código do aplicativo.');
  }
  await db.query(
    `UPDATE usuario_totp SET ultimo_passo = :passo, updated_at = NOW() WHERE usuario_id = :id`,
    { replacements: { id: usuario.id, passo }, transaction }
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  Assinatura do ato
// ══════════════════════════════════════════════════════════════════════════════

// JSON canônico (chaves ordenadas) — o mesmo conteúdo sempre gera o mesmo hash
const canonico = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().filter(k => v[k] !== undefined)
      .map(k => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
};
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const calcularCrc = (codigo, hash) =>
  (zlib.crc32(Buffer.from(`${codigo}|${hash}`)) >>> 0).toString(16).toUpperCase().padStart(8, '0');
const mensagem = ({ hash_conteudo, hash_anterior, codigo_verificador }) =>
  Buffer.from(`${PREFIXO_MENSAGEM}|${hash_conteudo}|${hash_anterior || ''}|${codigo_verificador}`);

const TIPOS_ATO = {
  abertura: 'Abertura do processo',
  tramite: 'Tramitação',
  devolucao: 'Devolução',
  conclusao: 'Conclusão',
  arquivamento: 'Arquivamento',
  recebimento: 'Recebimento',
};

/**
 * Assina eletronicamente um ato de tramitação (dentro da transação do ato).
 * Pré-requisito: validarCredenciais() já executado para o signatário.
 */
const assinarAto = async ({ db, transaction, masterDb, tenant, processo, tramitacao, signatario, req, fundamentoMunicipal }) => {
  await registrarChavePublica(masterDb);
  const { privateKey, kid } = obterChave();

  // Serializa assinaturas do mesmo processo (encadeamento consistente)
  await db.query(`SELECT pg_advisory_xact_lock(hashtext(:pid))`, { replacements: { pid: String(processo.id) }, transaction });
  const anterior = await db.query(
    `SELECT hash_conteudo FROM assinaturas_eletronicas WHERE processo_id = :pid ORDER BY assinado_em DESC, created_at DESC LIMIT 1`,
    { replacements: { pid: processo.id }, type: QueryTypes.SELECT, transaction }
  );
  const hash_anterior = anterior[0]?.hash_conteudo || null;

  const assinadoEm = new Date();
  const conteudo = {
    versao: 1,
    municipio: { subdominio: tenant?.subdominio || null, nome: tenant?.nome_municipio || null },
    processo: { id: processo.id, numero: processo.numero, assunto: processo.assunto || null },
    ato: tramitacao.tipo_acao,
    tramitacao_id: tramitacao.id,
    texto: tramitacao.despacho ?? null,
    justificativa: tramitacao.justificativa_devolucao ?? null,
    origem_setor_id: tramitacao.origem_setor_id ?? null,
    destino_setor_id: tramitacao.destino_setor_id ?? null,
    destino_usuario_id: tramitacao.destino_usuario_id ?? null,
    signatario: {
      id: signatario.id,
      nome: signatario.nome,
      cpf: signatario.cpf || null,
      cargo: signatario.cargo || null,
      portaria: signatario.portaria_nomeacao || null,
    },
    assinado_em: assinadoEm.toISOString(),
    nivel: NIVEL,
    metodo: METODO,
    fundamento: [FUNDAMENTO_LEGAL, fundamentoMunicipal].filter(Boolean).join('; '),
  };
  const hash_conteudo = sha256(canonico(conteudo));

  // Código verificador único (8 dígitos) + CRC
  let codigo_verificador;
  for (let i = 0; i < 10; i++) {
    const cand = String(crypto.randomInt(10_000_000, 100_000_000));
    const existe = await db.query(
      `SELECT 1 FROM assinaturas_eletronicas WHERE codigo_verificador = :c`,
      { replacements: { c: cand }, type: QueryTypes.SELECT, transaction }
    );
    if (!existe.length) { codigo_verificador = cand; break; }
  }
  if (!codigo_verificador) throw new Error('Não foi possível gerar código verificador único');
  const codigo_crc = calcularCrc(codigo_verificador, hash_conteudo);
  const assinatura = crypto.sign(null, mensagem({ hash_conteudo, hash_anterior, codigo_verificador }), privateKey).toString('base64');

  const ip = (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || req?.socket?.remoteAddress || null);
  const [row] = await db.query(
    `INSERT INTO assinaturas_eletronicas
       (codigo_verificador, codigo_crc, processo_id, tramitacao_id, tipo_ato, signatario_id, signatario_nome,
        signatario_cpf, signatario_cargo, nivel, metodo, conteudo, hash_conteudo, hash_anterior,
        assinatura, chave_id, ip, user_agent, assinado_em)
     VALUES (:codigo, :crc, :pid, :tid, :ato, :sid, :snome, :scpf, :scargo, :nivel, :metodo, CAST(:conteudo AS JSONB),
        :hash, :hant, :assinatura, :kid, :ip, :ua, :em)
     RETURNING id, codigo_verificador, codigo_crc, hash_conteudo, assinado_em`,
    {
      replacements: {
        codigo: codigo_verificador, crc: codigo_crc, pid: processo.id, tid: tramitacao.id,
        ato: tramitacao.tipo_acao, sid: signatario.id, snome: signatario.nome, scpf: signatario.cpf || null,
        scargo: signatario.cargo || null, nivel: NIVEL, metodo: METODO, conteudo: JSON.stringify(conteudo),
        hash: hash_conteudo, hant: hash_anterior, assinatura, kid, ip,
        ua: (req?.headers?.['user-agent'] || '').slice(0, 300), em: assinadoEm,
      },
      type: QueryTypes.SELECT,
      transaction,
    }
  );
  return row;
};

// ══════════════════════════════════════════════════════════════════════════════
//  Verificação
// ══════════════════════════════════════════════════════════════════════════════
const mascararCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
};

/** Verifica uma assinatura pelo código verificador + CRC. Retorna null se não encontrada. */
const verificar = async ({ db, masterDb, codigo, crc }) => {
  const rows = await db.query(
    `SELECT * FROM assinaturas_eletronicas WHERE codigo_verificador = :c`,
    { replacements: { c: String(codigo || '').replace(/\D/g, '') }, type: QueryTypes.SELECT }
  );
  const a = rows[0];
  if (!a) return null;
  const crcInformado = String(crc || '').trim().toUpperCase();
  if (!crcInformado || crcInformado !== a.codigo_crc) return null; // exige os dois códigos

  const checks = {};
  checks.crc_confere = calcularCrc(a.codigo_verificador, a.hash_conteudo) === a.codigo_crc;
  checks.conteudo_integro = sha256(canonico(a.conteudo)) === a.hash_conteudo;
  const pub = await chavePublicaPorKid(masterDb, a.chave_id);
  checks.assinatura_valida = !!pub && crypto.verify(
    null, mensagem(a), pub, Buffer.from(a.assinatura, 'base64')
  );

  // O registro da tramitação no sistema ainda corresponde ao que foi assinado?
  const tram = await db.query(
    `SELECT t.despacho, t.justificativa_devolucao, t.tipo_acao, p.numero
       FROM tramitacoes t JOIN processos p ON p.id = t.processo_id WHERE t.id = :tid`,
    { replacements: { tid: a.tramitacao_id }, type: QueryTypes.SELECT }
  );
  const t = tram[0];
  checks.registro_confere = !!t
    && (t.despacho ?? null) === (a.conteudo.texto ?? null)
    && (t.justificativa_devolucao ?? null) === (a.conteudo.justificativa ?? null)
    && t.tipo_acao === a.conteudo.ato
    && t.numero === a.conteudo.processo?.numero;

  // Encadeamento com o ato anterior do mesmo processo
  const cadeia = await db.query(
    `SELECT id, hash_conteudo FROM assinaturas_eletronicas WHERE processo_id = :pid ORDER BY assinado_em, created_at`,
    { replacements: { pid: a.processo_id }, type: QueryTypes.SELECT }
  );
  const idx = cadeia.findIndex(r => r.id === a.id);
  checks.encadeamento_ok = idx >= 0 && (idx === 0 ? a.hash_anterior === null : cadeia[idx - 1].hash_conteudo === a.hash_anterior);

  return {
    valida: Object.values(checks).every(Boolean),
    checks,
    assinatura: {
      codigo_verificador: a.codigo_verificador,
      codigo_crc: a.codigo_crc,
      ato: a.tipo_ato,
      ato_descricao: TIPOS_ATO[a.tipo_ato] || a.tipo_ato,
      processo_numero: a.conteudo.processo?.numero,
      processo_assunto: a.conteudo.processo?.assunto,
      municipio: a.conteudo.municipio?.nome,
      signatario_nome: a.signatario_nome,
      signatario_cpf: mascararCpf(a.signatario_cpf),
      signatario_cargo: a.signatario_cargo,
      assinado_em: a.conteudo.assinado_em,
      nivel: a.nivel,
      metodo: a.metodo,
      fundamento: a.conteudo.fundamento,
      hash_conteudo: a.hash_conteudo,
      chave_id: a.chave_id,
    },
  };
};

/** Assinaturas de um processo, por tramitação (para a tarja na linha do tempo). */
const listarPorProcesso = async (db, processoId) => {
  const rows = await db.query(
    `SELECT tramitacao_id, codigo_verificador, codigo_crc, signatario_nome, signatario_cargo, assinado_em, nivel, hash_conteudo,
            conteudo->>'fundamento' AS fundamento
       FROM assinaturas_eletronicas WHERE processo_id = :pid ORDER BY assinado_em`,
    { replacements: { pid: processoId }, type: QueryTypes.SELECT }
  );
  return rows;
};

module.exports = {
  AssinaturaError,
  FUNDAMENTO_LEGAL,
  TIPOS_ATO,
  // TOTP
  hotp, verificarTotp, base32Encode, base32Decode, uriOtpAuth,
  statusTotp, iniciarCadastroTotp, ativarTotp, removerTotp,
  // assinatura
  validarCredenciais, assinarAto, verificar, listarPorProcesso,
  obterChave, registrarChavePublica, canonico,
};
