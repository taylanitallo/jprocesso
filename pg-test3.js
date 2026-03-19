const { Client } = require('pg');

// Teste sem SSL
const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '123456',
  ssl: false,    // desabilita SSL
  connectionTimeoutMillis: 8000
});

console.log('Testando conexao SEM SSL...');
client.connect()
  .then(() => {
    console.log('CONECTOU! SSL desabilitado funciona!');
    return client.query("SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY 1");
  })
  .then(res => {
    console.log('Bancos:');
    res.rows.forEach(r => console.log(' -', r.datname));
    return client.end();
  })
  .catch(err => {
    console.error('ERRO sem SSL:', err.message);
    client.end().catch(() => {});
  });
