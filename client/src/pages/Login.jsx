import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Eye, EyeOff, Search, Sun, Moon } from 'lucide-react'

export default function Login() {
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenantInfo, setTenantInfo] = useState(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { subdomain } = useParams()

  useEffect(() => {
    if (subdomain) fetchTenantInfo(subdomain)
  }, [subdomain])

  const fetchTenantInfo = async (sub) => {
    try {
      const response = await fetch(`/api/tenants/info?subdomain=${sub}`)
      const data = await response.json()
      setTenantInfo(data)
    } catch (err) {
      console.error('Erro ao buscar informações do tenant:', err)
    }
  }

  const formatCPF = (value) => value.replace(/\D/g, '').slice(0, 11)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(cpf, senha, subdomain)
      navigate(`/${subdomain}`)
    } catch (err) {
      setError(err.response?.data?.error || '❌ CPF ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  const faqs = [
    { q: '🔑 Como recuperar minha senha?', a: 'Entre em contato com o administrador do sistema para solicitar a redefinição.' },
    { q: '🔐 Como tenho acesso ao sistema?', a: 'O acesso é concedido pelo gestor municipal. Solicite ao seu setor de TI.' },
    { q: '📜 O que é o "Acesso com Certificado"?', a: 'É a autenticação usando certificado digital ICP-Brasil.' },
    { q: '👤 Como mudar meu perfil de usuário?', a: 'Acesse Configurações > Perfil após realizar o login.' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📋</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">jProcesso</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Hero */}
      {(() => { var _loginBg = tenantInfo?.tenant?.configuracoes?.imagem_fundo_login || null; return (
      <div
        className="relative overflow-hidden"
        style={_loginBg ? { backgroundImage: `url(${_loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
      >
        <div
          className="absolute inset-0"
          style={_loginBg
            ? { backgroundColor: 'rgba(10, 20, 40, 0.70)' }
            : { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1e1b4b 100%)' }
          }
        />
        <div className="relative max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Left: branding + search */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h1 className="text-5xl font-black text-white tracking-tight mb-3">
                  j<span className="text-blue-400">Processo</span>
                </h1>
                <p className="text-blue-200 text-base font-medium tracking-wide">Sistema de Tramitação de Processos e Controle de Despesas</p>
                {tenantInfo?.nome && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                    <span className="text-sm">📍</span>
                    <span className="text-white text-sm font-semibold">{tenantInfo.nome}</span>
                  </div>
                )}
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <p className="text-white font-semibold mb-3 tracking-wide uppercase text-xs">🔍 Consultar Processo</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Ex: Proc.2026.0000001 ou nome do interessado"
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-white/30 bg-white/90 dark:bg-white/10 dark:text-white focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40 transition-all text-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
                  />
                  <button
                    onClick={() => navigate(`/${subdomain}/consulta`, { state: { query: searchQuery.trim() } })}
                    type="button"
                    className="px-5 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-glow-green active:scale-95"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>
              </div>

              {/* Diferenciais institucionais */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '⚡', label: 'Tramitação Instantânea' },
                  { icon: '🔏', label: 'Assinatura Digital' },
                  { icon: '📊', label: 'Relatórios Gerenciais' },
                  { icon: '📱', label: 'Acesso Responsivo' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-lg px-3 py-2">
                    <span className="text-base">{icon}</span>
                    <span className="text-xs text-gray-200 font-medium leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Login card */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-7 border border-gray-100 dark:border-gray-700 animate-bounce-in">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🏢</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Área Restrita</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Acesse com suas credenciais</p>
                </div>
                
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      🏙️ Município
                    </label>
                    <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-300 font-semibold">
                      {subdomain || 'Não identificado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      🪪 CPF
                    </label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="00000000000"
                      maxLength={11}
                      className="input-field text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      🔑 Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                        className="input-field text-sm pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Lembrar</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm"
                  >
                    {loading ? '⏳ Entrando...' : '🚀 Acessar jProcesso'}
                  </button>
                </form>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    🔧 Área de Administração
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      );})()}

      {/* FAQs */}
      <div className="bg-white dark:bg-gray-800 py-14">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">❓ Perguntas Frequentes</h2>
            <div className="w-16 h-1 bg-yellow-400 mx-auto" />
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-xl">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{faq.q}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Support channels */}
      <div className="bg-gray-50 dark:bg-gray-900 py-14 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📞 Canais de Atendimento</h2>
            <div className="w-16 h-1 bg-yellow-400 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: '🆘', title: 'Central de Ajuda', sub: 'Suporte técnico' },
              { emoji: '📞', title: '(85) 3125-8056', sub: 'Telefone' },
              { emoji: '💬', title: 'WhatsApp', sub: 'Atendimento rápido' },
              { emoji: '📧', title: 'E-mail', sub: 'suporte@jeos.com.br' },
            ].map((ch, i) => (
              <div key={i} className="card p-5 text-center hover:shadow-card-hover hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="text-3xl mb-3">{ch.emoji}</div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{ch.title}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{ch.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-5 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          🏢 JEOS Ecossistema © {new Date().getFullYear()} — Sistema de Tramitação Eletrônica
        </p>
      </div>
    </div>
  )
}

