// Moldura das páginas públicas do município (Consulta, Verificar documento, Legislação):
// fundo, cabeçalho com navegação e rodapé — mesmo visual em todas
import { Link, NavLink } from 'react-router-dom'
import { LogIn, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export function usePaletaPublica() {
  const { isDark } = useTheme()
  const mc = !isDark
  return {
    mc,
    bgCard:    mc ? 'rgba(255,255,255,0.97)' : 'rgba(8,12,30,0.88)',
    bdCard:    mc ? 'border-ink-200'         : 'border-ink-200/60',
    bdHdr:     mc ? 'border-ink-200/80'      : 'border-ink-200/50',
    bgCardHdr: mc ? 'rgba(139,92,246,0.05)'  : 'rgba(139,92,246,0.07)',
    txt1:      mc ? 'text-ink-900'           : 'text-white',
    txt2:      mc ? 'text-ink-700'           : 'text-ink-400',
    txt3:      'text-ink-500',
    txtV:      mc ? 'text-violet-700'        : 'text-violet-300',
  }
}

// Card com cabeçalho no padrão da consulta pública (ícone + título violeta em caixa alta)
export function CardPublico({ icon: Icon, titulo, extra, children, className = '' }) {
  const p = usePaletaPublica()
  return (
    <div className={`rounded-2xl border ${p.bdCard} overflow-hidden transition-colors duration-300 ${className}`}
      style={{ background: p.bgCard, backdropFilter: 'blur(20px)' }}>
      {titulo && (
        <div className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b ${p.bdHdr}`} style={{ background: p.bgCardHdr }}>
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className={`h-4 w-4 shrink-0 ${p.txtV}`} />}
            <span className={`text-xs font-bold ${p.txtV} uppercase tracking-widest truncate`}>{titulo}</span>
          </div>
          {extra}
        </div>
      )}
      {children}
    </div>
  )
}

export default function LayoutPublico({ subdomain, children }) {
  const { isDark, toggleTheme } = useTheme()
  const mc = !isDark
  const hdrBg = mc ? 'rgba(255,255,255,0.96)' : 'rgba(5,8,22,0.9)'
  const ftrBg = mc ? 'rgba(248,250,252,0.95)' : 'rgba(6,10,26,0.9)'
  const bdPg  = mc ? 'border-ink-200/80' : 'border-white/[0.08]'
  const overlayClass = mc ? 'bg-surface/80' : 'bg-[#050816]/75'
  const txtNav = mc ? 'text-ink-600 hover:text-ink-900' : 'text-white/55 hover:text-white/90'
  const txtNavAtivo = mc ? 'text-violet-700' : 'text-violet-300'
  const navCls = ({ isActive }) => `${isActive ? txtNavAtivo : txtNav} transition-colors`

  return (
    <div
      className="relative h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay adaptável ao tema */}
      <div className={`absolute inset-0 ${overlayClass} pointer-events-none transition-colors duration-300`} />

      {/* ── HEADER ── */}
      <header
        className={`no-print relative z-20 shrink-0 backdrop-blur-xl border-b ${bdPg} transition-colors duration-300`}
        style={{ background: hdrBg }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to={`/${subdomain}/login`} className="shrink-0">
            <img
              src={mc ? '/logo_dark.png' : '/logo_jprocesso.png'}
              alt="jProcesso"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[11px] font-semibold tracking-widest uppercase">
            <NavLink to={`/${subdomain}/login`} end className={navCls}>Início</NavLink>
            <NavLink to={`/${subdomain}/consulta`} className={navCls}>Consultar processo</NavLink>
            <NavLink to={`/${subdomain}/verificar`} className={navCls}>Verificar documento</NavLink>
            <NavLink to={`/${subdomain}/legislacao`} className={navCls}>Legislações</NavLink>
            <Link
              to={`/${subdomain}/login`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-600/30 transition-all text-[11px]"
            >
              <LogIn className="h-3.5 w-3.5" />
              Acesso Restrito
            </Link>

            {/* Toggle modo claro/escuro */}
            <button
              onClick={toggleTheme}
              title={mc ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                mc
                  ? 'bg-ink-100 border-ink-300 text-ink-600 hover:bg-ink-200'
                  : 'bg-surface/8 border-white/20 text-white/60 hover:bg-surface/15 hover:text-white/90'
              }`}
            >
              {mc ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {mc ? 'Escuro' : 'Claro'}
            </button>
          </nav>

          {/* Mobile: botões */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={mc ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
              className={`p-2 rounded-lg border transition-all ${
                mc ? 'bg-ink-100 border-ink-300 text-ink-600' : 'bg-surface/8 border-white/20 text-white/60'
              }`}
            >
              {mc ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <Link
              to={`/${subdomain}/login`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-semibold"
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </Link>
          </div>
        </div>

        {/* Mobile: navegação entre as páginas públicas */}
        <nav className={`md:hidden flex items-center gap-5 overflow-x-auto px-4 pb-2.5 text-[11px] font-semibold tracking-widest uppercase whitespace-nowrap`}>
          <NavLink to={`/${subdomain}/consulta`} className={navCls}>Consultar</NavLink>
          <NavLink to={`/${subdomain}/verificar`} className={navCls}>Verificar</NavLink>
          <NavLink to={`/${subdomain}/legislacao`} className={navCls}>Legislações</NavLink>
        </nav>
      </header>

      {children}

      {/* ── FOOTER ── */}
      <footer
        className={`no-print relative z-20 shrink-0 backdrop-blur-xl border-t ${bdPg} transition-colors duration-300`}
        style={{ background: ftrBg }}
      >
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center">
          <p className={`text-[11px] font-medium tracking-[0.16em] ${mc ? 'text-ink-400' : 'text-ink-500'} uppercase text-center`}>
            © 2026{' '}
            <a href="https://jeossistemas.com" target="_blank" rel="noopener noreferrer" className="hover:text-violet-500 transition-colors">
              JEOS SISTEMAS E ASSESSORIA LTDA
            </a>
            <span className="mx-2 text-violet-500/50">•</span>
            V{__APP_VERSION__}
          </p>
        </div>
      </footer>
    </div>
  )
}
