// Assinatura eletrônica avançada — cadastro do 2º fator e verificação pública
const express = require('express');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { masterDb } = require('../config/database');
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');
const { registrarLog } = require('../middleware/activityLogger');
const assinatura = require('../services/assinaturaService');
const { AssinaturaError } = assinatura;

const tenantAuth = [tenantMiddleware, requireTenant, authenticate];

const tratarErro = (res, err, contexto) => {
  if (err instanceof AssinaturaError) return res.status(err.status).json({ error: err.message, codigo: err.codigo });
  console.error(`[assinatura] ${contexto}:`, err);
  return res.status(500).json({ error: 'Erro ao processar a assinatura eletrônica' });
};

// ── Status do app autenticador do usuário logado ──────────────────────────────
router.get('/totp', ...tenantAuth, async (req, res) => {
  try {
    res.json(await assinatura.statusTotp(req.tenantDb, req.user.id));
  } catch (err) { tratarErro(res, err, 'status'); }
});

// ── Inicia o cadastro: gera segredo e QR code para o app ─────────────────────
router.post('/totp/iniciar', ...tenantAuth, async (req, res) => {
  try {
    const { User } = req.models;
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'nome', 'cpf', 'email'] });
    const atual = await assinatura.statusTotp(req.tenantDb, req.user.id);
    if (atual.configurado) {
      return res.status(409).json({ error: 'O aplicativo autenticador já está configurado.', codigo: 'TOTP_JA_CONFIGURADO' });
    }
    const segredo = await assinatura.iniciarCadastroTotp(req.tenantDb, req.user.id);
    const emissor = `jProcesso ${req.tenant.nome_municipio || req.tenant.subdominio}`.slice(0, 60);
    const uri = assinatura.uriOtpAuth({ segredoBase32: segredo, conta: user.email || user.cpf, emissor });
    const qrcode = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
    res.json({ segredo, uri, qrcode });
  } catch (err) { tratarErro(res, err, 'iniciar'); }
});

// ── Confirma o cadastro com o primeiro código do app ─────────────────────────
router.post('/totp/ativar', ...tenantAuth, async (req, res) => {
  try {
    await assinatura.ativarTotp(req.tenantDb, req.user.id, req.body?.codigo);
    await registrarLog(req, { acao: 'ativar_autenticador', modulo: 'assinatura', descricao: 'Configurou o aplicativo autenticador da assinatura eletrônica' });
    res.json({ success: true });
  } catch (err) { tratarErro(res, err, 'ativar'); }
});

// ── Remove o próprio autenticador (exige senha + código atual) ───────────────
router.post('/totp/desativar', ...tenantAuth, async (req, res) => {
  const transaction = await req.tenantDb.transaction();
  try {
    const usuario = await req.models.User.findByPk(req.user.id, { transaction });
    await assinatura.validarCredenciais({
      db: req.tenantDb, transaction, usuario, senha: req.body?.senhaConfirmacao, codigo: req.body?.codigoTotp,
    });
    await assinatura.removerTotp(req.tenantDb, req.user.id);
    await transaction.commit();
    await registrarLog(req, { acao: 'remover_autenticador', modulo: 'assinatura', descricao: 'Removeu o aplicativo autenticador da assinatura eletrônica' });
    res.json({ success: true });
  } catch (err) {
    await transaction.rollback();
    tratarErro(res, err, 'desativar');
  }
});

// Quem pode configurar/revogar o autenticador de outro usuário: Administrador Jeos,
// ou Administrador / quem gerencia usuários, desde que Organização › Usuários ›
// Autenticador não esteja desligado.
const podeGerenciarAutenticador = async (req) => {
  const eu = await req.models.User.findByPk(req.user.id, { attributes: ['tipo', 'permissoes'] });
  if (eu?.tipo === 'jeos') return true;
  if (eu?.permissoes?.organizacao?.usuarios?.autenticador === false) return false;
  return eu?.tipo === 'admin' || eu?.permissoes?.administracao?.gerenciar_usuarios === true;
};

// ── Configuração assistida pelo administrador ─────────────────────────────────
// O QR code aparece na tela do administrador, mas quem escaneia é o próprio
// usuário, no celular dele; a ativação exige o código gerado pelo app.
router.post('/totp/iniciar-para/:usuarioId', ...tenantAuth, async (req, res) => {
  try {
    if (!(await podeGerenciarAutenticador(req))) return res.status(403).json({ error: 'Sem permissão para configurar o autenticador de outro usuário.' });
    const alvo = await req.models.User.findByPk(req.params.usuarioId, { attributes: ['id', 'nome', 'cpf', 'email'] });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
    const atual = await assinatura.statusTotp(req.tenantDb, alvo.id);
    if (atual.configurado) return res.status(409).json({ error: 'Este usuário já tem o aplicativo autenticador configurado.', codigo: 'TOTP_JA_CONFIGURADO' });
    const segredo = await assinatura.iniciarCadastroTotp(req.tenantDb, alvo.id);
    const emissor = `jProcesso ${req.tenant.nome_municipio || req.tenant.subdominio}`.slice(0, 60);
    const uri = assinatura.uriOtpAuth({ segredoBase32: segredo, conta: alvo.email || alvo.cpf, emissor });
    const qrcode = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
    res.json({ segredo, uri, qrcode, usuario: { id: alvo.id, nome: alvo.nome } });
  } catch (err) { tratarErro(res, err, 'iniciar-para'); }
});

router.post('/totp/ativar-para/:usuarioId', ...tenantAuth, async (req, res) => {
  try {
    if (!(await podeGerenciarAutenticador(req))) return res.status(403).json({ error: 'Sem permissão para configurar o autenticador de outro usuário.' });
    const alvo = await req.models.User.findByPk(req.params.usuarioId, { attributes: ['id', 'nome'] });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
    await assinatura.ativarTotp(req.tenantDb, alvo.id, req.body?.codigo);
    await registrarLog(req, {
      acao: 'configurar_autenticador', modulo: 'assinatura',
      descricao: `Configurou o aplicativo autenticador de ${alvo.nome} (com o celular do usuário)`, referencia_id: String(alvo.id),
    });
    res.json({ success: true });
  } catch (err) { tratarErro(res, err, 'ativar-para'); }
});

// ── Revogação pelo administrador (celular perdido/trocado) ───────────────────
// Decreto 34.097/2021-CE, art. 9º, §3º: deve haver meio de revogar a assinatura.
router.post('/totp/resetar/:usuarioId', ...tenantAuth, async (req, res) => {
  try {
    if (!(await podeGerenciarAutenticador(req))) return res.status(403).json({ error: 'Apenas administradores podem revogar o autenticador de outro usuário.' });
    const alvo = await req.models.User.findByPk(req.params.usuarioId, { attributes: ['id', 'nome'] });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
    await assinatura.removerTotp(req.tenantDb, alvo.id);
    await registrarLog(req, {
      acao: 'revogar_autenticador', modulo: 'assinatura',
      descricao: `Revogou o aplicativo autenticador de ${alvo.nome}`, referencia_id: String(alvo.id),
    });
    res.json({ success: true });
  } catch (err) { tratarErro(res, err, 'resetar'); }
});

// ── Verificação pública (código verificador + CRC) ───────────────────────────
const limiteVerificacao = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.get('/verificar', limiteVerificacao, tenantMiddleware, requireTenant, async (req, res) => {
  try {
    const { codigo, crc } = req.query;
    if (!codigo || !crc) return res.status(400).json({ error: 'Informe o código verificador e o código CRC.' });
    const resultado = await assinatura.verificar({ db: req.tenantDb, masterDb, codigo, crc });
    if (!resultado) return res.status(404).json({ error: 'Nenhuma assinatura encontrada para os códigos informados.' });
    res.json(resultado);
  } catch (err) { tratarErro(res, err, 'verificar'); }
});

module.exports = router;
