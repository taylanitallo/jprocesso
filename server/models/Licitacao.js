const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Licitacao', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero_licitacao: { type: DataTypes.STRING(100), allowNull: false },
    numero_processo: { type: DataTypes.STRING(100) },
    modalidade: { type: DataTypes.STRING(100) },
    tipo_objeto: { type: DataTypes.STRING(100) },
    criterio_julgamento: { type: DataTypes.STRING(100) },
    registro_preco: { type: DataTypes.BOOLEAN, defaultValue: false },
    objeto: { type: DataTypes.TEXT, allowNull: false },
    secretaria: { type: DataTypes.STRING(200) },
    agente_contratacao: { type: DataTypes.STRING(300) },
    valor_estimado: { type: DataTypes.DECIMAL(15, 2) },
    valor_homologado: { type: DataTypes.DECIMAL(15, 2) },
    data_publicacao: { type: DataTypes.DATEONLY },
    data_abertura: { type: DataTypes.DATEONLY },
    data_homologacao: { type: DataTypes.DATEONLY },
    link_pncp: { type: DataTypes.STRING(500) },
    observacoes: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(20), defaultValue: 'EM ANDAMENTO' },
  }, {
    tableName: 'licitacoes',
    timestamps: true,
    underscored: true,
  });
};
