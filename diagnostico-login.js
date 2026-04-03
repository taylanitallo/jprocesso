const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './server/.env' });

const masterDb = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  }
);

async function diagnosticar() {
  try {
    console.log('========================================');
    console.log('DIAGNÓSTICO DE LOGIN - JPROCESSO');
    console.log('========================================\n');

    console.log('1. Testando conexão com banco master...');
    await masterDb.authenticate();
    console.log('✅ Conexão bem-sucedida!\n');

    console.log('2. Verificando se tabela "clientes" existe...');
    const [tables] = await masterDb.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'clientes'
    `);
    
    if (tables.length === 0) {
      console.log('❌ PROBLEMA ENCONTRADO: Tabela "clientes" não existe!\n');
      console.log('SOLUÇÃO: Você precisa criar a tabela "clientes" no banco master.');
      console.log('Execute o seguinte SQL no banco de dados:\n');
      console.log(`
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_municipio VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  subdominio VARCHAR(255) NOT NULL UNIQUE,
  schema VARCHAR(255) NOT NULL UNIQUE,
  cidade VARCHAR(255) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir tenant de teste para Iraucuba
INSERT INTO public.clientes (nome_municipio, cnpj, subdominio, schema, cidade, estado, ativo, configuracoes)
VALUES (
  'Prefeitura Municipal de Iraucuba',
  '07935009000198',
  'iraucuba',
  'tenant_iraucuba',
  'Iraucuba',
  'CE',
  true,
  '{"cor_primaria": "#0066CC", "cor_secundaria": "#004C99"}'::jsonb
)
ON CONFLICT (subdominio) DO NOTHING;
      `);
      await masterDb.close();
      return;
    }

    console.log('✅ Tabela "clientes" existe!\n');

    console.log('3. Buscando tenant "iraucuba"...');
    const [tenants] = await masterDb.query(`
      SELECT id, nome_municipio, subdominio, schema, cidade, estado, ativo
      FROM public.clientes
      WHERE subdominio = 'iraucuba'
    `);

    if (tenants.length === 0) {
      console.log('❌ PROBLEMA ENCONTRADO: Tenant "iraucuba" não está cadastrado!\n');
      console.log('SOLUÇÃO: Execute o seguinte SQL para criar o tenant:\n');
      console.log(`
INSERT INTO public.clientes (nome_municipio, cnpj, subdominio, schema, cidade, estado, ativo, configuracoes)
VALUES (
  'Prefeitura Municipal de Iraucuba',
  '07935009000198',
  'iraucuba',
  'tenant_iraucuba',
  'Iraucuba',
  'CE',
  true,
  '{"cor_primaria": "#0066CC", "cor_secundaria": "#004C99"}'::jsonb
)
ON CONFLICT (subdominio) DO UPDATE SET ativo = true;
      `);
    } else {
      console.log('✅ Tenant encontrado:');
      console.log(JSON.stringify(tenants[0], null, 2));
      console.log('');

      const tenant = tenants[0];
      
      console.log(`4. Verificando se schema "${tenant.schema}" existe...`);
      const [schemas] = await masterDb.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = '${tenant.schema}'
      `);

      if (schemas.length === 0) {
        console.log(`❌ PROBLEMA ENCONTRADO: Schema "${tenant.schema}" não existe!\n`);
        console.log('SOLUÇÃO: O schema do tenant precisa ser criado. Execute:\n');
        console.log(`CREATE SCHEMA IF NOT EXISTS ${tenant.schema};`);
        console.log('\nDepois você precisará criar as tabelas do tenant nesse schema.');
      } else {
        console.log(`✅ Schema "${tenant.schema}" existe!\n`);
        
        console.log('5. Verificando tabela de usuários no schema do tenant...');
        const [userTables] = await masterDb.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = '${tenant.schema}' 
          AND tablename = 'usuarios'
        `);

        if (userTables.length === 0) {
          console.log('❌ PROBLEMA: Tabela "usuarios" não existe no schema do tenant!');
          console.log('SOLUÇÃO: Você precisa criar a estrutura completa do tenant.');
        } else {
          console.log('✅ Tabela "usuarios" existe!\n');
          
          console.log('6. Listando usuários cadastrados...');
          const [users] = await masterDb.query(`
            SELECT id, nome, cpf, email, tipo, ativo 
            FROM ${tenant.schema}.usuarios 
            LIMIT 5
          `);
          
          if (users.length === 0) {
            console.log('⚠️  Nenhum usuário cadastrado ainda.');
          } else {
            console.log(`✅ ${users.length} usuário(s) encontrado(s):`);
            users.forEach(u => {
              console.log(`  - ${u.nome} (CPF: ${u.cpf}, Tipo: ${u.tipo}, Ativo: ${u.ativo})`);
            });
          }
        }
      }
    }

    console.log('\n========================================');
    console.log('DIAGNÓSTICO CONCLUÍDO');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await masterDb.close();
  }
}

diagnosticar();
