const { DataTypes } = require('sequelize');

const defineTesDespesaModel = (sequelize) => {
  return sequelize.define('TesDespesa', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ordem_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK: ContratoOrdem (OC ou OS)',
    },
    conta_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: ContaBancaria debitada',
    },
    data_pagamento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    valor_bruto: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Valor total da ordem / nota fiscal',
    },
    valor_liquido: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Valor após retenções (ISS, IR, etc.)',
    },
    observacao: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'tes_despesas',
    timestamps: true,
    underscored: true,
  });
};

module.exports = defineTesDespesaModel;
