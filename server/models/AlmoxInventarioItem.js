const { DataTypes } = require('sequelize');

/**
 * Linha do inventário periódico — um item por linha.
 * O almoxarife preenche quantidade_contada; o sistema calcula a diferença.
 */
const defineAlmoxInventarioItemModel = (sequelize) => {
  return sequelize.define('AlmoxInventarioItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    inventario_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    quantidade_sistema: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Saldo do sistema no momento da abertura do inventário'
    },
    quantidade_contada: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Quantidade física contada pelo almoxarife'
    },
    diferenca: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'quantidade_contada - quantidade_sistema (negativo = falta; positivo = sobra)'
    },
    valor_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Valor unitário na data do inventário'
    },
    valor_divergencia: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'diferenca * valor_unitario'
    },
    contado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'true = almoxarife já conferiu este item'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'almox_inventario_itens',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineAlmoxInventarioItemModel;
