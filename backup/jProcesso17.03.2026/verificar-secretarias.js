const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'sejuv',
  database: 'jprocesso_global'
});

async function verificar() {
  try {
    await client.connect();
    
    console.log('\n📋 SECRETARIAS CADASTRADAS:');
    const secretarias = await client.query('SELECT id, nome, sigla, ativo FROM tenant_iraucuba.secretarias ORDER BY nome');
    console.table(secretarias.rows);
    
    console.log('\n📋 SETORES CADASTRADOS:');
    const setores = await client.query('SELECT id, nome, sigla, secretaria_id, ativo FROM tenant_iraucuba.setores ORDER BY nome');
    console.table(setores.rows);
    
    console.log('\n👥 USUÁRIOS CADASTRADOS:');
    const usuarios = await client.query('SELECT id, nome, email, setor_id, ativo FROM tenant_iraucuba.usuarios ORDER BY nome');
    console.table(usuarios.rows);
    
    await client.end();
  } catch (error) {
    console.error('Erro:', error.message);
    await client.end();
  }
}

verificar();
