// Contratos › Concluir contrato (ex.: aquisição para um evento já realizado).
// - Utilizado por completo (saldo zerado pelas ordens): quem tem Contratos › Concluir.
// - Com saldo sobrando: só gestor, administrador e Jeos, com justificativa.
// Sempre com assinatura eletrônica (senha + 2º fator; Jeos só a senha). O registro
// da conclusão (quem, quando, saldo, justificativa, método e hash) fica em
// contratos.conclusao; o contrato passa a CONCLUÍDO e não recebe mais ordens.
const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const { registrarLog } = require('../middleware/activityLogger');
const { applyScopeToWhereByName } = require('../utils/scopeFilter');
const assinaturaService = require('../services/assinaturaService');

const STATUS_CONCLUIDO = 'CONCLUÍDO';
const STATUS_SEM_SALDO = ['CANCELADA', 'EXCLUÍDA'];
const TIPOS_CONCLUEM_COM_SALDO = ['gestor', 'admin', 'jeos'];
const JUSTIFICATIVA_MIN = 20;
const centavos = (v) => Math.round(v * 100) / 100;

// JSON com as chaves em ordem: o mesmo conteúdo gera sempre o mesmo hash
const canonico = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
};

async function saldoDoContrato(models, contrato) {
  const r = await models.ContratoOrdem.findOne({
    attributes: [[fn('SUM', col('valor_total')), 'usado']],
    where: { contrato_id: contrato.id, status: { [Op.notIn]: STATUS_SEM_SALDO } },
    raw: true,
  });
  const valor = centavos(parseFloat(contrato.valor || 0));
  const usado = centavos(parseFloat(r?.usado || 0));
  return { valor, usado, saldo: centavos(valor - usado) };
}

const concluirContrato = async (req, res) => {
  const { Contrato, User } = req.models;
  const contrato = await Contrato.findByPk(req.params.id);
  if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' });
  if (contrato.status === STATUS_CONCLUIDO) return res.status(400).json({ error: 'Este contrato já está concluído.' });
  if (contrato.status === 'EXCLUÍDO') return res.status(400).json({ error: 'Contrato excluído não pode ser concluído.' });

  // Escopo de secretarias (Contratos › Contratos): "Só sua sec." conclui só os da própria
  const escopo = {};
  await applyScopeToWhereByName(escopo, req, 'secretaria', 'contratos', 'contratos', 'ver');
  if (Object.keys(escopo).length && !(await Contrato.count({ where: { ...escopo, id: contrato.id } }))) {
    return res.status(403).json({ error: 'Este contrato é de outra secretaria.' });
  }

  const { valor, usado, saldo } = await saldoDoContrato(req.models, contrato);
  const completo = saldo <= 0.004;
  const justificativa = String(req.body?.justificativa || '').trim();
  if (!completo) {
    if (!TIPOS_CONCLUEM_COM_SALDO.includes(req.user?.tipo)) {
      return res.status(403).json({ error: 'O contrato ainda tem saldo: só gestor ou administrador pode concluí-lo antes de ser utilizado por completo.' });
    }
    if (justificativa.length < JUSTIFICATIVA_MIN) {
      return res.status(400).json({ error: `Informe a justificativa para concluir com saldo (mínimo ${JUSTIFICATIVA_MIN} caracteres).` });
    }
  }

  const transaction = await req.tenantDb.transaction();
  try {
    const usuario = await User.findByPk(req.user.id, { transaction });
    if (!usuario) { await transaction.rollback(); return res.status(401).json({ error: 'Usuário não encontrado' }); }
    // Assinatura eletrônica: senha + código do app / e-mail (Jeos: só a senha)
    const metodo = await assinaturaService.validarCredenciais({
      db: req.tenantDb, transaction, usuario,
      senha: req.body?.senhaConfirmacao, codigo: req.body?.codigoTotp, codigoEmail: req.body?.codigoEmail,
    });

    const conteudo = {
      ato: 'conclusao_contrato',
      contrato_id: contrato.id,
      numero_contrato: contrato.numero_contrato,
      objeto: contrato.objeto,
      secretaria: contrato.secretaria || null,
      valor_contrato: valor,
      total_utilizado: usado,
      saldo_restante: completo ? 0 : saldo,
      utilizado_completo: completo,
      justificativa: justificativa || null,
      concluido_em: new Date().toISOString(),
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      usuario_cpf: usuario.cpf || null,
      usuario_cargo: usuario.cargo || null,
      usuario_tipo: usuario.tipo,
      metodo_assinatura: metodo,
    };
    const conclusao = { ...conteudo, hash: crypto.createHash('sha256').update(canonico(conteudo)).digest('hex') };

    await contrato.update({ status: STATUS_CONCLUIDO, conclusao }, { transaction });
    await transaction.commit();

    await registrarLog(req, {
      acao: 'concluir_contrato',
      modulo: 'contratos',
      descricao: `Contrato concluído: ${contrato.numero_contrato}${completo ? ' (utilizado por completo)' : ` com saldo de R$ ${saldo.toFixed(2)} — ${justificativa}`}`,
      referencia_id: contrato.id,
      referencia_numero: contrato.numero_contrato,
    }).catch(() => {});
    res.json({ contrato, conclusao });
  } catch (err) {
    await transaction.rollback().catch(() => {});
    if (err instanceof assinaturaService.AssinaturaError || err?.name === 'AssinaturaError' || err?.codigo) {
      return res.status(err.status || 400).json({ error: err.message, codigo: err.codigo });
    }
    console.error('concluirContrato:', err);
    res.status(500).json({ error: 'Erro ao concluir o contrato' });
  }
};

module.exports = { concluirContrato, STATUS_CONCLUIDO };
