import { cn } from '../../utils/cn'

/**
 * Bloco de carregamento com brilho passando. O shimmer é um pseudo-elemento
 * animado por `animate-[shimmer]`, então não precisa de keyframes por instância.
 */
export default function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-[8px] bg-ink-100',
        'after:absolute after:inset-0 after:-translate-x-full',
        'after:bg-gradient-to-r after:from-transparent after:via-surface/60 after:to-transparent',
        'after:animate-[shimmer_1.4s_infinite]',
        className
      )}
      {...props}
    />
  )
}

export function SkeletonText({ linhas = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === linhas - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
