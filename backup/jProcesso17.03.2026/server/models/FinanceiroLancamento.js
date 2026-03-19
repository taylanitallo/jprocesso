const { DataTypes } = require('sequelize');

const defineFinanceiroLancamentoModel = (sequelize) => {
  return sequelize.define('FinanceiroLancamento', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    processo_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Processo DID vinculado (opcional)'
    },
    numero_documento: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número da nota fiscal, empenho, contrato, etc.'
    },
    tipo: {
      type: DataTypes.ENUM('empenho', 'liquidacao', 'pagamento', 'receita', 'outros'),
      defaultValue: 'outros',
      comment: 'Tipo do lançamento financeiro'
    },
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Categoria: material, servicos, pessoal, obras, outros'
    },
    fornecedor_nome: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome do fornecedor/credor'
    },
    fornecedor_cpf_cnpj: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment: 'CPF ou CNPJ do fornecedor (sem pontuação)'
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Descrição resumida do lançamento'
    },
    valor: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Valor do lançamento'
    },
    data_lancamento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Data do lançamento'
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data de vencimento (para despesas a pagar)'
    },
    data_pagamento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data efetiva do pagamento'
    },
    status: {
      type: DataTypes.ENUM('pendente', 'pago', 'cancelado', 'vencido'),
      defaultValue: 'pendente',
      comment: 'Status do pagamento'
    },
    setor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Setor que gerou a despesa'
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: Usuário que registrou'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'financeiro_lancamentos',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineFinanceiroLancamentoModel;
