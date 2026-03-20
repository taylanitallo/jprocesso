const https = require('https');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + (u.search || ''), headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => { const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => resolve(Buffer.concat(ch).toString('utf8'))); }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function normalizeKey(s) {
  return (s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function parseDetailPage(html) {
  const campos = {};
  const re = /<strong>\s*([^<]+?)\s*:?\s*<\/strong>\s*([^<]*)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const key = normalizeKey(m[1]);
    const val = m[2].trim();
    if (key && val && !campos[key]) campos[key] = val;
  }
  return {
    especificacao:    campos['especificacao']    || '',
    classificacao:    campos['classificacao']    || '',
    subclassificacao: campos['subclassificacao'] || '',
  };
}

function parseListPage(html) {
  const itens = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return itens;
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(tbodyMatch[1])) !== null) {
    const row = m[1];
    const idMatch = row.match(/href="\/pmiraucuba\/itens\/(\d+)"/);
    if (!idMatch) continue;
    const getTd = (attr) => {
      const tm = row.match(new RegExp(`data-title="${attr}[^"]*"[^>]*>[\\s\\S]*?<p[^>]*>\\s*([^<]+?)\\s*<\/p>`, 'i'));
      return tm ? tm[1].trim() : '';
    };
    const descricao = getTd('Descri');
    if (!descricao) continue;
    itens.push({ id_externo: idMatch[1], descricao, unidade_medida: getTd('Unid'), categoria: getTd('Categoria') });
  }
  return itens;
}

async function test() {
  console.log('=== Testando parsing de lista ===');
  const listHtml = await httpGet('https://transparencia.acontratacao.com.br/pmiraucuba/itens');
  const itens = parseListPage(listHtml);
  console.log(`Total de itens na lista: ${itens.length}`);
  console.log('Primeiros 3 itens:', JSON.stringify(itens.slice(0, 3), null, 2));

  console.log('\n=== Testando parsing de detalhe ===');
  const detailHtml = await httpGet('https://transparencia.acontratacao.com.br/pmiraucuba/itens/287165');
  const det = parseDetailPage(detailHtml);
  console.log('Detalhe do item 287165:', JSON.stringify(det, null, 2));
}

test().catch(console.error);
