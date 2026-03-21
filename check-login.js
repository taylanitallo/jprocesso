require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const CPF = '00000000000';
const SENHA = '12954768';
const SCHEMA = 'tenant_iraucuba';

const client = new Client({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'jprocesso_global',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  ssl: (process.env.DB_HOST || '').includes('supabase') ? { rejectUnauthorized: false } : false,
});

(async () => {
  await client.connect();
  try {
    // Lista tabelas do schema
    const t = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name`,
      [SCHEMA]
    );
    console.log('Tabelas no schema:');
    t.rows.forEach(r => console.log(' -', r.table_name));

    const tableName = t.rows.some(r => r.table_name === 'users') ? 'users'
                    : t.rows.some(r => r.table_name === 'usuarios') ? 'usuarios'
                    : null;
    if (!tableName) { console.log('\n❌ Tabela de usuários não encontrada!'); return; }

    // Busca usuário pelo CPF
    const result = await client.query(
      `SELECT id, nome, cpf, senha, ativo, tipo FROM "${SCHEMA}"."${tableName}" WHERE cpf = $1 LIMIT 1`,
      [CPF]
    );

    if (result.rows.length === 0) {
      console.log('\n❌ Usuário NÃO encontrado com CPF:', CPF);
      const todos = await client.query(`SELECT cpf, nome, ativo FROM "${SCHEMA}"."${tableName}" LIMIT 10`);
      console.log('Usuários cadastrados:');
      todos.rows.forEach(u => console.log(' -', u.cpf, '|', u.nome, '| ativo:', u.ativo));
    } else {
      const user = result.rows[0];
      console.log('\n✅ Usuário encontrado:', user.nome, '| ativo:', user.ativo, '| tipo:', user.tipo);
      const ok = await bcrypt.compare(SENHA, user.senha);
      console.log('   Senha correta:', ok ? '✅ SIM' : '❌ NÃO - hash não bate');
      if (!ok) {
        console.log('   Hash no banco:', user.senha);
        const novoHash = await bcrypt.hash(SENHA, 10);
        console.log('\n   Para corrigir, execute no banco:');
        console.log(`   UPDATE "${SCHEMA}"."${tableName}" SET senha = '${novoHash}' WHERE cpf = '${CPF}';`);
      }
      if (!user.ativo) {
        console.log('\n⚠️  Usuário está INATIVO (ativo = false). Para ativar:');
        console.log(`   UPDATE "${SCHEMA}"."${tableName}" SET ativo = true WHERE cpf = '${CPF}';`);
      }
    }
  } finally {
    await client.end();
  }
})().catch(e => console.error('ERRO:', e.message));
