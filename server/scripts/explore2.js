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

async function main() {
  // ── 1. Lista de secretarias (dropdown href)
  console.log('\n====== LISTA DE SECRETARIAS ======');
  const home = await httpGet('https://iraucuba.ce.gov.br/');
  const secLinks = [...new Set(home.match(/href='\/secretaria\.php\?sec=\d+'/g) || [])];
  console.log('Links:', secLinks);

  // ── 2. Detalhe de uma secretaria
  if (secLinks.length > 0) {
    const id = secLinks[0].match(/sec=(\d+)/)[1];
    console.log(`\n====== DETALHE SECRETARIA sec=${id} ======`);
    const html = await httpGet(`https://iraucuba.ce.gov.br/secretaria.php?sec=${id}`);
    // buscar nome, secretário, telefone
    const nameIdx = html.toLowerCase().indexOf('secret');
    console.log('Amostra:', html.slice(nameIdx, nameIdx + 2000));
  }

  // ── 3. Página completa de secretarias
  console.log('\n====== SECRETARIA.PHP (sem ID) ======');
  const secPag = await httpGet('https://iraucuba.ce.gov.br/secretaria.php');
  const secNames = secPag.match(/sec=\d+[^>]*>([^<]+)</g) || [];
  console.log('Secretarias encontradas:', secNames.slice(0, 30));

  // ── 4. Estrutura de contrato – 1 contrato VIGENTE em detalhe
  console.log('\n====== DETALHE CONTRATO id=8954 ======');
  const ctHtml = await httpGet('https://iraucuba.ce.gov.br/contratos.php?id=8954');
  const bodyIdx = ctHtml.indexOf('<body');
  console.log(ctHtml.slice(bodyIdx, bodyIdx + 4000));

  // ── 5. Contar contratos VIGENTES
  console.log('\n====== CONTAGEM VIGENTES ======');
  const all = await httpGet('https://iraucuba.ce.gov.br/contratos.php');
  const vigentes = (all.match(/VIGENTE/g) || []).length;
  const ativos   = (all.match(/ATIVO/gi) || []).length;
  const total    = (all.match(/contratos\.php\?id=\d+/g) || []).length;
  const ids      = [...new Set(all.match(/contratos\.php\?id=(\d+)/g) || [])];
  const primeiroVigente = all.match(/contratos\.php\?id=(\d+)[^>]*>[^<]*<\/a>[^)]*VIGENTE/) ;
  console.log({ vigentes, ativos, total, totalUniqueIds: ids.length });
  console.log('Primeiros IDs:', ids.slice(0, 10));
}

main().catch(console.error);
