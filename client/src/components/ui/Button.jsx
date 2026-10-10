import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

const VARIANTES = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 shadow-xs hover:shadow-sm',
  secondary: 'bg-surface text-ink-700 border border-ink-200 hover:bg-ink-50 shadow-xs',
  outline:   'bg-transparent text-ink-700 border border-ink-300 hover:bg-ink-50',
  ghost:     'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger:    'bg-danger-600 text-white hover:bg-danger-500 shadow-xs hover:shadow-sm',
  success:   'bg-success-600 text-white hover:bg-success-500 shadow-xs hover:shadow-sm',
}

const TAMANHOS = {
  sm:   'h-8 px-3 rounded-[8px] text-[13px] gap-1.5',
  md:   'h-10 px-4 rounded-[10px] text-sm gap-2',
  lg:   'h-12 px-5 rounded-[12px] text-sm gap-2',
  icon: 'h-10 w-10 rounded-[10px] p-0 gap-0',
}

/**
 * Botão padrão do produto. `loading` desabilita e troca o ícone à esquerda pelo
 * spinner — o rótulo continua no lugar para a largura não saltar no clique.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, ...props },
  ref
) {
  const bloqueado = disabled || loading

  return (
    <button
      ref={ref}
      disabled={bloqueado}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap',
        'active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTES[variant] || VARIANTES.primary,
        TAMANHOS[size] || TAMANHOS.md,
        className
      )}
      {...props}
    >
      {loading
        ? <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]')} />
        : Icon && <Icon className={cn(size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]')} />}
      {size !== 'icon' && children}
    </button>
  )
})

export default Button
