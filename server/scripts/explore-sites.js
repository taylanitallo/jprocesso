/**
 * Explorar sites iraucuba.ce.gov.br para entender estrutura
 */
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
  // ── Site principal: secretarias e secretários
  console.log('\n====== PÁGINA PRINCIPAL iraucuba.ce.gov.br ======');
  const home = await httpGet('https://iraucuba.ce.gov.br/');
  // buscar links de secretarias
  const linksSecretaria = [...new Set(home.match(/href="[^"]*secretar[^"]*"/gi) || [])];
  console.log('Links secretaria:', linksSecretaria.slice(0, 20));

  // buscar qualquer estrutura de secretaria no HTML
  const secIdx = home.toLowerCase().indexOf('secretar');
  if (secIdx > -1) {
    console.log('\nContexto secretaria:', home.slice(Math.max(0, secIdx - 50), secIdx + 500));
  }

  // ── Página de contratos
  console.log('\n====== CONTRATOS iraucuba.ce.gov.br/contratos.php ======');
  const contratosHtml = await httpGet('https://iraucuba.ce.gov.br/contratos.php');
  console.log('Tamanho HTML:', contratosHtml.length);

  // Verificar se tem tabela
  const tbIdx = contratosHtml.indexOf('<table');
  if (tbIdx > -1) {
    const tbEnd = contratosHtml.indexOf('</table>', tbIdx);
    console.log('\nPrimeira tabela (início):');
    console.log(contratosHtml.slice(tbIdx, Math.min(tbEnd + 8, tbIdx + 5000)));
  }

  // Buscar padrões de dados
  const statusMatch = contratosHtml.match(/vigente|ativo|vigência|contratad/gi) || [];
  console.log('\nMenções de status:', statusMatch.slice(0, 10));
}

main().catch(console.error);
