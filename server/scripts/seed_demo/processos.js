// Processos com trilha de tramitação realista, DIDs (fixas/variáveis),
// documentos de despacho (ofícios, determinações etc.), financeiro e logs
const { uuid, sha, ri, pick, money, rand, mk, addH, addD, fmtTs, fmtD, comercial, cpf, soDigitos } = require('./util');
const fluxos = require('./fluxos');

const TXT_TRAMITE = {
  CI:      ['Encaminho o presente para análise e manifestação do Controle Interno, nos termos do fluxo de execução da despesa.',
            'Segue para apreciação do Controle Interno quanto à regularidade da despesa e indicação de dotação orçamentária.'],
  COMPRAS: ['Ao Setor de Compras para verificação de cobertura contratual e emissão da solicitação de empenho.',
            'Encaminho para conferência da licitação vigente e providências junto ao setor de compras.'],
  CONTAB:  ['À Contabilidade para conferência das certidões, emissão da nota de empenho e demais registros.',
            'Segue para o setor contábil para empenho e liquidação da despesa, conferidos os documentos fiscais.'],
  GSEFIN:  ['À Secretaria de Finanças para autorização e programação financeira do pagamento.',
            'Encaminho para deliberação do Ordenador de Despesas quanto à autorização de pagamento.'],
  TESOUR:  ['Autorizo o pagamento. Encaminhe-se à Tesouraria para quitação e arquivamento das comprovações.',
            'À Tesouraria para efetivação do pagamento conforme programação financeira aprovada.'],
  ALMOX:   ['Ao Almoxarifado Central para recebimento, conferência e atesto dos materiais entregues.',
            'Encaminho para registro de entrada e conferência física dos itens da ordem de compra.'],
  GAB:     ['Ao Gabinete do Prefeito para conhecimento e deliberação superior.',
            'Submeto o presente à apreciação do Chefe do Executivo.'],
  AJUR:    ['À Assessoria Jurídica para análise e emissão de parecer.',
            'Encaminho para manifestação jurídica quanto à legalidade do procedimento.'],
  default: ['Encaminho para análise e providências cabíveis no âmbito desse setor.',
            'Segue o presente processo para apreciação e manifestação.',
            'Para conhecimento e adoção das providências necessárias.'],
};
const TXT_CONCLUSAO = [
  'Providências concluídas. Encerro o presente processo.',
  'Demanda integralmente atendida. Processo concluído.',
  'Pagamento efetuado e comprovantes juntados. Processo concluído.',
];
const txtTramite = (destKey) => pick(TXT_TRAMITE[destKey] || TXT_TRAMITE.default);

// ── DIDs por etapas (Configurações › Fluxos de Processo) ────────────────────
// concl = etapas concluídas (a Abertura conta). Situação final:
//   concluido / arquivado → todas as etapas concluídas
//   andamento             → o processo está no setor da próxima etapa
//                           (naoRecebido: tramitado, aguardando o setor receber)
//   devolvido             → a etapa seguinte devolveu à última concluída
//   aberto                → só a Abertura, ainda não tramitado
// Fixas v2 = fluxo com "Assessoria Jurídica — Parecer" (DIDs mais recentes).

// [key, criadorKey, credorKey, contratoN, objetoCurto, mesRef, valor, concl, final, [mes,dia], prioridade, opts]
const DIDS_FIXAS = [
  ['did_energia_jun', 'secadm',    'enel',      1,  'Pagamento da fatura de energia elétrica dos prédios públicos', 'Junho/2026',  41235.77, 7, 'concluido', [6, 3],  'alta'],
  ['did_energia_mai', 'secadm',    'enel',      1,  'Pagamento da fatura de energia elétrica dos prédios públicos', 'Maio/2026',   39984.12, 7, 'arquivado', [5, 4],  'alta'],
  ['did_energia_jul', 'secadm',    'enel',      1,  'Pagamento da fatura de energia elétrica dos prédios públicos', 'Julho/2026',  42710.45, 4, 'andamento', [7, 6],  'alta',    { v2: true }],
  ['did_agua_jun',    'secadm',    'cagece',    2,  'Pagamento da fatura de água e esgoto dos prédios públicos',    'Junho/2026',  9260.33,  7, 'concluido', [6, 4],  'normal'],
  ['did_agua_jul',    'secadm',    'cagece',    2,  'Pagamento da fatura de água e esgoto dos prédios públicos',    'Julho/2026',  9430.10,  1, 'andamento', [7, 8],  'normal',  { v2: true, naoRecebido: true }],
  ['did_internet_jun','secadm',    'brisanet',  3,  'Pagamento do link dedicado de internet 200Mbps',               'Junho/2026',  3200.00,  5, 'andamento', [6, 8],  'normal'],
  ['did_telefonia_mai','secadm',   'claro',     4,  'Pagamento da telefonia móvel corporativa – 60 linhas',         'Maio/2026',   2950.00,  7, 'concluido', [5, 6],  'normal'],
  ['did_limpeza_jun', 'secadm',    'jmr',       16, 'Medição dos serviços de limpeza e conservação predial',        'Junho/2026',  38700.00, 3, 'andamento', [6, 5],  'normal'],
  ['did_limpeza_mai', 'secadm',    'jmr',       16, 'Medição dos serviços de limpeza e conservação predial',        'Maio/2026',   38700.00, 7, 'concluido', [5, 5],  'normal'],
  ['did_locacao_jun', 'secsau',    'valecuru',  14, 'Locação de veículos das equipes da Saúde – 5 veículos',        'Junho/2026',  21000.00, 4, 'andamento', [6, 9],  'normal',  { naoRecebido: true }],
  ['did_transp_mai',  'seceduc',   'santaclara',15, 'Medição do transporte escolar – rotas I a VIII',               'Maio/2026',   34800.00, 7, 'concluido', [5, 7],  'alta'],
  ['did_transp_jun',  'seceduc',   'santaclara',15, 'Medição do transporte escolar – rotas I a VIII',               'Junho/2026',  34800.00, 2, 'andamento', [6, 10], 'alta'],
  ['did_aluguel_jun', 'secsocial', 'ednardo',   27, 'Pagamento do aluguel do imóvel do CRAS',                       'Junho/2026',  2800.00,  7, 'concluido', [6, 2],  'normal'],
  ['did_aluguel_jul', 'secsocial', 'ednardo',   27, 'Pagamento do aluguel do imóvel do CRAS',                       'Julho/2026',  2800.00,  2, 'andamento', [7, 7],  'normal',  { v2: true }],
  ['did_contab_jun',  'secfin',    'contabil',  25, 'Pagamento da assessoria contábil pública',                     'Junho/2026',  14800.00, 3, 'andamento', [6, 11], 'normal'],
  ['did_software_jun','secadm',    'jeos',      26, 'Licenciamento mensal do software de gestão de processos',      'Junho/2026',  6900.00,  6, 'andamento', [6, 12], 'normal'],
  ['did_labvida_mai', 'secsau',    'labvida',   24, 'Pagamento de exames laboratoriais complementares ao SUS',      'Maio/2026',   18500.00, 7, 'concluido', [5, 11], 'normal'],
  ['did_oxigenio_jun','secsau',    'oxigenio',  30, 'Recarga de oxigênio medicinal do Hospital Municipal',          'Junho/2026',  11550.00, 1, 'devolvido', [6, 15], 'urgente'],
];

// ── DIDs Contas Variáveis: [key, criadorKey, ordemKey, concl, final, [m,d], prioridade, opts]
const DIDS_VARIAVEIS = [
  ['did_comb_jul',   'secadm',   'oc_comb_jul',       3,  'andamento', [7, 3],  'alta'],
  ['did_comb_jun',   'secsau',   'oc_comb_jun_sesau', 12, 'concluido', [6, 1],  'alta'],
  ['did_medic_jun',  'secsau',   'oc_medic_jun',      7,  'andamento', [6, 5],  'urgente'],
  ['did_hosp_mai',   'secsau',   'oc_hosp_mai',       12, 'concluido', [5, 4],  'alta'],
  ['did_merenda_jun','seceduc',  'oc_merenda_jun',    12, 'concluido', [6, 2],  'alta'],
  ['did_exped_jul',  'secadm',   'oc_exped_jul',      6,  'andamento', [7, 6],  'normal'],
  ['did_info_jun',   'secadm',   'oc_info_jun',       9,  'andamento', [6, 9],  'normal',  { naoRecebido: true }],
  ['did_eletr_jun',  'secinfra', 'oc_eletr_jun',      4,  'devolvido', [6, 12], 'normal'],
  ['did_constr_mai', 'secinfra', 'oc_constr_mai',     12, 'concluido', [5, 8],  'normal'],
  ['did_pneus_abr',  'secadm',   'oc_pneus_abr',      12, 'arquivado', [4, 16], 'normal'],
  ['did_cart_mai',   'seceduc',  'oc_cart_mai',       10, 'andamento', [5, 15], 'normal'],
  ['did_graf_jun',   'seccult',  'oc_graf_jun',       1,  'aberto',    [6, 17], 'baixa'],
];

// Justificativas das devoluções (a etapa seguinte devolve à anterior)
const DEVOLUCOES = {
  did_oxigenio_jun: 'Certidão de regularidade do FGTS do credor vencida em 31/05/2026. Juntar certidão válida e reenviar ao Controle Interno.',
  did_eletr_jun: 'O número da solicitação de empenho não confere com a ordem de compra vinculada. Corrigir e reenviar à Contabilidade.',
};

// ── Processos tipo Despacho (documentos oficiais) ────────────────────────────
const DESPACHOS = [
  ['proc_oficio1', 'chefegab', ['GSESAU'], 1, 'concluido', [6, 10],
   'Ofício nº 045/2026 – Solicitação de informações sobre abastecimento de medicamentos',
   { tipo_despacho: 'oficio', numero: '045/2026', para: 'Secretária Municipal de Saúde',
     texto: 'Senhora Secretária,\n\nCom os cordiais cumprimentos, solicitamos a Vossa Senhoria o envio, no prazo de 10 (dez) dias úteis, de relatório circunstanciado sobre o abastecimento de medicamentos básicos na Farmácia Central e nas unidades de saúde, indicando itens em falta, consumo médio mensal e providências em curso.\n\nA solicitação decorre de demandas registradas na Ouvidoria Municipal e subsidiará as deliberações do Gabinete quanto ao reforço orçamentário do setor.\n\nAtenciosamente,' }],
  ['proc_oficio2', 'secadm', ['GSEFIN'], 1, 'concluido', [5, 20],
   'Ofício nº 058/2026 – Encaminhamento da folha de pagamento de maio/2026',
   { tipo_despacho: 'oficio', numero: '058/2026', para: 'Secretário Municipal de Finanças',
     texto: 'Senhor Secretário,\n\nEncaminhamos a folha de pagamento dos servidores ativos referente à competência maio/2026, devidamente processada e conferida por esta Secretaria, no valor bruto de R$ 1.487.320,54, para as providências de empenho, liquidação e pagamento.\n\nSeguem anexos os resumos por secretaria e por vínculo, bem como as guias de encargos patronais.\n\nRespeitosamente,' }],
  ['proc_oficio3', 'secsau', ['GAB'], 1, 'em_analise', [7, 9],
   'Ofício nº 112/2026 – Resposta à solicitação sobre o programa de TFD',
   { tipo_despacho: 'oficio', numero: '112/2026', para: 'Excelentíssimo Senhor Prefeito Municipal',
     texto: 'Excelentíssimo Senhor Prefeito,\n\nEm resposta à solicitação de Vossa Excelência, informamos que o programa de Tratamento Fora do Domicílio (TFD) realizou 214 viagens no primeiro semestre de 2026, atendendo 87 pacientes em tratamento continuado em Fortaleza e Sobral.\n\nInformamos ainda que a frota dedicada conta com 3 veículos, e que a demanda reprimida atual é de 12 pacientes aguardando agendamento de exames especializados.\n\nRespeitosamente,' }],
  ['proc_det1', 'prefeito', ['PATRIM', 'CI'], 2, 'concluido', [4, 6],
   'Determinação Institucional nº 007/2026 – Inventário anual de bens móveis',
   { tipo_despacho: 'determinacao_institucional', numero: '007/2026', para: 'Todos os Secretários Municipais',
     texto: 'O PREFEITO MUNICIPAL DE MODELO, no uso de suas atribuições legais,\n\nDETERMINA:\n\nArt. 1º Fica instaurado o inventário anual de bens móveis do exercício de 2026, a ser realizado pela Comissão de Patrimônio no período de 06/04/2026 a 30/09/2026.\n\nArt. 2º Os titulares das secretarias deverão disponibilizar acesso às dependências e designar servidor de apoio à comissão.\n\nArt. 3º Divergências apuradas deverão ser comunicadas ao Controle Interno no prazo de 5 dias úteis.\n\nCumpra-se.' }],
  ['proc_det2', 'controle', ['CONTAB'], 1, 'em_analise', [7, 2],
   'Determinação nº 008/2026 – Regularização de certidões nos processos de despesa',
   { tipo_despacho: 'determinacao_institucional', numero: '008/2026', para: 'Setor de Contabilidade e Setor de Compras',
     texto: 'A CONTROLADORIA GERAL DO MUNICÍPIO, no exercício de suas competências,\n\nDETERMINA que, a partir desta data, nenhum Documento de Instrução de Despesa (DID) seja empenhado sem a juntada das certidões de regularidade federal, estadual, municipal, trabalhista e do FGTS do credor, todas dentro do prazo de validade.\n\nOs processos em tramitação em desacordo deverão ser devolvidos à origem para regularização.' }],
  ['proc_comunic1', 'secadm', ['GAB'], 1, 'arquivado', [6, 18],
   'Comunicado nº 015/2026 – Expediente no Dia do Servidor Público',
   { tipo_despacho: 'comunicado', numero: '015/2026', para: 'Todos os servidores municipais',
     texto: 'A Secretaria de Administração COMUNICA que, em 25 de julho de 2026, em comemoração ao Dia do Servidor Público, o expediente nas repartições públicas municipais será facultativo, ressalvados os serviços essenciais de saúde e limpeza urbana, que funcionarão em regime de escala.\n\nO expediente normal será retomado no dia útil seguinte.' }],
  ['proc_comunic2', 'rh', ['GSEMAD'], 1, 'concluido', [6, 22],
   'Comunicado nº 016/2026 – Recadastramento funcional obrigatório',
   { tipo_despacho: 'comunicado', numero: '016/2026', para: 'Todos os servidores efetivos',
     texto: 'O Departamento de Recursos Humanos COMUNICA que o recadastramento funcional obrigatório dos servidores efetivos ocorrerá de 01 a 31 de julho de 2026, na sede da Secretaria de Administração, das 8h às 14h.\n\nDocumentos necessários: RG, CPF, comprovante de residência atualizado e certidões de dependentes. O não comparecimento implicará suspensão cautelar do pagamento, nos termos do Decreto nº 015/2025.' }],
  ['proc_portaria', 'prefeito', ['RH', 'ARQ'], 2, 'arquivado', [5, 12],
   'Portaria nº 118/2026 – Designação de fiscais de contratos',
   { tipo_despacho: 'portaria', numero: '118/2026',
     ementa: 'Designa servidores para atuar como fiscais dos contratos administrativos que indica e dá outras providências.',
     texto: 'O PREFEITO MUNICIPAL DE MODELO, no uso das atribuições que lhe confere a Lei Orgânica do Município,\n\nRESOLVE:\n\nArt. 1º Designar os servidores abaixo relacionados para exercer a fiscalização dos contratos administrativos vigentes:\nI – Gilberto Nunes Paranhos – contratos da Secretaria de Administração;\nII – Elisângela Moura Tabosa – contratos da Secretaria de Saúde;\nIII – Ademar Cruz Landim – contratos da Secretaria de Educação;\nIV – Wagner Peixoto Sales – contratos da Secretaria de Infraestrutura.\n\nArt. 2º Esta Portaria entra em vigor na data de sua publicação.' }],
  ['proc_decreto', 'prefeito', ['ARQ'], 1, 'concluido', [6, 16],
   'Decreto nº 022/2026 – Horário especial de expediente',
   { tipo_despacho: 'decreto', numero: '022/2026',
     ementa: 'Estabelece horário especial de expediente nas repartições públicas municipais e dá outras providências.',
     texto: 'O PREFEITO MUNICIPAL DE MODELO, no uso de suas atribuições legais,\n\nDECRETA:\n\nArt. 1º A partir de 01 de julho de 2026, o expediente nas repartições públicas municipais será das 7h às 13h, de segunda a sexta-feira, para contenção de despesas com energia elétrica.\n\nArt. 2º Os serviços essenciais de saúde, coleta de lixo e vigilância funcionarão em regime de plantão.\n\nArt. 3º Este Decreto entra em vigor na data de sua publicação.' }],
  ['proc_encam', 'procurador', ['GSEMAD'], 1, 'em_analise', [7, 10],
   'Encaminhamento do Parecer Jurídico nº 044/2026 – Aditivo contratual',
   { tipo_despacho: 'encaminhamento', referencia: 'Parecer Jurídico nº 044/2026 – Contrato nº 016/2026 (JMR Serviços)', para: 'Secretário de Administração',
     texto: 'Senhor Secretário,\n\nEncaminho o Parecer Jurídico nº 044/2026, que opina pela LEGALIDADE do 1º Termo Aditivo ao Contrato nº 016/2026 (serviços de limpeza e conservação), com acréscimo de 12% do valor inicial, dentro do limite legal do art. 125 da Lei nº 14.133/2021.\n\nRecomenda-se a juntada da planilha de custos atualizada antes da assinatura.' }],
];

// ── Processos tipo Requisição (materiais via almoxarifado) ───────────────────
const REQUISICOES = [
  ['preq1', 'rh',        'Requisição de material de expediente para o RH',            'concluido',  [5, 18]],
  ['preq2', 'contadora', 'Requisição de toners e suprimentos para a Contabilidade',   'concluido',  [5, 25]],
  ['preq3', 'cras',      'Requisição de materiais para oficinas do SCFV no CRAS',     'concluido',  [6, 3]],
  ['preq4', 'atbasica',  'Requisição de material de limpeza para as UBS',             'concluido',  [6, 10]],
  ['preq5', 'ti',        'Requisição de periféricos de informática',                  'em_analise', [7, 8]],
  ['preq6', 'merenda',   'Requisição de utensílios para as cozinhas escolares',       'em_analise', [7, 12]],
  ['preq7', 'ouvidoria', 'Requisição de material de expediente para a Ouvidoria',     'aberto',     [7, 14]],
  ['preq8', 'tributos',  'Requisição de material gráfico para carnês do IPTU',        'pendente',   [6, 29]],
];

// ── Processos tipo Pauta ─────────────────────────────────────────────────────
const PAUTAS = [
  ['ppauta1', 'compras', 'Pauta de julgamento do PE 015/2026 – Carteiras escolares',   'concluido',  [3, 2]],
  ['ppauta2', 'compras', 'Pauta de julgamento do PE 016/2026 – Pneus para a frota',    'arquivado',  [2, 9]],
  ['ppauta3', 'compras', 'Pauta de abertura do PE 018/2026 – Kits de fardamento',      'em_analise', [7, 1]],
  ['ppauta4', 'compras', 'Pauta de julgamento da TP 002/2026 – Reforma do mercado',    'em_analise', [6, 25]],
];

// ── Processos Gerais ─────────────────────────────────────────────────────────
// [key, criadorKey, rota, assunto, interessadoNome, final, [m,d], prioridade]
const GERAIS = [
  ['pger1',  'protocolo', ['FAMB'],           'Licenciamento ambiental simplificado – Padaria Pão da Terra',      'Panificadora Pão da Terra ME',      'em_analise', [7, 1],  'normal'],
  ['pger2',  'protocolo', ['ENG', 'TRIB'],    'Alvará de construção – residência unifamiliar Rua Projetada, 88',  'Raimunda Lira Nepomuceno',          'em_analise', [6, 24], 'normal'],
  ['pger3',  'ouvidoria', ['VISA'],           'Denúncia – comércio de alimentos sem condições sanitárias',        'Denúncia anônima – Ouvidoria',      'concluido',  [5, 14], 'alta'],
  ['pger4',  'rh',        ['GSEMAD'],         'Concessão de férias – servidor mat. 4471',                         'Everton Girão Tavares',             'concluido',  [6, 8],  'normal'],
  ['pger5',  'rh',        ['GSEMAD', 'AJUR'], 'Abono de permanência – servidora mat. 2105',                       'Terezinha Lourdes Vidal',           'pendente',   [6, 19], 'normal'],
  ['pger6',  'protocolo', ['ILUM'],           'Solicitação de reparo na iluminação da Rua das Carnaúbas',         'Associação de Moradores Alto Alegre','concluido', [5, 22], 'normal'],
  ['pger7',  'protocolo', ['VIAS'],           'Operação tapa-buraco na Av. Perimetral – trecho do mercado',       'Osmar Duarte Peixoto',              'em_analise', [7, 4],  'alta'],
  ['pger8',  'protocolo', ['LIMP'],           'Poda de árvores na Praça da Matriz',                               'Paróquia de São Sebastião',         'aberto',     [7, 13], 'normal'],
  ['pger9',  'protocolo', ['PEDAG'],          'Transferência de matrícula – E.M. José de Alencar',                'Auricélia Barros Feitosa',          'arquivado',  [3, 10], 'normal'],
  ['pger10', 'atbasica',  ['REGTFD'],         'Agendamento TFD – tratamento oncológico em Fortaleza',             'José Wilson Taveira Lima',          'concluido',  [6, 26], 'urgente'],
  ['pger11', 'protocolo', ['FAMB'],           'Autorização para castração – mutirão de animais comunitários',     'ONG Patas do Sertão',               'devolvido',  [6, 20], 'normal'],
  ['pger12', 'seccult',   ['GAB', 'GSEFIN'],  'Apoio financeiro – Festival de Cultura Popular 2026',              'Comissão Organizadora do Festival',     'em_analise', [7, 7],  'normal'],
  ['pger13', 'secagri',   ['APROD'],          'Distribuição de sementes – Programa Hora de Plantar 2026',         'Sindicato dos Trabalhadores Rurais','arquivado',  [4, 14], 'normal'],
  ['pger14', 'protocolo', ['GAB'],            'Cessão do Ginásio Poliesportivo – Copa Regional de Futsal',        'Liga Desportiva de Modelo',         'em_analise', [7, 11], 'normal'],
];

// ─────────────────────────────────────────────────────────────────────────────
const simula = (ctx, spec) => {
  const criador = ctx.u[spec.criadorKey];
  const origSetor = ctx.set[criador.setorKey];
  let t = comercial(mk(2026, spec.open[0], spec.open[1], ri(8, 15)));
  const t0 = t;
  const trs = [];
  const procId = uuid();
  const push = (tipo, extra) => trs.push(Object.assign({
    id: uuid(), processo_id: procId, tipo_acao: tipo, data_hora: t,
    assinatura: sha(procId + tipo + t.toISOString() + rand()),
    ip: '45.170.' + ri(16, 31) + '.' + ri(2, 250),
  }, extra));

  push('abertura', { origem_usuario: criador, origem_setor: origSetor.id, despacho: `Processo aberto por ${criador.nome}` });

  let curSetorId = origSetor.id, curUser = criador;
  const hopInfo = [];
  for (let i = 0; i < spec.hops; i++) {
    const destKey = spec.route[i];
    const dest = ctx.set[destKey];
    t = comercial(addH(t, ri(5, 70)));
    push('tramite', { origem_usuario: curUser, origem_setor: curSetorId, destino_setor: dest.id, despacho: spec.despachos && spec.despachos[i] ? spec.despachos[i] : txtTramite(destKey) });
    const recebedor = (ctx.userBySetor[destKey] || [ctx.u.admin])[0];
    t = comercial(addH(t, ri(1, 8)));
    push('recebimento', { origem_usuario: recebedor, origem_setor: dest.id, despacho: `Processo recebido por ${recebedor.nome}` });
    hopInfo.push({ key: destKey, tramite: trs[trs.length - 2].data_hora, recebido: t, user: recebedor });
    curSetorId = dest.id; curUser = recebedor;
  }

  let status = spec.final, dataConclusao = null, usuarioAtual = curUser, setorAtual = curSetorId;
  if (spec.final === 'concluido' || spec.final === 'arquivado') {
    t = comercial(addH(t, ri(4, 48)));
    push('conclusao', { origem_usuario: curUser, origem_setor: curSetorId, despacho: spec.txtConclusao || pick(TXT_CONCLUSAO) });
    dataConclusao = t;
    if (spec.final === 'arquivado') {
      t = comercial(addH(t, ri(24, 120)));
      push('arquivamento', { origem_usuario: curUser, origem_setor: curSetorId, despacho: 'Processo arquivado após conclusão das providências.' });
    }
  } else if (spec.final === 'devolvido') {
    t = comercial(addH(t, ri(4, 30)));
    push('devolucao', { origem_usuario: curUser, origem_setor: curSetorId, destino_setor: origSetor.id,
      despacho: 'Devolvo o processo ao setor de origem para regularização.',
      justificativa: spec.justificativa || 'Documentação incompleta. Regularizar e reenviar.' });
    setorAtual = origSetor.id; usuarioAtual = criador;
  }
  if (spec.final === 'aberto') { setorAtual = origSetor.id; usuarioAtual = criador; }

  return { procId, criador, origSetor, t0, tFim: t, trs, hopInfo, status, dataConclusao, setorAtual, usuarioAtualId: usuarioAtual.id };
};

/**
 * DID percorrendo o fluxo por etapas, como no sistema: cada etapa é tramitada ao
 * setor dela, recebida e concluída (tramitação "did_etapa", assinada na fase 2).
 * registros = dids.etapas ({ [etapaId]: { status, nome, cargo, …, tramitacao_id } })
 */
const simulaDid = (ctx, spec, etapas, numeroDid) => {
  const criador = ctx.u[spec.criadorKey];
  const origSetor = ctx.set[criador.setorKey];
  let t = comercial(mk(2026, spec.open[0], spec.open[1], ri(8, 15)));
  const t0 = t;
  const trs = [];
  const procId = uuid();
  const push = (tipo, extra) => {
    const tr = Object.assign({
      id: uuid(), processo_id: procId, tipo_acao: tipo, data_hora: t,
      assinatura: sha(procId + tipo + t.toISOString() + rand()),
      ip: '45.170.' + ri(16, 31) + '.' + ri(2, 250),
    }, extra);
    trs.push(tr);
    return tr;
  };
  const registros = {};
  const info = {}; // etapaId → { user, recebido, concluido }

  push('abertura', { origem_usuario: criador, origem_setor: origSetor.id, despacho: `Processo aberto por ${criador.nome}` });

  const concluir = (e, user, setor) => {
    t = comercial(addH(t, ri(1, 6)));
    const tr = push('did_etapa', {
      origem_usuario: user, origem_setor: setor.id, destino_setor: setor.id,
      despacho: `DID ${numeroDid} — ${e.titulo} concluída por ${user.nome}${user.cargo ? ` (${user.cargo})` : ''}`,
    });
    registros[e.id] = {
      status: 'concluida', usuario_id: user.id, nome: user.nome, cargo: user.cargo || null,
      setor_id: setor.id, setor: setor.nome, secretaria: ctx.sec[setor.secKey].sigla,
      concluida_em: t.toISOString(), tramitacao_id: tr.id, assinatura: null,
    };
    info[e.id].concluido = t;
  };
  const tramitarPara = (e, deUser, deSetorId, receber = true) => {
    const dest = ctx.set[e.setKey];
    t = comercial(addH(t, ri(5, 50)));
    push('tramite', { origem_usuario: deUser, origem_setor: deSetorId, destino_setor: dest.id, despacho: txtTramite(e.setKey) });
    if (!receber) return { dest, recebedor: null };
    const recebedor = (ctx.userBySetor[e.setKey] || [ctx.u.admin])[0];
    t = comercial(addH(t, ri(1, 8)));
    push('recebimento', { origem_usuario: recebedor, origem_setor: dest.id, destino_setor: dest.id, destino_usuario: recebedor.id, despacho: `Processo recebido por ${recebedor.nome}` });
    info[e.id] = { user: recebedor, recebido: t };
    return { dest, recebedor };
  };

  // Abertura: quem abriu conclui a Seção I
  info[etapas[0].id] = { user: criador, recebido: t };
  concluir(etapas[0], criador, origSetor);
  let curUser = criador, curSetorId = origSetor.id;
  for (let i = 1; i < spec.concl; i++) {
    const { dest, recebedor } = tramitarPara(etapas[i], curUser, curSetorId);
    concluir(etapas[i], recebedor, dest);
    curUser = recebedor; curSetorId = dest.id;
  }

  let status, setorAtual = curSetorId, usuarioAtual = curUser.id, dataConclusao = null;
  const proxima = etapas[spec.concl];
  if (spec.final === 'devolvido') {
    // A etapa seguinte recebe, confere e devolve à anterior (justificativa assinada)
    const anterior = etapas[spec.concl - 1];
    const { dest, recebedor } = tramitarPara(proxima, curUser, curSetorId);
    delete info[proxima.id];
    t = comercial(addH(t, ri(2, 20)));
    const regAnt = registros[anterior.id];
    const justificativa = DEVOLUCOES[spec.key] || 'Documentação incompleta. Regularizar e reenviar.';
    const tr = push('devolucao', {
      origem_usuario: recebedor, origem_setor: dest.id, destino_setor: regAnt.setor_id, destino_usuario: regAnt.usuario_id,
      despacho: `DID ${numeroDid} — ${proxima.titulo} devolveu para a ${anterior.titulo}`, justificativa,
    });
    registros[anterior.id] = {
      ...regAnt, status: 'devolvida',
      devolucao: { por: recebedor.nome, por_id: recebedor.id, etapa: proxima.titulo, justificativa, em: t.toISOString(), tramitacao_id: tr.id },
    };
    status = 'devolvido'; setorAtual = regAnt.setor_id; usuarioAtual = regAnt.usuario_id;
  } else if (spec.final === 'aberto') {
    status = 'aberto';
  } else if (proxima) {
    const { dest, recebedor } = tramitarPara(proxima, curUser, curSetorId, !spec.naoRecebido);
    setorAtual = dest.id;
    usuarioAtual = recebedor ? recebedor.id : null;
    status = 'em_analise';
  } else {
    t = comercial(addH(t, ri(4, 48)));
    push('conclusao', { origem_usuario: curUser, origem_setor: curSetorId, despacho: 'Todas as etapas do DID concluídas e assinadas. Pagamento efetuado e processo concluído.' });
    dataConclusao = t;
    status = 'concluido';
    if (spec.final === 'arquivado') {
      t = comercial(addH(t, ri(24, 120)));
      push('arquivamento', { origem_usuario: curUser, origem_setor: curSetorId, despacho: 'Processo arquivado após conclusão das providências.' });
      status = 'arquivado';
    }
  }

  return { procId, criador, origSetor, t0, tFim: t, trs, hopInfo: [], status, dataConclusao, setorAtual, usuarioAtualId: usuarioAtual, registros, info };
};

// Campos preenchidos por cada bloco ao ser concluído
const preencherBloco = (ctx, bloco, did, d, i, seqs) => {
  const credor = ctx.credor[d.credorKey];
  const ctr = ctx.contrato[d.ctrN];
  const dataRec = i.recebido ? fmtD(i.recebido) : null;
  const dataFim = fmtD(i.concluido);
  const nome = i.user.nome;
  switch (bloco) {
    case 'controle_interno':
      return { ci_recebido_em: dataRec, ci_responsavel: nome,
        despacho_ci: 'Despesa regular, com cobertura contratual e dotação orçamentária indicada. Prossiga-se.',
        dotacao_numero: `02.${String(ri(1, 12)).padStart(2, '0')}.00 3.3.90.${ri(30, 39)}`, fonte_recurso_numero: '1500' };
    case 'financas_autorizacao':
      return { financas_recebido_em: dataRec, financas_responsavel: nome };
    case 'compras_solicitacao':
      return { compras2_recebido_em: dataRec, compras2_responsavel: nome, compras2_ja_licitado: true, compras2_nro_licitacao: ctr.licit,
        compras2_realizar_cotacao: false, compras2_modalidade: ctr.modalidade, compras2_data: dataFim, compras2_responsavel_compras: nome,
        compras2_nro_empenho_solicitacao: `SE-${String(seqs.se++).padStart(3, '0')}/2026` };
    case 'contab_empenho':
      return { contabil_recebido_em: dataRec, contabil_responsavel: nome, credor: credor.razao, cnpj_cpf_credor: credor.doc,
        contabil_auditor: 'Solange Meireles Pontes', contabil_empenhado: 'sim',
        empenho_numero: `NE-${String(seqs.ne).padStart(4, '0')}/2026`, tipo_empenho: 'Ordinário', data_empenho: dataFim };
    case 'contab_empenho_liquidacao':
      return { contabil_recebido_em: dataRec, contabil_responsavel: nome, credor: credor.razao, cnpj_cpf_credor: credor.doc,
        nf_numero: String(ri(100000, 999999)), nf_valor: d.valor,
        cert_cnd_federal: true, cert_fgts: true, cert_tst: true, cert_municipal: true, cert_estadual: true,
        contabil_auditor: 'Solange Meireles Pontes', contabil_empenhado: 'sim',
        empenho_numero: `NE-${String(seqs.ne).padStart(4, '0')}/2026`, tipo_empenho: 'Ordinário', data_empenho: dataFim,
        contabil_liquidado: 'sim', liquidacao_numero: `LIQ-${String(seqs.liq++).padStart(4, '0')}/2026`, data_liquidacao: dataFim,
        doc_caixa: `DC-${seqs.dc++}` };
    case 'compras_ordem':
      return { compras_recebido_em: dataRec, compras_responsavel: nome, ja_licitado: true, nro_licitacao: ctr.licit, realizar_cotacao: false,
        modalidade: ctr.modalidade, data_compras: dataFim, responsavel_compras: nome,
        nro_empenho_solicitacao: d.ordemKey ? ctx.ordem[d.ordemKey].numero : `OC-${seqs.se++}/2026`,
        local_entrega: 'Almoxarifado Central – Rua Cel. Diogo Gomes, 55' };
    case 'almox_recebimento':
      return { receb_ordem_recebida: 'sim', receb_data: dataFim, receb_nf_data: dataRec, receb_responsavel: nome, receb_cargo: 'Almoxarife – mat. 1187',
        receb_nf_conferida: true, receb_qtd_conferida: true, receb_esp_conforme: true,
        receb_obs: 'Materiais recebidos e conferidos sem divergências.', receb_nf_enviado_compras: dataFim,
        nf_numero: String(ri(100000, 999999)), nf_valor: d.valor };
    case 'compras_ateste':
      return { compras3_recebido_em: dataRec, compras3_responsavel: nome, compras3_local_entrega: dataFim };
    case 'contab_liquidacao':
      return { contabil_pc_recebido_em: dataRec, contabil_pc_responsavel: nome, contabil_pc_auditor: 'Solange Meireles Pontes',
        contabil_pc_empenho_numero: did.empenho_numero || null, contabil_pc_tipo_empenho: 'Ordinário', contabil_pc_data_empenho: did.data_empenho || null,
        contabil_pc_liquidado: 'sim', contabil_pc_liquidacao_numero: `LIQ-${String(seqs.liq++).padStart(4, '0')}/2026`,
        contabil_pc_data_liquidacao: dataFim, contabil_pc_doc_caixa: `DC-${seqs.dc}` };
    case 'financas_pagamento':
      return { financas2_recebido_em: dataRec, financas2_responsavel: nome, financas2_enviado_pagamento: dataFim };
    case 'tesouraria':
      return { ...tesourariaFill(ctx, credor, d.valor, dataRec, seqs.dc++), tesouraria_responsavel: nome, data_pagamento: dataFim,
        desconto_inss: 0, desconto_outros: 0, cert_teso_federal: true, cert_teso_simples_nac: rand() < 0.4 };
    case 'fechamento':
      return { contab_fech_finalizado: 'sim', contab_fech_tce: 'sim' };
    default:
      return {};
  }
};

// ── Monta tudo ───────────────────────────────────────────────────────────────
const build = (ctx) => {
  const specs = [];

  for (const [key, criadorKey, credorKey, ctrN, objeto, mesRef, valor, concl, final, open, prioridade, opts = {}] of DIDS_FIXAS) {
    specs.push({
      key, tipoProcesso: 'Did', criadorKey, open, final, prioridade, concl, naoRecebido: !!opts.naoRecebido,
      assunto: `${objeto} – ${mesRef}`,
      descricao: `Documento de Instrução de Despesa (contas fixas) referente a ${objeto.toLowerCase()}, competência ${mesRef}, credor ${ctx.credor[credorKey].razao}, no valor de R$ ${valor.toFixed(2).replace('.', ',')}. Contrato nº ${ctx.contrato[ctrN].numero}.`,
      interessado: [ctx.credor[credorKey].razao, soDigitos(ctx.credor[credorKey].doc).slice(0, 14)],
      did: { key, tipo: 'fixas', versao: opts.v2 ? 2 : 1, credorKey, ctrN, objeto, mesRef, valor },
    });
  }
  for (const [key, criadorKey, ordemKey, concl, final, open, prioridade, opts = {}] of DIDS_VARIAVEIS) {
    const ordem = ctx.ordem[ordemKey];
    const ctr = ctx.contrato[ordem.contratoN];
    specs.push({
      key, tipoProcesso: 'Did', criadorKey, open, final, prioridade, concl, naoRecebido: !!opts.naoRecebido,
      assunto: ordem.objeto,
      descricao: `Documento de Instrução de Despesa (contas variáveis) vinculado à ${ordem.numero} do Contrato nº ${ctr.numero} – ${ctx.credor[ordem.credorKey].razao}. Valor: R$ ${ordem.total.toFixed(2).replace('.', ',')}.`,
      interessado: [ctx.credor[ordem.credorKey].razao, soDigitos(ctx.credor[ordem.credorKey].doc).slice(0, 14)],
      did: { key, tipo: 'variaveis', versao: 1, credorKey: ordem.credorKey, ctrN: ordem.contratoN, ordemKey, objeto: ordem.objeto, valor: ordem.total },
    });
  }
  for (const [key, criadorKey, route, hops, final, open, assunto, doc] of DESPACHOS) {
    specs.push({
      key, tipoProcesso: 'Despacho', criadorKey, open, final, prioridade: 'normal', route, hops, assunto,
      descricao: `Elaboração, assinatura e encaminhamento do documento oficial: ${assunto}.`,
      interessado: null, doc,
    });
  }
  for (const [key, criadorKey, assunto, final, open] of REQUISICOES) {
    specs.push({
      key, tipoProcesso: 'Requisição', criadorKey, open, final, prioridade: 'normal',
      route: ['ALMOX'], hops: final === 'aberto' ? 0 : 1, assunto,
      descricao: `${assunto}, para atendimento pelo Almoxarifado Central conforme disponibilidade de estoque e cota mensal do setor.`,
      interessado: null,
    });
  }
  for (const [key, criadorKey, assunto, final, open] of PAUTAS) {
    specs.push({
      key, tipoProcesso: 'Pauta', criadorKey, open, final, prioridade: 'normal',
      route: ['AJUR', 'GAB'], hops: final === 'aberto' ? 0 : (final === 'em_analise' ? 1 : 2), assunto,
      descricao: `${assunto}. Encaminhamento para parecer jurídico e homologação do resultado pela autoridade competente.`,
      interessado: null,
    });
  }
  for (const [key, criadorKey, route, assunto, interessadoNome, final, open, prioridade] of GERAIS) {
    specs.push({
      key, tipoProcesso: 'Geral', criadorKey, open, final, prioridade, route,
      hops: final === 'aberto' ? 0 : route.length,
      assunto,
      descricao: `${assunto}. Processo protocolado a pedido de ${interessadoNome}, para análise e providências do setor competente.`,
      interessado: [interessadoNome, cpf()],
      justificativa: final === 'devolvido' ? 'Ausência do termo de anuência do proprietário da área e da relação de animais. Complementar a documentação.' : null,
    });
  }

  // ordena por data de abertura e simula
  specs.sort((a, b) => (a.open[0] * 100 + a.open[1]) - (b.open[0] * 100 + b.open[1]));
  ctx.procRows = []; ctx.tramRows = []; ctx.didRows = []; ctx.finRows = []; ctx.logRows = [];
  ctx.processos = {};
  const didSeqPorSec = {};
  let seq = 0, neSeq = 400, seSeq = 40, liqSeq = 118, docCaixaSeq = 2040;

  const logPush = (user, acao, modulo, descricao, refId, refNum, when) => {
    ctx.logRows.push([uuid(), user.id, acao, modulo, descricao, refId ? String(refId) : null, refNum || null,
      user.secretariaId || null, user.setorId || null, '45.170.' + ri(16, 31) + '.' + ri(2, 250),
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126', null, fmtTs(when)]);
  };

  for (const spec of specs) {
    let etapasDid = null, numeroDid = null;
    if (spec.did) {
      const secCriador = ctx.sec[ctx.u[spec.criadorKey].secKey];
      didSeqPorSec[secCriador.nome] = (didSeqPorSec[secCriador.nome] || 0) + 1;
      numeroDid = `${secCriador.sigla}-${String(didSeqPorSec[secCriador.nome]).padStart(3, '0')}`;
      etapasDid = fluxos.etapasDe(spec.did.tipo, spec.did.versao);
    }
    const sim = spec.did ? simulaDid(ctx, spec, etapasDid, numeroDid) : simula(ctx, spec);
    seq += 1;
    const sigla = ctx.sec[sim.criador.secKey].sigla;
    const numero = `Proc.2026.${String(seq).padStart(7, '0')} - ${sigla}`;
    ctx.processos[spec.key] = { id: sim.procId, numero, spec, sim };

    ctx.procRows.push({
      id: sim.procId, numero, ano: 2026, sequencial: seq, assunto: spec.assunto, descricao: spec.descricao,
      interessado_nome: spec.interessado ? spec.interessado[0] : null,
      interessado_cpf_cnpj: spec.interessado ? spec.interessado[1] : null,
      status: sim.status, setor_atual_id: sim.setorAtual, usuario_atual_id: sim.usuarioAtualId,
      prioridade: spec.prioridade, data_abertura: fmtTs(sim.t0),
      data_conclusao: sim.dataConclusao ? fmtTs(sim.dataConclusao) : null,
      criado_por_id: sim.criador.id, tipo_processo: spec.tipoProcesso,
      despacho_doc: spec.doc ? JSON.stringify(Object.assign({
        tipo_despacho: '', numero: '', ementa: '', referencia: '', titulo_outro: '', para: '',
        cargo_emissor: sim.criador.cargo, portaria_nomeacao: '', setor_emissor: sim.origSetor.nome,
        secretaria_emissora: ctx.sec[sim.criador.secKey].nome, data_despacho: fmtD(sim.t0),
        assunto: spec.assunto, nome_assinante: sim.criador.nome,
      }, spec.doc)) : null,
      created_at: fmtTs(sim.t0), updated_at: fmtTs(sim.tFim),
    });

    for (const tr of sim.trs) {
      ctx.tramRows.push([tr.id, tr.processo_id, tr.origem_usuario.id, tr.origem_setor || null, tr.destino_setor || null,
        tr.destino_usuario || null, tr.tipo_acao, tr.despacho || null, tr.justificativa || null,
        tr.assinatura, fmtTs(tr.data_hora), tr.ip, fmtTs(tr.data_hora), fmtTs(tr.data_hora)]);
    }

    // Logs de processo
    logPush(sim.criador, 'criar_processo', 'processos', `Processo ${numero} criado — assunto: ${spec.assunto}`, sim.procId, numero, sim.t0);
    for (const tr of sim.trs) {
      if (tr.tipo_acao === 'tramite') logPush(tr.origem_usuario, 'tramitar_processo', 'processos', `Processo ${numero} tramitado`, sim.procId, numero, tr.data_hora);
      if (tr.tipo_acao === 'conclusao') logPush(tr.origem_usuario, 'concluir_processo', 'processos', `Processo ${numero} concluído`, sim.procId, numero, tr.data_hora);
      if (tr.tipo_acao === 'did_etapa') logPush(tr.origem_usuario, 'concluir_etapa_did', 'did', tr.despacho, sim.procId, numero, tr.data_hora);
      if (tr.tipo_acao === 'devolucao') logPush(tr.origem_usuario, 'devolver_processo', 'processos', `Processo ${numero} devolvido ao setor de origem`, sim.procId, numero, tr.data_hora);
    }

    // ── DID (fluxo por etapas) ──
    if (spec.did) {
      const d = spec.did;
      const credor = ctx.credor[d.credorKey];
      const ctr = ctx.contrato[d.ctrN];
      const secNome = ctx.sec[sim.criador.secKey].nome;
      const concluidas = etapasDid.filter(e => sim.registros[e.id]?.status === 'concluida');
      const tudoConcluido = concluidas.length === etapasDid.length;
      const pago = sim.registros.tesouraria?.status === 'concluida';

      const did = {
        id: uuid(), processo_id: sim.procId, numero_did: numeroDid, tipo_did: d.tipo,
        objeto: `${d.objeto}${d.mesRef ? ' – ' + d.mesRef : ''}`, data_did: fmtD(sim.t0),
        secretario_nome: ctx.secretarioDe[sim.criador.secKey].nome, secretaria_sec1: secNome,
        fonte_recurso: { SESAU: 'FMS', SEDUC: 'FUNDEB/PNAE', SEMAS: 'FMAS' }[sim.criador.secKey] || 'PRÓPRIO',
        detalhes_em_anexo: false, contrato_ref: `Contrato nº ${ctr.numero}`,
        credor_sec1: credor.razao, cnpj_cpf_credor_sec1: credor.doc,
        nro_licitacao_sec1: ctr.licit, tipo_licitacao_sec1: ctr.modalidade,
        mes_referencia: d.mesRef || null, nf_sec1: d.tipo === 'fixas' ? String(ri(100000, 999999)) : null,
        cert_sec1_municipal: true, cert_sec1_trabalhista: true, cert_sec1_fgts: spec.final !== 'devolvido',
        cert_sec1_estadual: true, cert_sec1_federal: true, cert_sec1_simples_nac: rand() < 0.4,
        valor_did: d.valor,
        itens_did: JSON.stringify(d.ordemKey
          ? ctx.ordem[d.ordemKey].itens.slice(0, 3).map((it, i) => ({ _id: i, descricao: it.descricao, quantidade: String(it.qtd), valor_unitario: String(it.vu), valor_total: String(it.vt) }))
          : [{ _id: 0, descricao: d.objeto, quantidade: '1', valor_unitario: String(d.valor), valor_total: String(d.valor) }]),
        ...(d.ordemKey ? { ordem_compra_id: ctx.ordem[d.ordemKey].id, ordem_ref: ctx.ordem[d.ordemKey].numero } : {}),
        status: tudoConcluido ? 'finalizado' : 'rascunho', criado_por_id: sim.criador.id,
        created_at: fmtTs(sim.t0), updated_at: fmtTs(sim.tFim),
      };

      // Campos de cada etapa concluída (ou devolvida: os dados continuam lá)
      const seqs = { se: seSeq, ne: neSeq, liq: liqSeq, dc: docCaixaSeq };
      const etapasDados = {};
      for (const e of etapasDid) {
        const reg = sim.registros[e.id];
        if (!reg || e.bloco === 'abertura') continue;
        if (e.bloco === 'personalizada') {
          etapasDados[e.id] = {
            c_parecer: `Analisados os autos, verifica-se a regularidade formal da despesa: contrato vigente (Contrato nº ${ctr.numero}), certidões de regularidade dentro da validade e nota fiscal devidamente atestada. Opina-se pelo prosseguimento do feito.`,
            c_regular: 'sim',
            c_docs: { 0: true, 1: true, 2: true },
            c_numero: `PJ ${String(ri(40, 90)).padStart(3, '0')}/2026`,
          };
          continue;
        }
        Object.assign(did, preencherBloco(ctx, e.bloco, did, d, sim.info[e.id], seqs));
      }
      seSeq = seqs.se; liqSeq = seqs.liq; docCaixaSeq = seqs.dc;

      did.fluxo = JSON.stringify(fluxos.fotoDoFluxo(ctx, d.tipo, d.versao));
      did.etapas = JSON.stringify(sim.registros);
      did.etapas_dados = JSON.stringify(etapasDados);
      ctx.didRows.push(did);
      ctx.didsPorChave = ctx.didsPorChave || {};
      ctx.didsPorChave[spec.key] = { id: did.id, processoId: sim.procId, numero: numeroDid };

      // lançamento financeiro do empenho
      if (did.empenho_numero) {
        const dataEmp = did.data_empenho || fmtD(sim.tFim);
        ctx.finRows.push([uuid(), 'despesa', d.tipo === 'fixas' ? 'DID – Contas Fixas' : 'DID – Contas Variáveis',
          `${did.objeto} (${credor.razao})`, d.valor, dataEmp, ctx.sec[sim.criador.secKey].id, sim.procId,
          did.dotacao_numero || null, did.empenho_numero, pago ? 'pago' : 'pendente', null, ctx.u.contadora.id,
          fmtTs(sim.tFim), fmtTs(sim.tFim)]);
      }
      neSeq += 1;
    }
  }

  // Lançamentos financeiros avulsos (folha, encargos etc.)
  const avulsos = [
    ['Folha de pagamento – competência maio/2026', 1487320.54, '2026-05-30', 'SEMAD', 'pago'],
    ['Folha de pagamento – competência junho/2026', 1512480.11, '2026-06-30', 'SEMAD', 'pago'],
    ['INSS patronal – competência maio/2026', 312450.87, '2026-06-18', 'SEFIN', 'pago'],
    ['INSS patronal – competência junho/2026', 318220.45, '2026-07-17', 'SEFIN', 'pendente'],
    ['PASEP sobre receitas – junho/2026', 28740.22, '2026-07-10', 'SEFIN', 'pago'],
    ['Diárias – deslocamentos administrativos junho/2026', 8420.00, '2026-06-28', 'GABIP', 'pago'],
    ['Contribuição consórcio de saúde – 1º semestre', 96000.00, '2026-06-15', 'SESAU', 'pago'],
    ['Repasse ao FUNDEB – complementação municipal', 184300.00, '2026-06-25', 'SEDUC', 'pago'],
    ['Amortização de precatórios – parcela 2026', 145000.00, '2026-05-28', 'SEFIN', 'pago'],
    ['Devolução de convênio não executado – SICONV 889912', 12480.36, '2026-06-30', 'SEMAS', 'pendente'],
  ];
  for (const [descr, valor, data, secSigla, st] of avulsos) {
    ctx.finRows.push([uuid(), 'despesa', 'Execução Orçamentária', descr, valor, data, ctx.sec[secSigla].id, null,
      null, null, st, null, ctx.u.contadora.id, fmtTs(mk(+data.slice(5, 7) === 5 ? 2026 : 2026, +data.slice(5, 7), +data.slice(8, 10), 14)), fmtTs(mk(2026, +data.slice(5, 7), +data.slice(8, 10), 14))]);
  }
  ctx.finCols = ['id', 'tipo', 'categoria', 'descricao', 'valor', 'data_lancamento', 'secretaria_id', 'processo_id', 'dotacao', 'empenho', 'status', 'observacoes', 'usuario_id', 'created_at', 'updated_at'];

  // Logs de outros módulos
  for (const key of Object.keys(ctx.contrato)) {
    const c = ctx.contrato[key];
    ctx.logRows.push([uuid(), ctx.u.compras.id, 'criar_contrato', 'contratos', `Cadastrou o contrato ${c.numero} — ${c.objeto.slice(0, 80)}`,
      String(c.id), c.numero, ctx.u.compras.secretariaId, ctx.u.compras.setorId, '45.170.18.44', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126', null, fmtTs(mk(2026, 1, ri(20, 28), ri(9, 16)))]);
  }
  for (const key of Object.keys(ctx.ordem)) {
    const o = ctx.ordem[key];
    ctx.logRows.push([uuid(), ctx.u.compras.id, 'criar_ordem', 'contratos', `Fez uma ordem de ${o.tipo === 'COMPRA' ? 'compra' : 'serviço'} (${o.numero}) — contrato ${ctx.contrato[o.contratoN].numero}`,
      String(o.id), o.numero, ctx.u.compras.secretariaId, ctx.u.compras.setorId, '45.170.18.44', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126', null, fmtTs(mk(2026, +o.dataEm.slice(5, 7), +o.dataEm.slice(8, 10), ri(9, 16)))]);
  }
  // logins simulados
  const allUsers = Object.values(ctx.u);
  for (let i = 0; i < 70; i++) {
    const u = pick(allUsers);
    const dt = mk(2026, ri(6, 7), ri(1, 16), ri(7, 18));
    ctx.logRows.push([uuid(), u.id, 'login', 'sessao', 'Login realizado com sucesso', null, null,
      u.secretariaId || null, u.setorId || null, '45.170.' + ri(16, 31) + '.' + ri(2, 250),
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126', null, fmtTs(dt)]);
  }
  ctx.logCols = ['id', 'usuario_id', 'acao', 'modulo', 'descricao', 'referencia_id', 'referencia_numero', 'secretaria_id', 'setor_id', 'ip', 'user_agent', 'dados_extras', 'created_at'];

  ctx.tramCols = ['id', 'processo_id', 'origem_usuario_id', 'origem_setor_id', 'destino_setor_id', 'destino_usuario_id',
    'tipo_acao', 'despacho', 'justificativa_devolucao', 'assinatura_digital', 'data_hora', 'ip_origem', 'created_at', 'updated_at'];
};

const tesourariaFill = (ctx, credor, valor, dataStr, docSeq) => {
  const iss = money(valor * 0.03), irrf = money(valor * 0.012);
  return {
    pago: 'sim', tesouraria_recebido_em: dataStr, tesouraria_responsavel: ctx.u.tesoureiro.nome,
    banco_pagador: 'Banco do Brasil', ag_pagador: '1234-5', cc_pagador: '58.740-2',
    cnpj_fornecedor: credor.doc, banco_fornecedor: pick(['Banco do Brasil', 'Caixa Econômica', 'Bradesco', 'Itaú']),
    ag_fornecedor: String(ri(100, 4999)), cc_fornecedor: `${ri(1000, 99999)}-${ri(0, 9)}`,
    cert_teso_cnd: true, cert_teso_fgts: true, cert_teso_estadual: true, cert_teso_trabalhista: true, cert_teso_municipal: true,
    analisado_por: ctx.u.tesoureiro.nome, valor_bruto: valor,
    desconto_iss: iss, desconto_irrf: irrf, doc_caixa: `DC-${docSeq}`,
    conta_pagamento_id: ctx.contas[23].id,
  };
};

module.exports = { build };
