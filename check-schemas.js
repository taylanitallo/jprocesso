const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './server/.env' });

const connStr = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jprocesso_global';
const seq = new Sequelize(connStr, { logging: false });

(async () => {
  const schemas = ['tenant_iraucuba', 'tenant_teste'];
  for (const s of schemas) {
    const tables = ['dids', 'contratos', 'credores', 'lancamentos'];
    console.log(`\n=== Schema: ${s} ===`);
    for (const t of tables) {
      try {
        const [rows] = await seq.query(`SELECT COUNT(*) as n FROM ${s}.${t}`);
        console.log(`  ${t}: ${rows[0].n} registros`);
      } catch(e) { console.log(`  ${t}: ERRO - ${e.message.slice(0,80)}`); }
    }
    // Mostrar contratos e credores existentes
    try {
      const [contratos] = await seq.query(`SELECT id, numero_contrato, objeto FROM ${s}.contratos LIMIT 5`);
      contratos.forEach(c => console.log(`  [contrato] ${c.numero_contrato} - ${c.objeto}`));
    } catch(e) {}
    try {
      const [credores] = await seq.query(`SELECT id, razao_social, cnpj_cpf FROM ${s}.credores LIMIT 5`);
      credores.forEach(c => console.log(`  [credor] ${c.razao_social} / ${c.cnpj_cpf}`));
    } catch(e) {}
    try {
      const [dids] = await seq.query(`SELECT id, numero_did, contrato_ref, credor_sec1 FROM ${s}.dids LIMIT 5`);
      dids.forEach(d => console.log(`  [did] ${d.numero_did} | contrato_ref=${d.contrato_ref} | credor=${d.credor_sec1}`));
    } catch(e) {}
  }
  await seq.close();
})();
