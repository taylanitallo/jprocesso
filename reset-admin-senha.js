require('dotenv').config({ path: './server/.env' });
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres', logging: false
});

const NOVA_SENHA = '1410C@valao';

(async () => {
  try {
    const hash = await bcrypt.hash(NOVA_SENHA, 10);
    await db.query(
      "UPDATE public.admins SET senha = :hash WHERE cpf = '04335471386'",
      { replacements: { hash } }
    );
    console.log('✅ Senha redefinida com sucesso!');
    console.log('   CPF:   04335471386');
    console.log('   Senha: ' + NOVA_SENHA);
  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await db.close();
  }
})();
