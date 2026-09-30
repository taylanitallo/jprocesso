import { cn } from '../../utils/cn'

const TAMANHOS = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-12 w-12 text-sm',
}

const TONS = {
  brand:   'bg-brand-50 text-brand-600 ring-brand-600/20',
  neutral: 'bg-ink-100 text-ink-600 ring-ink-400/20',
}

/** Duas iniciais: primeiro e último nome. "Maria da Silva" vira "MS". */
export function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export default function Avatar({ nome, src, size = 'md', tone = 'brand', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'font-bold ring-1 ring-inset',
        TAMANHOS[size] || TAMANHOS.md,
        TONS[tone] || TONS.brand,
        className
      )}
      title={nome || undefined}
      {...props}
    >
      {src
        ? <img src={src} alt={nome || ''} className="h-full w-full object-cover" />
        : iniciais(nome)}
    </span>
  )
}
