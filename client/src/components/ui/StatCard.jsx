/**
 * StatCard
 *
 * Props:
 *   icon    – componente Lucide
 *   label   – string — rótulo do card
 *   value   – string | number — valor principal
 *   hint    – string — texto auxiliar abaixo do valor (opcional)
 *   tone    – 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'cyan'
 *   trend   – { value: string, up: boolean } — indicador de tendência (opcional)
 */

import AutoFitValue from './AutoFitValue'

const TONES = {
  blue:   {
    icon:  'bg-info-50   dark:bg-info-900/30   text-brand-600   dark:text-info-400',
    border:'border-info-100   dark:border-info-800/40',
    value: 'text-brand-700   dark:text-info-300',
    trend: { up: 'text-brand-600 dark:text-info-400', down: 'text-brand-600 dark:text-info-400' },
  },
  green:  {
    icon:  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    border:'border-emerald-100 dark:border-emerald-800/40',
    value: 'text-emerald-700 dark:text-emerald-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-danger-500 dark:text-danger-400' },
  },
  amber:  {
    icon:  'bg-amber-50  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400',
    border:'border-amber-100  dark:border-amber-800/40',
    value: 'text-amber-700  dark:text-amber-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-danger-500 dark:text-danger-400' },
  },
  red:    {
    icon:  'bg-danger-50    dark:bg-danger-900/30    text-danger-600    dark:text-danger-400',
    border:'border-danger-100    dark:border-danger-800/40',
    value: 'text-danger-700    dark:text-danger-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-danger-500 dark:text-danger-400' },
  },
  violet: {
    icon:  'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    border:'border-violet-100 dark:border-violet-800/40',
    value: 'text-violet-700 dark:text-violet-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-danger-500 dark:text-danger-400' },
  },
  cyan:   {
    icon:  'bg-cyan-50   dark:bg-cyan-900/30   text-cyan-600   dark:text-cyan-400',
    border:'border-cyan-100   dark:border-cyan-800/40',
    value: 'text-cyan-700   dark:text-cyan-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-danger-500 dark:text-danger-400' },
  },
}

export default function StatCard({ icon: Icon, label, value, hint, tone = 'blue', trend }) {
  const t = TONES[tone] ?? TONES.blue

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 min-h-[76px] min-w-0 overflow-hidden
      bg-surface
      rounded-xl border ${t.border}
      shadow-sm hover:shadow-md hover:-translate-y-0.5
      transition-all duration-150
    `}>
      {/* Ícone */}
      {Icon && (
        <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${t.icon}`}>
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
      )}

      {/* Textos */}
      <div className="min-w-0 flex-1">
        {/* Rótulo nunca é cortado: quebra em mais linhas se faltar largura */}
        <p className="text-xs font-semibold text-ink-500 leading-snug mb-0.5 uppercase tracking-wide break-words">
          {label}
        </p>
        <AutoFitValue
          className={`font-bold leading-none ${t.value}`}
          title={value != null ? String(value) : undefined}
          max={26}
          min={13}
        >
          {value ?? '—'}
        </AutoFitValue>
        {(hint || trend) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
            {hint && (
              <span className="text-xs text-ink-400 leading-snug break-words">
                {hint}
              </span>
            )}
            {trend && (
              <span className={`shrink-0 text-xs font-semibold ${trend.up ? t.trend.up : t.trend.down}`}>
                {trend.up ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
