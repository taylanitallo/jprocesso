const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ContratoOrdem', {
    id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo:                  { type: DataTypes.STRING(20), allowNull: false }, // COMPRA | SERVICO
    numero:                { type: DataTypes.STRING(50), allowNull: false },
    contrato_id:           { type: DataTypes.INTEGER, allowNull: false },
    data_emissao:          { type: DataTypes.DATEONLY, allowNull: false },
    data_entrega_prevista: { type: DataTypes.DATEONLY },
    objeto:                { type: DataTypes.TEXT, allowNull: false },
    justificativa:         { type: DataTypes.TEXT },
    secretaria:            { type: DataTypes.STRING(200) },
    fiscal_responsavel:    { type: DataTypes.STRING(200) },
    local_entrega:         { type: DataTypes.STRING(500) },
    valor_total:           { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    observacoes:           { type: DataTypes.TEXT },
    status:                { type: DataTypes.STRING(20), defaultValue: 'EMITIDA' }, // EMITIDA | ATENDIDA | CANCELADA
  }, {
    tableName: 'contratos_ordens',
    timestamps: true,
    underscored: true,
  });
};
