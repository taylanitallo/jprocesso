import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import api, { setAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginAdmin() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login como admin na schema public
      const response = await api.post('/auth/login', {
        email: formData.email,
        senha: formData.senha,
        subdomain: 'admin' // Identificador especial para superadmin
      });

      // Limpar qualquer sessão de tenant anterior antes de setar admin
      localStorage.removeItem('subdomain');
      delete api.defaults.headers.common['x-tenant-subdomain'];

      // Salvar flags de sessão admin
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('subdomain', 'admin');

      // M-3: access token em memória + default header para SPA navigation
      setAccessToken(response.data.token);
      api.defaults.headers.common['x-tenant-subdomain'] = 'admin';

      // Redirecionar para área de gestão
      navigate('/superadmin/painel');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-800 via-ink-900 to-ink-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-surface rounded-2xl shadow-2xl p-8">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900 mb-1">Administrador Geral</h1>
            <p className="text-ink-500 text-sm">Acesso ao painel de gerenciamento de prefeituras</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
              <div className="text-danger-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm text-danger-800 font-medium">Erro de autenticação</p>
                <p className="text-sm text-danger-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Digite seu e-mail"
                className="block w-full px-3 py-2.5 border border-ink-300 rounded-lg bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder="••••••••"
                className="block w-full px-3 py-2.5 border border-ink-300 rounded-lg bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white py-2.5 px-4 rounded-lg hover:bg-brand-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
