// Script para testar conexão com PostgreSQL
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jprocesso_global',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

console.log('\n========================================');
console.log('TESTANDO CONEXÃO COM POSTGRESQL');
console.log('========================================');
console.log(`Host: ${client.host}`);
console.log(`Port: ${client.port}`);
console.log(`Database: ${client.database}`);
console.log(`User: ${client.user}`);
console.log(`Password: ${'*'.repeat(client.password?.length || 0)}`);
console.log('========================================\n');

client.connect()
  .then(() => {
    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO!\n');
    
    // Testar query simples
    return client.query('SELECT NOW() as tempo_atual');
  })
  .then(result => {
    console.log('✅ Query executada com sucesso!');
    console.log('Tempo atual do banco:', result.rows[0].tempo_atual);
    
    // Verificar schema tenant_teste
    return client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'tenant_teste'
    `);
  })
  .then(result => {
    if (result.rows.length > 0) {
      console.log('✅ Schema "tenant_teste" encontrado!\n');
      
      // Verificar tabelas
      return client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'tenant_teste'
        ORDER BY table_name
      `);
    } else {
      console.log('⚠️  Schema "tenant_teste" NÃO encontrado!');
      console.log('Execute o arquivo setup_database.sql no pgAdmin\n');
      throw new Error('Schema não encontrado');
    }
  })
  .then(result => {
    console.log('📋 Tabelas encontradas no schema "tenant_teste":');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');
    
    // Verificar dados iniciais
    return client.query(`
      SET search_path TO tenant_teste;
      SELECT 
        (SELECT COUNT(*) FROM secretarias) as total_secretarias,
        (SELECT COUNT(*) FROM setores) as total_setores,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios;
    `);
  })
  .then(result => {
    const dados = result.rows[0];
    console.log('📊 Dados iniciais:');
    console.log(`  - Secretarias: ${dados.total_secretarias}`);
    console.log(`  - Setores: ${dados.total_setores}`);
    console.log(`  - Usuários: ${dados.total_usuarios}`);
    console.log('');
    
    if (dados.total_usuarios > 0) {
      return client.query(`
        SET search_path TO tenant_teste;
        SELECT nome, email, cpf, tipo FROM usuarios;
      `);
    }
  })
  .then(result => {
    if (result && result.rows.length > 0) {
      console.log('👤 Usuários cadastrados:');
      result.rows.forEach(user => {
        console.log(`  - ${user.nome} (${user.email}) - ${user.tipo}`);
      });
      console.log('');
    }
    
    console.log('========================================');
    console.log('✅ BANCO DE DADOS CONFIGURADO CORRETAMENTE!');
    console.log('========================================\n');
    console.log('Você pode fazer login com:');
    console.log('  CPF: 00000000000');
    console.log('  Senha: 123456\n');
    
    client.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ ERRO AO CONECTAR:\n');
    console.error(err.message);
    console.log('\n========================================');
    console.log('POSSÍVEIS SOLUÇÕES:');
    console.log('========================================');
    console.log('1. Verifique se o PostgreSQL está rodando');
    console.log('2. Confirme a senha no arquivo .env');
    console.log('3. Verifique se o banco "jprocesso_global" existe');
    console.log('4. Execute o script setup_database.sql no pgAdmin');
    console.log('========================================\n');
    
    client.end();
    process.exit(1);
  });
