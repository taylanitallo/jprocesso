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

    // Erros conhecidos do provedor de IA
    if (error.message === 'IA_API_KEY_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Assistente de IA não configurado. Configure GEMINI_API_KEY no servidor.' });
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

// ── Sugestão de texto para campos em branco ──────────────────────────────────
// O cliente manda o campo (chave estável, ex. 'processo.tramitar.despacho'), o
// rótulo legível e o contexto da tela; a IA devolve um texto pronto no estilo dos
// últimos textos que o próprio usuário enviou naquele campo.
const CAMPO_RE = /^[a-z0-9_.-]{3,80}$/i;
const MAX_CONTEXTO = 4000;
const MAX_TEXTO_USADO = 4000;

// Primeira vez num campo de processo: aproveita o que o usuário já escreveu nas tramitações
const SEMENTE_TRAMITACOES = {
  'processo.tramitar.despacho': `tipo_acao = 'tramite' AND despacho IS NOT NULL AND length(despacho) >= 10`,
  'processo.devolver.motivo':   `tipo_acao = 'devolucao' AND justificativa_devolucao IS NOT NULL`,
  'processo.concluir.despacho': `tipo_acao = 'conclusao' AND despacho IS NOT NULL AND length(despacho) >= 10`,
};

const limparContexto = (ctx) => {
  if (!ctx || typeof ctx !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(ctx).slice(0, 30)) {
    if (v === null || v === undefined || v === '') continue;
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
    out[String(k).slice(0, 60)] = val.replace(/\0/g, '').slice(0, 600);
  }
  return out;
};

async function textosAnteriores(req, campo) {
  const { QueryTypes } = require('sequelize');
  const db = req.tenantDb;
  const uid = req.user?.id;
  let textos = await db.query(
    `SELECT texto FROM textos_usados WHERE usuario_id = :uid AND campo = :campo ORDER BY created_at DESC LIMIT 5`,
    { replacements: { uid, campo }, type: QueryTypes.SELECT }
  ).catch(() => []);

  if (textos.length < 3 && SEMENTE_TRAMITACOES[campo]) {
    const col = campo === 'processo.devolver.motivo' ? 'justificativa_devolucao' : 'despacho';
    const antigos = await db.query(
      `SELECT ${col} AS texto FROM tramitacoes WHERE origem_usuario_id = :uid AND ${SEMENTE_TRAMITACOES[campo]}
        ORDER BY data_hora DESC LIMIT 5`,
      { replacements: { uid }, type: QueryTypes.SELECT }
    ).catch(() => []);
    textos = textos.concat(antigos);
  }

  // Sem histórico do usuário: textos do mesmo campo na secretaria dele
  if (textos.length === 0 && req.user?.secretariaId) {
    textos = await db.query(
      `SELECT texto FROM textos_usados WHERE secretaria_id = :sec AND campo = :campo ORDER BY created_at DESC LIMIT 3`,
      { replacements: { sec: req.user.secretariaId, campo }, type: QueryTypes.SELECT }
    ).catch(() => []);
  }
  const vistos = new Set();
  return textos.map(t => String(t.texto || '').trim()).filter(t => t && !vistos.has(t) && vistos.add(t)).slice(0, 5);
}

const sugerir = async (req, res) => {
  try {
    const { campo, rotulo, contexto, anterior, extenso } = req.body || {};
    if (!campo || !CAMPO_RE.test(campo)) return res.status(400).json({ error: 'Campo inválido' });

    const ctx = limparContexto(contexto);
    let ctxTexto = Object.entries(ctx).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    if (ctxTexto.length > MAX_CONTEXTO) ctxTexto = ctxTexto.slice(0, MAX_CONTEXTO);
    const exemplos = await textosAnteriores(req, campo);
    const nomeCampo = String(rotulo || campo).slice(0, 120);

    const system = [
      'Você é a Ayla, assistente do jProcesso, sistema de gestão pública municipal.',
      `Escreva o texto do campo "${nomeCampo}" para o usuário revisar e enviar.`,
      extenso
        ? 'Regras: português formal de administração pública (redação oficial); até 3 parágrafos curtos (no máximo 1500 caracteres);'
        : 'Regras: português formal de administração pública; direto; 1 a 4 frases (no máximo 600 caracteres);',
      'use somente as informações do contexto — não invente números, valores, datas, nomes ou documentos;',
      'não use títulos, aspas, markdown, local/data nem assinatura; devolva apenas o texto do campo.',
      exemplos.length
        ? 'Siga o estilo, o vocabulário e a estrutura dos textos que o usuário já escreveu neste campo (adapte ao contexto atual, não copie dados antigos).'
        : '',
    ].filter(Boolean).join('\n');

    let user = `Contexto da tela:\n${ctxTexto || '- (sem dados adicionais)'}`;
    if (exemplos.length) user += `\n\nTextos anteriores do usuário neste campo:\n${exemplos.map((t, i) => `${i + 1}. ${t.slice(0, 600)}`).join('\n')}`;
    if (anterior) user += `\n\nEscreva uma versão diferente desta: ${String(anterior).slice(0, 600)}`;

    const texto = await callNvidiaNim([{ role: 'system', content: system }, { role: 'user', content: user }]);
    const limpo = texto.replace(/^["“”']+|["“”']+$/g, '').replace(/\*\*/g, '').trim().slice(0, 2000);
    res.json({ texto: limpo });
  } catch (error) {
    // Sem IA o campo só fica em branco, como antes
    console.warn('[Ayla] sugestão:', error.message);
    res.json({ texto: '' });
  }
};

// Guarda o texto que o usuário de fato enviou (mantém os 30 mais recentes por campo)
const registrarTextoUsado = async (req, res) => {
  try {
    const { campo, texto, contexto } = req.body || {};
    const t = String(texto || '').replace(/\0/g, '').trim();
    if (!campo || !CAMPO_RE.test(campo) || t.length < 5) return res.json({ ok: false });
    const db = req.tenantDb;
    const uid = req.user?.id;
    await db.query(
      `INSERT INTO textos_usados (usuario_id, secretaria_id, campo, texto, contexto) VALUES (:uid, :sec, :campo, :texto, CAST(:ctx AS jsonb))`,
      { replacements: { uid, sec: req.user?.secretariaId || null, campo, texto: t.slice(0, MAX_TEXTO_USADO), ctx: JSON.stringify(limparContexto(contexto)) } }
    );
    await db.query(
      `DELETE FROM textos_usados WHERE usuario_id = :uid AND campo = :campo AND id NOT IN (
         SELECT id FROM textos_usados WHERE usuario_id = :uid AND campo = :campo ORDER BY created_at DESC LIMIT 30)`,
      { replacements: { uid, campo } }
    );
    res.json({ ok: true });
  } catch (error) {
    console.warn('[Ayla] texto usado:', error.message);
    res.json({ ok: false });
  }
};

module.exports = { chat, sugerir, registrarTextoUsado };
