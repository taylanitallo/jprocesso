const { DataTypes } = require('sequelize');

const definePatInventarioItemModel = (sequelize) => {
  return sequelize.define('PatInventarioItem', {
    id:                            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inventario_id:                 { type: DataTypes.UUID, allowNull: false },
    bem_id:                        { type: DataTypes.UUID },
    numero_tombamento:             { type: DataTypes.STRING(30), allowNull: false },
    encontrado:                    { type: DataTypes.BOOLEAN, comment: 'null=não conferido, true=encontrado, false=não encontrado' },
    local_encontrado:              { type: DataTypes.STRING(255) },
    estado_conservacao_encontrado: { type: DataTypes.STRING(20) },
    observacoes:                   { type: DataTypes.TEXT },
    conferido_por_id:              { type: DataTypes.UUID },
    conferido_em:                  { type: DataTypes.DATE }
  }, {
    tableName: 'pat_inventario_itens',
    timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at'
  });
};

module.exports = definePatInventarioItemModel;
