require('dotenv').config({ path: './server/.env' });
const axios = require('axios');

(async () => {
  try {
    const resp = await axios.post('http://localhost:5001/api/auth/login', {
      cpf: '04335471386',
      senha: 'admin123',
      subdomain: 'admin'
    });
    console.log('✅ Login OK:', resp.data.user);
  } catch (e) {
    const status = e.response?.status;
    const msg = e.response?.data?.error || e.message;
    console.log(`❌ Login falhou (${status}):`, msg);
    if (status === 401) {
      console.log('→ Senha "admin123" incorreta. Tente outra senha ou redefina abaixo.');
    }
  }
})();
