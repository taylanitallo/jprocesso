import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginAdmin() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    cpf: '',
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
        ...formData,
        subdomain: 'admin' // Identificador especial para admin
      });

      // Salvar apenas token + flags de sessão (sem dados volumosos)
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('subdomain', 'admin');
      
      // Configurar header de autenticação
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      api.defaults.headers.common['x-tenant-subdomain'] = 'admin';

      // Redirecionar para área de gestão
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-3 shadow-xl">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Área Restrita</h1>
          <p className="text-blue-200 text-sm">Sistema de Gestão Multi-Tenant</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">Acesso Administrativo</h2>
            <p className="text-gray-600 dark:text-gray-400 text-xs">Gerencie municípios e configurações do sistema</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <div className="text-red-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">Erro de autenticação</p>
                <p className="text-sm text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* CPF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                CPF do Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  <span>Acessar Área Restrita</span>
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white mb-0.5 text-sm">Apenas para Administradores</p>
                <p className="text-xs leading-relaxed">
                  Para acessar como município, utilize: <span className="font-mono text-blue-600">https://jprocesso.vercel.app/nome-municipio</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-blue-300 text-xs">© 2026 - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
