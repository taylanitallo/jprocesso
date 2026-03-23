const http = require('http');
const fs = require('fs');

const tok = fs.readFileSync('tok.txt', 'utf8').trim();
const processoId = '73bd668b-f18c-42c0-9fea-c89a797b3dab';

const body = JSON.stringify({
  tipo_did: 'variaveis',
  objeto: 'Aquisição de lanches e refeições para eventos',
  numero_did: 12345,
  credor_sec1: 'J. R. BRAGA PEREIRA - ME',
  cnpj_cpf_credor_sec1: '10.348.898/0001-47',
  data_did: '2026-03-22',
  fonte_recurso: 'PRÓPRIO',
  itens_did: [{ descricao: 'Lanche', unidade: 'UN', quantidade: 100, valor_unitario: 15.00, valor_total: '1500.00' }]
});

const opts = {
  host: '::1',
  port: 5001,
  path: `/api/did/processo/${processoId}`,
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + tok,
    'x-tenant-subdomain': 'iraucuba',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Testando POST /api/did/processo/:id...');
const req = http.request(opts, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    console.log('STATUS:', r.statusCode);
    try {
      const json = JSON.parse(d);
      if (json.error) {
        console.log('ERRO DO SERVIDOR:', json.error);
      } else {
        console.log('SUCESSO - DID numero:', json.did?.numero_did);
      }
    } catch (e) {
      console.log('RESPOSTA RAW:', d.slice(0, 300));
    }
  });
});
req.on('error', e => console.log('ERRO DE CONEXÃO:', e.message));
req.write(body);
req.end();
