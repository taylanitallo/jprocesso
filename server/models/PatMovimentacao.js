const { DataTypes } = require('sequelize');

const definePatMovimentacaoModel = (sequelize) => {
  return sequelize.define('PatMovimentacao', {
    id:                     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bem_id:                 { type: DataTypes.UUID, allowNull: false },
    tipo: {
      type: DataTypes.ENUM('ENTRADA', 'TRANSFERENCIA', 'CESSAO', 'DEVOLUCAO', 'BAIXA', 'INVENTARIO', 'AJUSTE'),
      allowNull: false
    },
    secretaria_origem_id:   { type: DataTypes.UUID },
    setor_origem_id:        { type: DataTypes.UUID },
    responsavel_origem_id:  { type: DataTypes.UUID },
    secretaria_destino_id:  { type: DataTypes.UUID },
    setor_destino_id:       { type: DataTypes.UUID },
    responsavel_destino_id: { type: DataTypes.UUID },
    data_movimentacao:      { type: DataTypes.DATEONLY, allowNull: false },
    numero_documento:       { type: DataTypes.STRING(100), comment: 'Nº do termo, processo ou documento de referência' },
    justificativa:          { type: DataTypes.TEXT },
    observacoes:            { type: DataTypes.TEXT },
    usuario_id:             { type: DataTypes.UUID }
  }, {
    tableName: 'pat_movimentacoes',
    timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at'
  });
};

module.exports = definePatMovimentacaoModel;
