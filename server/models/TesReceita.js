const { DataTypes } = require('sequelize');

const defineTesReceitaModel = (sequelize) => {
  return sequelize.define('TesReceita', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conta_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    descricao: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    valor: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    observacao: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'tes_receitas',
    timestamps: true,
    // Lixeira: excluir só marca deleted_at; apagar de vez é pela tela Excluídos
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
  });
};

module.exports = defineTesReceitaModel;
