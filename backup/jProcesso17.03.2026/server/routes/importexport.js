const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, tenantMiddleware } = require('../middleware/auth');
const { getCachedModels } = require('../config/database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── helpers ─────────────────────────────────────────────────────────────────

const toCSV = (rows) => {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))];
  return lines.join('\n');
};

const sendFile = (res, data, filename, formato) => {
  if (formato === 'csv') {
    const csv = toCSV(Array.isArray(data) ? data : [data]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
  return res.send(JSON.stringify(data, null, 2));
};

// ─── EXPORTAÇÃO ──────────────────────────────────────────────────────────────

// GET /api/export/processos?formato=json|csv
router.get('/processos', tenantMiddleware, authenticate, async (req, res) => {
  try {
    const { Processo, Tramitacao, Setor, Secretaria } = getCachedModels(req.tenant.subdominio);
    const processos = await Processo.findAll({
      include: [
        {
          model: Tramitacao,
          as: 'tramitacoes',
          include: [
            { model: Setor, as: 'origemSetor', attributes: ['id', 'nome', 'sigla'] },
            { model: Setor, as: 'destinoSetor', attributes: ['id', 'nome', 'sigla'] },
          ],
        },
        { model: Setor, as: 'setorAtual', attributes: ['id', 'nome', 'sigla'] },
      ],
      order: [['created_at', 'DESC']],
    });
    const formato = req.query.formato || 'json';
    const data = processos.map(p => p.toJSON());
    sendFile(res, data, `processos_${req.tenant.subdominio}`, formato);
  } catch (err) {
    console.error('Export processos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/usuarios?formato=json|csv
router.get('/usuarios', tenantMiddleware, authenticate, async (req, res) => {
  try {
    const { Usuario } = getCachedModels(req.tenant.subdominio);
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['senha', 'password'] },
      order: [['nome', 'ASC']],
    });
    const formato = req.query.formato || 'json';
    sendFile(res, usuarios.map(u => u.toJSON()), `usuarios_${req.tenant.subdominio}`, formato);
  } catch (err) {
    console.error('Export usuarios:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/setores?formato=json|csv
router.get('/setores', tenantMiddleware, authenticate, async (req, res) => {
  try {
    const { Setor, Secretaria } = getCachedModels(req.tenant.subdominio);
    const setores = await Setor.findAll({
      include: [{ model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] }],
      order: [['nome', 'ASC']],
    });
    const formato = req.query.formato || 'json';
    sendFile(res, setores.map(s => s.toJSON()), `setores_${req.tenant.subdominio}`, formato);
  } catch (err) {
    console.error('Export setores:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/documentos?formato=json|csv
router.get('/documentos', tenantMiddleware, authenticate, async (req, res) => {
  try {
    const { Documento, Processo } = getCachedModels(req.tenant.subdominio);
    const docs = await Documento.findAll({
      include: [{ model: Processo, as: 'processo', attributes: ['id', 'numero'] }],
      order: [['created_at', 'DESC']],
    });
    const formato = req.query.formato || 'json';
    sendFile(res, docs.map(d => d.toJSON()), `documentos_${req.tenant.subdominio}`, formato);
  } catch (err) {
    console.error('Export documentos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── IMPORTAÇÃO ──────────────────────────────────────────────────────────────

// POST /api/import  (multipart/form-data: file + tipo)
router.post('/', tenantMiddleware, authenticate, upload.single('file'), async (req, res) => {
  try {
    const { tipo } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!['json', 'csv'].includes(ext))
      return res.status(400).json({ error: 'Formato inválido. Use .json ou .csv.' });

    let registros;
    if (ext === 'json') {
      try { registros = JSON.parse(req.file.buffer.toString('utf-8')); }
      catch { return res.status(400).json({ error: 'JSON inválido.' }); }
    } else {
      const lines = req.file.buffer.toString('utf-8').split('\n').filter(Boolean);
      if (lines.length < 2) return res.status(400).json({ error: 'CSV vazio ou sem dados.' });
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      registros = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
    }

    if (!Array.isArray(registros)) registros = [registros];

    const models = getCachedModels(req.tenant.subdominio);
    let importados = 0;
    let ignorados = 0;

    if (tipo === 'setores') {
      const { Setor } = models;
      for (const r of registros) {
        if (!r.nome) { ignorados++; continue; }
        const [, created] = await Setor.findOrCreate({ where: { nome: r.nome }, defaults: r });
        created ? importados++ : ignorados++;
      }
    } else if (tipo === 'usuarios') {
      // Importação de usuários não cria senha — apenas atualiza dados não-sensíveis
      const { Usuario } = models;
      for (const r of registros) {
        if (!r.email) { ignorados++; continue; }
        const [, created] = await Usuario.findOrCreate({
          where: { email: r.email },
          defaults: { nome: r.nome, cargo: r.cargo, perfil: r.perfil || 'usuario' },
        });
        created ? importados++ : ignorados++;
      }
    } else if (tipo === 'processos') {
      const { Processo } = models;
      for (const r of registros) {
        if (!r.numero) { ignorados++; continue; }
        const exists = await Processo.findOne({ where: { numero: r.numero } });
        if (exists) { ignorados++; continue; }
        await Processo.create({ numero: r.numero, assunto: r.assunto, status: r.status || 'em_tramitacao' });
        importados++;
      }
    } else {
      return res.status(400).json({ error: `Tipo de importação '${tipo}' não suportado.` });
    }

    res.json({
      message: `Importação concluída: ${importados} registro(s) inserido(s), ${ignorados} ignorado(s) (já existiam ou inválidos).`,
      importados,
      ignorados,
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
