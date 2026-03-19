const http = require('http');
const body = JSON.stringify({ cpf: '04335471386', senha: '123456', subdomain: 'iraucuba' });
// Teste completo: login + listar processos
const req = http.request({
  hostname: 'localhost', port: 5000, path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-tenant-subdomain': 'iraucuba' }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const json = JSON.parse(data);
      if (json.token) {
        console.log('LOGIN OK - token obtido');
        // Usar token para buscar processos
        const token = json.token;
        const req2 = http.request({
          hostname: 'localhost', port: 5000, path: '/api/processos',
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token, 'x-tenant-subdomain': 'iraucuba' }
        }, res2 => {
          let d2 = '';
          res2.on('data', c => d2 += c);
          res2.on('end', () => {
            const processos = JSON.parse(d2);
            console.log('PROCESSOS STATUS:', res2.statusCode);
            if (Array.isArray(processos)) {
              console.log('Total processos:', processos.length);
              processos.forEach(p => console.log(' -', p.numero, '|', p.tipo_processo, '|', p.assunto));
            } else {
              console.log('Resposta:', JSON.stringify(processos).substring(0, 200));
            }
          });
        });
        req2.end();
      } else {
        console.log('ERRO LOGIN:', JSON.stringify(json));
      }
    } catch(e) {
      console.log('BODY RAW:', data);
    }
  });
});
req.write(body);
req.end();
