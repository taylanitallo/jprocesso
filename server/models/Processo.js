const { DataTypes } = require('sequelize');

const defineProcessoModel = (sequelize) => {
  return sequelize.define('Processo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'numero',
      comment: 'Formato: AAAA.NNNN (ex: 2026.0001)'
    },
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Ano de abertura do processo'
    },
    sequencial: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Número sequencial dentro do ano'
    },
    assunto: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Título/resumo do processo'
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Descrição detalhada do processo'
    },
    interessado_nome: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome do cidadão/empresa interessada'
    },
    interessado_cpf_cnpj: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment: 'CPF ou CNPJ do interessado (sem pontuação)'
    },
    interessado_email: {
      type: DataTypes.STRING,
      comment: 'Email do interessado (opcional)'
    },
    interessado_telefone: {
      type: DataTypes.STRING(11),
      comment: 'Telefone do interessado (opcional)'
    },
    status: {
      type: DataTypes.ENUM('aberto', 'em_analise', 'pendente', 'devolvido', 'concluido', 'arquivado'),
      defaultValue: 'aberto',
      field: 'status',
      comment: 'Status atual do processo'
    },
    setor_atual_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Setor onde o processo está atualmente'
    },
    usuario_atual_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Usuário responsável atual'
    },
    qrcode: {
      type: DataTypes.TEXT,
      comment: 'QR Code em base64 para consulta pública'
    },
    prioridade: {
      type: DataTypes.ENUM('baixa', 'normal', 'alta', 'urgente'),
      defaultValue: 'normal',
      comment: 'Prioridade do processo'
    },
    data_abertura: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Data/hora de abertura do processo'
    },
    data_conclusao: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data/hora de conclusão (se aplicável)'
    },
    criado_por_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: Usuário que abriu o processo'
    },
    tipo_processo: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Tipo do processo: Requisição, Did, Pauta, Despacho'
    },
    observacoes: {
      type: DataTypes.TEXT,
      comment: 'Observações gerais sobre o processo'
    }
  }, {
    tableName: 'processos',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineProcessoModel;
