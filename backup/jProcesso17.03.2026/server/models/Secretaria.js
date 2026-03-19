const { DataTypes } = require('sequelize');

const defineSecretariaModel = (sequelize) => {
  return sequelize.define('Secretaria', {
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
      allowNull: false
    },
    descricao: {
      type: DataTypes.TEXT
    },
    data_inicio: {
      type: DataTypes.DATEONLY
    },
    data_fim: {
      type: DataTypes.DATEONLY
    },
    email: {
      type: DataTypes.STRING
    },
    whatsapp: {
      type: DataTypes.STRING(20)
    },
    outros_sistemas: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    cnpj: {
      type: DataTypes.STRING(18)
    },
    razao_social: {
      type: DataTypes.STRING(500)
    },
    codigo_unidade: {
      type: DataTypes.STRING(50)
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    responsaveis: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Lista de responsáveis por período: [{nome, cargo, data_inicio, data_fim}]'
    },
    orcamento: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Dados orçamentários: {exercicio, valor_loa, valor_suplementado, valor_reduzido}'
    },
    dotacoes: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Lista de dotações orçamentárias: [{id, codigo, descricao, elemento_despesa, fonte_recurso, valor_previsto}]'
    }
  }, {
    tableName: 'secretarias',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineSecretariaModel;
