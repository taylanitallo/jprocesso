const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'jprocesso_global',
  user: 'postgres',
  password: '123456',
});

async function testarLogin() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco\n');
    
    // Buscar usuário
    const result = await client.query(`
      SELECT id, nome, cpf, email, tipo, senha, ativo
      FROM tenant_teste.usuarios
      WHERE cpf = '00000000000'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado!');
      client.end();
      return;
    }
    
    const user = result.rows[0];
    console.log('📋 Usuário encontrado:');
    console.log('   Nome:', user.nome);
    console.log('   CPF:', user.cpf);
    console.log('   Email:', user.email);
    console.log('   Tipo:', user.tipo);
    console.log('   Ativo:', user.ativo);
    console.log('   Hash senha:', user.senha.substring(0, 20) + '...');
    console.log('');
    
    // Testar senha
    const senhaCorreta = '123456';
    const senhaValida = await bcrypt.compare(senhaCorreta, user.senha);
    
    console.log('🔐 Teste de senha:');
    console.log('   Senha testada:', senhaCorreta);
    console.log('   Resultado:', senhaValida ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    console.log('');
    
    if (senhaValida) {
      console.log('✅ Login funcionaria com estas credenciais!');
      console.log('   CPF: 00000000000');
      console.log('   Senha: 123456');
    } else {
      console.log('❌ A senha não confere!');
      console.log('Vou gerar uma nova senha...\n');
      
      // Gerar nova senha
      const novaSenha = '123456';
      const novoHash = await bcrypt.hash(novaSenha, 10);
      
      console.log('Nova senha hash:', novoHash);
      console.log('\nExecute no pgAdmin:');
      console.log(`UPDATE tenant_teste.usuarios SET senha = '${novoHash}' WHERE cpf = '00000000000';`);
    }
    
    client.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    client.end();
  }
}

testarLogin();
