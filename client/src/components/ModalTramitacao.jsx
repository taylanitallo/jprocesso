import { contextoProcesso, registrarTextoUsado } from '../utils/sugestaoAyla'
import { useState, useEffect } from 'react'
import { X, Send, Lock, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useAssinatura } from './assinatura/AssinaturaProvider'
import CampoSugerido from './ui/CampoSugerido'

// tramitacaoDid: regra do fluxo do DID para a etapa atual ({ todas, secretarias: [ids], etapa })
// — vem de GET /did/processo/:id/etapas; o servidor confere de novo ao tramitar
export default function ModalTramitacao({ processo, tramitacaoDid, onClose, onSuccess }) {
  const { user } = useAuth()
  const { assinar } = useAssinatura()
  const [secretarias, setSecretarias] = useState([])
  const [setores, setSetores] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')

  // Operador só pode tramitar dentro da própria secretaria,
  // a menos que tenha sido designado por um gestor neste processo
  const foiDesignadoPorGestor = processo?.usuario_atual_id === user?.id
  // DID com destinos definidos na etapa: eles + sempre a própria secretaria do usuário
  // (análises/conferências internas antes de ir adiante); valem também para o operador
  const minhaSecretariaId = user?.secretaria?.id || user?.secretariaId || null
  // (Administrador Jeos tramita para qualquer destino)
  const destinosDoFluxo = tramitacaoDid && tramitacaoDid.todas === false && user?.tipo !== 'jeos'
    ? [...new Set([...(tramitacaoDid.secretarias || []).map(String), ...(minhaSecretariaId ? [String(minhaSecretariaId)] : [])])]
    : null
  const isOperadorRestrito = user?.tipo === 'operacional' && !foiDesignadoPorGestor && !destinosDoFluxo

  const [formData, setFormData] = useState({
    despacho: '',
    destinoSecretariaId: isOperadorRestrito ? (user?.secretariaId || '') : '',
    destinoSetorId: '',
    destinoUsuarioId: ''
  })

  // Carregar secretarias
  useEffect(() => {
    const fetchSecretarias = async () => {
      try {
        // Lista pública (todas as secretarias ativas): a rota comum devolve só a própria para não-admin
        const { data } = await api.get('/organizacao/secretarias/publico')
        let lista = (data.secretarias || []).sort((a, b) => a.nome.localeCompare(b.nome))
        if (destinosDoFluxo) lista = lista.filter(s => destinosDoFluxo.includes(String(s.id)))
        setSecretarias(lista)
        // Uma só opção: já vem escolhida
        if (destinosDoFluxo && lista.length === 1) setFormData(p => ({ ...p, destinoSecretariaId: lista[0].id }))
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

  const handleSubmitStep1 = async (e) => {
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

    // Assinatura eletrônica (senha + código do app) e envio
    try {
      const response = await assinar({
        titulo: `Tramitar o processo ${processo.numero}`,
        resumo: (
          <>
            <p><strong>Despacho:</strong> {formData.despacho.substring(0, 160)}{formData.despacho.length > 160 ? '...' : ''}</p>
            <p><strong>Destino:</strong> {secretarias.find(s => s.id === formData.destinoSecretariaId)?.nome} › {setores.find(s => s.id === formData.destinoSetorId)?.nome}</p>
            {formData.destinoUsuarioId && <p><strong>Para:</strong> {usuarios.find(u => u.id === formData.destinoUsuarioId)?.nome}</p>}
          </>
        ),
        executar: (cred) => api.post(`/processos/${processo.id}/tramitar`, {
          despacho: formData.despacho,
          destinoSetorId: formData.destinoSetorId,
          destinoUsuarioId: formData.destinoUsuarioId || null,
          ...cred,
        }),
      })
      if (!response) return // cancelou a assinatura
      registrarTextoUsado('processo.tramitar.despacho', formData.despacho, contextoProcesso(processo))
      onSuccess(response.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao tramitar processo')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ink-200 bg-gradient-to-r from-info-600 to-info-700">
          <div className="flex items-center space-x-3">
            <Send className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Tramitar Processo</h2>
              <p className="text-info-100 text-sm">Processo {processo.numero}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-info-800 p-2 rounded-lg transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 text-danger-700 dark:text-danger-300 px-4 py-3 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Dados da tramitação */}
        {(
          <form onSubmit={handleSubmitStep1} className="p-6 space-y-4">
            {/* Alerta de Assinatura Obrigatória */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 flex items-start space-x-3">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Assinatura Eletrônica Obrigatória:</strong> Após preencher os dados, você assinará com sua senha e o código do aplicativo autenticador.
              </div>
            </div>

            {/* DID: destinos definidos no fluxo para esta etapa */}
            {destinosDoFluxo && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-3 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  {tramitacaoDid?.etapa?.titulo ? `${tramitacaoDid.etapa.titulo}: ` : ''}pelo fluxo do DID, este processo pode ser tramitado
                  dentro da sua secretaria ou para{' '}
                  <strong>{secretarias.filter(s => String(s.id) !== String(minhaSecretariaId)).map(s => s.sigla || s.nome).join(', ') || 'as secretarias definidas'}</strong>.
                </p>
              </div>
            )}

            {/* Aviso para operadores restritos */}
            {isOperadorRestrito && (
              <div className="bg-info-50 dark:bg-info-500/10 border border-info-200 dark:border-brand-500/20 rounded-lg p-3 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-info-500 mt-0.5 shrink-0" />
                <p className="text-xs text-brand-700 dark:text-info-300">
                  Como operador, você só pode tramitar para setores da sua secretaria. Para tramitar entre secretarias, solicite a um gestor.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Despacho * <span className="text-ink-500 font-normal">(mínimo 10 caracteres)</span>
              </label>
              <CampoSugerido
                campo="processo.tramitar.despacho"
                registrarNoEnvio={false}
                rotulo="Despacho de tramitação do processo (encaminhamento ao próximo setor)"
                contexto={{ ...contextoProcesso(processo), etapa_did: tramitacaoDid?.etapa }}
                name="despacho"
                value={formData.despacho}
                onChange={handleChange}
                rows={4}
                required
                placeholder="Descreva o parecer, análise ou instrução para o setor de destino..."
                className="input-field resize-none"
              />
              <div className="text-right text-xs text-ink-500 mt-1">
                {formData.despacho.length} caracteres
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Secretaria de Destino *
              </label>
              {isOperadorRestrito ? (
                <input
                  type="text"
                  value={secretarias.find(s => s.id === formData.destinoSecretariaId)?.nome || '...'}
                  disabled
                  className="input-field bg-ink-100 cursor-not-allowed text-ink-500"
                />
              ) : (
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
              )}
            </div>

            {formData.destinoSecretariaId && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
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
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  Usuário Específico <span className="text-ink-500 font-normal">(opcional)</span>
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

            <div className="flex justify-end space-x-3 pt-4 border-t">
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

      </div>
    </div>
  )
}
