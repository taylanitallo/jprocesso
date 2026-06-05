const { createClient }  = require('@supabase/supabase-js');
const { QueryTypes }    = require('sequelize');
const archiver          = require('archiver');
const { PassThrough }   = require('stream');
const { masterDb }      = require('../config/database');

const BACKUPS_BUCKET = process.env.SUPABASE_BACKUPS_BUCKET || 'jprocesso-backups';

let _backupClient = null;

function getBackupClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  if (!_backupClient) _backupClient = createClient(url, key, { auth: { persistSession: false } });
  return _backupClient;
}

// ── SQL backup generator ───────────────────────────────────────────────────────

async function gerarSqlBackup(schema) {
  // Listar tabelas do schema — replacements só para valores escalares, nunca para identifiers
  const tabelas = await masterDb.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = :schema
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    { replacements: { schema }, type: QueryTypes.SELECT }
  );
  // tabelas = [{ table_name: 'agentes' }, { table_name: 'anexos' }, ...]

  let sql = `-- jProcesso Backup\n`;
  sql += `-- Schema: ${schema}\n`;
  sql += `-- Gerado em: ${new Date().toISOString()}\n`;
  sql += `-- Tabelas: ${tabelas.length}\n\n`;
  sql += `SET session_replication_role = 'replica';\n\n`;

  let totalLinhas = 0;

  for (const { table_name: tabela } of tabelas) {
    if (!tabela) continue;

    sql += `-- ═══════════════════════════════════\n`;
    sql += `-- Tabela: ${tabela}\n`;
    sql += `-- ═══════════════════════════════════\n\n`;

    // Buscar colunas via information_schema (replacements seguros para valores)
    const colunas = await masterDb.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = :schema
         AND table_name   = :tabela
       ORDER BY ordinal_position`,
      { replacements: { schema, tabela }, type: QueryTypes.SELECT }
    );
    // colunas = [{ column_name: 'id', data_type: 'uuid' }, ...]

    if (!colunas.length) continue;

    // Buscar dados — usar identifier quoting manual (validado contra lista de tabelas reais)
    let dados = [];
    try {
      const schemaQ = masterDb.getQueryInterface().quoteIdentifier(schema);
      const tabelaQ = masterDb.getQueryInterface().quoteIdentifier(tabela);
      dados = await masterDb.query(
        `SELECT * FROM ${schemaQ}.${tabelaQ}`,
        { type: QueryTypes.SELECT }
      );
    } catch (err) {
      sql += `-- ERRO ao ler tabela ${tabela}: ${err.message}\n\n`;
      continue;
    }

    if (!dados.length) {
      sql += `-- (tabela vazia)\n\n`;
      continue;
    }

    totalLinhas += dados.length;

    const schemaQ = masterDb.getQueryInterface().quoteIdentifier(schema);
    const tabelaQ = masterDb.getQueryInterface().quoteIdentifier(tabela);
    const cols    = colunas.map(c => masterDb.getQueryInterface().quoteIdentifier(c.column_name)).join(', ');

    for (const row of dados) {
      const values = colunas.map(({ column_name }) => {
        const val = row[column_name];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean')          return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number')           return String(val);
        if (val instanceof Date)               return `'${val.toISOString()}'`;
        if (typeof val === 'object')           return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');

      sql += `INSERT INTO ${schemaQ}.${tabelaQ} (${cols}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
    }
    sql += `\n`;
  }

  sql += `SET session_replication_role = 'origin';\n`;
  sql += `-- Fim do backup. Tabelas: ${tabelas.length} | Linhas: ${totalLinhas}\n`;

  return { sql, tabelasCount: tabelas.length, linhasCount: totalLinhas };
}

// ── ZIP compression ────────────────────────────────────────────────────────────

async function comprimirSql(sql, nomeArquivo) {
  return new Promise((resolve, reject) => {
    const chunks      = [];
    const passThrough = new PassThrough();
    passThrough.on('data', c => chunks.push(c));
    passThrough.on('end',  () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(passThrough);
    archive.append(sql, { name: nomeArquivo });
    archive.finalize();
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

async function createBackup({ schema, slug, tipo, tenantId, iniciadoPor = 'sistema' }) {
  // Inserir job pendente
  const jobRows = await masterDb.query(
    `INSERT INTO public.backup_jobs
       (tenant_id, slug, schema_name, tipo, status, iniciado_por)
     VALUES (:tenantId, :slug, :schema, :tipo, 'pendente', :iniciadoPor)
     RETURNING *`,
    { replacements: { tenantId, slug, schema, tipo, iniciadoPor }, type: QueryTypes.SELECT }
  );
  const job   = jobRows[0];
  const jobId = job?.id;

  try {
    const { sql, tabelasCount, linhasCount } = await gerarSqlBackup(schema);

    const ts     = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeSql = `backup_${slug}_${ts}.sql`;
    const nomeZip = `backup_${slug}_${ts}.zip`;
    const buffer  = await comprimirSql(sql, nomeSql);

    const pastaMap   = { manual: 'manuais', automatico: 'automaticos', 'pre-restore': 'pre-restore' };
    const pasta      = pastaMap[tipo] || 'manuais';
    const storagePath = `${slug}/${pasta}/${nomeZip}`;

    const supabase = getBackupClient();
    const { error: uploadError } = await supabase.storage
      .from(BACKUPS_BUCKET)
      .upload(storagePath, buffer, { contentType: 'application/zip', upsert: false });

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

    await masterDb.query(
      `UPDATE public.backup_jobs SET
         status        = 'concluido',
         storage_path  = :storagePath,
         tamanho_bytes = :tamanhoBytes,
         tabelas_count = :tabelasCount,
         linhas_count  = :linhasCount,
         concluido_em  = NOW()
       WHERE id = :jobId`,
      {
        replacements: { storagePath, tamanhoBytes: buffer.length, tabelasCount, linhasCount, jobId },
        type: QueryTypes.UPDATE
      }
    );

    return { id: jobId, status: 'concluido', storage_path: storagePath,
             tamanho_bytes: buffer.length, tabelas_count: tabelasCount, linhas_count: linhasCount };

  } catch (err) {
    if (jobId) {
      await masterDb.query(
        `UPDATE public.backup_jobs SET status = 'falhou', erro = :erro WHERE id = :jobId`,
        { replacements: { erro: err.message.slice(0, 1000), jobId }, type: QueryTypes.UPDATE }
      ).catch(() => {});
    }
    throw err;
  }
}

async function downloadBackup(storagePath) {
  const supabase = getBackupClient();
  const { data, error } = await supabase.storage.from(BACKUPS_BUCKET).createSignedUrl(storagePath, 300);
  if (error) throw new Error(`Erro ao gerar URL de download: ${error.message}`);
  return data.signedUrl;
}

async function deleteBackup(storagePath) {
  const supabase = getBackupClient();
  const { error } = await supabase.storage.from(BACKUPS_BUCKET).remove([storagePath]);
  if (error) throw new Error(`Erro ao remover backup: ${error.message}`);
}

async function listBackups(slug) {
  return masterDb.query(
    `SELECT * FROM public.backup_jobs WHERE slug = :slug ORDER BY criado_em DESC`,
    { replacements: { slug }, type: QueryTypes.SELECT }
  );
}

async function getStorageUsed(slug) {
  try {
    const supabase = getBackupClient();
    let totalBytes = 0;
    for (const pasta of ['manuais', 'automaticos', 'pre-restore']) {
      const { data, error } = await supabase.storage.from(BACKUPS_BUCKET).list(`${slug}/${pasta}`);
      if (!error && data) totalBytes += data.reduce((s, f) => s + (f.metadata?.size || 0), 0);
    }
    return parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
  } catch { return 0; }
}

module.exports = { createBackup, downloadBackup, deleteBackup, listBackups, getStorageUsed };
