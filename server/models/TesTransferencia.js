const { DataTypes } = require('sequelize');

// Transferência entre contas bancárias da Tesouraria: sai da conta de origem e entra
// na de destino na mesma data (caixaService › movimentos). Guarda quem registrou.
const defineTesTransferenciaModel = (sequelize) => {
  return sequelize.define('TesTransferencia', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    conta_origem_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    conta_destino_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    valor: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    observacao: {
      type: DataTypes.TEXT,
    },
    usuario_id: {
      type: DataTypes.UUID,
    },
    usuario_nome: {
      type: DataTypes.STRING(200),
    },
  }, {
    tableName: 'tes_transferencias',
    timestamps: true,
    underscored: true,
  });
};

module.exports = defineTesTransferenciaModel;
