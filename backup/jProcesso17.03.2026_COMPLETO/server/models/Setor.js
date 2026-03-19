const { DataTypes } = require('sequelize');

const defineSetorModel = (sequelize) => {
  return sequelize.define('Setor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sigla: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    descricao: {
      type: DataTypes.TEXT
    },
    secretariaId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'setores',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineSetorModel;
