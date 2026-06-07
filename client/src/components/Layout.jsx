import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  Home, Building2, LogOut, Menu, X, Inbox, BarChart3, Settings,
  Users, Package, Sun, Moon, ChevronRight, DollarSign, ScrollText,
  Lock, Landmark, ClipboardList, Archive,
} from 'lucide-react'
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
  const [nomeEntidade, setNomeEntidade] = useState('')
  const [moduloBloqueado, setModuloBloqueado] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showJAI, setShowJAI] = useState(true)
  const profileRef = useRef(null)

  // Atualiza o relógio a cada minuto (sem segundos)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    api.get('/organizacao/entidade')
      .then(r => setNomeEntidade(r.data?.entidade?.nome || ''))
      .catch(() => {})

    const handler = (e) => setNomeEntidade(e.detail?.nome || '')
    window.addEventListener('entidade-updated', handler)
    return () => window.removeEventListener('entidade-updated', handler)
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    const handle = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [profileOpen])

  useEffect(() => { setProfileOpen(false) }, [location.pathname])

  const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const fmtData = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })

  const handleLogout = () => {
    logout()
    navigate(`/${subdomain}/login`)
  }

  const modHabilitados = tenant?.configuracoes?.modulos_habilitados
  const isModuloHabilitado = (modulo) => {
    if (modHabilitados === undefined) return true
    return Array.isArray(modHabilitados) && modHabilitados.includes(modulo)
  }

  const temPermissao = (permissao) => {
    if (!permissao) return true
    if (user?.tipo === 'admin' || user?.tipo === 'jeos') return true
    return !!user?.permissoes?.[permissao]
  }

  const menuItems = [
    { path: `/${subdomain}`,              icon: Home,        label: 'Dashboard',    exact: true },
    { path: `/${subdomain}/processos`,    icon: Inbox,       label: 'Processos',    modulo: 'processos' },
    { path: `/${subdomain}/arquivo`,      icon: Archive,     label: 'Ger. de Arquivos', modulo: 'processos' },
    { path: `/${subdomain}/almoxarifado`, icon: Package,     label: 'Almoxarifado', modulo: 'almoxarifado', permissao: 'acessar_almoxarifado' },
    { path: `/${subdomain}/patrimonio`,   icon: Landmark,    label: 'Patrimônio',   modulo: 'patrimonio',   permissao: 'acessar_almoxarifado' },
    { path: `/${subdomain}/financeiro`,   icon: DollarSign,  label: 'Financeiro',   modulo: 'financeiro',   permissao: 'acessar_financeiro' },
    { path: `/${subdomain}/contratos`,    icon: ScrollText,  label: 'Contratos',    modulo: 'contratos',    permissao: 'acessar_contratos' },
  ]

  const adminMenuItems = [
    { path: `/${subdomain}/organizacao`,   icon: Building2,    label: 'Organização',   permissao: 'gerenciar_secretarias' },
    { path: `/${subdomain}/usuarios`,      icon: Users,        label: 'Usuários',      permissao: 'gerenciar_usuarios' },
    { path: `/${subdomain}/relatorios`,    icon: BarChart3,    label: 'Relatórios',    permissao: 'visualizar_relatorios' },
    { path: `/${subdomain}/configuracoes`, icon: Settings,     label: 'Configurações', permissao: 'gerenciar_configuracoes' },
    { path: `/${subdomain}/registros`,     icon: ClipboardList, label: 'Registros',   permissao: 'visualizar_registros' },
  ]

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const tipoLabel = {
    admin: 'Administrador',
    gestor: 'Gestor',
    operacional: 'Operacional',
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-200">

      {/* â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-slate-900
        border-r border-gray-200 dark:border-slate-700/50
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>

        {/* Logo */}
        <div className="h-[70px] px-5 flex items-center justify-between border-b border-gray-200 dark:border-slate-700/50 flex-shrink-0">
          {tenant?.configuracoes?.logo_sidebar
            ? <img src={tenant.configuracoes.logo_sidebar} alt="logo" className="h-9 object-contain" />
            : <img src="/logo_jprocesso.png" alt="jProcesso" className="h-9 object-contain dark:brightness-0 dark:invert" />
          }
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">

          {/* Menu principal */}
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">Principal</p>
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const active = isActive(item.path, item.exact)
              const Icon = item.icon
              const habilitado = item.modulo ? isModuloHabilitado(item.modulo) : true
              const permitido = temPermissao(item.permissao)

              if (!habilitado || !permitido) {
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => { setSidebarOpen(false); setModuloBloqueado({ label: item.label }) }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0 opacity-50" />
                      <span className="opacity-60">{item.label}</span>
                    </div>
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                  </button>
                )
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-slate-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-blue-500 dark:text-blue-400' : 'opacity-70'}`} />
                    <span>{item.label}</span>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-blue-400 dark:text-blue-500 flex-shrink-0" />}
                </Link>
              )
            })}
          </div>

          {/* Menu administração */}
          {(user?.tipo === 'admin' || user?.tipo === 'gestor') && (
            <div>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                Administração
              </p>
              <div className="space-y-0.5">
                {adminMenuItems.map((item) => {
                  const active = isActive(item.path)
                  const Icon = item.icon
                  if (!temPermissao(item.permissao)) return null
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${active
                          ? 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-slate-200'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-blue-500 dark:text-blue-400' : 'opacity-70'}`} />
                        <span>{item.label}</span>
                      </div>
                      {active && <ChevronRight className="h-3.5 w-3.5 text-blue-400 dark:text-blue-500 flex-shrink-0" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* â”€â”€â”€ Ãrea principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="lg:pl-[260px] flex flex-col min-h-screen">

        {/* Topbar */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700/50 sticky top-0 z-30 flex-shrink-0">
          <div className="px-4 sm:px-6">
            <div className="flex items-center h-[72px] gap-4">

              {/* Esquerda: hamburger + nome da entidade */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors flex-shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </button>
                {nomeEntidade && (
                  <span className="text-xs font-bold text-gray-600 dark:text-slate-300 truncate tracking-wide uppercase">
                    {nomeEntidade}
                  </span>
                )}
              </div>

              {/* Direita: tema + perfil colados */}
              <div ref={profileRef} className="ml-auto relative flex items-center gap-4 flex-shrink-0">

                {/* Botão tema */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-slate-700/50 hover:opacity-80 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="hidden sm:block leading-tight text-left">
                    <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                      {user?.nomeReduzido || user?.nome?.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      {tipoLabel[user?.tipo] || user?.tipo}
                    </p>
                  </div>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/50 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                    <div className="p-5 flex items-center gap-4 border-b border-gray-100 dark:border-slate-700/50">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-600 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                        {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{user?.nome}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                      </div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center justify-between px-5 py-2.5">
                        <span className="text-sm text-gray-700 dark:text-slate-300">Modo escuro</span>
                        <button
                          onClick={toggleTheme}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-500' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between px-5 py-2.5">
                        <span className="text-sm text-gray-700 dark:text-slate-300">{showJAI ? 'Ocultar Ayla IA' : 'Mostrar Ayla IA'}</span>
                        <button
                          onClick={() => setShowJAI(v => !v)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${showJAI ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-600'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showJAI ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-slate-700/50 py-2">
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout() }}
                        className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sair do sistema</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Assistente JAI */}
        {showJAI && <JAI />}

        {/* Rodapé fixo â€” marca + data/hora */}
        <footer className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700/50 px-4 py-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500">
            <a
              href="https://jeossistemas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              JEOS SISTEMAS E ASSESSORIAS LTDA
            </a>
            <span className="tabular-nums capitalize">
              {fmtData(now)} · {fmtHora(now)}
            </span>
          </div>
        </footer>
      </div>

      {/* â”€â”€â”€ Modal: MÃ³dulo Bloqueado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {moduloBloqueado && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={() => setModuloBloqueado(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-3">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Módulo não disponível</h2>
              <p className="text-red-100 text-sm mt-1">{moduloBloqueado.label}</p>
            </div>

            <div className="p-6 text-center space-y-4">
              <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
                O módulo <strong className="text-gray-900 dark:text-white">{moduloBloqueado.label}</strong> não está habilitado para o seu município.
              </p>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
                Para liberar o acesso, entre em contato com nosso comercial:
              </p>
              <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-slate-300">
                  <a href="tel:+5585999999999" className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">(85) 9 9999-9999</a>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-slate-300">
                  <a href="mailto:comercial@jeossistemas.com.br" className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">comercial@jeossistemas.com.br</a>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-slate-300">
                  <a href="https://jeossistemas.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">jeossistemas.com</a>
                </div>
              </div>
              <button
                onClick={() => setModuloBloqueado(null)}
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700/30 hover:bg-gray-200 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300 rounded-xl font-medium text-sm transition-colors"
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
