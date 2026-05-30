const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const storage = require('../services/storageService');

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

    const buffer = req.file.buffer;
    const hash_sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const hash_md5 = crypto.createHash('md5').update(buffer).digest('hex');

    const ext = path.extname(req.file.originalname);
    const nomeSistema = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const storagePath = `${req.tenant.schema}/${processoId}/${nomeSistema}`;

    await storage.uploadDocumento({
      buffer,
      path: storagePath,
      contentType: req.file.mimetype
    });

    const documento = await Documento.create({
      processo_id: processoId,
      nome_sistema: nomeSistema,
      nome_arquivo: req.file.originalname,
      tipo_mime: req.file.mimetype,
      tamanho_bytes: req.file.size,
      url_arquivo: storagePath,
      hash_md5,
      hash_sha256,
      upload_por_id: req.user.id
    });

    res.status(201).json({
      message: 'Documento enviado com sucesso',
      documento: {
        id: documento.id,
        nome_arquivo: documento.nome_arquivo,
        tipo_mime: documento.tipo_mime,
        tamanho_bytes: documento.tamanho_bytes,
        createdAt: documento.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
};

const downloadDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { Documento } = req.models;

    const documento = await Documento.findByPk(id);

    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Fallback local para documentos legados (gravados antes da ETAPA 59)
    if (storage.isLocalPath(documento.url_arquivo)) {
      if (!fs.existsSync(documento.url_arquivo)) {
        return res.status(404).json({ error: 'Arquivo não encontrado no servidor. Pode ter sido removido após redeploy.' });
      }
      return res.download(documento.url_arquivo, documento.nome_arquivo);
    }

    // Supabase Storage — redireciona para signed URL de curta duração
    const signedUrl = await storage.createSignedUrl(documento.url_arquivo, 60);
    res.redirect(signedUrl);
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ error: 'Erro ao fazer download do documento' });
  }
};

const listDocumentos = async (req, res) => {
  try {
    const { processoId } = req.query;
    const { Documento, User } = req.models;

    const where = {};
    if (processoId) {
      where.processo_id = processoId;
    }

    const documentos = await Documento.findAll({
      where,
      include: [
        { model: User, as: 'uploadPor', attributes: ['id', 'nome'] }
      ],
      order: [['data_upload', 'DESC']]
    });

    res.json({ documentos });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({ error: 'Erro ao listar documentos' });
  }
};

const deleteDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { Documento } = req.models;

    const documento = await Documento.findByPk(id);
    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    if (storage.isLocalPath(documento.url_arquivo)) {
      // Legado: arquivo local
      if (fs.existsSync(documento.url_arquivo)) {
        try { fs.unlinkSync(documento.url_arquivo); } catch (_) {}
      }
    } else {
      // Supabase Storage
      try { await storage.deleteDocumento(documento.url_arquivo); } catch (_) {}
    }

    await documento.destroy();

    res.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
};

module.exports = {
  uploadDocumento,
  downloadDocumento,
  listDocumentos,
  deleteDocumento
};
