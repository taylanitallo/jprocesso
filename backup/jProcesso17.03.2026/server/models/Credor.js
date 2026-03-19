const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Credor', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo: { type: DataTypes.STRING(10), defaultValue: 'Jurídica' },
    razao_social: { type: DataTypes.STRING(500), allowNull: false },
    nome_fantasia: { type: DataTypes.STRING(500) },
    cnpj_cpf: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(255) },
    telefone: { type: DataTypes.STRING(20) },
    celular: { type: DataTypes.STRING(20) },
    cep: { type: DataTypes.STRING(9) },
    logradouro: { type: DataTypes.STRING(500) },
    numero: { type: DataTypes.STRING(20) },
    complemento: { type: DataTypes.STRING(200) },
    bairro: { type: DataTypes.STRING(200) },
    cidade: { type: DataTypes.STRING(200) },
    uf: { type: DataTypes.STRING(2) },
    status: { type: DataTypes.STRING(20), defaultValue: 'ATIVO' },
  }, {
    tableName: 'credores',
    timestamps: true,
    underscored: true,
  });
};
