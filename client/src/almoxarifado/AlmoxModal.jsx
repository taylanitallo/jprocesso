import { X } from 'lucide-react'

export default function AlmoxModal({ title, onClose, children, wide, fullscreen }) {
  const sizeClass = fullscreen
    ? 'w-[95vw] max-w-[95vw] h-[95vh]'
    : wide
    ? 'w-full max-w-3xl max-h-[90vh]'
    : 'w-full max-w-lg max-h-[90vh]'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`bg-surface rounded-xl shadow-xl flex flex-col ${sizeClass}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 shrink-0">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-ink-100 text-ink-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}
