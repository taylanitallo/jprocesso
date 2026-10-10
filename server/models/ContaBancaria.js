const { DataTypes } = require('sequelize');

const defineContaBancariaModel = (sequelize) => {
  return sequelize.define('ContaBancaria', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
      comment: 'Nome de identificação da conta (ex: Conta Principal SEFIN)',
    },
    secretaria_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Secretaria responsável pela conta',
    },
    banco_nome: { type: DataTypes.STRING(150) },
    banco_codigo: { type: DataTypes.STRING(10), comment: 'Código COMPE do banco (ex: 001 BB, 104 CEF)' },
    agencia: { type: DataTypes.STRING(20) },
    agencia_digito: { type: DataTypes.STRING(2) },
    conta: { type: DataTypes.STRING(30) },
    conta_digito: { type: DataTypes.STRING(2) },
    tipo: {
      type: DataTypes.ENUM('corrente', 'poupanca', 'pagamento', 'investimento', 'especial'),
      defaultValue: 'corrente',
    },
    natureza: {
      type: DataTypes.ENUM('custeio', 'pessoal', 'investimento', 'transferencia', 'receita', 'convenio', 'outras'),
      defaultValue: 'custeio',
    },
    titular: { type: DataTypes.STRING(200), comment: 'Nome do órgão titular da conta' },
    cnpj_titular: { type: DataTypes.STRING(14) },
    observacao: { type: DataTypes.TEXT },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'contas_bancarias',
    timestamps: true,
    underscored: true,
  });
};

module.exports = defineContaBancariaModel;
