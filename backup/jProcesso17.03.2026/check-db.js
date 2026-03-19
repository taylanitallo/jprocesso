const { Sequelize } = require('sequelize');
require('dotenv').config();

const db = new Sequelize(
  process.env.DB_NAME || 'jprocesso_global',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '123456',
  { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, dialect: 'postgres', logging: false }
);

(async () => {
  try {
    await db.authenticate();
    console.log('CONEXÃO OK\n');

    const [schemas] = await db.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY schema_name"
    );
    console.log('SCHEMAS no banco:');
    schemas.forEach(r => console.log(' -', r.schema_name));

    console.log('\nVerificando schema tenant_teste...');
    const [tables] = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'tenant_teste' ORDER BY table_name"
    );
    if (tables.length === 0) {
      console.log(' -> Schema "tenant_teste" NAO EXISTE ou esta vazio!');
    } else {
      console.log(' Tabelas em tenant_teste:');
      tables.forEach(r => console.log('   -', r.table_name));

      for (const t of ['processos', 'secretarias', 'users']) {
        try {
          const [[{ count }]] = await db.query(`SELECT COUNT(*) AS count FROM tenant_teste.${t}`);
          console.log(`   ${t}: ${count} registro(s)`);
        } catch(e) { /* skip */ }
      }
    }

    const [schemas2] = await db.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast','public') ORDER BY schema_name"
    );
    if (schemas2.length > 0) {
      for (const s of schemas2) {
        const [ts] = await db.query(
          `SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = '${s.schema_name}'`
        );
        console.log(`\nSchema "${s.schema_name}": ${ts[0].c} tabela(s)`);
        try {
          const [[{ count }]] = await db.query(`SELECT COUNT(*) AS count FROM "${s.schema_name}".processos`);
          console.log(` -> processos: ${count}`);
        } catch { console.log(' -> tabela processos nao encontrada'); }
        try {
          const [[{ count }]] = await db.query(`SELECT COUNT(*) AS count FROM "${s.schema_name}".secretarias`);
          console.log(` -> secretarias: ${count}`);
        } catch { console.log(' -> tabela secretarias nao encontrada'); }
      }
    }
  } catch (err) {
    console.error('ERRO DE CONEXAO:', err.message);
  } finally {
    await db.close();
  }
})();
