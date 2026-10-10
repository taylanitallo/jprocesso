const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ContratoOrdemItem', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ordem_id:       { type: DataTypes.INTEGER, allowNull: false },
    item_id:        { type: DataTypes.INTEGER },          // ref ao catálogo (opcional)
    descricao:      { type: DataTypes.STRING(500), allowNull: false },
    unidade:        { type: DataTypes.STRING(50) },
    lote:           { type: DataTypes.STRING(50) },
    codigo_item:    { type: DataTypes.STRING(100) },
    quantidade:     { type: DataTypes.DECIMAL(15, 4), defaultValue: 1 },
    valor_unitario: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    valor_total:    { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    ordem:          { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'contratos_ordens_itens',
    timestamps: true,
    underscored: true,
  });
};
