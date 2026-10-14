/**
 * FilterBar
 *
 * Container visual para filtros de listagem.
 *
 * Props:
 *   children – campos de filtro (inputs, selects, etc.)
 *   actions  – ReactNode — botões à direita (Buscar, Limpar, Exportar…) (opcional)
 */
export default function FilterBar({ children, actions }) {
  return (
    <div className="
      flex flex-col gap-2.5 sm:flex-row sm:items-end sm:flex-wrap
      px-4 py-3
      bg-surface
      rounded-xl border border-ink-200
      shadow-sm
      mb-3
    ">
      {/* Filtros */}
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-end sm:flex-wrap min-w-0">
        {children}
      </div>

      {/* Ações */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
