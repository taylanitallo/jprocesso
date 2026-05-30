import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Eye, EyeOff, Search, LogIn, Building2 } from 'lucide-react'
import api from '../services/api'

export default function Login() {
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenantInfo, setTenantInfo] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { login } = useAuth()
  useTheme()
  const navigate = useNavigate()
  const { subdomain } = useParams()

  useEffect(() => {
    if (subdomain) fetchTenantInfo(subdomain)
  }, [subdomain])

  const fetchTenantInfo = async (sub) => {
    try {
      const response = await api.get(`/tenants/info?subdomain=${sub}`)
      setTenantInfo(response.data)
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
      setError(err.response?.data?.error || 'CPF ou senha inválidos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/${subdomain}/consulta`, { state: { query: searchQuery.trim() } })
  }

  const nomeMunicipio = tenantInfo?.tenant?.nome_municipio
  const brasaoUrl = tenantInfo?.tenant?.configuracoes?.brasao_url

  return (
    <div
      className="relative h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />

      {/* ── Desktop: grid 2 colunas ── */}
      <div className="hidden lg:grid h-full relative z-10 px-16 xl:px-20 gap-12"
        style={{ gridTemplateColumns: '1.05fr 0.95fr', alignItems: 'center' }}
      >
        {/* Coluna esquerda — logo + consulta centralizada */}
        <div className="flex flex-col h-full justify-center">
          {/* Logo jProcesso */}
          <img
            src="/logo_jprocesso.png"
            alt="jProcesso"
            className="mb-8 w-[500px] max-w-full object-contain drop-shadow-[0_0_28px_rgba(168,85,247,0.40)]"
          />

          {/* Card consulta pública */}
          <div className="w-full max-w-2xl p-6 bg-black/45 backdrop-blur-md border border-white/10 rounded-3xl">
            <h2 className="text-white font-semibold text-base mb-1">
              Consultar processos
            </h2>
            <p className="text-white/50 text-sm mb-4">
              {nomeMunicipio
                ? `Pesquise processos de ${nomeMunicipio} sem precisar de login`
                : 'Pesquise processos sem precisar de login'}
            </p>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquise por número, interessado ou assunto"
                  className="w-full h-12 rounded-xl border border-white/20 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 caret-blue-600 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 flex-shrink-0"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </form>
          </div>
        </div>

        {/* Coluna direita — card login centralizado */}
        <div className="flex items-center justify-center h-full px-4 lg:px-8">
          <div className="relative overflow-hidden w-full max-w-md bg-[#050816]/90 backdrop-blur-xl border border-fuchsia-500/30 shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-[28px] px-8 py-7">
            <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />

            {/* Cabeçalho */}
            <div className="mb-6 flex flex-col items-center text-center relative z-10">
              {brasaoUrl ? (
                <img
                  src={brasaoUrl}
                  alt={nomeMunicipio || 'Prefeitura'}
                  className="mb-4 h-20 w-auto max-w-[180px] object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.25)]"
                />
              ) : (
                <div className="mb-4 w-16 h-16 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-fuchsia-400" />
                </div>
              )}
              <h1 className="text-lg font-bold text-white">
                {nomeMunicipio || 'Acesso ao Sistema'}
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Informe suas credenciais
              </p>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl mb-4 text-sm relative z-10">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="00000000000"
                  maxLength={11}
                  className="w-full h-12 rounded-2xl border border-fuchsia-500/10 bg-white/95 px-4 text-slate-900 placeholder:text-slate-400 shadow-inner outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/20"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-2xl border border-fuchsia-500/10 bg-white/95 px-4 pr-11 text-slate-900 placeholder:text-slate-400 shadow-inner outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/20"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 shadow-[0_10px_30px_rgba(168,85,247,0.45)] font-semibold text-white transition-all duration-300 hover:scale-[1.01] mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-4 text-center relative z-10">
              <Link
                to={`/${subdomain}/consulta`}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-fuchsia-300 transition-all"
              >
                <Search className="h-3 w-3" />
                Consultar processo sem login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile / Tablet: coluna única com scroll ── */}
      <div className="lg:hidden flex flex-col items-center px-5 py-8 relative z-10 min-h-screen justify-center gap-5">
        {/* Logo mobile */}
        <img
          src="/logo_jprocesso.png"
          alt="jProcesso"
          className="w-48 max-w-full object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.40)]"
        />

        {/* Card login */}
        <div className="relative overflow-hidden w-full max-w-sm bg-[#050816]/90 backdrop-blur-xl border border-fuchsia-500/30 shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-[28px] px-6 py-7">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />

          <div className="mb-5 flex flex-col items-center text-center relative z-10">
            {brasaoUrl ? (
              <img
                src={brasaoUrl}
                alt={nomeMunicipio || 'Prefeitura'}
                className="mb-3 h-20 w-auto max-w-[160px] object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.25)]"
              />
            ) : (
              <div className="mb-3 w-14 h-14 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-fuchsia-400" />
              </div>
            )}
            <h1 className="text-lg font-bold text-white">
              {nomeMunicipio || 'Acesso ao Sistema'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">Informe suas credenciais</p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl mb-4 text-sm relative z-10">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="00000000000"
                maxLength={11}
                className="w-full h-11 rounded-2xl border border-fuchsia-500/10 bg-white/95 px-4 text-slate-900 placeholder:text-slate-400 shadow-inner outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/20"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 rounded-2xl border border-fuchsia-500/10 bg-white/95 px-4 pr-11 text-slate-900 placeholder:text-slate-400 shadow-inner outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/20"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 shadow-[0_10px_30px_rgba(168,85,247,0.45)] font-semibold text-white transition-all duration-300 hover:scale-[1.01] mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <LogIn className="h-4 w-4" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center relative z-10">
            <Link
              to={`/${subdomain}/consulta`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-fuchsia-300 transition-all"
            >
              <Search className="h-3 w-3" />
              Consultar processo sem login
            </Link>
          </div>
        </div>

        {/* Consulta pública — mobile */}
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
            Consultar processos
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Número, interessado ou assunto"
                className="w-full rounded-lg border border-white/20 bg-white pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 caret-blue-600 outline-none transition-colors focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex-shrink-0"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer institucional — desktop only */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 lg:flex">
        <p className="text-xs font-medium tracking-[0.18em] text-white/50 uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.10)]">
          © 2026{' '}
          <a
            href="https://jeossistemas.com"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto text-white/70 hover:text-fuchsia-300 transition-colors"
          >
            JEOS SISTEMAS E ASSESSORIAS LTDA
          </a>
          <span className="mx-3 text-fuchsia-400/70">•</span>
          V1.0.0
        </p>
      </div>
    </div>
  )
}

