const { DataTypes } = require('sequelize');

const definePatGrupoModel = (sequelize) => {
  return sequelize.define('PatGrupo', {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo:           { type: DataTypes.STRING(10), allowNull: false, unique: true },
    nome:             { type: DataTypes.STRING(255), allowNull: false },
    descricao:        { type: DataTypes.TEXT },
    vida_util_anos:   { type: DataTypes.INTEGER, defaultValue: 10 },
    taxa_depreciacao: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10.00, comment: 'Percentual ao ano conforme TCE-CE' },
    conta_contabil:   { type: DataTypes.STRING(30), comment: 'Número da conta Lei 4.320/64' },
    ativo:            { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'pat_grupos',
    timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at'
  });
};

module.exports = definePatGrupoModel;
