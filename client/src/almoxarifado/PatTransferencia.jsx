import { useState, useEffect } from 'react'
import { RefreshCw, ArrowLeftRight } from 'lucide-react'
import api from '../services/api'

const base = 'w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-300'

export default function PatTransferencia({ bem, onSuccess, onCancel }) {
  const [loading, setLoading]   = useState(false)
  const [secretarias, setSecs]  = useState([])
  const [setores, setSetores]   = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm]         = useState({
    secretaria_destino_id: '',
    setor_destino_id: '',
    responsavel_destino_id: '',
    nome_responsavel_destino: '',
    cargo_responsavel_destino: '',
    matricula_responsavel_destino: '',
    data_transferencia: new Date().toISOString().split('T')[0],
    justificativa: '',
    numero_documento: '',
    local_fisico: '',
    sala: '',
    observacoes: ''
  })

  useEffect(() => {
    api.get('/organizacao/secretarias').then(({ data }) => setSecs(data.secretarias || data || []))
  }, [])

  useEffect(() => {
    if (form.secretaria_destino_id) {
      api.get(`/organizacao/secretarias/${form.secretaria_destino_id}/setores`)
        .then(({ data }) => setSetores(data.setores || data || []))
        .catch(() => setSetores([]))
      api.get(`/organizacao/usuarios?secretaria_id=${form.secretaria_destino_id}`)
        .then(({ data }) => setUsuarios(data.usuarios || data || []))
        .catch(() => setUsuarios([]))
    }
  }, [form.secretaria_destino_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.secretaria_destino_id || !form.data_transferencia || !form.nome_responsavel_destino) {
      alert('Preencha: secretaria destino, data e nome do responsável.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post(`/patrimonio/bens/${bem.id}/transferir`, form)
      alert(data.message || 'Transferência realizada!')
      onSuccess && onSuccess()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao realizar transferência')
    } finally {
      setLoading(false)
    }
  }

  if (!bem) return null

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Bem selecionado */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-6 w-6 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Transferência de bem patrimonial
            </p>
            <p className="font-bold font-mono text-yellow-900 dark:text-yellow-200">
              {bem.numero_tombamento}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">{bem.descricao}</p>
          </div>
        </div>
        <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400">
          Localização atual: {bem.secretaria?.sigla || '–'} {bem.setor ? `/ ${bem.setor.sigla}` : ''} — {bem.responsavel?.nome || 'sem responsável'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Secretaria Destino <span className="text-red-500">*</span>
          </label>
          <select className={base} value={form.secretaria_destino_id} onChange={e => set('secretaria_destino_id', e.target.value)} required>
            <option value="">Selecione a secretaria</option>
            {secretarias.map(s => <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} – ` : ''}{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Setor Destino</label>
          <select className={base} value={form.setor_destino_id} onChange={e => set('setor_destino_id', e.target.value)}>
            <option value="">Selecione o setor</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} – ` : ''}{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data da Transferência <span className="text-red-500">*</span>
          </label>
          <input type="date" className={base} value={form.data_transferencia} onChange={e => set('data_transferencia', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº do Documento</label>
          <input type="text" className={base} value={form.numero_documento} onChange={e => set('numero_documento', e.target.value)} placeholder="Portaria, ofício, etc." />
        </div>

        <div className="md:col-span-2 border-t dark:border-gray-700 pt-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            📄 Novo Responsável (Termo de Guarda)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável (usuário)</label>
          <select className={base} value={form.responsavel_destino_id} onChange={e => set('responsavel_destino_id', e.target.value)}>
            <option value="">Selecione (opcional)</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do Responsável <span className="text-red-500">*</span>
          </label>
          <input className={base} value={form.nome_responsavel_destino} onChange={e => set('nome_responsavel_destino', e.target.value)} placeholder="Nome completo" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo</label>
          <input className={base} value={form.cargo_responsavel_destino} onChange={e => set('cargo_responsavel_destino', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matrícula</label>
          <input className={base} value={form.matricula_responsavel_destino} onChange={e => set('matricula_responsavel_destino', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local Físico Destino</label>
          <input className={base} value={form.local_fisico} onChange={e => set('local_fisico', e.target.value)} placeholder="Ex: Bloco B, 1º andar" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sala/Ambiente</label>
          <input className={base} value={form.sala} onChange={e => set('sala', e.target.value)} placeholder="Ex: Sala 105" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Justificativa</label>
          <textarea className={`${base} resize-none`} rows={2} value={form.justificativa} onChange={e => set('justificativa', e.target.value)} placeholder="Motivo da transferência" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
          <textarea className={`${base} resize-none`} rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t dark:border-gray-700">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-6 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-60">
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          🔄 Confirmar Transferência
        </button>
      </div>
    </form>
  )
}
