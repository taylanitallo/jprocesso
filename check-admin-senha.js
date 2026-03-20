require('dotenv').config({ path: './server/.env' });
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres', logging: false
});

const senhasTestar = ['admin123', 'Admin123', 'admin', '123456', 'jeos2025', 'jeos123', 'admin@123'];

(async () => {
  try {
    const [rows] = await db.query("SELECT id, nome, cpf, senha FROM public.admins WHERE cpf = '04335471386'");
    if (!rows.length) { console.log('Admin não encontrado'); return; }
    const admin = rows[0];
    console.log('Admin:', admin.nome, '| CPF:', admin.cpf);
    console.log('Hash senha:', admin.senha);
    for (const s of senhasTestar) {
      const ok = await bcrypt.compare(s, admin.senha);
      if (ok) { console.log(`✅ Senha correta: "${s}"`); }
    }
    console.log('Teste concluído. Se nenhuma ✅ apareceu, a senha é desconhecida.');
  } catch (e) {
    console.error(e.message);
  } finally {
    await db.close();
  }
})();
