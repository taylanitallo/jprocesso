// Credores, catálogo de itens, contratos, ordens de compra/serviço, tesouraria
const { uuid, cnpj, cpf, fone, money, ri, pick, mk, fmtTs, fmtD, addD } = require('./util');

// ── Credores ─────────────────────────────────────────────────────────────────
// [key, tipo, razão social, fantasia, cidade]
const CREDORES_DEF = [
  ['enel',         'Jurídica', 'Companhia Energética do Ceará S.A.',                  'Enel Distribuição Ceará', 'Fortaleza'],
  ['cagece',       'Jurídica', 'Companhia de Água e Esgoto do Ceará',                 'Cagece',                  'Fortaleza'],
  ['brisanet',     'Jurídica', 'Brisanet Serviços de Telecomunicações S.A.',          'Brisanet',                'Pereiro'],
  ['claro',        'Jurídica', 'Claro S.A.',                                          'Claro Empresas',          'Fortaleza'],
  ['postosc',      'Jurídica', 'Posto de Combustíveis São Cristóvão Ltda',            'Posto São Cristóvão',     'Modelo'],
  ['postomodelo',  'Jurídica', 'Auto Posto Modelo Ltda',                              'Posto Modelo',            'Modelo'],
  ['nordfarma',    'Jurídica', 'Nordeste Farma Distribuidora de Medicamentos Ltda',   'Nordeste Farma',          'Fortaleza'],
  ['cirurgica',    'Jurídica', 'Cirúrgica Fortaleza Produtos Hospitalares Ltda',      'Cirúrgica Fortaleza',     'Fortaleza'],
  ['bompreco',     'Jurídica', 'Comercial de Alimentos Bom Preço Ltda',               'Mercadinho Bom Preço',    'Modelo'],
  ['panificadora', 'Jurídica', 'Panificadora Pão da Terra ME',                        'Pão da Terra',            'Modelo'],
  ['papelaria',    'Jurídica', 'Papelaria e Livraria Escolar Ltda',                   'Papelaria Escolar',       'Sobral'],
  ['g7',           'Jurídica', 'G7 Informática e Suprimentos Ltda',                   'G7 Informática',          'Fortaleza'],
  ['sertaoforte',  'Jurídica', 'Construtora Sertão Forte Ltda',                       'Sertão Forte',            'Sobral'],
  ['serrana',      'Jurídica', 'Serrana Engenharia e Pavimentação Ltda',              'Serrana Engenharia',      'Fortaleza'],
  ['valecuru',     'Jurídica', 'Locadora de Veículos Vale do Curu Ltda',              'Vale do Curu Locações',   'Itapipoca'],
  ['santaclara',   'Jurídica', 'Transporte e Turismo Santa Clara Ltda',               'Santa Clara Turismo',     'Sobral'],
  ['jmr',          'Jurídica', 'JMR Serviços de Limpeza e Conservação Ltda',          'JMR Serviços',            'Fortaleza'],
  ['luzsertao',    'Jurídica', 'Elétrica Luz do Sertão Materiais Ltda',               'Luz do Sertão',           'Sobral'],
  ['madeireira',   'Jurídica', 'Madeireira e Materiais de Construção Central Ltda',   'Central Construção',      'Modelo'],
  ['impressul',    'Jurídica', 'Gráfica e Editora Impressul Ltda',                    'Impressul',               'Fortaleza'],
  ['mobiliario',   'Jurídica', 'Mobiliário Escolar Nordeste Indústria Ltda',          'Mobiliário NE',           'Maracanaú'],
  ['polofrio',     'Jurídica', 'Refrigeração Polo Frio Ltda ME',                      'Polo Frio',               'Modelo'],
  ['irmaossilva',  'Jurídica', 'Auto Peças e Mecânica Irmãos Silva Ltda',             'Irmãos Silva',            'Modelo'],
  ['rodabem',      'Jurídica', 'Pneus e Serviços Rodabem Ltda',                       'Rodabem Pneus',           'Sobral'],
  ['labvida',      'Jurídica', 'Laboratório de Análises Clínicas Vida Ltda',          'Lab Vida',                'Modelo'],
  ['contabil',     'Jurídica', 'Consultoria Contábil Pública Sertão Ltda',            'Contábil Sertão',         'Fortaleza'],
  ['jeos',         'Jurídica', 'JEOS Sistemas e Tecnologia Ltda',                     'JEOS Sistemas',           'Fortaleza'],
  ['ednardo',      'Física',   'Francisco Ednardo Alencar Sampaio',                   null,                      'Modelo'],
  ['joselia',      'Jurídica', 'Maria Josélia Cavalcante Buffet ME',                  'Buffet Josélia',          'Modelo'],
  ['gilson',       'Física',   'Antônio Gilson Praxedes de Sousa',                    null,                      'Modelo'],
  ['oxigenio',     'Jurídica', 'Oxigênio Medicinal Ceará Ltda',                       'Oximed CE',               'Fortaleza'],
  ['vigia',        'Jurídica', 'Vigia Segurança Eletrônica Ltda',                     'Vigia Monitoramento',     'Sobral'],
];

// ── Catálogo de itens de contrato ────────────────────────────────────────────
// [key, descricao, categoria, unidade, especificacao]
const CATALOGO_DEF = [
  ['gasolina',   'Gasolina comum',                              'MATERIAL', 'L',      'Combustível automotivo, gasolina comum'],
  ['diesel',     'Óleo diesel S-10',                            'MATERIAL', 'L',      'Combustível automotivo, diesel S-10'],
  ['etanol',     'Etanol hidratado',                            'MATERIAL', 'L',      'Combustível automotivo, etanol'],
  ['dipirona',   'Dipirona sódica 500mg',                       'MATERIAL', 'CP',     'Comprimido 500mg, blíster'],
  ['paracetamol','Paracetamol 750mg',                           'MATERIAL', 'CP',     'Comprimido 750mg'],
  ['soro',       'Soro fisiológico 0,9% 500ml',                 'MATERIAL', 'FR',     'Solução injetável, frasco 500ml'],
  ['luva',       'Luva de procedimento tam. M',                 'MATERIAL', 'CX',     'Caixa com 100 unidades, látex'],
  ['seringa',    'Seringa descartável 10ml',                    'MATERIAL', 'UN',     'Com agulha 25x7'],
  ['arroz',      'Arroz branco tipo 1',                         'MATERIAL', 'KG',     'Fardo 30kg, classe longo fino'],
  ['feijao',     'Feijão carioca tipo 1',                       'MATERIAL', 'KG',     'Saco 1kg'],
  ['carne',      'Carne bovina moída',                          'MATERIAL', 'KG',     'Resfriada, pacote 1kg'],
  ['frango',     'Frango congelado',                            'MATERIAL', 'KG',     'Inteiro, congelado'],
  ['pao',        'Pão francês',                                 'MATERIAL', 'KG',     'Unidade 50g'],
  ['papel_a4',   'Papel A4 75g/m² (resma 500 fls)',             'MATERIAL', 'RESMA',  'Alcalino, branco, 210x297mm'],
  ['caneta',     'Caneta esferográfica azul',                   'MATERIAL', 'UN',     'Escrita média 1.0mm'],
  ['toner',      'Toner HP 85A compatível',                     'MATERIAL', 'UN',     'CE285A, rendimento 1.600 páginas'],
  ['grampeador', 'Grampeador de mesa 26/6',                     'MATERIAL', 'UN',     'Capacidade 25 folhas'],
  ['cimento',    'Cimento Portland CP II 50kg',                 'MATERIAL', 'SC',     'Saco 50kg'],
  ['areia',      'Areia lavada média',                          'MATERIAL', 'M3',     'Metro cúbico'],
  ['brita',      'Brita 19mm',                                  'MATERIAL', 'M3',     'Metro cúbico'],
  ['tubopvc',    'Tubo PVC esgoto 100mm',                       'MATERIAL', 'BR',     'Barra 6m'],
  ['luminaria',  'Luminária pública LED 150W',                  'MATERIAL', 'UN',     'IP66, 5000K, bivolt'],
  ['cabo',       'Cabo flexível 2,5mm²',                        'MATERIAL', 'M',      'Rolo 100m, antichama'],
  ['carteira',   'Conjunto carteira escolar adulto',            'MATERIAL', 'UN',     'Mesa + cadeira, tampo MDF'],
  ['mesa_esc',   'Mesa de escritório 1,20m',                    'MATERIAL', 'UN',     'MDP 25mm com 2 gavetas'],
  ['computador', 'Microcomputador desktop i5 8GB/256GB SSD',    'MATERIAL', 'UN',     'Com monitor 21,5", teclado e mouse'],
  ['notebook',   'Notebook i7 16GB/512GB SSD',                  'MATERIAL', 'UN',     'Tela 15,6" Full HD'],
  ['impressora', 'Impressora multifuncional laser mono',        'MATERIAL', 'UN',     'Duplex, rede, 30ppm'],
  ['arcond',     'Ar-condicionado split 12.000 BTUs',           'MATERIAL', 'UN',     'Inverter, 220V, frio'],
  ['pneu13',     'Pneu 175/70 R13',                             'MATERIAL', 'UN',     'Novo, índice 82T'],
  ['pneu_onibus','Pneu 275/80 R22,5',                           'MATERIAL', 'UN',     'Novo, liso, para ônibus'],
  ['oleo15w40',  'Óleo lubrificante 15W40 (balde 20L)',         'MATERIAL', 'BD',     'Mineral, motores diesel'],
  ['serv_limpeza','Serviço de limpeza e conservação predial',   'SERVIÇO',  'MÊS',    'Posto de servente 44h semanais'],
  ['loc_veiculo','Locação de veículo leve com condutor',        'SERVIÇO',  'MÊS',    'Veículo 1.0, 4 portas, km livre'],
  ['manut_ar',   'Manutenção preventiva de ar-condicionado',    'SERVIÇO',  'UN',     'Limpeza e recarga de gás'],
  ['serv_grafico','Serviços gráficos – impressão de material',  'SERVIÇO',  'MIL',    'Blocos, cartazes e folders 4x4 cores'],
];

// ── Contratos ────────────────────────────────────────────────────────────────
// [n, credorKey, tipoContrato, objeto, modalidade, tipoObjeto, licitacao, secSigla, fiscalIdx, vigIni, vigFim, itens[[catKey|null, descricao|null, unid, qtd, vu]], fonte]
const CONTRATOS_DEF = [
  [1,  'enel',        'CONTRATO', 'Fornecimento de energia elétrica para os prédios públicos municipais',            'Inexigibilidade',    'Fornecimento', 'INEX 001/2026', 'SEMAD',   0, '2026-01-02', '2026-12-31', [[null, 'Fornecimento de energia elétrica – demanda estimada', 'MÊS', 12, 40000]], '1500 – Recursos Próprios'],
  [2,  'cagece',      'CONTRATO', 'Fornecimento de água e coleta de esgoto para os prédios públicos',                'Inexigibilidade',    'Fornecimento', 'INEX 002/2026', 'SEMAD',   0, '2026-01-02', '2026-12-31', [[null, 'Fornecimento de água/esgoto – consumo estimado', 'MÊS', 12, 9500]], '1500 – Recursos Próprios'],
  [3,  'brisanet',    'CONTRATO', 'Link dedicado de internet 200Mbps para a sede e unidades',                        'Pregão Eletrônico',  'Serviço',      'PE 004/2026',   'SEMAD',   9, '2026-01-15', '2027-01-14', [[null, 'Link dedicado 200Mbps full duplex', 'MÊS', 12, 3200]], '1500 – Recursos Próprios'],
  [4,  'claro',       'CONTRATO', 'Telefonia móvel corporativa com 60 linhas e dados',                               'Pregão Eletrônico',  'Serviço',      'PE 005/2026',   'SEMAD',   9, '2026-01-15', '2027-01-14', [[null, 'Plano corporativo 60 linhas 10GB', 'MÊS', 12, 2950]], '1500 – Recursos Próprios'],
  [5,  'postosc',     'CONTRATO', 'Fornecimento parcelado de combustíveis para a frota municipal',                   'Pregão Presencial',  'Fornecimento', 'PP 001/2026',   'SEMAD',   0, '2026-01-02', '2026-12-31', [['gasolina', null, 'L', 40000, 6.79], ['diesel', null, 'L', 60000, 6.25], ['etanol', null, 'L', 8000, 4.99]], '1500 – Recursos Próprios'],
  [6,  'nordfarma',   'ATA',      'Registro de preços para aquisição de medicamentos básicos',                       'Pregão Eletrônico',  'Fornecimento', 'PE 002/2026',   'SESAU',   1, '2026-02-01', '2027-01-31', [['dipirona', null, 'CP', 200000, 0.12], ['paracetamol', null, 'CP', 150000, 0.18], ['soro', null, 'FR', 12000, 4.85]], '1600 – FMS'],
  [7,  'cirurgica',   'ATA',      'Registro de preços para material médico-hospitalar',                              'Pregão Eletrônico',  'Fornecimento', 'PE 003/2026',   'SESAU',   1, '2026-02-01', '2027-01-31', [['luva', null, 'CX', 3000, 28.9], ['seringa', null, 'UN', 50000, 0.89]], '1600 – FMS'],
  [8,  'bompreco',    'CONTRATO', 'Aquisição de gêneros alimentícios para a merenda escolar',                        'Pregão Eletrônico',  'Fornecimento', 'PE 006/2026',   'SEDUC',   2, '2026-02-01', '2026-12-31', [['arroz', null, 'KG', 12000, 5.49], ['feijao', null, 'KG', 6000, 8.9], ['carne', null, 'KG', 4500, 32.9], ['frango', null, 'KG', 6000, 12.5]], '1552 – PNAE'],
  [9,  'panificadora','CONTRATO', 'Fornecimento de pães e lanches para programas sociais',                           'Dispensa',           'Fornecimento', 'DISP 004/2026', 'SEMAS',   4, '2026-02-01', '2026-12-31', [['pao', null, 'KG', 3600, 16.9]], '1660 – FMAS'],
  [10, 'papelaria',   'CONTRATO', 'Aquisição de material de expediente para as secretarias',                         'Pregão Eletrônico',  'Fornecimento', 'PE 007/2026',   'SEMAD',   5, '2026-02-10', '2026-12-31', [['papel_a4', null, 'RESMA', 2400, 24.9], ['caneta', null, 'UN', 6000, 1.35], ['grampeador', null, 'UN', 120, 28.5]], '1500 – Recursos Próprios'],
  [11, 'g7',          'CONTRATO', 'Aquisição de equipamentos e suprimentos de informática',                          'Pregão Eletrônico',  'Fornecimento', 'PE 008/2026',   'SEMAD',   5, '2026-02-10', '2026-12-31', [['computador', null, 'UN', 40, 3890], ['impressora', null, 'UN', 15, 1850], ['toner', null, 'UN', 300, 89.9], ['notebook', null, 'UN', 10, 5590]], '1500 – Recursos Próprios'],
  [12, 'sertaoforte', 'CONTRATO', 'Reforma e ampliação da Escola Municipal José de Alencar',                         'Tomada de Preços',   'Obra',         'TP 001/2026',   'SEDUC',   3, '2026-03-01', '2026-10-31', [[null, 'Reforma e ampliação conforme planilha orçamentária', 'GL', 1, 487350.42]], '1542 – Precatórios FUNDEF'],
  [13, 'serrana',     'CONTRATO', 'Pavimentação em pedra tosca de ruas do Bairro Alto Alegre',                       'Concorrência',       'Obra',         'CC 001/2026',   'SEINFRA', 3, '2026-03-15', '2026-11-30', [[null, 'Pavimentação em pedra tosca – 12.400m²', 'M2', 12400, 58.75]], '1700 – Transferência Convênio'],
  [14, 'valecuru',    'CONTRATO', 'Locação de veículos leves para as equipes da Saúde',                              'Pregão Eletrônico',  'Serviço',      'PE 009/2026',   'SESAU',   1, '2026-02-01', '2027-01-31', [['loc_veiculo', null, 'MÊS', 60, 4200]], '1600 – FMS'],
  [15, 'santaclara',  'CONTRATO', 'Transporte escolar – rotas I a VIII da zona rural',                               'Pregão Eletrônico',  'Serviço',      'PE 010/2026',   'SEDUC',   2, '2026-02-01', '2026-12-20', [[null, 'Transporte escolar 8 rotas – km rodado', 'KM', 96000, 4.35]], '1553 – PNATE'],
  [16, 'jmr',         'CONTRATO', 'Serviços de limpeza e conservação predial com 18 postos',                         'Pregão Eletrônico',  'Serviço',      'PE 011/2026',   'SEMAD',   0, '2026-01-02', '2026-12-31', [['serv_limpeza', null, 'MÊS', 12, 38700]], '1500 – Recursos Próprios'],
  [17, 'luzsertao',   'CONTRATO', 'Aquisição de material elétrico para a iluminação pública',                        'Pregão Eletrônico',  'Fornecimento', 'PE 012/2026',   'SEINFRA', 3, '2026-03-01', '2026-12-31', [['luminaria', null, 'UN', 350, 385], ['cabo', null, 'M', 8000, 3.85]], '1755 – CIP'],
  [18, 'madeireira',  'CONTRATO', 'Aquisição de material de construção para manutenção predial',                     'Pregão Eletrônico',  'Fornecimento', 'PE 013/2026',   'SEINFRA', 3, '2026-03-01', '2026-12-31', [['cimento', null, 'SC', 2000, 34.5], ['areia', null, 'M3', 400, 95], ['brita', null, 'M3', 300, 110], ['tubopvc', null, 'BR', 500, 42.9]], '1500 – Recursos Próprios'],
  [19, 'impressul',   'CONTRATO', 'Serviços gráficos para as campanhas institucionais',                              'Pregão Eletrônico',  'Serviço',      'PE 014/2026',   'SECULT',  5, '2026-03-01', '2026-12-31', [['serv_grafico', null, 'MIL', 180, 420]], '1500 – Recursos Próprios'],
  [20, 'mobiliario',  'CONTRATO', 'Aquisição de conjuntos de carteiras escolares',                                   'Pregão Eletrônico',  'Fornecimento', 'PE 015/2026',   'SEDUC',   2, '2026-03-10', '2026-12-31', [['carteira', null, 'UN', 800, 289]], '1540 – FUNDEB 30%'],
  [21, 'polofrio',    'CONTRATO', 'Manutenção preventiva e corretiva de aparelhos de ar-condicionado',               'Dispensa',           'Serviço',      'DISP 006/2026', 'SEMAD',   0, '2026-03-01', '2026-12-31', [['manut_ar', null, 'UN', 120, 180]], '1500 – Recursos Próprios'],
  [22, 'irmaossilva', 'CONTRATO', 'Manutenção mecânica da frota municipal com fornecimento de peças',                'Pregão Presencial',  'Serviço',      'PP 002/2026',   'SEMAD',   0, '2026-02-01', '2026-12-31', [[null, 'Serviços mecânicos – hora técnica', 'H', 800, 120], ['oleo15w40', null, 'BD', 60, 480]], '1500 – Recursos Próprios'],
  [23, 'rodabem',     'CONTRATO', 'Aquisição de pneus e serviços de alinhamento para a frota',                       'Pregão Eletrônico',  'Fornecimento', 'PE 016/2026',   'SEMAD',   0, '2026-02-15', '2026-12-31', [['pneu13', null, 'UN', 80, 385], ['pneu_onibus', null, 'UN', 40, 2290]], '1500 – Recursos Próprios'],
  [24, 'labvida',     'CONTRATO', 'Prestação de serviços de análises clínicas complementares ao SUS',                'Credenciamento',     'Serviço',      'CRED 001/2026', 'SESAU',   1, '2026-02-01', '2027-01-31', [[null, 'Exames laboratoriais – tabela SUS + 40%', 'MÊS', 12, 18500]], '1600 – FMS'],
  [25, 'contabil',    'CONTRATO', 'Assessoria e consultoria contábil na gestão pública municipal',                   'Inexigibilidade',    'Serviço',      'INEX 003/2026', 'SEFIN',   6, '2026-01-02', '2026-12-31', [[null, 'Assessoria contábil mensal', 'MÊS', 12, 14800]], '1500 – Recursos Próprios'],
  [26, 'jeos',        'CONTRATO', 'Licenciamento de software de gestão de processos administrativos',                'Inexigibilidade',    'Serviço',      'INEX 004/2026', 'SEMAD',   9, '2026-01-02', '2026-12-31', [[null, 'Licença mensal plataforma jProcesso', 'MÊS', 12, 6900]], '1500 – Recursos Próprios'],
  [27, 'ednardo',     'CONTRATO', 'Locação de imóvel para funcionamento do CRAS',                                    'Dispensa',           'Locação',      'DISP 002/2026', 'SEMAS',   4, '2026-01-02', '2026-12-31', [[null, 'Aluguel mensal do imóvel – Rua das Flores, 120', 'MÊS', 12, 2800]], '1660 – FMAS'],
  [28, 'joselia',     'CONTRATO', 'Fornecimento de coffee break e refeições para eventos oficiais',                  'Dispensa',           'Fornecimento', 'DISP 007/2026', 'SECULT',  5, '2026-03-01', '2026-12-31', [[null, 'Coffee break tipo II (50 pessoas)', 'UN', 40, 850]], '1500 – Recursos Próprios'],
  [29, 'gilson',      'CONTRATO', 'Serviços de sonorização e iluminação para eventos culturais',                     'Dispensa',           'Serviço',      'DISP 008/2026', 'SECULT',  5, '2026-03-01', '2026-12-31', [[null, 'Sonorização de médio porte – diária', 'DIÁRIA', 30, 1500]], '1500 – Recursos Próprios'],
  [30, 'oxigenio',    'CONTRATO', 'Fornecimento de oxigênio medicinal para o Hospital Municipal',                    'Pregão Eletrônico',  'Fornecimento', 'PE 017/2026',   'SESAU',   1, '2026-02-01', '2027-01-31', [[null, 'Recarga cilindro O2 10m³', 'M3', 1200, 38.5]], '1600 – FMS'],
];

// ── Ordens de compra/serviço ─────────────────────────────────────────────────
// [key, contratoN, tipo, dataEmissao, status, frac, objeto, obsJustif]
const ORDENS_DEF = [
  ['oc_comb_mar',     5,  'COMPRA',  '2026-03-03', 'ATENDIDA', 0.08, 'Abastecimento da frota municipal – março/2026', 'Manutenção dos serviços essenciais e deslocamentos administrativos'],
  ['oc_comb_abr',     5,  'COMPRA',  '2026-04-02', 'ATENDIDA', 0.08, 'Abastecimento da frota municipal – abril/2026', 'Manutenção dos serviços essenciais e deslocamentos administrativos'],
  ['oc_comb_jun_sesau',5, 'COMPRA',  '2026-06-02', 'ATENDIDA', 0.07, 'Abastecimento das ambulâncias e veículos da Saúde – junho/2026', 'Garantia do transporte de pacientes e equipes do PSF'],
  ['oc_comb_jul',     5,  'COMPRA',  '2026-07-06', 'EMITIDA',  0.08, 'Abastecimento da frota municipal – julho/2026', 'Continuidade dos serviços de transporte administrativo'],
  ['oc_medic_abr',    6,  'COMPRA',  '2026-04-08', 'ATENDIDA', 0.15, 'Aquisição de medicamentos básicos – 1ª parcela', 'Reposição do estoque da Farmácia Central'],
  ['oc_medic_jun',    6,  'COMPRA',  '2026-06-08', 'ATENDIDA', 0.18, 'Aquisição de medicamentos básicos – 2ª parcela', 'Reposição do estoque da Farmácia Central'],
  ['oc_hosp_mai',     7,  'COMPRA',  '2026-05-05', 'ATENDIDA', 0.25, 'Material médico-hospitalar para o Hospital Municipal', 'Reposição de insumos para procedimentos ambulatoriais'],
  ['oc_merenda_mai',  8,  'COMPRA',  '2026-05-04', 'ATENDIDA', 0.2,  'Gêneros alimentícios da merenda – maio/2026', 'Atendimento do cardápio nutricional do mês'],
  ['oc_merenda_jun',  8,  'COMPRA',  '2026-06-03', 'ATENDIDA', 0.2,  'Gêneros alimentícios da merenda – junho/2026', 'Atendimento do cardápio nutricional do mês'],
  ['oc_paes_jun',     9,  'COMPRA',  '2026-06-05', 'ATENDIDA', 0.1,  'Pães e lanches para o Serviço de Convivência', 'Atividades do SCFV no CRAS'],
  ['oc_exped_mar',    10, 'COMPRA',  '2026-03-12', 'ATENDIDA', 0.3,  'Material de expediente – distribuição geral', 'Abastecimento do almoxarifado central'],
  ['oc_exped_jul',    10, 'COMPRA',  '2026-07-07', 'EMITIDA',  0.25, 'Material de expediente – 2ª remessa', 'Reposição de estoque do almoxarifado'],
  ['oc_info_jun',     11, 'COMPRA',  '2026-06-10', 'ATENDIDA', 0.35, 'Computadores e impressoras para a sede da Prefeitura', 'Modernização do parque tecnológico'],
  ['oc_toner_abr',    11, 'COMPRA',  '2026-04-15', 'ATENDIDA', 0.1,  'Toners para as impressoras das secretarias', 'Reposição de suprimentos de impressão'],
  ['oc_eletr_jun',    17, 'COMPRA',  '2026-06-15', 'EMITIDA',  0.3,  'Luminárias LED para a Av. Principal', 'Substituição de luminárias queimadas'],
  ['oc_constr_mai',   18, 'COMPRA',  '2026-05-11', 'ATENDIDA', 0.25, 'Material de construção para reforma do posto de saúde', 'Manutenção predial da UBS Centro'],
  ['oc_constr_jul',   18, 'COMPRA',  '2026-07-08', 'EMITIDA',  0.15, 'Material de construção – manutenção de calçadas', 'Acessibilidade no entorno da Praça da Matriz'],
  ['oc_cart_mai',     20, 'COMPRA',  '2026-05-18', 'ATENDIDA', 0.5,  'Carteiras escolares para as escolas da zona rural', 'Renovação do mobiliário escolar'],
  ['oc_pneus_abr',    23, 'COMPRA',  '2026-04-20', 'ATENDIDA', 0.3,  'Pneus para os ônibus do transporte escolar', 'Segurança do transporte de alunos'],
  ['oc_oxig_jun',     30, 'COMPRA',  '2026-06-12', 'ATENDIDA', 0.25, 'Recarga de cilindros de oxigênio medicinal', 'Abastecimento do Hospital Municipal'],
  ['oc_graf_jun',     19, 'SERVICO', '2026-06-18', 'EMITIDA',  0.2,  'Impressão de material da campanha de vacinação', 'Campanha Julho de Vacinação contra Influenza'],
  ['os_limp_mai',     16, 'SERVICO', '2026-05-02', 'ATENDIDA', 1/12, 'Serviços de limpeza predial – maio/2026', 'Medição mensal contratual'],
  ['os_limp_jun',     16, 'SERVICO', '2026-06-01', 'ATENDIDA', 1/12, 'Serviços de limpeza predial – junho/2026', 'Medição mensal contratual'],
  ['os_arcond_jun',   21, 'SERVICO', '2026-06-09', 'ATENDIDA', 0.2,  'Manutenção preventiva dos ar-condicionados da sede', 'Plano semestral de manutenção'],
  ['os_frota_mai',    22, 'SERVICO', '2026-05-13', 'ATENDIDA', 0.15, 'Revisão da ambulância FIA-2E45 e troca de óleo', 'Manutenção corretiva da frota da Saúde'],
  ['os_frota_jul',    22, 'SERVICO', '2026-07-09', 'EMITIDA',  0.1,  'Revisão do caminhão caçamba QRA-8C31', 'Manutenção preventiva 20.000km'],
  ['os_consult_jun',  25, 'SERVICO', '2026-06-01', 'ATENDIDA', 1/12, 'Assessoria contábil – competência junho/2026', 'Execução mensal contratual'],
  ['os_som_jun',      29, 'SERVICO', '2026-06-20', 'ATENDIDA', 0.13, 'Sonorização do São João da Praça – 2 diárias', 'Festejos juninos oficiais do Município'],
  ['os_tvescolar_jun',15, 'SERVICO', '2026-06-01', 'ATENDIDA', 1/12, 'Transporte escolar – medição junho/2026', 'Medição mensal das rotas I a VIII'],
  ['oc_luva_mar',     7,  'COMPRA',  '2026-03-18', 'CANCELADA',0.1,  'Luvas de procedimento – pedido complementar', 'Cancelada: quantitativo revisto pela CAF'],
  ['os_coffee_abr',   28, 'SERVICO', '2026-04-22', 'CANCELADA',0.05, 'Coffee break – Conferência de Saúde', 'Cancelada: evento adiado pelo Conselho'],
  ['oc_pneu_jul',     23, 'COMPRA',  '2026-07-10', 'EMITIDA',  0.15, 'Pneus para veículos leves da Administração', 'Reposição por desgaste – frota administrativa'],
];

// ── Contas bancárias ─────────────────────────────────────────────────────────
// [nome, banco, codigo, secSigla|null, tipo, natureza]
const CONTAS_DEF = [
  ['FPM – Fundo de Participação dos Municípios', 'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['ICMS – Cota-parte',                          'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['IPVA – Cota-parte',                          'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['ITR – Cota-parte',                           'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['ISS – Arrecadação Própria',                  'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['IPTU – Arrecadação Própria',                 'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['FUNDEB – Principal',                         'Banco do Brasil', '001', 'SEDUC', 'corrente', 'transferencia'],
  ['FUNDEB – VAAT',                              'Banco do Brasil', '001', 'SEDUC', 'corrente', 'transferencia'],
  ['Salário-Educação (QSE)',                     'Banco do Brasil', '001', 'SEDUC', 'corrente', 'transferencia'],
  ['PNAE – Merenda Escolar',                     'Banco do Brasil', '001', 'SEDUC', 'corrente', 'convenio'],
  ['PNATE – Transporte Escolar',                 'Banco do Brasil', '001', 'SEDUC', 'corrente', 'convenio'],
  ['Educação – Recursos Próprios 25%',           'Banco do Brasil', '001', 'SEDUC', 'corrente', 'custeio'],
  ['FMS – Bloco Manutenção',                     'Caixa Econômica Federal', '104', 'SESAU', 'corrente', 'transferencia'],
  ['FMS – Bloco Investimento',                   'Caixa Econômica Federal', '104', 'SESAU', 'corrente', 'investimento'],
  ['Atenção Primária – PAB',                     'Caixa Econômica Federal', '104', 'SESAU', 'corrente', 'transferencia'],
  ['Vigilância em Saúde',                        'Caixa Econômica Federal', '104', 'SESAU', 'corrente', 'transferencia'],
  ['Assistência Farmacêutica',                   'Caixa Econômica Federal', '104', 'SESAU', 'corrente', 'transferencia'],
  ['FMAS – Fundo Municipal de Assistência',      'Caixa Econômica Federal', '104', 'SEMAS', 'corrente', 'transferencia'],
  ['IGD-M – Bolsa Família',                      'Caixa Econômica Federal', '104', 'SEMAS', 'corrente', 'transferencia'],
  ['IGD-SUAS',                                   'Caixa Econômica Federal', '104', 'SEMAS', 'corrente', 'transferencia'],
  ['Bloco Proteção Social Básica',               'Caixa Econômica Federal', '104', 'SEMAS', 'corrente', 'transferencia'],
  ['Bloco Proteção Social Especial',             'Caixa Econômica Federal', '104', 'SEMAS', 'corrente', 'transferencia'],
  ['Folha de Pagamento',                         'Banco do Brasil', '001', 'SEMAD', 'corrente', 'pessoal'],
  ['Conta Movimento Geral',                      'Banco do Brasil', '001', 'SEFIN', 'corrente', 'custeio'],
  ['Convênio SOP – Pavimentação Alto Alegre',    'Caixa Econômica Federal', '104', 'SEINFRA', 'corrente', 'convenio'],
  ['Convênio SESPORTE – Quadra Poliesportiva',   'Caixa Econômica Federal', '104', 'SEJEL', 'corrente', 'convenio'],
  ['FEP/Royalties',                              'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['CIDE – Combustíveis',                        'Banco do Brasil', '001', 'SEFIN', 'corrente', 'receita'],
  ['CIP – Contribuição de Iluminação Pública',   'Banco do Brasil', '001', 'SEINFRA', 'corrente', 'custeio'],
  ['Aplicação Financeira – BB CDB DI',           'Banco do Brasil', '001', 'SEFIN', 'investimento', 'outras'],
];

// ── Receitas fev–jul/2026 ────────────────────────────────────────────────────
// [contaIdx, mes, dia, descricao, valorBase]
const RECEITAS_DEF = [];
const MESES_REC = [[2, 'fevereiro'], [3, 'março'], [4, 'abril'], [5, 'maio'], [6, 'junho'], [7, 'julho']];
for (const [m, nome] of MESES_REC) {
  RECEITAS_DEF.push([0, m, 10, `FPM – 1º decêndio de ${nome}/2026`, 385000]);
  RECEITAS_DEF.push([0, m, 20, `FPM – 2º decêndio de ${nome}/2026`, 352000]);
  RECEITAS_DEF.push([1, m, 15, `ICMS – cota-parte ${nome}/2026`, 148000]);
  RECEITAS_DEF.push([6, m, 28, `FUNDEB – repasse de ${nome}/2026`, 296000]);
  RECEITAS_DEF.push([12, m, 5, `FMS – bloco manutenção ${nome}/2026`, 187000]);
}
RECEITAS_DEF.push([9, 3, 12, 'PNAE – 1ª parcela 2026', 48500]);
RECEITAS_DEF.push([9, 5, 14, 'PNAE – 2ª parcela 2026', 48500]);
RECEITAS_DEF.push([10, 4, 8, 'PNATE – 1ª parcela 2026', 36200]);
RECEITAS_DEF.push([5, 4, 30, 'IPTU – cota única e 1ª parcela', 92300]);
RECEITAS_DEF.push([4, 6, 30, 'ISS – arrecadação acumulada 1º semestre', 138400]);
RECEITAS_DEF.push([17, 3, 22, 'FMAS – piso básico fixo 1º trimestre', 54800]);
RECEITAS_DEF.push([24, 5, 19, 'Convênio SOP – 1ª parcela pavimentação', 364000]);

const build = (ctx) => {
  const t0 = fmtTs(mk(2026, 1, 20, 10));

  // Credores (ids 1..N)
  ctx.credor = {};
  ctx.credRows = CREDORES_DEF.map(([key, tipo, razao, fantasia, cidade], i) => {
    const id = i + 1;
    const doc = tipo === 'Física' ? cpf().replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cnpj();
    ctx.credor[key] = { id, razao, fantasia, doc, cidade, tipo };
    return [id, tipo, razao, fantasia, doc, emailDeCredor(razao), fone(), fone(), `62${ri(700, 799)}-000`,
      pick(['Rua', 'Av.']) + ' ' + pick(['Central', 'do Comércio', 'Cel. Souza', 'Padre Cícero', 'das Carnaúbas', 'Dom José', 'Santos Dumont']) + ', ' + ri(10, 1500),
      String(ri(10, 999)), null, pick(['Centro', 'Alto Alegre', 'Planalto', 'Distrito Industrial', 'Cohab']), cidade, 'CE', 'ATIVO', t0, t0];
  });
  ctx.credCols = ['id', 'tipo', 'razao_social', 'nome_fantasia', 'cnpj_cpf', 'email', 'telefone', 'celular', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'status', 'created_at', 'updated_at'];

  // Catálogo de itens (ids 1..N)
  ctx.cat = {};
  ctx.catRows = CATALOGO_DEF.map(([key, desc, categoria, unid, espec], i) => {
    const id = i + 1;
    ctx.cat[key] = { id, desc, unid, categoria };
    return [id, String(id).padStart(5, '0'), desc, categoria, unid, espec, 'ATIVO', true, t0, t0];
  });
  ctx.catCols = ['id', 'codigo', 'descricao', 'categoria', 'unidade_medida', 'especificacao', 'status', 'validado', 'created_at', 'updated_at'];

  // Contratos + vínculos
  ctx.contrato = {};
  ctx.ctrRows = []; ctx.vincRows = [];
  let vincId = 1;
  for (const [n, credorKey, tipoC, objeto, modalidade, tipoObj, licit, secSigla, fiscalIdx, vigIni, vigFim, itens, fonte] of CONTRATOS_DEF) {
    const numero = `${String(n).padStart(3, '0')}/2026`;
    let valor = 0;
    const itensCtr = itens.map(([catKey, descLivre, unid, qtd, vu], ordem) => {
      const cat = catKey ? ctx.cat[catKey] : null;
      valor += qtd * vu;
      return { itemId: cat ? cat.id : null, descricao: cat ? cat.desc : descLivre, unidade: cat ? cat.unid : unid, qtd, vu, ordem };
    });
    valor = money(valor);
    const fiscal = ctx.agentes[fiscalIdx].nome;
    const assinatura = fmtD(addD(new Date(vigIni + 'T12:00:00Z'), -ri(2, 8)));
    ctx.contrato[n] = { id: n, numero, objeto, credorKey, valor, secSigla, fiscal, itens: itensCtr, vigIni, vigFim, modalidade, licit };
    ctx.ctrRows.push([n, tipoC, numero, objeto, modalidade, tipoObj, licit, ctx.credor[credorKey].id, valor, vigIni, vigFim, assinatura,
      ctx.sec[secSigla].nome, fiscal, [fonte], [`02.${String(ri(1, 12)).padStart(2, '0')}.00 3.3.90.${ri(30, 39)}`], null, 'ATIVO', 30,
      pick(['Banco do Brasil', 'Caixa Econômica', 'Bradesco']), String(ri(1000, 4999)), `${ri(10000, 89999)}-${ri(0, 9)}`, t0, t0]);
    for (const it of itensCtr) {
      ctx.vincRows.push([vincId++, n, it.itemId, null, it.descricao, it.unidade, it.qtd, it.vu, it.ordem, t0, t0]);
    }
  }
  ctx.vincMax = vincId - 1;
  ctx.ctrCols = ['id', 'tipo_contrato', 'numero_contrato', 'objeto', 'modalidade', 'tipo_objeto', 'numero_licitacao', 'credor_id', 'valor', 'vigencia_inicio', 'vigencia_fim', 'data_assinatura', 'secretaria', 'fiscal', 'fontes_recurso', 'dotacoes', 'observacoes', 'status', 'dias_alerta', 'banco', 'agencia', 'conta', 'created_at', 'updated_at'];
  ctx.vincCols = ['id', 'contrato_id', 'item_id', 'lote', 'descricao', 'unidade', 'quantidade', 'valor_unitario', 'ordem', 'created_at', 'updated_at'];

  // Ordens + itens
  ctx.ordem = {};
  ctx.ordRows = []; ctx.ordItemRows = [];
  let seqOC = 0, seqOS = 0, ordId = 0, ordItemId = 0;
  const porData = [...ORDENS_DEF].sort((a, b) => a[3].localeCompare(b[3]));
  for (const [key, ctrN, tipo, dataEm, status, frac, objeto, justif] of porData) {
    const ctr = ctx.contrato[ctrN];
    const numero = tipo === 'COMPRA' ? `OC ${String(++seqOC).padStart(3, '0')}/2026` : `OS ${String(++seqOS).padStart(3, '0')}/2026`;
    const id = ++ordId;
    let total = 0;
    const itens = ctr.itens.map((it, i) => {
      const qtd = Math.max(1, Math.round(it.qtd * frac));
      const vt = money(qtd * it.vu);
      total += vt;
      return { qtd, vu: it.vu, vt, descricao: it.descricao, unidade: it.unidade, itemId: it.itemId, ordem: i };
    });
    total = money(total);
    const ts = fmtTs(mk(2026, +dataEm.slice(5, 7), +dataEm.slice(8, 10), ri(8, 16)));
    ctx.ordem[key] = { id, numero, tipo, contratoN: ctrN, dataEm, status, total, objeto, credorKey: ctr.credorKey, secSigla: ctr.secSigla, itens };
    ctx.ordRows.push([id, tipo, numero, ctrN, dataEm, fmtD(addD(new Date(dataEm + 'T12:00:00Z'), ri(5, 20))), objeto, justif,
      ctx.sec[ctr.secSigla].nome, ctr.fiscal, 'Almoxarifado Central – Rua Cel. Diogo Gomes, 55, Centro, Modelo/CE', total, null, status, ts, ts]);
    for (const it of itens) {
      ctx.ordItemRows.push([++ordItemId, id, it.itemId, it.descricao, it.unidade, null, null, it.qtd, it.vu, it.vt, it.ordem, ts, ts]);
    }
  }
  ctx.ordMax = ordId; ctx.ordItemMax = ordItemId;
  ctx.ordCols = ['id', 'tipo', 'numero', 'contrato_id', 'data_emissao', 'data_entrega_prevista', 'objeto', 'justificativa', 'secretaria', 'fiscal_responsavel', 'local_entrega', 'valor_total', 'observacoes', 'status', 'created_at', 'updated_at'];
  ctx.ordItemCols = ['id', 'ordem_id', 'item_id', 'descricao', 'unidade', 'lote', 'codigo_item', 'quantidade', 'valor_unitario', 'valor_total', 'ordem', 'created_at', 'updated_at'];

  // Contas bancárias
  ctx.contas = [];
  ctx.contaRows = CONTAS_DEF.map(([nome, banco, codigo, secSigla, tipo, natureza]) => {
    const id = uuid();
    ctx.contas.push({ id, nome, banco, codigo });
    return [id, nome, secSigla ? ctx.sec[secSigla].id : null, banco, codigo, String(ri(100, 4999)), String(ri(0, 9)),
      String(ri(10000, 99999)), String(ri(0, 9)), tipo, natureza, 'Prefeitura Municipal de Modelo', '01234567000159', null, true, t0, t0];
  });
  ctx.contaCols = ['id', 'nome', 'secretaria_id', 'banco_nome', 'banco_codigo', 'agencia', 'agencia_digito', 'conta', 'conta_digito', 'tipo', 'natureza', 'titular', 'cnpj_titular', 'observacao', 'ativo', 'created_at', 'updated_at'];

  // Receitas
  ctx.recRows = RECEITAS_DEF.map(([contaIdx, m, d, desc, base]) => {
    const ts = fmtTs(mk(2026, m, d, ri(9, 15)));
    return [uuid(), ctx.contas[contaIdx].id, `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, desc, money(base * (0.92 + rand() * 0.16)), null, ts, ts];
  });
  ctx.recCols = ['id', 'conta_id', 'data', 'descricao', 'valor', 'observacao', 'created_at', 'updated_at'];

  // Despesas da tesouraria (pagamentos de ordens ATENDIDAS)
  const contaMovimento = ctx.contas[23]; // Conta Movimento Geral
  const contaFMS = ctx.contas[12];
  const contaPNAE = ctx.contas[9];
  const contaFUNDEB = ctx.contas[6];
  const contaPorSec = { SESAU: contaFMS, SEDUC: contaFUNDEB };
  ctx.despRows = [];
  for (const key of Object.keys(ctx.ordem)) {
    const o = ctx.ordem[key];
    if (o.status !== 'ATENDIDA') continue;
    let conta = contaPorSec[o.secSigla] || contaMovimento;
    if (key.includes('merenda')) conta = contaPNAE;
    const dtPag = fmtD(addD(new Date(o.dataEm + 'T12:00:00Z'), ri(18, 35)));
    const liquido = money(o.total * (1 - (o.tipo === 'SERVICO' ? 0.06 : 0.015)));
    const ts = fmtTs(mk(2026, +dtPag.slice(5, 7), +dtPag.slice(8, 10), ri(9, 16)));
    ctx.despRows.push([uuid(), o.id, conta.id, dtPag, o.total, liquido,
      `Pagamento ${o.numero} – ${ctx.credor[o.credorKey].razao}`, ts, ts]);
  }
  ctx.despCols = ['id', 'ordem_id', 'conta_id', 'data_pagamento', 'valor_bruto', 'valor_liquido', 'observacao', 'created_at', 'updated_at'];
};

const { rand } = require('./util');
const { emailDe } = require('./util');
const emailDeCredor = (razao) => emailDe(razao.replace(/[^A-Za-zÀ-ÿ ]/g, ''), 'gmail.com').replace('..', '.');

module.exports = { build, CREDORES_DEF, CATALOGO_DEF, CONTRATOS_DEF, ORDENS_DEF };
