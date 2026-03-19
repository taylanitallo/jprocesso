import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Filter, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react'
import api from '../services/api'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, today } from './almoxConstants'

// ─── Modal: Registrar Entrada / Saída ────────────────────────────────────────
function MovimentacaoModal({ tipo, itens, onClose, onSave, saving, erro }) {
  const [form, setForm] = useState({
    item_id: '', quantidade: '', valor_unitario: '',
    data_movimentacao: today(), documento_referencia: '', observacao: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const itemSel = itens.find(i => i.id === form.item_id)

  return (
    <AlmoxModal
      title={tipo === 'ENTRADA' ? 'Registrar Entrada de Material' : 'Registrar Saída de Material'}
      onClose={onClose}
    >
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-2 text-sm">
            {erro}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item *</label>
          <select
            value={form.item_id}
            onChange={e => {
              const it = itens.find(i => i.id === e.target.value)
              set('item_id', e.target.value)
              if (it) set('valor_unitario', it.valor_unitario)
            }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um item...</option>
            {itens.map(i => (
              <option key={i.id} value={i.id}>
                {i.nome} ({i.codigo}) — Estoque: {fmt(i.estoque_atual)} {i.unidade}
              </option>
            ))}
          </select>
        </div>

        {itemSel && (
          <div className={`rounded-lg px-4 py-2 text-sm border ${
            tipo === 'ENTRADA'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            Estoque atual: <strong>{fmt(itemSel.estoque_atual)} {itemSel.unidade}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade *</label>
            <input
              type="number" step="0.001" min="0.001"
              value={form.quantidade}
              onChange={e => set('quantidade', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {tipo === 'ENTRADA' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Unitário (R$)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.valor_unitario}
                onChange={e => set('valor_unitario', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
            <input
              type="date"
              value={form.data_movimentacao}
              onChange={e => set('data_movimentacao', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doc. Referência</label>
            <input
              value={form.documento_referencia}
              onChange={e => set('documento_referencia', e.target.value)}
              placeholder="NF, empenho, etc."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação</label>
          <textarea
            rows={2}
            value={form.observacao}
            onChange={e => set('observacao', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.item_id || !form.quantidade}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${
              tipo === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Tab: Movimentações (Entradas ou Saídas) ──────────────────────────────────
function MovimentacoesTab({ tipo }) {
  const [movs,       setMovs]      = useState([])
  const [total,      setTotal]     = useState(0)
  const [page,       setPage]      = useState(1)
  const [loading,    setLoading]   = useState(true)
  const [abrirModal, setAbrirModal]= useState(false)
  const [itens,      setItens]     = useState([])
  const [saving,     setSaving]    = useState(false)
  const [erro,       setErro]      = useState('')
  const [filtros,    setFiltros]   = useState({ data_inicio: '', data_fim: '', item_id: '' })
  const PER_PAGE = 20

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { tipo, page: p, limit: PER_PAGE, ...filtros }
      const { data } = await api.get('/almoxarifado/movimentacoes', { params })
      setMovs(data.movimentacoes)
      setTotal(data.total)
    } catch { } finally { setLoading(false) }
  }, [tipo, filtros])

  const loadItens = useCallback(async () => {
    const { data } = await api.get('/almoxarifado/itens')
    setItens(data)
  }, [])

  useEffect(() => { load(page) }, [load, page])
  useEffect(() => { loadItens() }, [loadItens])

  const handleRegistrar = async (form) => {
    setSaving(true); setErro('')
    try {
      const endpoint = tipo === 'ENTRADA'
        ? '/almoxarifado/movimentacoes/entrada'
        : '/almoxarifado/movimentacoes/saida'
      await api.post(endpoint, form)
      setAbrirModal(false)
      setPage(1); load(1)
      loadItens()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao registrar')
    } finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filtros.item_id}
            onChange={e => setFiltros(f => ({ ...f, item_id: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos os itens</option>
            {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
          <input
            type="date"
            value={filtros.data_inicio}
            onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filtros.data_fim}
            onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setPage(1); load(1) }}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" /> Filtrar
          </button>
        </div>
        <button
          onClick={() => { setAbrirModal(true); setErro('') }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${
            tipo === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          {tipo === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Saída'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Data', 'Item', 'Qtd.', 'Valor Unit.', 'Valor Total', 'Doc. Referência', 'Observação'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {movs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nenhuma {tipo === 'ENTRADA' ? 'entrada' : 'saída'} encontrada
                  </td>
                </tr>
              )}
              {movs.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.data_movimentacao}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{m.item?.nome}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{m.item?.codigo}</p>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                    {tipo === 'ENTRADA' ? '+' : '-'}{fmt(m.quantidade)} {m.item?.unidade}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtMoney(m.valor_unitario)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtMoney(m.valor_total)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{m.documento_referencia || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{m.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total: {total} registros</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm">{page} / {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {abrirModal && (
        <MovimentacaoModal
          tipo={tipo}
          itens={itens}
          onClose={() => setAbrirModal(false)}
          onSave={handleRegistrar}
          saving={saving}
          erro={erro}
        />
      )}
    </div>
  )
}

export function AlmoxEntradas() {
  return <MovimentacoesTab tipo="ENTRADA" />
}

export function AlmoxSaidas() {
  return <MovimentacoesTab tipo="SAIDA" />
}
