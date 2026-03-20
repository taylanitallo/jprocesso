const { DataTypes } = require('sequelize');

const definePatBaixaModel = (sequelize) => {
  return sequelize.define('PatBaixa', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bem_id: { type: DataTypes.UUID, allowNull: false },
    motivo: {
      type: DataTypes.ENUM('INSERVIVEL', 'EXTRAVIO', 'FURTO_ROUBO', 'VENDA', 'DOACAO', 'PERMUTA', 'SINISTRO', 'OUTROS'),
      allowNull: false
    },
    numero_processo:         { type: DataTypes.STRING(100) },
    numero_resolucao:        { type: DataTypes.STRING(100), comment: 'Resolução do Câmara/Executivo autorizando' },
    data_baixa:              { type: DataTypes.DATEONLY, allowNull: false },
    valor_estimado_residual: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    descricao_ocorrencia:    { type: DataTypes.TEXT },
    autorizado_por:          { type: DataTypes.STRING(255) },
    usuario_id:              { type: DataTypes.UUID },
    observacoes:             { type: DataTypes.TEXT }
  }, {
    tableName: 'pat_baixas',
    timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at'
  });
};

module.exports = definePatBaixaModel;
