const { DataTypes } = require('sequelize');

const defineDocumentoModel = (sequelize) => {
  return sequelize.define('Documento', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    processo_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Processo ao qual o documento pertence (null para documentos avulsos)'
    },
    tipo_origem: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: 'anexo',
      comment: 'Origem do documento: anexo | did | ordem | despacho | oficio | pauta | requisicao'
    },
    nome_arquivo: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome original do arquivo'
    },
    nome_sistema: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome único gerado pelo sistema'
    },
    url_arquivo: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'URL completa do arquivo (S3, local storage, etc)'
    },
    tipo_mime: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Tipo MIME do arquivo (application/pdf, image/jpeg, etc)'
    },
    tamanho_bytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Tamanho do arquivo em bytes'
    },
    hash_md5: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Hash MD5 para integridade do arquivo'
    },
    hash_sha256: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Hash SHA-256 para segurança adicional'
    },
    upload_por_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: Usuário que fez o upload'
    },
    data_upload: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Data/hora do upload'
    },
    descricao: {
      type: DataTypes.TEXT,
      comment: 'Descrição opcional do documento'
    },
    versao: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Versão do documento (para controle de versões)'
    },
    ordem: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Posição de exibição (drag-and-drop)'
    }
  }, {
    tableName: 'anexos',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['processo_id'] },
      { fields: ['upload_por_id'] },
      { fields: ['hash_sha256'] }
    ]
  });
};

module.exports = defineDocumentoModel;
