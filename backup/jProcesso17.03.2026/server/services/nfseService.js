/**
 * nfseService.js — Consulta e mapeamento de NFS-e (Padrão Nacional SEFIN/ABRASF)
 *
 * Fluxo:
 *  entrada: chave de acesso (string numérica) OU URL de QR Code
 *    1. extrairChaveDeUrl()   — normaliza o input e extrai a chave
 *    2. consultarApiNFSe()    — chama a API nacional (com fallback mock)
 *    3. mapearNFSe()          — transforma resposta nos campos do sistema
 *    4. validarTomador()      — rejeita notas não endereçadas à Prefeitura de Irauçuba
 */

'use strict';

const axios = require('axios');

// ─── Constantes ───────────────────────────────────────────────────────────────

const CNPJ_TOMADOR_AUTORIZADO   = '07683188000169'; // Prefeitura de Irauçuba — 07.683.188/0001-69
const CNPJ_TOMADOR_FORMATADO    = '07.683.188/0001-69';

// API Padrão Nacional NFS-e (SEFIN / RFB)
// Portal público:    https://nfse.gov.br/NFSe/api/v1/nfse/{chNFSe}  (tenta sem auth)
// IST (integração):  https://ist.prod.nfse.gov.br/NFSe/api/v1        (requer Bearer)
// Homologação:       https://ist.hom.nfse.gov.br/NFSe/api/v1
//
// Para usar dados reais configure no server/.env:
//   NFSE_API_URL=https://nfse.gov.br/NFSe/api/v1
//   NFSE_API_TOKEN=<seu token OAuth2 do SEFIN>   ← opcional se o portal for público
const NFSE_API_BASE  = process.env.NFSE_API_URL   || 'https://nfse.gov.br/NFSe/api/v1';
const NFSE_API_TOKEN = process.env.NFSE_API_TOKEN || '';

// Timeout para chamada externa (ms)
const HTTP_TIMEOUT = parseInt(process.env.NFSE_API_TIMEOUT || '10000', 10);

// ─── 1. Extração da chave de acesso ──────────────────────────────────────────

/**
 * Recebe uma string e retorna apenas a chave de acesso NFS-e numérica.
 *
 * Formatos suportados:
 *  - Chave direta:  "31240100000000700999...0000012345600001"  (≥ 20 dígitos)
 *  - QR Code nacional: "https://nfse.gov.br/qrcode?c=CHAVE"
 *  - Variantes com parâmetros: chNFSe=, c=, id=, codVerif=, chave=
 *  - URLs de portais municipais (Betha, Governa, Pronim, etc.)
 *
 * @param {string} input
 * @returns {{ chave: string, fonte: 'chave_direta'|'qrcode_url' }}
 * @throws {Error} se não conseguir extrair uma chave válida
 */
function extrairChaveDeUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input inválido: informe a chave de acesso ou URL do QR Code');
  }

  const txt = input.trim();

  // ── Chave direta (toda numérica) ────────────────────────────────────────
  if (/^\d{20,}$/.test(txt)) {
    return { chave: txt, fonte: 'chave_direta' };
  }

  // ── QR Code / URL ────────────────────────────────────────────────────────
  let url;
  try {
    url = new URL(txt);
  } catch {
    // Não é URL nem chave numérica pura — tenta extrair dígitos do texto
    const soDigitos = txt.replace(/\D/g, '');
    if (soDigitos.length >= 20) {
      return { chave: soDigitos, fonte: 'chave_direta' };
    }
    throw new Error('Formato não reconhecido: informe uma chave de acesso numérica ou URL de QR Code válida');
  }

  const params = url.searchParams;

  // Parâmetros mais comuns em portais NFS-e municipais / nacional
  const candidatos = [
    params.get('chNFSe'),
    params.get('c'),
    params.get('chave'),
    params.get('id'),
    params.get('codVerif'),
    params.get('nfse'),
    // Encoding duplo (alguns portais codificam 2x)
    ...Array.from(params.values()),
    // Último segmento do path (ex: /nfse/CHAVE)
    url.pathname.split('/').pop()
  ];

  for (const cand of candidatos) {
    if (!cand) continue;
    const soDigitos = String(cand).replace(/\D/g, '');
    if (soDigitos.length >= 20) {
      return { chave: soDigitos, fonte: 'qrcode_url' };
    }
  }

  throw new Error(`Não foi possível extrair a chave de acesso da URL: ${txt}`);
}

// ─── 2. Consulta à API Nacional ──────────────────────────────────────────────

/**
 * Consulta a API Nacional NFS-e e retorna o objeto JSON da nota.
 *
 * Estratégia:
 *  1. Tenta sem Authorization (portal público — pode funcionar sem token)
 *  2. Se 401/403 e há token configurado, tenta de novo com Bearer
 *  3. Se ainda 401/403 → lança erro com instruções de configuração (NÃO usa mock)
 *  4. Se 404 → lança erro "nota não encontrada" (NÃO usa mock)
 *  5. Apenas em erros de REDE (timeout, ECONNREFUSED, etc.) → mock como último recurso
 *
 * @param {string} chave
 * @returns {Promise<{ dados: object, fonte: 'api_nacional'|'mock' }>}
 */
async function consultarApiNFSe(chave) {
  const url = `${NFSE_API_BASE}/nfse/${chave}`;

  const tentativa = async (comToken) => {
    const headers = { 'Accept': 'application/json' };
    if (comToken && NFSE_API_TOKEN) {
      headers['Authorization'] = `Bearer ${NFSE_API_TOKEN}`;
    }
    return axios.get(url, { timeout: HTTP_TIMEOUT, headers });
  };

  let lastStatus = null;

  // ── Tentativa 1: sem token (portal público) ─────────────────────────────
  try {
    const resp = await tentativa(false);
    console.info(`[nfseService] API real consultada com sucesso (sem token): ${url}`);
    return { dados: resp.data, fonte: 'api_nacional' };
  } catch (err) {
    lastStatus = err?.response?.status;

    if (lastStatus === 404) {
      throw new Error('NFS-e não encontrada na base nacional (chave inexistente ou já cancelada)');
    }

    // 401/403 → tenta com token (se configurado)
    if ((lastStatus === 401 || lastStatus === 403) && NFSE_API_TOKEN) {
      try {
        const resp2 = await tentativa(true);
        console.info(`[nfseService] API real consultada com Bearer token: ${url}`);
        return { dados: resp2.data, fonte: 'api_nacional' };
      } catch (err2) {
        lastStatus = err2?.response?.status;
        if (lastStatus === 404) {
          throw new Error('NFS-e não encontrada na base nacional (chave inexistente ou já cancelada)');
        }
      }
    }

    // Autenticação falhou de vez: informa ao usuário como configurar
    if (lastStatus === 401 || lastStatus === 403) {
      throw Object.assign(
        new Error(
          'A API NFS-e Nacional exige autenticação.\n' +
          'Configure no servidor (server/.env):\n' +
          '  NFSE_API_URL=https://nfse.gov.br/NFSe/api/v1\n' +
          '  NFSE_API_TOKEN=<token OAuth2 emitido pelo SEFIN/RFB>\n\n' +
          'Obtenha o token em: https://nfse.gov.br/'
        ),
        { code: 'NFSE_AUTH_REQUIRED', status: 401 }
      );
    }

    // Erro de rede (ECONNREFUSED, timeout, DNS) → mock como fallback
    if (!lastStatus) {
      console.warn(`[nfseService] API inacessível (${err.code || err.message}) — usando mock`);
      return { dados: gerarMockNFSe(chave), fonte: 'mock' };
    }

    // Outro erro HTTP inesperado → mock com aviso
    console.warn(`[nfseService] API retornou HTTP ${lastStatus} — usando mock`);
    return { dados: gerarMockNFSe(chave), fonte: 'mock' };
  }
}

// ─── 3. Mock realista (estrutura padrão nacional SEFIN 2024) ─────────────────

function gerarMockNFSe(chave) {
  // Extrai componentes da chave quando possível
  // Formato nacional: cMunEmit(7) + AnoMes(4) + CNPJ(14) + tpAmb(1) + cNF(8) + cVerif(2) = variável
  const cnpjEmitente = chave.length >= 32 ? chave.substring(11, 25) : '00000000000191';
  const anoMes       = chave.length >= 11 ? chave.substring(7, 11)  : String(new Date().getFullYear()).substring(0, 4);

  return {
    infNFSe: {
      Id: chave,
      versao: '1.00',
      // Identificação
      optante_simples_nacional: '1',
      // Competência
      compet: `${anoMes}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
      data_emissao: new Date().toISOString(),
      // Prestador (Fornecedor / Emitente)
      prest_serv: {
        cnpj:         cnpjEmitente.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
        razao_social: 'EMPRESA PRESTADORA DE SERVICOS LTDA (MOCK)',
        endereco: {
          logradouro: 'Rua das Flores',
          numero: '100',
          cidade: 'Irauçuba',
          uf: 'CE',
          cep: '62600-000'
        }
      },
      // Tomador (quem contratou = Prefeitura de Irauçuba)
      tom_serv: {
        cnpj:         CNPJ_TOMADOR_FORMATADO,
        razao_social: 'MUNICIPIO DE IRAUCUBA',
        inscricao_municipal: ''
      },
      // Serviços prestados
      serv: {
        item_lista: '14.05',
        descricao: 'Prestação de serviços de manutenção e conservação (MOCK)',
        valor_servicos: '5800.00',
        valor_deducoes: '0.00',
        valor_pis: '94.60',
        valor_cofins: '268.54',
        valor_inss: '0.00',
        valor_ir: '0.00',
        valor_csll: '145.00',
        valor_iss: '174.00',
        aliquota: '3.00',
        base_calculo: '5800.00',
        valor_liquido: '5117.86'
      },
      // Número / RPS
      inf_rps_substituido: null,
      numero: '000' + chave.slice(-4),
      codigo_verificacao: chave.slice(-8),
      // Lista de itens/materiais materializados na NFS-e (campo livre)
      itens: [
        {
          descricao:      'Mão de obra especializada (MOCK)',
          quantidade:     1,
          valor_unitario: 4000.00,
          valor_total:    4000.00
        },
        {
          descricao:      'Material consumido (MOCK)',
          quantidade:     10,
          valor_unitario: 180.00,
          valor_total:    1800.00
        }
      ]
    }
  };
}

// ─── 4. Mapper — API → campos do sistema ─────────────────────────────────────

/**
 * Transforma o objeto JSON da API NFS-e nos campos esperados pelo sistema.
 *
 * @param {{ dados: object, fonte: string }} result
 * @returns {{
 *   chave_nfse: string,
 *   numero_nfse: string,
 *   codigo_verificacao: string,
 *   data_emissao: string,            // YYYY-MM-DD
 *   competencia: string,             // YYYY-MM
 *   fornecedor_cnpj: string,         // apenas dígitos
 *   fornecedor_cnpj_fmt: string,     // formatado
 *   fornecedor_nome: string,
 *   tomador_cnpj: string,            // apenas dígitos
 *   tomador_nome: string,
 *   valor_servicos: number,
 *   valor_deducoes: number,
 *   valor_liquido: number,
 *   valor_total: number,
 *   valor_iss: number,
 *   aliquota_iss: number,
 *   item_lista_servicos: string,
 *   descricao_servico: string,
 *   itens_lista: Array<{descricao, quantidade, valor_unitario, valor_total}>,
 *   fonte: string
 * }}
 */
function mapearNFSe({ dados, fonte }) {
  // Suporte a diferentes wrappings do JSON da API
  const inf = dados?.infNFSe
           || dados?.nfse?.infNFSe
           || dados?.NFSe?.infNFSe
           || dados;

  const prest = inf?.prest_serv || inf?.prestador || {};
  const tom   = inf?.tom_serv   || inf?.tomador   || {};
  const serv  = inf?.serv       || inf?.servico    || {};

  // ── Datas ────────────────────────────────────────────────────────────────
  const dataRaw = inf?.data_emissao || inf?.dataEmissao || '';
  const dataEmissao = dataRaw ? dataRaw.split('T')[0] : '';
  const competencia = inf?.compet || inf?.competencia || dataEmissao.substring(0, 7);

  // ── CNPJs ────────────────────────────────────────────────────────────────
  const cnpjForn    = limparCNPJ(prest?.cnpj || prest?.Cnpj || '');
  const cnpjFornFmt = formatarCNPJ(cnpjForn);
  const cnpjTom     = limparCNPJ(tom?.cnpj   || tom?.Cnpj   || '');

  // ── Valores ──────────────────────────────────────────────────────────────
  const valorServicos = parseNum(serv?.valor_servicos || serv?.valorServicos);
  const valorDeducoes = parseNum(serv?.valor_deducoes || serv?.valorDeducoes);
  const valorLiquido  = parseNum(serv?.valor_liquido  || serv?.valorLiquido || valorServicos - valorDeducoes);
  const valorISS      = parseNum(serv?.valor_iss      || serv?.valorIss);
  const aliquotaISS   = parseNum(serv?.aliquota       || serv?.aliquotaIss || 0);

  // Valor total = líquido (já com deduções e tributos retidos)
  const valorTotal = valorLiquido || valorServicos;

  // ── Itens ────────────────────────────────────────────────────────────────
  let itensLista = [];
  if (Array.isArray(inf?.itens)) {
    itensLista = inf.itens.map(it => ({
      descricao:      it?.descricao      || '',
      quantidade:     parseNum(it?.quantidade     || 1),
      valor_unitario: parseNum(it?.valor_unitario || valorServicos),
      valor_total:    parseNum(it?.valor_total    || valorServicos)
    }));
  } else {
    // NFS-e clássica não tem lista de itens → cria um único item com a descrição do serviço
    itensLista = [{
      descricao:      serv?.descricao || 'Serviço conforme NFS-e',
      quantidade:     1,
      valor_unitario: valorTotal,
      valor_total:    valorTotal
    }];
  }

  return {
    chave_nfse:           inf?.Id || inf?.id || '',
    numero_nfse:          String(inf?.numero || ''),
    codigo_verificacao:   inf?.codigo_verificacao || '',
    data_emissao:         dataEmissao,
    competencia,
    fornecedor_cnpj:      cnpjForn,
    fornecedor_cnpj_fmt:  cnpjFornFmt,
    fornecedor_nome:      prest?.razao_social || prest?.xNome || '',
    tomador_cnpj:         cnpjTom,
    tomador_nome:         tom?.razao_social   || tom?.xNome   || '',
    valor_servicos:       valorServicos,
    valor_deducoes:       valorDeducoes,
    valor_liquido:        valorLiquido,
    valor_total:          valorTotal,
    valor_iss:            valorISS,
    aliquota_iss:         aliquotaISS,
    item_lista_servicos:  serv?.item_lista    || serv?.itemListaServico || '',
    descricao_servico:    serv?.descricao     || '',
    itens_lista:          itensLista,
    fonte
  };
}

// ─── 5. Validação de tomador ──────────────────────────────────────────────────

/**
 * Lança erro se o CNPJ do tomador não for o da Prefeitura de Irauçuba.
 * @param {string} cnpjTomador — apenas dígitos
 */
function validarTomador(cnpjTomador) {
  const cnpj = limparCNPJ(cnpjTomador);
  if (cnpj !== CNPJ_TOMADOR_AUTORIZADO) {
    const cnpjFmt = formatarCNPJ(cnpj) || cnpjTomador;
    throw Object.assign(
      new Error(
        `Nota Fiscal não pertence a este órgão.\n` +
        `Tomador na nota: ${cnpjFmt}\n` +
        `Tomador esperado: ${CNPJ_TOMADOR_FORMATADO} (Prefeitura de Irauçuba)`
      ),
      { code: 'TOMADOR_INVALIDO', status: 422 }
    );
  }
}

// ─── 6. Função principal (export) ────────────────────────────────────────────

/**
 * Pipeline completo: recebe chave ou URL → consulta → mapeia → valida.
 *
 * @param {string} input  Chave de acesso NFS-e ou URL de QR Code
 * @returns {Promise<object>} Dados mapeados prontos para preencher o formulário
 */
async function processarNFSe(input) {
  // 1. Extrai chave
  const { chave, fonte: fonteParsing } = extrairChaveDeUrl(input);

  // 2. Consulta API
  const resultado = await consultarApiNFSe(chave);

  // 3. Mapeia campos
  const dados = mapearNFSe(resultado);

  // 4. Valida tomador — SEGURANÇA: rejeita notas de outros órgãos
  validarTomador(dados.tomador_cnpj);

  return {
    ...dados,
    chave,
    fonte_input: fonteParsing,
    is_mock: resultado.fonte === 'mock'
  };
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function limparCNPJ(v) {
  return String(v || '').replace(/\D/g, '');
}

function formatarCNPJ(v) {
  const d = limparCNPJ(v);
  if (d.length !== 14) return d;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  return parseFloat(String(v).replace(',', '.')) || 0;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  processarNFSe,
  extrairChaveDeUrl,
  consultarApiNFSe,
  mapearNFSe,
  validarTomador,
  CNPJ_TOMADOR_AUTORIZADO,
  CNPJ_TOMADOR_FORMATADO
};
