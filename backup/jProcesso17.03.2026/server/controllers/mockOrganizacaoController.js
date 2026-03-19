const { getMockSecretarias, getMockSetores } = require('../mock-auth');
const { v4: uuidv4 } = require('uuid');

// Arrays globais para armazenar dados em memória
let secretarias = [];
let setores = [];

// Inicializar com dados mock
const inicializarDados = () => {
  if (secretarias.length === 0) {
    secretarias = [...getMockSecretarias()];
  }
  if (setores.length === 0) {
    setores = [...getMockSetores()];
  }
};

const listarSecretarias = (req, res) => {
  try {
    inicializarDados();
    res.json(secretarias);
  } catch (error) {
    console.error('Erro ao listar secretarias:', error);
    res.status(500).json({ error: 'Erro ao listar secretarias' });
  }
};

const criarSecretaria = (req, res) => {
  try {
    inicializarDados();
    const { nome, sigla, responsavel, telefone, email } = req.body;
    
    const novaSecretaria = {
      id: uuidv4(),
      nome,
      sigla,
      responsavel,
      telefone,
      email,
      createdAt: new Date().toISOString()
    };
    
    secretarias.push(novaSecretaria);
    res.status(201).json(novaSecretaria);
  } catch (error) {
    console.error('Erro ao criar secretaria:', error);
    res.status(500).json({ error: 'Erro ao criar secretaria' });
  }
};

const atualizarSecretaria = (req, res) => {
  try {
    inicializarDados();
    const { id } = req.params;
    const { nome, sigla, responsavel, telefone, email } = req.body;
    
    const index = secretarias.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Secretaria não encontrada' });
    }
    
    secretarias[index] = {
      ...secretarias[index],
      nome,
      sigla,
      responsavel,
      telefone,
      email,
      updatedAt: new Date().toISOString()
    };
    
    res.json(secretarias[index]);
  } catch (error) {
    console.error('Erro ao atualizar secretaria:', error);
    res.status(500).json({ error: 'Erro ao atualizar secretaria' });
  }
};

const deletarSecretaria = (req, res) => {
  try {
    inicializarDados();
    const { id } = req.params;
    
    const index = secretarias.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Secretaria não encontrada' });
    }
    
    secretarias.splice(index, 1);
    res.json({ message: 'Secretaria removida com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar secretaria:', error);
    res.status(500).json({ error: 'Erro ao deletar secretaria' });
  }
};

const listarSetores = (req, res) => {
  try {
    inicializarDados();
    const { secretariaId } = req.query;
    let resultado = setores;
    
    if (secretariaId) {
      resultado = setores.filter(s => s.secretariaId === secretariaId);
    }
    
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ error: 'Erro ao listar setores' });
  }
};

const criarSetor = (req, res) => {
  try {
    inicializarDados();
    const { nome, secretariaId, responsavel } = req.body;
    
    const novoSetor = {
      id: uuidv4(),
      nome,
      secretariaId,
      responsavel,
      createdAt: new Date().toISOString()
    };
    
    setores.push(novoSetor);
    res.status(201).json(novoSetor);
  } catch (error) {
    console.error('Erro ao criar setor:', error);
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
};

const atualizarSetor = (req, res) => {
  try {
    inicializarDados();
    const { id } = req.params;
    const { nome, secretariaId, responsavel } = req.body;
    
    const index = setores.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }
    
    setores[index] = {
      ...setores[index],
      nome,
      secretariaId,
      responsavel,
      updatedAt: new Date().toISOString()
    };
    
    res.json(setores[index]);
  } catch (error) {
    console.error('Erro ao atualizar setor:', error);
    res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
};

const deletarSetor = (req, res) => {
  try {
    inicializarDados();
    const { id } = req.params;
    
    const index = setores.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }
    
    setores.splice(index, 1);
    res.json({ message: 'Setor removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar setor:', error);
    res.status(500).json({ error: 'Erro ao deletar setor' });
  }
};

module.exports = {
  listarSecretarias,
  criarSecretaria,
  atualizarSecretaria,
  deletarSecretaria,
  listarSetores,
  criarSetor,
  atualizarSetor,
  deletarSetor
};
