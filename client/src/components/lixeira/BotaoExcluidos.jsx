// Botão "Excluídos" de uma tela. Aparece para admin e Administrador Jeos e para quem
// tiver "Ver excluídos" ligado no editor de permissões (sem configuração = não aparece).
// entidade = chave em server/services/lixeiraService.js (ENTIDADES)
import { useState } from 'react'
import { Archive } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ModalExcluidos from './ModalExcluidos'

// Caminho da permissão de cada tela no permissoesSchema (espelha o lixeiraService)
const PERM = {
  licitacoes:        ['contratos', 'licitacoes'],
  credores:          ['contratos', 'credores'],
  itens:             ['contratos', 'itens'],
  contratos:         ['contratos', 'contratos'],
  ordens:            ['contratos', 'ordens'],
  processos:         ['processos'],
  documentos:        ['processos'],
  secretarias:       ['organizacao', 'secretarias'],
  setores:           ['organizacao', 'secretarias'],
  agentes:           ['organizacao', 'agentes'],
  usuarios:          ['organizacao', 'usuarios'],
  almox_itens:       ['almoxarifado', 'estoque'],
  almox_cotas:       ['almoxarifado', 'cotas'],
  almox_inventarios: ['almoxarifado', 'inventario'],
  contas_bancarias:  ['tesouraria', 'contas'],
  receitas:          ['tesouraria', 'receitas'],
  pagamentos:        ['tesouraria', 'despesas'],
}

export const podeVerExcluidos = (user, entidade) => {
  if (user?.tipo === 'admin' || user?.tipo === 'jeos') return true
  const caminho = PERM[entidade]
  if (!caminho) return false
  let obj = user?.permissoes
  for (const k of caminho) obj = obj?.[k]
  return obj?.excluidos === true
}

// Mesma altura dos botões das barras de ações (compactos, text-xs). `compacto`
// fica por compatibilidade: hoje os dois tamanhos são iguais.
// onAlterado: recarrega a tela quando algo é restaurado
export default function BotaoExcluidos({ entidade, rotulo = 'Excluídos', compacto = false, className = '', onAlterado }) {
  const { user } = useAuth()
  const [aberto, setAberto] = useState(false)
  if (!podeVerExcluidos(user, entidade)) return null

  const tamanho = 'h-7 px-3 rounded-lg text-xs'
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} title="Registros excluídos desta tela"
        className={`flex items-center gap-1.5 font-semibold shadow-sm transition-colors ${tamanho}
          border border-ink-300 bg-surface text-ink-700 hover:bg-ink-100 ${className}`}>
        <Archive className="w-3.5 h-3.5" /> {rotulo}
      </button>
      {aberto && <ModalExcluidos entidade={entidade} onClose={() => setAberto(false)} onAlterado={onAlterado} />}
    </>
  )
}
