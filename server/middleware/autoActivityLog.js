/**
 * Registro automático de atividades (prestação de contas).
 *
 * Toda requisição que ALTERA dados (POST/PUT/PATCH/DELETE), concluída com sucesso
 * por um usuário do município, vira um log — mesmo onde o controller não chama
 * registrarLog (ex.: alterar contrato, excluir credor, editar usuário).
 * Se o controller já gravou um log detalhado (registrarLog marca req._logRegistrado),
 * não duplica.
 */

// Rotas que não são "atividade" (sessão, leitura via POST, superadmin, IA, etc.)
const IGNORAR = [
  /^\/api\/auth\/(login|refresh|logout|buscar-municipios|primeiro-acesso|convite\/)/,
  /^\/api\/superadmin\b/,
  /^\/api\/tenants\/?$/,
  /^\/api\/tenants\/[^/]+$/,          // criar/alterar/excluir município (superadmin)
  /^\/api\/ayla\b/,
  /^\/api\/logs\b/,
  /^\/api\/schema-context\b/,
  /^\/api\/export\b/,
  /\/(consultar|verificar-url|sugerir|chat|testar|preview)(\/|$)/,
  /^\/api\/assinaturas\/(email\/enviar|totp\/iniciar)/,
];

// /api/<base> → módulo do log
const MODULO_POR_BASE = {
  processos: 'processos', documentos: 'processos', did: 'processos', assinaturas: 'processos',
  contratos: 'contratos', almoxarifado: 'almoxarifado', financeiro: 'financeiro',
  tesouraria: 'tesouraria', patrimonio: 'patrimonio', organizacao: 'organizacao',
  auth: 'usuarios', tenants: 'configuracoes', import: 'importacao', lixeira: 'excluidos',
};

// Nome legível dos trechos da URL
const NOMES = {
  processos: 'processo', documentos: 'documento', did: 'DID', contratos: 'contrato',
  ordens: 'ordem', credores: 'credor', itens: 'item', licitacoes: 'licitação',
  requisicoes: 'requisição', cotas: 'cota', entradas: 'entrada', saidas: 'saída',
  secretarias: 'secretaria', setores: 'setor', agentes: 'agente', usuarios: 'usuário',
  users: 'usuário', convites: 'convite', register: 'usuário', 'contas-bancarias': 'conta bancária',
  receitas: 'receita', despesas: 'despesa', transferencias: 'transferência', pagamentos: 'pagamento',
  bens: 'bem', grupos: 'grupo', inventarios: 'inventário', certidao: 'certidão', etapa: 'etapa',
  fluxos: 'fluxo', configuracoes: 'configurações', logo: 'logo', timbrado: 'timbrado',
  upload: 'documento', tramitar: 'tramitação', receber: 'recebimento', devolver: 'devolução',
  concluir: 'conclusão', arquivar: 'arquivamento', restaurar: 'restauração', apagar: 'exclusão definitiva',
};

const VERBO = { POST: 'Registrou', PUT: 'Alterou', PATCH: 'Alterou', DELETE: 'Excluiu' };
const ACAO  = { POST: 'registrar', PUT: 'alterar', PATCH: 'alterar', DELETE: 'excluir' };

// id (uuid, número, token) — não é nome de recurso
const ehId = (s) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(s) || /^\d+$/.test(s) || s.length > 40;

// Procura um número/identificação legível na resposta (nível 0 ou 1)
const numeroDaResposta = (body) => {
  if (!body || typeof body !== 'object') return null;
  const pega = (o) => o && typeof o === 'object' && (o.numero || o.numero_contrato || o.codigo || null);
  const direto = pega(body);
  if (direto) return direto;
  for (const v of Object.values(body)) {
    const n = !Array.isArray(v) && pega(v);
    if (n) return n;
  }
  return null;
};
const idDaResposta = (body) => {
  if (!body || typeof body !== 'object') return null;
  if (body.id) return body.id;
  for (const v of Object.values(body)) if (v && typeof v === 'object' && !Array.isArray(v) && v.id) return v.id;
  return null;
};

const autoActivityLog = (req, res, next) => {
  if (!VERBO[req.method]) return next();
  const caminho = (req.originalUrl || '').split('?')[0];
  if (!caminho.startsWith('/api/') || IGNORAR.some(re => re.test(caminho))) return next();

  // Guarda o corpo da resposta para tirar número/id do registro
  const jsonOriginal = res.json.bind(res);
  res.json = (body) => { res._corpoLog = body; return jsonOriginal(body); };

  res.on('finish', () => {
    try {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (req._logRegistrado) return;
      const user = req.user;
      if (!user || user.isAdmin || user.tipo === 'jeos' || !req.models?.Log) return;

      const partes = caminho.replace(/^\/api\//, '').split('/').filter(Boolean);
      const base   = partes[0];
      const modulo = MODULO_POR_BASE[base] || base || 'sistema';
      const ids    = partes.filter(ehId);
      const nomes  = partes.slice(1).filter(p => !ehId(p));
      // sem trecho além da base (ex.: POST /api/processos) → o próprio recurso da base
      const recursos = (nomes.length ? nomes : [base]).map(p => NOMES[p] || p.replace(/-/g, ' '));

      const corpo  = res._corpoLog;
      const numero = numeroDaResposta(corpo);
      const refId  = ids[0] || idDaResposta(corpo);

      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
      const ultimo = (nomes[nomes.length - 1] || base || 'registro').replace(/-/g, '_');

      req.models.Log.create({
        usuario_id:        user.id || null,
        acao:              `${ACAO[req.method]}_${ultimo}`.substring(0, 100),
        modulo:            String(modulo).substring(0, 50),
        descricao:         `${VERBO[req.method]} ${recursos.join(' › ')}${numero ? ` nº ${numero}` : ''}`,
        referencia_id:     refId ? String(refId).substring(0, 100) : null,
        referencia_numero: numero ? String(numero).substring(0, 100) : null,
        secretaria_id:     user.secretariaId || null,
        setor_id:          user.setorId || null,
        ip,
        user_agent:        (req.headers['user-agent'] || '').substring(0, 300) || null,
        dados_extras:      { automatico: true, metodo: req.method, rota: caminho.substring(0, 300) },
        created_at:        new Date(),
      }).catch((err) => console.error('[autoActivityLog]', err.message));
    } catch (err) {
      console.error('[autoActivityLog]', err.message);
    }
  });

  next();
};

module.exports = autoActivityLog;
