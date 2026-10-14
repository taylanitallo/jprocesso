const { DataTypes } = require('sequelize');

// Agentes (gestores) — o CRUD da Organização usa SQL direto; o modelo existe para a lixeira
module.exports = (sequelize) => {
  return sequelize.define('Agente', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome:          { type: DataTypes.STRING(500), allowNull: false },
    cargo:         { type: DataTypes.STRING(300) },
    matricula:     { type: DataTypes.STRING(50) },
    cpf:           { type: DataTypes.STRING(14) },
    email:         { type: DataTypes.STRING(255) },
    telefone:      { type: DataTypes.STRING(20) },
    secretaria_id: { type: DataTypes.UUID },
    excluido_em:   { type: DataTypes.DATE, allowNull: true },
    ativo:         { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'agentes',
    timestamps: true,
    underscored: true,
  });
};
