const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ContratoItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(10) },
    descricao: { type: DataTypes.STRING(500), allowNull: false },
    categoria: { type: DataTypes.STRING(100) },
    unidade_medida: { type: DataTypes.STRING(50) },
    catalogo: { type: DataTypes.STRING(50) },
    classificacao: { type: DataTypes.STRING(200) },
    subclassificacao: { type: DataTypes.STRING(200) },
    especificacao: { type: DataTypes.TEXT },
    palavra1: { type: DataTypes.STRING(200) },
    palavra2: { type: DataTypes.STRING(200) },
    palavra3: { type: DataTypes.STRING(200) },
    palavra4: { type: DataTypes.STRING(200) },
    catmat_serv: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.STRING(20), defaultValue: 'ATIVO' },
    validado: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'contratos_itens',
    timestamps: true,
    underscored: true,
  });
};
