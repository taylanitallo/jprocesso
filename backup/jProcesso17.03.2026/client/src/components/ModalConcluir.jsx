import { CheckCircle } from 'lucide-react'
import api from '../services/api'

export default function ModalConcluir({ processoId, onClose, onSuccess }) {
  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const despachoFinal = formData.get('despachoFinal')

    if (despachoFinal.length < 10) {
      alert('O despacho final deve ter pelo menos 10 caracteres')
      return
    }

    try {
      await api.post(`/processos/${processoId}/concluir`, { despachoFinal })
      onSuccess('Processo concluído com sucesso!')
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao concluir processo')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-xl">
        <h3 className="text-2xl font-bold mb-6 text-green-600 flex items-center">
          <CheckCircle className="h-7 w-7 mr-2" />
          ✅ Concluir Processo
        </h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Atenção:</strong> Após a conclusão, o processo não poderá mais ser tramitado.
              Certifique-se de registrar todas as informações relevantes.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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

          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md transition-all"
            >
              ✅ Confirmar Conclusão
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
