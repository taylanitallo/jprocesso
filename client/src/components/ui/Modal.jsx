import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

const LARGURAS = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

/**
 * No celular sobe como bottom sheet (encostado embaixo, cantos superiores
 * arredondados); no desktop fica centralizado. Fecha no Esc e no clique fora.
 */
export default function Modal({ open = true, onClose, title, subtitle, size = 'md', footer, className, children }) {
  useEffect(() => {
    if (!open) return
    const aoTeclar = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', aoTeclar)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink-900/45 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'w-full max-h-[92vh] overflow-hidden flex flex-col bg-surface shadow-xl animate-slide-up',
          'rounded-t-[20px] sm:rounded-[16px]',
          LARGURAS[size] || LARGURAS.md,
          className
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="truncate text-sm font-bold text-ink-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="-mr-1 shrink-0 rounded-[8px] p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  )
}
