const { DataTypes } = require('sequelize');
const { masterDb } = require('../config/database');

const Tenant = masterDb.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nome_municipio: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nome completo da prefeitura'
  },
  cnpj: {
    type: DataTypes.STRING(14),
    allowNull: false,
    unique: true,
    comment: 'CNPJ da prefeitura'
  },
  subdominio: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Subdomínio para acesso (ex: iraucuba)'
  },
  schema: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Schema PostgreSQL para isolamento'
  },
  cidade: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  configuracoes: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'JSON com logo, brasão, cores institucionais, etc'
  }
}, {
  tableName: 'clientes',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['subdominio'], unique: true }
  ]
});

module.exports = Tenant;
