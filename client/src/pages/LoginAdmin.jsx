import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import api, { setAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BotaoTema from '../components/BotaoTema';

export default function LoginAdmin() {
  const navigate = useNavigate();
  const aviso = useLocation().state?.aviso;
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

      // Flags da sessão admin. A sessão de município (localStorage 'subdomain' e
      // cookie próprio) é independente e permanece intacta; o header
      // x-tenant-subdomain=admin é definido pelo interceptor nas páginas /superadmin.
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isAdmin', 'true');

      // M-3: access token em memória
      setAccessToken(response.data.token);

      // Redirecionar para área de gestão
      navigate('/superadmin/painel');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Fundo: claro no tema claro, azul-escuro fixo no escuro (ink-* inverteria aqui)
    <div className="relative min-h-screen bg-gradient-to-br from-brand-50 via-canvas to-brand-100 dark:from-[#0b1020] dark:via-[#050816] dark:to-[#0b1020] flex items-center justify-center p-4">
      <BotaoTema className="absolute top-4 right-4" />
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

          {aviso && !error && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              {aviso}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 dark:border-danger-700 rounded-lg flex items-start gap-3">
              <div className="text-danger-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm text-danger-800 dark:text-danger-300 font-medium">Erro de autenticação</p>
                <p className="text-sm text-danger-700 dark:text-danger-400 mt-0.5">{error}</p>
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
