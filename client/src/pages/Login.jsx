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
  const [tenantNotFound, setTenantNotFound] = useState(false)
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
      setTenantNotFound(true)
    }
  }

  const formatCPF = (value) => value.replace(/\D/g, '').slice(0, 11)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ cpf, senha, subdomain })
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
  // Bucket privado → logo de login servida via endpoint proxy por subdomain.
  // Mantém compatibilidade com brasao_url (URL pública legada), se existir.
  const brasaoUrl = tenantInfo?.tenant?.configuracoes?.logo_login_url
    ? `/api/tenants/${subdomain}/logo/login`
    : tenantInfo?.tenant?.configuracoes?.brasao_url

  if (tenantNotFound) {
    return (
      <div
        className="relative h-screen overflow-hidden flex items-center justify-center"
        style={{ backgroundImage: "url('/background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-ink-900/60 pointer-events-none" />
        <div className="relative z-10 text-center px-8 max-w-md">
          <div className="mb-6 flex justify-center">
            <img src="/logo_jprocesso.png" alt="jProcesso" className="w-48 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.40)]" />
          </div>
          <div className="bg-[#050816]/90 backdrop-blur-xl border border-danger-500/30 shadow-[0_0_40px_rgba(239,68,68,0.20)] rounded-[28px] px-8 py-8">
            <div className="mb-4 w-16 h-16 rounded-full bg-danger-500/10 border border-danger-500/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Página não encontrada</h1>
            <p className="text-ink-400 text-sm mb-6">
              O município <span className="text-white font-semibold">/{subdomain}</span> não existe ou foi desativado no sistema.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-violet-500 transition-all"
            >
              Voltar ao início
            </a>
          </div>
          <p className="mt-6 text-xs text-white/30 uppercase tracking-widest">
            © 2026 JEOS SISTEMAS E ASSESSORIAS LTDA
          </p>
        </div>
      </div>
    )
  }

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
      <div className="absolute inset-0 bg-ink-900/40 pointer-events-none" />

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
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquise por número, interessado ou assunto"
                  className="w-full h-12 rounded-xl border border-white/20 bg-surface pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 caret-info-600 shadow-sm outline-hidden transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-info-600/30 transition-all hover:bg-brand-700 shrink-0"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </form>
          </div>
        </div>

        {/* Coluna direita — card login centralizado */}
        <div className="flex items-center justify-center h-full px-4 lg:px-8">
          <div className="relative overflow-hidden w-full max-w-md bg-[#050816]/90 backdrop-blur-xl border border-violet-500/30 shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-[28px] px-8 py-7">
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
                <div className="mb-4 w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-violet-400" />
                </div>
              )}
              <h1 className="text-lg font-bold text-white">
                {nomeMunicipio || 'Acesso ao Sistema'}
              </h1>
              <p className="mt-0.5 text-sm text-ink-400">
                Informe suas credenciais
              </p>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-danger-900/30 border border-danger-500/30 text-danger-300 px-4 py-2.5 rounded-xl mb-4 text-sm relative z-10">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="00000000000"
                  maxLength={11}
                  className="w-full h-12 rounded-2xl border border-violet-500/10 bg-surface/95 px-4 text-ink-900 placeholder:text-ink-400 shadow-inner outline-hidden transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-2xl border border-violet-500/10 bg-surface/95 px-4 pr-11 text-ink-900 placeholder:text-ink-400 shadow-inner outline-hidden transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-600 hover:from-violet-500 hover:to-violet-500 shadow-[0_10px_30px_rgba(168,85,247,0.45)] font-semibold text-white transition-all duration-300 hover:scale-[1.01] mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-4 text-center relative z-10">
              <Link
                to={`/${subdomain}/consulta`}
                className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-violet-300 transition-all"
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
        <div className="relative overflow-hidden w-full max-w-sm bg-[#050816]/90 backdrop-blur-xl border border-violet-500/30 shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-[28px] px-6 py-7">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />

          <div className="mb-5 flex flex-col items-center text-center relative z-10">
            {brasaoUrl ? (
              <img
                src={brasaoUrl}
                alt={nomeMunicipio || 'Prefeitura'}
                className="mb-3 h-20 w-auto max-w-[160px] object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.25)]"
              />
            ) : (
              <div className="mb-3 w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-violet-400" />
              </div>
            )}
            <h1 className="text-lg font-bold text-white">
              {nomeMunicipio || 'Acesso ao Sistema'}
            </h1>
            <p className="mt-0.5 text-sm text-ink-400">Informe suas credenciais</p>
          </div>

          {error && (
            <div className="bg-danger-900/30 border border-danger-500/30 text-danger-300 px-4 py-2.5 rounded-xl mb-4 text-sm relative z-10">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="00000000000"
                maxLength={11}
                className="w-full h-11 rounded-2xl border border-violet-500/10 bg-surface/95 px-4 text-ink-900 placeholder:text-ink-400 shadow-inner outline-hidden transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 rounded-2xl border border-violet-500/10 bg-surface/95 px-4 pr-11 text-ink-900 placeholder:text-ink-400 shadow-inner outline-hidden transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-600 hover:from-violet-500 hover:to-violet-500 shadow-[0_10px_30px_rgba(168,85,247,0.45)] font-semibold text-white transition-all duration-300 hover:scale-[1.01] mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <LogIn className="h-4 w-4" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center relative z-10">
            <Link
              to={`/${subdomain}/consulta`}
              className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-violet-300 transition-all"
            >
              <Search className="h-3 w-3" />
              Consultar processo sem login
            </Link>
          </div>
        </div>

        {/* Consulta pública — mobile */}
        <div className="w-full max-w-sm bg-surface/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
            Consultar processos
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Número, interessado ou assunto"
                className="w-full rounded-lg border border-white/20 bg-surface pl-9 pr-3 py-2.5 text-xs text-ink-900 placeholder:text-ink-400 caret-info-600 outline-hidden transition-colors focus:border-brand-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="px-3 py-2.5 bg-brand-600 hover:bg-info-500 text-white rounded-lg transition-colors shrink-0"
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
            className="pointer-events-auto text-white/70 hover:text-violet-300 transition-colors"
          >
            JEOS SISTEMAS E ASSESSORIAS LTDA
          </a>
          <span className="mx-3 text-violet-400/70">•</span>
          V{__APP_VERSION__}
        </p>
      </div>
    </div>
  )
}

