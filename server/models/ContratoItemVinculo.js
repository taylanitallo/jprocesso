const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ContratoItemVinculo', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    contrato_id:    { type: DataTypes.INTEGER, allowNull: false },
    item_id:        { type: DataTypes.INTEGER },
    lote:           { type: DataTypes.STRING(50) },
    descricao:      { type: DataTypes.STRING(500), allowNull: false },
    unidade:        { type: DataTypes.STRING(50) },
    quantidade:     { type: DataTypes.DECIMAL(15, 4) },
    valor_unitario: { type: DataTypes.DECIMAL(15, 2) },
    valor_total:    { type: DataTypes.DECIMAL(15, 2) },
    ordem:          { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'contratos_itens_vinculo',
    timestamps: true,
    underscored: true,
  });
};
