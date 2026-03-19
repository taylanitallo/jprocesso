const { DataTypes } = require('sequelize');

const defineAlmoxarifadoMovimentacaoModel = (sequelize) => {
  return sequelize.define('AlmoxarifadoMovimentacao', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    lote_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Lote de onde saiu (FIFO). Nulo para saídas manuais sem lote.'
    },
    tipo: {
      type: DataTypes.ENUM('ENTRADA', 'SAIDA'),
      allowNull: false,
      comment: 'ENTRADA: recebimento de material; SAIDA: distribuição/uso'
    },
    quantidade: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    valor_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    valor_total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    data_movimentacao: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    documento_referencia: {
      type: DataTypes.STRING,
      comment: 'Número da NF, empenho, requisição, etc.'
    },
    numero_empenho: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número do empenho (especialmente para entradas)'
    },
    numero_nf: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número da nota fiscal'
    },
    fornecedor_nome: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Nome do fornecedor (entradas)'
    },
    observacao: {
      type: DataTypes.TEXT
    },
    requisicao_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK para requisição que gerou esta saída'
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'almoxarifado_movimentacoes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineAlmoxarifadoMovimentacaoModel;
