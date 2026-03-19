const { DataTypes } = require('sequelize');

const defineTramitacaoModel = (sequelize) => {
  return sequelize.define('Tramitacao', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    processo_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: Processo que está sendo tramitado'
    },
    origem_usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: Usuário que realizou a ação'
    },
    origem_setor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Setor de origem da tramitação'
    },
    destino_setor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Setor de destino da tramitação'
    },
    destino_usuario_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Usuário destinatário (opcional)'
    },
    tipo_acao: {
      type: DataTypes.ENUM('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento'),
      allowNull: false,
      comment: 'Tipo de ação realizada'
    },
    despacho: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Parecer/análise do servidor'
    },
    justificativa_devolucao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'OBRIGATÓRIO quando tipo_acao = devolucao'
    },
    data_hora: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: 'Timestamp da ação'
    },
    ip_origem: {
      type: DataTypes.STRING,
      comment: 'IP do usuário para auditoria'
    },
    assinatura_digital: {
      type: DataTypes.STRING,
      comment: 'Hash para validação de autenticidade'
    }
  }, {
    tableName: 'tramitacoes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['processo_id'] },
      { fields: ['data_hora'] },
      { fields: ['origem_usuario_id'] },
      { fields: ['destino_setor_id'] },
      { fields: ['tipo_acao'] }
    ],
    validate: {
      justificativaObrigatoria() {
        if (this.tipo_acao === 'devolucao' && !this.justificativa_devolucao) {
          throw new Error('Justificativa é obrigatória para devolução de processo');
        }
      }
    }
  });
};

module.exports = defineTramitacaoModel;
