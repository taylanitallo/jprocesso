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

    // A-2: join obrigatório com Processo garante que o documento
    // pertence a um processo do tenant atual (schema isolado)
    const documento = await Documento.findOne({
      where: { id },
      include: [{ model: Processo, as: 'processo', required: true, attributes: ['id'] }],
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
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
      where.processo_id = processoId;
    }

    const documentos = await Documento.findAll({
      where,
      include: [{ model: User, as: 'uploadPor', attributes: ['id', 'nome'] }],
      order: [['data_upload', 'DESC']],
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

    // A-2: join obrigatório garante pertencimento ao tenant atual
    const documento = await Documento.findOne({
      where: { id },
      include: [{ model: Processo, as: 'processo', required: true, attributes: ['id'] }],
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // A-2: apenas admin, gestor ou o próprio uploader podem excluir
    const papel      = req.user?.tipo;
    const isUploader = documento.upload_por_id === req.user?.id;
    if (papel !== 'admin' && papel !== 'gestor' && !isUploader) {
      return res.status(403).json({ error: 'Sem permissão para excluir este documento' });
    }

    if (storage.isLocalPath(documento.url_arquivo)) {
      if (fs.existsSync(documento.url_arquivo)) {
        try { fs.unlinkSync(documento.url_arquivo); } catch (_) {}
      }
    } else {
      try { await storage.deleteDocumento(documento.url_arquivo); } catch (_) {}
    }

    await documento.destroy();
    res.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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

module.exports = {
  uploadDocumento,
  downloadDocumento,
  listDocumentos,
  deleteDocumento,
};
