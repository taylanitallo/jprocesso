// Almoxarifado (itens, lotes, movimentações, requisições, cotas, inventários)
// e Patrimônio (bens, responsabilidades, movimentações, baixas, inventários)
const { uuid, sha, ri, pick, money, rand, mk, addH, addD, fmtTs, fmtD } = require('./util');

// [key, nome, unidade, categoria, valorUnit, estoqueMin, tipoItem]
const ALMOX_ITENS_DEF = [
  ['papel_a4',    'Papel A4 75g (resma 500 fls)',        'RESMA', 'EXPEDIENTE',      24.90, 40,  'CONSUMO'],
  ['caneta_azul', 'Caneta esferográfica azul',           'UN',    'EXPEDIENTE',      1.35,  100, 'CONSUMO'],
  ['caneta_preta','Caneta esferográfica preta',          'UN',    'EXPEDIENTE',      1.35,  60,  'CONSUMO'],
  ['lapis',       'Lápis grafite nº 2',                  'UN',    'EXPEDIENTE',      0.75,  50,  'CONSUMO'],
  ['borracha',    'Borracha branca escolar',             'UN',    'EXPEDIENTE',      0.90,  30,  'CONSUMO'],
  ['grampeador',  'Grampeador de mesa 26/6',             'UN',    'EXPEDIENTE',      28.50, 5,   'CONSUMO'],
  ['grampo',      'Grampo 26/6 (cx 5000)',               'CX',    'EXPEDIENTE',      6.20,  20,  'CONSUMO'],
  ['clips',       'Clips 2/0 (cx 100)',                  'CX',    'EXPEDIENTE',      3.80,  20,  'CONSUMO'],
  ['pasta_az',    'Pasta AZ lombo largo',                'UN',    'EXPEDIENTE',      12.40, 20,  'CONSUMO'],
  ['envelope',    'Envelope ofício pardo',               'UN',    'EXPEDIENTE',      0.45,  200, 'CONSUMO'],
  ['corretivo',   'Fita corretiva',                      'UN',    'EXPEDIENTE',      4.10,  15,  'CONSUMO'],
  ['marcador',    'Marcador de texto amarelo',           'UN',    'EXPEDIENTE',      2.60,  25,  'CONSUMO'],
  ['agua_sanit',  'Água sanitária 1L',                   'UN',    'LIMPEZA',         3.20,  60,  'CONSUMO'],
  ['detergente',  'Detergente neutro 500ml',             'UN',    'LIMPEZA',         2.10,  60,  'CONSUMO'],
  ['desinfet',    'Desinfetante 2L eucalipto',           'UN',    'LIMPEZA',         6.90,  40,  'CONSUMO'],
  ['vassoura',    'Vassoura de nylon',                   'UN',    'LIMPEZA',         9.80,  15,  'CONSUMO'],
  ['rodo',        'Rodo 40cm',                           'UN',    'LIMPEZA',         8.50,  15,  'CONSUMO'],
  ['pano_chao',   'Pano de chão saco alvejado',          'UN',    'LIMPEZA',         5.40,  40,  'CONSUMO'],
  ['sabao_po',    'Sabão em pó 1kg',                     'UN',    'LIMPEZA',         8.90,  30,  'CONSUMO'],
  ['luva_borr',   'Luva de borracha M',                  'PAR',   'LIMPEZA',         6.30,  20,  'CONSUMO'],
  ['saco_lixo',   'Saco de lixo 100L (pct 100)',         'PCT',   'LIMPEZA',         38.00, 15,  'CONSUMO'],
  ['alcool70',    'Álcool 70% 1L',                       'UN',    'LIMPEZA',         7.80,  50,  'CONSUMO'],
  ['cafe',        'Café torrado e moído 250g',           'PCT',   'COPA E COZINHA',  7.90,  60,  'CONSUMO'],
  ['acucar',      'Açúcar cristal 1kg',                  'KG',    'COPA E COZINHA',  4.60,  40,  'CONSUMO'],
  ['copo180',     'Copo descartável 180ml (cx 2500)',    'CX',    'COPA E COZINHA',  98.00, 8,   'CONSUMO'],
  ['agua20l',     'Água mineral garrafão 20L',           'GL',    'COPA E COZINHA',  12.00, 30,  'CONSUMO'],
  ['toner85a',    'Toner HP 85A',                        'UN',    'INFORMÁTICA',     89.90, 10,  'CONSUMO'],
  ['mouse',       'Mouse óptico USB',                    'UN',    'INFORMÁTICA',     25.90, 10,  'CONSUMO'],
  ['teclado',     'Teclado USB ABNT2',                   'UN',    'INFORMÁTICA',     45.00, 10,  'CONSUMO'],
  ['pendrive',    'Pen drive 32GB',                      'UN',    'INFORMÁTICA',     32.50, 8,   'CONSUMO'],
  ['pilha_aa',    'Pilha alcalina AA (par)',             'PAR',   'ELÉTRICO',        9.90,  20,  'CONSUMO'],
  ['lamp_led',    'Lâmpada LED bulbo 12W',               'UN',    'ELÉTRICO',        11.90, 30,  'CONSUMO'],
  ['cadeado',     'Cadeado 40mm',                        'UN',    'OUTROS',          21.00, 6,   'CONSUMO'],
  ['bebedouro',   'Bebedouro coluna branco',             'UN',    'OUTROS',          620.00, 2,  'CAPITAL'],
];

// Patrimônio: [descricao, grupoCod, marca, modelo, valor, secSigla, setorKey, salaLocal, estado, placa|null]
const PAT_BENS_DEF = [
  ['Microcomputador desktop i5 8GB/256GB', '02', 'Dell',      'OptiPlex 3090',  3890.00, 'SEMAD',   'PROTO',   'Recepção do Protocolo', 'OTIMO', null],
  ['Microcomputador desktop i5 8GB/256GB', '02', 'Dell',      'OptiPlex 3090',  3890.00, 'SEMAD',   'COMPRAS', 'Sala de Licitações', 'OTIMO', null],
  ['Microcomputador desktop i5 8GB/256GB', '02', 'Dell',      'OptiPlex 3090',  3890.00, 'SEFIN',   'CONTAB',  'Contabilidade', 'OTIMO', null],
  ['Microcomputador desktop i5 8GB/256GB', '02', 'Dell',      'OptiPlex 3090',  3890.00, 'SEFIN',   'TESOUR',  'Tesouraria', 'BOM', null],
  ['Microcomputador desktop i5 8GB/256GB', '02', 'Dell',      'OptiPlex 3090',  3890.00, 'SESAU',   'GSESAU',  'Gabinete da Saúde', 'BOM', null],
  ['Microcomputador desktop i5 8GB/256GB', '02', 'Dell',      'OptiPlex 3090',  3890.00, 'SEDUC',   'GSEDUC',  'Gabinete da Educação', 'BOM', null],
  ['Notebook i7 16GB/512GB SSD',           '02', 'Lenovo',    'ThinkPad E15',   5590.00, 'GABIP',   'GAB',     'Gabinete do Prefeito', 'OTIMO', null],
  ['Notebook i7 16GB/512GB SSD',           '02', 'Lenovo',    'ThinkPad E15',   5590.00, 'CGM',     'CI',      'Controle Interno', 'OTIMO', null],
  ['Impressora multifuncional laser',      '02', 'Brother',   'DCP-L2540DW',    1850.00, 'SEMAD',   'PROTO',   'Protocolo Geral', 'BOM', null],
  ['Impressora multifuncional laser',      '02', 'Brother',   'DCP-L2540DW',    1850.00, 'SEFIN',   'CONTAB',  'Contabilidade', 'BOM', null],
  ['Impressora multifuncional laser',      '02', 'Brother',   'DCP-L2540DW',    1850.00, 'SESAU',   'ATBAS',   'Atenção Básica', 'REGULAR', null],
  ['Ar-condicionado split 12.000 BTUs',    '03', 'Samsung',   'WindFree',       2450.00, 'GABIP',   'GAB',     'Gabinete do Prefeito', 'OTIMO', null],
  ['Ar-condicionado split 12.000 BTUs',    '03', 'Samsung',   'WindFree',       2450.00, 'SEMAD',   'GSEMAD',  'Gabinete SEMAD', 'BOM', null],
  ['Ar-condicionado split 12.000 BTUs',    '03', 'Elgin',     'Eco Power',      2190.00, 'SEFIN',   'GSEFIN',  'Gabinete SEFIN', 'BOM', null],
  ['Ar-condicionado split 12.000 BTUs',    '03', 'Elgin',     'Eco Power',      2190.00, 'SEMAS',   'CRAS',    'Recepção do CRAS', 'REGULAR', null],
  ['Mesa de escritório 1,20m com gavetas', '01', 'Pandin',    'Work 1200',      689.00,  'SEMAD',   'GSEMAD',  'Gabinete SEMAD', 'BOM', null],
  ['Mesa de escritório 1,20m com gavetas', '01', 'Pandin',    'Work 1200',      689.00,  'SEFIN',   'GSEFIN',  'Gabinete SEFIN', 'BOM', null],
  ['Mesa de reunião oval 2,40m',           '01', 'Pandin',    'Reunion 2400',   1890.00, 'GABIP',   'GAB',     'Sala de Reuniões', 'OTIMO', null],
  ['Cadeira giratória presidente',         '01', 'Frisokar',  'Presidente Plus',890.00,  'GABIP',   'GAB',     'Gabinete do Prefeito', 'OTIMO', null],
  ['Cadeira giratória executiva',          '01', 'Frisokar',  'Executiva',      459.00,  'SEMAD',   'COMPRAS', 'Sala de Licitações', 'BOM', null],
  ['Cadeira giratória executiva',          '01', 'Frisokar',  'Executiva',      459.00,  'SEFIN',   'CONTAB',  'Contabilidade', 'BOM', null],
  ['Arquivo de aço 4 gavetas',             '01', 'Pandin',    'A4G',            780.00,  'SEMAD',   'ARQ',     'Arquivo Geral', 'BOM', null],
  ['Arquivo de aço 4 gavetas',             '01', 'Pandin',    'A4G',            780.00,  'SEMAD',   'RH',      'Recursos Humanos', 'REGULAR', null],
  ['Bebedouro de coluna',                  '03', 'Esmaltec',  'EGC35B',         620.00,  'SEMAD',   'PROTO',   'Recepção', 'BOM', null],
  ['Bebedouro de coluna',                  '03', 'Esmaltec',  'EGC35B',         620.00,  'SEDUC',   'GSEDUC',  'Recepção', 'BOM', null],
  ['Refrigerador 340L',                    '03', 'Consul',    'CRB39',          2350.00, 'SESAU',   'FARM',    'Farmácia Central – vacinas', 'OTIMO', null],
  ['Projetor multimídia 3.600 lumens',     '02', 'Epson',     'PowerLite X49',  3290.00, 'SEDUC',   'PEDAG',   'Sala de Formação', 'BOM', null],
  ['Televisor Smart 55"',                  '03', 'LG',        '55UQ8050',       2790.00, 'GABIP',   'ASCOM',   'Assessoria de Comunicação', 'OTIMO', null],
  ['Ambulância Fiat Fiorino adaptada',     '04', 'Fiat',      'Fiorino 1.4',    118900.00,'SESAU',  'ATBAS',   'Garagem da Saúde', 'BOM', 'FIA-2E45'],
  ['Ônibus escolar ORE 1 44 lugares',      '04', 'Mercedes',  'OF-1519 ORE',    389500.00,'SEDUC',  'TRANSP',  'Garagem da Educação', 'BOM', 'SDU-7B12'],
  ['Caminhão caçamba 6m³',                 '04', 'Ford',      'Cargo 1719',     298700.00,'SEINFRA','VIAS',    'Garagem de Obras', 'REGULAR', 'QRA-8C31'],
  ['Veículo hatch 1.0 4 portas',           '04', 'Fiat',      'Mobi Like',      68900.00, 'GABIP',  'GAB',     'Garagem da Prefeitura', 'OTIMO', 'GAB-1A23'],
  ['Caminhonete cabine dupla 4x4',         '04', 'Chevrolet', 'S10 LT 2.8',     229900.00,'SEAGRI', 'APROD',   'Garagem da Agricultura', 'BOM', 'AGR-4D56'],
  ['Motocicleta 160cc',                    '04', 'Honda',     'CG 160 Cargo',   17890.00, 'SEMMA',  'FAMB',    'Garagem – Fiscalização', 'BOM', 'AMB-9F78'],
];

const build = (ctx) => {
  const almoxUser = ctx.u.almoxarife;
  const patUser = ctx.u.patrimonio;

  // Categorias de almoxarifado
  ctx.almCatRows = ['EXPEDIENTE', 'LIMPEZA', 'COPA E COZINHA', 'INFORMÁTICA', 'ELÉTRICO', 'HIGIENE', 'EPI', 'OUTROS']
    .map((nome, i) => [uuid(), String(i + 1).padStart(3, '0'), nome, null, true, fmtTs(mk(2026, 1, 20, 10)), fmtTs(mk(2026, 1, 20, 10))]);
  ctx.almCatCols = ['id', 'codigo', 'nome', 'descricao', 'ativo', 'created_at', 'updated_at'];

  // Itens
  ctx.almox = {};
  ctx.almoxItemRows = [];
  const t0 = fmtTs(mk(2026, 2, 3, 9));
  ALMOX_ITENS_DEF.forEach(([key, nome, unid, cat, vu, minimo, tipoItem], i) => {
    const id = uuid();
    ctx.almox[key] = { id, nome, unid, cat, vu, saldo: 0, lotes: [] };
    ctx.almoxItemRows.push([id, 'MAT-' + String(i + 1).padStart(3, '0'), nome, null, unid, cat, 0, minimo, minimo * 8, vu,
      pick(['A', 'B', 'C']), String(ri(1, 5)).padStart(2, '0'), 'G' + ri(1, 4), 'Secretaria de Administração', tipoItem, money(minimo * 1.5), true, t0, t0]);
  });
  ctx.almoxItemCols = ['id', 'codigo', 'nome', 'descricao', 'unidade', 'categoria', 'estoque_atual', 'estoque_minimo', 'estoque_maximo', 'valor_unitario', 'corredor', 'prateleira', 'gaveta', 'secretaria', 'tipo_item', 'ponto_ressuprimento', 'ativo', 'created_at', 'updated_at'];

  // Lotes (uma entrada por item) + movimentações de ENTRADA
  ctx.loteRows = []; ctx.movRows = [];
  const fornecedorPorCat = {
    'EXPEDIENTE': 'Papelaria e Livraria Escolar Ltda', 'INFORMÁTICA': 'G7 Informática e Suprimentos Ltda',
    'LIMPEZA': 'Comercial de Alimentos Bom Preço Ltda', 'COPA E COZINHA': 'Comercial de Alimentos Bom Preço Ltda',
    'ELÉTRICO': 'Elétrica Luz do Sertão Materiais Ltda', 'OUTROS': 'G7 Informática e Suprimentos Ltda',
  };
  let neSeq = 200;
  Object.keys(ctx.almox).forEach((key, i) => {
    const item = ctx.almox[key];
    const loteId = uuid();
    const qtd = ri(3, 10) * (item.vu > 50 ? 5 : 40);
    const dEnt = mk(2026, ri(3, 5), ri(2, 27), ri(8, 15));
    const empenho = `NE-${String(neSeq++).padStart(4, '0')}/2026`;
    const nf = String(ri(1000, 9999));
    const forn = fornecedorPorCat[item.cat] || 'Papelaria e Livraria Escolar Ltda';
    const validade = ['COPA E COZINHA', 'LIMPEZA'].includes(item.cat) ? fmtD(addD(dEnt, ri(240, 540))) : null;
    item.lotes.push({ id: loteId, qtd, restante: qtd, dEnt });
    item.saldo += qtd;
    item.entrada = { empenho, nf, forn, dEnt };
    ctx.loteRows.push([loteId, item.id, empenho, nf, forn, fmtD(dEnt), validade, qtd, qtd, item.vu, null, almoxUser.id, true,
      key === 'papel_a4' ? '010/2026' : null, fmtTs(dEnt), fmtTs(dEnt)]);
    ctx.movRows.push([uuid(), item.id, loteId, 'ENTRADA', qtd, item.vu, money(qtd * item.vu), fmtD(dEnt),
      `NF ${nf}`, empenho, nf, forn, 'Entrada por recebimento de empenho', null, almoxUser.id, fmtTs(dEnt), fmtTs(dEnt)]);
  });
  ctx.loteCols = ['id', 'item_id', 'numero_empenho', 'numero_nf', 'fornecedor_nome', 'data_entrada', 'data_validade', 'quantidade_inicial', 'quantidade_atual', 'valor_unitario', 'observacao', 'usuario_id', 'ativo', 'numero_contrato', 'created_at', 'updated_at'];
  ctx.movCols = ['id', 'item_id', 'lote_id', 'tipo', 'quantidade', 'valor_unitario', 'valor_total', 'data_movimentacao', 'documento_referencia', 'numero_empenho', 'numero_nf', 'fornecedor_nome', 'observacao', 'requisicao_id', 'usuario_id', 'created_at', 'updated_at'];

  // Requisições — 30, em vários estágios do fluxo
  const STATUS_SEQ = ['ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'ENTREGUE',
    'AGUARDANDO_RETIRADA', 'AGUARDANDO_RETIRADA', 'EM_SEPARACAO', 'EM_SEPARACAO', 'EM_SEPARACAO', 'AUTORIZADA', 'AUTORIZADA', 'AUTORIZADA', 'AUTORIZADA',
    'PENDENTE_AUTORIZACAO', 'PENDENTE_AUTORIZACAO', 'PENDENTE_AUTORIZACAO', 'PENDENTE_AUTORIZACAO', 'PENDENTE_AUTORIZACAO',
    'RASCUNHO', 'RASCUNHO', 'CANCELADA', 'CANCELADA'];
  const setoresSolicitantes = ['GAB', 'RH', 'COMPRAS', 'CONTAB', 'TESOUR', 'CI', 'AJUR', 'GSESAU', 'ATBAS', 'FARM', 'GSEDUC', 'MEREND', 'GSEINFRA', 'CRAS', 'CREAS', 'APROD', 'FAMB', 'BIBLIO', 'PROTO', 'TRIB', 'OUV', 'TI'];
  const itensKeys = Object.keys(ctx.almox);
  ctx.reqRows = []; ctx.reqItemRows = [];
  STATUS_SEQ.forEach((status, i) => {
    const reqId = uuid();
    const numero = `REQ-2026-${String(i + 1).padStart(4, '0')}`;
    const setKey = setoresSolicitantes[i % setoresSolicitantes.length];
    const setor = ctx.set[setKey];
    const solicitante = (ctx.userBySetor[setKey] || [ctx.u.admin])[0];
    const dSol = mk(2026, ri(4, 7), ri(1, 27), ri(8, 16));
    if (dSol.getTime() > Date.now()) dSol.setUTCMonth(5);
    const avanca = ['AUTORIZADA', 'EM_SEPARACAO', 'AGUARDANDO_RETIRADA', 'ENTREGUE'].includes(status);
    const dAut = avanca ? addH(dSol, ri(3, 30)) : null;
    const dSep = ['EM_SEPARACAO', 'AGUARDANDO_RETIRADA', 'ENTREGUE'].includes(status) ? addH(dAut, ri(2, 20)) : null;
    const dEnt = status === 'ENTREGUE' ? addH(dSep, ri(2, 30)) : null;
    const prioridade = pick(['NORMAL', 'NORMAL', 'NORMAL', 'URGENTE', 'CRITICA']);
    ctx.reqRows.push([reqId, numero, setor.id, setor.secretariaId, solicitante.id, status, prioridade, fmtD(dSol),
      dAut ? fmtTs(dAut) : null, dSep ? fmtTs(dSep) : null, dEnt ? fmtTs(dEnt) : null,
      status === 'CANCELADA' ? 'Cancelada a pedido do setor solicitante.' : null,
      `Reposição de materiais para as atividades do setor ${setor.nome}.`,
      avanca ? almoxUser.id : null, dEnt ? almoxUser.id : null,
      sha(numero + 'sol'), avanca ? sha(numero + 'aut') : null, dEnt ? sha(numero + 'ent') : null,
      fmtTs(dSol), fmtTs(dEnt || dSep || dAut || dSol)]);
    // 2 a 4 itens por requisição
    const nItens = ri(2, 4);
    const usados = new Set();
    for (let k = 0; k < nItens; k++) {
      let ik = pick(itensKeys);
      while (usados.has(ik)) ik = pick(itensKeys);
      usados.add(ik);
      const item = ctx.almox[ik];
      const qtdSol = ri(2, 12);
      let qtdAt = 0, loteId = null, vuSaida = null;
      if (status === 'ENTREGUE') {
        const lote = item.lotes[0];
        qtdAt = Math.min(qtdSol, Math.max(1, Math.floor(lote.restante * 0.3)));
        lote.restante -= qtdAt;
        item.saldo -= qtdAt;
        loteId = lote.id; vuSaida = item.vu;
        ctx.movRows.push([uuid(), item.id, loteId, 'SAIDA', qtdAt, item.vu, money(qtdAt * item.vu), fmtD(dEnt),
          numero, null, null, null, `Atendimento da requisição ${numero}`, reqId, almoxUser.id, fmtTs(dEnt), fmtTs(dEnt)]);
      }
      ctx.reqItemRows.push([uuid(), reqId, item.id, qtdSol, qtdAt, vuSaida, loteId, null, fmtTs(dSol), fmtTs(dEnt || dSol)]);
    }
  });
  ctx.reqCols = ['id', 'numero', 'setor_id', 'secretaria_id', 'usuario_solicitante_id', 'status', 'prioridade', 'data_solicitacao', 'data_autorizacao', 'data_separacao', 'data_entrega', 'observacao', 'justificativa', 'usuario_autorizador_id', 'usuario_atendente_id', 'hash_solicitante', 'hash_assinatura', 'hash_entrega', 'created_at', 'updated_at'];
  ctx.reqItemCols = ['id', 'requisicao_id', 'item_id', 'quantidade_solicitada', 'quantidade_atendida', 'valor_unitario_saida', 'lote_id', 'observacao', 'created_at', 'updated_at'];

  // Ajuste final de estoque/lotes conforme saídas simuladas
  ctx.ajusteEstoque = Object.values(ctx.almox).map((it) => ({ id: it.id, saldo: it.saldo }));
  ctx.ajusteLotes = [];
  for (const it of Object.values(ctx.almox)) for (const l of it.lotes) ctx.ajusteLotes.push({ id: l.id, restante: l.restante });

  // Cotas — julho e junho para 6 setores × 3 itens
  ctx.cotaRows = [];
  const cotaSetores = ['PROTO', 'RH', 'CONTAB', 'GSESAU', 'GSEDUC', 'CRAS'];
  const cotaItens = ['papel_a4', 'caneta_azul', 'cafe'];
  for (const mesAno of ['2026-06', '2026-07']) {
    for (const sk of cotaSetores) for (const ik of cotaItens) {
      const cota = ri(10, 40);
      ctx.cotaRows.push([uuid(), ctx.set[sk].id, ctx.almox[ik].id, mesAno, cota, ri(0, cota), true, null, almoxUser.id,
        fmtTs(mk(2026, +mesAno.slice(5), 1, 8)), fmtTs(mk(2026, +mesAno.slice(5), 1, 8))]);
    }
  }
  ctx.cotaCols = ['id', 'setor_id', 'item_id', 'mes_ano', 'quantidade_cota', 'quantidade_consumida', 'ativo', 'observacao', 'usuario_id', 'created_at', 'updated_at'];

  // Inventários do almoxarifado
  const inv1 = uuid(), inv2 = uuid();
  ctx.almInvRows = [
    [inv1, 'INV-2026-001', '2026-05-04', '2026-05-08', 'CONCLUIDO', almoxUser.id, 'Inventário rotativo do 1º quadrimestre.', 12, 2, fmtTs(mk(2026, 5, 4, 8)), fmtTs(mk(2026, 5, 8, 17))],
    [inv2, 'INV-2026-002', '2026-07-13', null, 'EM_ANDAMENTO', almoxUser.id, 'Inventário rotativo de julho — em contagem.', 10, 1, fmtTs(mk(2026, 7, 13, 8)), fmtTs(mk(2026, 7, 15, 17))],
  ];
  ctx.almInvCols = ['id', 'numero', 'data_inicio', 'data_conclusao', 'status', 'usuario_responsavel_id', 'observacao', 'total_itens', 'total_divergencias', 'created_at', 'updated_at'];
  ctx.almInvItemRows = [];
  itensKeys.slice(0, 12).forEach((ik, i) => {
    const it = ctx.almox[ik];
    const divergente = i < 2;
    const contada = divergente ? Math.max(0, it.saldo - ri(1, 3)) : it.saldo;
    ctx.almInvItemRows.push([uuid(), inv1, it.id, it.saldo, contada, contada - it.saldo, it.vu, money((contada - it.saldo) * it.vu), true,
      divergente ? 'Divergência apurada — ajuste registrado.' : null, fmtTs(mk(2026, 5, 5, 9)), fmtTs(mk(2026, 5, 8, 16))]);
  });
  itensKeys.slice(12, 22).forEach((ik, i) => {
    const it = ctx.almox[ik];
    const contado = i < 5;
    const contada = contado ? (i === 0 ? it.saldo - 1 : it.saldo) : null;
    ctx.almInvItemRows.push([uuid(), inv2, it.id, it.saldo, contada, contada === null ? null : contada - it.saldo, it.vu,
      contada === null ? null : money((contada - it.saldo) * it.vu), contado, null, fmtTs(mk(2026, 7, 13, 9)), fmtTs(mk(2026, 7, 15, 16))]);
  });
  ctx.almInvItemCols = ['id', 'inventario_id', 'item_id', 'quantidade_sistema', 'quantidade_contada', 'diferenca', 'valor_unitario', 'valor_divergencia', 'contado', 'observacao', 'created_at', 'updated_at'];

  // ── Patrimônio ─────────────────────────────────────────────────────────────
  ctx.bemRows = []; ctx.patRespRows = []; ctx.patMovRows = []; ctx.patBaixaRows = [];
  ctx.bens = [];
  let tomb = 0, termoSeq = 0;
  const fornecedorBens = { '02': 'g7', '01': 'mobiliario', '03': 'g7', '04': 'valecuru' };
  for (const [desc, grupoCod, marca, modelo, valor, secSigla, setKey, sala, estado, placa] of PAT_BENS_DEF) {
    const id = uuid();
    const numero = '2026' + String(++tomb).padStart(6, '0');
    const setor = ctx.set[setKey];
    const resp = (ctx.userBySetor[setKey] || [ctx.u.admin])[0];
    const dAq = mk(2026, ri(1, 4), ri(2, 27), 10);
    const credor = ctx.credor[fornecedorBens[grupoCod]] || ctx.credor.g7;
    ctx.bens.push({ id, numero, desc, setKey, secSigla, respId: resp.id, respNome: resp.nome, valor });
    ctx.bemRows.push([id, numero, ctx.patGrupos[grupoCod], desc, `${marca} ${modelo}${placa ? ' – placa ' + placa : ''}`, marca, modelo,
      grupoCod === '02' ? 'SN' + ri(100000, 999999) : null, pick(['Preto', 'Branco', 'Cinza', 'Azul']),
      String(ri(1000, 9999)), '1', null, fmtD(dAq), credor.doc, credor.razao, `NE-${String(ri(80, 199)).padStart(4, '0')}/2026`,
      grupoCod === '04' ? null : '011/2026', null, fmtD(dAq), valor,
      grupoCod === '04' ? 15 : 10, grupoCod === '04' ? 6.67 : 10, money(valor * 0.1), estado, 'ATIVO',
      ctx.sec[secSigla].id, setor.id, resp.id, sala, sala, placa, placa ? 'REN' + ri(10000000, 99999999) : null,
      patUser.id, null, true, fmtTs(dAq), fmtTs(dAq)]);
    ctx.patRespRows.push([uuid(), 'TR-2026-' + String(++termoSeq).padStart(6, '0'), id, ctx.sec[secSigla].id, setor.id, resp.id,
      resp.nome, resp.cargo, null, fmtD(dAq), null, 'VIGENTE', null, fmtTs(addH(dAq, 2)), patUser.id, fmtTs(dAq), fmtTs(dAq)]);
  }
  ctx.bemCols = ['id', 'numero_tombamento', 'grupo_id', 'descricao', 'especificacao_tecnica', 'marca', 'modelo', 'numero_serie', 'cor',
    'numero_nota_fiscal', 'serie_nf', 'chave_nfe', 'data_nota_fiscal', 'cnpj_fornecedor', 'nome_fornecedor', 'numero_empenho',
    'numero_contrato', 'numero_processo', 'data_aquisicao', 'valor_aquisicao', 'vida_util_anos', 'taxa_depreciacao', 'valor_residual',
    'estado_conservacao', 'status', 'secretaria_id', 'setor_id', 'responsavel_id', 'local_fisico', 'sala', 'placa', 'renavam',
    'usuario_cadastro_id', 'observacoes', 'ativo', 'created_at', 'updated_at'];
  ctx.patRespCols = ['id', 'numero_termo', 'bem_id', 'secretaria_id', 'setor_id', 'responsavel_id', 'nome_responsavel', 'cargo_responsavel',
    'matricula_responsavel', 'data_inicio', 'data_fim', 'status', 'observacoes', 'assinado_em', 'usuario_id', 'created_at', 'updated_at'];

  // Transferências de bens (12)
  const transf = [[0, 'RH'], [1, 'TI'], [8, 'ARQ'], [10, 'FARM'], [15, 'RH'], [19, 'TRIB'], [20, 'ORCAM'], [21, 'PROTO'], [23, 'COMPRAS'], [24, 'MEREND'], [27, 'GAB'], [13, 'OUV']];
  ctx.bensTransferidos = [];
  transf.forEach(([bemIdx, destKey], i) => {
    const bem = ctx.bens[bemIdx];
    const dMov = mk(2026, ri(5, 7), ri(1, 15), ri(9, 16));
    ctx.patMovRows.push([uuid(), bem.id, 'TRANSFERENCIA', ctx.sec[bem.secSigla].id, ctx.set[bem.setKey].id,
      ctx.set[destKey].secretariaId, ctx.set[destKey].id, fmtD(dMov), 'MOV-2026-' + String(i + 1).padStart(3, '0'),
      'Remanejamento para atender demanda do setor de destino.', null, patUser.id, fmtTs(dMov), fmtTs(dMov)]);
    ctx.bensTransferidos.push({ id: bem.id, setorId: ctx.set[destKey].id, secretariaId: ctx.set[destKey].secretariaId });
  });
  ctx.patMovCols = ['id', 'bem_id', 'tipo', 'secretaria_origem_id', 'setor_origem_id', 'secretaria_destino_id', 'setor_destino_id',
    'data_movimentacao', 'numero_documento', 'justificativa', 'observacoes', 'usuario_id', 'created_at', 'updated_at'];

  // Baixas (3) — os 3 últimos bens da lista ficam BAIXADOS
  const baixas = [
    [33, 'INSERVIVEL', 'Motocicleta com motor fundido; recuperação antieconômica conforme laudo mecânico.'],
    [22, 'INSERVIVEL', 'Arquivo de aço com corrosão avançada e gavetas travadas.'],
    [10, 'SINISTRO', 'Impressora danificada por descarga elétrica; sem viabilidade de conserto.'],
  ];
  ctx.bensBaixados = [];
  baixas.forEach(([bemIdx, motivo, descOc], i) => {
    const bem = ctx.bens[bemIdx];
    ctx.bensBaixados.push(bem.id);
    const dBx = mk(2026, 6, ri(10, 25), ri(9, 16));
    ctx.patBaixaRows.push([uuid(), bem.id, motivo, `Proc.2026.${String(60 + i).padStart(7, '0')} - SEMAD`, `RES ${String(i + 4).padStart(3, '0')}/2026`,
      fmtD(dBx), money(bem.valor * 0.05), descOc, 'Carlos Eduardo Vasconcelos Lima – Secretário de Administração', patUser.id, null, fmtTs(dBx), fmtTs(dBx)]);
  });
  ctx.patBaixaCols = ['id', 'bem_id', 'motivo', 'numero_processo', 'numero_resolucao', 'data_baixa', 'valor_estimado_residual',
    'descricao_ocorrencia', 'autorizado_por', 'usuario_id', 'observacoes', 'created_at', 'updated_at'];

  // Inventários de patrimônio
  const pinv1 = uuid(), pinv2 = uuid();
  ctx.patInvRows = [
    [pinv1, 'INV-PAT-2026-0001', 2026, 'CONCLUIDO', '2026-04-06', '2026-04-17', patUser.id, ctx.sec.SEMAD.id, 15, 15, 1,
     'Inventário parcial da Secretaria de Administração.', patUser.id, fmtTs(mk(2026, 4, 6, 8)), fmtTs(mk(2026, 4, 17, 17))],
    [pinv2, 'INV-PAT-2026-0002', 2026, 'EM_ANDAMENTO', '2026-07-08', null, patUser.id, ctx.sec.SESAU.id, 6, 3, 0,
     'Inventário da Secretaria de Saúde — em execução.', patUser.id, fmtTs(mk(2026, 7, 8, 8)), fmtTs(mk(2026, 7, 15, 17))],
  ];
  ctx.patInvCols = ['id', 'numero', 'ano_exercicio', 'status', 'data_inicio', 'data_conclusao', 'responsavel_id', 'secretaria_id',
    'total_bens', 'total_conferidos', 'total_divergencias', 'observacoes', 'usuario_id', 'created_at', 'updated_at'];
  ctx.patInvItemRows = [];
  ctx.bens.slice(0, 15).forEach((bem, i) => {
    const naoEncontrado = i === 14;
    ctx.patInvItemRows.push([uuid(), pinv1, bem.id, bem.numero, !naoEncontrado, naoEncontrado ? null : 'No local registrado',
      naoEncontrado ? null : 'BOM', naoEncontrado ? 'Bem não localizado na conferência — em apuração.' : null,
      patUser.id, fmtTs(mk(2026, 4, ri(7, 16), ri(9, 16))), fmtTs(mk(2026, 4, 7, 9)), fmtTs(mk(2026, 4, 16, 16))]);
  });
  ctx.bens.slice(25, 31).forEach((bem, i) => {
    const conferido = i < 3;
    ctx.patInvItemRows.push([uuid(), pinv2, bem.id, bem.numero, conferido ? true : null, conferido ? 'No local registrado' : null,
      conferido ? 'BOM' : null, null, conferido ? patUser.id : null,
      conferido ? fmtTs(mk(2026, 7, ri(9, 15), ri(9, 16))) : null, fmtTs(mk(2026, 7, 8, 9)), fmtTs(mk(2026, 7, 15, 16))]);
  });
  ctx.patInvItemCols = ['id', 'inventario_id', 'bem_id', 'numero_tombamento', 'encontrado', 'local_encontrado',
    'estado_conservacao_encontrado', 'observacoes', 'conferido_por_id', 'conferido_em', 'created_at', 'updated_at'];
};

module.exports = { build, ALMOX_ITENS_DEF, PAT_BENS_DEF };
