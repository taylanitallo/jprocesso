// Legislação por município — normas que regulamentam o uso do sistema
// (decretos, instruções normativas). Cadastradas pelo superadmin; listadas na
// tela de login pelo botão "Legislação".
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { masterDb } = require('../config/database');
const Tenant = require('../models/Tenant');
const storageService = require('../services/storageService');

const CAMPOS = ['titulo', 'descricao', 'data_publicacao', 'regulamenta_assinatura', 'ordem', 'ativo'];

const normalizar = (body = {}) => {
  const d = {};
  for (const k of CAMPOS) {
    if (body[k] === undefined) continue;
    let v = body[k];
    if (k === 'regulamenta_assinatura' || k === 'ativo') v = v === true || v === 'true';
    else if (k === 'ordem') v = Number.isFinite(Number(v)) ? Number(v) : 0;
    else if (typeof v === 'string') v = v.trim() || null;
    d[k] = v;
  }
  return d;
};

const validarPdf = (file) => {
  if (!file) return null;
  const ehPdf = file.mimetype === 'application/pdf' && file.buffer?.subarray(0, 5).toString() === '%PDF-';
  if (!ehPdf) return 'O arquivo deve ser um PDF.';
  if (file.size > 20 * 1024 * 1024) return 'O PDF deve ter no máximo 20 MB.';
  return null;
};

const enviarPdf = async (tenant, file) => {
  const path = `${tenant.subdominio}/legislacao/${crypto.randomUUID()}.pdf`;
  await storageService.uploadArquivo({ buffer: file.buffer, path, contentType: 'application/pdf' });
  return { arquivo_path: path, arquivo_nome: file.originalname.slice(0, 255) };
};

// ── Superadmin ───────────────────────────────────────────────────────────────

const listar = async (req, res) => {
  try {
    const rows = await masterDb.query(
      `SELECT * FROM public.legislacoes WHERE tenant_id = :tid ORDER BY ordem, data_publicacao DESC NULLS LAST, criado_em DESC`,
      { replacements: { tid: req.params.id }, type: QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (err) {
    console.error('legislacao.listar:', err);
    res.status(500).json({ error: 'Erro ao listar legislação' });
  }
};

const criar = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    const d = normalizar(req.body);
    if (!d.titulo) return res.status(400).json({ error: 'Informe o título da norma.' });
    const erroPdf = validarPdf(req.file);
    if (erroPdf) return res.status(400).json({ error: erroPdf });
    const arquivo = req.file ? await enviarPdf(tenant, req.file) : {};
    const [row] = await masterDb.query(
      `INSERT INTO public.legislacoes (tenant_id, titulo, descricao, data_publicacao, arquivo_path, arquivo_nome, regulamenta_assinatura, ordem, ativo)
       VALUES (:tid, :titulo, :descricao, :data, :path, :nome, :reg, :ordem, :ativo) RETURNING *`,
      {
        replacements: {
          tid: tenant.id, titulo: d.titulo, descricao: d.descricao ?? null, data: d.data_publicacao ?? null,
          path: arquivo.arquivo_path ?? null, nome: arquivo.arquivo_nome ?? null,
          reg: d.regulamenta_assinatura ?? false, ordem: d.ordem ?? 0, ativo: d.ativo ?? true,
        },
        type: QueryTypes.SELECT,
      }
    );
    res.status(201).json(row);
  } catch (err) {
    console.error('legislacao.criar:', err);
    res.status(500).json({ error: 'Erro ao cadastrar legislação' });
  }
};

const atualizar = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    const [atual] = await masterDb.query(
      `SELECT * FROM public.legislacoes WHERE id = :lid AND tenant_id = :tid`,
      { replacements: { lid: req.params.lid, tid: tenant.id }, type: QueryTypes.SELECT }
    );
    if (!atual) return res.status(404).json({ error: 'Legislação não encontrada' });
    const erroPdf = validarPdf(req.file);
    if (erroPdf) return res.status(400).json({ error: erroPdf });

    const d = normalizar(req.body);
    if ('titulo' in d && !d.titulo) return res.status(400).json({ error: 'Informe o título da norma.' });
    if (req.file) {
      Object.assign(d, await enviarPdf(tenant, req.file));
      if (atual.arquivo_path) storageService.deletarArquivo(atual.arquivo_path).catch(() => {});
    }
    const sets = Object.keys(d);
    if (!sets.length) return res.json(atual);
    const [row] = await masterDb.query(
      `UPDATE public.legislacoes SET ${sets.map(k => `${k} = :${k}`).join(', ')}, atualizado_em = NOW()
        WHERE id = :lid RETURNING *`,
      { replacements: { ...d, lid: atual.id }, type: QueryTypes.SELECT }
    );
    res.json(row);
  } catch (err) {
    console.error('legislacao.atualizar:', err);
    res.status(500).json({ error: 'Erro ao atualizar legislação' });
  }
};

const remover = async (req, res) => {
  try {
    const [atual] = await masterDb.query(
      `DELETE FROM public.legislacoes WHERE id = :lid AND tenant_id = :tid RETURNING arquivo_path`,
      { replacements: { lid: req.params.lid, tid: req.params.id }, type: QueryTypes.SELECT }
    );
    if (!atual) return res.status(404).json({ error: 'Legislação não encontrada' });
    if (atual.arquivo_path) storageService.deletarArquivo(atual.arquivo_path).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error('legislacao.remover:', err);
    res.status(500).json({ error: 'Erro ao remover legislação' });
  }
};

// ── Público (tela de login) ──────────────────────────────────────────────────

const tenantPorSubdominio = (sub) => Tenant.findOne({ where: { subdominio: sub, ativo: true }, attributes: ['id', 'nome_municipio', 'subdominio'] });

const listarPublico = async (req, res) => {
  try {
    const tenant = await tenantPorSubdominio(req.params.subdomain);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    const rows = await masterDb.query(
      `SELECT id, titulo, descricao, data_publicacao, (arquivo_path IS NOT NULL) AS tem_arquivo, regulamenta_assinatura
         FROM public.legislacoes WHERE tenant_id = :tid AND ativo
        ORDER BY ordem, data_publicacao DESC NULLS LAST, criado_em DESC`,
      { replacements: { tid: tenant.id }, type: QueryTypes.SELECT }
    );
    res.json({ municipio: tenant.nome_municipio, legislacoes: rows });
  } catch (err) {
    console.error('legislacao.listarPublico:', err);
    res.status(500).json({ error: 'Erro ao carregar legislação' });
  }
};

const arquivoPublico = async (req, res) => {
  try {
    const tenant = await tenantPorSubdominio(req.params.subdomain);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    const [leg] = await masterDb.query(
      `SELECT arquivo_path, arquivo_nome FROM public.legislacoes WHERE id = :lid AND tenant_id = :tid AND ativo`,
      { replacements: { lid: req.params.lid, tid: tenant.id }, type: QueryTypes.SELECT }
    );
    if (!leg?.arquivo_path) return res.status(404).json({ error: 'Arquivo não encontrado' });
    const buffer = await storageService.downloadDocumento(leg.arquivo_path);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(leg.arquivo_nome || 'legislacao.pdf')}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // aberto a partir do site (outro domínio)
    res.send(buffer);
  } catch (err) {
    console.error('legislacao.arquivoPublico:', err);
    res.status(500).json({ error: 'Erro ao abrir o arquivo' });
  }
};

module.exports = { listar, criar, atualizar, remover, listarPublico, arquivoPublico };
