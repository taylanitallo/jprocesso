import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, ArrowLeft } from 'lucide-react'
import api from '../services/api'

// Tela inicial do sistema — descobre o município pelo e-mail (em vez de exigir
// que o usuário já saiba o subdomínio) e então encaminha para o login normal
// (/{subdominio}/login, CPF + senha) daquele município.
export default function MunicipioSelector() {
  const [step, setStep] = useState('email') // 'email' | 'lista'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [municipios, setMunicipios] = useState([])
  const [busca, setBusca] = useState('')

  const navigate = useNavigate()

  const handleBuscarEmail = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/buscar-municipios', { email: email.trim() })
      const encontrados = data.municipios || []

      if (encontrados.length === 0) {
        setError('Não encontramos uma conta com este e-mail.')
      } else if (encontrados.length === 1) {
        navigate(`/${encontrados[0].subdominio}/login`)
      } else {
        setMunicipios(encontrados)
        setStep('lista')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao buscar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const municipiosFiltrados = municipios.filter(m =>
    m.nome_municipio.toLowerCase().includes(busca.toLowerCase()) ||
    (m.cidade && m.cidade.toLowerCase().includes(busca.toLowerCase()))
  )

  const logoUrl = (m) => {
    if (!m) return null
    return (
      ((m.configuracoes?.logo_login_url || m.configuracoes?.logo_interna_url) && m.subdominio
        ? `/api/tenants/${m.subdominio}/logo/${m.configuracoes?.logo_login_url ? 'login' : 'interna'}`
        : null) ||
      m.configuracoes?.logo_url ||
      m.configuracoes?.brasao_url ||
      m.configuracoes?.imagem_url ||
      null
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "url('/background_geral.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100svh',
      }}
    >
      <div className="absolute inset-0 bg-[#050b18]/70" />

      <div
        className="relative flex-1 flex flex-col items-center justify-center lg:items-end lg:justify-center px-4 sm:px-8 lg:px-8 py-8 lg:py-10 w-full"
        style={{ maxWidth: '1152px', margin: '0 auto' }}
      >
        <div
          className="w-full max-w-md flex-shrink-0 rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
          style={{
            background: 'rgba(10, 8, 28, 0.80)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(139, 92, 246, 0.30)',
            boxShadow: '0 0 60px rgba(139, 92, 246, 0.12), 0 0 120px rgba(139, 92, 246, 0.06), 0 30px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* ── Passo 1: e-mail ── */}
          {step === 'email' && (
            <>
              <p className="text-white/80 text-sm text-center">
                Informe seu e-mail para acessar o sistema
              </p>

              {error && (
                <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleBuscarEmail} className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="email"
                    autoFocus
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.60)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
                    required
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 20px rgba(139,92,246,0.35)' }}
                >
                  {loading ? 'Buscando...' : 'Continuar'}
                </button>
              </form>
            </>
          )}

          {/* ── Passo 2: lista de municípios (múltiplos resultados) ── */}
          {step === 'lista' && (
            <>
              <p className="text-white/80 text-sm text-center">
                Encontramos mais de um órgão para este e-mail. Selecione um:
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pesquisar órgão..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.60)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
                />
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto pr-0.5" style={{ maxHeight: 'min(380px, 40svh)' }}>
                {municipiosFiltrados.length === 0 && (
                  <p className="text-white/40 text-xs text-center py-4">Nenhum órgão encontrado.</p>
                )}

                {municipiosFiltrados.map(m => (
                  <div
                    key={m.subdominio}
                    className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-150 cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(139,92,246,0.12)'
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.40)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    }}
                    onClick={() => navigate(`/${m.subdominio}/login`)}
                  >
                    <div
                      className="flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center overflow-hidden"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.30)' }}
                    >
                      {logoUrl(m) ? (
                        <img src={logoUrl(m)} alt={m.nome_municipio} className="w-full h-full object-contain p-1.5" />
                      ) : (
                        <Building2 className="h-6 w-6 text-violet-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold leading-tight" style={{ wordBreak: 'break-word' }}>
                        {m.nome_municipio}
                      </p>
                      <p className="text-white/35 text-xs mt-0.5">
                        {m.cidade ? `${m.cidade}/${m.estado}` : m.estado}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); setMunicipios([]); setBusca('') }}
                className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-violet-300 transition-all self-center"
              >
                <ArrowLeft className="h-3 w-3" />
                Usar outro e-mail
              </button>
            </>
          )}
        </div>

        <p className="text-white/20 text-xs mt-4 text-center w-full max-w-md">
          © 2026&nbsp;&nbsp;JEOS SISTEMAS E ASSESSORIAS LTDA&nbsp;&nbsp;•&nbsp;&nbsp;V{__APP_VERSION__}
        </p>
      </div>
    </div>
  )
}
