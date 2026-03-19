const bcrypt = require('bcryptjs');
const { masterDb } = require('./server/config/database');

async function criarUsuarioAdmin() {
  try {
    await masterDb.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Criar tenant de exemplo
    const [tenant] = await masterDb.query(`
      INSERT INTO tenants (nome_municipio, cnpj, subdominio, schema, cidade, estado, ativo)
      VALUES ('Prefeitura de Teste', '12345678000199', 'teste', 'tenant_teste', 'Teste', 'CE', true)
      ON CONFLICT (subdominio) DO UPDATE SET nome_municipio = EXCLUDED.nome_municipio
      RETURNING id, schema
    `);

    const tenantId = tenant[0].id;
    const schemaName = tenant[0].schema;
    console.log(`✅ Tenant criado/encontrado: ${schemaName}`);

    // Criar schema se não existir
    await masterDb.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Criar tabela users no schema do tenant
    await masterDb.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        cpf VARCHAR(11),
        cargo VARCHAR(255),
        role VARCHAR(50) DEFAULT 'operacional',
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar usuário admin
    const senhaHash = await bcrypt.hash('123456', 10);
    
    await masterDb.query(`
      INSERT INTO ${schemaName}.users (nome, email, cpf, senha, role)
      VALUES ('Administrador', 'admin@teste.com', '00000000000', '${senhaHash}', 'admin')
      ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, cpf = EXCLUDED.cpf
    `);

    console.log('✅ Usuário criado com sucesso!');
    console.log('\n📋 Dados de Acesso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Prefeitura: teste');
    console.log('CPF: 00000000000');
    console.log('Senha: 123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

criarUsuarioAdmin();
