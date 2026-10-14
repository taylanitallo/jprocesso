// Tela "Excluídos": listar, restaurar e apagar de vez
// Permissão por tela: admin/Jeos sempre; demais só com a ação ligada no editor
const { registrarLog } = require('../middleware/activityLogger');
const { ensurePermissoes } = require('../utils/scopeFilter');
const lixeira = require('../services/lixeiraService');

const responderErro = (res, err, msg) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(msg, err);
  res.status(500).json({ error: msg });
};

const exigir = async (req, res, acao) => {
  const { entidade } = req.params;
  if (!lixeira.ENTIDADES[entidade]) {
    res.status(404).json({ error: 'Tela sem lixeira' });
    return false;
  }
  await ensurePermissoes(req);
  if (!lixeira.pode(req.user, entidade, acao)) {
    res.status(403).json({ error: 'Sem permissão para esta ação nos excluídos.' });
    return false;
  }
  return true;
};

// body: { todos: true } ou { ids: [...] } (selecionados ou o resultado dos filtros)
const alvoDoCorpo = (req, res) => {
  const { todos, ids } = req.body || {};
  if (todos) return 'todos';
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'Nenhum registro informado.' });
    return null;
  }
  return ids.map((x) => String(x));
};

const listar = async (req, res) => {
  try {
    if (!(await exigir(req, res, 'ver'))) return;
    res.json(await lixeira.listarExcluidos(req, req.params.entidade));
  } catch (err) {
    responderErro(res, err, 'Erro ao listar excluídos');
  }
};

const restaurar = async (req, res) => {
  try {
    if (!(await exigir(req, res, 'restaurar'))) return;
    const alvo = alvoDoCorpo(req, res);
    if (!alvo) return;
    const { entidade } = req.params;
    const resultado = await lixeira.restaurar(req, entidade, alvo);
    if (resultado.restaurados.length) {
      await registrarLog(req, {
        acao: 'restaurar_excluidos',
        modulo: entidade,
        descricao: `Restaurou ${resultado.restaurados.length} registro(s) excluído(s) de ${lixeira.ENTIDADES[entidade].titulo}`,
        dados_extras: { restaurados: resultado.restaurados.slice(0, 200) },
      });
    }
    res.json(resultado);
  } catch (err) {
    responderErro(res, err, 'Erro ao restaurar');
  }
};

const apagar = async (req, res) => {
  try {
    if (!(await exigir(req, res, 'apagar'))) return;
    const alvo = alvoDoCorpo(req, res);
    if (!alvo) return;
    const { entidade } = req.params;
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

module.exports = { listar, restaurar, apagar };
