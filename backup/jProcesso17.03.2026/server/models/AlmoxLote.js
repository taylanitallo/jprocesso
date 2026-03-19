const { DataTypes } = require('sequelize');

/**
 * Lote de entrada de material no almoxarifado.
 * Cada lote está ligado a um item e rastreia empenho, NF, validade e saldo atual.
 * A saída de materiais usa FIFO/PEPS (menor data_validade primeiro).
 */
const defineAlmoxLoteModel = (sequelize) => {
  return sequelize.define('AlmoxLote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK para almoxarifado_itens'
    },
    numero_empenho: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Número do empenho associado — obrigatório para entrada'
    },
    numero_nf: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número da nota fiscal'
    },
    fornecedor_nome: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Razão social ou nome do fornecedor'
    },
    data_entrada: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Data de recebimento no almoxarifado'
    },
    data_validade: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data de validade do lote (para FIFO por vencimento)'
    },
    quantidade_inicial: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Quantidade recebida neste lote'
    },
    quantidade_atual: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Saldo ainda disponível neste lote'
    },
    valor_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Valor unitário do item neste lote'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    chave_nfe: {
      type: DataTypes.STRING(44),
      allowNull: true,
      comment: 'Chave de acesso da NF-e (44 dígitos) — importada do XML'
    },
    numero_contrato: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número do contrato/processo licitátório vinculado'
    },
    conferencia_cega_qtd: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Quantidade contada pelo almoxarife SEM ver a NF (conferência cega)'
    },
    conferencia_cega_ok: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'true = contagem bateu com a NF; false = divergência detectada'
    },
    numero_patrimonio_inicio: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Primeiro número de patrimônio gerado neste lote (itens CAPITAL)'
    },
    numero_patrimonio_fim: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Último número de patrimônio gerado neste lote'
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Usuário que registrou a entrada'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'false = lote esgotado ou cancelado'
    }
  }, {
    tableName: 'almoxarifado_lotes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineAlmoxLoteModel;
