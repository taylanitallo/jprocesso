const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'jprocesso_global'
});

async function testarSecretarias() {
  try {
    // Listar secretarias
    const secretarias = await pool.query(`
      SELECT * FROM tenant_teste.secretarias WHERE ativo = true ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Secretarias cadastradas:');
    if (secretarias.rows.length > 0) {
      secretarias.rows.forEach(s => {
        console.log(`  - ${s.nome} (${s.sigla})`);
        console.log(`    ID: ${s.id}`);
        console.log(`    Criado em: ${s.created_at}`);
      });
    } else {
      console.log('  Nenhuma secretaria encontrada');
    }
    
    // Listar setores
    const setores = await pool.query(`
      SELECT s.*, sec.nome as secretaria_nome 
      FROM tenant_teste.setores s
      LEFT JOIN tenant_teste.secretarias sec ON s.secretaria_id = sec.id
      WHERE s.ativo = true 
      ORDER BY s.created_at DESC
    `);
    
    console.log('\n📊 Setores cadastrados:');
    if (setores.rows.length > 0) {
      setores.rows.forEach(s => {
        console.log(`  - ${s.nome} (Secretaria: ${s.secretaria_nome || 'N/A'})`);
        console.log(`    ID: ${s.id}`);
        console.log(`    Criado em: ${s.created_at}`);
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

testarSecretarias();
