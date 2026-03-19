import { useState, useEffect } from 'react'
import { X, Send, Lock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function ModalTramitacao({ processo, onClose, onSuccess }) {
  const [secretarias, setSecretarias] = useState([])
  const [setores, setSetores] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1: dados, 2: confirmação senha

  const [formData, setFormData] = useState({
    despacho: '',
    destinoSecretariaId: '',
    destinoSetorId: '',
    destinoUsuarioId: '',
    senhaConfirmacao: ''
  })

  // Carregar secretarias
  useEffect(() => {
    const fetchSecretarias = async () => {
      try {
        const { data } = await api.get('/organizacao/secretarias')
        setSecretarias(data.secretarias.sort((a, b) => a.nome.localeCompare(b.nome)))
      } catch (err) {
        // erro silencioso no ambiente de produção
      }
    }
    fetchSecretarias()
  }, [])

  // Carregar setores quando secretaria mudar
  useEffect(() => {
    const fetchSetores = async () => {
      if (!formData.destinoSecretariaId) {
        setSetores([])
        return
      }
      try {
        const { data } = await api.get(`/organizacao/secretarias/${formData.destinoSecretariaId}/setores`)
        setSetores(data.setores.sort((a, b) => a.nome.localeCompare(b.nome)))
      } catch (err) {
        // erro silencioso no ambiente de produção
      }
    }
    fetchSetores()
  }, [formData.destinoSecretariaId])

  // Carregar usuários quando setor mudar
  useEffect(() => {
    const fetchUsuarios = async () => {
      if (!formData.destinoSetorId) {
        setUsuarios([])
        return
      }
      try {
        const { data } = await api.get(`/organizacao/setores/${formData.destinoSetorId}/usuarios`)
        setUsuarios(data.usuarios.sort((a, b) => a.nome.localeCompare(b.nome)))
      } catch (err) {
        // erro silencioso no ambiente de produção
      }
    }
    fetchUsuarios()
  }, [formData.destinoSetorId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Limpar campos dependentes
      ...(name === 'destinoSecretariaId' && { destinoSetorId: '', destinoUsuarioId: '' }),
      ...(name === 'destinoSetorId' && { destinoUsuarioId: '' })
    }))
  }

  const handleSubmitStep1 = (e) => {
    e.preventDefault()
    setError('')

    if (!formData.despacho || formData.despacho.trim().length < 10) {
      setError('O despacho deve ter pelo menos 10 caracteres')
      return
    }

    if (!formData.destinoSetorId) {
      setError('Selecione o setor de destino')
      return
    }

    setStep(2)
  }

  const handleConfirmarTramitacao = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.senhaConfirmacao) {
      setError('Digite sua senha para assinar eletronicamente')
      return
    }

    setLoading(true)

    try {
      const response = await api.post(`/processos/${processo.id}/tramitar`, {
        despacho: formData.despacho,
        destinoSetorId: formData.destinoSetorId,
        destinoUsuarioId: formData.destinoUsuarioId || null,
        senhaConfirmacao: formData.senhaConfirmacao
      })

      onSuccess(response.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao tramitar processo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <Send className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Tramitar Processo</h2>
              <p className="text-blue-100 text-sm">Processo {processo.numero}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Dados</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-300'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Assinatura</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 1: Dados da tramitação */}
        {step === 1 && (
          <form onSubmit={handleSubmitStep1} className="p-6 space-y-4">
            {/* Alerta de Assinatura Obrigatória */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
              <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <strong>Assinatura Eletrônica Obrigatória:</strong> Após preencher os dados, você precisará confirmar com sua senha para tramitar o processo.
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Despacho * <span className="text-gray-500 dark:text-gray-400 font-normal">(mínimo 10 caracteres)</span>
              </label>
              <textarea
                name="despacho"
                value={formData.despacho}
                onChange={handleChange}
                rows={4}
                required
                placeholder="Descreva o parecer, análise ou instrução para o setor de destino..."
                className="input-field resize-none"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {formData.despacho.length} caracteres
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secretaria de Destino *
              </label>
              <select
                name="destinoSecretariaId"
                value={formData.destinoSecretariaId}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Selecione a secretaria...</option>
                {secretarias.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.nome} ({sec.sigla})
                  </option>
                ))}
              </select>
            </div>

            {formData.destinoSecretariaId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Setor de Destino *
                </label>
                <select
                  name="destinoSetorId"
                  value={formData.destinoSetorId}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="">Selecione o setor...</option>
                  {setores.map(setor => (
                    <option key={setor.id} value={setor.id}>
                      {setor.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.destinoSetorId && usuarios.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Usuário Específico <span className="text-gray-500 dark:text-gray-400 font-normal">(opcional)</span>
                </label>
                <select
                  name="destinoUsuarioId"
                  value={formData.destinoUsuarioId}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Distribuir automaticamente para o setor</option>
                  {usuarios.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.nome} - {user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2"
              >
                <span>Continuar</span>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Confirmação com senha */}
        {step === 2 && (
          <form onSubmit={handleConfirmarTramitacao} className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Lock className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Assinatura Eletrônica</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                    Para garantir a autenticidade e rastreabilidade da tramitação, é necessário confirmar com sua senha.
                  </p>
                  <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p><strong>Despacho:</strong> {formData.despacho.substring(0, 100)}{formData.despacho.length > 100 ? '...' : ''}</p>
                    <p><strong>Destino:</strong> {secretarias.find(s => s.id === formData.destinoSecretariaId)?.nome} › {setores.find(s => s.id === formData.destinoSetorId)?.nome}</p>
                    {formData.destinoUsuarioId && (
                      <p><strong>Para:</strong> {usuarios.find(u => u.id === formData.destinoUsuarioId)?.nome}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Digite sua senha para confirmar *
              </label>
              <input
                type="password"
                name="senhaConfirmacao"
                value={formData.senhaConfirmacao}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="input-field"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Sua senha será verificada para gerar a assinatura digital desta tramitação.
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setError('')
                  setFormData(prev => ({ ...prev, senhaConfirmacao: '' }))
                }}
                className="btn-secondary"
                disabled={loading}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Tramitando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Confirmar Tramitação</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
