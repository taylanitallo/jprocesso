const { getTenantConnection } = require('./server/config/database');

async function limparColunasDuplicadas() {
  try {
    console.log('🔧 Limpando colunas duplicadas...\n');
    
    const tenantDb = await getTenantConnection('tenant_iraucuba');
    
    console.log('✅ Conectado ao schema tenant_iraucuba\n');

    // Verificar se existem dados na coluna antiga 'tipo'
    console.log('📋 Verificando dados na coluna "tipo"...');
    const [dados] = await tenantDb.query(`
      SELECT COUNT(*) as total, tipo
      FROM tenant_iraucuba.tramitacoes
      GROUP BY tipo
    `);

    if (dados && dados.length > 0) {
      console.log('  ℹ️  Dados encontrados na coluna "tipo":');
      console.table(dados);
      
      // Migrar dados de 'tipo' para 'tipo_acao'
      console.log('\n📋 Migrando dados de "tipo" para "tipo_acao"...');
      
      const migracoes = {
        'abertura': 'abertura',
        'tramite': 'tramite', 
        'devolucao': 'devolucao',
        'conclusao': 'conclusao',
        'arquivamento': 'arquivamento'
      };

      for (const [tipoAntigo, tipoNovo] of Object.entries(migracoes)) {
        try {
          await tenantDb.query(`
            UPDATE tenant_iraucuba.tramitacoes
            SET tipo_acao = '${tipoNovo}'::tenant_iraucuba.enum_tramitacoes_tipo_acao
            WHERE tipo = '${tipoAntigo}'
          `);
          console.log(`  ✅ Migrado: ${tipoAntigo} → ${tipoNovo}`);
        } catch (error) {
          console.log(`  ⚠️  Erro ao migrar ${tipoAntigo}: ${error.message}`);
        }
      }
    } else {
      console.log('  ℹ️  Nenhum dado na coluna "tipo"');
    }

    // Agora remover a coluna antiga 'tipo'
    console.log('\n📋 Removendo coluna antiga "tipo"...');
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        DROP COLUMN IF EXISTS tipo
      `);
      console.log('  ✅ Coluna "tipo" removida com sucesso\n');
    } catch (error) {
      console.log(`  ❌ Erro ao remover coluna: ${error.message}\n`);
    }

    // Também remover coluna 'observacao' se existir (não está no modelo)
    console.log('📋 Removendo coluna antiga "observacao"...');
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        DROP COLUMN IF EXISTS observacao
      `);
      console.log('  ✅ Coluna "observacao" removida com sucesso\n');
    } catch (error) {
      console.log(`  ❌ Erro ao remover coluna: ${error.message}\n`);
    }

    // Verificar estrutura final
    console.log('📊 ESTRUTURA FINAL (LIMPA):\n');
    const [results] = await tenantDb.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'tenant_iraucuba' 
        AND table_name = 'tramitacoes'
      ORDER BY ordinal_position
    `);

    console.table(results);

    console.log('\n🎉 LIMPEZA CONCLUÍDA!');
    console.log('   Agora só existe a coluna "tipo_acao" (ENUM correto)\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

limparColunasDuplicadas();
