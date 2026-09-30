import { AlertTriangle, X } from 'lucide-react'

// Modal de confirmação genérico — usado antes de qualquer ação destrutiva
// (exclusão, cancelamento, etc). `danger` deixa o botão de confirmar em
// vermelho (padrão para exclusões); use `danger={false}` para ações de
// alerta não-destrutivas (ex: liberar edição de um campo sensível).
export default function ConfirmModal({
  title = 'Confirmar exclusão',
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            danger ? 'bg-danger-100 dark:bg-danger-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-danger-600 dark:text-danger-400' : 'text-amber-600 dark:text-amber-400'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-800">{title}</p>
            {message && <p className="text-xs text-ink-500 mt-1 leading-relaxed">{message}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-sm text-ink-400 hover:text-ink-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 bg-ink-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-3 py-1.5 text-xs rounded-lg text-white font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              danger ? 'bg-danger-600 hover:bg-danger-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
