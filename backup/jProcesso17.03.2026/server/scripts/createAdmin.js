const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

async function createAdmin() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Criar tabela de admins se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.admins (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cpf VARCHAR(11) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabela admins criada/verificada');

    // Gerar hash da senha
    const senha = 'admin123';
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir admin padrão
    const result = await pool.query(`
      INSERT INTO public.admins (nome, cpf, senha, email, ativo)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cpf) 
      DO UPDATE SET 
        senha = EXCLUDED.senha,
        atualizado_em = CURRENT_TIMESTAMP
      RETURNING *;
    `, [
      'Administrador do Sistema',
      '00000000191',
      senhaHash,
      'admin@jprocesso.gov.br',
      true
    ]);

    console.log('\n✅ Admin criado/atualizado com sucesso!\n');
    console.log('📋 Credenciais de acesso:');
    console.log('   URL: http://localhost:3000/');
    console.log('   CPF: 00000000191');
    console.log('   Senha: admin123');
    console.log('\n🔐 Dados do admin:');
    console.log('   ID:', result.rows[0].id);
    console.log('   Nome:', result.rows[0].nome);
    console.log('   Email:', result.rows[0].email);
    console.log('   Ativo:', result.rows[0].ativo);

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();
