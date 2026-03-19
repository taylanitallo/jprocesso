require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function verificarProcessos() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    const [processos] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM tenant_iraucuba.processos
    `);
    
    console.log(`\n📊 Total de processos: ${processos[0].total}`);

    if (processos[0].total > 0) {
      const [ultimos] = await sequelize.query(`
        SELECT numero, assunto, status, created_at
        FROM tenant_iraucuba.processos
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      console.log('\n📋 Últimos 5 processos:');
      ultimos.forEach(p => {
        console.log(`  - ${p.numero}: ${p.assunto} (${p.status})`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarProcessos();
