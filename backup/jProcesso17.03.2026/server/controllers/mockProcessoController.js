const { getMockProcessos, getMockSecretarias, getMockSetores } = require('../mock-auth');

const listarProcessos = (req, res) => {
  try {
    const processos = getMockProcessos();
    res.json(processos);
  } catch (error) {
    console.error('Erro ao listar processos:', error);
    res.status(500).json({ error: 'Erro ao listar processos' });
  }
};

const buscarProcesso = (req, res) => {
  try {
    const { id } = req.params;
    const processos = getMockProcessos();
    const processo = processos.find(p => p.id === id);
    
    if (!processo) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }
    
    res.json(processo);
  } catch (error) {
    console.error('Erro ao buscar processo:', error);
    res.status(500).json({ error: 'Erro ao buscar processo' });
  }
};

const consultarPublico = (req, res) => {
  try {
    const { numero } = req.params;
    const processos = getMockProcessos();
    const processo = processos.find(p => p.numero === numero);
    
    if (!processo) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }
    
    res.json(processo);
  } catch (error) {
    console.error('Erro ao consultar processo:', error);
    res.status(500).json({ error: 'Erro ao consultar processo' });
  }
};

const estatisticas = (req, res) => {
  try {
    const processos = getMockProcessos();
    
    const stats = {
      total: processos.length,
      tramitacao: processos.filter(p => p.status === 'tramitacao').length,
      analise: processos.filter(p => p.status === 'analise').length,
      concluido: processos.filter(p => p.status === 'concluido').length,
      urgente: processos.filter(p => p.prioridade === 'urgente').length,
      alta: processos.filter(p => p.prioridade === 'alta').length,
      normal: processos.filter(p => p.prioridade === 'normal').length
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

module.exports = {
  listarProcessos,
  buscarProcesso,
  consultarPublico,
  estatisticas
};
