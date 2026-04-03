const { DataTypes } = require('sequelize');

const defineDidEntradaModel = (sequelize) => {
  return sequelize.define('DidEntrada', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    did_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: DID ao qual esta entrada pertence'
    },
    secretaria_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: Secretaria responsável por esta entrada'
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição específica da necessidade desta secretaria'
    },
    quantidade: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Quantidade solicitada'
    },
    unidade: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'UN',
      comment: 'Unidade de medida: UN, KG, L, M, etc.'
    },
    valor_unitario: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Valor unitário em reais'
    },
    valor_total: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Valor total (quantidade x valor_unitario)'
    },
    dotacao_orcamentaria: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Código da dotação orçamentária desta secretaria'
    },
    unidade_orcamentaria: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Unidade Orçamentária da secretaria'
    },
    elemento_despesa: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Elemento de Despesa ex: 33903900'
    },
    fonte_recurso: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Fonte de Recurso ex: 101 - Rec. Próprios'
    },
    meses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 12,
      comment: 'Nº de meses (Contas Fixas) | null para Contas Variadas'
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    preenchido_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Usuário que preencheu/editou por último esta entrada'
    },
    status: {
      type: DataTypes.ENUM('pendente', 'preenchido', 'aprovado'),
      defaultValue: 'pendente',
      comment: 'pendente: sem preenchimento | preenchido: secretaria preencheu | aprovado: coordenador aprovou'
    }
  }, {
    tableName: 'did_entradas',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineDidEntradaModel;
