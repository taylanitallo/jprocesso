require('dotenv').config();
const { Sequelize } = require('sequelize');

const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: false
});

async function run() {
  await s.authenticate();
  console.log('✅ Conectado ao banco:', process.env.DB_NAME);

  // 1 — Listar schemas tenant_*
  const [schemas] = await s.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name
  `);
  console.log('\n📂 Schemas tenant:', schemas.map(r => r.schema_name).join(', '));

  // 2 — Contagem de dados no tenant iraucuba
  const tabelas = ['processos', 'secretarias', 'setores', 'usuarios', 'tramitacoes',
    'did_formularios', 'almoxarifado_lotes', 'financeiro_lancamentos'];
  console.log('\n📊 Contagem tenant_iraucuba:');
  for (const t of tabelas) {
    try {
      const [[{ total }]] = await s.query(`SELECT COUNT(*) as total FROM tenant_iraucuba.${t}`);
      console.log(`  ${t}: ${total}`);
    } catch (e) {
      console.log(`  ${t}: ERRO - ${e.message}`);
    }
  }

  // 3 — Contagem de dados no tenant teste
  console.log('\n📊 Contagem tenant_teste:');
  for (const t of tabelas) {
    try {
      const [[{ total }]] = await s.query(`SELECT COUNT(*) as total FROM tenant_teste.${t}`);
      console.log(`  ${t}: ${total}`);
    } catch (e) {
      console.log(`  ${t}: ERRO - ${e.message}`);
    }
  }

  // 4 — Colunas críticas do processos iraucuba vs Sequelize model
  const [cols] = await s.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'tenant_iraucuba' AND table_name = 'processos'
    ORDER BY ordinal_position
  `);
  console.log('\n📋 Colunas processos iraucuba:', cols.map(c => c.column_name).join(', '));

  // 5 — Colunas de usuários
  const [ucols] = await s.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'tenant_iraucuba' AND table_name = 'usuarios'
    ORDER BY ordinal_position
  `);
  console.log('\n👤 Colunas usuarios iraucuba:', ucols.map(c => c.column_name).join(', '));

  // 6 — Verificar setor_atual_id vs setor_id em processos
  const temSetorAtual = cols.some(c => c.column_name === 'setor_atual_id');
  const temSetorId = cols.some(c => c.column_name === 'setor_id');
  console.log('\n🔍 processos.setor_atual_id existe?', temSetorAtual);
  console.log('🔍 processos.setor_id existe?', temSetorId);

  // 7 — Amostra de processos
  const [procs] = await s.query(`SELECT id, numero, status, setor_atual_id FROM tenant_iraucuba.processos LIMIT 3`);
  console.log('\n📄 Amostra processos:', JSON.stringify(procs, null, 2));

  await s.close();
}

run().catch(e => { console.error('ERRO GERAL:', e.message); process.exit(1); });
