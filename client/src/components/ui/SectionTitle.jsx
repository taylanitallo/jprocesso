/**
 * SectionTitle
 *
 * Props:
 *   icon     – componente Lucide (opcional)
 *   title    – string | ReactNode
 *   subtitle – string (opcional)
 *   action   – ReactNode — botão/link à direita (opcional)
 */
export default function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <Icon
            className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500"
            strokeWidth={2}
          />
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
