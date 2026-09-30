import { cn } from '../../utils/cn'

/**
 * Par de cor sempre "-50 de fundo + -600 de texto", com anel do mesmo matiz.
 * Os tons -50 são redefinidos no tema escuro (index.css), então o par continua
 * legível nos dois temas sem variante `dark:` na chamada.
 */
const TONS = {
  brand:   'bg-brand-50 text-brand-600 ring-brand-600/20',
  neutral: 'bg-ink-100 text-ink-500 ring-ink-400/20',
  success: 'bg-success-50 text-success-600 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-600 ring-warning-600/20',
  danger:  'bg-danger-50 text-danger-600 ring-danger-600/20',
  info:    'bg-info-50 text-info-500 ring-info-500/20',
  orange:  'bg-orange-50 text-orange-600 ring-orange-600/20',
  purple:  'bg-purple-50 text-purple-600 ring-purple-600/20',
  indigo:  'bg-indigo-50 text-indigo-600 ring-indigo-600/20',
  teal:    'bg-teal-50 text-teal-600 ring-teal-600/20',
  violet:  'bg-violet-50 text-violet-600 ring-violet-600/20',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-600/20',
  cyan:    'bg-cyan-50 text-cyan-600 ring-cyan-600/20',
  amber:   'bg-amber-50 text-amber-600 ring-amber-600/20',
}

export default function Badge({ tone = 'neutral', icon: Icon, className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5',
        'text-[11px] font-bold uppercase tracking-wide leading-none',
        'ring-1 ring-inset',
        TONS[tone] || TONS.neutral,
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}

export { TONS as TONS_BADGE }
