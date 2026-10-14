// ─────────────────────────────────────────────────────────────────────────────
//  ETAPAS DO DID — fonte única (servidor valida; o cliente recebe pelo GET de etapas)
//
//  Cada etapa:
//    numero, nome          → "Seção II", "Controle Interno"
//    sugestao              → como sugerir setores quando o município não configurou:
//                            setor: palavras no nome/sigla do setor (preferência);
//                            secretaria: palavras no nome/sigla da secretaria (reserva);
//                            'todas' → qualquer setor (Seção I: toda secretaria pode abrir)
//    recebidoEm            → campo preenchido pelo servidor com a data do recebimento
//    responsavel           → campo preenchido pelo servidor com o usuário que conclui
//    campos                → o que o usuário preenche nesta etapa. Todos obrigatórios, exceto:
//                            opcional: true · se: { campo, igual } (só quando a condição vale)
//                            checkbox: true → precisa estar marcado
//    extras                → campos que a etapa pode alterar sem serem obrigatórios dela
//                            (ex.: dados bancários do credor vindos da Seção I)
// ─────────────────────────────────────────────────────────────────────────────

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const SUG = {
  controle:   { setor: ['controle interno', 'controladoria', 'controlador', 'auditoria'], secretaria: ['controladoria', 'cgm'] },
  financas:   { setor: ['financas', 'orcament'], secretaria: ['financas', 'sefin'], gabinete: true },
  contab:     { setor: ['contab'], secretaria: ['financas', 'sefin'] },
  compras:    { setor: ['compras', 'licita', 'aquisic'], secretaria: ['administra'] },
  almox:      { setor: ['almox'], secretaria: ['administra'] },
  tesouraria: { setor: ['tesour'], secretaria: ['financas', 'sefin'] },
};

const SIM = (campo) => ({ campo, igual: 'sim' });

// Seção I — o próprio formulário (contrato, credor, itens…) já existe; aqui só os
// obrigatórios (mesmos da tela). Os demais campos são da Seção I por exclusão.
const SECAO_I = {
  fixas: [
    { campo: 'contrato_ref', rotulo: 'Contrato' },
    { campo: 'secretaria_sec1', rotulo: 'Secretaria' },
    { campo: 'secretario_nome', rotulo: 'Secretário Responsável' },
    { campo: 'nro_licitacao_sec1', rotulo: 'Nº da Licitação' },
    { campo: 'tipo_licitacao_sec1', rotulo: 'Tipo de Licitação' },
    { campo: 'credor_sec1', rotulo: 'Credor' },
    { campo: 'cnpj_cpf_credor_sec1', rotulo: 'CNPJ/CPF do Credor' },
    { campo: 'data_did', rotulo: 'Data' },
    { campo: 'mes_referencia', rotulo: 'Mês de Referência' },
    { campo: 'fonte_recurso', rotulo: 'Fonte de Recurso' },
    { campo: 'objeto', rotulo: 'Objeto' },
    { campo: 'itens_did', rotulo: 'Itens do DID (ao menos um item com valor)', itens: true },
  ],
  variaveis: [
    { campo: 'credor_sec1', rotulo: 'Credor' },
    { campo: 'cnpj_cpf_credor_sec1', rotulo: 'CNPJ/CPF do Credor' },
    { campo: 'secretaria_sec1', rotulo: 'Secretaria' },
    { campo: 'secretario_nome', rotulo: 'Secretário Responsável' },
    { campo: 'data_did', rotulo: 'Data' },
    { campo: 'mes_referencia', rotulo: 'Mês de Referência' },
    { campo: 'fonte_recurso', rotulo: 'Fonte de Recurso' },
    { campo: 'objeto', rotulo: 'Objeto' },
    { campo: 'itens_did', rotulo: 'Itens do DID (ao menos um item com valor)', itens: true },
  ],
};

// Dados do credor informados na Seção I que a Tesouraria também pode corrigir
const EXTRAS_SECAO_I = ['banco_fornecedor', 'ag_fornecedor', 'cc_fornecedor'];

const controleInterno = {
  nome: 'Controle Interno', sugestao: SUG.controle,
  recebidoEm: 'ci_recebido_em', responsavel: 'ci_responsavel',
  campos: [{ campo: 'despacho_ci', rotulo: 'Despacho via C.I.' }],
};
const financas1 = {
  nome: 'Secretaria de Finanças', sugestao: SUG.financas,
  recebidoEm: 'financas_recebido_em', responsavel: 'financas_responsavel',
  campos: [],
};
const financas2 = (nome) => ({
  nome, sugestao: SUG.financas,
  recebidoEm: 'financas2_recebido_em', responsavel: 'financas2_responsavel',
  campos: [{ campo: 'financas2_enviado_pagamento', rotulo: 'Enviado para Pagamento' }],
});
const tesouraria = (variaveis) => ({
  nome: 'Tesouraria', sugestao: SUG.tesouraria,
  recebidoEm: 'tesouraria_recebido_em', responsavel: 'tesouraria_responsavel',
  campos: [
    { campo: 'conta_pagamento_id', rotulo: 'Conta de Pagamento' },
    { campo: 'banco_fornecedor', rotulo: 'Banco do Credor' },
    { campo: 'ag_fornecedor', rotulo: 'Agência do Credor' },
    { campo: 'cc_fornecedor', rotulo: 'Conta do Credor' },
    { campo: 'fonte_recurso', rotulo: 'Fonte de Recurso' },
    { campo: 'desconto_inss', rotulo: 'Desconto INSS (informe 0 se não houver)', numero: true },
    { campo: 'desconto_iss', rotulo: 'Desconto ISS (informe 0 se não houver)', numero: true },
    { campo: 'desconto_irrf', rotulo: 'Desconto IRRF (informe 0 se não houver)', numero: true },
    { campo: 'desconto_outros', rotulo: 'Outros descontos (informe 0 se não houver)', numero: true },
    ...(variaveis
      ? [
          { campo: 'cert_teso_cnd', rotulo: 'Certidão Unificada', checkbox: true },
          { campo: 'cert_teso_fgts', rotulo: 'Certidão FGTS', checkbox: true },
          { campo: 'cert_teso_estadual', rotulo: 'Certidão Estadual', checkbox: true },
          { campo: 'cert_teso_trabalhista', rotulo: 'Certidão Trabalhista', checkbox: true },
          { campo: 'cert_teso_municipal', rotulo: 'Certidão Municipal', checkbox: true },
          { campo: 'doc_caixa', rotulo: 'Doc. Caixa' },
        ]
      : [
          { campo: 'cert_teso_municipal', rotulo: 'Certidão Municipal', checkbox: true },
          { campo: 'cert_teso_trabalhista', rotulo: 'Certidão Trabalhista', checkbox: true },
          { campo: 'cert_teso_fgts', rotulo: 'Certidão FGTS', checkbox: true },
          { campo: 'cert_teso_estadual', rotulo: 'Certidão Estadual', checkbox: true },
          { campo: 'cert_teso_federal', rotulo: 'Certidão Federal', checkbox: true },
          // Só se aplica a empresas optantes do Simples
          { campo: 'cert_teso_simples_nac', rotulo: 'Certidão Simples Nacional', checkbox: true, opcional: true },
        ]),
    { campo: 'pago', rotulo: 'Pagamento realizado (Sim — Pago)', igual: 'sim' },
    { campo: 'data_pagamento', rotulo: 'Data do pagamento' },
  ],
  // Preenchidos a partir da conta escolhida
  extras: ['banco_pagador', 'ag_pagador', 'cc_pagador'],
});
const fechamento = {
  nome: 'Contabilidade — Fechamento', sugestao: SUG.contab,
  recebidoEm: null, responsavel: null,
  campos: [
    { campo: 'contab_fech_finalizado', rotulo: 'Processo Finalizado', igual: 'sim' },
    { campo: 'contab_fech_tce', rotulo: 'Enviado para o TCE/SIM' },
  ],
};

const ETAPAS = {
  fixas: [
    { nome: 'Abertura', sugestao: 'todas', campos: SECAO_I.fixas, extras: EXTRAS_SECAO_I },
    controleInterno,
    financas1,
    {
      nome: 'Contabilidade', sugestao: SUG.contab,
      recebidoEm: 'contabil_recebido_em', responsavel: 'contabil_responsavel',
      campos: [
        { campo: 'contabil_auditor', rotulo: 'Auditor' },
        { campo: 'contabil_empenhado', rotulo: 'Está empenhado?' },
        { campo: 'empenho_numero', rotulo: 'Empenho Nº', se: SIM('contabil_empenhado') },
        { campo: 'tipo_empenho', rotulo: 'Tipo de Empenho', se: SIM('contabil_empenhado') },
        { campo: 'data_empenho', rotulo: 'Data do Empenho', se: SIM('contabil_empenhado') },
        { campo: 'contabil_liquidado', rotulo: 'Está liquidado?' },
        { campo: 'liquidacao_numero', rotulo: 'Liquidação Nº', se: SIM('contabil_liquidado') },
        { campo: 'data_liquidacao', rotulo: 'Data da Liquidação', se: SIM('contabil_liquidado') },
        { campo: 'doc_caixa', rotulo: 'Doc. Caixa', se: SIM('contabil_liquidado') },
      ],
    },
    financas2('Secretaria de Finanças — Pagamento'),
    tesouraria(false),
    fechamento,
  ],
  variaveis: [
    { nome: 'Abertura', sugestao: 'todas', campos: SECAO_I.variaveis, extras: EXTRAS_SECAO_I },
    controleInterno,
    financas1,
    {
      nome: 'Compras — Solicitação de Empenho', sugestao: SUG.compras,
      recebidoEm: 'compras2_recebido_em', responsavel: 'compras2_responsavel',
      campos: [{ campo: 'compras2_nro_empenho_solicitacao', rotulo: 'Nº Solicitação de Empenho' }],
    },
    {
      nome: 'Contabilidade — Empenho', sugestao: SUG.contab,
      recebidoEm: 'contabil_recebido_em', responsavel: 'contabil_responsavel',
      campos: [
        { campo: 'contabil_auditor', rotulo: 'Auditor' },
        { campo: 'contabil_empenhado', rotulo: 'Está empenhado?', igual: 'sim' },
        { campo: 'empenho_numero', rotulo: 'Empenho Nº' },
        { campo: 'tipo_empenho', rotulo: 'Tipo de Empenho' },
        { campo: 'data_empenho', rotulo: 'Data do Empenho' },
      ],
    },
    {
      nome: 'Compras — Ordem de Compra', sugestao: SUG.compras,
      recebidoEm: 'compras_recebido_em', responsavel: 'compras_responsavel',
      campos: [
        { campo: 'nro_empenho_solicitacao', rotulo: 'Nº Ordem de Compra' },
        { campo: 'local_entrega', rotulo: 'Local de Entrega' },
      ],
    },
    {
      nome: 'Almoxarifado — Recebimento', sugestao: SUG.almox,
      recebidoEm: null, responsavel: 'receb_responsavel',
      campos: [
        { campo: 'receb_ordem_recebida', rotulo: 'A ordem foi recebida? (Sim — Recebida)', igual: 'sim' },
        { campo: 'receb_data', rotulo: 'Data de Recebimento' },
        { campo: 'receb_nf_data', rotulo: 'Data da Nota Fiscal' },
        { campo: 'receb_cargo', rotulo: 'Cargo / Matrícula' },
        { campo: 'receb_nf_conferida', rotulo: 'Nota Fiscal conferida', checkbox: true },
        { campo: 'receb_qtd_conferida', rotulo: 'Quantidades conferidas', checkbox: true },
        { campo: 'receb_esp_conforme', rotulo: 'Especificações conformes', checkbox: true },
        { campo: 'receb_nf_enviado_compras', rotulo: 'Enviado NF para setor de compras' },
        { campo: 'receb_obs', rotulo: 'Observações do Recebimento' },
      ],
    },
    {
      nome: 'Compras — Ateste de NF', sugestao: SUG.compras,
      recebidoEm: 'compras3_recebido_em', responsavel: 'compras3_responsavel',
      campos: [{ campo: 'compras3_local_entrega', rotulo: 'Data de envio para liquidação' }],
    },
    {
      nome: 'Contabilidade — Liquidação', sugestao: SUG.contab,
      recebidoEm: 'contabil_pc_recebido_em', responsavel: 'contabil_pc_responsavel',
      campos: [
        { campo: 'contabil_pc_auditor', rotulo: 'Auditor' },
        { campo: 'contabil_pc_liquidado', rotulo: 'Está liquidado?', igual: 'sim' },
        { campo: 'contabil_pc_liquidacao_numero', rotulo: 'Liquidação Nº' },
        { campo: 'contabil_pc_data_liquidacao', rotulo: 'Data da Liquidação' },
      ],
    },
    financas2('Secretaria de Finanças — Cronograma de Pagamento'),
    tesouraria(true),
    fechamento,
  ],
};

// Numera e completa cada etapa
for (const tipo of Object.keys(ETAPAS)) {
  ETAPAS[tipo] = ETAPAS[tipo].map((e, i) => ({
    recebidoEm: null, responsavel: null, extras: [], ...e,
    numero: i + 1,
    secao: `Seção ${ROMANOS[i]}`,
    titulo: `Seção ${ROMANOS[i]} — ${e.nome}`,
  }));
}

const etapasDo = (tipo) => ETAPAS[tipo === 'variaveis' ? 'variaveis' : 'fixas'];

/** Campos que a etapa grava (preenchidos pelo usuário + extras + automáticos) */
const camposGravaveis = (etapa) => [
  ...etapa.campos.map(c => c.campo),
  ...etapa.extras,
  ...[etapa.recebidoEm, etapa.responsavel].filter(Boolean),
];

const vazio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Obrigatórios ainda não atendidos (rótulos), olhando o DID já mesclado */
const pendencias = (etapa, did) => etapa.campos.filter((c) => {
  if (c.opcional) return false;
  if (c.se && did[c.se.campo] !== c.se.igual) return false;
  if (c.itens) return !(Array.isArray(did.itens_did) && did.itens_did.some(it => parseFloat(it.valor_total) > 0));
  if (c.checkbox) return did[c.campo] !== true;
  if (c.igual) return did[c.campo] !== c.igual;
  if (c.numero) return vazio(did[c.campo]) || Number.isNaN(parseFloat(did[c.campo]));
  return vazio(did[c.campo]);
}).map(c => c.rotulo);

/**
 * DIDs anteriores ao fluxo por etapas (etapas = NULL): a etapa conta como feita
 * quando algum campo dela foi preenchido — mesma regra que a tela usava para
 * liberar a seção seguinte. Assim o DID continua de onde estava.
 */
const LEGADO = {
  fixas: [
    (f) => f.credor_sec1 && f.data_did && f.objeto,
    (f) => f.ci_recebido_em || f.ci_responsavel || f.despacho_ci,
    (f) => f.financas_recebido_em || f.financas_responsavel,
    (f) => f.contabil_recebido_em || f.contabil_responsavel || f.empenho_numero,
    (f) => f.financas2_recebido_em || f.financas2_responsavel || f.financas2_enviado_pagamento,
    (f) => f.tesouraria_recebido_em || f.tesouraria_responsavel || f.pago === 'sim',
    (f) => f.contab_fech_finalizado,
  ],
  variaveis: [
    (f) => f.credor_sec1 && f.data_did && f.objeto,
    (f) => f.ci_recebido_em || f.ci_responsavel || f.despacho_ci,
    (f) => f.financas_recebido_em || f.financas_responsavel,
    (f) => f.compras2_recebido_em || f.compras2_responsavel || f.compras2_nro_empenho_solicitacao,
    (f) => f.contabil_recebido_em || f.contabil_responsavel || f.empenho_numero,
    (f) => f.compras_recebido_em || f.compras_responsavel,
    (f) => f.receb_responsavel || f.receb_data,
    (f) => f.compras3_recebido_em || f.compras3_responsavel,
    (f) => f.contabil_pc_recebido_em || f.contabil_pc_responsavel || f.contabil_pc_liquidacao_numero,
    (f) => f.financas2_recebido_em || f.financas2_responsavel || f.financas2_enviado_pagamento,
    (f) => f.tesouraria_recebido_em || f.tesouraria_responsavel || f.pago === 'sim',
    (f) => f.contab_fech_finalizado,
  ],
};

module.exports = { ETAPAS, ROMANOS, etapasDo, camposGravaveis, pendencias, LEGADO };
