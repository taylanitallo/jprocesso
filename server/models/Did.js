const { DataTypes } = require('sequelize');

const defineDidModel = (sequelize) => {
  return sequelize.define('Did', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    processo_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK: Processo vinculado'
    },
    numero_did: {
      type: DataTypes.STRING(30),
      comment: 'Número do DID (string para preservar zeros à esquerda)'
    },
    tipo_did: {
      type: DataTypes.STRING(20),
      defaultValue: 'fixas'
    },

    // ── Seção I ───────────────────────────────────────────────────────────
    objeto: { type: DataTypes.TEXT, comment: 'Objeto do DID' },
    data_did: { type: DataTypes.DATEONLY },
    secretario_nome: { type: DataTypes.STRING },
    fonte_recurso: { type: DataTypes.STRING, defaultValue: 'PRÓPRIO' },
    detalhes_em_anexo: { type: DataTypes.BOOLEAN, defaultValue: false },
    contrato_ref: { type: DataTypes.STRING },
    credor_sec1: { type: DataTypes.STRING },
    cnpj_cpf_credor_sec1: { type: DataTypes.STRING },
    secretaria_sec1: { type: DataTypes.STRING },
    nro_licitacao_sec1: { type: DataTypes.STRING },
    tipo_licitacao_sec1: { type: DataTypes.STRING },
    mes_referencia: { type: DataTypes.STRING },
    nf_sec1: { type: DataTypes.STRING },
    cert_sec1_municipal: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_sec1_trabalhista: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_sec1_fgts: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_sec1_estadual: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_sec1_federal: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_sec1_simples_nac: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_sec1_arquivos: { type: DataTypes.JSONB, defaultValue: {} },
    valor_did: { type: DataTypes.DECIMAL(15, 2) },
    itens_did: { type: DataTypes.JSON },

    // ── Seção II — Controle Interno ───────────────────────────────────────
    ci_recebido_em: { type: DataTypes.DATEONLY },
    ci_responsavel: { type: DataTypes.STRING },
    despacho_ci: { type: DataTypes.TEXT },
    dotacao_numero: { type: DataTypes.STRING },
    fonte_recurso_numero: { type: DataTypes.STRING },

    // ── Seção III — Setor de Compras ──────────────────────────────────────
    compras_recebido_em: { type: DataTypes.DATEONLY },
    compras_responsavel: { type: DataTypes.STRING },
    ja_licitado: { type: DataTypes.BOOLEAN, defaultValue: false },
    nro_licitacao: { type: DataTypes.STRING },
    realizar_cotacao: { type: DataTypes.BOOLEAN, defaultValue: false },
    modalidade: { type: DataTypes.STRING },
    data_compras: { type: DataTypes.DATEONLY },
    responsavel_compras: { type: DataTypes.STRING },
    nro_empenho_solicitacao: { type: DataTypes.STRING },
    local_entrega: { type: DataTypes.STRING },

    // ── Seção IV — Setor Contábil ─────────────────────────────────────────
    contabil_recebido_em: { type: DataTypes.DATEONLY },
    contabil_responsavel: { type: DataTypes.STRING },
    credor: { type: DataTypes.STRING },
    cnpj_cpf_credor: { type: DataTypes.STRING },
    nf_numero: { type: DataTypes.STRING },
    nf_valor: { type: DataTypes.DECIMAL(15, 2) },
    cert_cnd_federal: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_fgts: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_tst: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_municipal: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_estadual: { type: DataTypes.BOOLEAN, defaultValue: false },
    contabil_auditor: { type: DataTypes.STRING },
    contabil_empenhado: { type: DataTypes.STRING(10) },
    empenho_numero: { type: DataTypes.STRING },
    tipo_empenho: { type: DataTypes.STRING(20), allowNull: true },
    data_empenho: { type: DataTypes.DATEONLY },
    contabil_liquidado: { type: DataTypes.STRING(10) },
    liquidacao_numero: { type: DataTypes.STRING },
    data_liquidacao: { type: DataTypes.DATEONLY },

    // ── Seção III — Secretaria de Finanças ─────────────────────────────────
    financas_recebido_em: { type: DataTypes.DATEONLY },
    financas_responsavel: { type: DataTypes.STRING },

    // ── Seção V — Secretaria de Finanças (2ª passagem) ───────────────────
    financas2_recebido_em: { type: DataTypes.DATEONLY },
    financas2_responsavel: { type: DataTypes.STRING },
    financas2_enviado_pagamento: { type: DataTypes.DATEONLY },

    // ── Seção VI — Tesouraria ─────────────────────────────────────────────
    pago: { type: DataTypes.STRING(10), comment: 'sim | nao — status de pagamento da despesa' },
    tesouraria_recebido_em: { type: DataTypes.DATEONLY },
    // Caixa: o pagamento debita o líquido nesta data (antiga: tesouraria_recebido_em)
    data_pagamento: { type: DataTypes.DATEONLY },
    // Retenções (INSS, ISS, IRRF…) debitadas da conta só quando recolhidas — gravado
    // pela Tesouraria (Retenções a recolher), nunca pelo formulário do DID
    retencoes_recolhidas_em: { type: DataTypes.DATEONLY },
    tesouraria_responsavel: { type: DataTypes.STRING },
    banco_pagador: { type: DataTypes.STRING },
    ag_pagador: { type: DataTypes.STRING },
    cc_pagador: { type: DataTypes.STRING },
    cnpj_fornecedor: { type: DataTypes.STRING },
    banco_fornecedor: { type: DataTypes.STRING },
    ag_fornecedor: { type: DataTypes.STRING },
    cc_fornecedor: { type: DataTypes.STRING },
    cert_teso_cnd: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_teso_fgts: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_teso_estadual: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_teso_trabalhista: { type: DataTypes.BOOLEAN, defaultValue: false },
    cert_teso_municipal: { type: DataTypes.BOOLEAN, defaultValue: false },
    analisado_por: { type: DataTypes.STRING },
    valor_bruto: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_inss: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_iss: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_irrf: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_sindicato: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_bb: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_caixa: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_pensao: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    desconto_outros: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    doc_caixa: { type: DataTypes.STRING },

    // ── Setor de Compras 2 — Solicitação Empenho (DID Contas Variáveis) ───
    compras2_recebido_em: { type: DataTypes.DATEONLY },
    compras2_responsavel: { type: DataTypes.STRING },
    compras2_ja_licitado: { type: DataTypes.BOOLEAN, defaultValue: false },
    compras2_nro_licitacao: { type: DataTypes.STRING },
    compras2_realizar_cotacao: { type: DataTypes.BOOLEAN, defaultValue: false },
    compras2_modalidade: { type: DataTypes.STRING },
    compras2_data: { type: DataTypes.DATEONLY },
    compras2_responsavel_compras: { type: DataTypes.STRING },
    compras2_nro_empenho_solicitacao: { type: DataTypes.STRING },
    compras2_local_entrega: { type: DataTypes.STRING },

    // ── Setor de Compras 3 — Ateste NF (DID Contas Variáveis) ─────────────
    compras3_recebido_em: { type: DataTypes.DATEONLY },
    compras3_responsavel: { type: DataTypes.STRING },
    compras3_ja_licitado: { type: DataTypes.BOOLEAN, defaultValue: false },
    compras3_nro_licitacao: { type: DataTypes.STRING },
    compras3_realizar_cotacao: { type: DataTypes.BOOLEAN, defaultValue: false },
    compras3_modalidade: { type: DataTypes.STRING },
    compras3_data: { type: DataTypes.DATEONLY },
    compras3_responsavel_compras: { type: DataTypes.STRING },
    compras3_nro_empenho_solicitacao: { type: DataTypes.STRING },
    compras3_local_entrega: { type: DataTypes.DATEONLY },

    // ── Contabilidade Pós Compras — Liquidação (DID Contas Variáveis) ─────
    contabil_pc_recebido_em: { type: DataTypes.DATEONLY },
    contabil_pc_responsavel: { type: DataTypes.STRING },
    contabil_pc_auditor: { type: DataTypes.STRING },
    contabil_pc_empenho_numero: { type: DataTypes.STRING },
    contabil_pc_tipo_empenho: { type: DataTypes.STRING(20) },
    contabil_pc_data_empenho: { type: DataTypes.DATEONLY },
    contabil_pc_liquidado: { type: DataTypes.STRING(10) },
    contabil_pc_liquidacao_numero: { type: DataTypes.STRING },
    contabil_pc_data_liquidacao: { type: DataTypes.DATEONLY },
    contabil_pc_doc_caixa: { type: DataTypes.STRING },

    // ── Seção de Recebimento (DID Contas Variáveis) ───────────────────────
    receb_ordem_recebida: { type: DataTypes.STRING(10) },
    receb_data: { type: DataTypes.DATEONLY },
    receb_nf_data: { type: DataTypes.DATEONLY },
    receb_nf_enviado_compras: { type: DataTypes.DATEONLY },
    receb_responsavel: { type: DataTypes.STRING },
    receb_cargo: { type: DataTypes.STRING },
    receb_nf_conferida: { type: DataTypes.BOOLEAN, defaultValue: false },
    receb_qtd_conferida: { type: DataTypes.BOOLEAN, defaultValue: false },
    receb_esp_conforme: { type: DataTypes.BOOLEAN, defaultValue: false },
    receb_obs: { type: DataTypes.TEXT },

    // ── Seção VII — Contabilidade Fechamento ─────────────────────────────
    contab_fech_finalizado: { type: DataTypes.STRING(10) },
    contab_fech_tce: { type: DataTypes.STRING(10) },

    // ── Metadados ─────────────────────────────────────────────────────────
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'rascunho'
    },
    criado_por_id: { type: DataTypes.UUID },

    // ── Vínculo com Ordem de Compra ───────────────────────────────────────
    ordem_compra_id: { type: DataTypes.INTEGER, allowNull: true },
    ordem_ref:       { type: DataTypes.STRING(100), allowNull: true },

    // ── Tesouraria ────────────────────────────────────────────────────────
    conta_pagamento_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK: ContaBancaria de onde saiu o pagamento' },
  }, {
    tableName: 'dids',
    timestamps: true,
    // Lixeira: excluir só marca deleted_at; apagar de vez é pela tela Excluídos
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true
  });
};

module.exports = defineDidModel;
