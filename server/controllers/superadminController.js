const Tenant        = require('../models/Tenant');
const { masterDb }  = require('../config/database');
const { QueryTypes } = require('sequelize');
const bcrypt        = require('bcryptjs');
const backupService = require('../services/backupService');
const storageService = require('../services/storageService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const qi = () => masterDb.getQueryInterface();

async function getTenantOrFail(id, res) {
  const tenant = await Tenant.findByPk(id);
  if (!tenant) { res.status(404).json({ error: 'Município não encontrado' }); return null; }
  return tenant;
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

const listTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      order: [['created_at', 'DESC']],
      attributes: ['id','nome_municipio','cnpj','subdominio','schema','cidade','estado','ativo','configuracoes','created_at']
    });

    let backups24hMap = {};
    let total24h = 0;
    try {
      const rows = await masterDb.query(
        `SELECT slug, COUNT(*) AS total FROM public.backup_jobs
         WHERE criado_em >= NOW() - INTERVAL '24 hours' AND status = 'concluido'
         GROUP BY slug`,
        { type: QueryTypes.SELECT }
      );
      rows.forEach(r => {
        backups24hMap[r.slug] = parseInt(r.total) || 0;
        total24h += parseInt(r.total) || 0;
      });
    } catch { /* tabela pode não existir ainda */ }

    const tenantsJson = tenants.map(t => ({
      ...t.toJSON(),
      backups24h: backups24hMap[t.subdominio] || 0
    }));

    res.json({
      success: true,
      tenants: tenantsJson,
      total: tenantsJson.length,
      stats: {
        total:      tenantsJson.length,
        ativos:     tenantsJson.filter(t => t.ativo).length,
        inativos:   tenantsJson.filter(t => !t.ativo).length,
        backups24h: total24h
      }
    });
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    res.status(500).json({ error: 'Erro ao listar municípios' });
  }
};

const getTenant = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    let ultimoBackup = null;
    try {
      const rows = await masterDb.query(
        `SELECT * FROM public.backup_jobs WHERE slug = :slug AND status = 'concluido' ORDER BY criado_em DESC LIMIT 1`,
        { replacements: { slug: tenant.subdominio }, type: QueryTypes.SELECT }
      );
      ultimoBackup = rows[0] || null;
    } catch { /* tabela pode não existir */ }

    res.json({ success: true, tenant, ultimoBackup });
  } catch (error) {
    console.error('Erro ao buscar tenant:', error);
    res.status(500).json({ error: 'Erro ao buscar município' });
  }
};

const createTenant = async (req, res) => {
  const tenantController = require('./tenantController');
  return tenantController.createTenant(req, res);
};

const updateTenant = async (req, res) => {
  try {
    const { nome, cnpj, cidade, estado, ativo, configuracoes } = req.body;
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    await tenant.update({
      nome_municipio: nome ?? tenant.nome_municipio,
      cnpj:           cnpj ?? tenant.cnpj,
      cidade:         cidade ?? tenant.cidade,
      estado:         estado ?? tenant.estado,
      ativo:          ativo !== undefined ? ativo : tenant.ativo,
      configuracoes:  configuracoes !== undefined ? configuracoes : tenant.configuracoes
    });

    res.json({ success: true, tenant });
  } catch (error) {
    console.error('Erro ao atualizar tenant:', error);
    res.status(500).json({ error: 'Erro ao atualizar município' });
  }
};

const deleteTenant = async (req, res) => {
  const tenantController = require('./tenantController');
  return tenantController.deleteTenant(req, res);
};

// ─── Usuários do tenant ───────────────────────────────────────────────────────

const listTenantUsers = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const schemaQ = qi().quoteIdentifier(tenant.schema);
    const rows = await masterDb.query(
      `SELECT id, nome, email, cpf, tipo, ativo, created_at
       FROM ${schemaQ}.usuarios
       WHERE tipo IN ('admin','gestor','operacional')
       ORDER BY nome`,
      { type: QueryTypes.SELECT }
    );

    res.json({ success: true, usuarios: rows });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

const createTenantUser = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { nome, email, cpf, senha, tipo = 'operacional', ativo = true } = req.body;
    if (!nome || !cpf || !senha) {
      return res.status(400).json({ error: 'nome, cpf e senha são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const schemaQ = qi().quoteIdentifier(tenant.schema);
    const rows = await masterDb.query(
      `INSERT INTO ${schemaQ}.usuarios (nome, email, cpf, senha, tipo, ativo)
       VALUES (:nome, :email, :cpf, :senha, :tipo, :ativo)
       RETURNING id, nome, email, tipo, ativo`,
      { replacements: { nome, email: email || null, cpf, senha: senhaHash, tipo, ativo }, type: QueryTypes.SELECT }
    );

    res.status(201).json({ success: true, usuario: rows[0] });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.original?.code === '23505' || error.parent?.code === '23505') {
      return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

const updateTenantUser = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { userId } = req.params;
    const { nome, email, cpf, senha, tipo, ativo } = req.body;

    let senhaHash = null;
    if (senha) senhaHash = await bcrypt.hash(senha, 10);

    const schemaQ = qi().quoteIdentifier(tenant.schema);
    await masterDb.query(
      `UPDATE ${schemaQ}.usuarios SET
         nome       = COALESCE(:nome, nome),
         email      = COALESCE(:email, email),
         cpf        = COALESCE(:cpf, cpf),
         senha      = CASE WHEN :senha IS NOT NULL THEN :senha ELSE senha END,
         tipo       = COALESCE(:tipo, tipo),
         ativo      = COALESCE(:ativo, ativo),
         updated_at = NOW()
       WHERE id = :userId`,
      {
        replacements: {
          nome:   nome   || null,
          email:  email  || null,
          cpf:    cpf    || null,
          senha:  senhaHash,
          tipo:   tipo   || null,
          ativo:  ativo !== undefined ? ativo : null,
          userId
        },
        type: QueryTypes.UPDATE
      }
    );

    res.json({ success: true, message: 'Usuário atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

const deleteTenantUser = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const schemaQ = qi().quoteIdentifier(tenant.schema);
    await masterDb.query(
      `DELETE FROM ${schemaQ}.usuarios WHERE id = :userId`,
      { replacements: { userId: req.params.userId }, type: QueryTypes.DELETE }
    );

    res.json({ success: true, message: 'Usuário removido' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};

// ─── Logs do tenant ───────────────────────────────────────────────────────────

const listTenantLogs = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { categoria, busca, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const replacements = { limit: parseInt(limit), offset };

    if (categoria) {
      conditions.push('l.modulo = :categoria');
      replacements.categoria = categoria;
    }
    if (busca) {
      conditions.push('(l.acao ILIKE :busca OR l.descricao ILIKE :busca)');
      replacements.busca = `%${busca}%`;
    }
    if (data_inicio) {
      conditions.push('l.created_at >= :dataInicio');
      replacements.dataInicio = data_inicio;
    }
    if (data_fim) {
      conditions.push('l.created_at <= :dataFim');
      replacements.dataFim = data_fim;
    }

    const where    = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const schemaQ  = qi().quoteIdentifier(tenant.schema);

    const [rows, countRows] = await Promise.all([
      masterDb.query(
        `SELECT l.*, u.nome AS usuario_nome
         FROM ${schemaQ}.logs l
         LEFT JOIN ${schemaQ}.usuarios u ON l.usuario_id = u.id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT :limit OFFSET :offset`,
        { replacements, type: QueryTypes.SELECT }
      ),
      masterDb.query(
        `SELECT COUNT(*) AS total FROM ${schemaQ}.logs l ${where}`,
        { replacements, type: QueryTypes.SELECT }
      )
    ]);

    res.json({
      success: true,
      logs:  rows,
      total: parseInt(countRows[0]?.total || 0),
      page:  parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ error: 'Erro ao listar logs' });
  }
};

// ─── Backup ───────────────────────────────────────────────────────────────────

const listBackups = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    let backups = [];
    let storageUsed = 0;
    try {
      [backups, storageUsed] = await Promise.all([
        masterDb.query(
          `SELECT * FROM public.backup_jobs WHERE tenant_id = :tenantId ORDER BY criado_em DESC`,
          { replacements: { tenantId: tenant.id }, type: QueryTypes.SELECT }
        ),
        backupService.getStorageUsed(tenant.subdominio)
      ]);
    } catch { /* tabela pode não existir ainda */ }

    const concluidos = backups.filter(b => b.status === 'concluido').length;
    const falhas     = backups.filter(b => b.status === 'falhou').length;
    const ultimo     = backups.find(b => b.status === 'concluido') || null;

    res.json({
      success: true,
      backups,
      stats: { concluidos, falhas, storageUsed, ultimoBackup: ultimo?.concluido_em || null }
    });
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
};

const createBackup = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const job = await backupService.createBackup({
      schema:      tenant.schema,
      slug:        tenant.subdominio,
      tipo:        'manual',
      tenantId:    tenant.id,
      iniciadoPor: req.user?.email || req.user?.nome || 'admin'
    });

    res.json({ success: true, backup: job });
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar backup' });
  }
};

const downloadBackup = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const rows = await masterDb.query(
      `SELECT storage_path FROM public.backup_jobs WHERE id = :backupId AND tenant_id = :tenantId`,
      { replacements: { backupId: req.params.backupId, tenantId: tenant.id }, type: QueryTypes.SELECT }
    );

    if (!rows[0]?.storage_path) return res.status(404).json({ error: 'Backup não encontrado' });

    const signedUrl = await backupService.downloadBackup(rows[0].storage_path);
    res.json({ success: true, url: signedUrl });
  } catch (error) {
    console.error('Erro ao gerar download:', error);
    res.status(500).json({ error: 'Erro ao gerar link de download' });
  }
};

const deleteBackup = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const rows = await masterDb.query(
      `SELECT storage_path FROM public.backup_jobs WHERE id = :backupId AND tenant_id = :tenantId`,
      { replacements: { backupId: req.params.backupId, tenantId: tenant.id }, type: QueryTypes.SELECT }
    );

    if (!rows[0]) return res.status(404).json({ error: 'Backup não encontrado' });
    if (rows[0].storage_path) await backupService.deleteBackup(rows[0].storage_path).catch(() => {});

    await masterDb.query(
      `DELETE FROM public.backup_jobs WHERE id = :backupId`,
      { replacements: { backupId: req.params.backupId }, type: QueryTypes.DELETE }
    );

    res.json({ success: true, message: 'Backup removido' });
  } catch (error) {
    console.error('Erro ao excluir backup:', error);
    res.status(500).json({ error: 'Erro ao excluir backup' });
  }
};

const clearBackupHistory = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    await masterDb.query(
      `DELETE FROM public.backup_jobs WHERE tenant_id = :tenantId`,
      { replacements: { tenantId: tenant.id }, type: QueryTypes.DELETE }
    );

    res.json({ success: true, message: 'Histórico de backups limpo' });
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    res.status(500).json({ error: 'Erro ao limpar histórico' });
  }
};

// ─── Agendamento ──────────────────────────────────────────────────────────────

const getSchedule = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    let schedule = null;
    try {
      const rows = await masterDb.query(
        `SELECT * FROM public.backup_schedules WHERE tenant_id = :tenantId`,
        { replacements: { tenantId: tenant.id }, type: QueryTypes.SELECT }
      );
      schedule = rows[0] || null;
    } catch { /* tabela pode não existir */ }

    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { ativo = false, frequencia = 'diario', hora = 2, minuto = 0, retencao_dias = 7 } = req.body;

    const proximo = new Date();
    proximo.setHours(parseInt(hora), parseInt(minuto), 0, 0);
    if (proximo <= new Date()) proximo.setDate(proximo.getDate() + 1);

    await masterDb.query(
      `INSERT INTO public.backup_schedules
         (tenant_id, ativo, frequencia, hora, minuto, retencao_dias, proximo_backup)
       VALUES (:tenantId, :ativo, :frequencia, :hora, :minuto, :retencaoDias, :proximo)
       ON CONFLICT (tenant_id) DO UPDATE SET
         ativo          = EXCLUDED.ativo,
         frequencia     = EXCLUDED.frequencia,
         hora           = EXCLUDED.hora,
         minuto         = EXCLUDED.minuto,
         retencao_dias  = EXCLUDED.retencao_dias,
         proximo_backup = EXCLUDED.proximo_backup,
         atualizado_em  = NOW()`,
      {
        replacements: {
          tenantId: tenant.id,
          ativo:        ativo !== undefined ? ativo : false,
          frequencia,
          hora:         parseInt(hora),
          minuto:       parseInt(minuto),
          retencaoDias: parseInt(retencao_dias),
          proximo:      proximo.toISOString()
        },
        type: QueryTypes.UPSERT
      }
    );

    res.json({ success: true, message: 'Agendamento salvo' });
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error);
    res.status(500).json({ error: 'Erro ao salvar agendamento' });
  }
};

const runBackupNow = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const job = await backupService.createBackup({
      schema:      tenant.schema,
      slug:        tenant.subdominio,
      tipo:        'automatico',
      tenantId:    tenant.id,
      iniciadoPor: 'scheduler'
    });

    await masterDb.query(
      `UPDATE public.backup_schedules
       SET ultimo_backup_automatico = NOW(), ultimo_status = 'concluido'
       WHERE tenant_id = :tenantId`,
      { replacements: { tenantId: tenant.id }, type: QueryTypes.UPDATE }
    ).catch(() => {});

    res.json({ success: true, backup: job });
  } catch (error) {
    console.error('Erro ao executar backup:', error);
    res.status(500).json({ error: 'Erro ao executar backup' });
  }
};

// ─── Restore ──────────────────────────────────────────────────────────────────

const restoreTenant = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    if (!req.file) return res.status(400).json({ error: 'Arquivo de backup não enviado' });

    const iniciadoPor = req.user?.email || 'admin';

    // 1. Backup de segurança pré-restore
    await backupService.createBackup({
      schema: tenant.schema, slug: tenant.subdominio,
      tipo: 'pre-restore', tenantId: tenant.id, iniciadoPor
    }).catch(err => console.warn('Pre-restore backup falhou:', err.message));

    // 2. Extrair SQL
    const buf = req.file.buffer;
    let sqlContent = '';
    if (buf[0] === 0x50 && buf[1] === 0x4B) {
      const text = buf.toString('utf8');
      if (text.includes('INSERT') || text.includes('CREATE')) {
        sqlContent = text;
      } else {
        return res.status(400).json({ error: 'Arquivo ZIP detectado mas não foi possível extrair SQL. Envie o .sql diretamente.' });
      }
    } else {
      sqlContent = buf.toString('utf8');
    }

    if (!sqlContent || sqlContent.trim().length < 10) {
      return res.status(400).json({ error: 'Arquivo de backup inválido ou vazio' });
    }

    // 3. Recriar schema
    const schemaQ = qi().quoteIdentifier(tenant.schema);
    await masterDb.query(`DROP SCHEMA IF EXISTS ${schemaQ} CASCADE`, { type: QueryTypes.RAW });
    await masterDb.query(`CREATE SCHEMA ${schemaQ}`, { type: QueryTypes.RAW });

    // 4. Executar statements
    const statements = sqlContent
      .split(/;\s*(?:\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 5 && !s.startsWith('--'));

    let tablesRestored = 0;
    let rowsRestored   = 0;

    for (const stmt of statements) {
      try {
        await masterDb.query(stmt, { type: QueryTypes.RAW });
        const up = stmt.toUpperCase();
        if (up.startsWith('INSERT'))       rowsRestored++;
        if (up.startsWith('CREATE TABLE')) tablesRestored++;
      } catch { /* ignora erros individuais */ }
    }

    res.json({ success: true, message: 'Restauração concluída', tables_restored: tablesRestored, rows_restored: rowsRestored });
  } catch (error) {
    console.error('Erro ao restaurar:', error);
    res.status(500).json({ error: `Erro ao restaurar: ${error.message}` });
  }
};

// ─── Logos e Config ───────────────────────────────────────────────────────────

const updateLogos = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { tipo } = req.params;
    if (!['login', 'interna'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido. Use "login" ou "interna"' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo de logo não enviado' });

    const ext         = (req.file.originalname.split('.').pop() || 'png').toLowerCase();
    const storagePath = `${tenant.subdominio}/logos/logo_${tipo}.${ext}`;

    await storageService.uploadArquivo({ buffer: req.file.buffer, path: storagePath, contentType: req.file.mimetype });

    const { createClient } = require('@supabase/supabase-js');
    const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const bucket    = process.env.SUPABASE_STORAGE_BUCKET || 'jprocesso-documentos';
    const { data }  = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const logoUrl   = data?.publicUrl || storagePath;

    const campo   = tipo === 'login' ? 'logo_login_url' : 'logo_interna_url';
    await tenant.update({ configuracoes: { ...(tenant.configuracoes || {}), [campo]: logoUrl } });

    res.json({ success: true, url: logoUrl, campo });
  } catch (error) {
    console.error('Erro ao fazer upload do logo:', error);
    res.status(500).json({ error: 'Erro ao enviar logo' });
  }
};

const deleteLogo = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { tipo } = req.params;
    if (!['login', 'interna'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });

    const campo    = tipo === 'login' ? 'logo_login_url' : 'logo_interna_url';
    const urlAtual = tenant.configuracoes?.[campo];

    if (urlAtual) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'jprocesso-documentos';
      const storagePath = urlAtual.includes(`/object/public/${bucket}/`)
        ? urlAtual.split(`/object/public/${bucket}/`)[1]
        : `${tenant.subdominio}/logos/logo_${tipo}.png`;
      if (storagePath) await storageService.deletarArquivo(storagePath).catch(() => {});
    }

    await tenant.update({ configuracoes: { ...(tenant.configuracoes || {}), [campo]: null } });
    res.json({ success: true, message: 'Logo removida' });
  } catch (error) {
    console.error('Erro ao remover logo:', error);
    res.status(500).json({ error: 'Erro ao remover logo' });
  }
};

const updateConfig = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { nome, ativo, configuracoes } = req.body;
    await tenant.update({
      nome_municipio: nome ?? tenant.nome_municipio,
      ativo:          ativo !== undefined ? ativo : tenant.ativo,
      configuracoes:  { ...(tenant.configuracoes || {}), ...(configuracoes || {}) }
    });

    res.json({ success: true, tenant });
  } catch (error) {
    console.error('Erro ao atualizar config:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

const criarBucket = async (req, res) => {
  try {
    const resultado = await storageService.criarBucket();
    res.json({ success: true, ...resultado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const ativarTenant = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;
    await tenant.update({ ativo: true });
    res.json({ success: true, message: 'Município ativado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ativar município' });
  }
};

module.exports = {
  listTenants, getTenant, createTenant, updateTenant, deleteTenant,
  listTenantUsers, createTenantUser, updateTenantUser, deleteTenantUser,
  getTenantUsers: listTenantUsers,
  listTenantLogs, getTenantLogs: listTenantLogs,
  listBackups, createBackup, downloadBackup, deleteBackup, clearBackupHistory,
  getSchedule, updateSchedule, runBackupNow,
  restoreTenant, restoreBackup: restoreTenant,
  updateLogos, deleteLogo, updateConfig, uploadLogo: updateLogos,
  criarBucket, ativarTenant,
};
