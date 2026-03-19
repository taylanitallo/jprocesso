const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'jprocesso_global'
});

async function verificarTabelas() {
  try {
    // Verificar tabelas
    const tabelas = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'tenant_teste'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tabelas no schema tenant_teste:');
    tabelas.rows.forEach(t => console.log('  -', t.table_name));
    
    // Verificar estrutura da tabela secretarias
    const colunasSecretarias = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'tenant_teste' AND table_name = 'secretarias'
      ORDER BY ordinal_position
    `);
    
    if (colunasSecretarias.rows.length > 0) {
      console.log('\n📊 Estrutura da tabela secretarias:');
      colunasSecretarias.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    } else {
      console.log('\n⚠️  Tabela secretarias não encontrada!');
    }
    
    // Verificar estrutura da tabela setores
    const colunasSetores = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'tenant_teste' AND table_name = 'setores'
      ORDER BY ordinal_position
    `);
    
    if (colunasSetores.rows.length > 0) {
      console.log('\n📊 Estrutura da tabela setores:');
      colunasSetores.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    } else {
      console.log('\n⚠️  Tabela setores não encontrada!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarTabelas();
