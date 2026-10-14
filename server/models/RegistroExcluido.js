const { DataTypes } = require('sequelize');

// Lixeira: quem excluiu cada registro e quando (o registro fica na tabela de origem)
module.exports = (sequelize) => {
  return sequelize.define('RegistroExcluido', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    entidade:          { type: DataTypes.STRING(50), allowNull: false },
    registro_id:       { type: DataTypes.STRING(100), allowNull: false },
    descricao:         { type: DataTypes.TEXT },
    status_anterior:   { type: DataTypes.STRING(30) },
    excluido_por_id:   { type: DataTypes.UUID },
    excluido_por_nome: { type: DataTypes.STRING(255) },
    excluido_em:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    restauravel:       { type: DataTypes.BOOLEAN, defaultValue: true },
    motivo_bloqueio:   { type: DataTypes.TEXT },
  }, {
    tableName: 'registros_excluidos',
    timestamps: false,
  });
};
