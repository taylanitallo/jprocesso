const { DataTypes } = require('sequelize');

/**
 * Fluxo digital de requisição de materiais:
 *   RASCUNHO → PENDENTE_AUTORIZACAO → AUTORIZADA → EM_SEPARACAO → ENTREGUE
 *                                                                ↘ CANCELADA (qualquer etapa antes de ENTREGUE)
 */
const defineAlmoxarifadoRequisicaoModel = (sequelize) => {
  return sequelize.define('AlmoxarifadoRequisicao', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Número da requisição (ex: REQ-2026-0001)'
    },
    setor_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    secretaria_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Secretaria do setor solicitante (desnormalizado para relatórios)'
    },
    usuario_solicitante_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        'RASCUNHO',
        'PENDENTE_AUTORIZACAO',
        'AUTORIZADA',
        'EM_SEPARACAO',
        'ENTREGUE',
        'CANCELADA'
      ),
      defaultValue: 'PENDENTE_AUTORIZACAO',
      comment: 'Etapa atual no fluxo digital'
    },
    prioridade: {
      type: DataTypes.ENUM('NORMAL', 'URGENTE', 'CRITICA'),
      defaultValue: 'NORMAL'
    },
    data_solicitacao: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_autorizacao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_separacao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_entrega: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_atendimento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Compat. legado — igual a data_entrega'
    },
    observacao: {
      type: DataTypes.TEXT
    },
    centro_custo: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Unidade consumidora para baixa contábil (ex: Posto de Saúde Central)'
    },
    justificativa: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Justificativa de cancelamento ou recusa'
    },
    // ── Autorização ──────────────────────────────────────────────
    usuario_autorizador_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Quem autorizou (gestor/admin/secretario)'
    },
    hash_assinatura: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'SHA-256 de (numero+user_id+timestamp) gerado na autorização'
    },
    // ── Entrega com token OTP ─────────────────────────────────────
    token_entrega: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: 'Token OTP de 6 dígitos para confirmar entrega'
    },
    token_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiração do token (15 min após geração)'
    },
    // ── Legado ───────────────────────────────────────────────────
    usuario_atendente_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Compat. legado — almoxarife que efetivou a entrega'
    }
  }, {
    tableName: 'almoxarifado_requisicoes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineAlmoxarifadoRequisicaoModel;
