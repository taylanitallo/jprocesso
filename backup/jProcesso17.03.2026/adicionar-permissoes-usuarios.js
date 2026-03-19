const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function adicionarColunaPermissoes() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adicionando coluna permissoes na tabela usuarios...');
    
    // Adicionar coluna permissoes em tenant_iraucuba
    await client.query(`
      ALTER TABLE tenant_iraucuba.usuarios 
      ADD COLUMN IF NOT EXISTS permissoes JSONB 
      DEFAULT '{
        "criar_processo": true,
        "editar_processo": true,
        "excluir_processo": false,
        "tramitar_processo": true,
        "visualizar_relatorios": false,
        "gerenciar_usuarios": false,
        "gerenciar_secretarias": false
      }'::jsonb;
    `);
    
    console.log('✅ Coluna permissoes adicionada em tenant_iraucuba.usuarios');
    
    // Adicionar coluna permissoes em tenant_teste
    await client.query(`
      ALTER TABLE tenant_teste.usuarios 
      ADD COLUMN IF NOT EXISTS permissoes JSONB 
      DEFAULT '{
        "criar_processo": true,
        "editar_processo": true,
        "excluir_processo": false,
        "tramitar_processo": true,
        "visualizar_relatorios": false,
        "gerenciar_usuarios": false,
        "gerenciar_secretarias": false
      }'::jsonb;
    `);
    
    console.log('✅ Coluna permissoes adicionada em tenant_teste.usuarios');
    
    // Atualizar usuários existentes que não têm permissoes
    await client.query(`
      UPDATE tenant_iraucuba.usuarios 
      SET permissoes = '{
        "criar_processo": true,
        "editar_processo": true,
        "excluir_processo": false,
        "tramitar_processo": true,
        "visualizar_relatorios": false,
        "gerenciar_usuarios": false,
        "gerenciar_secretarias": false
      }'::jsonb
      WHERE permissoes IS NULL;
    `);
    
    await client.query(`
      UPDATE tenant_teste.usuarios 
      SET permissoes = '{
        "criar_processo": true,
        "editar_processo": true,
        "excluir_processo": false,
        "tramitar_processo": true,
        "visualizar_relatorios": false,
        "gerenciar_usuarios": false,
        "gerenciar_secretarias": false
      }'::jsonb
      WHERE permissoes IS NULL;
    `);
    
    console.log('✅ Permissões padrão aplicadas aos usuários existentes');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

adicionarColunaPermissoes();
