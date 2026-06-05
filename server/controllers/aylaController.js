const {
  detectIntent,
  buildAylaSystemPrompt,
  buildAylaContext,
  callNvidiaNim,
  getAylaBIContext,
  getProcessosUrgentes,
  getProcessosPendentes,
  getProcessosResumo,
  getProcessoPorNumero,
  getContratosVencendo,
  getContratosVencidos,
  getItensEstoqueBaixo,
  buildFallbackResponse,
} = require('../services/aylaService');

const MAX_MSG_LEN    = 2000;
const MAX_HIST_ITEMS = 10;

// ── Executa consultas detalhadas com base na intenção detectada ───────────────
async function fetchDetailedData(req, intent, biCtx) {
  const data = {};

  switch (intent.type) {
    case 'processo_numero':
      data.processoDetalhado = await getProcessoPorNumero(req, intent.numero);
      break;

    case 'processos_urgentes':
      data.urgentesLista = await getProcessosUrgentes(req);
      break;

    case 'processos_pendentes':
      data.pendentesList = await getProcessosPendentes(req);
      break;

    case 'processos_lista':
      data.processosLista = await getProcessosResumo(req);
      break;

    case 'contratos_vencendo':
      data.contratosVencendo = await getContratosVencendo(req);
      data.contratosVencidos = await getContratosVencidos(req);
      break;

    case 'estoque_baixo':
      data.itensCriticos = await getItensEstoqueBaixo(req);
      break;

    default:
      // Para perguntas gerais: enriquecer com urgentes se existirem
      if (biCtx?.processos?.urgentes > 0) {
        data.urgentesLista = await getProcessosUrgentes(req);
      }
      break;
  }

  return data;
}

// ── Handler principal ─────────────────────────────────────────────────────────
const chat = async (req, res) => {
  try {
    const { message, context, history = [] } = req.body;

    // Validação
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem obrigatória' });
    }
    if (message.length > MAX_MSG_LEN) {
      return res.status(400).json({ error: `Mensagem muito longa (máximo ${MAX_MSG_LEN} caracteres)` });
    }

    const cleanMsg = message.replace(/\0/g, '').trim();

    // Contexto da tela
    const ctxInfo = buildAylaContext(req, { context });

    // Detecção de intenção (rápida, sem IA)
    const intent = detectIntent(cleanMsg);

    // BI agregado do módulo
    const biCtx = await getAylaBIContext(req, ctxInfo.module);

    // Consultas detalhadas baseadas na intenção
    const detailedData = await fetchDetailedData(req, intent, biCtx);

    // System prompt com todos os dados
    let systemPrompt = buildAylaSystemPrompt(req.tenant, req.user, ctxInfo);

    // Montar bloco de dados para a IA
    const dadosParaIA = { ...(biCtx || {}) };
    if (Object.keys(detailedData).length > 0) {
      Object.assign(dadosParaIA, detailedData);
    }
    if (Object.keys(dadosParaIA).length > 0) {
      systemPrompt += `\n\nDados consultados do sistema:\n${JSON.stringify(dadosParaIA, null, 2)}`;
    }

    // Histórico sanitizado
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-MAX_HIST_ITEMS)
          .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim().length > 0)
          .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN) }))
      : [];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...safeHistory,
      { role: 'user',   content: cleanMsg },
    ];

    console.log(`[Ayla] tenant=${req.tenant?.subdominio} user=${req.user?.id} intent=${intent.type} module=${ctxInfo.module || '-'} chars=${cleanMsg.length}`);

    // Chamar IA
    const response = await callNvidiaNim(messages);
    res.json({ success: true, response });

  } catch (error) {
    console.error('[Ayla] Erro:', error.message);

    // Tentar fallback textual quando IA falha mas temos dados
    try {
      const { message, context, history } = req.body;
      if (message) {
        const intent      = detectIntent(message.replace(/\0/g, '').trim());
        const ctxInfo     = buildAylaContext(req, { context });
        const biCtx       = await getAylaBIContext(req, ctxInfo.module);
        const detailedData = await fetchDetailedData(req, intent, biCtx);
        const fallback    = buildFallbackResponse(intent, { ...biCtx, ...detailedData });
        if (fallback) {
          return res.json({ success: true, response: fallback, fallback: true });
        }
      }
    } catch (_) { /* fallback também falhou */ }

    // Erros conhecidos da NVIDIA
    if (error.message === 'NVIDIA_API_KEY_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Assistente de IA não configurado. Configure NVIDIA_API_KEY no servidor.' });
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(503).json({ error: 'Serviço de IA temporariamente indisponível.' });
    }
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Limite de requisições da IA atingido. Aguarde um momento.' });
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message === 'EMPTY_RESPONSE') {
      return res.status(504).json({ error: 'A IA demorou para responder. Tente novamente.' });
    }

    res.status(500).json({ error: 'Não foi possível processar sua pergunta. Tente novamente.' });
  }
};

module.exports = { chat };
