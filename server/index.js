const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { masterDb } = require('./config/database');
const Tenant = require('./models/Tenant');
const routes = require('./routes');

const app = express();

// Configurações atualizadas
app.use(helmet());
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : null;
app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      }
    : true,
  credentials: true
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
    console.log('✅ Banco de dados pronto para uso');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados');
    console.log('\n⚠️  Para rodar sem banco, adicione USE_MOCK_AUTH=true no .env\n');
    process.exit(1);
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
});

module.exports = app;
 
 
