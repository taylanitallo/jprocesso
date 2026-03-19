const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function listarUsuarios() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 Usuários em tenant_iraucuba:\n');
    
    const result = await client.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.cpf,
        u.tipo,
        u.ativo,
        s.nome as secretaria_nome,
        st.nome as setor_nome,
        u.permissoes,
        u.created_at
      FROM tenant_iraucuba.usuarios u
      LEFT JOIN tenant_iraucuba.secretarias s ON u.secretaria_id = s.id
      LEFT JOIN tenant_iraucuba.setores st ON u.setor_id = st.id
      ORDER BY u.nome;
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nome}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 CPF: ${user.cpf}`);
        console.log(`   👤 Tipo: ${user.tipo}`);
        console.log(`   🏢 Secretaria: ${user.secretaria_nome || 'Não vinculado'}`);
        console.log(`   📂 Setor: ${user.setor_nome || 'Não vinculado'}`);
        console.log(`   ✅ Ativo: ${user.ativo ? 'Sim' : 'Não'}`);
        console.log(`   🔑 Permissões: ${JSON.stringify(user.permissoes, null, 2)}`);
        console.log(`   📅 Criado em: ${user.created_at}`);
        console.log('');
      });
      
      console.log(`\n✅ Total: ${result.rows.length} usuário(s)`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

listarUsuarios();
