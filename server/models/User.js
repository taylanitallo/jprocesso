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
    cargo: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: 'Cargo/função do usuário (ex: Prefeito Municipal, Secretário de Finanças)'
    },
    portaria_nomeacao: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Número da portaria de nomeação (ex: Portaria nº 001/2026)'
    },
    permissoes: {
      type: DataTypes.JSONB,
      defaultValue: {
        processos:     { ver: true, criar: true, editar: true, excluir: false, tramitar: true, devolver: true, concluir: true, arquivar: false, anexar_documento: true, excluir_documento: false },
        arquivo:       { acessar: false },
        almoxarifado:  { acessar: false, painel: { ver: true }, estoque: { ver: true, editar: true }, entradas: { ver: true, registrar: true }, saidas: { ver: true, registrar: true }, requisicoes: { ver: true, criar: true, aprovar: false, cancelar: false }, cotas: { ver: true, gerenciar: false }, inventario: { ver: true, realizar: false }, auditoria: { ver: false } },
        patrimonio:    { acessar: false, painel: { ver: true }, bens: { ver: true, criar: false, editar: false, excluir: false }, tombamento: { ver: true, realizar: false }, transferencia: { ver: true, realizar: false }, baixa: { ver: true, realizar: false }, inventario: { ver: true, realizar: false }, grupos: { ver: false, gerenciar: false } },
        financeiro:    { acessar: false, painel: { ver: true }, processos_did: { ver: true }, relatorio: { ver: false } },
        contratos:     { acessar: false, itens: { ver: true, criar: false, editar: false, excluir: false }, credores: { ver: true, criar: false, editar: false, excluir: false }, contratos: { ver: true, criar: false, editar: false, excluir: false }, ordens: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
        tesouraria:    { acessar: false, contas: { ver: true, criar: false, editar: false, excluir: false }, receitas: { ver: true, criar: false, editar: false, excluir: false }, despesas: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
        administracao: { gerenciar_usuarios: false, gerenciar_secretarias: false, gerenciar_configuracoes: false, visualizar_relatorios: false, visualizar_registros: false },
      },
      comment: 'Permissões específicas do usuário (nested por módulo/aba/ação)'
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
