// Número de documento clicável nas listas (contrato, ordem, requisição, inventário…):
// ao clicar abre a visualização do registro. Não dispara o clique da linha
// (que só seleciona). Mantém as classes de cor/fonte que a lista já usava.
export default function NumeroLink({ onClick, children, className = '', title = 'Visualizar' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`text-left hover:underline underline-offset-2 cursor-pointer rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
    >
      {children}
    </button>
  )
}
