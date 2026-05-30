/**
 * ActionBar
 *
 * Container flex para botões de ação (topo de seção ou rodapé de card).
 *
 * Props:
 *   children – botões / elementos de ação
 *   align    – 'left' | 'right' | 'between' (padrão: 'right')
 */

const ALIGN = {
  left:    'justify-start',
  right:   'justify-end',
  between: 'justify-between',
}

export default function ActionBar({ children, align = 'right' }) {
  return (
    <div className={`flex items-center flex-wrap gap-2 ${ALIGN[align] ?? ALIGN.right}`}>
      {children}
    </div>
  )
}
