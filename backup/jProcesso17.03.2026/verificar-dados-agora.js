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

async function verificarDados() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Listar secretarias
    const [secretarias] = await sequelize.query(`
      SELECT id, nome, sigla, ativo 
      FROM tenant_iraucuba.secretarias 
      WHERE ativo = true
      ORDER BY nome
    `);
    
    console.log('\n📋 SECRETARIAS:');
    console.log('Total:', secretarias.length);
    secretarias.forEach(sec => {
      console.log(`  - ${sec.nome} (${sec.sigla}) - ID: ${sec.id}`);
    });

    // Listar setores
    const [setores] = await sequelize.query(`
      SELECT s.id, s.nome, s.sigla, sc.nome as secretaria_nome
      FROM tenant_iraucuba.setores s
      LEFT JOIN tenant_iraucuba.secretarias sc ON s.secretaria_id = sc.id
      WHERE s.ativo = true
      ORDER BY sc.nome, s.nome
    `);
    
    console.log('\n📊 SETORES:');
    console.log('Total:', setores.length);
    setores.forEach(set => {
      console.log(`  - ${set.nome} (${set.sigla || 'sem sigla'}) - Secretaria: ${set.secretaria_nome}`);
    });

    // Listar usuários
    const [usuarios] = await sequelize.query(`
      SELECT u.id, u.nome, u.email, u.tipo, s.nome as setor_nome
      FROM tenant_iraucuba.usuarios u
      LEFT JOIN tenant_iraucuba.setores s ON u.setor_id = s.id
      WHERE u.ativo = true
      ORDER BY u.nome
    `);
    
    console.log('\n👥 USUÁRIOS:');
    console.log('Total:', usuarios.length);
    usuarios.forEach(user => {
      console.log(`  - ${user.nome} (${user.email}) - Tipo: ${user.tipo} - Setor: ${user.setor_nome || 'Não atribuído'}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarDados();
