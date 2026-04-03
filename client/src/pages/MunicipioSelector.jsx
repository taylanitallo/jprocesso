import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

export default function MunicipioSelector() {
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMunicipio, setSelectedMunicipio] = useState('')
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Buscar municípios na montagem
  useEffect(() => {
    fetchMunicipios()
  }, [])

  const fetchMunicipios = async () => {
    try {
      console.log('Iniciando fetch de municípios...')
      console.log('URL da API:', import.meta.env.VITE_API_URL || '/api')
      const res = await api.get('/tenants')
      console.log('Resposta da API:', res.data)
      if (res.data.tenants && Array.isArray(res.data.tenants)) {
        // Filtrar apenas ativos e ordenar por nome
        const ativos = res.data.tenants.filter(t => t.ativo)
        const ordenados = ativos.sort((a, b) =>
          a.nome_municipio.localeCompare(b.nome_municipio)
        )
        console.log('Municípios carregados:', ordenados)
        setMunicipios(ordenados)
      }
    } catch (err) {
      console.error('Erro ao carregar municípios:', err)
      console.error('Detalhes do erro:', err.response?.data || err.message)
      setError('Erro ao carregar municípios. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (e) => {
    const subdomain = e.target.value
    setSelectedMunicipio(subdomain)
  }

  const handleEnter = () => {
    if (selectedMunicipio) {
      navigate(`/${selectedMunicipio}/login`)
    }
  }

  const handleAdminAccess = () => {
    navigate('/admin')
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden">
      <div
        className="relative overflow-x-hidden min-h-screen lg:h-full"
        style={{
          backgroundImage: "url('/tela de login.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(10, 20, 40, 0.70)' }}
        />

        {/* Botão de tema — canto superior direito */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-6 lg:py-0 lg:h-full lg:flex lg:flex-col lg:justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-10 items-start lg:items-center">
            {/* Left: Branding */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="mb-3 hidden sm:block">
                <img
                  src="/logo jprocessos 2.png"
                  alt="jProcesso"
                  className="h-20 sm:h-28 lg:h-40 object-contain mb-2"
                />
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-white font-semibold mb-3 tracking-wide uppercase text-xs">
                  ℹ️ Selecione seu Município
                </p>
                <p className="text-white/80 text-sm leading-relaxed">
                  Escolha abaixo o município em que você deseja acessar o jProcessos. Cada município possui seu próprio ambiente isolado com dados e usuários específicos.
                </p>
              </div>

              {/* Info Box */}
              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-lg px-3 py-2">
                  <span className="text-base">🏢</span>
                  <span className="text-xs text-gray-200 font-medium">Ambiente Multi-Tenant Isolado</span>
                </div>
                <div className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-lg px-3 py-2">
                  <span className="text-base">🔐</span>
                  <span className="text-xs text-gray-200 font-medium">Dados Completamente Isolados</span>
                </div>
              </div>
            </div>

            {/* Right: Seletor */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 animate-bounce-in">
                <div className="text-center mb-2">
                  <div className="text-3xl mb-1">🏛️</div>
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                    Acesso ao Sistema
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Escolha um município para continuar
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      🏙️ Município
                    </label>

                    {loading ? (
                      <div className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 text-center">
                        ⏳ Carregando municípios...
                      </div>
                    ) : municipios.length === 0 ? (
                      <div className="px-3 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm text-yellow-800 dark:text-yellow-300 text-center">
                        Nenhum município disponível
                      </div>
                    ) : (
                      <select
                        value={selectedMunicipio}
                        onChange={handleSelect}
                        className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition-all text-sm font-medium"
                      >
                        <option value="">-- Selecione um município --</option>
                        {municipios.map(municipio => (
                          <option key={municipio.id} value={municipio.subdominio}>
                            {municipio.nome_municipio} ({municipio.estado})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    onClick={handleEnter}
                    disabled={!selectedMunicipio || loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm"
                  >
                    {loading ? '⏳ Carregando...' : '🚀 Entrar no Sistema'}
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
                  <button
                    onClick={handleAdminAccess}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    🔧 Área de Administração
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="relative lg:absolute lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2 text-center pb-4 pt-2 text-xs text-white/40 whitespace-nowrap">
          🏢 © JEOS Sistemas de Governo
        </p>
      </div>
    </div>
  )
}
