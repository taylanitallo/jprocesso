const { DataTypes } = require('sequelize');

/**
 * Log de auditoria do módulo Almoxarifado.
 * Registra todas as ações relevantes: criação, aprovação, cancelamento, entrega, etc.
 */
const defineAlmoxAuditLogModel = (sequelize) => {
  return sequelize.define('AlmoxAuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tabela: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nome da tabela afetada: almoxarifado_requisicoes, almoxarifado_lotes, etc.'
    },
    registro_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'UUID ou ID do registro afetado'
    },
    acao: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'CRIOU, AUTORIZOU, SEPAROU, ENTREGOU, CANCELOU, ENTRADA, SAIDA'
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição legível da ação realizada'
    },
    dados_anteriores: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Estado anterior do registro (snapshot)'
    },
    dados_novos: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Estado novo após a ação (snapshot)'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Usuário que realizou a ação'
    },
    user_nome: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Nome do usuário (desnormalizado para histórico)'
    },
    ip: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'IP da origem da requisição'
    }
  }, {
    tableName: 'almoxarifado_audit_log',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });
};

module.exports = defineAlmoxAuditLogModel;
