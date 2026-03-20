require('dotenv').config({ path: './server/.env' });
const { Sequelize } = require('sequelize');

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

(async () => {
  try {
    const [r] = await db.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='admins') as existe"
    );
    console.log('Tabela public.admins existe:', r[0].existe);

    if (r[0].existe) {
      const [rows] = await db.query("SELECT id, nome, cpf FROM public.admins");
      console.log('Admins cadastrados:', rows.length ? rows : 'NENHUM');
    } else {
      console.log('❌ Tabela NÃO existe - precisa ser criada!');
    }
  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await db.close();
  }
})();
