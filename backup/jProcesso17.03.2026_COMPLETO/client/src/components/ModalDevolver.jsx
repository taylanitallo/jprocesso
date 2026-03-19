import { ArrowLeftCircle, ArrowRight, User, Building2, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import api from '../services/api'

export default function ModalDevolver({ processoId, destinoDevolucao, onClose, onSuccess }) {
  const [justificativa, setJustificativa] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (justificativa.trim().length < 20) {
      setError('A justificativa deve ter pelo menos 20 caracteres')
      return
    }

    try {
      await api.post(`/processos/${processoId}/devolver`, { justificativa })
      onSuccess('Processo devolvido com sucesso!')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao devolver processo')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-xl">
        <h3 className="text-2xl font-bold mb-4 text-red-600 flex items-center gap-2">
          <ArrowLeftCircle className="h-7 w-7" />
          Devolver Processo
        </h3>

        {/* Destino da devolução */}
        {destinoDevolucao && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Devolvendo para
            </p>
            <div className="grid grid-cols-2 gap-2">
              {destinoDevolucao.setor?.secretaria && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Secretaria</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {destinoDevolucao.setor.secretaria.nome || destinoDevolucao.setor.secretaria.sigla}
                    </p>
                  </div>
                </div>
              )}
              {destinoDevolucao.setor && (
                <div className="flex items-start gap-2">
                  <LayoutGrid className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Setor</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {destinoDevolucao.setor.nome}
                    </p>
                  </div>
                </div>
              )}
              {destinoDevolucao.usuario && (
                <div className="flex items-start gap-2 col-span-2">
                  <User className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Usuário</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {destinoDevolucao.usuario.nome}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>Atenção:</strong> A devolução ficará registrada no histórico do processo.
              Certifique-se de descrever claramente o motivo.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Justificativa da Devolução *
            </label>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              required
              rows={5}
              placeholder="Descreva detalhadamente o motivo da devolução (mínimo 20 caracteres)..."
              className="input-field resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{justificativa.length} caracteres</p>
          </div>

          <div className="flex justify-end space-x-3 pt-2 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-danger">
              Confirmar Devolução
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
