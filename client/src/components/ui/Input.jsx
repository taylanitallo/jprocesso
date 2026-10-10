import { forwardRef, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

export function Label({ htmlFor, required, className, children }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-[13px] font-semibold text-ink-700', className)}>
      {children}
      {required && <span className="ml-0.5 text-danger-600">*</span>}
    </label>
  )
}

const BASE = [
  'block w-full rounded-[10px] border bg-surface px-3 py-2.5',
  // 16px no celular evita o zoom automático do iOS ao focar o campo
  'text-base sm:text-sm text-ink-900 placeholder:text-ink-400',
  'outline-hidden disabled:opacity-55 disabled:cursor-not-allowed read-only:bg-ink-50',
].join(' ')

const ESTADO = {
  normal: 'border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
  erro:   'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20',
}

function Mensagem({ erro, ajuda }) {
  if (erro) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-danger-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {erro}
      </p>
    )
  }
  return ajuda ? <p className="mt-1 text-xs text-ink-500">{ajuda}</p> : null
}

const Input = forwardRef(function Input(
  { label, required, erro, ajuda, className, id, ...props },
  ref
) {
  const auto = useId()
  const inputId = id || auto

  return (
    <div>
      {label && <Label htmlFor={inputId} required={required}>{label}</Label>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={erro ? 'true' : undefined}
        className={cn(BASE, erro ? ESTADO.erro : ESTADO.normal, className)}
        {...props}
      />
      <Mensagem erro={erro} ajuda={ajuda} />
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, required, erro, ajuda, className, id, rows = 4, ...props },
  ref
) {
  const auto = useId()
  const inputId = id || auto

  return (
    <div>
      {label && <Label htmlFor={inputId} required={required}>{label}</Label>}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={erro ? 'true' : undefined}
        className={cn(BASE, 'resize-none', erro ? ESTADO.erro : ESTADO.normal, className)}
        {...props}
      />
      <Mensagem erro={erro} ajuda={ajuda} />
    </div>
  )
})

export const Select = forwardRef(function Select(
  { label, required, erro, ajuda, className, id, children, ...props },
  ref
) {
  const auto = useId()
  const inputId = id || auto

  return (
    <div>
      {label && <Label htmlFor={inputId} required={required}>{label}</Label>}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={erro ? 'true' : undefined}
        className={cn(BASE, erro ? ESTADO.erro : ESTADO.normal, className)}
        {...props}
      >
        {children}
      </select>
      <Mensagem erro={erro} ajuda={ajuda} />
    </div>
  )
})

export default Input
