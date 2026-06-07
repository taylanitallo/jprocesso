import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileText, ShoppingBag, User, BarChart2, ClipboardList } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
export const TABS = [
  { key: 'itens',      label: 'Itens',                   icon: ShoppingBag,   emoji: '📦' },
  { key: 'credor',     label: 'Credores',                icon: User,          emoji: '🏢' },
  { key: 'contratos',  label: 'Contratos',               icon: FileText,      emoji: '📋' },
  { key: 'ordens',     label: 'Ordem de Compra/Serviço', icon: ClipboardList, emoji: '🛒' },
  { key: 'relatorios', label: 'Relatórios',              icon: BarChart2,     emoji: '📊' },
]

export const UNIDADES      = ['UNIDADE','MÊS','SERVIÇO','SERVIÇOS','CONJUNTO','KG','LITRO','METRO','HORA','DIA','PACOTE','RESMA','CAIXA','PAR','AMPOLA','COMPRIMIDO','FRASCO']
export const CATEGORIAS    = ['COMPRAS','SERVIÇOS']
export const STATUS_ITEM   = ['ATIVO','INATIVO']
export const ESTADOS_BR    = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
export const MODALIDADES   = ['Pregão Eletrônico','Pregão Presencial','Concorrência','Tomada de Preços','Convite','Dispensa','Inexigibilidade','RDC','Concurso','Leilão']
export const TIPOS_OBJETO  = ['Material','Serviço','Obra','Locação de Imóveis','Locação de Veículos','Consultoria','Tecnologia da Informação','Manutenção','Outros']

// ── Helpers ───────────────────────────────────────────────────────────────────
export function proximoCodigo(itens) {
  if (!itens || itens.length === 0) return '00001'
  const max = itens.reduce((m, item) => {
    const n = parseInt(item.codigo) || 0
    return n > m ? n : m
  }, 0)
  return String(max + 1).padStart(5, '0')
}

// ── UI Primitives ─────────────────────────────────────────────────────────────
export function FieldRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 min-h-[34px]">
      <span className="w-36 shrink-0 text-sm text-right text-gray-600 dark:text-slate-400">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export function SectionTitle({ children }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-700 px-4 py-1.5 -mx-6 text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide border-y border-gray-200 dark:border-slate-600">
      {children}
    </div>
  )
}

// ── Card de Seção Premium ──────────────────────────────────────────────────────
export function SectionCard({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/60 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800/80">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── PortalDropdown — renderiza o dropdown em document.body via portal ─────────
// Evita corte por overflow-hidden/overflow-y-auto nos cards e modais.
export function PortalDropdown({ anchorRef, open, children, minWidth = 0, className = '' }) {
  const [style, setStyle] = useState({})
  useEffect(() => {
    if (!open) return
    const el = anchorRef?.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setStyle({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, minWidth) })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef, minWidth])
  if (!open || !style.top) return null
  return createPortal(
    <div
      style={{ position: 'fixed', zIndex: 10000, ...style }}
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl max-h-52 overflow-y-auto ${className}`}
    >
      {children}
    </div>,
    document.body
  )
}

// ── Campo de Exibição (Visualização) ──────────────────────────────────────────
export function ViewField({ label, value, mono = false, badge = null, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      {badge ? badge : (
        <p className={`text-sm font-medium text-gray-800 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-gray-300 dark:text-slate-600">—</span>}
        </p>
      )}
    </div>
  )
}

// ── Input Premium ──────────────────────────────────────────────────────────────
export function PremiumInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
      {...props}
    />
  )
}

// ── Select Premium ─────────────────────────────────────────────────────────────
export function PremiumSelect({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

// ── Textarea Premium ───────────────────────────────────────────────────────────
export function PremiumTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${className}`}
      {...props}
    />
  )
}

// ── Stepper ───────────────────────────────────────────────────────────────────
export function ModalStepper({ steps, currentStep, onStep }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
      {steps.map((s, i) => {
        const active  = i === currentStep
        const done    = i < currentStep
        return (
          <button
            key={i}
            onClick={() => onStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : done
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-700/50'
                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              active ? 'bg-white/20 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
            }`}>
              {done ? '✓' : i + 1}
            </span>
            {s}
          </button>
        )
      })}
    </div>
  )
}

// ── Barra de Progresso de Vigência ────────────────────────────────────────────
export function VigenciaProgress({ inicio, fim, assinatura }) {
  if (!inicio || !fim) return null
  const today     = new Date(); today.setHours(0,0,0,0)
  const dtInicio  = new Date(inicio + 'T00:00:00')
  const dtFim     = new Date(fim    + 'T00:00:00')
  const dtAssin   = assinatura ? new Date(assinatura + 'T00:00:00') : dtInicio
  const total     = dtFim - dtInicio
  const elapsed   = Math.min(today - dtInicio, total)
  const pct       = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0
  const diasRest  = Math.floor((dtFim - today) / 86400000)
  const vencido   = diasRest < 0
  const proximo   = !vencido && diasRest <= 30
  const barColor  = vencido ? 'bg-red-500' : proximo ? 'bg-amber-400' : 'bg-green-500'
  const fmtDate   = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-800/50 p-4 space-y-3">
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Assinatura',  value: fmtDate(assinatura || inicio) },
          { label: 'Início',      value: fmtDate(inicio) },
          { label: 'Fim',         value: fmtDate(fim) },
          { label: 'Dias restantes', value: vencido ? `Vencido há ${Math.abs(diasRest)}d` : `${diasRest}d`, highlight: vencido ? 'text-red-600' : proximo ? 'text-amber-600' : 'text-green-600' },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
            <p className={`text-sm font-bold ${highlight || 'text-gray-800 dark:text-slate-200'}`}>{value}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(pct)}% do período decorrido</p>
      </div>
    </div>
  )
}

