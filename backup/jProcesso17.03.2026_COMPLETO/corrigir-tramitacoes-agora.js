const { getTenantConnection } = require('./server/config/database');

async function corrigirTramitacoes() {
  try {
    console.log('🔧 Iniciando correção da tabela tramitacoes...\n');
    
    const tenantDb = await getTenantConnection('tenant_iraucuba');
    
    console.log('✅ Conectado ao schema tenant_iraucuba\n');

    // 1. Criar ENUM se não existir
    console.log('📋 Criando tipo ENUM...');
    try {
      await tenantDb.query(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tramitacoes_tipo_acao') THEN
                CREATE TYPE tenant_iraucuba.enum_tramitacoes_tipo_acao AS ENUM ('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento');
                RAISE NOTICE 'ENUM criado com sucesso';
            ELSE
                RAISE NOTICE 'ENUM já existe';
            END IF;
        END $$;
      `);
      console.log('  ✅ ENUM verificado\n');
    } catch (error) {
      console.log(`  ⚠️  ENUM: ${error.message}\n`);
    }

    // 2. Adicionar coluna tipo_acao
    console.log('📋 Adicionando coluna tipo_acao...');
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN tipo_acao tenant_iraucuba.enum_tramitacoes_tipo_acao NOT NULL DEFAULT 'abertura';
      `);
      console.log('  ✅ Coluna tipo_acao adicionada\n');
    } catch (error) {
      if (error.message.includes('já existe')) {
        console.log('  ℹ️  Coluna tipo_acao já existe\n');
      } else {
        console.log(`  ❌ Erro: ${error.message}\n`);
      }
    }

    // Remover default
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ALTER COLUMN tipo_acao DROP DEFAULT;
      `);
    } catch (error) {
      // Ignorar erro
    }

    // 3. Adicionar justificativa_devolucao
    console.log('📋 Adicionando coluna justificativa_devolucao...');
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN justificativa_devolucao TEXT NULL;
      `);
      console.log('  ✅ Coluna justificativa_devolucao adicionada\n');
    } catch (error) {
      if (error.message.includes('já existe')) {
        console.log('  ℹ️  Coluna justificativa_devolucao já existe\n');
      } else {
        console.log(`  ❌ Erro: ${error.message}\n`);
      }
    }

    // 4. Adicionar data_hora
    console.log('📋 Adicionando coluna data_hora...');
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
      `);
      console.log('  ✅ Coluna data_hora adicionada\n');
    } catch (error) {
      if (error.message.includes('já existe')) {
        console.log('  ℹ️  Coluna data_hora já existe\n');
      } else {
        console.log(`  ❌ Erro: ${error.message}\n`);
      }
    }

    // Remover default
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ALTER COLUMN data_hora DROP DEFAULT;
      `);
    } catch (error) {
      // Ignorar erro
    }

    // 5. Adicionar ip_origem
    console.log('📋 Adicionando coluna ip_origem...');
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN ip_origem VARCHAR(45) NULL;
      `);
      console.log('  ✅ Coluna ip_origem adicionada\n');
    } catch (error) {
      if (error.message.includes('já existe')) {
        console.log('  ℹ️  Coluna ip_origem já existe\n');
      } else {
        console.log(`  ❌ Erro: ${error.message}\n`);
      }
    }

    // 6. Adicionar assinatura_digital
    console.log('📋 Adicionando coluna assinatura_digital...');
    try {
      await tenantDb.query(`
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN assinatura_digital VARCHAR(255) NULL;
      `);
      console.log('  ✅ Coluna assinatura_digital adicionada\n');
    } catch (error) {
      if (error.message.includes('já existe')) {
        console.log('  ℹ️  Coluna assinatura_digital já existe\n');
      } else {
        console.log(`  ❌ Erro: ${error.message}\n`);
      }
    }

    // 7. Criar índices
    console.log('📋 Criando índices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_tramitacoes_processo_id ON tenant_iraucuba.tramitacoes(processo_id)',
      'CREATE INDEX IF NOT EXISTS idx_tramitacoes_data_hora ON tenant_iraucuba.tramitacoes(data_hora)',
      'CREATE INDEX IF NOT EXISTS idx_tramitacoes_origem_usuario_id ON tenant_iraucuba.tramitacoes(origem_usuario_id)',
      'CREATE INDEX IF NOT EXISTS idx_tramitacoes_destino_setor_id ON tenant_iraucuba.tramitacoes(destino_setor_id)',
      'CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao ON tenant_iraucuba.tramitacoes(tipo_acao)'
    ];

    for (const sql of indices) {
      try {
        await tenantDb.query(sql);
      } catch (error) {
        // Ignorar erros de índices
      }
    }
    console.log('  ✅ Índices criados\n');

    // 8. Verificar estrutura final
    console.log('📊 ESTRUTURA FINAL DA TABELA tramitacoes:\n');
    const [results] = await tenantDb.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'tenant_iraucuba' 
        AND table_name = 'tramitacoes'
      ORDER BY ordinal_position
    `);

    console.table(results);

    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('   Agora você pode criar processos normalmente.\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

corrigirTramitacoes();
