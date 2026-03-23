const { DataTypes } = require('sequelize');

const defineLogModel = (sequelize) => {
  return sequelize.define('Log', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Usuário que realizou a ação (null = sistema)'
    },
    acao: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Código da ação (ex: criar_processo, tramitar_processo, login)'
    },
    modulo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Módulo onde a ação ocorreu (processos, financeiro, almoxarifado, etc.)'
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Texto descritivo do que foi feito'
    },
    referencia_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID do registro afetado (processo, lançamento, etc.)'
    },
    referencia_numero: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número/código legível do registro afetado (ex: número do processo)'
    },
    secretaria_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Secretaria do usuário no momento da ação'
    },
    setor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Setor do usuário no momento da ação'
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP de origem da requisição'
    },
    user_agent: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: 'User-agent do navegador'
    },
    dados_extras: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Dados adicionais em formato livre'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'logs',
    timestamps: false,
    indexes: [
      { fields: ['usuario_id'] },
      { fields: ['modulo'] },
      { fields: ['acao'] },
      { fields: ['secretaria_id'] },
      { fields: ['setor_id'] },
      { fields: ['created_at'] }
    ]
  });
};

module.exports = defineLogModel;
