const net = require('net');

// Teste manual do protocolo PostgreSQL SEM usar pg module
// Envia startup message e vê o que o servidor responde
const socket = net.createConnection({ host: '127.0.0.1', port: 5432, timeout: 10000 }, () => {
  console.log('TCP CONECTADO!');
  
  // Startup message: Int32 length, Int32 protocol (3.0 = 196608), then key=value pairs
  const user = 'postgres';
  const database = 'postgres';
  
  // Build startup message
  const params = `user\0${user}\0database\0${database}\0\0`;
  const paramsBuffer = Buffer.from(params, 'utf8');
  const length = 4 + 4 + paramsBuffer.length; // length field + protocol version + params
  
  const msg = Buffer.alloc(length);
  msg.writeInt32BE(length, 0);        // total length including self
  msg.writeInt32BE(196608, 4);        // Protocol version 3.0
  paramsBuffer.copy(msg, 8);          // Parameters
  
  console.log('Enviando startup message...');
  socket.write(msg);
});

let received = '';
socket.on('data', (data) => {
  console.log('DADOS RECEBIDOS! Bytes:', data.length);
  console.log('Primeiro byte (tipo de msg):', data[0], String.fromCharCode(data[0]));
  console.log('Resposta hex:', data.slice(0, 20).toString('hex'));
  socket.destroy();
  process.exit(0);
});

socket.on('timeout', () => {
  console.log('TCP TIMEOUT!');
  socket.destroy();
  process.exit(1);
});

socket.on('error', (err) => {
  console.error('TCP ERRO:', err.message);
  process.exit(1);
});

console.log('Conectando a 127.0.0.1:5432...');
setTimeout(() => {
  if (!socket.destroyed) {
    console.log('TIMEOUT (10s): nenhuma resposta do PostgreSQL');
    socket.destroy();
    process.exit(1);
  }
}, 10000);
