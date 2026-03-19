const defineUserModel = require('./User');
const defineSecretariaModel = require('./Secretaria');
const defineSetorModel = require('./Setor');
const defineProcessoModel = require('./Processo');
const defineTramitacaoModel = require('./Tramitacao');
const defineDocumentoModel = require('./Documento');
const defineAlmoxarifadoItemModel = require('./AlmoxarifadoItem');
const defineAlmoxarifadoMovimentacaoModel = require('./AlmoxarifadoMovimentacao');
const defineAlmoxarifadoRequisicaoModel = require('./AlmoxarifadoRequisicao');
const defineAlmoxarifadoRequisicaoItemModel = require('./AlmoxarifadoRequisicaoItem');
const defineAlmoxLoteModel = require('./AlmoxLote');
const defineAlmoxAuditLogModel = require('./AlmoxAuditLog');
const defineAlmoxCotaModel = require('./AlmoxCota');
const defineAlmoxInventarioModel = require('./AlmoxInventario');
const defineAlmoxInventarioItemModel = require('./AlmoxInventarioItem');
const defineFinanceiroLancamentoModel = require('./FinanceiroLancamento');
const defineDidModel = require('./Did');
const defineCredorModel = require('./Credor');
const defineContratoItemModel = require('./ContratoItem');
const defineContratoItemVinculoModel = require('./ContratoItemVinculo');
const defineContratoModel = require('./Contrato');

const initTenantModels = (sequelize) => {
  const User = defineUserModel(sequelize);
  const Secretaria = defineSecretariaModel(sequelize);
  const Setor = defineSetorModel(sequelize);
  const Processo = defineProcessoModel(sequelize);
  const Tramitacao = defineTramitacaoModel(sequelize);
  const Documento = defineDocumentoModel(sequelize);
  const AlmoxarifadoItem = defineAlmoxarifadoItemModel(sequelize);
  const AlmoxarifadoMovimentacao = defineAlmoxarifadoMovimentacaoModel(sequelize);
  const AlmoxarifadoRequisicao = defineAlmoxarifadoRequisicaoModel(sequelize);
  const AlmoxarifadoRequisicaoItem = defineAlmoxarifadoRequisicaoItemModel(sequelize);
  const AlmoxLote = defineAlmoxLoteModel(sequelize);
  const AlmoxAuditLog = defineAlmoxAuditLogModel(sequelize);
  const AlmoxCota = defineAlmoxCotaModel(sequelize);
  const AlmoxInventario = defineAlmoxInventarioModel(sequelize);
  const AlmoxInventarioItem = defineAlmoxInventarioItemModel(sequelize);
  const FinanceiroLancamento = defineFinanceiroLancamentoModel(sequelize);
  const Did = defineDidModel(sequelize);
  const Credor = defineCredorModel(sequelize);
  const ContratoItem = defineContratoItemModel(sequelize);
  const ContratoItemVinculo = defineContratoItemVinculoModel(sequelize);
  const Contrato = defineContratoModel(sequelize);

  // Contrato → Credor
  Contrato.belongsTo(Credor, { foreignKey: 'credor_id', as: 'credor' });
  Credor.hasMany(Contrato, { foreignKey: 'credor_id', as: 'contratos' });

  // Contrato → Itens vinculados (itens do contrato específico, com qtd/valor)
  Contrato.hasMany(ContratoItemVinculo, { foreignKey: 'contrato_id', as: 'itens' });
  ContratoItemVinculo.belongsTo(Contrato, { foreignKey: 'contrato_id', as: 'contrato' });

  Secretaria.hasMany(Setor, { foreignKey: 'secretariaId', as: 'setores' });
  Setor.belongsTo(Secretaria, { foreignKey: 'secretariaId', as: 'secretaria' });

  User.belongsTo(Secretaria, { foreignKey: 'secretariaId', as: 'secretaria' });
  User.belongsTo(Setor, { foreignKey: 'setorId', as: 'setor' });

  Processo.belongsTo(Setor, { foreignKey: 'setor_atual_id', as: 'setorAtual' });
  Processo.belongsTo(User, { foreignKey: 'usuario_atual_id', as: 'usuarioAtual' });
  Processo.belongsTo(User, { foreignKey: 'criado_por_id', as: 'criadoPor' });

  Processo.hasMany(Tramitacao, { foreignKey: 'processo_id', as: 'tramitacoes' });
  Tramitacao.belongsTo(Processo, { foreignKey: 'processo_id', as: 'processo' });

  Tramitacao.belongsTo(User, { foreignKey: 'origem_usuario_id', as: 'origemUsuario' });
  Tramitacao.belongsTo(User, { foreignKey: 'destino_usuario_id', as: 'destinoUsuario' });
  Tramitacao.belongsTo(Setor, { foreignKey: 'origem_setor_id', as: 'origemSetor' });
  Tramitacao.belongsTo(Setor, { foreignKey: 'destino_setor_id', as: 'destinoSetor' });

  Processo.hasMany(Documento, { foreignKey: 'processo_id', as: 'documentos' });
  Documento.belongsTo(Processo, { foreignKey: 'processo_id', as: 'processo' });
  Documento.belongsTo(User, { foreignKey: 'upload_por_id', as: 'uploadPor' });

  // Almoxarifado associations
  AlmoxarifadoMovimentacao.belongsTo(AlmoxarifadoItem, { foreignKey: 'item_id', as: 'item' });
  AlmoxarifadoItem.hasMany(AlmoxarifadoMovimentacao, { foreignKey: 'item_id', as: 'movimentacoes' });

  AlmoxarifadoRequisicao.hasMany(AlmoxarifadoRequisicaoItem, { foreignKey: 'requisicao_id', as: 'itens' });
  AlmoxarifadoRequisicaoItem.belongsTo(AlmoxarifadoRequisicao, { foreignKey: 'requisicao_id', as: 'requisicao' });
  AlmoxarifadoRequisicaoItem.belongsTo(AlmoxarifadoItem, { foreignKey: 'item_id', as: 'item' });
  AlmoxarifadoItem.hasMany(AlmoxarifadoRequisicaoItem, { foreignKey: 'item_id', as: 'requisicaoItens' });

  AlmoxarifadoRequisicao.belongsTo(Setor, { foreignKey: 'setor_id', as: 'setor' });
  AlmoxarifadoRequisicao.belongsTo(User, { foreignKey: 'usuario_solicitante_id', as: 'solicitante' });
  AlmoxarifadoRequisicao.belongsTo(User, { foreignKey: 'usuario_atendente_id', as: 'atendente' });
  AlmoxarifadoRequisicao.belongsTo(User, { foreignKey: 'usuario_autorizador_id', as: 'autorizador' });
  AlmoxarifadoRequisicao.belongsTo(Secretaria, { foreignKey: 'secretaria_id', as: 'secretaria' });

  // Lotes
  AlmoxLote.belongsTo(AlmoxarifadoItem, { foreignKey: 'item_id', as: 'item' });
  AlmoxarifadoItem.hasMany(AlmoxLote, { foreignKey: 'item_id', as: 'lotes' });
  AlmoxLote.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

  // Movimentações → Lote
  AlmoxarifadoMovimentacao.belongsTo(AlmoxLote, { foreignKey: 'lote_id', as: 'lote' });
  AlmoxLote.hasMany(AlmoxarifadoMovimentacao, { foreignKey: 'lote_id', as: 'movimentacoes' });

  // Cotas
  AlmoxCota.belongsTo(Setor, { foreignKey: 'setor_id', as: 'setor' });
  AlmoxCota.belongsTo(AlmoxarifadoItem, { foreignKey: 'item_id', as: 'item' });
  AlmoxCota.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
  AlmoxarifadoItem.hasMany(AlmoxCota, { foreignKey: 'item_id', as: 'cotas' });

  // Inventários
  AlmoxInventario.hasMany(AlmoxInventarioItem, { foreignKey: 'inventario_id', as: 'itens' });
  AlmoxInventarioItem.belongsTo(AlmoxInventario, { foreignKey: 'inventario_id', as: 'inventario' });
  AlmoxInventarioItem.belongsTo(AlmoxarifadoItem, { foreignKey: 'item_id', as: 'item' });
  AlmoxarifadoItem.hasMany(AlmoxInventarioItem, { foreignKey: 'item_id', as: 'inventarioItens' });
  AlmoxInventario.belongsTo(User, { foreignKey: 'usuario_responsavel_id', as: 'responsavel' });

  // Financeiro associations
  FinanceiroLancamento.belongsTo(Processo, { foreignKey: 'processo_id', as: 'processo' });
  Processo.hasMany(FinanceiroLancamento, { foreignKey: 'processo_id', as: 'lancamentos' });
  FinanceiroLancamento.belongsTo(Setor, { foreignKey: 'setor_id', as: 'setor' });
  FinanceiroLancamento.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

  // DID associations
  Did.belongsTo(Processo, { foreignKey: 'processo_id', as: 'processo' });
  Processo.hasOne(Did, { foreignKey: 'processo_id', as: 'did' });
  Did.belongsTo(User, { foreignKey: 'criado_por_id', as: 'criadoPor' });

  return {
    User,
    Secretaria,
    Setor,
    Processo,
    Tramitacao,
    Documento,
    AlmoxarifadoItem,
    AlmoxarifadoMovimentacao,
    AlmoxarifadoRequisicao,
    AlmoxarifadoRequisicaoItem,
    AlmoxLote,
    AlmoxAuditLog,
    AlmoxCota,
    AlmoxInventario,
    AlmoxInventarioItem,
    FinanceiroLancamento,
    Did,
    Credor,
    ContratoItem,
    Contrato,
  };
};

module.exports = initTenantModels;
