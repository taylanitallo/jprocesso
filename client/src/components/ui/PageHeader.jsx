/**
 * PageHeader
 *
 * Props:
 *   icon      – componente Lucide (ex: <Package />), renderizado à esquerda
 *   eyebrow   – texto pequeno acima do título (opcional)
 *   title     – string | ReactNode — título principal
 *   subtitle  – string | ReactNode — descrição curta abaixo do título (opcional)
 *   actions   – ReactNode — botões/elementos alinhados à direita (opcional)
 */
export default function PageHeader({ icon: Icon, eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      {/* Lado esquerdo: ícone + textos */}
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl
                          bg-blue-50 dark:bg-blue-900/30
                          border border-blue-100 dark:border-blue-800/50
                          shadow-sm">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider
                          text-blue-600 dark:text-blue-400 mb-0.5">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl font-bold tracking-tight
                         text-gray-900 dark:text-slate-100 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Lado direito: ações */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
