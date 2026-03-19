const { DataTypes } = require('sequelize');

const defineUserModel = (sequelize) => {
  return sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome completo do usuário'
    },
    nomeReduzido: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Nome curto exibido na interface (tela de boas-vindas e barra superior)'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Email para login e notificações'
    },
    cpf: {
      type: DataTypes.STRING(11),
      allowNull: false,
      unique: true,
      comment: 'CPF para login (sem pontuação)'
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Senha criptografada com bcrypt'
    },
    telefone: {
      type: DataTypes.STRING(11),
      comment: 'Telefone para contato (opcional)'
    },
    tipo: {
      type: DataTypes.ENUM('admin', 'gestor', 'operacional'),
      defaultValue: 'operacional',
      field: 'tipo',
      comment: 'Admin: acesso total; Gestor: relatórios + gestão; Operacional: tramitação'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Define se o usuário pode fazer login'
    },
    secretariaId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Secretaria onde o usuário trabalha'
    },
    setorId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Setor específico do usuário'
    },
    permissoes: {
      type: DataTypes.JSONB,
      defaultValue: {
        criar_processo: true,
        editar_processo: true,
        excluir_processo: false,
        tramitar_processo: true,
        acessar_almoxarifado: false,
        acessar_financeiro: false,
        acessar_contratos: false,
        visualizar_relatorios: false,
        gerenciar_usuarios: false,
        gerenciar_secretarias: false,
        gerenciar_configuracoes: false
      },
      comment: 'Permissões específicas do usuário'
    },
    ultimoAcesso: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Último login do usuário'
    }
  }, {
    tableName: 'usuarios',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['cpf'], unique: true },
      { fields: ['setorId'] }
    ]
  });
};

module.exports = defineUserModel;
