import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FileText, Home, Building2, LogOut, Menu, X, Search, Inbox, Send, FilePlus, BarChart3, Bell, User, Settings, Users, Package, Sun, Moon, ChevronRight, ChevronDown, DollarSign, ScrollText } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import JAI from './JAI'

export default function Layout() {
  const { user, tenant, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { subdomain } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [now, setNow] = useState(new Date())
  const [ipInfo, setIpInfo] = useState({ ip: '...', city: '...', region: '' })

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

  const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtData = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })

  const handleLogout = () => {
    logout()
    navigate(`/${subdomain}/login`)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/${subdomain}/processos?search=${searchTerm}`)
      setSearchTerm('')
    }
  }

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const menuItems = [
    { path: `/${subdomain}`,              icon: Home,       emoji: '🏠', label: 'Dashboard',     exact: true },
    { path: `/${subdomain}/almoxarifado`, icon: Package,    emoji: '📦', label: 'Almoxarifado' },
    { path: `/${subdomain}/financeiro`,   icon: DollarSign, emoji: '💵', label: 'Financeiro' },
    { path: `/${subdomain}/contratos`,    icon: ScrollText, emoji: '📝', label: 'Contratos' },
  ]

  const processosSubItems = [
    { path: `/${subdomain}/processos`,      emoji: '📥', label: 'Caixa de Entrada', badge: user?.processosNaCaixa || 0, exact: true },
    { path: `/${subdomain}/processos/novo`, emoji: '📄', label: 'Novo Processo' },
    { path: `/${subdomain}/enviados`,       emoji: '📤', label: 'Enviados' },
  ]

  const isProcessosActive = processosSubItems.some(i => isActive(i.path, i.exact))
  const [processosOpen, setProcessosOpen] = useState(isProcessosActive)

  useEffect(() => {
    if (isProcessosActive) setProcessosOpen(true)
  }, [location.pathname])

  const adminMenuItems = [
    { path: `/${subdomain}/secretarias`, icon: Building2, emoji: '🏛️', label: 'Organização' },
    { path: `/${subdomain}/usuarios`,    icon: Users,     emoji: '👥', label: 'Usuários' },
    { path: `/${subdomain}/relatorios`,  icon: BarChart3, emoji: '📊', label: 'Relatórios' },
    { path: `/${subdomain}/configuracoes`, icon: Settings, emoji: '⚙️', label: 'Configurações' },
  ]

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
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-md">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">jProcesso</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tenant?.nome || 'Sistema'}</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-2 overflow-hidden flex flex-col">
            <div className="space-y-0.5 mb-1">

              {/* Dashboard */}
              {menuItems.slice(0, 1).map((item) => {
                const active = isActive(item.path, item.exact)
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
                    {active && <ChevronRight className="h-3.5 w-3.5 text-blue-400 dark:text-blue-500" />}
                  </Link>
                )
              })}

              {/* Grupo: Processos */}
              <div>
                <button
                  onClick={() => setProcessosOpen(p => !p)}
                  className={`
                    w-full group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isProcessosActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base leading-none">📋</span>
                    <span>Processos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(user?.processosNaCaixa || 0) > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse-soft">
                        {user.processosNaCaixa}
                      </span>
                    )}
                    {processosOpen
                      ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                      : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    }
                  </div>
                </button>

                {processosOpen && (
                  <div className="mt-0.5 ml-3 pl-2.5 border-l-2 border-blue-100 dark:border-blue-900/40 space-y-0.5">
                    {processosSubItems.map((item) => {
                      const active = isActive(item.path, item.exact)
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            group flex items-center justify-between px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                            ${active
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                            }
                          `}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm leading-none">{item.emoji}</span>
                            <span>{item.label}</span>
                          </div>
                          {item.badge > 0
                            ? <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse-soft">{item.badge}</span>
                            : active && <ChevronRight className="h-3 w-3 text-blue-400 dark:text-blue-500" />
                          }
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Demais itens do menu */}
              {menuItems.slice(1).map((item) => {
                const active = isActive(item.path, item.exact)
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
                    {active && <ChevronRight className="h-3.5 w-3.5 text-blue-400 dark:text-blue-500" />}
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
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span className="text-base">{theme === 'dark' ? '🌙' : '☀️'}</span>
                <span className="text-xs font-medium">
                  {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </span>
              </div>
              <div className={`relative w-9 h-5 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* User info */}
            <div className="flex items-center space-x-2 px-1">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow">
                {user?.nome?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.nome}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{tipoLabel[user?.tipo] || user?.tipo}</p>
              </div>
            </div>

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
            <div className="flex items-center justify-between h-14 gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              <form onSubmit={handleSearch} className="flex-1 max-w-xl">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar processo, interessado..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </form>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* Desktop theme toggle */}
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
                  className="hidden lg:flex p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-yellow-500 dark:hover:text-yellow-300 transition-all"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                <button className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
                </button>

                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {user?.nome?.split(' ')[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-8">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-full animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Ayla — Assistente Inteligente */}
        <JAI />

        {/* Status bar */}
        <footer className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-100 dark:bg-gray-950 border-t border-gray-300 dark:border-gray-800 px-4 py-1.5 transition-colors duration-200">
          <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
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
    </div>
  )
}
