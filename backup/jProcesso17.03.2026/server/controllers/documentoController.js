const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const { processoId } = req.body;
    const { Processo, Documento } = req.models;

    const processo = await Processo.findByPk(processoId);
    if (!processo) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const documento = await Documento.create({
      processoId,
      nome: req.file.filename,
      nomeOriginal: req.file.originalname,
      tipo: req.file.mimetype,
      tamanho: req.file.size,
      caminho: req.file.path,
      hash,
      uploadPorId: req.user.id
    });

    res.status(201).json({
      message: 'Documento enviado com sucesso',
      documento: {
        id: documento.id,
        nomeOriginal: documento.nomeOriginal,
        tipo: documento.tipo,
        tamanho: documento.tamanho
      }
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
};

const downloadDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { Documento, Processo } = req.models;

    const documento = await Documento.findByPk(id, {
      include: [{ model: Processo, as: 'processo' }]
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    if (!fs.existsSync(documento.caminho)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    res.download(documento.caminho, documento.nomeOriginal);
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
      where.processoId = processoId;
    }

    const documentos = await Documento.findAll({
      where,
      include: [
        { model: User, as: 'uploadPor', attributes: ['id', 'nome'] }
      ],
      order: [['created_at', 'DESC']]
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

    if (fs.existsSync(documento.caminho)) {
      fs.unlinkSync(documento.caminho);
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
