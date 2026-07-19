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
    icon:  'bg-blue-50   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400',
    border:'border-blue-100   dark:border-blue-800/40',
    value: 'text-blue-700   dark:text-blue-300',
    trend: { up: 'text-blue-600 dark:text-blue-400', down: 'text-blue-600 dark:text-blue-400' },
  },
  green:  {
    icon:  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    border:'border-emerald-100 dark:border-emerald-800/40',
    value: 'text-emerald-700 dark:text-emerald-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-red-500 dark:text-red-400' },
  },
  amber:  {
    icon:  'bg-amber-50  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400',
    border:'border-amber-100  dark:border-amber-800/40',
    value: 'text-amber-700  dark:text-amber-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-red-500 dark:text-red-400' },
  },
  red:    {
    icon:  'bg-red-50    dark:bg-red-900/30    text-red-600    dark:text-red-400',
    border:'border-red-100    dark:border-red-800/40',
    value: 'text-red-700    dark:text-red-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-red-500 dark:text-red-400' },
  },
  violet: {
    icon:  'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    border:'border-violet-100 dark:border-violet-800/40',
    value: 'text-violet-700 dark:text-violet-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-red-500 dark:text-red-400' },
  },
  cyan:   {
    icon:  'bg-cyan-50   dark:bg-cyan-900/30   text-cyan-600   dark:text-cyan-400',
    border:'border-cyan-100   dark:border-cyan-800/40',
    value: 'text-cyan-700   dark:text-cyan-300',
    trend: { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-red-500 dark:text-red-400' },
  },
}

export default function StatCard({ icon: Icon, label, value, hint, tone = 'blue', trend }) {
  const t = TONES[tone] ?? TONES.blue

  return (
    <div className={`
      flex items-center gap-4 px-4 py-5 min-h-[104px]
      bg-white dark:bg-slate-800/70
      rounded-2xl border ${t.border}
      shadow-sm hover:shadow-md hover:-translate-y-0.5
      transition-all duration-150
    `}>
      {/* Ícone */}
      {Icon && (
        <div className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-xl ${t.icon}`}>
          <Icon className="w-6 h-6" strokeWidth={1.75} />
        </div>
      )}

      {/* Textos */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 leading-tight mb-1 uppercase tracking-wide truncate">
          {label}
        </p>
        <AutoFitValue
          className={`font-bold leading-none ${t.value}`}
          title={value != null ? String(value) : undefined}
          max={30}
          min={16}
        >
          {value ?? '—'}
        </AutoFitValue>
        {(hint || trend) && (
          <div className="flex items-center gap-2 mt-1.5">
            {hint && (
              <span className="text-xs text-gray-400 dark:text-slate-500 truncate">
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
