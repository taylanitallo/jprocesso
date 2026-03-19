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
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});

app.use('/api/', limiter);

routes(app);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Tramitação JEOS Processos' });
});

const PORT = process.env.PORT || 5000;
const USE_MOCK = process.env.USE_MOCK_AUTH === 'true';

const initDatabase = async () => {
  if (USE_MOCK) {
    console.log('⚠️  Modo MOCK ativado - rodando sem banco de dados');
    console.log('📋 Use: CPF: 00000000000 | Senha: 123456 | Prefeitura: teste');
    return;
  }
  
  try {
    await masterDb.authenticate();
    console.log('✅ Conectado ao banco de dados PostgreSQL');
    console.log('📊 Database:', process.env.DB_NAME);
    console.log('🔐 Schema:', process.env.DB_SCHEMA);
    
    // Não sincronizar - usamos as tabelas que já existem
    // await masterDb.sync({ alter: false });
    console.log('✅ Banco de dados pronto para uso');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
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
 
 
