// Botão "Excluídos" de uma tela — só administradores e Administrador Jeos o veem.
// entidade = chave em server/services/lixeiraService.js (ENTIDADES)
import { useState } from 'react'
import { Archive } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ModalExcluidos from './ModalExcluidos'

export const podeVerExcluidos = (user) => user?.tipo === 'admin' || user?.tipo === 'jeos'

// compacto: mesmo tamanho dos botões das barras em text-xs (ex.: Ordens)
export default function BotaoExcluidos({ entidade, compacto = false, className = '' }) {
  const { user } = useAuth()
  const [aberto, setAberto] = useState(false)
  if (!podeVerExcluidos(user)) return null

  const tamanho = compacto ? 'px-4 py-2 rounded-xl text-xs' : 'px-4 py-1.5 rounded-lg text-sm'
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} title="Registros excluídos desta tela"
        className={`flex items-center gap-1.5 font-semibold shadow-sm transition-colors ${tamanho}
          border border-ink-300 bg-surface text-ink-700 hover:bg-ink-100 ${className}`}>
        <Archive className={compacto ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> Excluídos
      </button>
      {aberto && <ModalExcluidos entidade={entidade} onClose={() => setAberto(false)} />}
    </>
  )
}
