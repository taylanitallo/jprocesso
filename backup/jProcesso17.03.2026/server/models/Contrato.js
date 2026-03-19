const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Contrato', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_contrato: { type: DataTypes.STRING(50), defaultValue: 'CONTRATO' },
    numero_contrato: { type: DataTypes.STRING(50), allowNull: false },
    objeto: { type: DataTypes.TEXT, allowNull: false },
    modalidade: { type: DataTypes.STRING(100) },
    numero_licitacao: { type: DataTypes.STRING(100) },
    credor_id: { type: DataTypes.INTEGER },
    valor: { type: DataTypes.DECIMAL(15, 2) },
    vigencia_inicio: { type: DataTypes.DATEONLY },
    vigencia_fim: { type: DataTypes.DATEONLY },
    data_assinatura: { type: DataTypes.DATEONLY },
    secretaria: { type: DataTypes.STRING(200) },
    fiscal: { type: DataTypes.STRING(500) },
    observacoes: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(20), defaultValue: 'ATIVO' },
    dias_alerta: { type: DataTypes.INTEGER, defaultValue: 30 },
  }, {
    tableName: 'contratos',
    timestamps: true,
    underscored: true,
  });
};
