// Script para gerar hash bcrypt da senha do admin
const bcrypt = require('bcryptjs');

const senha = '123456';
const hash = bcrypt.hashSync(senha, 10);

console.log('\n========================================');
console.log('HASH BCRYPT GERADO:');
console.log('========================================');
console.log(`Senha: ${senha}`);
console.log(`Hash: ${hash}`);
console.log('========================================\n');
console.log('Use este hash no INSERT do usuário admin no SQL');
console.log('\n');
