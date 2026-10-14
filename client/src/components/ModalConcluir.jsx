import { CheckCircle } from 'lucide-react'
import api from '../services/api'
import { useAssinatura } from './assinatura/AssinaturaProvider'

export default function ModalConcluir({ processoId, onClose, onSuccess }) {
  const { assinar } = useAssinatura()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const despachoFinal = formData.get('despachoFinal')

    if (despachoFinal.length < 10) {
      alert('O despacho final deve ter pelo menos 10 caracteres')
      return
    }

    try {
      const r = await assinar({
        titulo: 'Concluir processo',
        resumo: <p><strong>Despacho final:</strong> {despachoFinal.substring(0, 200)}{despachoFinal.length > 200 ? '...' : ''}</p>,
        executar: (cred) => api.post(`/processos/${processoId}/concluir`, { despachoFinal, ...cred }),
      })
      if (!r) return // cancelou a assinatura
      onSuccess('Processo concluído e assinado eletronicamente!')
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao concluir processo')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-xl p-6 max-w-lg w-full shadow-xl">
        <h3 className="text-2xl font-bold mb-6 text-success-600 flex items-center">
          <CheckCircle className="h-7 w-7 mr-2" />
          Concluir Processo
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-success-800 dark:text-success-300">
              <strong>Atenção:</strong> Após a conclusão, o processo não poderá mais ser tramitado.
              Certifique-se de registrar todas as informações relevantes.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-2">
              Despacho Final *
            </label>
            <textarea
              name="despachoFinal"
              required
              minLength={10}
              rows={6}
              placeholder="Descreva o despacho final e o resultado do processo (mínimo 10 caracteres)..."
              className="input-field resize-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary bg-success-600 hover:bg-success-700"
            >
              Confirmar Conclusão
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
