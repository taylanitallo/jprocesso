import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, Settings } from 'lucide-react'
import api from '../services/api'

export default function MunicipioSelector() {
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busca, setBusca] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchMunicipios()
  }, [])

  const fetchMunicipios = async () => {
    try {
      const res = await api.get('/tenants')
      if (res.data.tenants && Array.isArray(res.data.tenants)) {
        const ativos = res.data.tenants.filter(t => t.ativo)
        const ordenados = ativos.sort((a, b) =>
          a.nome_municipio.localeCompare(b.nome_municipio)
        )
        setMunicipios(ordenados)
      }
    } catch (err) {
      setError('Erro ao carregar órgãos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleAcessar = (subdominio) => {
    navigate(`/${subdominio}/login`)
  }

  const handleAdminAccess = () => {
    navigate('/admin')
  }

  const municipiosFiltrados = municipios.filter(m =>
    m.nome_municipio.toLowerCase().includes(busca.toLowerCase()) ||
    (m.cidade && m.cidade.toLowerCase().includes(busca.toLowerCase()))
  )

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "url('/background_geral.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* overlay escuro */}
      <div className="absolute inset-0 bg-[#050b18]/70" />

      {/* conteúdo principal */}
      <div className="relative flex-1 flex flex-col lg:flex-row items-center justify-center min-h-screen px-6 py-10 gap-12 max-w-6xl mx-auto w-full">

        {/* ── Coluna esquerda — Branding ── */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:flex-1 gap-6">
          <img
            src="/logo_jprocesso.png"
            alt="jProcesso"
            className="w-64 sm:w-80 lg:w-96 object-contain drop-shadow-[0_0_32px_rgba(139,92,246,0.5)]"
          />

          <div>
            <p className="mt-1 text-white/60 text-base sm:text-lg font-medium tracking-widest uppercase">
              Sistema de Tramitação Digital
            </p>
            <div
              className="mt-2 h-px w-16 mx-auto lg:mx-0 rounded"
              style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899)' }}
            />
            <p className="mt-4 text-white/55 text-sm sm:text-base max-w-sm leading-relaxed">
              Tecnologia inteligente para uma{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #a78bfa, #f472b6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                gestão pública
              </span>{' '}
              mais eficiente.
            </p>
          </div>

          <div className="hidden lg:flex flex-col gap-2.5 mt-2">
            {[
              { color: '#8b5cf6', label: 'Ambiente Multi-Tenant Isolado' },
              { color: '#34d399', label: 'Dados Completamente Isolados' },
              { color: '#60a5fa', label: 'Infraestrutura em Nuvem' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2.5 text-white/50 text-xs">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Coluna direita — Card de seleção ── */}
        <div
          className="w-full max-w-sm lg:flex-shrink-0 rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
          style={{
            background: 'rgba(10, 8, 28, 0.80)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(139, 92, 246, 0.30)',
            boxShadow: '0 0 60px rgba(139, 92, 246, 0.12), 0 0 120px rgba(139, 92, 246, 0.06), 0 30px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* cabeçalho card */}
          <p className="text-white/80 text-sm text-center">
            Selecione seu órgão para acessar o sistema
          </p>

          {/* campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar órgão..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.60)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
            />
          </div>

          {/* lista de órgãos */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
            {error && (
              <p className="text-red-400 text-xs text-center py-3">{error}</p>
            )}

            {loading && (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-14 rounded-xl animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
                ))}
              </div>
            )}

            {!loading && !error && municipiosFiltrados.length === 0 && (
              <p className="text-white/40 text-xs text-center py-4">
                {busca ? 'Nenhum órgão encontrado.' : 'Nenhum órgão disponível.'}
              </p>
            )}

            {!loading && municipiosFiltrados.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.12)'
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.40)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                }}
                onClick={() => handleAcessar(m.subdominio)}
              >
                {/* ícone */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(139,92,246,0.18)',
                    border: '1px solid rgba(139,92,246,0.30)',
                  }}
                >
                  <Building2 className="h-4 w-4 text-violet-400" />
                </div>

                {/* nome + subdomínio */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate leading-tight">
                    {m.nome_municipio}
                  </p>
                  <p className="text-white/35 text-xs mt-0.5 truncate">
                    /{m.subdominio}
                  </p>
                </div>

                {/* botão ACESSAR */}
                <button
                  onClick={e => { e.stopPropagation(); handleAcessar(m.subdominio) }}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    boxShadow: '0 0 12px rgba(139,92,246,0.35)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(139,92,246,0.55)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(139,92,246,0.35)'
                  }}
                >
                  ACESSAR
                </button>
              </div>
            ))}
          </div>

          {/* rodapé card */}
          <div className="pt-1 border-t border-white/[0.07] text-center">
            <button
              onClick={handleAdminAccess}
              className="inline-flex items-center gap-1.5 text-xs text-white/25 hover:text-violet-400 transition-colors"
            >
              <Settings className="h-3 w-3" />
              Área de Administração
            </button>
          </div>
        </div>
      </div>

      {/* copyright */}
      <div className="relative text-center pb-4 text-xs text-white/20">
        © 2026&nbsp;&nbsp;JEOS SISTEMAS E ASSESSORIAS LTDA&nbsp;&nbsp;•&nbsp;&nbsp;V1.0.0
      </div>
    </div>
  )
}
