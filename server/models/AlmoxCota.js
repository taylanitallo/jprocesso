const { DataTypes } = require('sequelize');

/**
 * Cota de consumo mensal por setor/item.
 * Controla quanto cada unidade pode requisitar de um determinado material por mês.
 * Zera automaticamente no início de cada mês ou pode ser ajustada manualmente.
 */
const defineAlmoxCotaModel = (sequelize) => {
  return sequelize.define('AlmoxCota', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    setor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Setor ao qual a cota se aplica'
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Item do almoxarifado'
    },
    mes_ano: {
      type: DataTypes.STRING(7),
      allowNull: false,
      comment: 'Competência no formato YYYY-MM (ex: 2026-03)'
    },
    quantidade_cota: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Quantidade máxima permitida para o mês'
    },
    quantidade_consumida: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Quantidade já requisitada/entregue no mês'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Usuário que definiu a cota'
    }
  }, {
    tableName: 'almox_cotas',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['setor_id', 'item_id', 'mes_ano'] }
    ]
  });
};

module.exports = defineAlmoxCotaModel;
