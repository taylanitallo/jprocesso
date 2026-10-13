// Tela "Excluídos": lista e apagamento definitivo — só administradores
const { registrarLog } = require('../middleware/activityLogger');
const lixeira = require('../services/lixeiraService');

const responderErro = (res, err, msg) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(msg, err);
  res.status(500).json({ error: msg });
};

const listar = async (req, res) => {
  try {
    res.json(await lixeira.listarExcluidos(req, req.params.entidade));
  } catch (err) {
    responderErro(res, err, 'Erro ao listar excluídos');
  }
};

// body: { todos: true } ou { ids: [...] } (selecionados ou o resultado dos filtros)
const apagar = async (req, res) => {
  try {
    const { entidade } = req.params;
    const { todos, ids } = req.body || {};
    if (!todos && (!Array.isArray(ids) || ids.length === 0)) {
      return res.status(400).json({ error: 'Nenhum registro informado.' });
    }
    const alvo = todos ? 'todos' : ids.map((x) => String(x));
    const resultado = await lixeira.apagarDefinitivamente(req, entidade, alvo);

    if (resultado.apagados.length) {
      await registrarLog(req, {
        acao: 'apagar_excluidos',
        modulo: entidade,
        descricao: `Apagou definitivamente ${resultado.apagados.length} registro(s) excluído(s) de ${lixeira.ENTIDADES[entidade].titulo}`,
        dados_extras: { apagados: resultado.apagados.slice(0, 200) },
      });
    }
    res.json(resultado);
  } catch (err) {
    responderErro(res, err, 'Erro ao apagar excluídos');
  }
};

module.exports = { listar, apagar };
