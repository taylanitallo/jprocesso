const { Client } = require('pg');

async function fixTramitacoes() {
  // Tenta primeiro sem senha (peer authentication)
  let client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'jprocesso_global',
    user: 'postgres'
    // Sem password - tentar peer authentication
  });

  try {
    await client.connect();
  } catch (err1) {
    console.log('⚠️  Peer authentication falhou, tentando com senha...');
    // Se falhar, tenta com senha
    client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'jprocesso_global',
      user: 'postgres',
      password: 'postgres'
    });
    
    try {
      await client.connect();
    } catch (err2) {
      console.error('❌ Não foi possível conectar ao banco de dados');
      console.error('Por favor, execute o script SQL manualmente no pgAdmin:');
      console.error('\nfix_tramitacoes.sql\n');
      return;
    }
  }

  try {
    console.log('✅ Conectado ao banco de dados');

    // Adicionar coluna tipo_acao
    await client.query(`
      ALTER TABLE tenant_iraucuba.tramitacoes 
      ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(20);
    `);
    console.log('✅ Coluna tipo_acao adicionada');

    // Atualizar valores existentes
    await client.query(`
      UPDATE tenant_iraucuba.tramitacoes 
      SET tipo_acao = 'tramite' 
      WHERE tipo_acao IS NULL;
    `);
    console.log('✅ Valores atualizados');

    // Tornar NOT NULL
    await client.query(`
      ALTER TABLE tenant_iraucuba.tramitacoes 
      ALTER COLUMN tipo_acao SET NOT NULL;
    `);
    console.log('✅ Coluna definida como NOT NULL');

    // Adicionar constraint
    await client.query(`
      ALTER TABLE tenant_iraucuba.tramitacoes 
      DROP CONSTRAINT IF EXISTS chk_tipo_acao;
    `);
    
    await client.query(`
      ALTER TABLE tenant_iraucuba.tramitacoes 
      ADD CONSTRAINT chk_tipo_acao 
      CHECK (tipo_acao IN ('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento'));
    `);
    console.log('✅ Constraint CHECK adicionada');

    // Adicionar constraint de justificativa
    await client.query(`
      ALTER TABLE tenant_iraucuba.tramitacoes 
      DROP CONSTRAINT IF EXISTS chk_justificativa_devolucao;
    `);
    
    await client.query(`
      ALTER TABLE tenant_iraucuba.tramitacoes 
      ADD CONSTRAINT chk_justificativa_devolucao 
      CHECK (tipo_acao != 'devolucao' OR justificativa_devolucao IS NOT NULL);
    `);
    console.log('✅ Constraint de justificativa adicionada');

    // Criar índice
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao 
      ON tenant_iraucuba.tramitacoes(tipo_acao);
    `);
    console.log('✅ Índice criado');

    console.log('\n🎉 Tabela tramitacoes corrigida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela:', error.message);
  } finally {
    await client.end();
  }
}

fixTramitacoes();
