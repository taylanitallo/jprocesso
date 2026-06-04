const {
  buildAylaSystemPrompt,
  buildAylaContext,
  callNvidiaNim,
  getAylaBIContext,
} = require('../services/aylaService');

const MAX_MSG_LEN    = 2000;
const MAX_HIST_ITEMS = 10;

const chat = async (req, res) => {
  try {
    const { message, context, history = [] } = req.body;

    // ── Validação de entrada ────────────────────────────────────────────────
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem obrigatória' });
    }
    if (message.length > MAX_MSG_LEN) {
      return res.status(400).json({ error: `Mensagem muito longa (máximo ${MAX_MSG_LEN} caracteres)` });
    }

    // Sanitizar: remover null bytes e caracteres de controle problemáticos
    const cleanMsg = message.replace(/\0/g, '').trim();

    // ── Contexto da tela ────────────────────────────────────────────────────
    const ctxInfo = buildAylaContext(req, { context });

    // ── Dados de BI do módulo atual ─────────────────────────────────────────
    const biData = await getAylaBIContext(req, ctxInfo.module);

    // ── System prompt dinâmico ──────────────────────────────────────────────
    let systemPrompt = buildAylaSystemPrompt(req.tenant, req.user, ctxInfo);
    if (biData) {
      systemPrompt += `\n\nDados atuais do sistema:\n${JSON.stringify(biData, null, 2)}`;
    }

    // ── Histórico (sanitizado) ──────────────────────────────────────────────
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-MAX_HIST_ITEMS)
          .filter(m =>
            m &&
            ['user', 'assistant'].includes(m.role) &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0
          )
          .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN) }))
      : [];

    // ── Mensagens para a IA ─────────────────────────────────────────────────
    const messages = [
      { role: 'system', content: systemPrompt },
      ...safeHistory,
      { role: 'user',   content: cleanMsg },
    ];

    // ── Log de uso (sem dados sensíveis) ────────────────────────────────────
    console.log(
      `[Ayla] tenant=${req.tenant?.subdominio} user=${req.user?.id} ` +
      `module=${ctxInfo.module || '-'} chars=${cleanMsg.length}`
    );

    // ── Chamada à IA ────────────────────────────────────────────────────────
    const response = await callNvidiaNim(messages);

    res.json({ success: true, response });

  } catch (error) {
    console.error('[Ayla] Erro:', error.message);

    // Tratar erros conhecidos sem expor detalhes internos
    if (error.message === 'NVIDIA_API_KEY_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Assistente de IA não configurado. Configure NVIDIA_API_KEY no servidor.',
      });
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
