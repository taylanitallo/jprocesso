require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dialect: 'postgres',
  ssl: { rejectUnauthorized: false },
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
})

async function run() {
  await sequelize.authenticate()
  console.log('Conectado.')

  // Busca todos os schemas de tenants
  const [schemas] = await sequelize.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
  `)

  for (const { schema_name } of schemas) {
    try {
      const [cols] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = '${schema_name}' AND table_name = 'dids' AND column_name = 'numero_did'
      `)
      if (!cols.length) { console.log(`${schema_name}: tabela dids não existe, pulando`); continue }

      const tipo = cols[0].data_type
      if (tipo === 'integer' || tipo === 'bigint') {
        await sequelize.query(`
          ALTER TABLE ${schema_name}.dids
            ALTER COLUMN numero_did TYPE VARCHAR(30) USING numero_did::text
        `)
        console.log(`${schema_name}: numero_did migrado de ${tipo} → VARCHAR(30)`)
      } else {
        console.log(`${schema_name}: numero_did já é ${tipo}, nada a fazer`)
      }
    } catch (err) {
      console.error(`${schema_name}: ERRO —`, err.message)
    }
  }

  await sequelize.close()
  console.log('Concluído.')
}

run().catch(err => { console.error(err); process.exit(1) })
