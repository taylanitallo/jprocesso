/**
 * EmptyState
 *
 * Props:
 *   icon        – componente Lucide
 *   title       – string — título principal
 *   description – string — texto explicativo (opcional)
 *   action      – ReactNode — botão de ação (opcional)
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      {Icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl
                        bg-slate-100 dark:bg-slate-800
                        border border-slate-200 dark:border-slate-700">
          <Icon
            className="w-6 h-6 text-slate-400 dark:text-slate-500"
            strokeWidth={1.5}
          />
        </div>
      )}
      <div className="max-w-xs">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          {title}
        </p>
        {description && (
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}
