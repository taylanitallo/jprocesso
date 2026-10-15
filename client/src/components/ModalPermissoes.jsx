import { useState } from 'react'
import { Shield, X } from 'lucide-react'
import api from '../services/api'
import PermissoesEditor from './PermissoesEditor'

const TIPOS = { admin: 'Administrador', gestor: 'Gestor', operacional: 'Operacional', jeos: 'Administrador Jeos' }

/**
 * Permissões de um usuário numa janela do tamanho da tela.
 * Salva só as permissões (o servidor grava apenas o que foi enviado).
 */
export default function ModalPermissoes({ usuario, permissoesIniciais, secretarias, onFechar, onSalvo }) {
  const [permissoes, setPermissoes] = useState(permissoesIniciais)
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    setSalvando(true)
    try {
      await api.put(`/auth/users/${usuario.id}`, { permissoes })
      onSalvo?.()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar as permissões')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 p-2 sm:p-3">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-surface shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <Shield className="h-5 w-5 text-brand-600" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-ink-900">Permissões de {usuario.nome}</h2>
              <p className="truncate text-xs text-ink-500">
                {TIPOS[usuario.tipo] || usuario.tipo}
                {usuario.secretaria?.sigla ? ` · ${usuario.secretaria.sigla}` : ''}
                {' · '}Com só "Ver", a tela abre apenas para consulta, sem botões de ação.
              </p>
            </div>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" title="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <PermissoesEditor permissoes={permissoes} onChange={setPermissoes} secretariasList={secretarias} tipoAlvo={usuario.tipo} />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-ink-200 bg-ink-50 px-4 py-3">
          <button type="button" onClick={onFechar} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando} className="btn-primary flex items-center gap-2">
            <Shield className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Salvar permissões'}
          </button>
        </div>
      </div>
    </div>
  )
}
