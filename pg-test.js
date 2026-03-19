const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'jprocesso_global',
  user: 'postgres',
  password: '123456',
  connectionTimeoutMillis: 5000
});

console.log('Conectando a jprocesso_global...');
client.connect(err => {
  if (err) {
    console.error('ERRO CONEXAO:', err.message);
    process.exit(1);
  }
  console.log('CONEXAO OK!');
  client.query('SELECT COUNT(*) FROM information_schema.schemata', (err2, res) => {
    if (err2) console.error('QUERY ERRO:', err2.message);
    else console.log('Schemas encontrados:', res.rows[0].count);
    
    client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY schema_name", (err3, res3) => {
      if (err3) console.error(err3.message);
      else {
        console.log('\nSchemas:');
        res3.rows.forEach(r => console.log(' -', r.schema_name));
      }
      
      // Verificar schema tenant_teste
      client.query("SELECT COUNT(*) FROM tenant_teste.processos", (err4, res4) => {
        if (err4) console.log('\nschema tenant_teste.processos:', err4.message);
        else console.log('\nProcessos em tenant_teste:', res4.rows[0].count);
        
        client.query("SELECT COUNT(*) FROM tenant_teste.secretarias", (err5, res5) => {
          if (err5) console.log('secretarias:', err5.message);
          else console.log('Secretarias em tenant_teste:', res5.rows[0].count);
          client.end();
        });
      });
    });
  });
});
