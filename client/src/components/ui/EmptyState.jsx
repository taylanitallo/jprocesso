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
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl
                        bg-ink-100
                        border border-ink-200">
          <Icon
            className="w-6 h-6 text-ink-400"
            strokeWidth={1.5}
          />
        </div>
      )}
      <div className="max-w-xs">
        <p className="text-sm font-semibold text-ink-700">
          {title}
        </p>
        {description && (
          <p className="text-sm text-ink-400 mt-1 leading-relaxed">
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
