const axios = require('axios');

async function testarAPI() {
  try {
    console.log('🔍 Testando API de secretarias...\n');
    
    // Teste 1: Listar secretarias
    console.log('1️⃣ GET /api/organizacao/secretarias');
    const secretarias = await axios.get('http://localhost:5000/api/organizacao/secretarias', {
      headers: {
        'Authorization': 'Bearer test_token',
        'x-tenant-id': 'teste'
      }
    });
    console.log('✅ Retornou:', typeof secretarias.data, '- Total:', Array.isArray(secretarias.data) ? secretarias.data.length : 'não é array');
    if (Array.isArray(secretarias.data) && secretarias.data.length > 0) {
      console.log('   Primeira secretaria:', secretarias.data[0].nome);
    }
    console.log('');
    
    // Teste 2: Listar setores
    console.log('2️⃣ GET /api/organizacao/setores');
    const setores = await axios.get('http://localhost:5000/api/organizacao/setores', {
      headers: {
        'Authorization': 'Bearer test_token',
        'x-tenant-id': 'teste'
      }
    });
    console.log('✅ Retornou:', typeof setores.data, '- Total:', Array.isArray(setores.data) ? setores.data.length : 'não é array');
    if (Array.isArray(setores.data) && setores.data.length > 0) {
      console.log('   Primeiro setor:', setores.data[0].nome);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }
}

testarAPI();
