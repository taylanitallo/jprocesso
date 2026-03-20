const https = require('https');
const http  = require('http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    mod.get({ hostname: u.hostname, path: u.pathname + (u.search || ''), headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        return httpGet(new URL(r.headers.location, url).href).then(resolve).catch(reject);
      }
      const ch = []; r.on('data', c => ch.push(c)); r.on('end', () => resolve(Buffer.concat(ch).toString('utf8')));
    }).on('error', reject).setTimeout(20000, function(){ this.destroy(new Error('timeout')); });
  });
}

function cleanText(s) { return (s || '').replace(/\s+/g,' ').trim(); }

function parseSecretaria(html, secId) {
  // Nome da secretaria: aparece em h2/h3 ou no título
  let nome = '';
  const h2m = html.match(/<h[23][^>]*>\s*([^<]+?)\s*<\/h[23]>/i);
  if (h2m) nome = cleanText(h2m[1]);

  // Informações da secretaria em tabela ou lista
  const campos = {};
  const trRe = /<td[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const k = cleanText(m[1]).toLowerCase().replace(/:/g,'');
    const v = cleanText(m[2].replace(/<[^>]+>/g, ' '));
    campos[k] = v;
  }

  // Também tenta padrão "label: valor" em parágrafos
  const pRe = /<p[^>]*>\s*<strong>([^<:]+):?<\/strong>([^<]*)/gi;
  while ((m = pRe.exec(html)) !== null) {
    const k = cleanText(m[1]).toLowerCase();
    const v = cleanText(m[2]);
    if (v) campos[k] = v;
  }

  // Nome do secretário: look for "secretário" or "gestor" or "responsável"
  let secretario = '';
  const secRe = /secret[aá]ri[ao]\s*:?\s*<\/strong>([^<]*)/gi;
  const gestRe = /(?:gestor|respons[aá]vel|titular)\s*:?\s*<\/strong>([^<]*)/gi;
  const sm = secRe.exec(html) || gestRe.exec(html);
  if (sm) secretario = cleanText(sm[1]);

  // Sigla: pegar as primeiras letras ou buscar no HTML
  const siglaM = html.match(/sigla\s*:?\s*<\/strong>\s*([^<]+)/i);
  let sigla = siglaM ? cleanText(siglaM[1]) : '';
  if (!sigla) {
    // gerar sigla automática das palavras principais
    sigla = nome.split(/\s+/).filter(w => w.length > 3 && !/^(DE|DA|DO|DAS|DOS|E|A|o|OU)$/i.test(w))
      .map(w => w[0]).join('').toUpperCase().slice(0, 5);
  }

  return { secId, nome, sigla, secretario, ...campos };
}

function parseContrato(html) {
  // Extrair dados principais de um contrato
  const data = {};
  const trRe = /<td[^>]*>\s*(?:<strong[^>]*>)?([^<:]+):?(?:<\/strong>)?\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const k = cleanText(m[1]).toLowerCase().replace(/[^a-záéíóúãõ\s]/g,'');
    const v = cleanText(m[2].replace(/<[^>]+>/g, ' '));
    if (k && v) data[k] = v;
  }

  // Alternativa: busca por itemprop
  const propRe = /itemprop="([^"]+)"[^>]*>\s*([^<]+)/g;
  while ((m = propRe.exec(html)) !== null) {
    data[m[1]] = cleanText(m[2]);
  }

  return data;
}

async function main() {
  // ── Detalhe de secretarias (pegar as reais)
  const ids = [15, 40, 1, 30, 59, 39, 38, 2, 36, 11, 58, 7, 5, 32, 57];
  console.log('\n====== DETALHES SECRETARIAS ======');
  for (const id of ids.slice(0, 4)) {
    const html = await httpGet(`https://iraucuba.ce.gov.br/secretaria.php?sec=${id}`);
    const sec = parseSecretaria(html, id);
    console.log(`\n--- sec=${id} ---`);
    // Imprimir contexto relevante
    const idx = html.toLowerCase().indexOf('secretar');
    // Procurar por h2/h3 e campos de dados
    const headers = html.match(/<h[2-4][^>]*>[^<]+<\/h[2-4]>/gi) || [];
    console.log('Headers:', headers.slice(0, 5));
    // Buscar tabelas de info
    const tbIdx = html.indexOf('<table');
    if (tbIdx > -1) console.log('Tabela:', html.slice(tbIdx, tbIdx + 1000));
    // Buscar padrões de secretário
    const secMatch = html.match(/(secret[aá]ri[ao]|gestor|titular|respons[aá]vel)[^<]*<\/[^>]+>[^<]*/gi) || [];
    console.log('Secretário pattern:', secMatch.slice(0, 5));
    // buscar seção de informações
    const infoIdx = html.toLowerCase().indexOf('informa');
    if (infoIdx > -1) console.log('Info section:', html.slice(infoIdx, infoIdx + 1000));
  }

  // ── Detalhe contrato VIGENTE
  console.log('\n====== PARSE CONTRATO VIGENTE (id=9075) ======');
  const ct = await httpGet('https://iraucuba.ce.gov.br/contratos.php?id=9075');
  // Buscar seção de dados do contrato
  const dataIdx = ct.indexOf('itemprop="contractID"');
  if (dataIdx > -1) console.log('Contrato itemprop:', ct.slice(dataIdx, dataIdx + 3000));

  // Buscar tabela de dados
  const tbIdx = ct.indexOf('<table');
  if (tbIdx > -1) console.log('Tabela contrato:', ct.slice(tbIdx, tbIdx + 2000));
}

main().catch(console.error);
