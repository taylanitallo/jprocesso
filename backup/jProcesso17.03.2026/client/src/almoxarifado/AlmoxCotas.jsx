import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, BarChart2 } from 'lucide-react'
import api from '../services/api'
import AlmoxModal from './AlmoxModal'
import { fmt } from './almoxConstants'

// ─── Modal: Nova Cota ─────────────────────────────────────────────────────────
function NovaCotaModal({ itens, setores, onClose, onSave, saving, erro }) {
  const mesAtual = new Date().toISOString().slice(0, 7) // YYYY-MM
  const [form, setForm] = useState({
    setor_id: '',
    item_id: '',
    mes_ano: mesAtual,
    quantidade_cota: '',
    observacao: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <AlmoxModal title="Definir Cota Mensal" onClose={onClose}>
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Setor *</label>
            <select
              value={form.setor_id}
              onChange={e => set('setor_id', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Selecione o setor...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mes/Ano *</label>
            <input
              type="month"
              value={form.mes_ano}
              onChange={e => set('mes_ano', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item *</label>
          <select
            value={form.item_id}
            onChange={e => set('item_id', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Selecione o item...</option>
            {itens.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.nome} ({i.unidade})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade da Cota *</label>
          <input
            type="number" step="0.001" min="0"
            value={form.quantidade_cota}
            onChange={e => set('quantidade_cota', e.target.value)}
            placeholder="0.000"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observacao</label>
          <input
            value={form.observacao}
            onChange={e => set('observacao', e.target.value)}
            placeholder="Opcional"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.setor_id || !form.item_id || !form.mes_ano || !form.quantidade_cota}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Cota'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Barra de progresso de consumo ───────────────────────────────────────────
function CotaProgressBar({ cota, consumida }) {
  const pct = cota > 0 ? Math.min((consumida / cota) * 100, 100) : 0
  const excedeu = cota > 0 && consumida > cota
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${excedeu ? 'bg-red-500' : pct > 80 ? 'bg-orange-400' : 'bg-teal-500'}`}
          style={{ width: `${Math.max(pct, excedeu ? 100 : 0)}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${excedeu ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxCotas() {
  const [cotas,       setCotas]       = useState([])
  const [itens,       setItens]       = useState([])
  const [setores,     setSetores]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [novoModal,   setNovoModal]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [erro,        setErro]        = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroMes,   setFiltroMes]   = useState(new Date().toISOString().slice(0, 7))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroSetor) params.setor_id = filtroSetor
      if (filtroMes)   params.mes_ano  = filtroMes
      const { data } = await api.get('/almoxarifado/cotas', { params })
      setCotas(Array.isArray(data) ? data : [])
    } catch { } finally { setLoading(false) }
  }, [filtroSetor, filtroMes])

  useEffect(() => {
    api.get('/almoxarifado/itens').then(r => setItens(r.data || [])).catch(() => {})
    api.get('/organizacao/setores').then(r => setSetores(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true); setErro('')
    try {
      await api.post('/almoxarifado/cotas', form)
      setNovoModal(false)
      load()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao salvar cota')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta cota?')) return
    try {
      await api.delete(`/almoxarifado/cotas/${id}`)
      load()
    } catch { }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="month"
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <select
            value={filtroSetor}
            onChange={e => setFiltroSetor(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => { setNovoModal(true); setErro('') }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Cota
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-7 w-7 animate-spin text-teal-500" />
        </div>
      ) : cotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <BarChart2 className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Nenhuma cota definida</p>
          <p className="text-sm mt-1">Defina cotas mensais por setor e item para controlar o consumo.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Setor', 'Item', 'Mes/Ano', 'Cota', 'Consumido', 'Saldo', 'Progresso', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {cotas.map(c => {
                const consumida = parseFloat(c.quantidade_consumida || 0)
                const cota      = parseFloat(c.quantidade_cota)
                const saldo     = cota - consumida
                const excedeu   = saldo < 0
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 ${excedeu ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{c.setor?.nome || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white font-medium text-xs">{c.item?.nome || '—'}</p>
                      <p className="text-xs text-gray-400">{c.item?.codigo}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{c.mes_ano}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 dark:text-gray-400">
                      {fmt(cota)} {c.item?.unidade}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 dark:text-gray-400">
                      {fmt(consumida)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold ${excedeu ? 'text-red-600' : 'text-teal-600'}`}>
                        {excedeu ? '' : ''}{fmt(saldo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <CotaProgressBar cota={cota} consumida={consumida} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400"
                        title="Remover cota"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {novoModal && (
        <NovaCotaModal
          itens={itens}
          setores={setores}
          onClose={() => setNovoModal(false)}
          onSave={handleSave}
          saving={saving}
          erro={erro}
        />
      )}
    </div>
  )
}
