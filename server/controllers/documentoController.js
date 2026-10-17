const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const { PDFDocument } = require('pdf-lib');
const storage = require('../services/storageService');
const { situacaoRecebimento, MSG_BLOQUEADO } = require('../utils/recebimento');
const { excluir } = require('../services/lixeiraService');
const { usuarioTemPermissao } = require('../middleware/auth');

// Documentos de processo ainda não recebido pelo destino ficam inacessíveis a ele
const bloqueadoAteReceber = async (req, processo) =>
  !!processo && (await situacaoRecebimento(req, processo)).bloqueado;

const ATRIBUTOS_ACESSO = ['id', 'numero', 'status', 'setor_atual_id', 'usuario_atual_id'];

const uploadDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const { processoId } = req.body;
    const { Processo, Documento } = req.models;

    const processo = await Processo.findByPk(processoId);
    if (!processo) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (processo.status === 'concluido') {
      return res.status(400).json({ error: 'Processos concluídos não aceitam novos documentos' });
    }
    if (await bloqueadoAteReceber(req, processo)) {
      return res.status(403).json({ error: MSG_BLOQUEADO });
    }

    const buffer = req.file.buffer;
    const hash_sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const hash_md5    = crypto.createHash('md5').update(buffer).digest('hex');

    const ext        = path.extname(req.file.originalname);
    const nomeSistema = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const storagePath = `${req.tenant.schema}/${processoId}/${nomeSistema}`;

    // A-1: MIME derivado da extensão validada pelo servidor, nunca do cliente
    const mimeSeguro = _mimeFromExt(ext.toLowerCase()) || 'application/octet-stream';

    await storage.uploadDocumento({
      buffer,
      path: storagePath,
      contentType: mimeSeguro,
    });

    const countExistentes = await Documento.count({ where: { processo_id: processoId } });

    const documento = await Documento.create({
      processo_id:   processoId,
      nome_sistema:  nomeSistema,
      nome_arquivo:  req.file.originalname,
      tipo_mime:     mimeSeguro,
      tamanho_bytes: req.file.size,
      url_arquivo:   storagePath,
      hash_md5,
      hash_sha256,
      upload_por_id: req.user.id,
      ordem:         countExistentes,
    });

    res.status(201).json({
      message: 'Documento enviado com sucesso',
      documento: {
        id:            documento.id,
        nome_arquivo:  documento.nome_arquivo,
        tipo_mime:     documento.tipo_mime,
        tamanho_bytes: documento.tamanho_bytes,
        createdAt:     documento.createdAt,
      },
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const downloadDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { Documento, Processo } = req.models;

    // Schema isolado por tenant já garante o pertencimento. LEFT JOIN para
    // não excluir documentos gerados avulsos (sem processo_id), como ordens.
    const documento = await Documento.findOne({
      where: { id },
      include: [{ model: Processo, as: 'processo', required: false, attributes: ATRIBUTOS_ACESSO }],
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    if (await bloqueadoAteReceber(req, documento.processo)) {
      return res.status(403).json({ error: MSG_BLOQUEADO });
    }

    // Fallback local para documentos legados
    if (storage.isLocalPath(documento.url_arquivo)) {
      if (!fs.existsSync(documento.url_arquivo)) {
        return res.status(404).json({ error: 'Arquivo não encontrado no servidor.' });
      }
      return res.download(documento.url_arquivo, documento.nome_arquivo);
    }

    const signedUrl = await storage.createSignedUrl(documento.url_arquivo, 60);
    res.redirect(signedUrl);
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const listDocumentos = async (req, res) => {
  try {
    const { processoId } = req.query;
    const { Documento, User, Processo } = req.models;

    // A-2: sem processoId, apenas admin/gestor podem listar todos os documentos
    if (!processoId) {
      const papel = req.user?.tipo;
      if (papel !== 'admin' && papel !== 'gestor') {
        return res.status(400).json({ error: 'processoId é obrigatório' });
      }
    }

    const where = {};
    if (processoId) {
      // Valida que o processo existe no tenant antes de listar seus documentos
      const processo = await Processo.findByPk(processoId);
      if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
      if (await bloqueadoAteReceber(req, processo)) return res.status(403).json({ error: MSG_BLOQUEADO });
      where.processo_id = processoId;
    }

    const documentos = await Documento.findAll({
      where,
      include: [{ model: User, as: 'uploadPor', attributes: ['id', 'nome'] }],
      order: [['ordem', 'ASC'], ['data_upload', 'ASC']],
    });

    res.json({ documentos });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const deleteDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { Documento, Processo } = req.models;

    // A-2: schema isolado por tenant garante pertencimento. LEFT JOIN para
    // permitir excluir documentos gerados avulsos (sem processo_id).
    const documento = await Documento.findOne({
      where: { id },
      include: [{ model: Processo, as: 'processo', required: false, attributes: ['id'] }],
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const papel = req.user?.tipo;

    // Documentos gerados (DID, despacho, ofício, ordem, etc. — mesmo filtro da aba
    // "Documentos Gerados") só podem ser excluídos por administradores.
    if (documento.tipo_origem && documento.tipo_origem !== 'anexo') {
      if (!['admin', 'jeos'].includes(papel)) {
        return res.status(403).json({ error: 'Apenas administradores podem excluir documentos gerados' });
      }
      // Ger. de Arquivos › Documentos Gerados › Excluir
      if (!(await usuarioTemPermissao(req, 'arquivo', 'gerados', 'excluir'))) {
        return res.status(403).json({ error: 'Sem permissão para excluir documentos gerados' });
      }
    } else {
      // Processos › Excluir doc.
      if (!(await usuarioTemPermissao(req, 'processos', 'excluir_documento'))) {
        return res.status(403).json({ error: 'Sem permissão para excluir documentos' });
      }
      // Anexo comum de processo: admin, gestor ou o próprio uploader podem excluir
      const isUploader = documento.upload_por_id === req.user?.id;
      if (!['admin', 'gestor', 'jeos'].includes(papel) && !isUploader) {
        return res.status(403).json({ error: 'Sem permissão para excluir este documento' });
      }
    }

    // Vai para os Excluídos com o arquivo intacto; o arquivo só sai do storage
    // quando o documento for apagado de vez (lixeiraService)
    await excluir(req, 'documentos', documento);
    res.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ── Mover documento para outro processo concluído ────────────────────────────
const moverDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { processoDestinoId } = req.body;
    const { Documento, Processo } = req.models;

    if (!processoDestinoId) {
      return res.status(400).json({ error: 'processoDestinoId é obrigatório' });
    }

    const documento = await Documento.findOne({
      where: { id },
      include: [{ model: Processo, as: 'processo', required: true, attributes: ['id'] }],
    });
    if (!documento) return res.status(404).json({ error: 'Documento não encontrado' });

    const destino = await Processo.findOne({
      where: { id: processoDestinoId, status: 'concluido' },
      attributes: ['id', 'numero'],
    });
    if (!destino) return res.status(404).json({ error: 'Processo destino não encontrado ou não concluído' });

    await documento.update({ processo_id: processoDestinoId });
    res.json({ message: 'Documento movido com sucesso', processoNumero: destino.numero });
  } catch (error) {
    console.error('Erro ao mover documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ── Visualizar documento em nova aba (retorna signed URL para inline) ────────
const viewDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { Documento, Processo } = req.models;

    const documento = await Documento.findOne({
      where: { id },
      include: [{ model: Processo, as: 'processo', required: false, attributes: ATRIBUTOS_ACESSO }],
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    if (await bloqueadoAteReceber(req, documento.processo)) {
      return res.status(403).json({ error: MSG_BLOQUEADO });
    }

    if (storage.isLocalPath(documento.url_arquivo)) {
      return res.status(400).json({ error: 'Visualização não disponível para arquivos legados' });
    }

    // TTL de 5 min — suficiente para o navegador abrir e renderizar o PDF
    const signedUrl = await storage.createSignedUrl(documento.url_arquivo, 300);
    res.json({ signedUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de visualização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ── Download ZIP com todos os documentos do processo ─────────────────────────
const downloadZip = async (req, res) => {
  try {
    const { processoId } = req.params;
    const { Documento, Processo } = req.models;

    const processo = await Processo.findByPk(processoId, { attributes: ATRIBUTOS_ACESSO });
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (await bloqueadoAteReceber(req, processo)) return res.status(403).json({ error: MSG_BLOQUEADO });

    const documentos = await Documento.findAll({
      where: { processo_id: processoId },
      order: [['data_upload', 'ASC']],
    });

    if (documentos.length === 0) {
      return res.status(404).json({ error: 'Nenhum documento encontrado' });
    }

    const nomeZip = `${processo.numero.replace(/[/\\?%*:|"<>]/g, '-')}-documentos.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeZip}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    // Nomes únicos dentro do ZIP
    const usados = {};
    for (const doc of documentos) {
      let nome = doc.nome_arquivo || 'documento';
      if (usados[nome]) {
        const ext  = path.extname(nome);
        const base = path.basename(nome, ext);
        nome = `${base}_(${usados[nome]})${ext}`;
      }
      usados[doc.nome_arquivo || 'documento'] = (usados[doc.nome_arquivo || 'documento'] || 0) + 1;

      let buffer;
      if (storage.isLocalPath(doc.url_arquivo)) {
        if (!fs.existsSync(doc.url_arquivo)) continue;
        buffer = fs.readFileSync(doc.url_arquivo);
      } else {
        buffer = await storage.downloadDocumento(doc.url_arquivo);
      }
      archive.append(buffer, { name: nome });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Erro ao gerar ZIP:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Erro ao gerar arquivo ZIP' });
  }
};

// ── Download PDF único (junção sequencial de todos os PDFs) ──────────────────
const downloadMerged = async (req, res) => {
  try {
    const { processoId } = req.params;
    const { Documento, Processo } = req.models;

    const processo = await Processo.findByPk(processoId, { attributes: ATRIBUTOS_ACESSO });
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (await bloqueadoAteReceber(req, processo)) return res.status(403).json({ error: MSG_BLOQUEADO });

    const documentos = await Documento.findAll({
      where: { processo_id: processoId },
      order: [['data_upload', 'ASC']],
    });

    const pdfDocs = documentos.filter(d => d.tipo_mime === 'application/pdf');
    if (pdfDocs.length === 0) {
      return res.status(404).json({ error: 'Nenhum PDF encontrado para mesclar' });
    }

    const merged = await PDFDocument.create();

    for (const doc of pdfDocs) {
      let buffer;
      if (storage.isLocalPath(doc.url_arquivo)) {
        if (!fs.existsSync(doc.url_arquivo)) continue;
        buffer = fs.readFileSync(doc.url_arquivo);
      } else {
        buffer = await storage.downloadDocumento(doc.url_arquivo);
      }
      try {
        const pdf   = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      } catch {
        // PDF corrompido ou protegido — pula sem abortar o restante
      }
    }

    if (merged.getPageCount() === 0) {
      return res.status(422).json({ error: 'Nenhum PDF pôde ser processado' });
    }

    const bytes    = await merged.save();
    const nomePdf  = `${processo.numero.replace(/[/\\?%*:|"<>]/g, '-')}-unificado.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomePdf}"`);
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Erro ao mesclar PDFs:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Erro ao mesclar documentos' });
  }
};

// MIME derivado da extensão — nunca do campo reportado pelo cliente
function _mimeFromExt(ext) {
  const map = {
    '.pdf':  'application/pdf',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.doc':  'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls':  'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] || null;
}

const reorderDocumentos = async (req, res) => {
  try {
    const { items } = req.body; // [{id, ordem}]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Lista de itens inválida' });
    }
    const { Documento } = req.models;
    await Promise.all(
      items.map(({ id, ordem }) => Documento.update({ ordem }, { where: { id } }))
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao reordenar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Salva PDF gerado automaticamente (DID, despacho, ofício, pauta, requisição, ordem)
const salvarDocumentoGerado = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });

    const { processoId, tipoOrigem = 'gerado', nomeExibicao } = req.body;
    const { Processo, Documento } = req.models;

    // Valida processo somente se informado
    if (processoId) {
      const processo = await Processo.findByPk(processoId);
      if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    }

    const buffer     = req.file.buffer;
    const hash_sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const hash_md5    = crypto.createHash('md5').update(buffer).digest('hex');

    const ext         = path.extname(req.file.originalname) || '.pdf';
    const nomeSistema = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const pasta       = processoId
      ? `${req.tenant.schema}/${processoId}/${nomeSistema}`
      : `${req.tenant.schema}/gerados/${tipoOrigem}/${nomeSistema}`;

    await storage.uploadDocumento({ buffer, path: pasta, contentType: 'application/pdf' });

    const countExistentes = processoId
      ? await Documento.count({ where: { processo_id: processoId } })
      : 0;

    const documento = await Documento.create({
      processo_id:   processoId || null,
      nome_sistema:  nomeSistema,
      nome_arquivo:  nomeExibicao || req.file.originalname,
      tipo_mime:     'application/pdf',
      tamanho_bytes: req.file.size,
      url_arquivo:   pasta,
      hash_md5,
      hash_sha256,
      upload_por_id: req.user.id,
      tipo_origem:   tipoOrigem,
      ordem:         countExistentes,
    });

    res.status(201).json({ message: 'Documento salvo com sucesso', documentoId: documento.id });
  } catch (error) {
    console.error('Erro ao salvar documento gerado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Lista documentos gerados (sem processo ou com tipo_origem != 'anexo')
const listarDocumentosGerados = async (req, res) => {
  try {
    const { Documento, User } = req.models;
    const { Op } = require('sequelize');

    const docs = await Documento.findAll({
      where: { tipo_origem: { [Op.ne]: 'anexo' } },
      include: [{ model: User, as: 'uploadPor', attributes: ['id', 'nome'] }],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    res.json({ documentos: docs });
  } catch (error) {
    console.error('Erro ao listar documentos gerados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  uploadDocumento,
  downloadDocumento,
  viewDocumento,
  downloadZip,
  downloadMerged,
  moverDocumento,
  listDocumentos,
  deleteDocumento,
  reorderDocumentos,
  salvarDocumentoGerado,
  listarDocumentosGerados,
};
