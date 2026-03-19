// Diagnostico de inicializacao do servidor
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');

// 1. Verificar arquivos
const files = [
  'server/index.js',
  'server/config/database.js',
  'server/models/index.js',
  'server/models/DidFormulario.js',
  'server/controllers/didController.js',
  'server/routes/did.js',
  'server/routes/index.js'
];
console.log('=== VERIFICANDO ARQUIVOS ===');
files.forEach(f => {
  const exists = fs.existsSync(path.join(__dirname, f));
  console.log(exists ? '  OK' : '  MISSING', f);
});

// 2. Tentar carregar cada módulo
console.log('\n=== CARREGANDO MÓDULOS ===');
const mods = [
  'server/config/database.js',
  'server/models/DidFormulario.js',
  'server/controllers/didController.js',
  'server/routes/did.js',
  'server/routes/index.js'
];
let allOk = true;
for (const m of mods) {
  try {
    require(path.join(__dirname, m));
    console.log('  OK', m);
  } catch (err) {
    console.error('  ERRO', m, '->', err.message);
    allOk = false;
  }
}

if (allOk) {
  console.log('\n=== TODOS OS MODULOS OK ===');
  console.log('Iniciando servidor...');
  require(path.join(__dirname, 'server/index.js'));
} else {
  console.log('\n=== ERRO: Ver erros acima ===');
}
