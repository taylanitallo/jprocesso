// Processo tramitado/devolvido fica bloqueado para o destino até ser recebido:
// quem está no setor (ou é o usuário) de destino só vê o conteúdo e só age (tramitar,
// devolver, concluir, anexar) depois de clicar "Receber processo". Vale para todos,
// inclusive administrador e gestor quando são o destino. Quem não é o destino (ex.:
// administrador acompanhando outro setor) não é afetado.

const TIPOS_PENDENTES = ['tramite', 'devolucao'];

/**
 * @returns {Promise<{ bloqueado: boolean, podeReceber: boolean, ultima: object|null }>}
 *   bloqueado   — o usuário não pode ver conteúdo/documentos do processo agora
 *   podeReceber — o usuário é quem pode clicar "Receber" (mesma regra de receberProcesso)
 */
async function situacaoRecebimento(req, processo) {
  const livre = { bloqueado: false, podeReceber: false, ultima: null };
  if (!processo || ['concluido', 'arquivado'].includes(processo.status)) return livre;

  const { Tramitacao, User } = req.models;
  const eu = await User.findByPk(req.user.id, { attributes: ['id', 'setorId'] });
  const noDestino =
    processo.usuario_atual_id === req.user.id ||
    (!!eu?.setorId && processo.setor_atual_id === eu.setorId);
  if (!noDestino) return livre;

  const ultima = await Tramitacao.findOne({
    where: { processo_id: processo.id },
    order: [['data_hora', 'DESC']],
  });
  // Quem enviou continua vendo o que enviou (ex.: trâmite para colega do mesmo setor)
  if (!ultima || !TIPOS_PENDENTES.includes(ultima.tipo_acao) || ultima.origem_usuario_id === req.user.id) {
    return livre;
  }

  const podeReceber =
    processo.usuario_atual_id === req.user.id ||
    (processo.usuario_atual_id === null && processo.setor_atual_id === eu?.setorId);
  return { bloqueado: true, podeReceber, ultima };
}

const MSG_BLOQUEADO = 'Receba o processo para ter acesso ao seu conteúdo.';

// Middleware para rotas com :processoId (ex.: DID do processo)
const exigirRecebimento = async (req, res, next) => {
  try {
    const processo = await req.models.Processo.findByPk(req.params.processoId, {
      attributes: ['id', 'status', 'setor_atual_id', 'usuario_atual_id'],
    });
    if (processo && (await situacaoRecebimento(req, processo)).bloqueado) {
      return res.status(403).json({ error: MSG_BLOQUEADO });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { situacaoRecebimento, exigirRecebimento, MSG_BLOQUEADO };
