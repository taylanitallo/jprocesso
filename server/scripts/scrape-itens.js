/**
 * Script para importar itens do portal de transparência
 * transparencia.acontratacao.com.br/pmiraucuba/itens
 *
 * Uso: node server/scripts/scrape-itens.js
 */

const https = require('https');

function httpsGet(opts) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // 1. Buscar a página HTML para encontrar padrões de API
  console.log('=== Buscando página principal ===');
  const html = await httpsGet({
    hostname: 'transparencia.acontratacao.com.br',
    path: '/pmiraucuba/itens',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });

  // Procurar padrões de API / chamadas Ajax no HTML
  const apiPatterns = html.body.match(/['"](\/[^'"]*items?[^'"]*)['"]/gi) || [];
  const ajaxUrls = html.body.match(/url\s*:\s*['"]([^'"]+)['"]/gi) || [];
  const fetchCalls = html.body.match(/fetch\(['"]([^'"]+)['"]/gi) || [];
  const xhrCalls = html.body.match(/open\(['"][^'"]+['"],[^,]+['"]([^'"]+)['"]/gi) || [];

  console.log('\nPatterns API (itens):', apiPatterns.slice(0, 10));
  console.log('\nAJAX URLs:', ajaxUrls.slice(0, 10));
  console.log('\nFetch calls:', fetchCalls.slice(0, 10));
  console.log('\nXHR calls:', xhrCalls.slice(0, 10));

  // 2. Tentar endpoints comuns de API para itens
  const endpoints = [
    '/api/itens',
    '/api/v1/itens',
    '/pmiraucuba/api/itens',
    '/pmiraucuba/itens.json',
    '/api/itens?municipio=iraucuba',
    '/api/catalogo/itens',
  ];

  for (const path of endpoints) {
    try {
      const r = await httpsGet({
        hostname: 'transparencia.acontratacao.com.br',
        path,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (r.status === 200 && (r.body.startsWith('[') || r.body.startsWith('{'))) {
        console.log(`\n✅ Encontrado: ${path}`);
        console.log('Amostra:', r.body.slice(0, 500));
      } else {
        console.log(`❌ ${path} → ${r.status}`);
      }
    } catch (e) {
      console.log(`❌ ${path} → ERRO: ${e.message}`);
    }
  }

  // 3. Procurar scripts JS incluídos na página que podem conter a lógica
  const scripts = html.body.match(/src="([^"]+\.js)"/g) || [];
  console.log('\nScripts JS carregados:');
  scripts.forEach(s => console.log(' -', s));
}

main().catch(console.error);
