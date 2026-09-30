import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Junta classes condicionais e resolve conflitos do Tailwind — a última vence.
 * Sem isso, `cn('px-4', props.className)` com `px-6` gera as duas regras e o
 * resultado passa a depender da ordem no CSS, não da intenção de quem chamou.
 */
export function cn(...entradas) {
  return twMerge(clsx(entradas))
}

export default cn
