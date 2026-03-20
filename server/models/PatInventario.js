const { DataTypes } = require('sequelize');

const definePatInventarioModel = (sequelize) => {
  return sequelize.define('PatInventario', {
    id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    numero:             { type: DataTypes.STRING(30), unique: true, allowNull: false, comment: 'Ex: INV-PAT-2026-0001' },
    ano_exercicio:      { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'),
      defaultValue: 'EM_ANDAMENTO'
    },
    data_inicio:        { type: DataTypes.DATEONLY, allowNull: false },
    data_conclusao:     { type: DataTypes.DATEONLY },
    responsavel_id:     { type: DataTypes.UUID },
    secretaria_id:      { type: DataTypes.UUID, comment: 'NULL = inventário geral de todas as secretarias' },
    total_bens:         { type: DataTypes.INTEGER, defaultValue: 0 },
    total_conferidos:   { type: DataTypes.INTEGER, defaultValue: 0 },
    total_divergencias: { type: DataTypes.INTEGER, defaultValue: 0 },
    observacoes:        { type: DataTypes.TEXT },
    usuario_id:         { type: DataTypes.UUID }
  }, {
    tableName: 'pat_inventarios',
    timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at'
  });
};

module.exports = definePatInventarioModel;
