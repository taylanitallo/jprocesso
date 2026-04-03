const { DataTypes } = require('sequelize');

const defineDidFormularioModel = (sequelize) => {
  return sequelize.define('DidFormulario', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    processo_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK: Processo ao qual este DID está vinculado (opcional)'
    },
    numero_did: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: 'Número sequencial do DID ex: DID-2026/0078'
    },
    tipo_did: {
      type: DataTypes.ENUM('fixas', 'variadas'),
      allowNull: false,
      defaultValue: 'variadas',
      comment: 'fixas = contas fixas (valor mensal × meses) | variadas = itens com quantidade'
    },
    objeto: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Objeto da despesa ex: LOCAÇÃO DE IMPRESSORA'
    },
    empresa_fornecedor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome da empresa/contratada'
    },
    cnpj_empresa: {
      type: DataTypes.STRING(18),
      allowNull: true
    },
    modalidade_licitacao: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Dispensa, Inexigibilidade, Pregão Eletrônico, Concorrência, etc.'
    },
    numero_contrato: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Número do contrato ou ARP'
    },
    periodo_referencia: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: 'Período de referência ex: ABRIL/2026'
    },
    status: {
      type: DataTypes.ENUM('rascunho', 'aberto', 'fechado', 'aprovado', 'cancelado'),
      defaultValue: 'aberto',
      comment: 'rascunho: criador editando | aberto: secretarias preenchem | fechado: consolidado | aprovado: autorizado'
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // ─── Seção I — complementar ────────────────────────────────────────────
    fonte_recurso_tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Fonte de recurso: PRÓPRIO, FEDERAL, ESTADUAL, etc.'
    },
    data_did: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data do DID (Seção I)'
    },
    secretario: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Nome do(a) secretário(a) responsável'
    },
    detalhes_em_anexo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Detalhes em Anexo (Seção I)'
    },
    despacho_ci: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Despacho via C.I. — Seção I'
    },

    // ─── Seção II — Controle Interno ───────────────────────────────────────
    ci_recebido_em:    { type: DataTypes.DATEONLY,    allowNull: true },
    ci_responsavel:    { type: DataTypes.STRING(150), allowNull: true },
    ci_despacho:       { type: DataTypes.TEXT,        allowNull: true },
    ci_dotacao_n:      { type: DataTypes.STRING(100), allowNull: true, comment: 'DOTAÇÃO: Nº' },
    ci_fonte_recurso_n:{ type: DataTypes.STRING(100), allowNull: true, comment: 'FONTE DE RECURSO: Nº' },

    // ─── Seção III — Setor de Compras ──────────────────────────────────────
    compras_recebido_em:   { type: DataTypes.DATEONLY,    allowNull: true },
    compras_responsavel:   { type: DataTypes.STRING(150), allowNull: true },
    ja_licitado:           { type: DataTypes.BOOLEAN,     allowNull: true },
    licitacao_numero:      { type: DataTypes.STRING(80),  allowNull: true, comment: 'Nº da Licitação' },
    realizar_cotacao:      { type: DataTypes.BOOLEAN,     allowNull: true },
    compras_data:          { type: DataTypes.DATEONLY,    allowNull: true },
    compras_responsavel_2: { type: DataTypes.STRING(150), allowNull: true },
    empenho_solicitacao_n: { type: DataTypes.STRING(80),  allowNull: true, comment: 'Nº solicitação de empenho' },
    local_entrega:         { type: DataTypes.STRING(200), allowNull: true },

    // ─── Seção IV — Setor Contábil ─────────────────────────────────────────
    contabil_recebido_em: { type: DataTypes.DATEONLY,    allowNull: true },
    contabil_responsavel: { type: DataTypes.STRING(150), allowNull: true },
    credor:               { type: DataTypes.STRING(200), allowNull: true },
    cnpj_cpf_credor:      { type: DataTypes.STRING(20),  allowNull: true },
    nf_numero:            { type: DataTypes.STRING(40),  allowNull: true, comment: 'Número da Nota Fiscal' },
    nf_valor:             { type: DataTypes.DECIMAL(15,2), allowNull: true },
    cert_unificada:       { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_fgts:            { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_estadual:        { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_trabalhista:     { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_municipal:       { type: DataTypes.BOOLEAN, defaultValue: false },
    data_liquidacao:      { type: DataTypes.DATEONLY,    allowNull: true },
    empenho_numero:       { type: DataTypes.STRING(80),  allowNull: true, comment: 'EMPENHO Nº' },
    tipo_empenho: {
      type: DataTypes.ENUM('ordinário', 'estimativo', 'global'),
      allowNull: true
    },

    // ─── Seção V — Secretaria de Finanças ─────────────────────────────────
    financas_recebido_em: { type: DataTypes.DATEONLY,    allowNull: true },
    financas_responsavel: { type: DataTypes.STRING(150), allowNull: true },

    // ─── Seção VI — Tesouraria ─────────────────────────────────────────────
    tesouraria_recebido_em: { type: DataTypes.DATEONLY,    allowNull: true },
    tesouraria_responsavel: { type: DataTypes.STRING(150), allowNull: true },
    pag_banco: { type: DataTypes.STRING(100), allowNull: true },
    pag_ag:    { type: DataTypes.STRING(20),  allowNull: true },
    pag_cc:    { type: DataTypes.STRING(30),  allowNull: true },
    forn_banco:{ type: DataTypes.STRING(100), allowNull: true },
    forn_ag:   { type: DataTypes.STRING(20),  allowNull: true },
    forn_cc:   { type: DataTypes.STRING(30),  allowNull: true },
    teso_cert_unificada:  { type: DataTypes.BOOLEAN, defaultValue: false },
    teso_cert_fgts:       { type: DataTypes.BOOLEAN, defaultValue: false },
    teso_cert_estadual:   { type: DataTypes.BOOLEAN, defaultValue: false },
    teso_cert_trabalhista:{ type: DataTypes.BOOLEAN, defaultValue: false },
    teso_cert_municipal:  { type: DataTypes.BOOLEAN, defaultValue: false },
    analisado_por:        { type: DataTypes.STRING(150), allowNull: true },

    // ─── Demonstrativo de Descontos ────────────────────────────────────────
    valor_bruto:       { type: DataTypes.DECIMAL(15,2), allowNull: true },
    desconto_inss:     { type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    desconto_iss:      { type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    desconto_irrf:     { type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    desconto_sindicato:{ type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    desconto_bb:       { type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    desconto_caixa:    { type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    desconto_pensao:   { type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    desconto_outros:   { type: DataTypes.DECIMAL(15,2), allowNull: true, defaultValue: 0 },
    valor_liquido:     { type: DataTypes.DECIMAL(15,2), allowNull: true },
    doc_caixa:         { type: DataTypes.STRING(100), allowNull: true },

    secretaria_origem_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Secretaria que abriu/coordena o DID'
    },
    criado_por_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'did_formularios',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

module.exports = defineDidFormularioModel;
