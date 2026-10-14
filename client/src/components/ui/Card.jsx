import { cn } from '../../utils/cn'

/**
 * Superfície padrão do produto. `padded={false}` quando o conteúdo é uma
 * tabela ou lista que precisa encostar na borda do cartão.
 */
export function Card({ className, padded = true, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[16px] border border-ink-200/70 bg-surface shadow-xs',
        padded && 'p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, icon: Icon, actions, className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3', className)}
      {...props}
    >
      {children || (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-50">
                <Icon className="h-[18px] w-[18px] text-brand-600" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-ink-900">{title}</h3>
              {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </>
      )}
    </div>
  )
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  )
}

export default Card
