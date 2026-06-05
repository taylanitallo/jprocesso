/**
 * superadminController.js
 * Controlador do Painel SuperAdmin — gestão global de tenants.
 *
 * Todas as rotas deste controller exigem requireSuperAdmin (token com isAdmin: true).
 */

const Tenant  = require('../models/Tenant');
const { masterDb } = require('../config/database');
const bcrypt  = require('bcryptjs');
const { Pool } = require('pg');
const backupService = require('../services/backupService');
const storageService = require('../services/storageService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pgPool() {
  const isSupabase = (process.env.DB_HOST || '').includes('supabase');
  const isRailway  = (process.env.DB_HOST || '').includes('rlwy.net');
  return new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: (isSupabase || isRailway)
      ? { require: true, rejectUnauthorized: false }
      : false,
  });
}

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

    // Contar backups das últimas 24h por tenant
    let backups24hMap = {};
    let total24h = 0;
    try {
      const [b24rows] = await masterDb.query(
        `SELECT slug, COUNT(*) AS total FROM public.backup_jobs
         WHERE criado_em >= NOW() - INTERVAL '24 hours' AND status = 'concluido'
         GROUP BY slug`,
        { type: masterDb.QueryTypes.SELECT }
      );
      const rows24h = Array.isArray(b24rows) ? b24rows : (b24rows ? [b24rows] : []);
      rows24h.forEach(r => {
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
        total:     tenantsJson.length,
        ativos:    tenantsJson.filter(t => t.ativo).length,
        inativos:  tenantsJson.filter(t => !t.ativo).length,
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
      const [rows] = await masterDb.query(
        `SELECT * FROM public.backup_jobs WHERE slug = :slug AND status = 'concluido' ORDER BY criado_em DESC LIMIT 1`,
        { replacements: { slug: tenant.subdominio }, type: masterDb.QueryTypes.SELECT }
      );
      ultimoBackup = Array.isArray(rows) ? rows[0] : (rows || null);
    } catch { /* tabela pode não existir */ }

    res.json({ success: true, tenant, ultimoBackup });
  } catch (error) {
    console.error('Erro ao buscar tenant:', error);
    res.status(500).json({ error: 'Erro ao buscar município' });
  }
};

const createTenant = async (req, res) => {
  // Delega para o tenantController que já tem toda a lógica de criação de schema
  const tenantController = require('./tenantController');
  return tenantController.createTenant(req, res);
};

const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cnpj, cidade, estado, ativo, configuracoes } = req.body;

    const tenant = await getTenantOrFail(id, res);
    if (!tenant) return;

    await tenant.update({
      nome_municipio: nome ?? tenant.nome_municipio,
      cnpj: cnpj ?? tenant.cnpj,
      cidade: cidade ?? tenant.cidade,
      estado: estado ?? tenant.estado,
      ativo: ativo !== undefined ? ativo : tenant.ativo,
      configuracoes: configuracoes !== undefined ? configuracoes : tenant.configuracoes
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
  const pool = pgPool();
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const result = await pool.query(
      `SELECT id, nome, email, cpf, tipo, ativo, created_at
       FROM "${tenant.schema}".usuarios
       WHERE tipo IN ('admin','gestor','operacional')
       ORDER BY nome`
    );

    res.json({ success: true, usuarios: result.rows });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  } finally {
    await pool.end().catch(() => {});
  }
};

const createTenantUser = async (req, res) => {
  const pool = pgPool();
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { nome, email, cpf, senha, tipo = 'operacional', ativo = true } = req.body;
    if (!nome || !cpf || !senha) {
      return res.status(400).json({ error: 'nome, cpf e senha são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      `INSERT INTO "${tenant.schema}".usuarios (nome, email, cpf, senha, tipo, ativo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email, tipo, ativo`,
      [nome, email || null, cpf, senhaHash, tipo, ativo]
    );

    res.status(201).json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  } finally {
    await pool.end().catch(() => {});
  }
};

const updateTenantUser = async (req, res) => {
  const pool = pgPool();
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { userId } = req.params;
    const { nome, email, cpf, senha, tipo, ativo } = req.body;

    let senhaHash = null;
    if (senha) senhaHash = await bcrypt.hash(senha, 10);

    await pool.query(
      `UPDATE "${tenant.schema}".usuarios SET
         nome  = COALESCE($1, nome),
         email = COALESCE($2, email),
         cpf   = COALESCE($3, cpf),
         senha = CASE WHEN $4 IS NOT NULL THEN $4 ELSE senha END,
         tipo  = COALESCE($5, tipo),
         ativo = COALESCE($6, ativo),
         updated_at = NOW()
       WHERE id = $7`,
      [nome || null, email || null, cpf || null, senhaHash, tipo || null,
       ativo !== undefined ? ativo : null, userId]
    );

    res.json({ success: true, message: 'Usuário atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  } finally {
    await pool.end().catch(() => {});
  }
};

const deleteTenantUser = async (req, res) => {
  const pool = pgPool();
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    await pool.query(
      `DELETE FROM "${tenant.schema}".usuarios WHERE id = $1`,
      [req.params.userId]
    );

    res.json({ success: true, message: 'Usuário removido' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  } finally {
    await pool.end().catch(() => {});
  }
};

// ─── Logs do tenant ───────────────────────────────────────────────────────────

const listTenantLogs = async (req, res) => {
  const pool = pgPool();
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { categoria, busca, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];

    if (categoria) { params.push(categoria); conditions.push(`l.modulo = $${params.length}`); }
    if (busca) {
      params.push(`%${busca}%`);
      conditions.push(`(l.acao ILIKE $${params.length} OR l.descricao ILIKE $${params.length})`);
    }
    if (data_inicio) { params.push(data_inicio); conditions.push(`l.created_at >= $${params.length}`); }
    if (data_fim) { params.push(data_fim); conditions.push(`l.created_at <= $${params.length}`); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const queryParams = [...params, parseInt(limit), offset];

    const result = await pool.query(
      `SELECT l.*, u.nome AS usuario_nome
       FROM "${tenant.schema}".logs l
       LEFT JOIN "${tenant.schema}".usuarios u ON l.usuario_id = u.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      queryParams
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM "${tenant.schema}".logs l ${where}`,
      params
    );

    res.json({
      success: true,
      logs: result.rows,
      total: parseInt(totalResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ error: 'Erro ao listar logs' });
  } finally {
    await pool.end().catch(() => {});
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
      const [rows] = await masterDb.query(
        `SELECT * FROM public.backup_jobs WHERE tenant_id = :tenantId ORDER BY criado_em DESC`,
        { replacements: { tenantId: tenant.id }, type: masterDb.QueryTypes.SELECT }
      );
      backups = Array.isArray(rows) ? rows : (rows ? [rows] : []);
      storageUsed = await backupService.getStorageUsed(tenant.subdominio);
    } catch { /* tabela pode não existir ainda */ }

    const concluidos = backups.filter(b => b.status === 'concluido').length;
    const falhas     = backups.filter(b => b.status === 'falhou').length;
    const ultimo     = backups.find(b => b.status === 'concluido') || null;

    res.json({
      success: true,
      backups,
      stats: {
        concluidos,
        falhas,
        storageUsed,
        ultimoBackup: ultimo?.concluido_em || null
      }
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

    const iniciadoPor = req.user?.email || req.user?.nome || 'admin';

    const job = await backupService.createBackup({
      schema: tenant.schema,
      slug: tenant.subdominio,
      tipo: 'manual',
      tenantId: tenant.id,
      iniciadoPor
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

    const { backupId } = req.params;

    const [rows] = await masterDb.query(
      `SELECT storage_path FROM public.backup_jobs WHERE id = :backupId AND tenant_id = :tenantId`,
      { replacements: { backupId, tenantId: tenant.id }, type: masterDb.QueryTypes.SELECT }
    );

    const job = Array.isArray(rows) ? rows[0] : (rows || null);
    if (!job?.storage_path) {
      return res.status(404).json({ error: 'Backup não encontrado' });
    }

    const signedUrl = await backupService.downloadBackup(job.storage_path);
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

    const { backupId } = req.params;

    const [rows] = await masterDb.query(
      `SELECT storage_path FROM public.backup_jobs WHERE id = :backupId AND tenant_id = :tenantId`,
      { replacements: { backupId, tenantId: tenant.id }, type: masterDb.QueryTypes.SELECT }
    );

    const job = Array.isArray(rows) ? rows[0] : (rows || null);
    if (!job) return res.status(404).json({ error: 'Backup não encontrado' });

    if (job.storage_path) {
      await backupService.deleteBackup(job.storage_path).catch(() => {});
    }

    await masterDb.query(
      `DELETE FROM public.backup_jobs WHERE id = :backupId`,
      { replacements: { backupId }, type: masterDb.QueryTypes.DELETE }
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
      { replacements: { tenantId: tenant.id }, type: masterDb.QueryTypes.DELETE }
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
      const [rows] = await masterDb.query(
        `SELECT * FROM public.backup_schedules WHERE tenant_id = :tenantId`,
        { replacements: { tenantId: tenant.id }, type: masterDb.QueryTypes.SELECT }
      );
      schedule = Array.isArray(rows) ? rows[0] : (rows || null);
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

    const agora = new Date();
    const proximo = new Date(agora);
    proximo.setHours(parseInt(hora), parseInt(minuto), 0, 0);
    if (proximo <= agora) proximo.setDate(proximo.getDate() + 1);

    await masterDb.query(
      `INSERT INTO public.backup_schedules
         (tenant_id, ativo, frequencia, hora, minuto, retencao_dias, proximo_backup)
       VALUES (:tenantId, :ativo, :frequencia, :hora, :minuto, :retencaoDias, :proximo)
       ON CONFLICT (tenant_id) DO UPDATE SET
         ativo = EXCLUDED.ativo,
         frequencia = EXCLUDED.frequencia,
         hora = EXCLUDED.hora,
         minuto = EXCLUDED.minuto,
         retencao_dias = EXCLUDED.retencao_dias,
         proximo_backup = EXCLUDED.proximo_backup,
         atualizado_em = NOW()`,
      {
        replacements: {
          tenantId: tenant.id,
          ativo: ativo !== undefined ? ativo : false,
          frequencia,
          hora: parseInt(hora),
          minuto: parseInt(minuto),
          retencaoDias: parseInt(retencao_dias),
          proximo: proximo.toISOString()
        },
        type: masterDb.QueryTypes.UPSERT
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
      schema: tenant.schema,
      slug: tenant.subdominio,
      tipo: 'automatico',
      tenantId: tenant.id,
      iniciadoPor: 'scheduler'
    });

    await masterDb.query(
      `UPDATE public.backup_schedules
       SET ultimo_backup_automatico = NOW(), ultimo_status = 'concluido'
       WHERE tenant_id = :tenantId`,
      { replacements: { tenantId: tenant.id }, type: masterDb.QueryTypes.UPDATE }
    ).catch(() => {});

    res.json({ success: true, backup: job });
  } catch (error) {
    console.error('Erro ao executar backup:', error);
    res.status(500).json({ error: 'Erro ao executar backup' });
  }
};

// ─── Restore ──────────────────────────────────────────────────────────────────

const restoreTenant = async (req, res) => {
  const pool = pgPool();
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de backup não enviado' });
    }

    // 1. Criar backup pre-restore (não bloqueia se falhar)
    const iniciadoPor = req.user?.email || 'admin';
    await backupService.createBackup({
      schema: tenant.schema,
      slug: tenant.subdominio,
      tipo: 'pre-restore',
      tenantId: tenant.id,
      iniciadoPor
    }).catch(err => console.warn('Pre-restore backup falhou:', err.message));

    // 2. Extrair SQL do arquivo enviado
    let sqlContent = '';
    const buf = req.file.buffer;

    // Tentar descompactar zip usando archiver-compatible approach
    try {
      // Verificar se começa com PK (zip)
      if (buf[0] === 0x50 && buf[1] === 0x4B) {
        // É um zip — usar JSZip-like via buffer parsing manual não é simples;
        // vamos tentar via archiver extract stream approach simplificado
        // Fallback: tentar ler como texto UTF-8
        const text = buf.toString('utf8');
        if (text.includes('INSERT') || text.includes('CREATE')) {
          sqlContent = text;
        } else {
          return res.status(400).json({ error: 'Arquivo ZIP detectado mas não foi possível extrair SQL sem adm-zip. Envie o .sql diretamente.' });
        }
      } else {
        sqlContent = buf.toString('utf8');
      }
    } catch {
      sqlContent = buf.toString('utf8');
    }

    if (!sqlContent || sqlContent.trim().length < 10) {
      return res.status(400).json({ error: 'Arquivo de backup inválido ou vazio' });
    }

    // 3. Recriar schema
    await pool.query(`DROP SCHEMA IF EXISTS "${tenant.schema}" CASCADE`);
    await pool.query(`CREATE SCHEMA "${tenant.schema}"`);

    // 4. Executar SQL statement a statement
    const statements = sqlContent
      .split(/;\s*(?:\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 5 && !s.startsWith('--'));

    let tablesRestored = 0;
    let rowsRestored = 0;

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        const upper = stmt.toUpperCase();
        if (upper.startsWith('INSERT')) rowsRestored++;
        if (upper.startsWith('CREATE TABLE')) tablesRestored++;
      } catch {
        // Ignora erros individuais
      }
    }

    res.json({
      success: true,
      message: 'Restauração concluída com sucesso',
      tables_restored: tablesRestored,
      rows_restored: rowsRestored
    });
  } catch (error) {
    console.error('Erro ao restaurar:', error);
    res.status(500).json({ error: `Erro ao restaurar: ${error.message}` });
  } finally {
    await pool.end().catch(() => {});
  }
};

// ─── Logos e Config ───────────────────────────────────────────────────────────

const updateLogos = async (req, res) => {
  try {
    const tenant = await getTenantOrFail(req.params.id, res);
    if (!tenant) return;

    const { tipo } = req.params; // 'login' | 'interna'
    if (!['login', 'interna'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use "login" ou "interna"' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de logo não enviado' });
    }

    const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase();
    const storagePath = `${tenant.subdominio}/logos/logo_${tipo}.${ext}`;

    // Upload usando jprocesso-documentos (bucket de documentos padrão)
    await storageService.uploadArquivo({
      buffer: req.file.buffer,
      path: storagePath,
      contentType: req.file.mimetype
    });

    // Montar URL pública
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'jprocesso-documentos';
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const logoUrl = urlData?.publicUrl || storagePath;

    const campo = tipo === 'login' ? 'logo_login_url' : 'logo_interna_url';
    const novoConf = { ...(tenant.configuracoes || {}), [campo]: logoUrl };
    await tenant.update({ configuracoes: novoConf });

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
    if (!['login', 'interna'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }

    const campo = tipo === 'login' ? 'logo_login_url' : 'logo_interna_url';
    const urlAtual = tenant.configuracoes?.[campo];

    if (urlAtual) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'jprocesso-documentos';
      let storagePath = null;
      if (urlAtual.includes(`/object/public/${bucket}/`)) {
        storagePath = urlAtual.split(`/object/public/${bucket}/`)[1];
      } else {
        storagePath = `${tenant.subdominio}/logos/logo_${tipo}.png`;
      }
      if (storagePath) {
        await storageService.deletarArquivo(storagePath).catch(() => {});
      }
    }

    const novoConf = { ...(tenant.configuracoes || {}), [campo]: null };
    await tenant.update({ configuracoes: novoConf });

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

    const novoConf = { ...(tenant.configuracoes || {}), ...(configuracoes || {}) };

    await tenant.update({
      nome_municipio: nome ?? tenant.nome_municipio,
      ativo: ativo !== undefined ? ativo : tenant.ativo,
      configuracoes: novoConf
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

// Alias usado pela rota antiga de usuários
const getTenantUsers   = listTenantUsers;
const getTenantLogs    = listTenantLogs;
const uploadLogo       = updateLogos;
const restoreBackup    = restoreTenant;

module.exports = {
  // Tenants
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,

  // Usuários
  listTenantUsers,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
  getTenantUsers,   // alias

  // Logs
  listTenantLogs,
  getTenantLogs,    // alias

  // Backup
  listBackups,
  createBackup,
  downloadBackup,
  deleteBackup,
  clearBackupHistory,

  // Agendamento
  getSchedule,
  updateSchedule,
  runBackupNow,

  // Restore
  restoreTenant,
  restoreBackup,    // alias

  // Logos e Config
  updateLogos,
  deleteLogo,
  updateConfig,
  uploadLogo,       // alias

  // Utilitários
  criarBucket,
  ativarTenant,
};
