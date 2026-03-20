const { DataTypes } = require('sequelize');

const definePatResponsabilidadeModel = (sequelize) => {
  return sequelize.define('PatResponsabilidade', {
    id:                    { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    numero_termo:          { type: DataTypes.STRING(50), unique: true, comment: 'Ex: TR-2026-000001' },
    bem_id:                { type: DataTypes.UUID, allowNull: false },
    secretaria_id:         { type: DataTypes.UUID },
    setor_id:              { type: DataTypes.UUID },
    responsavel_id:        { type: DataTypes.UUID, comment: 'FK para usuários cadastrados' },
    nome_responsavel:      { type: DataTypes.STRING(255), allowNull: false },
    cargo_responsavel:     { type: DataTypes.STRING(150) },
    matricula_responsavel: { type: DataTypes.STRING(50) },
    data_inicio:           { type: DataTypes.DATEONLY, allowNull: false },
    data_fim:              { type: DataTypes.DATEONLY, comment: 'NULL = Termo vigente' },
    status: {
      type: DataTypes.ENUM('VIGENTE', 'ENCERRADO'),
      defaultValue: 'VIGENTE'
    },
    observacoes:  { type: DataTypes.TEXT },
    assinado_em:  { type: DataTypes.DATE },
    usuario_id:   { type: DataTypes.UUID }
  }, {
    tableName: 'pat_responsabilidades',
    timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at'
  });
};

module.exports = definePatResponsabilidadeModel;
