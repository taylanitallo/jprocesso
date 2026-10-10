// Botão de alternância de tema (claro/escuro), usado nas telas fora do Layout:
// login, seletor de município, superadmin e páginas públicas.
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const ESTILOS = {
  // Sobre superfícies do tema (cartões, cabeçalhos claros/escuros)
  padrao: 'border border-ink-200 bg-surface text-ink-600 hover:bg-ink-100',
  // Sobre faixas/imagens escuras fixas (cabeçalho institucional)
  escuro: 'border border-white/20 bg-white/10 text-white/90 hover:bg-white/20',
}

export default function BotaoTema({ variante = 'padrao', className = '' }) {
  const { isDark, toggleTheme } = useTheme()
  const rotulo = isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={rotulo}
      aria-label={rotulo}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl shadow-sm transition-colors ${ESTILOS[variante]} ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
