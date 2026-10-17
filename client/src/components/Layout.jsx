import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { hasPerm, moduloHabilitado, podeAbrirOrganizacao, podeAbrirConfiguracoes, podeAbrirProcessos, podeAdministracao } from '../utils/permissions'
import {
  Home, Building2, LogOut, Menu, X, Inbox, BarChart3, Settings,
  Users, Package, Sun, Moon, ChevronRight, ChevronLeft, DollarSign, ScrollText,
  Lock, Landmark, ClipboardList, Archive, RefreshCw,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from 'react-query'
import JAI from './JAI'
import api, { apiUrl } from '../services/api'
import AvisoAssinatura from './assinatura/AvisoAssinatura'
import TrocarSenhaPrimeiroAcesso from './TrocarSenhaPrimeiroAcesso'

export default function Layout() {
  const { user, tenant, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { subdomain } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true')
  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)) }, [sidebarCollapsed])
  const [now, setNow] = useState(new Date())
  const [nomeEntidade, setNomeEntidade] = useState('')
  const [moduloBloqueado, setModuloBloqueado] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  // Ayla IA começa desligada; quem ligar no menu do perfil fica com ela ligada (por navegador)
  const [showJAI, setShowJAI] = useState(() => {
    try { return localStorage.getItem('aylaAtiva') === 'true' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('aylaAtiva', String(showJAI)) } catch { /* sem storage: só nesta sessão */ }
  }, [showJAI])
  const [geoLocation, setGeoLocation] = useState('')
  const [meuIp, setMeuIp] = useState('')
  const [atualizando, setAtualizando] = useState(false)

  // IP de onde o usuário acessa (o navegador não enxerga o IP da máquina; quem vê é o servidor)
  useEffect(() => {
    api.get('/auth/meu-ip', { _silent: true }).then(r => setMeuIp(r.data?.ip || '')).catch(() => {})
  }, [])

  // Atualizar sem sair do sistema:
  //  - se saiu versão nova do sistema, recarrega a página para carregá-la;
  //  - senão, só busca de novo os dados da tela atual (remonta a tela e invalida
  //    as consultas em cache), sem fechar e abrir a página.
  const queryClient = useQueryClient()
  const [versaoTela, setVersaoTela] = useState(0)
  const temVersaoNova = async () => {
    try {
      const atual = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src')
      const html = await (await fetch('/index.html', { cache: 'no-store' })).text()
      const m = html.match(/<script[^>]+type="module"[^>]+src="([^"]+\/assets\/[^"]+\.js)"/i)
        || html.match(/src="([^"]+\/assets\/[^"]+\.js)"/i)
      return !!(m && atual && m[1] !== atual)
    } catch {
      return false
    }
  }
  const atualizarSistema = async () => {
    setAtualizando(true)
    if (await temVersaoNova()) {
      if ('caches' in window) {
        const chaves = await caches.keys().catch(() => [])
        await Promise.all(chaves.map(k => caches.delete(k)))
      }
      window.location.reload()
      return
    }
    await queryClient.invalidateQueries()
    setVersaoTela(v => v + 1)
    setTimeout(() => setAtualizando(false), 600)
  }
  const profileRef = useRef(null)

  const BR_STATES = {
    'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA',
    'Ceará':'CE','Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO',
    'Maranhão':'MA','Mato Grosso':'MT','Mato Grosso do Sul':'MS','Minas Gerais':'MG',
    'Pará':'PA','Paraíba':'PB','Paraná':'PR','Pernambuco':'PE','Piauí':'PI',
    'Rio de Janeiro':'RJ','Rio Grande do Norte':'RN','Rio Grande do Sul':'RS',
    'Rondônia':'RO','Roraima':'RR','Santa Catarina':'SC','São Paulo':'SP',
    'Sergipe':'SE','Tocantins':'TO',
  }

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=pt-BR`
        )
        const data = await res.json()
        const city = data.address?.city || data.address?.town || data.address?.municipality || data.address?.village || ''
        const stateFull = data.address?.state || ''
        const stateCode = BR_STATES[stateFull] || stateFull.slice(0, 2).toUpperCase()
        if (city) setGeoLocation(`${city}-${stateCode}`)
      } catch {}
    }, () => {})
  }, [])

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
  }

  const isModuloHabilitado = (modulo) => moduloHabilitado(tenant, modulo)
  // Módulo bloqueado (não contratado ou sem permissão) aparece cinza só para administradores;
  // gestores e operacionais nem veem o item no menu.
  const ehAdministrador = user?.tipo === 'admin' || user?.tipo === 'jeos'

  // Cores do menu lateral vêm dos tokens --color-sidebar-* (o tema do município
  // decide se o menu é claro ou colorido — ver utils/tema.js)
  const clsItem = 'text-sidebar-texto hover:bg-sidebar-hover'
  const clsAtivo = 'bg-sidebar-ativo text-sidebar-ativo-texto shadow-xs'
  const clsIconeAtivo = 'text-sidebar-ativo-texto'
  const clsSetaAtiva = 'text-sidebar-ativo-texto opacity-80'

  const temPermissao = (permissao) => {
    if (!permissao) return true
    const path = Array.isArray(permissao) ? permissao : permissao.split('.')
    return hasPerm(user, ...path)
  }

  const temAlgumaPermissao = (lista) => lista.some(p => hasPerm(user, ...p.split('.')))

  const menuItems = [
    { path: `/${subdomain}`,              icon: Home,        label: 'Dashboard',        exact: true },
    { path: `/${subdomain}/processos`,    icon: Inbox,       label: 'Processos',        modulo: 'processos',    permitido: () => podeAbrirProcessos(user) },
    { path: `/${subdomain}/arquivo`,      icon: Archive,     label: 'Ger. de Arquivos', modulo: 'processos',    permissao: 'arquivo.acessar' },
    { path: `/${subdomain}/almoxarifado`, icon: Package,     label: 'Almoxarifado',     modulo: 'almoxarifado', permissao: 'almoxarifado.acessar' },
    { path: `/${subdomain}/patrimonio`,   icon: Landmark,    label: 'Patrimônio',       modulo: 'patrimonio',   permissao: 'patrimonio.acessar' },
    { path: `/${subdomain}/financeiro`,   icon: DollarSign,  label: 'Financeiro',       modulo: 'financeiro',   permissao: 'financeiro.acessar' },
    { path: `/${subdomain}/contratos`,    icon: ScrollText,  label: 'Contratos',        modulo: 'contratos',    permissao: 'contratos.acessar' },
    { path: `/${subdomain}/tesouraria`,   icon: Landmark,    label: 'Tesouraria',       modulo: 'tesouraria',   permissao: 'tesouraria.acessar' },
  ]

  const adminMenuItems = [
    { path: `/${subdomain}/organizacao`,   icon: Building2,    label: 'Organização',   permitido: () => podeAbrirOrganizacao(user) },
    { path: `/${subdomain}/relatorios`,    icon: BarChart3,    label: 'Relatórios',    permitido: () => podeAdministracao(user, 'visualizar_relatorios') },
    { path: `/${subdomain}/configuracoes`, icon: Settings,     label: 'Configurações', permitido: () => podeAbrirConfiguracoes(user) },
    { path: `/${subdomain}/registros`,     icon: ClipboardList, label: 'Registros',   permitido: () => podeAdministracao(user, 'visualizar_registros') },
  ]

  const visibleAdminMenuItems = adminMenuItems.filter((item) => (
    item.permitido ? item.permitido() : item.permissaoAny ? temAlgumaPermissao(item.permissaoAny) : temPermissao(item.permissao)
  ))

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const currentPage = [...menuItems, ...adminMenuItems].find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  )?.label || ''

  const tipoLabel = {
    admin: 'Administrador',
    gestor: 'Gestor',
    operacional: 'Operacional',
  }

  return (
    <div className="min-h-screen w-full bg-canvas transition-colors duration-200">

      {/* â"€â"€â"€ Sidebar â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <aside className={`
        fixed top-0 bottom-8 left-0 z-50 w-[264px] bg-sidebar
        border-r border-sidebar-borda
        flex flex-col transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[264px]'}
      `}>

        {/* Botão recolher/expandir — somente desktop */}
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          className="hidden lg:flex absolute -right-3 top-12 z-10 w-6 h-6 items-center justify-center rounded-full
            bg-surface border border-ink-200 shadow-md
            text-ink-500 hover:text-brand-600 dark:hover:text-info-400 hover:border-info-300
            transition-colors"
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Logo */}
        <div className={`h-12 px-4 flex items-center justify-between border-b border-ink-200 shrink-0 overflow-hidden bg-sidebar-logo`}>
          {!sidebarCollapsed && (
            tenant?.configuracoes?.logo_interna_url && tenant?.subdominio
              ? <img src={apiUrl(`/tenants/${tenant.subdominio}/logo/interna`)} alt="logo" className="max-h-9 w-auto max-w-full object-contain" />
              /*
               * A arte tem "Processo" e o subtítulo em branco — foi desenhada
               * para fundo escuro e sumia no tema claro. `brightness-0` achata
               * tudo em preto (legível no claro) e o `dark:invert` devolve o
               * branco no escuro, mantendo o comportamento que já existia lá.
               */
              : <img src="/logo_jprocesso_trim.png" alt="jProcesso" className="h-9 w-auto max-w-full object-contain brightness-0 dark:invert" />
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-[8px] text-ink-400 hover:text-ink-600 hover:bg-ink-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-[1mm] py-4 overflow-y-auto space-y-4">

          {/* Menu principal */}
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const active = isActive(item.path, item.exact)
              const Icon = item.icon
              const habilitado = item.modulo ? isModuloHabilitado(item.modulo) : true
              const permitido = item.permitido ? item.permitido() : temPermissao(item.permissao)

              if (!habilitado || !permitido) {
                if (!ehAdministrador) return null
                return (
                  <button
                    key={item.path}
                    type="button"
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => { setSidebarOpen(false); setModuloBloqueado({ label: item.label, semPermissao: habilitado }) }}
                    className={`w-full flex items-center px-3 py-2.5 rounded-[10px] text-sm font-semibold text-sidebar-fraco hover:bg-sidebar-hover ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 opacity-50" />
                      <span className={`opacity-60 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                    </div>
                    <Lock className={`h-3.5 w-3.5 shrink-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />
                  </button>
                )
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2.5 rounded-[10px] text-sm font-semibold transition-colors
                    ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'}
                    ${active
                      ? clsAtivo
                      : clsItem
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${active ? clsIconeAtivo : 'opacity-70'}`} />
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </div>
                  {active && <ChevronRight className={`h-3.5 w-3.5 ${clsSetaAtiva} shrink-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />}
                </Link>
              )
            })}
          </div>

          {/* Menu administração */}
          {visibleAdminMenuItems.length > 0 && (
            <div>
              <p className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-fraco ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                Administração
              </p>
              <div className="space-y-0.5">
                {visibleAdminMenuItems.map((item) => {
                  const active = isActive(item.path)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center px-3 py-2.5 rounded-[10px] text-sm font-semibold transition-colors
                        ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'}
                        ${active
                          ? clsAtivo
                          : clsItem
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 shrink-0 ${active ? clsIconeAtivo : 'opacity-70'}`} />
                        <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                      </div>
                      {active && <ChevronRight className={`h-3.5 w-3.5 ${clsSetaAtiva} shrink-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />}
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
          className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* â"€â"€â"€ Ãrea principal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className={`flex flex-col min-h-screen pb-8 transition-[padding] duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'}`}>

        {/* Topbar */}
        <header className="bg-surface/90 backdrop-blur border-b border-ink-200 sticky top-0 z-30 shrink-0">
          <div className="px-4 sm:px-6">
            <div className="flex items-center h-12 gap-4">

              {/* Esquerda: hamburger + nome da entidade */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </button>
                {nomeEntidade && (
                  <span className="text-xs font-bold text-ink-600 truncate tracking-wide uppercase">
                    {nomeEntidade}
                  </span>
                )}
              </div>

              {/* Direita: tema + perfil colados */}
              <div ref={profileRef} className="ml-auto relative flex items-center gap-4 shrink-0">

                {/* Atualizar o sistema (sem sair, sem F5) */}
                <button
                  onClick={atualizarSistema}
                  disabled={atualizando}
                  className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors shrink-0 disabled:opacity-60"
                  title="Atualizar (busca os dados de novo; se houver versão nova do sistema, carrega)"
                >
                  <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
                </button>

                {/* Botão tema */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors shrink-0"
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center gap-2.5 pl-3 border-l border-ink-200 hover:opacity-80 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-info-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="hidden sm:block leading-tight text-left">
                    <p className="text-xs font-semibold text-ink-800">
                      {user?.nomeReduzido || user?.nome?.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-ink-400">
                      {tipoLabel[user?.tipo] || user?.tipo}
                    </p>
                  </div>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-3 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-surface border border-ink-200 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                    <div className="p-5 flex items-center gap-4 border-b border-ink-100">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-info-500 to-violet-600 flex items-center justify-center text-white text-base font-bold shrink-0">
                        {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900 truncate">{user?.nome}</p>
                        <p className="text-xs text-ink-400 truncate mt-0.5">{user?.email}</p>
                      </div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center justify-between px-5 py-2.5">
                        <span className="text-sm text-ink-700">Modo escuro</span>
                        <button
                          onClick={toggleTheme}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-info-500' : 'bg-ink-200'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between px-5 py-2.5">
                        <span className="text-sm text-ink-700">{showJAI ? 'Ocultar Ayla IA' : 'Mostrar Ayla IA'}</span>
                        <button
                          onClick={() => setShowJAI(v => !v)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showJAI ? 'bg-info-500' : 'bg-ink-200'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow-sm transition-transform ${showJAI ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-ink-100 py-2">
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout() }}
                        className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
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
          <div className="px-3 py-4 sm:px-4 lg:px-6 max-w-[1600px] mx-auto animate-fade-in">
            {/* Primeiro acesso: só a troca de senha até ela ser feita */}
            {user?.trocarSenha ? <TrocarSenhaPrimeiroAcesso /> : (
              <>
                <AvisoAssinatura />
                {/* key: o botão Atualizar remonta a tela para buscar os dados de novo */}
                <Outlet key={versaoTela} />
              </>
            )}
          </div>
        </main>

        {/* Assistente JAI */}
        {showJAI && !user?.trocarSenha && <JAI />}

      </div>

      {/* Rodapé fixo â€" largura total, sobre sidebar e conteúdo */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 h-8 flex items-center bg-surface border-t border-ink-200 px-3 sm:px-4">
        {/* Mobile: só nome do sistema + hora */}
        <div className="sm:hidden w-full flex items-center justify-between text-[10px] text-ink-400">
          <span className="font-medium text-ink-500 truncate">JEOS Sistema de Governo · V{__APP_VERSION__}</span>
          <span className="tabular-nums shrink-0 ml-2">{fmtHora(now)}</span>
        </div>
        {/* Desktop: 3 colunas */}
        <div className="hidden sm:grid w-full grid-cols-3 items-center text-[11px] text-ink-400">
          <span className="flex items-center gap-1 truncate">
            {geoLocation ? <>📍 {geoLocation}</> : <span className="opacity-40">localizando...</span>}
            {meuIp && <span className="ml-2 tabular-nums" title="IP de onde você está acessando">· IP {meuIp}</span>}
          </span>
          <span className="text-center font-medium text-ink-500 whitespace-nowrap">
            JEOS Sistema de Governo &copy; <span className="ml-1 font-normal text-ink-400 tabular-nums">· V{__APP_VERSION__}</span>
          </span>
          <span className="text-right tabular-nums capitalize">
            {fmtData(now)} &middot; {fmtHora(now)}
          </span>
        </div>
      </footer>

      {/* â"€â"€â"€ Modal: MÃ³dulo Bloqueado â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {moduloBloqueado && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={() => setModuloBloqueado(null)}
        >
          <div
            className="bg-surface rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-danger-500 to-danger-600 p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-surface/20 rounded-full mb-3">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Módulo não disponível</h2>
              <p className="text-danger-100 text-sm mt-1">{moduloBloqueado.label}</p>
            </div>

            {moduloBloqueado.semPermissao ? (
            <div className="p-6 text-center space-y-4">
              <p className="text-ink-700 text-sm leading-relaxed">
                O módulo <strong className="text-ink-900 dark:text-white">{moduloBloqueado.label}</strong> está desligado nas suas permissões de usuário.
              </p>
              <p className="text-ink-500 text-sm">
                Para liberar, peça a um administrador que ligue o acesso em Organização › Usuários › Permissões.
              </p>
              <button
                onClick={() => setModuloBloqueado(null)}
                className="w-full px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-medium text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
            ) : (
            <div className="p-6 text-center space-y-4">
              <p className="text-ink-700 text-sm leading-relaxed">
                O módulo <strong className="text-ink-900 dark:text-white">{moduloBloqueado.label}</strong> não está habilitado para o seu município.
              </p>
              <p className="text-ink-500 text-sm">
                Para liberar o acesso, entre em contato com nosso comercial:
              </p>
              <div className="bg-ink-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-ink-700">
                  <a href="tel:+5585999999999" className="font-medium hover:text-brand-600 dark:hover:text-info-400 transition-colors">(85) 9 9999-9999</a>
                </div>
                <div className="flex items-center justify-center gap-2 text-ink-700">
                  <a href="mailto:comercial@jeossistemas.com.br" className="font-medium hover:text-brand-600 dark:hover:text-info-400 transition-colors">comercial@jeossistemas.com.br</a>
                </div>
                <div className="flex items-center justify-center gap-2 text-ink-700">
                  <a href="https://jeossistemas.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand-600 dark:hover:text-info-400 transition-colors">jeossistemas.com</a>
                </div>
              </div>
              <button
                onClick={() => setModuloBloqueado(null)}
                className="w-full px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-medium text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
