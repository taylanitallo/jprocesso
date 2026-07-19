const { DataTypes } = require('sequelize');

const defineTesGrupoContaModel = (sequelize) => {
  return sequelize.define('TesGrupoConta', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: dono do grupo — cada usuário enxerga apenas os seus',
    },
    nome: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: 'Nome do bloco de contas (ex: Contas de Recurso Saúde)',
    },
    descricao: { type: DataTypes.TEXT },
    contas_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de UUIDs de contas_bancarias que compõem o grupo',
    },
    ordem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordem de exibição dos chips',
    },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'tes_grupos_contas',
    timestamps: true,
    underscored: true,
  });
};

module.exports = defineTesGrupoContaModel;
