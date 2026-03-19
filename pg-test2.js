const { Client } = require('pg');

// Teste 1: banco postgres (sempre existe)
const c1 = new Client({ host:'localhost', port:5432, database:'postgres', user:'postgres', password:'123456', connectionTimeoutMillis:5000 });
console.log('Testando banco "postgres" com password=123456...');
c1.connect(err => {
  if (err) {
    console.error('ERRO banco postgres / password 123456:', err.message);
    // Tentar sem senha
    const c2 = new Client({ host:'localhost', port:5432, database:'postgres', user:'postgres', password:'', connectionTimeoutMillis:5000 });
    console.log('Tentando sem password...');
    c2.connect(err2 => {
      if (err2) {
        console.error('ERRO sem password:', err2.message);
        process.exit(1);
      }
      console.log('CONECTOU SEM PASSWORD!');
      listarBancos(c2);
    });
    return;
  }
  console.log('CONECTOU! Listando bancos...');
  listarBancos(c1);
});

function listarBancos(client) {
  client.query('SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname', (err, res) => {
    if (err) { console.error('Erro ao listar bancos:', err.message); client.end(); return; }
    console.log('\nBancos disponíveis:');
    res.rows.forEach(r => console.log(' -', r.datname));
    const temGlobal = res.rows.some(r => r.datname === 'jprocesso_global');
    if (!temGlobal) {
      console.log('\n⚠️  BANCO "jprocesso_global" NAO EXISTE!');
      console.log('Execute o SQL abaixo para criar:');
      console.log('  CREATE DATABASE jprocesso_global;');
    } else {
      console.log('\n✅ "jprocesso_global" EXISTE!');
    }
    client.end();
  });
}
