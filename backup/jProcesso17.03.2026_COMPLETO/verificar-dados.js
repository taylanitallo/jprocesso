const {Client} = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'jprocesso_global',
  user: 'postgres',
  password: '123456',
});

async function verificar() {
  try {
    await client.connect();
    
    const sec = await client.query('SELECT COUNT(*) FROM tenant_teste.secretarias');
    console.log('✅ Secretarias:', sec.rows[0].count);
    
    const set = await client.query('SELECT COUNT(*) FROM tenant_teste.setores');
    console.log('✅ Setores:', set.rows[0].count);
    
    const usr = await client.query('SELECT COUNT(*) FROM tenant_teste.usuarios');
    console.log('✅ Usuários:', usr.rows[0].count);
    
    if (usr.rows[0].count > 0) {
      const user = await client.query('SELECT nome, cpf, tipo FROM tenant_teste.usuarios LIMIT 1');
      console.log('\n👤 Usuário admin:');
      console.log('   Nome:', user.rows[0].nome);
      console.log('   CPF:', user.rows[0].cpf);
      console.log('   Tipo:', user.rows[0].tipo);
    }
    
    console.log('\n✅ BANCO DE DADOS CONFIGURADO COM SUCESSO!\n');
    client.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    client.end();
  }
}

verificar();
