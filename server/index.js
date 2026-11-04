const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { masterDb, getTenantConnection, ensureMasterRefreshTokensTable, ensureAdminsEmailColumn, criarTabelasBackup, criarTabelasAssinaturaLegislacao } = require('./config/database');
const Tenant = require('./models/Tenant');
const { migrarTodosOsSchemas } = require('./controllers/tenantController');
const routes = require('./routes');

const app = express();

// Railway usa proxy reverso — necessário para express-rate-limit funcionar corretamente
app.set('trust proxy', 1);

// ── CORS allowlist ─────────────────────────────────────────────────────────
// Origens permitidas: CLIENT_URL + ALLOWED_ORIGINS (separadas por vírgula no env)
// Em desenvolvimento, localhost é sempre permitido.
const buildAllowlist = () => {
  const list = new Set();

  // M-1/CORS: localhost apenas em desenvolvimento — nunca em produção
  if (process.env.NODE_ENV !== 'production') {
    list.add('http://localhost:3000');
    list.add('http://localhost:5173');
    list.add('http://127.0.0.1:3000');
  }

  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean).forEach(o => list.add(o));
  }

  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean).forEach(o => list.add(o));
  }

  return list;
};

const allowedOrigins = buildAllowlist();

const corsOptions = {
  origin: (origin, callback) => {
    // Requisições sem origin (mobile apps, Postman, curl, SSR server-side) — permitir
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    // Em desenvolvimento, qualquer localhost é permitido (porta variável)
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: origem não permitida — ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200, // suporte a IE11
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight para todas as rotas
app.use(helmet({
  frameguard: { action: 'sameorigin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      // 'unsafe-inline' necessário para blocos <style> em componentes React (ex: animações JAI)
      styleSrc:       ["'self'", "'unsafe-inline'"],
      // M-4: restrito a domínios conhecidos — sem https: genérico
      imgSrc:         ["'self'", "data:", "https://*.supabase.co", "https://*.supabase.in"],
      connectSrc:     ["'self'",
                       "https://jprocesso-production.up.railway.app",
                       "https://*.supabase.co"],
      frameAncestors: ["'self'", "https://www.jeossistemas.com", "https://*.jeossistemas.com"],
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
    }
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Limites de requisição ────────────────────────────────────────────────────
// Prefeituras costumam ter todos os servidores atrás de UM IP público. Por isso
// os limites contam por PESSOA (usuário logado / sessão / conta), não pelo IP —
// assim um prédio inteiro nunca é bloqueado, e as proteções contra abuso e força
// bruta continuam valendo para cada cliente individualmente.
const JANELA = 15 * 60 * 1000;
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 32);

// Usuário autenticado pelo access token (Bearer). Token inválido/expirado → null (cai no IP).
const usuarioDaRequisicao = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    return p?.id ? `${p.isAdmin ? 'admin' : p.subdomain || 'tenant'}:${p.id}` : null;
  } catch { return null; }
};

const limiter = rateLimit({
  windowMs: JANELA,
  // Logado: ~5,5 req/s contínuos por pessoa. Anônimo (páginas públicas): por IP.
  max: (req) => (usuarioDaRequisicao(req) ? 5000 : 10000),
  keyGenerator: (req) => {
    const u = usuarioDaRequisicao(req);
    return u ? `u:${u}` : `ip:${req.ip}`;
  },
  message: { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Força bruta de senha: 10 erros por CONTA (CPF/e-mail + município) a cada 15 min…
const authLimiterConta = rateLimit({
  windowMs: JANELA,
  max: 10,
  keyGenerator: (req) => {
    const b = req.body || {};
    const conta = String(b.cpf || b.email || '').trim().toLowerCase();
    return conta ? `conta:${b.subdomain || ''}:${hash(conta)}` : `ip:${req.ip}`;
  },
  message: { error: 'Muitas tentativas de senha para esta conta. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // logins bem-sucedidos não contam
});
// …e um teto por IP contra ataque distribuído em várias contas.
const authLimiterIp = rateLimit({
  windowMs: JANELA,
  max: 100,
  message: { error: 'Muitas tentativas de login a partir desta rede. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Renovação de sessão: por sessão (cookie de refresh); sem cookie, por IP.
const refreshLimiter = rateLimit({
  windowMs: JANELA,
  max: (req) => (req.cookies?.refreshToken || req.cookies?.refreshTokenAdmin ? 300 : 1000),
  keyGenerator: (req) => {
    const c = req.headers['x-auth-context'] === 'admin' ? req.cookies?.refreshTokenAdmin : req.cookies?.refreshToken;
    return c ? `sess:${hash(c)}` : `ip:${req.ip}`;
  },
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cadastro pelo link de convite (público) e troca de senha do primeiro acesso:
// tetos por IP contra abuso e tentativa de senha
const conviteLimiter = rateLimit({
  windowMs: JANELA,
  max: 30,
  message: { error: 'Muitas tentativas de cadastro a partir desta rede. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const primeiroAcessoLimiter = rateLimit({
  windowMs: JANELA,
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiterIp, authLimiterConta);
app.use('/api/auth/convite/', (req, res, next) => (req.method === 'POST' ? conviteLimiter(req, res, next) : next()));
app.use('/api/auth/primeiro-acesso/', primeiroAcessoLimiter);
app.use('/api/auth/refresh', refreshLimiter);

// Toda alteração feita por usuário do município vira log (prestação de contas)
app.use('/api/', require('./middleware/autoActivityLog'));

routes(app);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Tramitação JEOS Processos' });
});

// Endpoint leve de keepalive — usado pelo auto-ping abaixo
app.get('/ping', (req, res) => res.send('pong'));

// ── Arquivos estáticos do React (produção) ───────────────────────────────────
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(distPath)) {
  // Assets com hash no nome podem ser cacheados por 1 ano
  // index.html nunca deve ser cacheado para sempre buscar os hashes novos
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    }
  }));
  // Catch-all: devolve index.html para rotas do React Router
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // ── 404 — rota não encontrada (sem build do frontend) ───────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Rota não encontrada — ${req.method} ${req.originalUrl}`,
    });
  });
}

// ── Error handler global ─────────────────────────────────────────────────────
// Deve ser o ÚLTIMO middleware (4 parâmetros obrigatórios no Express)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Erros de CORS gerados pelo middleware acima chegam aqui como 403
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  const statusCode = err.status || err.statusCode || 500;

  // Nunca expor stack trace em produção
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err.stack || err.message);
  } else {
    console.error('[ERROR]', err.message);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Erro interno do servidor' : (err.message || 'Erro'),
  });
});

const PORT = process.env.PORT || 5000;

const initDatabase = async () => {
  try {
    await masterDb.authenticate();
    console.log('✅ Conectado ao banco de dados PostgreSQL');
    // Guard: REFRESH_TOKEN_SECRET obrigatório em produção
    if (process.env.NODE_ENV === 'production' && !process.env.REFRESH_TOKEN_SECRET) {
      console.error('\u274c FATAL: REFRESH_TOKEN_SECRET é obrigatório em NODE_ENV=production. Configure a variável no Railway.');
      process.exit(1);
    }

    // Garantir tabela public.refresh_tokens para tokens de admin
    await ensureMasterRefreshTokensTable();
    // Garantir coluna email em public.admins (login SuperAdmin por email)
    await ensureAdminsEmailColumn();
    // Criar tabelas de backup se não existirem
    await criarTabelasBackup();
    // Chaves de assinatura eletrônica e legislação por município
    await criarTabelasAssinaturaLegislacao();
    // Migração automática: garantir colunas ausentes em todos os schemas
    await migrarTodosOsSchemas();

    // Pré-aquecer cache de conexões para todos os tenants ativos.
    // Sem isso, a PRIMEIRA requisição de cada tenant após cold start dispara
    // runTenantMigrations em tempo real, adicionando 2-4s de latência.
    const tenants = await Tenant.findAll({ where: { ativo: true }, attributes: ['schema'] });
    if (tenants.length > 0) {
      console.log(`🔥 Pré-aquecendo conexões para ${tenants.length} tenant(s)...`);
      await Promise.allSettled(
        tenants.map((t) =>
          getTenantConnection(t.schema).catch((e) =>
            console.warn(`⚠️  Falha ao pré-aquecer ${t.schema}:`, e.message)
          )
        )
      );
      console.log('✅ Cache de tenants aquecido');
    }

    console.log('✅ Banco de dados pronto para uso');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados.');
    console.log('\n⚠️  Servidor vai iniciar mesmo assim — verifique as variáveis de banco\n');
    // NÃO encerra o processo: servidor sobe para responder health checks e CORS
  }
};

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV}`);
  });
}).catch((err) => {
  console.error('❌ Falha crítica na inicialização:', err.message);
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} (modo degradado — sem banco)`);
  });
});

module.exports = app;
 
 
