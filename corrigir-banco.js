const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function corrigirBanco() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'jprocesso_global',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}\n`);
    
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'CORRIGIR_BANCO_DEFINITIVO.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Dividir em comandos individuais (excluindo comentários e linhas vazias)
    const comandos = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('\\c'));

    console.log(`📋 Executando ${comandos.length} comandos SQL...\n`);

    let sucesso = 0;
    let erros = 0;

    for (const comando of comandos) {
      if (comando.includes('SET search_path') || 
          comando.includes('DO $$') || 
          comando.includes('CREATE INDEX') ||
          comando.includes('CREATE TYPE') ||
          comando.includes('SELECT column_name')) {
        
        try {
          await client.query(comando);
          sucesso++;
          
          if (comando.includes('ADD COLUMN')) {
            const match = comando.match(/ADD COLUMN (\w+)/);
            if (match) {
              console.log(`  ✅ Coluna '${match[1]}' adicionada`);
            }
          } else if (comando.includes('CREATE INDEX')) {
            const match = comando.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
            if (match) {
              console.log(`  ✅ Índice '${match[1]}' criado`);
            }
          } else if (comando.includes('CREATE TYPE')) {
            console.log(`  ✅ ENUM criado`);
          }
        } catch (error) {
          erros++;
          console.error(`  ❌ Erro: ${error.message.substring(0, 100)}`);
        }
      }
    }

    console.log('\n📊 VERIFICANDO ESTRUTURA DA TABELA tramitacoes:');
    const result = await client.query(`
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

    console.table(result.rows);

    console.log('\n==============================================');
    console.log(`✅ Comandos executados com sucesso: ${sucesso}`);
    console.log(`❌ Comandos com erro: ${erros}`);
    console.log('==============================================\n');

    if (erros === 0) {
      console.log('🎉 BANCO DE DADOS CORRIGIDO COM SUCESSO!');
      console.log('   Agora você pode criar processos normalmente.\n');
    } else {
      console.log('⚠️  Alguns erros ocorreram. Verifique os logs acima.\n');
    }

  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message);
    console.error('\nVerifique se:');
    console.error('  1. O PostgreSQL está rodando');
    console.error('  2. As credenciais estão corretas (user: postgres, password: postgres)');
    console.error('  3. O banco jprocesso_global existe');
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada.');
  }
}

corrigirBanco();
