// ─────────────────────────────────────────────────────────────────────────────
//  CATÁLOGO DE BLOCOS DO DID + FLUXOS PADRÃO
//
//  Cada município monta a sequência do DID (Configurações › Fluxos de Processo)
//  com estes blocos — as seções que o sistema já tem, com seus campos e telas —
//  e com etapas personalizadas (campos simples). Cada DID guarda a "foto" do
//  fluxo com que foi aberto (dids.fluxo) e segue com ela até o fim.
//
//  Bloco:
//    nome            → nome padrão da etapa (o município pode renomear)
//    tipos           → em quais tipos de DID pode entrar
//    sugestao        → setores sugeridos quando não configurado (nome do setor)
//    recebidoEm      → campo carimbado pelo servidor com a data do recebimento
//    responsavel     → campo carimbado com o usuário que conclui
//    campos          → o que o usuário preenche. Cada campo:
//                        travado: obrigatório sempre (outros módulos dependem dele)
//                        opcionalPadrao: começa como não obrigatório
//                        se { campo, igual } · checkbox · igual · numero · itens
//    extras          → campos que a etapa pode alterar sem serem dela
//    conflita        → blocos que usam as mesmas colunas (não podem coexistir)
// ─────────────────────────────────────────────────────────────────────────────

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
  'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

const SUG = {
  controle:   { setor: ['controle interno', 'controladoria', 'controlador', 'auditoria'], secretaria: ['controladoria', 'cgm'] },
  financas:   { setor: ['financas', 'orcament'], secretaria: ['financas', 'sefin'], gabinete: true },
  contab:     { setor: ['contab'], secretaria: ['financas', 'sefin'] },
  compras:    { setor: ['compras', 'licita', 'aquisic'], secretaria: ['administra'] },
  almox:      { setor: ['almox'], secretaria: ['administra'] },
  tesouraria: { setor: ['tesour'], secretaria: ['financas', 'sefin'] },
};
const SIM = (campo) => ({ campo, igual: 'sim' });
const AMBOS = ['fixas', 'variaveis'];

// Dados do credor informados na Abertura que a Tesouraria também pode corrigir
const EXTRAS_ABERTURA = ['banco_fornecedor', 'ag_fornecedor', 'cc_fornecedor'];

const certidoesTesouraria = {
  fixas: [
    { campo: 'cert_teso_municipal', rotulo: 'Certidão Municipal', checkbox: true },
    { campo: 'cert_teso_trabalhista', rotulo: 'Certidão Trabalhista', checkbox: true },
    { campo: 'cert_teso_fgts', rotulo: 'Certidão FGTS', checkbox: true },
    { campo: 'cert_teso_estadual', rotulo: 'Certidão Estadual', checkbox: true },
    { campo: 'cert_teso_federal', rotulo: 'Certidão Federal', checkbox: true },
    // Só se aplica a empresas optantes do Simples
    { campo: 'cert_teso_simples_nac', rotulo: 'Certidão Simples Nacional', checkbox: true, opcionalPadrao: true },
  ],
  variaveis: [
    { campo: 'cert_teso_cnd', rotulo: 'Certidão Unificada', checkbox: true },
    { campo: 'cert_teso_fgts', rotulo: 'Certidão FGTS', checkbox: true },
    { campo: 'cert_teso_estadual', rotulo: 'Certidão Estadual', checkbox: true },
    { campo: 'cert_teso_trabalhista', rotulo: 'Certidão Trabalhista', checkbox: true },
    { campo: 'cert_teso_municipal', rotulo: 'Certidão Municipal', checkbox: true },
    { campo: 'doc_caixa', rotulo: 'Doc. Caixa' },
  ],
};

const BLOCOS = {
  abertura: {
    nome: 'Abertura', tipos: AMBOS, sugestao: 'todas', fixo: true,
    campos: {
      fixas: [
        { campo: 'contrato_ref', rotulo: 'Contrato' },
        { campo: 'secretaria_sec1', rotulo: 'Secretaria', travado: true },
        { campo: 'secretario_nome', rotulo: 'Secretário Responsável' },
        { campo: 'nro_licitacao_sec1', rotulo: 'Nº da Licitação' },
        { campo: 'tipo_licitacao_sec1', rotulo: 'Tipo de Licitação' },
        { campo: 'credor_sec1', rotulo: 'Credor', travado: true },
        { campo: 'cnpj_cpf_credor_sec1', rotulo: 'CNPJ/CPF do Credor', travado: true },
        { campo: 'data_did', rotulo: 'Data', travado: true },
        { campo: 'mes_referencia', rotulo: 'Mês de Referência' },
        { campo: 'fonte_recurso', rotulo: 'Fonte de Recurso' },
        { campo: 'objeto', rotulo: 'Objeto', travado: true },
        { campo: 'itens_did', rotulo: 'Itens do DID (ao menos um item com valor)', itens: true, travado: true },
      ],
      variaveis: [
        { campo: 'credor_sec1', rotulo: 'Credor', travado: true },
        { campo: 'cnpj_cpf_credor_sec1', rotulo: 'CNPJ/CPF do Credor', travado: true },
        { campo: 'secretaria_sec1', rotulo: 'Secretaria', travado: true },
        { campo: 'secretario_nome', rotulo: 'Secretário Responsável' },
        { campo: 'data_did', rotulo: 'Data', travado: true },
        { campo: 'mes_referencia', rotulo: 'Mês de Referência' },
        { campo: 'fonte_recurso', rotulo: 'Fonte de Recurso' },
        { campo: 'objeto', rotulo: 'Objeto', travado: true },
        { campo: 'itens_did', rotulo: 'Itens do DID (ao menos um item com valor)', itens: true, travado: true },
      ],
    },
    extras: EXTRAS_ABERTURA,
  },

  controle_interno: {
    nome: 'Controle Interno', tipos: AMBOS, sugestao: SUG.controle,
    recebidoEm: 'ci_recebido_em', responsavel: 'ci_responsavel',
    campos: [{ campo: 'despacho_ci', rotulo: 'Despacho via C.I.' }],
  },

  financas_autorizacao: {
    nome: 'Secretaria de Finanças', tipos: AMBOS, sugestao: SUG.financas,
    recebidoEm: 'financas_recebido_em', responsavel: 'financas_responsavel',
    campos: [],
  },

  compras_solicitacao: {
    nome: 'Compras — Solicitação de Empenho', tipos: AMBOS, sugestao: SUG.compras,
    recebidoEm: 'compras2_recebido_em', responsavel: 'compras2_responsavel',
    campos: [{ campo: 'compras2_nro_empenho_solicitacao', rotulo: 'Nº Solicitação de Empenho' }],
  },

  contab_empenho: {
    nome: 'Contabilidade — Empenho', tipos: AMBOS, sugestao: SUG.contab, conflita: ['contab_empenho_liquidacao'],
    recebidoEm: 'contabil_recebido_em', responsavel: 'contabil_responsavel',
    campos: [
      { campo: 'contabil_auditor', rotulo: 'Auditor' },
      // Painel financeiro usa a situação "empenhado"
      { campo: 'contabil_empenhado', rotulo: 'Está empenhado? (Sim)', igual: 'sim', travado: true },
      { campo: 'empenho_numero', rotulo: 'Empenho Nº' },
      { campo: 'tipo_empenho', rotulo: 'Tipo de Empenho' },
      { campo: 'data_empenho', rotulo: 'Data do Empenho' },
    ],
  },

  contab_empenho_liquidacao: {
    nome: 'Contabilidade — Empenho e Liquidação', tipos: AMBOS, sugestao: SUG.contab, conflita: ['contab_empenho'],
    recebidoEm: 'contabil_recebido_em', responsavel: 'contabil_responsavel',
    campos: [
      { campo: 'contabil_auditor', rotulo: 'Auditor' },
      { campo: 'contabil_empenhado', rotulo: 'Está empenhado?', travado: true },
      { campo: 'empenho_numero', rotulo: 'Empenho Nº', se: SIM('contabil_empenhado') },
      { campo: 'tipo_empenho', rotulo: 'Tipo de Empenho', se: SIM('contabil_empenhado') },
      { campo: 'data_empenho', rotulo: 'Data do Empenho', se: SIM('contabil_empenhado') },
      { campo: 'contabil_liquidado', rotulo: 'Está liquidado?', travado: true },
      { campo: 'liquidacao_numero', rotulo: 'Liquidação Nº', se: SIM('contabil_liquidado') },
      { campo: 'data_liquidacao', rotulo: 'Data da Liquidação', se: SIM('contabil_liquidado') },
      { campo: 'doc_caixa', rotulo: 'Doc. Caixa', se: SIM('contabil_liquidado') },
    ],
  },

  compras_ordem: {
    nome: 'Compras — Ordem de Compra', tipos: AMBOS, sugestao: SUG.compras,
    recebidoEm: 'compras_recebido_em', responsavel: 'compras_responsavel',
    campos: [
      { campo: 'nro_empenho_solicitacao', rotulo: 'Nº Ordem de Compra' },
      { campo: 'local_entrega', rotulo: 'Local de Entrega' },
    ],
  },

  almox_recebimento: {
    // A ordem de compra vinculada (Abertura de Contas Variáveis) é que vai ao estoque
    nome: 'Almoxarifado — Recebimento', tipos: ['variaveis'], sugestao: SUG.almox,
    recebidoEm: null, responsavel: 'receb_responsavel',
    campos: [
      // Libera a ordem na Entrada do Almoxarifado
      { campo: 'receb_ordem_recebida', rotulo: 'A ordem foi recebida? (Sim — Recebida)', igual: 'sim', travado: true },
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

  compras_ateste: {
    nome: 'Compras — Ateste de NF', tipos: AMBOS, sugestao: SUG.compras,
    recebidoEm: 'compras3_recebido_em', responsavel: 'compras3_responsavel',
    campos: [{ campo: 'compras3_local_entrega', rotulo: 'Data de envio para liquidação' }],
  },

  contab_liquidacao: {
    nome: 'Contabilidade — Liquidação', tipos: AMBOS, sugestao: SUG.contab,
    recebidoEm: 'contabil_pc_recebido_em', responsavel: 'contabil_pc_responsavel',
    campos: [
      { campo: 'contabil_pc_auditor', rotulo: 'Auditor' },
      // Painel financeiro usa a situação "liquidado"
      { campo: 'contabil_pc_liquidado', rotulo: 'Está liquidado? (Sim)', igual: 'sim', travado: true },
      { campo: 'contabil_pc_liquidacao_numero', rotulo: 'Liquidação Nº' },
      { campo: 'contabil_pc_data_liquidacao', rotulo: 'Data da Liquidação' },
    ],
  },

  financas_pagamento: {
    nome: 'Secretaria de Finanças — Pagamento', tipos: AMBOS, sugestao: SUG.financas,
    recebidoEm: 'financas2_recebido_em', responsavel: 'financas2_responsavel',
    campos: [{ campo: 'financas2_enviado_pagamento', rotulo: 'Enviado para Pagamento' }],
  },

  tesouraria: {
    nome: 'Tesouraria', tipos: AMBOS, sugestao: SUG.tesouraria,
    recebidoEm: 'tesouraria_recebido_em', responsavel: 'tesouraria_responsavel',
    campos: {
      fixas: null, variaveis: null, // montados abaixo (comuns + certidões do tipo)
    },
    extras: ['banco_pagador', 'ag_pagador', 'cc_pagador'],
  },

  fechamento: {
    nome: 'Contabilidade — Fechamento', tipos: AMBOS, sugestao: SUG.contab, ultimo: true,
    recebidoEm: null, responsavel: null,
    campos: [
      { campo: 'contab_fech_finalizado', rotulo: 'Processo Finalizado (Sim)', igual: 'sim' },
      { campo: 'contab_fech_tce', rotulo: 'Enviado para o TCE/SIM' },
    ],
  },
};

// Tesouraria: caixa e extrato dependem de conta, pagamento e data
const camposTesouraria = (tipo) => [
  { campo: 'conta_pagamento_id', rotulo: 'Conta de Pagamento', travado: true },
  { campo: 'banco_fornecedor', rotulo: 'Banco do Credor' },
  { campo: 'ag_fornecedor', rotulo: 'Agência do Credor' },
  { campo: 'cc_fornecedor', rotulo: 'Conta do Credor' },
  { campo: 'fonte_recurso', rotulo: 'Fonte de Recurso' },
  { campo: 'desconto_inss', rotulo: 'Desconto INSS (informe 0 se não houver)', numero: true },
  { campo: 'desconto_iss', rotulo: 'Desconto ISS (informe 0 se não houver)', numero: true },
  { campo: 'desconto_irrf', rotulo: 'Desconto IRRF (informe 0 se não houver)', numero: true },
  { campo: 'desconto_outros', rotulo: 'Outros descontos (informe 0 se não houver)', numero: true },
  ...certidoesTesouraria[tipo],
  { campo: 'pago', rotulo: 'Pagamento realizado (Sim — Pago)', igual: 'sim', travado: true },
  { campo: 'data_pagamento', rotulo: 'Data do pagamento', travado: true },
];
BLOCOS.tesouraria.campos = { fixas: camposTesouraria('fixas'), variaveis: camposTesouraria('variaveis') };

/** Campos do bloco para o tipo de DID */
const camposDoBloco = (bloco, tipo) => {
  const c = BLOCOS[bloco]?.campos;
  if (!c) return [];
  return Array.isArray(c) ? c : (c[tipo] || []);
};

// Campos que as etapas personalizadas podem ter
const TIPOS_CAMPO_PERSONALIZADO = {
  texto: 'Parecer / Despacho (texto)',
  data: 'Data',
  simnao: 'Pergunta Sim/Não',
  documento: 'Nº de documento',
  checklist: 'Checklist',
};

// Sequência de hoje (padrão de todo município até ele configurar a sua)
const FLUXO_PADRAO = {
  fixas: ['abertura', 'controle_interno', 'financas_autorizacao', 'contab_empenho_liquidacao', 'financas_pagamento', 'tesouraria', 'fechamento'],
  variaveis: ['abertura', 'controle_interno', 'financas_autorizacao', 'compras_solicitacao', 'contab_empenho', 'compras_ordem',
    'almox_recebimento', 'compras_ateste', 'contab_liquidacao', 'financas_pagamento', 'tesouraria', 'fechamento'],
};
// Nomes que a sequência padrão já usava
const NOMES_PADRAO = { financas_pagamento: { variaveis: 'Secretaria de Finanças — Cronograma de Pagamento' } };

const etapaPadrao = (bloco, tipo) => ({
  id: bloco,
  bloco,
  nome: NOMES_PADRAO[bloco]?.[tipo] || BLOCOS[bloco].nome,
  setores: null, // null = sugestão automática pelo nome do setor
  todos: BLOCOS[bloco].sugestao === 'todas',
  obrigatorios: {},
});
const fluxoPadrao = (tipo) => ({ versao: 0, padrao: true, etapas: FLUXO_PADRAO[tipo].map(b => etapaPadrao(b, tipo)) });

/**
 * DIDs anteriores ao fluxo por etapas (etapas NULL): a etapa conta como feita
 * quando algum campo dela foi preenchido — mesma regra que a tela usava.
 */
const LEGADO = {
  abertura: (f) => f.credor_sec1 && f.data_did && f.objeto,
  controle_interno: (f) => f.ci_recebido_em || f.ci_responsavel || f.despacho_ci,
  financas_autorizacao: (f) => f.financas_recebido_em || f.financas_responsavel,
  compras_solicitacao: (f) => f.compras2_recebido_em || f.compras2_responsavel || f.compras2_nro_empenho_solicitacao,
  contab_empenho: (f) => f.contabil_recebido_em || f.contabil_responsavel || f.empenho_numero,
  contab_empenho_liquidacao: (f) => f.contabil_recebido_em || f.contabil_responsavel || f.empenho_numero,
  compras_ordem: (f) => f.compras_recebido_em || f.compras_responsavel,
  almox_recebimento: (f) => f.receb_responsavel || f.receb_data,
  compras_ateste: (f) => f.compras3_recebido_em || f.compras3_responsavel,
  contab_liquidacao: (f) => f.contabil_pc_recebido_em || f.contabil_pc_responsavel || f.contabil_pc_liquidacao_numero,
  financas_pagamento: (f) => f.financas2_recebido_em || f.financas2_responsavel || f.financas2_enviado_pagamento,
  tesouraria: (f) => f.tesouraria_recebido_em || f.tesouraria_responsavel || f.pago === 'sim',
  fechamento: (f) => f.contab_fech_finalizado,
};

// ── Validação de um fluxo configurado ────────────────────────────────────────
const LIQUIDA = ['contab_empenho_liquidacao', 'contab_liquidacao'];
const CONTABIL = ['contab_empenho', 'contab_empenho_liquidacao', 'contab_liquidacao'];

/**
 * @param etapas  [{ id, bloco, nome, setores, todos, personalizada }]
 * @param setoresValidos  Set de ids de setores ativos
 * @returns { erros: string[], avisos: string[] }
 */
function validarFluxo(tipo, etapas, setoresValidos) {
  const erros = [];
  const avisos = [];
  if (!Array.isArray(etapas) || !etapas.length) return { erros: ['O fluxo está vazio.'], avisos };
  if (etapas[0].bloco !== 'abertura') erros.push('A Abertura precisa ser a primeira etapa.');
  if (etapas.length < 2) erros.push('Inclua ao menos uma etapa depois da Abertura.');

  const vistos = new Set();
  const ids = new Set();
  etapas.forEach((e, i) => {
    const pos = `Etapa ${i + 1}`;
    if (!e.id || ids.has(e.id)) erros.push(`${pos}: identificador repetido.`);
    ids.add(e.id);
    if (!e.nome || !String(e.nome).trim()) erros.push(`${pos}: informe o nome.`);
    if (e.bloco === 'personalizada') {
      const campos = e.personalizada?.campos || [];
      if (!campos.length) erros.push(`${pos} (${e.nome}): escolha ao menos um campo.`);
      campos.forEach(c => {
        if (!TIPOS_CAMPO_PERSONALIZADO[c.tipo]) erros.push(`${pos} (${e.nome}): campo de tipo desconhecido.`);
        if (!c.rotulo || !String(c.rotulo).trim()) erros.push(`${pos} (${e.nome}): todo campo precisa de um rótulo.`);
        if (c.tipo === 'checklist' && !(c.itens || []).filter(x => String(x).trim()).length) erros.push(`${pos} (${e.nome}): o checklist "${c.rotulo}" precisa de itens.`);
      });
    } else {
      const b = BLOCOS[e.bloco];
      if (!b) { erros.push(`${pos}: bloco desconhecido.`); return; }
      if (!b.tipos.includes(tipo)) erros.push(`${pos} (${e.nome}): este bloco não existe em ${tipo === 'fixas' ? 'Contas Fixas' : 'Contas Variáveis'}.`);
      if (vistos.has(e.bloco)) erros.push(`${pos} (${e.nome}): este bloco já está no fluxo.`);
      (b.conflita || []).forEach(c => { if (etapas.some(x => x.bloco === c)) erros.push(`${pos} (${e.nome}) não pode ficar junto com "${BLOCOS[c].nome}" (usam os mesmos campos).`); });
      if (e.bloco === 'abertura' && i !== 0) erros.push('A Abertura precisa ser a primeira etapa.');
      if (b.ultimo && i !== etapas.length - 1) erros.push(`${pos} (${e.nome}) precisa ser a última etapa.`);
      vistos.add(e.bloco);
    }
    const temSetor = e.todos || (Array.isArray(e.setores) && e.setores.some(id => setoresValidos.has(id)));
    if (!temSetor) erros.push(`${pos} (${e.nome}): escolha ao menos um setor.`);
  });

  const posDe = (blocos) => etapas.findIndex(e => blocos.includes(e.bloco));
  const iTes = posDe(['tesouraria']);
  const iLiq = posDe(LIQUIDA);
  if (iTes < 0) avisos.push('Sem Tesouraria, o DID nunca debita uma conta (não entra no caixa nem no extrato).');
  if (iTes >= 0 && (iLiq < 0 || iLiq > iTes)) avisos.push('A Tesouraria vem antes de uma liquidação: o pagamento pode acontecer sem despesa liquidada.');
  if (posDe(CONTABIL) < 0) avisos.push('Sem Contabilidade, o Painel financeiro mostra o DID sempre como "pendente".');
  return { erros: [...new Set(erros)], avisos };
}

module.exports = {
  BLOCOS, ROMANOS, TIPOS_CAMPO_PERSONALIZADO, FLUXO_PADRAO, LEGADO,
  camposDoBloco, fluxoPadrao, etapaPadrao, validarFluxo,
};
