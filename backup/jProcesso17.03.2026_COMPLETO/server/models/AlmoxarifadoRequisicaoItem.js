const { DataTypes } = require('sequelize');

const defineAlmoxarifadoRequisicaoItemModel = (sequelize) => {
  return sequelize.define('AlmoxarifadoRequisicaoItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requisicao_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    quantidade_solicitada: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    quantidade_atendida: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0
    },
    valor_unitario_saida: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor unitário no momento da saída (para relatórios contábeis)'
    },
    lote_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Lote FIFO de onde o item foi retirado'
    },
    observacao: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'almoxarifado_requisicao_itens',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineAlmoxarifadoRequisicaoItemModel;
