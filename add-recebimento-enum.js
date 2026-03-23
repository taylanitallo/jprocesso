require('dotenv').config();
const { Sequelize } = require('sequelize');

const db = new Sequelize(
  process.env.DB_NAME || 'postgres',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co')
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}
  }
);

(async () => {
  try {
    await db.authenticate();
    console.log('Conectado ao banco');

    // Tenta adicionar ao ENUM tipo (Supabase usa ENUM nativo)
    try {
      await db.query(`ALTER TYPE "tenant_iraucuba"."enum_tramitacoes_tipo_acao" ADD VALUE IF NOT EXISTS 'recebimento'`);
      console.log('✅ Valor recebimento adicionado ao ENUM');
    } catch (e) {
      console.log('ENUM não encontrado, tentando CHECK constraint:', e.message);
      // Remove constraint antiga e recria com recebimento
      await db.query(`ALTER TABLE "tenant_iraucuba"."tramitacoes" DROP CONSTRAINT IF EXISTS "tramitacoes_tipo_acao_check"`);
      await db.query(`ALTER TABLE "tenant_iraucuba"."tramitacoes" ADD CONSTRAINT "tramitacoes_tipo_acao_check" CHECK (tipo_acao IN ('abertura','tramite','devolucao','conclusao','arquivamento','recebimento'))`);
      console.log('✅ CHECK constraint atualizado com recebimento');
    }
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await db.close();
  }
})();
