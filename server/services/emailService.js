// Envio de e-mail pelo servidor SMTP cadastrado no superadmin (um só para todos
// os municípios). A configuração fica em public.config_sistema (chave 'smtp');
// a senha é guardada cifrada (AES-256-GCM, mesma chave do 2º fator).
const nodemailer = require('nodemailer');
const { QueryTypes } = require('sequelize');

const CHAVE = 'smtp';

const lerConfig = async (masterDb) => {
  const rows = await masterDb.query(
    `SELECT valor FROM public.config_sistema WHERE chave = :c`,
    { replacements: { c: CHAVE }, type: QueryTypes.SELECT }
  ).catch(() => []);
  return rows[0]?.valor || null;
};

/** Configuração para a tela do superadmin — nunca devolve a senha. */
const obterConfigPublica = async (masterDb) => {
  const c = await lerConfig(masterDb);
  if (!c) return { configurado: false };
  const { senha_cifrada, ...resto } = c;
  return { ...resto, senha_definida: !!senha_cifrada, configurado: !!(c.host && c.remetente_email) };
};

/** Salva a configuração. Senha em branco mantém a atual. */
const salvarConfig = async (masterDb, dados, atualizadoPor) => {
  const { cifrar } = require('./assinaturaService');
  const atual = (await lerConfig(masterDb)) || {};
  const porta = Number(dados.porta) || 587;
  const novo = {
    host: String(dados.host || '').trim(),
    porta,
    seguranca: ['ssl', 'starttls', 'nenhuma'].includes(dados.seguranca) ? dados.seguranca : (porta === 465 ? 'ssl' : 'starttls'),
    usuario: String(dados.usuario || '').trim(),
    senha_cifrada: dados.senha ? cifrar(String(dados.senha)) : (atual.senha_cifrada || null),
    remetente_nome: String(dados.remetente_nome || 'jProcesso').trim(),
    remetente_email: String(dados.remetente_email || '').trim(),
    atualizado_em: new Date().toISOString(),
    atualizado_por: atualizadoPor || null,
  };
  if (!novo.host) throw Object.assign(new Error('Informe o servidor SMTP (host).'), { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(novo.remetente_email)) {
    throw Object.assign(new Error('Informe o e-mail do remetente.'), { status: 400 });
  }
  await masterDb.query(
    `INSERT INTO public.config_sistema (chave, valor, atualizado_em) VALUES (:c, CAST(:v AS JSONB), NOW())
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = NOW()`,
    { replacements: { c: CHAVE, v: JSON.stringify(novo) } }
  );
  return obterConfigPublica(masterDb);
};

const criarTransporte = (c) => {
  const { decifrar } = require('./assinaturaService');
  return nodemailer.createTransport({
    host: c.host,
    port: Number(c.porta) || 587,
    secure: c.seguranca === 'ssl',
    requireTLS: c.seguranca === 'starttls',
    ignoreTLS: c.seguranca === 'nenhuma',
    auth: c.usuario ? { user: c.usuario, pass: c.senha_cifrada ? decifrar(c.senha_cifrada) : '' } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

const smtpConfigurado = async (masterDb) => {
  const c = await lerConfig(masterDb);
  return !!(c?.host && c?.remetente_email);
};

/** Envia um e-mail. Lança erro com mensagem amigável se o SMTP não estiver pronto ou falhar. */
const enviar = async (masterDb, { para, assunto, texto, html }) => {
  const c = await lerConfig(masterDb);
  if (!c?.host || !c?.remetente_email) {
    throw Object.assign(new Error('O envio de e-mail ainda não foi configurado pelo administrador do sistema.'), { status: 503, codigo: 'SMTP_NAO_CONFIGURADO' });
  }
  try {
    await criarTransporte(c).sendMail({
      from: `"${c.remetente_nome || 'jProcesso'}" <${c.remetente_email}>`,
      to: para,
      subject: assunto,
      text: texto,
      html,
    });
  } catch (err) {
    console.error('[email] falha no envio:', err.message);
    throw Object.assign(new Error(`Não foi possível enviar o e-mail (${err.code || err.message}).`), { status: 502, codigo: 'SMTP_FALHOU' });
  }
};

module.exports = { obterConfigPublica, salvarConfig, smtpConfigurado, enviar };
