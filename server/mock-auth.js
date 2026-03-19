// Mock de autenticação para teste sem banco de dados
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Tenant mock
const mockTenant = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  nome_municipio: 'Prefeitura de Teste',
  subdominio: 'teste',
  schema: 'tenant_teste',
  ativo: true
};

// Secretarias mock
const mockSecretarias = [
  { id: uuidv4(), nome: 'Secretaria de Administração', sigla: 'SEMAD' },
  { id: uuidv4(), nome: 'Secretaria de Educação', sigla: 'SEDUC' },
  { id: uuidv4(), nome: 'Secretaria de Saúde', sigla: 'SESAU' },
  { id: uuidv4(), nome: 'Secretaria de Obras', sigla: 'SEOBR' }
];

// Setores mock
const mockSetores = [
  { id: uuidv4(), nome: 'Protocolo Geral', secretariaId: mockSecretarias[0].id },
  { id: uuidv4(), nome: 'Recursos Humanos', secretariaId: mockSecretarias[0].id },
  { id: uuidv4(), nome: 'Gestão Escolar', secretariaId: mockSecretarias[1].id },
  { id: uuidv4(), nome: 'Atenção Básica', secretariaId: mockSecretarias[2].id },
  { id: uuidv4(), nome: 'Projetos', secretariaId: mockSecretarias[3].id }
];

// Admin global mock (para área restrita)
const mockAdmin = {
  id: '999e4567-e89b-12d3-a456-426614174999',
  nome: 'Administrador do Sistema',
  cpf: '00000000191',
  email: 'admin@jprocesso.gov.br',
  senha: bcrypt.hashSync('admin123', 10),
  tipo: 'admin',
  ativo: true
};

// Usuários mock
const mockUsers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome: 'Administrador',
    cpf: '00000000000',
    email: 'admin@teste.com',
    senha: bcrypt.hashSync('123456', 10),
    tipo: 'admin',
    ativo: true
  },
  {
    id: uuidv4(),
    nome: 'João Silva',
    cpf: '11111111111',
    email: 'joao@teste.com',
    senha: bcrypt.hashSync('123456', 10),
    tipo: 'gestor',
    secretariaId: mockSecretarias[0].id,
    setorId: mockSetores[0].id,
    ativo: true
  },
  {
    id: uuidv4(),
    nome: 'Maria Santos',
    cpf: '22222222222',
    email: 'maria@teste.com',
    senha: bcrypt.hashSync('123456', 10),
    tipo: 'operacional',
    secretariaId: mockSecretarias[1].id,
    setorId: mockSetores[2].id,
    ativo: true
  }
];

// Processos mock
const mockProcessos = [];
const dataAtual = new Date();

for (let i = 1; i <= 15; i++) {
  const secretaria = mockSecretarias[Math.floor(Math.random() * mockSecretarias.length)];
  const setor = mockSetores.find(s => s.secretariaId === secretaria.id) || mockSetores[0];
  
  const processo = {
    id: uuidv4(),
    numero: `${String(i).padStart(6, '0')}/${dataAtual.getFullYear()}`,
    assunto: [
      'Solicitação de Material de Escritório',
      'Manutenção de Equipamentos',
      'Licitação de Serviços',
      'Contratação de Pessoal',
      'Reforma de Unidade Escolar',
      'Aquisição de Veículos',
      'Convênio com Entidades',
      'Pagamento de Fornecedores',
      'Processo Administrativo Disciplinar',
      'Projeto de Infraestrutura',
      'Solicitação de Licença',
      'Análise de Documentos',
      'Aprovação de Projeto',
      'Regularização Fundiária',
      'Autorização de Evento'
    ][i - 1],
    interessado: `Interessado ${i}`,
    dataAbertura: new Date(dataAtual.getTime() - (i * 24 * 60 * 60 * 1000)),
    status: ['tramitacao', 'analise', 'concluido'][Math.floor(Math.random() * 3)],
    prioridade: ['normal', 'alta', 'urgente'][Math.floor(Math.random() * 3)],
    secretariaAtualId: secretaria.id,
    secretariaAtual: secretaria,
    setorAtualId: setor.id,
    setorAtual: setor,
    tramitacoes: []
  };
  
  // Criar tramitações para o processo
  const numTramitacoes = Math.floor(Math.random() * 4) + 2;
  for (let j = 0; j < numTramitacoes; j++) {
    const tramSecretaria = mockSecretarias[Math.floor(Math.random() * mockSecretarias.length)];
    const tramSetor = mockSetores.find(s => s.secretariaId === tramSecretaria.id) || mockSetores[0];
    
    processo.tramitacoes.push({
      id: uuidv4(),
      processoId: processo.id,
      tipo: ['abertura', 'tramitacao', 'analise', 'deferimento'][Math.min(j, 3)],
      dataHora: new Date(processo.dataAbertura.getTime() + (j * 2 * 24 * 60 * 60 * 1000)),
      destinoSecretariaId: tramSecretaria.id,
      destinoSecretaria: tramSecretaria,
      destinoSetorId: tramSetor.id,
      destinoSetor: tramSetor,
      observacao: j === 0 
        ? 'Abertura do processo' 
        : `Tramitação ${j} - ${['Em análise', 'Aguardando parecer', 'Documento anexado', 'Aprovado'][Math.floor(Math.random() * 4)]}`
    });
  }
  
  mockProcessos.push(processo);
}

const mockLogin = async (req, res) => {
  try {
    const { cpf, senha, subdomain } = req.body;

    // Se for login de admin (área restrita)
    if (subdomain === 'admin') {
      if (mockAdmin.cpf !== cpf) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const senhaValida = await bcrypt.compare(senha, mockAdmin.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { 
          id: mockAdmin.id, 
          cpf: mockAdmin.cpf,
          email: mockAdmin.email,
          papel: 'admin',
          isAdmin: true
        },
        process.env.JWT_SECRET || 'secret_key_default',
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login admin realizado com sucesso',
        user: {
          id: mockAdmin.id,
          nome: mockAdmin.nome,
          cpf: mockAdmin.cpf,
          email: mockAdmin.email,
          papel: 'admin'
        },
        token
      });
    }

    // Verificar subdomain para login de tenant
    if (subdomain !== 'teste') {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar usuário
    const user = mockUsers.find(u => u.cpf === cpf && u.ativo);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar secretaria e setor do usuário
    const secretaria = user.secretariaId ? mockSecretarias.find(s => s.id === user.secretariaId) : null;
    const setor = user.setorId ? mockSetores.find(s => s.id === user.setorId) : null;

    // Gerar token
    const token = jwt.sign(
      { 
        id: user.id, 
        cpf: user.cpf,
        email: user.email,
        tipo: user.tipo,
        tenantId: mockTenant.id
      },
      process.env.JWT_SECRET || 'secret_key_default',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        cpf: user.cpf,
        email: user.email,
        tipo: user.tipo,
        secretaria,
        setor
      },
      tenant: mockTenant,
      token
    });
  } catch (error) {
    console.error('Erro no mock login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

// Funções auxiliares para obter dados mock
const getMockProcessos = () => mockProcessos;
const getMockSecretarias = () => mockSecretarias;
const getMockSetores = () => mockSetores;
const getMockUsers = () => mockUsers;

module.exports = { 
  mockLogin,
  getMockProcessos,
  getMockSecretarias,
  getMockSetores,
  getMockUsers,
  mockTenant,
  mockAdmin
};
