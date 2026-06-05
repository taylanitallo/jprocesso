/**
 * backupService.js
 * Serviço de backup para schemas de tenants.
 *
 * Variáveis de ambiente:
 *   SUPABASE_URL              — URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Chave service_role
 *   SUPABASE_BACKUPS_BUCKET   — Nome do bucket de backups (padrão: jprocesso-backups)
 */

const { createClient } = require('@supabase/supabase-js');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const { masterDb } = require('../config/database');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUPS_BUCKET = process.env.SUPABASE_BACKUPS_BUCKET || 'jprocesso-backups';

let _backupClient = null;

function getBackupClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  }
  if (!_backupClient) {
    _backupClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
  }
  return _backupClient;
}

/**
 * Gera o conteúdo SQL de backup de um schema.
 * Retorna { sql: string, tabelasCount: number, linhasCount: number }
 */
async function gerarSqlBackup(schema) {
  // Listar todas as tabelas do schema
  const [tabelasResult] = await masterDb.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = :schema AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    { replacements: { schema }, type: masterDb.QueryTypes.SELECT }
  );

  const tabelas = Array.isArray(tabelasResult)
    ? tabelasResult.map(r => r.table_name)
    : (tabelasResult ? [tabelasResult.table_name] : []);

  let sql = `-- jProcesso Backup\n-- Schema: ${schema}\n-- Gerado em: ${new Date().toISOString()}\n-- Tabelas: ${tabelas.length}\n\n`;
  sql += `SET session_replication_role = 'replica';\n\n`;

  let totalLinhas = 0;

  for (const tabela of tabelas) {
    sql += `-- ═══════════════════════════════════\n`;
    sql += `-- Tabela: ${tabela}\n`;
    sql += `-- ═══════════════════════════════════\n\n`;

    // Buscar colunas
    const [colunasResult] = await masterDb.query(
      `SELECT column_name, data_type, column_default, is_nullable
       FROM information_schema.columns
       WHERE table_schema = :schema AND table_name = :tabela
       ORDER BY ordinal_position`,
      { replacements: { schema, tabela }, type: masterDb.QueryTypes.SELECT }
    );

    const colunas = Array.isArray(colunasResult)
      ? colunasResult
      : (colunasResult ? [colunasResult] : []);

    if (colunas.length === 0) continue;

    // Buscar dados
    let dados = [];
    try {
      const [dadosResult] = await masterDb.query(
        `SELECT * FROM "${schema}"."${tabela}"`,
        { type: masterDb.QueryTypes.SELECT }
      );
      dados = Array.isArray(dadosResult) ? dadosResult : (dadosResult ? [dadosResult] : []);
    } catch (err) {
      sql += `-- ERRO ao ler tabela: ${err.message}\n\n`;
      continue;
    }

    if (dados.length === 0) {
      sql += `-- (tabela vazia)\n\n`;
      continue;
    }

    totalLinhas += dados.length;

    const cols = colunas.map(c => `"${c.column_name}"`).join(', ');

    for (const row of dados) {
      const values = colunas.map(c => {
        const val = row[c.column_name];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');

      sql += `INSERT INTO "${schema}"."${tabela}" (${cols}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
    }

    sql += `\n`;
  }

  sql += `SET session_replication_role = 'origin';\n`;
  sql += `-- Fim do backup. Tabelas: ${tabelas.length} | Linhas: ${totalLinhas}\n`;

  return { sql, tabelasCount: tabelas.length, linhasCount: totalLinhas };
}

/**
 * Comprime o SQL em um buffer zip usando archiver.
 */
async function comprimirSql(sql, nomeArquivo) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const passThrough = new PassThrough();

    passThrough.on('data', chunk => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(passThrough);

    archive.append(sql, { name: nomeArquivo });
    archive.finalize();
  });
}

/**
 * Cria um backup de um tenant.
 * @param {object} opts
 * @param {string} opts.schema       — schema PostgreSQL (ex: tenant_mun)
 * @param {string} opts.slug         — slug do tenant (ex: mun)
 * @param {string} opts.tipo         — 'manual'|'automatico'|'pre-restore'
 * @param {string} opts.tenantId     — UUID do tenant
 * @param {string} [opts.iniciadoPor] — email ou 'scheduler'
 * @returns {Promise<object>} job criado
 */
async function createBackup({ schema, slug, tipo, tenantId, iniciadoPor = 'sistema' }) {
  // Criar registro de job pendente
  const [jobRows] = await masterDb.query(
    `INSERT INTO public.backup_jobs
       (tenant_id, slug, schema_name, tipo, status, iniciado_por)
     VALUES (:tenantId, :slug, :schema, :tipo, 'pendente', :iniciadoPor)
     RETURNING *`,
    { replacements: { tenantId, slug, schema, tipo, iniciadoPor }, type: masterDb.QueryTypes.INSERT }
  );

  const job = Array.isArray(jobRows) ? jobRows[0] : jobRows;
  const jobId = job?.id;

  try {
    // Gerar SQL
    const { sql, tabelasCount, linhasCount } = await gerarSqlBackup(schema);

    // Comprimir
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeSql = `backup_${slug}_${ts}.sql`;
    const nomeZip = `backup_${slug}_${ts}.zip`;
    const buffer = await comprimirSql(sql, nomeSql);

    // Definir caminho no bucket
    const pastaMap = { 'manual': 'manuais', 'automatico': 'automaticos', 'pre-restore': 'pre-restore' };
    const pasta = pastaMap[tipo] || 'manuais';
    const storagePath = `${slug}/${pasta}/${nomeZip}`;

    // Upload para o bucket de backups
    const supabase = getBackupClient();
    const { error: uploadError } = await supabase.storage
      .from(BACKUPS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/zip',
        upsert: false
      });

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

    // Atualizar job como concluído
    await masterDb.query(
      `UPDATE public.backup_jobs SET
         status = 'concluido',
         storage_path = :storagePath,
         tamanho_bytes = :tamanhoBytes,
         tabelas_count = :tabelasCount,
         linhas_count = :linhasCount,
         concluido_em = NOW()
       WHERE id = :jobId`,
      {
        replacements: {
          storagePath,
          tamanhoBytes: buffer.length,
          tabelasCount,
          linhasCount,
          jobId
        },
        type: masterDb.QueryTypes.UPDATE
      }
    );

    return {
      id: jobId,
      status: 'concluido',
      storage_path: storagePath,
      tamanho_bytes: buffer.length,
      tabelas_count: tabelasCount,
      linhas_count: linhasCount
    };
  } catch (err) {
    // Marcar como falhou
    if (jobId) {
      await masterDb.query(
        `UPDATE public.backup_jobs SET status = 'falhou', erro = :erro WHERE id = :jobId`,
        { replacements: { erro: err.message, jobId }, type: masterDb.QueryTypes.UPDATE }
      ).catch(() => {});
    }
    throw err;
  }
}

/**
 * Gera URL assinada para download de um backup.
 */
async function downloadBackup(storagePath) {
  const supabase = getBackupClient();
  const { data, error } = await supabase.storage
    .from(BACKUPS_BUCKET)
    .createSignedUrl(storagePath, 300);

  if (error) throw new Error(`Erro ao gerar URL de download: ${error.message}`);
  return data.signedUrl;
}

/**
 * Remove um backup do bucket de backups.
 */
async function deleteBackup(storagePath) {
  const supabase = getBackupClient();
  const { error } = await supabase.storage
    .from(BACKUPS_BUCKET)
    .remove([storagePath]);

  if (error) throw new Error(`Erro ao remover backup: ${error.message}`);
}

/**
 * Lista todos os backups de um slug.
 */
async function listBackups(slug) {
  const [rows] = await masterDb.query(
    `SELECT * FROM public.backup_jobs WHERE slug = :slug ORDER BY criado_em DESC`,
    { replacements: { slug }, type: masterDb.QueryTypes.SELECT }
  );
  return Array.isArray(rows) ? rows : (rows ? [rows] : []);
}

/**
 * Retorna o total de MB usado pelos backups de um slug no bucket.
 */
async function getStorageUsed(slug) {
  try {
    const supabase = getBackupClient();
    let totalBytes = 0;

    for (const pasta of ['manuais', 'automaticos', 'pre-restore']) {
      const { data, error } = await supabase.storage
        .from(BACKUPS_BUCKET)
        .list(`${slug}/${pasta}`);

      if (!error && data) {
        totalBytes += data.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
      }
    }

    return parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
  } catch {
    return 0;
  }
}

module.exports = {
  createBackup,
  downloadBackup,
  deleteBackup,
  listBackups,
  getStorageUsed,
};
