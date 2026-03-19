const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'jprocesso_global'
});

async function alterarColunaSigna() {
  try {
    // Alterar coluna sigla para permitir NULL no schema tenant_iraucuba
    console.log('🔧 Alterando coluna sigla em tenant_iraucuba.setores...');
    await pool.query(`
      ALTER TABLE tenant_iraucuba.setores 
      ALTER COLUMN sigla DROP NOT NULL;
    `);
    console.log('✅ Coluna sigla alterada com sucesso em tenant_iraucuba!');
    
    // Alterar também no schema padrão tenant_teste
    console.log('🔧 Alterando coluna sigla em tenant_teste.setores...');
    await pool.query(`
      ALTER TABLE tenant_teste.setores 
      ALTER COLUMN sigla DROP NOT NULL;
    `);
    console.log('✅ Coluna sigla alterada com sucesso em tenant_teste!');
    
    console.log('\n✅ Todas as alterações concluídas!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

alterarColunaSigna();
