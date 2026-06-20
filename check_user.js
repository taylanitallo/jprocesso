const { Sequelize } = require('sequelize');
const sq = new Sequelize('postgres', 'postgres.ywwzwonpctlbbnqkkjtw', '1410C@valao', {
  host: 'aws-1-sa-east-1.pooler.supabase.com', port: 5432, dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false
});
sq.query('SELECT id, nome, email, tipo FROM "tenant_iraucuba"."usuarios" ORDER BY created_at LIMIT 10')
  .then(([r]) => { console.log(JSON.stringify(r, null, 2)); })
  .catch(e => console.error(e.message))
  .finally(() => sq.close());
