import { useState } from 'react'
import { RefreshCw, PackageX } from 'lucide-react'
import api from '../services/api'

const base = 'w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-300'

const MOTIVOS = [
  { value: 'INSERVIVEL',   label: 'Inservível (desgaste natural)' },
  { value: 'EXTRAVIO',     label: 'Extravio' },
  { value: 'FURTO_ROUBO',  label: 'Furto / Roubo' },
  { value: 'VENDA',        label: 'Venda / Leilão' },
  { value: 'DOACAO',       label: 'Doação' },
  { value: 'PERMUTA',      label: 'Permuta' },
  { value: 'SINISTRO',     label: 'Sinistro (incêndio, inundação, etc.)' },
  { value: 'OUTROS',       label: 'Outros' },
]

export default function PatBaixa({ bem, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    motivo: '',
    numero_processo: '',
    numero_resolucao: '',
    data_baixa: new Date().toISOString().split('T')[0],
    valor_estimado_residual: '',
    descricao_ocorrencia: '',
    autorizado_por: '',
    observacoes: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.motivo || !form.data_baixa) {
      alert('Preencha o motivo e a data da baixa.')
      return
    }
    if (!window.confirm(`Confirma a BAIXA do bem "${bem.numero_tombamento} – ${bem.descricao}"?\n\nEsta ação não pode ser desfeita.`)) return
    setLoading(true)
    try {
      const { data } = await api.post(`/patrimonio/bens/${bem.id}/baixar`, form)
      alert(data.message || 'Bem baixado com sucesso.')
      onSuccess && onSuccess()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao realizar baixa')
    } finally {
      setLoading(false)
    }
  }

  if (!bem) return null

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Identificação */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <PackageX className="h-6 w-6 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Baixa patrimonial</p>
            <p className="font-bold font-mono text-red-900 dark:text-red-200">{bem.numero_tombamento}</p>
            <p className="text-sm text-red-700 dark:text-red-400">{bem.descricao}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-red-700 dark:text-red-400 font-medium">
          ⚠️ Após a baixa o bem não poderá mais ser movimentado no sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Motivo da Baixa <span className="text-red-500">*</span>
          </label>
          <select className={base} value={form.motivo} onChange={e => set('motivo', e.target.value)} required>
            <option value="">Selecione o motivo</option>
            {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data da Baixa <span className="text-red-500">*</span>
          </label>
          <input type="date" className={base} value={form.data_baixa} onChange={e => set('data_baixa', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº do Processo</label>
          <input className={base} value={form.numero_processo} onChange={e => set('numero_processo', e.target.value)} placeholder="Ex: 2026/001234" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº da Resolução/Despacho</label>
          <input className={base} value={form.numero_resolucao} onChange={e => set('numero_resolucao', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autorizado por</label>
          <input className={base} value={form.autorizado_por} onChange={e => set('autorizado_por', e.target.value)} placeholder="Nome do autoridade competente" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Residual Estimado (R$)</label>
          <input type="number" step="0.01" min="0" className={base} value={form.valor_estimado_residual} onChange={e => set('valor_estimado_residual', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição da Ocorrência</label>
          <textarea className={`${base} resize-none`} rows={3} value={form.descricao_ocorrencia} onChange={e => set('descricao_ocorrencia', e.target.value)} placeholder="Descreva as circunstâncias da baixa, estado do bem, etc." />
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
          className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          🗑️ Confirmar Baixa
        </button>
      </div>
    </form>
  )
}
