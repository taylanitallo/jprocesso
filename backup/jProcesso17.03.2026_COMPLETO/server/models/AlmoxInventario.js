const { DataTypes } = require('sequelize');

/**
 * Cabeçalho do inventário periódico.
 * Um inventário representa uma conferência física vs. sistema de todos os itens.
 */
const defineAlmoxInventarioModel = (sequelize) => {
  return sequelize.define('AlmoxInventario', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      comment: 'Número do inventário (ex: INV-2026-001)'
    },
    data_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_conclusao: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'),
      defaultValue: 'EM_ANDAMENTO'
    },
    usuario_responsavel_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Almoxarife responsável pelo inventário'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    total_itens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de itens incluídos (cache)'
    },
    total_divergencias: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Itens com divergência entre sistema e contagem física'
    }
  }, {
    tableName: 'almox_inventarios',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineAlmoxInventarioModel;
