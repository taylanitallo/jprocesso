// Script para popular o banco de dados com dados de teste
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const Tenant = require('./server/models/Tenant');
const { getTenantConnection } = require('./server/config/database');
const initTenantModels = require('./server/models');

// Conexão principal
const mainDb = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando população do banco de dados...\n');

    // 1. Criar ou buscar tenant
    console.log('1️⃣  Criando tenant...');
    const [tenant] = await Tenant.findOrCreate({
      where: { subdominio: 'teste' },
      defaults: {
        nome_municipio: 'Prefeitura de Teste',
        subdominio: 'teste',
        schema: 'tenant_teste',
        database_url: process.env.DATABASE_URL,
        ativo: true
      }
    });
    console.log('✅ Tenant criado:', tenant.nome_municipio, '\n');

    // 2. Criar schema do tenant
    console.log('2️⃣  Criando schema do tenant...');
    await mainDb.query(`CREATE SCHEMA IF NOT EXISTS ${tenant.schema}`);
    console.log('✅ Schema criado:', tenant.schema, '\n');

    // 3. Conectar ao schema do tenant
    console.log('3️⃣  Conectando ao schema do tenant...');
    const tenantDb = await getTenantConnection(tenant.schema);
    const models = initTenantModels(tenantDb);
    
    // Sincronizar tabelas
    await tenantDb.sync({ alter: true });
    console.log('✅ Tabelas sincronizadas\n');

    // 4. Criar Secretarias
    console.log('4️⃣  Criando secretarias...');
    const secretarias = await models.Secretaria.bulkCreate([
      { 
        nome: 'Secretaria de Administração',
        sigla: 'SEMAD',
        responsavel: 'João da Silva',
        telefone: '(85) 3333-1111',
        email: 'semad@teste.ce.gov.br'
      },
      { 
        nome: 'Secretaria de Educação',
        sigla: 'SEDUC',
        responsavel: 'Maria Santos',
        telefone: '(85) 3333-2222',
        email: 'seduc@teste.ce.gov.br'
      },
      { 
        nome: 'Secretaria de Saúde',
        sigla: 'SESAU',
        responsavel: 'Carlos Oliveira',
        telefone: '(85) 3333-3333',
        email: 'sesau@teste.ce.gov.br'
      },
      { 
        nome: 'Secretaria de Obras',
        sigla: 'SEOBR',
        responsavel: 'Ana Paula',
        telefone: '(85) 3333-4444',
        email: 'seobr@teste.ce.gov.br'
      }
    ]);
    console.log('✅ Secretarias criadas:', secretarias.length, '\n');

    // 5. Criar Setores
    console.log('5️⃣  Criando setores...');
    const setores = await models.Setor.bulkCreate([
      // Setores da SEMAD
      { nome: 'Protocolo Geral', secretariaId: secretarias[0].id },
      { nome: 'Recursos Humanos', secretariaId: secretarias[0].id },
      { nome: 'Almoxarifado', secretariaId: secretarias[0].id },
      
      // Setores da SEDUC
      { nome: 'Gestão Escolar', secretariaId: secretarias[1].id },
      { nome: 'Merenda Escolar', secretariaId: secretarias[1].id },
      
      // Setores da SESAU
      { nome: 'Atenção Básica', secretariaId: secretarias[2].id },
      { nome: 'Vigilância Sanitária', secretariaId: secretarias[2].id },
      
      // Setores da SEOBR
      { nome: 'Projetos', secretariaId: secretarias[3].id },
      { nome: 'Execução de Obras', secretariaId: secretarias[3].id }
    ]);
    console.log('✅ Setores criados:', setores.length, '\n');

    // 6. Criar Usuários
    console.log('6️⃣  Criando usuários...');
    const senha = await bcrypt.hash('123456', 10);
    
    const usuarios = await models.User.bulkCreate([
      {
        nome: 'Administrador',
        cpf: '00000000000',
        email: 'admin@teste.com',
        senha,
        tipo: 'admin',
        telefone: '(85) 99999-0000',
        ativo: true
      },
      {
        nome: 'João Silva',
        cpf: '11111111111',
        email: 'joao@teste.com',
        senha,
        tipo: 'gestor',
        telefone: '(85) 99999-1111',
        secretariaId: secretarias[0].id,
        setorId: setores[0].id,
        ativo: true
      },
      {
        nome: 'Maria Santos',
        cpf: '22222222222',
        email: 'maria@teste.com',
        senha,
        tipo: 'operacional',
        telefone: '(85) 99999-2222',
        secretariaId: secretarias[1].id,
        setorId: setores[3].id,
        ativo: true
      },
      {
        nome: 'Carlos Oliveira',
        cpf: '33333333333',
        email: 'carlos@teste.com',
        senha,
        tipo: 'operacional',
        telefone: '(85) 99999-3333',
        secretariaId: secretarias[2].id,
        setorId: setores[5].id,
        ativo: true
      }
    ]);
    console.log('✅ Usuários criados:', usuarios.length, '\n');

    // 7. Criar Processos
    console.log('7️⃣  Criando processos...');
    const dataAtual = new Date();
    const processos = [];

    for (let i = 1; i <= 10; i++) {
      const secretaria = secretarias[Math.floor(Math.random() * secretarias.length)];
      const setor = setores.find(s => s.secretariaId === secretaria.id);
      
      const processo = await models.Processo.create({
        numero: `${String(i).padStart(6, '0')}/${dataAtual.getFullYear()}`,
        assunto: [
          'Solicitação de Material de Escritório',
          'Manutenção de Equipamentos',
          'Licitação de Serviços',
          'Contratação de Pessoal',
          'Reforma de Unidade',
          'Aquisição de Veículos',
          'Convênio com Entidades',
          'Pagamento de Fornecedores',
          'Processo Administrativo',
          'Projeto de Infraestrutura'
        ][i - 1],
        interessado: `Interessado ${i}`,
        dataAbertura: new Date(dataAtual.getTime() - (i * 24 * 60 * 60 * 1000)),
        status: ['tramitacao', 'analise', 'concluido'][Math.floor(Math.random() * 3)],
        prioridade: ['normal', 'alta', 'urgente'][Math.floor(Math.random() * 3)],
        secretariaAtualId: secretaria.id,
        setorAtualId: setor.id,
        usuarioResponsavelId: usuarios[Math.floor(Math.random() * usuarios.length)].id
      });
      
      processos.push(processo);
    }
    console.log('✅ Processos criados:', processos.length, '\n');

    // 8. Criar Tramitações
    console.log('8️⃣  Criando tramitações...');
    let totalTramitacoes = 0;
    
    for (const processo of processos) {
      const numTramitacoes = Math.floor(Math.random() * 4) + 2; // 2 a 5 tramitações
      
      for (let i = 0; i < numTramitacoes; i++) {
        const secretaria = secretarias[Math.floor(Math.random() * secretarias.length)];
        const setor = setores.find(s => s.secretariaId === secretaria.id);
        
        await models.Tramitacao.create({
          processoId: processo.id,
          tipo: ['abertura', 'tramitacao', 'analise', 'deferimento'][Math.min(i, 3)],
          dataHora: new Date(processo.dataAbertura.getTime() + (i * 2 * 24 * 60 * 60 * 1000)),
          usuarioId: usuarios[Math.floor(Math.random() * usuarios.length)].id,
          destinoSecretariaId: secretaria.id,
          destinoSetorId: setor.id,
          observacao: i === 0 
            ? 'Abertura do processo' 
            : `Tramitação ${i} - ${['Em análise', 'Aguardando parecer', 'Documento anexado', 'Deferido'][Math.floor(Math.random() * 4)]}`
        });
        totalTramitacoes++;
      }
    }
    console.log('✅ Tramitações criadas:', totalTramitacoes, '\n');

    // 9. Resumo
    console.log('📊 RESUMO DA POPULAÇÃO:');
    console.log('═'.repeat(50));
    console.log(`Tenant: ${tenant.nome_municipio} (${tenant.subdominio})`);
    console.log(`Secretarias: ${secretarias.length}`);
    console.log(`Setores: ${setores.length}`);
    console.log(`Usuários: ${usuarios.length}`);
    console.log(`Processos: ${processos.length}`);
    console.log(`Tramitações: ${totalTramitacoes}`);
    console.log('═'.repeat(50));
    
    console.log('\n👤 CREDENCIAIS DE ACESSO:');
    console.log('═'.repeat(50));
    console.log('Prefeitura: teste');
    console.log('');
    console.log('Administrador:');
    console.log('  CPF: 00000000000');
    console.log('  Senha: 123456');
    console.log('');
    console.log('Gestor (João Silva):');
    console.log('  CPF: 11111111111');
    console.log('  Senha: 123456');
    console.log('');
    console.log('Operacional (Maria Santos):');
    console.log('  CPF: 22222222222');
    console.log('  Senha: 123456');
    console.log('');
    console.log('Operacional (Carlos Oliveira):');
    console.log('  CPF: 33333333333');
    console.log('  Senha: 123456');
    console.log('═'.repeat(50));

    console.log('\n✅ População do banco de dados concluída com sucesso!');
    
    await tenantDb.close();
    await mainDb.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao popular banco de dados:', error);
    process.exit(1);
  }
}

// Executar
seedDatabase();
