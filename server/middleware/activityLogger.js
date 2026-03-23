/**
 * Helper para registrar atividades no banco de logs do tenant.
 * Usado diretamente nos controllers após ações bem-sucedidas.
 *
 * Uso:
 *   const { registrarLog } = require('../middleware/activityLogger');
 *   await registrarLog(req, {
 *     acao: 'criar_processo',
 *     modulo: 'processos',
 *     descricao: `Processo ${numero} criado`,
 *     referencia_id: processo.id,
 *     referencia_numero: processo.numero,
 *   });
 */

const registrarLog = async (req, { acao, modulo, descricao, referencia_id, referencia_numero, dados_extras } = {}) => {
  try {
    // Precisa do modelo Log no contexto do tenant
    if (!req.models?.Log) return;

    const { Log } = req.models;
    const user = req.user;

    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      null;

    const user_agent = (req.headers['user-agent'] || '').substring(0, 300) || null;

    await Log.create({
      usuario_id:        user?.id               || null,
      acao:              acao                   || 'acao_desconhecida',
      modulo:            modulo                 || 'sistema',
      descricao:         descricao              || null,
      referencia_id:     referencia_id          ? String(referencia_id) : null,
      referencia_numero: referencia_numero      ? String(referencia_numero) : null,
      secretaria_id:     user?.secretariaId     || null,
      setor_id:          user?.setorId          || null,
      ip,
      user_agent,
      dados_extras:      dados_extras           || null,
      created_at:        new Date()
    });
  } catch (err) {
    // Nunca deixar o log travar a requisição principal
    console.error('[activityLogger] Erro ao registrar log:', err.message);
  }
};

module.exports = { registrarLog };
