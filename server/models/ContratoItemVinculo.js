const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ContratoItemVinculo', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    contrato_id:    { type: DataTypes.INTEGER, allowNull: false },
    item_id:        { type: DataTypes.INTEGER },
    lote:           { type: DataTypes.STRING(50) },
    codigo_item:    { type: DataTypes.STRING(100) },
    descricao:      { type: DataTypes.TEXT, allowNull: false }, // "descrição - especificação" do catálogo
    unidade:        { type: DataTypes.STRING(50) },
    quantidade:     { type: DataTypes.DECIMAL(15, 4) },
    valor_unitario: { type: DataTypes.DECIMAL(15, 2) },
    // Coluna GENERATED ALWAYS no banco (quantidade * valor_unitario) — não inserir manualmente
    valor_total:    { type: DataTypes.DECIMAL(15, 2) },
    // Item distribuído por setor: [{ local, quantidade }]. Com distribuição,
    // valor_unitario = valor_unitario_base × soma das quantidades (média mensal)
    distribuicao:        { type: DataTypes.JSONB },
    valor_unitario_base: { type: DataTypes.DECIMAL(15, 2) },
    // Contrato com cotas: { [cotaId]: quantidade } — quantidade = soma das cotas
    cotas_qtd:           { type: DataTypes.JSONB },
    ordem:          { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'contratos_itens_vinculo',
    timestamps: true,
    underscored: true,
  });
};
