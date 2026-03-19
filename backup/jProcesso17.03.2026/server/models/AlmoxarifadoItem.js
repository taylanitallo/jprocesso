const { DataTypes } = require('sequelize');

const defineAlmoxarifadoItemModel = (sequelize) => {
  return sequelize.define('AlmoxarifadoItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Código único do item (ex: MAT-001)'
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descricao: {
      type: DataTypes.TEXT
    },
    unidade: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'UN',
      comment: 'Unidade de medida: UN, KG, L, CX, M, etc.'
    },
    categoria: {
      type: DataTypes.STRING,
      comment: 'Categoria do item para agrupamento'
    },
    estoque_atual: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0
    },
    estoque_minimo: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Nível mínimo para alerta de reposição'
    },
    estoque_maximo: {
      type: DataTypes.DECIMAL(10, 3),
      comment: 'Nível máximo de estoque'
    },
    valor_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Valor médio unitário do item'
    },
    localizacao: {
      type: DataTypes.STRING,
      comment: 'Localização legada — preferir corredor/prateleira/gaveta'
    },
    corredor: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Corredor de armazenamento (ex: A, B, C)'
    },
    prateleira: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Prateleira (ex: 01, 02)'
    },
    gaveta: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Gaveta/posição (ex: G1, G2)'
    },
    tipo_item: {
      type: DataTypes.ENUM('CONSUMO', 'CAPITAL'),
      defaultValue: 'CONSUMO',
      allowNull: false,
      comment: 'CONSUMO = material de consumo; CAPITAL = bem permanente (gera tombamento)'
    },
    ponto_ressuprimento: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Nível que dispara sugestão automática de nova compra (pode ser maior que estoque_minimo)'
    },
    numero_patrimonio_seq: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Último número de patrimônio gerado para este item (auto-increments on entry)'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'almoxarifado_itens',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineAlmoxarifadoItemModel;
