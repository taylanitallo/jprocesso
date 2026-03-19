const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './server/.env' });
const connStr = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jprocesso_global';
const seq = new Sequelize(connStr, { logging: false });

(async () => {
  const [rows] = await seq.query(
    `SELECT DISTINCT credor_sec1, cnpj_cpf_credor_sec1 FROM tenant_iraucuba.dids WHERE credor_sec1 IS NOT NULL AND credor_sec1 != ''`
  );
  console.log('Credores únicos nos DIDs:');
  rows.forEach(r => console.log(`  "${r.credor_sec1}" / CNPJ: "${r.cnpj_cpf_credor_sec1}"`));
  await seq.close();
})();
