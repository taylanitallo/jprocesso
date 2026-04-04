const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { masterDb } = require('./config/database');
const Tenant = require('./models/Tenant');
const { migrarTodosOsSchemas } = require('./controllers/tenantController');
const routes = require('./routes');

const app = express();

// Railway usa proxy reverso — necessário para express-rate-limit funcionar corretamente
app.set('trust proxy', 1);

// CORS deve ser o primeiro middleware garantir cabeçalhos mesmo em erros
// Em desenvolvimento, usar CLIENT_URL; em produção, permitir todos (endpoints públicos)
const corsOptions = {
  origin: true, // Permitir todas as origins - endpoints específicos validam autenticação
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight para todas as rotas
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

routes(app);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Tramitação JEOS Processos' });
});

// Error handler global — garante CORS mesmo em erros 500
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  if (!allowedOrigins || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  console.error('Erro interno:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 5000;
const USE_MOCK = process.env.USE_MOCK_AUTH === 'true';

const initDatabase = async () => {
  if (USE_MOCK) {
    console.log('⚠️  Modo MOCK ativado - rodando sem banco de dados');
    return;
  }
  
  try {
    await masterDb.authenticate();
    console.log('✅ Conectado ao banco de dados PostgreSQL');

    // Migração automática: garantir colunas ausentes em todos os schemas
    await migrarTodosOsSchemas();

    console.log('✅ Banco de dados pronto para uso');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n⚠️  Servidor vai iniciar mesmo assim — verifique as variáveis de banco\n');
    // NÃO encerra o processo: servidor sobe para responder health checks e CORS
  }
};

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV}`);
    if (USE_MOCK) {
      console.log('🔓 Modo MOCK ativado');
    }
  });
}).catch((err) => {
  console.error('❌ Falha crítica na inicialização:', err.message);
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} (modo degradado — sem banco)`);
  });
});

module.exports = app;
 
 
