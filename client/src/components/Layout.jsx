import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FileText, Home, Building2, LogOut, Menu, X, Inbox, BarChart3, Settings, Users, Package, Sun, Moon, ChevronRight, DollarSign, ScrollText, Lock, Landmark } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import JAI from './JAI'
import api from '../services/api'

export default function Layout() {
  const { user, tenant, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { subdomain } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const [ipInfo, setIpInfo] = useState({ ip: '...', city: '...', region: '' })
  const [nomeEntidade, setNomeEntidade] = useState('')
  const [moduloBloqueado, setModuloBloqueado] = useState(null) // { label, emoji }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => setIpInfo({ ip: d.ip || '?', city: d.city || '?', region: d.region_code || '' }))
      .catch(() => setIpInfo({ ip: 'N/D', city: 'N/D', region: '' }))
  }, [])

  useEffect(() => {
    api.get('/organizacao/entidade')
      .then(r => setNomeEntidade(r.data?.entidade?.nome || ''))
      .catch(() => {})

    const handler = (e) => setNomeEntidade(e.detail?.nome || '')
    window.addEventListener('entidade-updated', handler)
    return () => window.removeEventListener('entidade-updated', handler)
  }, [])

  const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtData = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })

  const handleLogout = () => {
    logout()
    navigate(`/${subdomain}/login`)
  }

  const modHabilitados = tenant?.configuracoes?.modulos_habilitados
  const isModuloHabilitado = (modulo) => {
    // undefined = campo nunca foi configurado = tenant antigo = liberar tudo (backward compat)
    if (modHabilitados === undefined) return true
    // null ou [] = explicitamente sem módulos habilitados = bloquear
    return Array.isArray(modHabilitados) && modHabilitados.includes(modulo)
  }

  const menuItems = [
    { path: `/${subdomain}`,              icon: Home,      emoji: '🏠', label: 'Dashboard',   exact: true },
    { path: `/${subdomain}/processos`,    icon: Inbox,     emoji: '📋', label: 'Processos',    modulo: 'processos' },
    { path: `/${subdomain}/almoxarifado`, icon: Package,   emoji: '📦', label: 'Almoxarifado', modulo: 'almoxarifado' },
    { path: `/${subdomain}/patrimonio`,   icon: Landmark,  emoji: '🏛️', label: 'Patrimônio',   modulo: 'patrimonio' },
    { path: `/${subdomain}/financeiro`,   icon: DollarSign, emoji: '💵', label: 'Financeiro',   modulo: 'financeiro' },
    { path: `/${subdomain}/contratos`,    icon: ScrollText, emoji: '📝', label: 'Contratos',    modulo: 'contratos' },
  ]

  const adminMenuItems = [
    { path: `/${subdomain}/organizacao`, icon: Building2, emoji: '🏛️', label: 'Organização' },
    { path: `/${subdomain}/usuarios`,    icon: Users,     emoji: '👥', label: 'Usuários' },
    { path: `/${subdomain}/relatorios`,  icon: BarChart3, emoji: '📊', label: 'Relatórios' },
    { path: `/${subdomain}/configuracoes`, icon: Settings, emoji: '⚙️', label: 'Configurações' },
  ]

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const tipoLabel = {
    admin: '👑 Admin',
    gestor: '🎯 Gestor',
    operacional: '👤 Operacional',
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out flex flex-col pb-8
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full w-56">

          {/* Logo */}
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              {tenant?.configuracoes?.logo_sidebar
                ? <img src={tenant.configuracoes.logo_sidebar} alt="logo" className="h-12 w-full object-contain" />
                : <img src="/logo jprocesso sem fundo.png" alt="jProcesso" className="h-12 w-full object-contain" />
              }
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 ml-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-2 overflow-hidden flex flex-col">
            <div className="space-y-0.5 mb-1">
              {menuItems.map((item) => {
                const active = isActive(item.path, item.exact)
                const habilitado = item.modulo ? isModuloHabilitado(item.modulo) : true

                if (!habilitado) {
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => { setSidebarOpen(false); setModuloBloqueado({ label: item.label, emoji: item.emoji }) }}
                      className="w-full group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-base leading-none opacity-50">{item.emoji}</span>
                        <span className="opacity-60">{item.label}</span>
                      </div>
                      <Lock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                      ${active
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-base leading-none">{item.emoji}</span>
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse-soft">
                          {item.badge}
                        </span>
                      )}
                      {active && (
                        <ChevronRight className="h-3.5 w-3.5 text-blue-400 dark:text-blue-500" />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {(user?.tipo === 'admin' || user?.tipo === 'gestor') && (
              <div>
                <p className="px-2.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 mt-2">
                  ⚙️ Administração
                </p>
                <div className="space-y-0.5">
                  {adminMenuItems.map((item) => {
                    const active = isActive(item.path)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                          ${active
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-base leading-none">{item.emoji}</span>
                          <span>{item.label}</span>
                        </div>
                        {active && (
                          <ChevronRight className="h-3.5 w-3.5 text-purple-400 dark:text-purple-500" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* User footer */}
          <div className="px-2.5 py-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400 transition-all text-xs font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>🚪 Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-56 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-10 gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Logo do sistema — canto esquerdo da barra superior */}
              <img
                src="/logo jprocessos 2.png"
                alt="jProcesso"
                className="h-7 object-contain flex-shrink-0"
              />

              {nomeEntidade && (
                <span className="font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100 text-base truncate flex-1">
                  {nomeEntidade}
                </span>
              )}

              {/* Tema + Usuário */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-[11px] text-gray-600 dark:text-gray-300"
                >
                  <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                  <span className="hidden sm:inline">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                  <div className={`relative w-7 h-4 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${theme === 'dark' ? 'translate-x-3' : 'translate-x-0.5'}`} />
                  </div>
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="font-medium max-w-[100px] truncate">{user?.nomeReduzido || user?.nome?.split(' ')[0]}</span>
                  <span className="hidden md:inline text-gray-400 dark:text-gray-500">· {tipoLabel[user?.tipo] || user?.tipo}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-16">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-full animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Ayla — Assistente Inteligente */}
        <JAI />

        {/* Status bar */}
        <footer className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-100 dark:bg-gray-950 border-t border-gray-300 dark:border-gray-800 px-3 py-1 transition-colors duration-200">
          {/* Mobile: linha única compacta */}
          <div className="flex sm:hidden items-center justify-between gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <a
              href="https://jeossistemas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap"
            >
              <span>🏛️</span>
              <span>JEOS Sistemas</span>
            </a>
            <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
              <span>🕐</span>
              <span className="font-mono tabular-nums">{fmtHora(now)}</span>
            </div>
          </div>
          {/* Desktop: layout completo */}
          <div className="hidden sm:flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            {/* Esquerda: localização + IP */}
            <div className="flex items-center gap-2 min-w-0">
              <span title="Localização">📍</span>
              <span className="truncate text-gray-700 dark:text-gray-300">{ipInfo.city}{ipInfo.region ? ` · ${ipInfo.region}` : ''}</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span title="Endereço IP">🖥️</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{ipInfo.ip}</span>
            </div>
            {/* Centro: marca */}
            <div className="flex-shrink-0">
              <a
                href="https://jeossistemas.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-semibold whitespace-nowrap"
              >
                <span>🏛️</span>
                <span>JEOS Sistemas de Governo</span>
                <span className="text-gray-400 dark:text-gray-600 font-normal text-[10px]">↗</span>
              </a>
            </div>
            {/* Direita: hora e data */}
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span>🕐</span>
              <span className="font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmtHora(now)}</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>📅</span>
              <span className="text-gray-700 dark:text-gray-300 capitalize">{fmtData(now)}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal: Módulo Bloqueado */}
      {moduloBloqueado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setModuloBloqueado(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header vermelho */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-3">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Módulo não disponível</h2>
              <p className="text-red-100 text-sm mt-1">
                {moduloBloqueado.emoji} {moduloBloqueado.label}
              </p>
            </div>

            {/* Corpo */}
            <div className="p-6 text-center space-y-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                O módulo <strong className="text-gray-900 dark:text-white">{moduloBloqueado.label}</strong> não está habilitado para o seu município.
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Para liberar o acesso, entre em contato com nosso comercial:
              </p>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                  <span>📞</span>
                  <a href="tel:+5585999999999" className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">(85) 9 9999-9999</a>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                  <span>📧</span>
                  <a href="mailto:comercial@jeossistemas.com.br" className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">comercial@jeossistemas.com.br</a>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                  <span>🌐</span>
                  <a href="https://jeossistemas.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">jeossistemas.com</a>
                </div>
              </div>

              <button
                onClick={() => setModuloBloqueado(null)}
                className="w-full mt-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
