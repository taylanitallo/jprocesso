const { Sequelize } = require('sequelize');

const masterDb = new Sequelize('postgres', 'postgres.ywwzwonpctlbbnqkkjtw', '1410C@valao', {
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    keepAlive: true,
    connectTimeout: 10000,
    ssl: { require: true, rejectUnauthorized: false }
  }
});

async function testar() {
  try {
    console.log('Testando conexão com porta 6543...');
    await masterDb.authenticate();
    console.log('✅ Conexão OK!\n');

    const [result] = await masterDb.query(
      "SELECT id, nome_municipio, subdominio, ativo FROM public.clientes WHERE subdominio = 'iraucuba'"
    );
    console.log('Resultado:', result);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
  } finally {
    await masterDb.close();
  }
}

testar();
