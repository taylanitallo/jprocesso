const { DataTypes } = require('sequelize');

const defineFinanceiroLancamentoModel = (sequelize) => {
  return sequelize.define('FinanceiroLancamento', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: false
    },
    valor: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    data_lancamento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    secretaria_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    processo_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    dotacao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    empenho: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pendente'
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'financeiro_lancamentos',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineFinanceiroLancamentoModel;
