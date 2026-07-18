// Estrutura organizacional: secretarias, setores, usuários, responsáveis e agentes
const { uuid, cpf, cnpj, fone, foneDig, emailDe, ri, pick, mk, fmtTs, fmtD, addD } = require('./util');

// IDs já existentes no tenant_modelo (não recriar)
const SEMAD_ID = 'aed5cabc-6956-48b1-804d-802330395200';
const PROTO_ID = '2a0e451d-3d62-47d3-a2b6-4ece4241d347';
const ADMIN_ID = 'b92d4065-75b7-4e54-9606-71d2ae2e5c1d';

// ── Secretarias ──────────────────────────────────────────────────────────────
const SECRETARIAS_DEF = [
  ['GABIP',   'Gabinete do Prefeito',                                 'Coordenação política e administrativa do Município'],
  ['SEMAD',   'Secretaria de Administração',                          'Gestão administrativa, RH, compras, patrimônio e almoxarifado'],
  ['SEFIN',   'Secretaria de Finanças',                               'Gestão orçamentária, financeira, contábil e tributária'],
  ['CGM',     'Controladoria e Ouvidoria Geral do Município',         'Controle interno, transparência e ouvidoria'],
  ['PGM',     'Procuradoria Geral do Município',                      'Representação judicial e consultoria jurídica'],
  ['SESAU',   'Secretaria de Saúde',                                  'Gestão do SUS municipal, atenção básica e vigilância'],
  ['SEDUC',   'Secretaria de Educação',                               'Rede municipal de ensino, merenda e transporte escolar'],
  ['SEINFRA', 'Secretaria de Infraestrutura e Urbanismo',             'Obras, vias públicas, iluminação e limpeza urbana'],
  ['SEMAS',   'Secretaria de Assistência Social',                     'Proteção social básica e especial, CRAS e CREAS'],
  ['SEAGRI',  'Secretaria de Agricultura e Recursos Hídricos',        'Apoio ao produtor rural e abastecimento'],
  ['SEMMA',   'Secretaria de Meio Ambiente',                          'Licenciamento e fiscalização ambiental'],
  ['SECULT',  'Secretaria de Cultura e Turismo',                      'Fomento à cultura, eventos e turismo'],
  ['SEJEL',   'Secretaria de Esporte, Juventude e Lazer',             'Esporte amador, juventude e lazer'],
];

// ── Setores: [chave, secretaria, nome, sigla] ────────────────────────────────
const SETORES_DEF = [
  ['GAB',      'GABIP',   'Gabinete do Prefeito',            'GAB'],
  ['ASCOM',    'GABIP',   'Assessoria de Comunicação',       'ASCOM'],
  ['JSM',      'GABIP',   'Junta do Serviço Militar',        'JSM'],
  ['GSEMAD',   'SEMAD',   'Gabinete do Secretário de Administração', 'GSEMAD'],
  ['PROTO',    'SEMAD',   'Protocolo Geral',                 'PROTO'],   // já existe
  ['RH',       'SEMAD',   'Recursos Humanos',                'RH'],
  ['COMPRAS',  'SEMAD',   'Compras e Licitações',            'COMPRAS'],
  ['ALMOX',    'SEMAD',   'Almoxarifado Central',            'ALMOX'],
  ['PATRIM',   'SEMAD',   'Patrimônio',                      'PATRIM'],
  ['TI',       'SEMAD',   'Tecnologia da Informação',        'TI'],
  ['ARQ',      'SEMAD',   'Arquivo Geral',                   'ARQ'],
  ['GSEFIN',   'SEFIN',   'Gabinete do Secretário de Finanças', 'GSEFIN'],
  ['CONTAB',   'SEFIN',   'Contabilidade',                   'CONTAB'],
  ['TESOUR',   'SEFIN',   'Tesouraria',                      'TESOUR'],
  ['TRIB',     'SEFIN',   'Tributos e Arrecadação',          'TRIB'],
  ['ORCAM',    'SEFIN',   'Execução Orçamentária',           'ORCAM'],
  ['CI',       'CGM',     'Controle Interno',                'CI'],
  ['OUV',      'CGM',     'Ouvidoria Municipal',             'OUV'],
  ['AJUR',     'PGM',     'Assessoria Jurídica',             'AJUR'],
  ['GSESAU',   'SESAU',   'Gabinete da Secretária de Saúde', 'GSESAU'],
  ['ATBAS',    'SESAU',   'Atenção Básica',                  'ATBAS'],
  ['FARM',     'SESAU',   'Farmácia Central',                'FARM'],
  ['VISA',     'SESAU',   'Vigilância Sanitária',            'VISA'],
  ['REGTFD',   'SESAU',   'Regulação e TFD',                 'REGTFD'],
  ['GSEDUC',   'SEDUC',   'Gabinete do Secretário de Educação', 'GSEDUC'],
  ['MEREND',   'SEDUC',   'Merenda Escolar',                 'MEREND'],
  ['TRANSP',   'SEDUC',   'Transporte Escolar',              'TRANSP'],
  ['PEDAG',    'SEDUC',   'Coordenação Pedagógica',          'PEDAG'],
  ['GSEINFRA', 'SEINFRA', 'Gabinete do Secretário de Infraestrutura', 'GSEINFRA'],
  ['ENG',      'SEINFRA', 'Engenharia e Projetos',           'ENG'],
  ['VIAS',     'SEINFRA', 'Manutenção de Vias',              'VIAS'],
  ['ILUM',     'SEINFRA', 'Iluminação Pública',              'ILUM'],
  ['LIMP',     'SEINFRA', 'Limpeza Urbana',                  'LIMP'],
  ['GSEMAS',   'SEMAS',   'Gabinete da Secretária de Assistência Social', 'GSEMAS'],
  ['CRAS',     'SEMAS',   'CRAS – Centro de Referência',     'CRAS'],
  ['CREAS',    'SEMAS',   'CREAS – Referência Especializado','CREAS'],
  ['CADUN',    'SEMAS',   'Cadastro Único e Bolsa Família',  'CADUN'],
  ['APROD',    'SEAGRI',  'Apoio ao Produtor Rural',         'APROD'],
  ['FAMB',     'SEMMA',   'Fiscalização Ambiental',          'FAMB'],
  ['BIBLIO',   'SECULT',  'Biblioteca Municipal',            'BIBLIO'],
  ['GINAS',    'SEJEL',   'Ginásio Poliesportivo',           'GINAS'],
];

// ── Usuários: [chave, nome, nomeReduzido, cargo, tipo, setor, papel-permissão]
const USUARIOS_DEF = [
  ['prefeito',   'Francisco das Chagas Oliveira Neto', 'Francisco Neto',  'Prefeito Municipal',                 'gestor',      'GAB',      'gestor'],
  ['chefegab',   'Maria Auxiliadora Pinheiro Bezerra', 'Maria Auxiliadora','Chefe de Gabinete',                 'gestor',      'GAB',      'gestor'],
  ['ascom',      'José Ribamar Costa Filho',           'Ribamar Costa',   'Assessor de Comunicação',            'operacional', 'ASCOM',    'basico'],
  ['secadm',     'Carlos Eduardo Vasconcelos Lima',    'Carlos Eduardo',  'Secretário de Administração',        'gestor',      'GSEMAD',   'gestor'],
  ['protocolo',  'Antônia Cleide Ferreira Gomes',      'Cleide Gomes',    'Chefe do Protocolo Geral',           'operacional', 'PROTO',    'basico'],
  ['rh',         'Raimundo Nonato Sousa Araújo',       'Nonato Araújo',   'Diretor de Recursos Humanos',        'operacional', 'RH',       'basico'],
  ['compras',    'Patrícia Kelly Andrade Nogueira',    'Patrícia Kelly',  'Pregoeira e Chefe de Compras',       'operacional', 'COMPRAS',  'compras'],
  ['almoxarife', 'Fábio Henrique Martins Cavalcante',  'Fábio Henrique',  'Almoxarife',                         'operacional', 'ALMOX',    'almox'],
  ['patrimonio', 'Luana Beatriz Rocha Siqueira',       'Luana Beatriz',   'Encarregada de Patrimônio',          'operacional', 'PATRIM',   'patrimonio'],
  ['ti',         'Tiago Fernandes Moreira',            'Tiago Moreira',   'Analista de TI',                     'operacional', 'TI',       'basico'],
  ['arquivo',    'Rosângela Maria Dantas',             'Rosângela',       'Arquivista',                         'operacional', 'ARQ',      'arquivo'],
  ['secfin',     'Sebastião Alves Correia Júnior',     'Sebastião Alves', 'Secretário de Finanças',             'gestor',      'GSEFIN',   'gestor'],
  ['contadora',  'Ana Cristina Barroso Freitas',       'Ana Cristina',    'Contadora Geral',                    'operacional', 'CONTAB',   'contab'],
  ['tesoureiro', 'Marcos Vinícius Teixeira Prado',     'Marcos Vinícius', 'Tesoureiro Municipal',               'operacional', 'TESOUR',   'tesouraria'],
  ['tributos',   'Silvana Régia Matos Cunha',          'Silvana Régia',   'Chefe de Tributos',                  'operacional', 'TRIB',     'basico'],
  ['orcamento',  'Diego Sampaio Furtado',              'Diego Sampaio',   'Técnico Orçamentário',               'operacional', 'ORCAM',    'contab'],
  ['controle',   'Helena Cássia Brito Vasconcelos',    'Helena Cássia',   'Controladora Geral do Município',    'gestor',      'CI',       'controle'],
  ['ouvidoria',  'Aldenora Praxedes Melo',             'Aldenora',        'Ouvidora Municipal',                 'operacional', 'OUV',      'basico'],
  ['procurador', 'Renato Augusto Paiva Sales',         'Dr. Renato',      'Procurador Geral do Município',      'gestor',      'AJUR',     'gestor'],
  ['secsau',     'Fernanda Lúcia Aguiar Ramos',        'Dra. Fernanda',   'Secretária de Saúde',                'gestor',      'GSESAU',   'gestor'],
  ['atbasica',   'Josefa Edilene Cardoso Mota',        'Edilene Mota',    'Coordenadora da Atenção Básica',     'operacional', 'ATBAS',    'basico'],
  ['farmacia',   'Paulo Sérgio Ribeiro Nunes',         'Paulo Sérgio',    'Farmacêutico Responsável',           'operacional', 'FARM',     'almoxver'],
  ['visa',       'Camila Duarte Albuquerque',          'Camila Duarte',   'Fiscal Sanitária',                   'operacional', 'VISA',     'basico'],
  ['regulacao',  'Igor Bezerra Falcão',                'Igor Falcão',     'Coordenador de Regulação e TFD',     'operacional', 'REGTFD',   'basico'],
  ['seceduc',    'Antônio Marcos Landim Chaves',       'Prof. Marcos',    'Secretário de Educação',             'gestor',      'GSEDUC',   'gestor'],
  ['merenda',    'Cícera Raquel Pontes Amorim',        'Raquel Amorim',   'Nutricionista da Merenda Escolar',   'operacional', 'MEREND',   'basico'],
  ['transporte', 'Genival Torres Damasceno',           'Genival Torres',  'Coordenador do Transporte Escolar',  'operacional', 'TRANSP',   'basico'],
  ['pedagogica', 'Verônica Sales Timbó',               'Verônica Sales',  'Coordenadora Pedagógica',            'operacional', 'PEDAG',    'basico'],
  ['secinfra',   'Bruno Leonardo Quixadá Peixoto',     'Eng. Bruno',      'Secretário de Infraestrutura',       'gestor',      'GSEINFRA', 'gestor'],
  ['engenharia', 'Mateus Aragão Bittencourt',          'Mateus Aragão',   'Engenheiro Civil',                   'operacional', 'ENG',      'basico'],
  ['vias',       'Vanderlei Menezes Castro',           'Vanderlei',       'Encarregado de Manutenção de Vias',  'operacional', 'VIAS',     'basico'],
  ['limpeza',    'Edvaldo Nogueira Frota',             'Edvaldo Frota',   'Encarregado de Limpeza Urbana',      'operacional', 'LIMP',     'basico'],
  ['secsocial',  'Rita de Cássia Farias Lopes',        'Rita de Cássia',  'Secretária de Assistência Social',   'gestor',      'GSEMAS',   'gestor'],
  ['cras',       'Marta Suely Vidal Escóssia',         'Marta Suely',     'Coordenadora do CRAS',               'operacional', 'CRAS',     'basico'],
  ['creas',      'Núbia Regina Colares',               'Núbia Regina',    'Coordenadora do CREAS',              'operacional', 'CREAS',    'basico'],
  ['secagri',    'João Batista Xavier Aquino',         'João Batista',    'Secretário de Agricultura',          'gestor',      'APROD',    'gestor'],
  ['secamb',     'Larissa Mendes Holanda',             'Larissa Holanda', 'Secretária de Meio Ambiente',        'gestor',      'FAMB',     'gestor'],
  ['seccult',    'Valdemir Soares Pacheco',            'Valdemir',        'Secretário de Cultura e Turismo',    'gestor',      'BIBLIO',   'gestor'],
];

// ── Permissões (mesma estrutura default do modelo User) ─────────────────────
const permsDefault = () => ({
  processos:     { ver: true, criar: true, editar: true, excluir: false, tramitar: true, devolver: true, concluir: true, arquivar: false, anexar_documento: true, excluir_documento: false },
  arquivo:       { acessar: false },
  almoxarifado:  { acessar: false, painel: { ver: true }, estoque: { ver: true, editar: true }, entradas: { ver: true, registrar: true }, saidas: { ver: true, registrar: true }, requisicoes: { ver: true, criar: true, aprovar: false, cancelar: false }, cotas: { ver: true, gerenciar: false }, inventario: { ver: true, realizar: false }, auditoria: { ver: false } },
  patrimonio:    { acessar: false, painel: { ver: true }, bens: { ver: true, criar: false, editar: false, excluir: false }, tombamento: { ver: true, realizar: false }, transferencia: { ver: true, realizar: false }, baixa: { ver: true, realizar: false }, inventario: { ver: true, realizar: false }, grupos: { ver: false, gerenciar: false } },
  financeiro:    { acessar: false, painel: { ver: true }, processos_did: { ver: true }, relatorio: { ver: false } },
  contratos:     { acessar: false, itens: { ver: true, criar: false, editar: false, excluir: false }, credores: { ver: true, criar: false, editar: false, excluir: false }, contratos: { ver: true, criar: false, editar: false, excluir: false }, ordens: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
  tesouraria:    { acessar: false, contas: { ver: true, criar: false, editar: false, excluir: false }, receitas: { ver: true, criar: false, editar: false, excluir: false }, despesas: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
  administracao: { gerenciar_usuarios: false, gerenciar_secretarias: false, gerenciar_configuracoes: false, visualizar_relatorios: false, visualizar_registros: false },
});

const permsPara = (papel) => {
  const p = permsDefault();
  if (papel === 'gestor') {
    p.processos.arquivar = true; p.processos.excluir = false;
    p.arquivo.acessar = true;
    p.financeiro.acessar = true; p.financeiro.relatorio = { ver: true };
    p.contratos.acessar = true;
    p.administracao.visualizar_relatorios = true;
  } else if (papel === 'almox' || papel === 'almoxver') {
    p.almoxarifado.acessar = true;
    if (papel === 'almox') {
      p.almoxarifado.requisicoes = { ver: true, criar: true, aprovar: true, cancelar: true };
      p.almoxarifado.cotas = { ver: true, gerenciar: true };
      p.almoxarifado.inventario = { ver: true, realizar: true };
      p.almoxarifado.auditoria = { ver: true };
    }
  } else if (papel === 'patrimonio') {
    p.patrimonio.acessar = true;
    p.patrimonio.bens = { ver: true, criar: true, editar: true, excluir: false };
    p.patrimonio.tombamento = { ver: true, realizar: true };
    p.patrimonio.transferencia = { ver: true, realizar: true };
    p.patrimonio.baixa = { ver: true, realizar: true };
    p.patrimonio.inventario = { ver: true, realizar: true };
    p.patrimonio.grupos = { ver: true, gerenciar: true };
  } else if (papel === 'contab') {
    p.financeiro.acessar = true; p.financeiro.relatorio = { ver: true };
    p.contratos.acessar = true;
  } else if (papel === 'tesouraria') {
    p.tesouraria.acessar = true;
    p.tesouraria.contas = { ver: true, criar: true, editar: true, excluir: false };
    p.tesouraria.receitas = { ver: true, criar: true, editar: true, excluir: false };
    p.tesouraria.despesas = { ver: true, criar: true, editar: true, excluir: false };
    p.financeiro.acessar = true;
  } else if (papel === 'compras') {
    p.contratos.acessar = true;
    p.contratos.itens = { ver: true, criar: true, editar: true, excluir: false };
    p.contratos.credores = { ver: true, criar: true, editar: true, excluir: false };
    p.contratos.contratos = { ver: true, criar: true, editar: true, excluir: false };
    p.contratos.ordens = { ver: true, criar: true, editar: true, excluir: false };
    p.almoxarifado.acessar = true;
  } else if (papel === 'controle') {
    p.arquivo.acessar = true;
    p.financeiro.acessar = true; p.financeiro.relatorio = { ver: true };
    p.contratos.acessar = true;
    p.almoxarifado.acessar = true;
    p.patrimonio.acessar = true;
    p.tesouraria.acessar = true;
    p.administracao.visualizar_relatorios = true;
    p.administracao.visualizar_registros = true;
  } else if (papel === 'arquivo') {
    p.arquivo.acessar = true;
  }
  return p;
};

// ── build(ctx): monta linhas prontas para insert ─────────────────────────────
const build = (ctx, senhaHash) => {
  const t0 = fmtTs(mk(2026, 1, 10, 9));

  // Secretarias
  ctx.sec = {};
  const secRows = [];
  for (const [sigla, nome, desc] of SECRETARIAS_DEF) {
    const id = sigla === 'SEMAD' ? SEMAD_ID : uuid();
    ctx.sec[sigla] = { id, nome, sigla };
    if (sigla === 'SEMAD') continue; // já existe — será atualizada via UPDATE
    secRows.push([
      id, nome, sigla, desc, true, t0, t0, '2025-01-01',
      emailDe(sigla.toLowerCase() + ' secretaria'), fone(), cnpj(), `${nome} do Município de Modelo`,
      String(ri(2, 28)).padStart(2, '0'),
      JSON.stringify([]),
      JSON.stringify({ exercicio: 2026, valor_loa: ri(800, 12000) * 1000, valor_suplementado: ri(0, 900) * 1000, valor_reduzido: 0 }),
      JSON.stringify([
        { id: 1, codigo: `${ri(1, 12)}.${ri(100, 999)}.${ri(1000, 9999)}.2.${String(ri(1, 99)).padStart(3, '0')}`, descricao: `Manutenção das atividades da ${sigla}`, elemento_despesa: '3.3.90.30', fonte_recurso: '1500 – Recursos Próprios', valor_previsto: ri(200, 3000) * 1000 },
        { id: 2, codigo: `${ri(1, 12)}.${ri(100, 999)}.${ri(1000, 9999)}.2.${String(ri(1, 99)).padStart(3, '0')}`, descricao: `Serviços de terceiros – ${sigla}`, elemento_despesa: '3.3.90.39', fonte_recurso: '1500 – Recursos Próprios', valor_previsto: ri(100, 1500) * 1000 },
      ]),
    ]);
  }
  ctx.secRows = secRows;
  ctx.secCols = ['id', 'nome', 'sigla', 'descricao', 'ativo', 'created_at', 'updated_at', 'data_inicio', 'email', 'whatsapp', 'cnpj', 'razao_social', 'codigo_unidade', 'responsaveis', 'orcamento', 'dotacoes'];

  // Setores
  ctx.set = {};
  const setRows = [];
  for (const [key, secKey, nome, sigla] of SETORES_DEF) {
    const id = key === 'PROTO' ? PROTO_ID : uuid();
    ctx.set[key] = { id, nome, sigla, secKey, secretariaId: ctx.sec[secKey].id };
    if (key === 'PROTO') continue;
    setRows.push([id, ctx.sec[secKey].id, nome, sigla, null, true, t0, t0]);
  }
  ctx.setRows = setRows;
  ctx.setCols = ['id', 'secretaria_id', 'nome', 'sigla', 'descricao', 'ativo', 'created_at', 'updated_at'];

  // Usuários
  ctx.u = {};
  ctx.userBySetor = {};
  const uRows = [];
  for (const [key, nome, nomeRed, cargo, tipo, setKey, papel] of USUARIOS_DEF) {
    const id = uuid();
    const setor = ctx.set[setKey];
    const user = { id, nome, nomeRed, cargo, tipo, setorKey: setKey, setorId: setor.id, secretariaId: setor.secretariaId, secKey: setor.secKey };
    ctx.u[key] = user;
    (ctx.userBySetor[setKey] = ctx.userBySetor[setKey] || []).push(user);
    uRows.push([
      id, nome, nomeRed, emailDe(nome), cpf(), senhaHash, foneDig(), tipo, true,
      setor.secretariaId, setor.id, cargo,
      `Portaria nº ${String(ri(1, 180)).padStart(3, '0')}/2025`,
      JSON.stringify(permsPara(papel)),
      fmtTs(mk(2026, 7, ri(10, 16), ri(8, 17))), t0, t0,
    ]);
  }
  // admin existente também atende no Protocolo
  const admin = { id: ADMIN_ID, nome: 'Administrador Modelo', nomeRed: 'Admin', cargo: 'Administrador do Sistema', tipo: 'admin', setorKey: 'PROTO', setorId: PROTO_ID, secretariaId: SEMAD_ID, secKey: 'SEMAD' };
  ctx.u.admin = admin;
  (ctx.userBySetor.PROTO = ctx.userBySetor.PROTO || []).push(admin);
  ctx.uRows = uRows;
  ctx.uCols = ['id', 'nome', 'nome_reduzido', 'email', 'cpf', 'senha', 'telefone', 'tipo', 'ativo', 'secretaria_id', 'setor_id', 'cargo', 'portaria_nomeacao', 'permissoes', 'ultimo_acesso', 'created_at', 'updated_at'];

  // Responsáveis (secretários e adjuntos por pasta) — 32
  const respRows = [];
  let respId = 1;
  const secretariosPorPasta = {
    GABIP: 'chefegab', SEMAD: 'secadm', SEFIN: 'secfin', CGM: 'controle', PGM: 'procurador',
    SESAU: 'secsau', SEDUC: 'seceduc', SEINFRA: 'secinfra', SEMAS: 'secsocial',
    SEAGRI: 'secagri', SEMMA: 'secamb', SECULT: 'seccult', SEJEL: 'prefeito',
  };
  ctx.secretarioDe = {};
  for (const [sigla] of SECRETARIAS_DEF) {
    const uk = secretariosPorPasta[sigla];
    const user = ctx.u[uk];
    ctx.secretarioDe[sigla] = user;
    respRows.push([respId++, ctx.sec[sigla].id, user.nome, user.cargo, cpf(), emailDe(user.nome), foneDig(), '2025-01-02', null, true, t0, t0]);
  }
  // responsaveis JSONB das secretarias novas (exibido no cadastro da secretaria)
  ctx.secRespUpdates = SECRETARIAS_DEF.filter(([sigla]) => sigla !== 'SEMAD').map(([sigla]) => ({
    id: ctx.sec[sigla].id,
    json: JSON.stringify([{ nome: ctx.secretarioDe[sigla].nome, cargo: ctx.secretarioDe[sigla].cargo, data_inicio: '2025-01-02', data_fim: null }]),
  }));

  const ADJUNTOS = [
    ['GABIP', 'Samuel Barros Quintela', 'Subchefe de Gabinete'],
    ['SEMAD', 'Iolanda Freires Sabino', 'Secretária Adjunta de Administração'],
    ['SEFIN', 'Otávio Lucena Brasil', 'Secretário Adjunto de Finanças'],
    ['SESAU', 'Milena Castelo Franco', 'Secretária Adjunta de Saúde'],
    ['SEDUC', 'Everardo Pires Galvão', 'Secretário Adjunto de Educação'],
    ['SEINFRA', 'Talita Muniz Serpa', 'Secretária Adjunta de Infraestrutura'],
    ['SEMAS', 'Gerlane Feitosa Abreu', 'Secretária Adjunta de Assistência Social'],
    ['SEAGRI', 'Cláudio Roberto Van der Linden', 'Diretor de Abastecimento'],
    ['SEMMA', 'Péricles Fontenele Sidou', 'Diretor de Licenciamento'],
    ['SECULT', 'Bianca Sales Von Paraguassu', 'Diretora de Eventos'],
    ['SEJEL', 'Wellington Chagas Bandeira', 'Diretor de Esportes'],
    ['CGM', 'Solange Meireles Pontes', 'Auditora de Controle Interno'],
    ['PGM', 'Hugo Vasconcelos Ferrer', 'Procurador Adjunto'],
    ['SESAU', 'Denise Amaral Vieira', 'Diretora do Hospital Municipal'],
    ['SEDUC', 'Rogério Falcão Meneses', 'Diretor de Ensino'],
    ['SEINFRA', 'Aurélio Dutra Cordeiro', 'Diretor de Obras'],
    ['SEMAD', 'Rebeca Lins Montenegro', 'Diretora de Gestão de Pessoas'],
    ['SEFIN', 'Nelson Sarmento Filgueiras', 'Diretor de Arrecadação'],
    ['GABIP', 'Yasmin Nóbrega Sepúlveda', 'Assessora Especial'],
  ];
  for (const [sigla, nome, cargo] of ADJUNTOS) {
    respRows.push([respId++, ctx.sec[sigla].id, nome, cargo, cpf(), emailDe(nome), foneDig(), '2025-01-02', null, true, t0, t0]);
  }
  ctx.respRows = respRows;
  ctx.respCols = ['id', 'secretaria_id', 'nome', 'cargo', 'cpf', 'email', 'telefone', 'data_inicio', 'data_fim', 'ativo', 'created_at', 'updated_at'];
  ctx.respMax = respId - 1;

  // Agentes públicos — 32 (fiscais de contrato, motoristas, agentes adm.)
  const AGENTES = [
    ['Gilberto Nunes Paranhos', 'Fiscal de Contratos', 'SEMAD'],
    ['Elisângela Moura Tabosa', 'Fiscal de Contratos', 'SESAU'],
    ['Ademar Cruz Landim', 'Fiscal de Contratos', 'SEDUC'],
    ['Wagner Peixoto Sales', 'Fiscal de Contratos', 'SEINFRA'],
    ['Regina Célia Bastos Uchoa', 'Fiscal de Contratos', 'SEMAS'],
    ['Everton Girão Tavares', 'Agente Administrativo', 'SEMAD'],
    ['Luciana Aires Fontes', 'Agente Administrativo', 'SEFIN'],
    ['Ronaldo Queiroz Sampaio', 'Agente Administrativo', 'SESAU'],
    ['Aparecida Régis Novaes', 'Agente Administrativo', 'SEDUC'],
    ['Herbert Caminha Lustosa', 'Agente Administrativo', 'SEINFRA'],
    ['Marlene Rios Salgueiro', 'Agente Administrativo', 'SEMAS'],
    ['Jackson Freire Beviláqua', 'Motorista', 'GABIP'],
    ['Osvaldo Serra Pimenta', 'Motorista', 'SESAU'],
    ['Manoel Messias Tinoco', 'Motorista de Ambulância', 'SESAU'],
    ['Zilda Carvalho Frotas', 'Motorista do Transporte Escolar', 'SEDUC'],
    ['Expedito Gomes Taveira', 'Operador de Máquinas', 'SEINFRA'],
    ['Eliane Justa Romcy', 'Digitadora do CadÚnico', 'SEMAS'],
    ['Auricélio Nogueira Peres', 'Vigia', 'SEMAD'],
    ['Terezinha Lourdes Vidal', 'Auxiliar de Serviços Gerais', 'SEMAD'],
    ['Wilson Roberto Caracas', 'Eletricista', 'SEINFRA'],
    ['Cristiane Parente Jereissati', 'Enfermeira PSF', 'SESAU'],
    ['Damião Xavier Boaventura', 'Agente de Endemias', 'SESAU'],
    ['Socorro Dantas Alencar', 'Agente Comunitária de Saúde', 'SESAU'],
    ['Valmir Torquato Aragão', 'Professor', 'SEDUC'],
    ['Neuma Galdino Rocha', 'Merendeira', 'SEDUC'],
    ['Israel Pontes Cavalcanti', 'Técnico Agrícola', 'SEAGRI'],
    ['Dalila Menezes Praciano', 'Fiscal Ambiental', 'SEMMA'],
    ['Otoniel Bezerra Paz', 'Agente Cultural', 'SECULT'],
    ['Kelvia Soares Meireles', 'Instrutora de Esportes', 'SEJEL'],
    ['Adriano Facó Bulcão', 'Técnico em Informática', 'SEMAD'],
    ['Vera Lúcia Sabóia Peixe', 'Recepcionista', 'GABIP'],
    ['Josimar Furtado Antero', 'Almoxarife Auxiliar', 'SEMAD'],
  ];
  const agRows = AGENTES.map(([nome, cargo, sigla], i) => [
    uuid(), nome, cargo, 'MAT-' + String(101 + i), cpf(), emailDe(nome), foneDig(), ctx.sec[sigla].id, true, t0, t0,
  ]);
  ctx.agentes = AGENTES.map((a, i) => ({ nome: a[0], cargo: a[1], sigla: a[2] }));
  ctx.agRows = agRows;
  ctx.agCols = ['id', 'nome', 'cargo', 'matricula', 'cpf', 'email', 'telefone', 'secretaria_id', 'ativo', 'created_at', 'updated_at'];
};

module.exports = { build, SEMAD_ID, PROTO_ID, ADMIN_ID, permsPara };
