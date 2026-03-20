const { DataTypes } = require('sequelize');

const definePatBemModel = (sequelize) => {
  return sequelize.define('PatBem', {
    id:                         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    numero_tombamento:          { type: DataTypes.STRING(30), allowNull: false, unique: true, comment: 'Número sequencial de tombamento ex: 2026000001' },
    numero_tombamento_anterior: { type: DataTypes.STRING(30), comment: 'Tombamento anterior (migração de acervo)' },
    grupo_id:                   { type: DataTypes.UUID },
    descricao:                  { type: DataTypes.STRING(500), allowNull: false },
    especificacao_tecnica:      { type: DataTypes.TEXT, comment: 'Marca, modelo, cor, características técnicas' },
    marca:                      { type: DataTypes.STRING(100) },
    modelo:                     { type: DataTypes.STRING(100) },
    numero_serie:               { type: DataTypes.STRING(100) },
    cor:                        { type: DataTypes.STRING(50) },
    numero_nota_fiscal:         { type: DataTypes.STRING(50) },
    serie_nf:                   { type: DataTypes.STRING(10) },
    chave_nfe:                  { type: DataTypes.STRING(44), comment: 'Chave de acesso NF-e (44 dígitos)' },
    data_nota_fiscal:           { type: DataTypes.DATEONLY },
    cnpj_fornecedor:            { type: DataTypes.STRING(18) },
    nome_fornecedor:            { type: DataTypes.STRING(255) },
    numero_empenho:             { type: DataTypes.STRING(50) },
    numero_contrato:            { type: DataTypes.STRING(50) },
    numero_processo:            { type: DataTypes.STRING(50), comment: 'Número do processo de compra' },
    data_aquisicao:             { type: DataTypes.DATEONLY, allowNull: false },
    valor_aquisicao:            { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    vida_util_anos:             { type: DataTypes.INTEGER, comment: 'Vida útil em anos (herdado do grupo se não informado)' },
    taxa_depreciacao:           { type: DataTypes.DECIMAL(5, 2), comment: '% de depreciação ao ano (Lei 4.320)' },
    valor_residual:             { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    estado_conservacao: {
      type: DataTypes.ENUM('OTIMO', 'BOM', 'REGULAR', 'RUIM', 'PESSIMO', 'INSERVIVEL'),
      defaultValue: 'BOM'
    },
    status: {
      type: DataTypes.ENUM('ATIVO', 'TRANSFERIDO', 'BAIXADO', 'CEDIDO', 'EXTRAVIADO'),
      defaultValue: 'ATIVO'
    },
    secretaria_id:      { type: DataTypes.UUID },
    setor_id:           { type: DataTypes.UUID },
    responsavel_id:     { type: DataTypes.UUID },
    local_fisico:       { type: DataTypes.STRING(255), comment: 'Ex: Bloco A, Sala 102' },
    sala:               { type: DataTypes.STRING(100) },
    placa:              { type: DataTypes.STRING(20), comment: 'Para veículos' },
    renavam:            { type: DataTypes.STRING(20), comment: 'Para veículos' },
    usuario_cadastro_id:{ type: DataTypes.UUID },
    observacoes:        { type: DataTypes.TEXT },
    foto_url:           { type: DataTypes.STRING(500) },
    ativo:              { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'pat_bens',
    timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at'
  });
};

module.exports = definePatBemModel;
