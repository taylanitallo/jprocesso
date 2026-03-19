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

// Parser CSV RFC 4180 — suporta campos com vírgulas entre aspas
const parseCSVLine = (line) => {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
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

// GET /api/export/itens?formato=json|csv
router.get('/itens', tenantMiddleware, authenticate, async (req, res) => {
  try {
    const { ContratoItem } = getCachedModels(req.tenant.subdominio);
    const itens = await ContratoItem.findAll({ order: [['descricao', 'ASC']] });
    const formato = req.query.formato || 'json';
    sendFile(res, itens.map(i => i.toJSON()), `itens_${req.tenant.subdominio}`, formato);
  } catch (err) {
    console.error('Export itens:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/contratos?formato=json|csv
router.get('/contratos', tenantMiddleware, authenticate, async (req, res) => {
  try {
    const { Contrato, Credor } = getCachedModels(req.tenant.subdominio);
    const contratos = await Contrato.findAll({
      include: [{ model: Credor, as: 'credor', attributes: ['id', 'razao_social', 'cnpj_cpf'] }],
      order: [['created_at', 'DESC']],
    });
    const formato = req.query.formato || 'json';
    sendFile(res, contratos.map(c => c.toJSON()), `contratos_${req.tenant.subdominio}`, formato);
  } catch (err) {
    console.error('Export contratos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/credores?formato=json|csv
router.get('/credores', tenantMiddleware, authenticate, async (req, res) => {
  try {
    const { Credor } = getCachedModels(req.tenant.subdominio);
    const credores = await Credor.findAll({ order: [['razao_social', 'ASC']] });
    const formato = req.query.formato || 'json';
    sendFile(res, credores.map(c => c.toJSON()), `credores_${req.tenant.subdominio}`, formato);
  } catch (err) {
    console.error('Export credores:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── TEMPLATES DE IMPORTAÇÃO ─────────────────────────────────────────────────

const TEMPLATES = {
  processos: {
    headers: ['numero', 'assunto', 'status'],
    exemplo:  ['001/2026', 'Requerimento de licença', 'em_tramitacao'],
  },
  usuarios: {
    headers: ['nome', 'email', 'cargo', 'perfil'],
    exemplo:  ['João Silva', 'joao@prefeitura.gov.br', 'Analista', 'usuario'],
  },
  setores: {
    headers: ['nome', 'sigla', 'secretaria'],
    exemplo:  ['Protocolo Geral', 'PROT', 'Secretaria de Administração'],
  },
  documentos: {
    headers: ['nome_original', 'tipo_documento', 'processo_numero'],
    exemplo:  ['oficio_001.pdf', 'Ofício', '001/2026'],
  },
  itens: {
    headers: ['descricao', 'categoria', 'unidade_medida', 'catalogo', 'classificacao', 'especificacao', 'catmat_serv', 'status'],
    exemplo:  ['Caneta esferográfica azul', 'Material', 'UN', 'CATMAT', 'Material de Expediente', 'Caneta de tinta azul ponta 1.0mm', '7892509036010', 'ATIVO'],
  },
  contratos: {
    headers: ['tipo_contrato', 'numero_contrato', 'objeto', 'modalidade', 'numero_licitacao', 'credor_id', 'valor', 'vigencia_inicio', 'vigencia_fim', 'data_assinatura', 'secretaria', 'observacoes', 'status'],
    exemplo:  ['CONTRATO', '001/2026', 'Fornecimento de material de escritório', 'Pregão Eletrônico', 'PE-001/2026', '1', '5000.00', '2026-01-01', '2026-12-31', '2026-01-01', 'Secretaria de Administração', '', 'ATIVO'],
  },
  credores: {
    headers: ['tipo', 'razao_social', 'nome_fantasia', 'cnpj_cpf', 'email', 'telefone', 'celular', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'status'],
    exemplo:  ['Jurídica', 'Empresa Exemplo LTDA', 'Exemplo', '00.000.000/0001-00', 'contato@empresa.com', '(88) 3000-0000', '(88) 99999-9999', '63880-000', 'Rua Principal', '100', 'Sala 1', 'Centro', 'Fortaleza', 'CE', 'ATIVO'],
  },
};

// GET /api/export/modelo/:tipo  — baixar modelo CSV
router.get('/modelo/:tipo', tenantMiddleware, authenticate, (req, res) => {
  const { tipo } = req.params;
  const tpl = TEMPLATES[tipo];
  if (!tpl) return res.status(400).json({ error: `Tipo '${tipo}' não possui template.` });
  const csv = [tpl.headers.join(','), tpl.exemplo.map(v => (String(v).includes(',') ? `"${v}"` : v)).join(',')].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="modelo_${tipo}.csv"`);
  return res.send(csv);
});



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
      const lines = req.file.buffer.toString('utf-8').split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ error: 'CSV vazio ou sem dados.' });
      const headers = parseCSVLine(lines[0]);
      registros = lines.slice(1).map(line => {
        const vals = parseCSVLine(line);
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
    }

    if (!Array.isArray(registros)) registros = [registros];

    const models = req.models;
    if (!models) return res.status(500).json({ error: 'Modelos do tenant não inicializados.' });
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
    } else if (tipo === 'itens') {
      const { ContratoItem } = models;
      for (const r of registros) {
        if (!r.descricao) { ignorados++; continue; }
        const [, created] = await ContratoItem.findOrCreate({
          where: { descricao: r.descricao },
          defaults: {
            categoria: r.categoria || null,
            unidade_medida: r.unidade_medida || null,
            catalogo: r.catalogo || null,
            classificacao: r.classificacao || null,
            especificacao: r.especificacao || null,
            catmat_serv: r.catmat_serv || null,
            status: r.status || 'ATIVO',
          },
        });
        created ? importados++ : ignorados++;
      }
    } else if (tipo === 'credores') {
      const { Credor } = models;
      for (const r of registros) {
        if (!r.cnpj_cpf || !r.razao_social) { ignorados++; continue; }
        const [, created] = await Credor.findOrCreate({
          where: { cnpj_cpf: r.cnpj_cpf },
          defaults: {
            tipo: r.tipo || 'Jurídica',
            razao_social: r.razao_social,
            nome_fantasia: r.nome_fantasia || null,
            email: r.email || null,
            telefone: r.telefone || null,
            celular: r.celular || null,
            cep: r.cep || null,
            logradouro: r.logradouro || null,
            numero: r.numero || null,
            complemento: r.complemento || null,
            bairro: r.bairro || null,
            cidade: r.cidade || null,
            uf: r.uf || null,
            status: r.status || 'ATIVO',
          },
        });
        created ? importados++ : ignorados++;
      }
    } else if (tipo === 'contratos') {
      const { Contrato, Credor } = models;

      // Normaliza linha: aceita tanto colunas do sistema quanto formato externo
      const norm = (r) => {
        const aliases = {
          numerocontrato:      'numero_contrato',
          contrato:            'numero_contrato',
          numcontrato:         'numero_contrato',
          numerolicitacao:     'numero_licitacao',
          numlicitacao:        'numero_licitacao',
          numeroproceso:       'numero_licitacao',
          numeroprocimento:    'numero_licitacao',
          numeroproces:        'numero_licitacao',
          numeroprocesso:      'numero_licitacao',
          vigenciainicio:      'vigencia_inicio',
          datainicio:          'vigencia_inicio',
          vigenciafim:         'vigencia_fim',
          datafim:             'vigencia_fim',
          datatermino:         'vigencia_fim',
          datacontrato:        'data_assinatura',
          dataassinatura:      'data_assinatura',
          valorglobal:         'valor',
          valortotal:          'valor',
          valorcontrato:       'valor',
          valormensal:         'valor_mensal',
          nomecredore:         'nome_credor',
          nomecredor:          'nome_credor',
          fornecedor:          'nome_credor',
          nomefornecedor:      'nome_credor',
          cnpjcpf:             'cnpj_cpf',
          cnpj:                'cnpj_cpf',
          cpf:                 'cnpj_cpf',
          tipo:                'tipo_contrato',
          tipocontrato:        'tipo_contrato',
          descricao:           'objeto',
          descricaocontrato:   'objeto',
          objetocontrato:      'objeto',
          descricaoobjeto:     'objeto',
          objeto:              'objeto',
          modalidade:          'modalidade',
          secretaria:          'secretaria',
          status:              'status',
          observacoes:         'observacoes',
          observacao:          'observacoes',
        };
        const out = {};
        for (const [k, v] of Object.entries(r)) {
          const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          out[aliases[key] || k.toLowerCase()] = v;
        }
        return out;
      };

      // Log diagnóstico na primeira linha
      if (registros.length > 0) {
        console.log('[import contratos] colunas:', Object.keys(registros[0]));
        console.log('[import contratos] primeira linha normalizada:', norm(registros[0]));
      }

      let invalidos = 0;
      let atualizados = 0;

      for (const raw of registros) {
        const r = norm(raw);
        const numeroContrato = (r.numero_contrato || '').trim();
        if (!numeroContrato) { invalidos++; ignorados++; continue; }

        const objeto = (r.objeto || '').trim() || 'Importado';

        // Resolve credor: por credor_id (sistema) ou por cnpj_cpf + nome (externo)
        let credorId = r.credor_id ? parseInt(r.credor_id) : null;
        if (!credorId && (r.cnpj_cpf || r.nome_credor)) {
          const cnpj = (r.cnpj_cpf || '').replace(/\D/g, '');
          const nome = (r.nome_credor || '').trim() || 'Credor importado';
          const tipoCredor = cnpj.length > 0 && cnpj.length <= 11 ? 'Física' : 'Jurídica';
          const [credor] = await Credor.findOrCreate({
            where: { cnpj_cpf: cnpj || nome },
            defaults: { razao_social: nome, cnpj_cpf: cnpj || nome, tipo: tipoCredor, status: 'ATIVO' },
          });
          credorId = credor.id;
        }

        const dadosContrato = {
          tipo_contrato: r.tipo_contrato || 'CONTRATO',
          objeto,
          modalidade: r.modalidade || null,
          numero_licitacao: r.numero_licitacao || null,
          credor_id: credorId,
          valor: r.valor ? parseFloat(String(r.valor).replace(/\./g, '').replace(',', '.')) : null,
          vigencia_inicio: r.vigencia_inicio || null,
          vigencia_fim: r.vigencia_fim || null,
          data_assinatura: r.data_assinatura || null,
          secretaria: r.secretaria || null,
          observacoes: r.observacoes || null,
          status: r.status || 'ATIVO',
        };

        const existente = await Contrato.findOne({ where: { numero_contrato: numeroContrato } });
        if (existente) {
          await existente.update(dadosContrato);
          atualizados++;
        } else {
          await Contrato.create({ numero_contrato: numeroContrato, ...dadosContrato });
          importados++;
        }
      }

      // Complementa mensagem final
      ignorados = invalidos; // já existiam viram "atualizados"
      if (atualizados > 0) {
        return res.json({
          message: `Importação concluída: ${importados} inserido(s), ${atualizados} atualizado(s), ${invalidos} inválido(s).`,
          importados,
          atualizados,
          ignorados: invalidos,
        });
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
