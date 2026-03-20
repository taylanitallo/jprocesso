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

function clean(s) { return (s||'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#[0-9]+;/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }

async function main() {
  // ── Examinar HTML completo de secretaria sec=15 para encontrar tabela de responsáveis
  const html15 = await httpGet('https://iraucuba.ce.gov.br/secretaria.php?sec=15');

  // Sigla  
  const siglaM = html15.match(/<h2[^>]*id="EsOv"[^>]*>\s*([^<]+)\s*<\/h2>/i);
  console.log('Sigla sec=15:', siglaM ? siglaM[1].trim() : '?');

  // Tabela responsáveis
  const tbStart = html15.indexOf("<table class='table table-responsive table-condensed table-bordered'>");
  const tbEnd = html15.indexOf('</table>', tbStart) + '</table>'.length;
  const tb = html15.slice(tbStart, tbEnd);
  console.log('\nTabela responsáveis (completa):');
  // Extrair linhas tbody
  const rows = tb.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  rows.forEach((row, i) => {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(c => clean(c));
    console.log(`  Row ${i}:`, cells);
  });

  // ── Lista de contratos
  const htmlContratos = await httpGet('https://iraucuba.ce.gov.br/contratos.php');
  const tbkStart = htmlContratos.indexOf('<tbody');
  const tbkEnd = htmlContratos.indexOf('</tbody>', tbkStart) + '</tbody>'.length;
  const tbody = htmlContratos.slice(tbkStart, tbkEnd);
  
  // Extrair todas as linhas
  const contRows = tbody.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  console.log(`\nTotal linhas contratos: ${contRows.length}`);
  
  // Mostrar 2 linhas de exemplo com todas as colunas
  for (let i = 0; i < Math.min(3, contRows.length); i++) {
    const cells = (contRows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(c => clean(c));
    // Badge de VIGENTE ou ATIVO
    const hasVigente = contRows[i].includes('VIGENTE') || contRows[i].includes('vigente');
    const hasAtivo = contRows[i].includes('ATIVO') || contRows[i].includes('ativo');
    // Link para detalhe
    const linkM = contRows[i].match(/contratos\.php\?id=(\d+)/);
    console.log(`\n  Contrato row ${i+1} [VIGENTE=${hasVigente} ATIVO=${hasAtivo}]:`);
    cells.forEach((c, idx) => c && console.log(`    col[${idx}]: ${c.slice(0, 120)}`));
    if (linkM) console.log(`    linkId: ${linkM[1]}`);
  }
  
  // Contar contratos VIGENTES e ATIVOS
  const vigentes = contRows.filter(r => r.includes('VIGENTE')).length;
  const ativos = contRows.filter(r => r.includes('class=') && r.includes('ATIVO')).length;
  console.log(`\nVIGENTE rows: ${vigentes}, ATIVO rows: ${ativos}`);
  
  // ── Detalhe de um contrato VIGENTE
  const vigRow = contRows.find(r => r.includes('VIGENTE'));
  const idM = vigRow && vigRow.match(/contratos\.php\?id=(\d+)/);
  if (idM) {
    console.log(`\n====== DETALHE CONTRATO id=${idM[1]} ======`);
    const det = await httpGet(`https://iraucuba.ce.gov.br/contratos.php?id=${idM[1]}`);
    // Encontrar a seção principal de dados
    // Look for table com dados do contrato
    const panelM = det.match(/class=['"]panel[^"']*['"][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi);
    if (panelM) {
      panelM.slice(0, 3).forEach((p, i) => console.log(`Panel ${i}: ${p.slice(0, 500)}`));
    }
    // Alternativa: encontrar tabela de detalhes
    const detTbStart = det.indexOf("<table class='table table-responsive table-condensed table-bordered'>");
    if (detTbStart > -1) {
      const detTbEnd = det.indexOf('</table>', detTbStart) + '</table>'.length;
      const detTable = det.slice(detTbStart, detTbEnd);
      const detRows = (detTable.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []);
      console.log(`\nTabela detalhe contrato (${detRows.length} rows):`);
      detRows.forEach((row, i) => {
        const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(c => clean(c));
        if (cells.some(c => c)) console.log(`  Row ${i}:`, cells.map(c => c.slice(0,80)));
      });
    }
    // Buscar campos-chave
    const fields = ['Número', 'Objeto', 'Contratado', 'CNPJ', 'Valor', 'Vigência', 'Secretaria', 'Modalidade', 'Situação'];
    fields.forEach(f => {
      const re = new RegExp(f + '[^<]*<\\/[^>]+>([^<]+)<', 'i');
      const m = det.match(re);
      if (m) console.log(`${f}: ${m[1].trim()}`);
    });
  }
}

main().catch(console.error);
