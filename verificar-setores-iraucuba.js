const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'jprocesso_global'
});

async function listarSetoresIraucuba() {
  try {
    // Listar setores de tenant_iraucuba
    const setores = await pool.query(`
      SELECT s.*, sec.nome as secretaria_nome 
      FROM tenant_iraucuba.setores s
      LEFT JOIN tenant_iraucuba.secretarias sec ON s.secretaria_id = sec.id
      WHERE s.ativo = true 
      ORDER BY s.created_at DESC
    `);
    
    console.log('\n📊 Setores cadastrados em tenant_iraucuba:');
    console.log(`Total: ${setores.rows.length}\n`);
    
    if (setores.rows.length > 0) {
      setores.rows.forEach((s, index) => {
        console.log(`${index + 1}. ${s.nome}`);
        console.log(`   Secretaria: ${s.secretaria_nome || 'N/A'}`);
        console.log(`   Sigla: ${s.sigla || 'N/A'}`);
        console.log(`   Descrição: ${s.descricao || 'N/A'}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   Criado em: ${s.created_at}`);
        console.log('');
      });
    } else {
      console.log('  Nenhum setor encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

listarSetoresIraucuba();
