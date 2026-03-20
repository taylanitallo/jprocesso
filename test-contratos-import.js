require('dotenv').config();
const { Sequelize } = require('sequelize');
const defineCredorModel = require('./server/models/Credor');
const defineContratoModel = require('./server/models/Contrato');

const tenantSchema = 'iraucuba';
const db = new Sequelize(
  process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      options: `-c search_path="${tenantSchema}",public`,
    }
  }
);

const Credor = defineCredorModel(db);
const Contrato = defineContratoModel(db);

db.authenticate().then(async () => {
  console.log('✅ DB conectado');

  // Teste 1: Credor.findOne
  try {
    const c = await Credor.findOne({ where: { cnpj_cpf: '10.348.898/0001-47' } });
    console.log('Credor.findOne:', c ? 'ENCONTRADO id=' + c.id : 'não encontrado');
  } catch (e) {
    console.error('❌ Credor.findOne ERRO:', e.message);
  }

  // Teste 2: Credor.create (com cleanup)
  const testCnpj = '99.999.999/9999-00';
  try {
    await Credor.destroy({ where: { cnpj_cpf: testCnpj } }).catch(() => {});
    const nc = await Credor.create({
      razao_social: 'TESTE IMPORTAÇÃO LTDA',
      cnpj_cpf: testCnpj,
      tipo: 'Jurídica',
      status: 'ATIVO'
    });
    console.log('Credor.create: ✅ id=' + nc.id);
    await nc.destroy();
    console.log('Credor.destroy: ✅');
  } catch (e) {
    console.error('❌ Credor.create ERRO:', e.message);
    if (e.parent) console.error('   DB error:', e.parent.message);
  }

  // Teste 3: Contrato.findOne
  try {
    const ct = await Contrato.findOne({ where: { numero_contrato: 'TEST-001' } });
    console.log('Contrato.findOne:', ct ? 'ENCONTRADO' : 'não encontrado');
  } catch (e) {
    console.error('❌ Contrato.findOne ERRO:', e.message);
    if (e.parent) console.error('   DB error:', e.parent.message);
  }

  // Teste 4: Contrato.create (com credor real)
  try {
    // Usar credor existente ou criar temp
    let credorId = null;
    const cExist = await Credor.findOne({ limit: 1 });
    if (cExist) {
      credorId = cExist.id;
      console.log('Usando credor existente id=' + credorId);
    } else {
      const nc = await Credor.create({ razao_social: 'CREDOR TEMP', cnpj_cpf: '11.111.111/1111-00', tipo: 'Jurídica', status: 'ATIVO' });
      credorId = nc.id;
      console.log('Credor temp criado id=' + credorId);
    }
    const numTest = 'TEST-IMPORT-' + Date.now();
    const ct = await Contrato.create({
      tipo_contrato: 'CONTRATO',
      numero_contrato: numTest,
      objeto: 'Teste de importação',
      credor_id: credorId,
      valor: 1000,
      vigencia_inicio: '2026-01-01',
      vigencia_fim: '2026-12-31',
      status: 'ATIVO',
    });
    console.log('Contrato.create: ✅ id=' + ct.id);
    await ct.destroy();
    console.log('Contrato.destroy: ✅');
  } catch (e) {
    console.error('❌ Contrato.create ERRO:', e.message);
    if (e.parent) console.error('   DB error:', e.parent.message);
  }

  process.exit(0);
}).catch(e => {
  console.error('❌ Erro de autenticação:', e.message);
  process.exit(1);
});
