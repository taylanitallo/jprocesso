const { Pool } = require('pg');
const zlib = require('zlib');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');
const Tenant = require('../models/Tenant');
const storage = require('../services/storageService');

const gzip   = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

function getPool() {
  return new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
}

// ── Usuários do Tenant ────────────────────────────────────────────────────────

const getTenantUsers = async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });

    const result = await pool.query(`
      SELECT u.id, u.nome, u.email, u.cpf, u.tipo, u.ativo,
             u.created_at, u.ultimo_acesso,
             s.nome AS secretaria_nome
      FROM ${tenant.schema}.usuarios u
      LEFT JOIN ${tenant.schema}.secretarias s ON s.id = u.secretaria_id
      ORDER BY u.created_at ASC
    `);
    res.json({ usuarios: result.rows });
  } catch (err) {
    console.error('Erro ao buscar usuários:', err.message);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  } finally {
    await pool.end();
  }
};

const createTenantUser = async (req, res) => {
  const { id } = req.params;
  const { nome, email, cpf, senha, tipo } = req.body;
  const pool = getPool();
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    if (!nome || !cpf || !senha) return res.status(400).json({ error: 'Nome, CPF e senha obrigatórios' });

    const hash = await bcrypt.hash(senha, 10);
    await pool.query(
      `INSERT INTO ${tenant.schema}.usuarios (nome, email, cpf, senha, tipo, ativo)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [nome, email || null, cpf, hash, tipo || 'operacional']
    );
    res.status(201).json({ success: true, message: 'Usuário criado com sucesso' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  } finally {
    await pool.end();
  }
};

const updateTenantUser = async (req, res) => {
  const { id, userId } = req.params;
  const { nome, email, tipo, ativo, senha } = req.body;
  const pool = getPool();
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });

    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      await pool.query(
        `UPDATE ${tenant.schema}.usuarios SET nome=$1, email=$2, tipo=$3, ativo=$4, senha=$5 WHERE id=$6`,
        [nome, email || null, tipo, ativo, hash, userId]
      );
    } else {
      await pool.query(
        `UPDATE ${tenant.schema}.usuarios SET nome=$1, email=$2, tipo=$3, ativo=$4 WHERE id=$5`,
        [nome, email || null, tipo, ativo, userId]
      );
    }
    res.json({ success: true, message: 'Usuário atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  } finally {
    await pool.end();
  }
};

const deleteTenantUser = async (req, res) => {
  const { id, userId } = req.params;
  const pool = getPool();
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    await pool.query(`DELETE FROM ${tenant.schema}.usuarios WHERE id=$1`, [userId]);
    res.json({ success: true, message: 'Usuário removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover usuário' });
  } finally {
    await pool.end();
  }
};

// ── Logs do Tenant ────────────────────────────────────────────────────────────

const getTenantLogs = async (req, res) => {
  const { id } = req.params;
  const { categoria, page = 1 } = req.query;
  const limit = 50;
  const offset = (parseInt(page) - 1) * limit;
  const pool = getPool();
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });

    const check = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name='logs'`,
      [tenant.schema]
    );
    if (!check.rows.length) return res.json({ logs: [], total: 0 });

    const params = [];
    let idx = 1;
    let where = '';
    if (categoria) { where = `WHERE l.modulo = $${idx++}`; params.push(categoria); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${tenant.schema}.logs l ${where}`, params
    );
    const result = await pool.query(
      `SELECT l.id, l.acao, l.modulo, l.descricao, l.ip, l.created_at,
              u.nome AS usuario_nome, u.email AS usuario_email
       FROM ${tenant.schema}.logs l
       LEFT JOIN ${tenant.schema}.usuarios u ON u.id = l.usuario_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ logs: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Erro ao buscar logs:', err.message);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  } finally {
    await pool.end();
  }
};

// ── Backup ────────────────────────────────────────────────────────────────────

const createBackup = async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });

    const tablesResult = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename`,
      [tenant.schema]
    );
    const tables = tablesResult.rows.map(r => r.tablename);

    const backup = {
      schema:    tenant.schema,
      municipio: tenant.nome_municipio,
      created_at: new Date().toISOString(),
      version: '1.0',
      tables: {},
    };
    let totalRows = 0;
    for (const t of tables) {
      try {
        const r = await pool.query(`SELECT * FROM ${tenant.schema}."${t}"`);
        backup.tables[t] = r.rows;
        totalRows += r.rows.length;
      } catch (_) {
        backup.tables[t] = [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename  = `${timestamp}-backup.json.gz`;
    const path      = `_superadmin/backups/${tenant.schema}/${filename}`;
    const compressed = await gzip(Buffer.from(JSON.stringify(backup)));

    await storage.uploadArquivo({ buffer: compressed, path, contentType: 'application/gzip' });

    res.json({
      success: true,
      message: 'Backup criado com sucesso',
      backup: { id: filename, path, tables: tables.length, rows: totalRows, size_bytes: compressed.length, created_at: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Erro ao criar backup:', err.message);
    res.status(500).json({ error: 'Erro ao criar backup: ' + err.message });
  } finally {
    await pool.end();
  }
};

const listBackups = async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });

    const prefix  = `_superadmin/backups/${tenant.schema}`;
    const files   = await storage.listarArquivos(prefix);
    const backups = files
      .filter(f => f.name && f.name.endsWith('.gz'))
      .map(f => ({
        id:         f.name,
        path:       `${prefix}/${f.name}`,
        nome:       f.name,
        size_bytes: f.metadata?.size || 0,
        created_at: f.created_at || f.updated_at,
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ backups, total: backups.length });
  } catch (_) {
    res.json({ backups: [], total: 0 });
  }
};

const downloadBackup = async (req, res) => {
  const { id, backupId } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    const path   = `_superadmin/backups/${tenant.schema}/${backupId}`;
    const buffer = await storage.downloadDocumento(path);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupId}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao baixar backup' });
  }
};

const deleteBackup = async (req, res) => {
  const { id, backupId } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    await storage.deletarArquivo(`_superadmin/backups/${tenant.schema}/${backupId}`);
    res.json({ success: true, message: 'Backup excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir backup' });
  }
};

const restoreBackup = async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    let jsonData;
    try {
      const dec = await gunzip(req.file.buffer);
      jsonData = JSON.parse(dec.toString());
    } catch (_) {
      try { jsonData = JSON.parse(req.file.buffer.toString()); }
      catch { return res.status(400).json({ error: 'Arquivo de backup inválido' }); }
    }
    if (!jsonData.tables) return res.status(400).json({ error: 'Formato inválido' });

    await pool.query('SET session_replication_role = replica');
    try {
      const tablesResult = await pool.query(
        `SELECT tablename FROM pg_tables WHERE schemaname=$1`, [tenant.schema]
      );
      const existing = tablesResult.rows.map(r => r.tablename);
      for (const t of existing) {
        try { await pool.query(`TRUNCATE ${tenant.schema}."${t}" CASCADE`); } catch (_) {}
      }

      let tablesRestored = 0, rowsRestored = 0;
      for (const [table, rows] of Object.entries(jsonData.tables)) {
        if (!existing.includes(table) || !rows.length) continue;
        for (const row of rows) {
          const cols = Object.keys(row);
          const vals = Object.values(row);
          const ph   = vals.map((_, i) => `$${i + 1}`).join(', ');
          try {
            await pool.query(
              `INSERT INTO ${tenant.schema}."${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT DO NOTHING`,
              vals
            );
            rowsRestored++;
          } catch (_) {}
        }
        tablesRestored++;
      }
      res.json({ success: true, message: 'Restauração concluída', tables_restored: tablesRestored, rows_restored: rowsRestored });
    } finally {
      await pool.query('SET session_replication_role = DEFAULT');
    }
  } catch (err) {
    console.error('Erro ao restaurar:', err.message);
    res.status(500).json({ error: 'Erro ao restaurar: ' + err.message });
  } finally {
    await pool.end();
  }
};

// ── Logos ─────────────────────────────────────────────────────────────────────

const uploadLogo = async (req, res) => {
  const { id, tipo } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    if (!['login', 'interna'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });

    const ext  = req.file.originalname.split('.').pop().toLowerCase();
    const path = `_superadmin/logos/${tenant.schema}/${tipo}.${ext}`;
    await storage.uploadArquivo({ buffer: req.file.buffer, path, contentType: req.file.mimetype });
    const signedUrl = await storage.createSignedUrl(path, 365 * 24 * 3600);

    const field   = tipo === 'login' ? 'logo_login_url' : 'logo_interna_url';
    const novoConf = { ...(tenant.configuracoes || {}), [field]: signedUrl, [`${field}_path`]: path };
    await tenant.update({ configuracoes: novoConf });

    res.json({ success: true, url: signedUrl });
  } catch (err) {
    console.error('Erro ao upload logo:', err.message);
    res.status(500).json({ error: 'Erro ao enviar logo: ' + err.message });
  }
};

const deleteLogo = async (req, res) => {
  const { id, tipo } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    const field   = tipo === 'login' ? 'logo_login_url' : 'logo_interna_url';
    const path    = tenant.configuracoes?.[`${field}_path`];
    if (path) { try { await storage.deletarArquivo(path); } catch (_) {} }
    const novoConf = { ...(tenant.configuracoes || {}) };
    delete novoConf[field];
    delete novoConf[`${field}_path`];
    await tenant.update({ configuracoes: novoConf });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover logo' });
  }
};

// ── Bucket ────────────────────────────────────────────────────────────────────

const criarBucket = async (req, res) => {
  try {
    const result = await storage.criarBucket();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar bucket: ' + err.message });
  }
};

// ── Ativar Tenant ─────────────────────────────────────────────────────────────

const ativarTenant = async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });
    await tenant.update({ ativo: true });
    res.json({ success: true, message: 'Município ativado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ativar município' });
  }
};

module.exports = {
  getTenantUsers, createTenantUser, updateTenantUser, deleteTenantUser,
  getTenantLogs,
  createBackup, listBackups, downloadBackup, deleteBackup, restoreBackup,
  uploadLogo, deleteLogo,
  criarBucket, ativarTenant,
};
