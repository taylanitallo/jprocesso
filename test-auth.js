process.chdir(__dirname + '/server');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const Tenant = require('./server/models/Tenant');
const { getTenantConnection } = require('./server/config/database');
const initTenantModels = require('./server/models');

async function testLogin() {
  try {
    const cpf = '04335471386';
    const senha = '123456';
    const subdomain = 'iraucuba';

    console.log('1. Buscando tenant...');
    const tenant = await Tenant.findOne({ where: { subdominio: subdomain, ativo: true } });
    if (!tenant) {
      console.log('ERRO: Tenant não encontrado');
      return;
    }
    console.log('Tenant encontrado:', tenant.nome_municipio, 'schema:', tenant.schema);

    console.log('2. Obtendo conexão do tenant...');
    const tenantDb = await getTenantConnection(tenant.schema);
    console.log('Conexão obtida');

    console.log('3. Inicializando modelos...');
    const models = initTenantModels(tenantDb);
    const { User } = models;
    console.log('Modelos inicializados');

    console.log('4. Buscando usuário...');
    const user = await User.findOne({ where: { cpf, ativo: true } });
    if (!user) {
      console.log('ERRO: Usuário não encontrado. CPF:', cpf);
      // Listar usuários
      const todos = await User.findAll({ attributes: ['cpf', 'nome', 'tipo', 'ativo'], limit: 5 });
      console.log('Usuários disponíveis:', todos.map(u => ({ cpf: u.cpf, nome: u.nome, tipo: u.tipo, ativo: u.ativo })));
      return;
    }
    console.log('Usuário encontrado:', user.nome, user.email);

    console.log('5. Verificando senha...');
    const valid = await bcrypt.compare(senha, user.senha);
    console.log('Senha válida:', valid);
    if (!valid) {
      console.log('Hash salvo:', user.senha);
    }

    process.exit(0);
  } catch (err) {
    console.error('ERRO:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testLogin();
