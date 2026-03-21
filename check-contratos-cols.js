require('dotenv').config();
const { Sequelize } = require('sequelize');
const seq = new Sequelize(
  process.env.DB_NAME || 'jprocesso_global',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '123456',
  { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, dialect: 'postgres', logging: false }
);
seq.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'tenant_iraucuba' AND table_name = 'contratos' ORDER BY ordinal_position",
  { type: Sequelize.QueryTypes.SELECT }
).then(r => {
  console.log('Colunas da tabela contratos:');
  r.forEach(c => console.log(' -', c.column_name, '|', c.data_type));
  if (r.length === 0) console.log('(tabela não encontrada ou vazia)');
  seq.close();
}).catch(e => { console.error('ERRO:', e.message); seq.close(); });
