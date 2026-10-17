import CampoSugerido from '../components/ui/CampoSugerido'
import { contextoFormulario, registrarTextoUsado } from '../utils/sugestaoAyla'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Filter, ChevronLeft, ChevronRight, RefreshCw,
  ArrowDownCircle, ArrowUpCircle
} from 'lucide-react'
import api from '../services/api'
import { Paginacao, usePorPagina } from '../components/ui'
import LoadingBar from '../components/LoadingBar'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, today } from './almoxConstants'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'
import ActionBar from '../components/ui/ActionBar'

function fmtDataBR(raw) {
  if (!raw) return '—'
  const s = String(raw)
  const hasOffset = s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)
  const d = new Date(hasOffset ? s : s + 'Z')
  if (isNaN(d.getTime())) return s
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  const p = n => String(n).padStart(2, '0')
  return `${p(brt.getUTCDate())}/${p(brt.getUTCMonth() + 1)}/${brt.getUTCFullYear()} ${p(brt.getUTCHours())}:${p(brt.getUTCMinutes())}`
}

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
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-danger-700 dark:text-danger-400 rounded-lg px-4 py-2 text-sm">
            {erro}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Item *</label>
          <select
            value={form.item_id}
            onChange={e => {
              const it = itens.find(i => i.id === e.target.value)
              set('item_id', e.target.value)
              if (it) set('valor_unitario', it.valor_unitario)
            }}
            className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
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
              ? 'bg-success-50 border-success-200 text-success-800'
              : 'bg-danger-50 border-danger-200 text-danger-800'
          }`}>
            Estoque atual: <strong>{fmt(itemSel.estoque_atual)} {itemSel.unidade}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Quantidade *</label>
            <input
              type="number" step="0.001" min="0.001"
              value={form.quantidade}
              onChange={e => set('quantidade', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {tipo === 'ENTRADA' && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Valor Unitário (R$)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.valor_unitario}
                onChange={e => set('valor_unitario', e.target.value)}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Data *</label>
            <input
              type="date"
              value={form.data_movimentacao}
              onChange={e => set('data_movimentacao', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Doc. Referência</label>
            <input
              value={form.documento_referencia}
              onChange={e => set('documento_referencia', e.target.value)}
              placeholder="NF, empenho, etc."
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Observação</label>
          <CampoSugerido
            campo={`almox.movimentacao.${String(tipo).toLowerCase()}.observacao`} registrarNoEnvio={false}
            rotulo={tipo === 'ENTRADA' ? 'Observação da entrada de material no almoxarifado' : 'Observação da saída de material do almoxarifado'}
            contexto={contextoFormulario(form, { tipo, item: itemSel?.nome, unidade: itemSel?.unidade })}
            pronto={!!form.item_id} quando="focar"
            rows={2}
            value={form.observacao}
            onChange={e => set('observacao', e.target.value)}
            className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm resize-none bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => { registrarTextoUsado(`almox.movimentacao.${String(tipo).toLowerCase()}.observacao`, form.observacao, contextoFormulario(form, { tipo, item: itemSel?.nome })); onSave(form) }}
            disabled={saving || !form.item_id || !form.quantidade}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${
              tipo === 'ENTRADA' ? 'bg-success-600 hover:bg-success-700' : 'bg-danger-600 hover:bg-danger-700'
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
  const [PER_PAGE, setPerPage] = usePorPagina('almox-movimentacoes', 20)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { tipo, page: p, limit: PER_PAGE, ...filtros }
      const { data } = await api.get('/almoxarifado/movimentacoes', { params })
      setMovs(data.movimentacoes)
      setTotal(data.total)
    } catch { } finally { setLoading(false) }
  }, [tipo, filtros, PER_PAGE])

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
      <PageHeader
        icon={tipo === 'ENTRADA' ? ArrowDownCircle : ArrowUpCircle}
        eyebrow="Almoxarifado"
        title={tipo === 'ENTRADA' ? 'Entradas de Material' : 'Saídas de Material'}
        subtitle={tipo === 'ENTRADA'
          ? 'Registro de recebimentos e entradas no estoque'
          : 'Registro de saídas, consumo e distribuição de materiais'}
        actions={
          tipo === 'ENTRADA' ? (
            <button
              onClick={() => { setAbrirModal(true); setErro('') }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-success-600 hover:bg-success-700"
            >
              <Plus className="h-4 w-4" />
              Registrar Entrada
            </button>
          ) : null
        }
      />

      <FilterBar
        actions={
          <button
            onClick={() => { setPage(1); load(1) }}
            className="flex items-center gap-1 px-3 py-2 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-700 rounded-lg text-sm text-brand-700 dark:text-info-300 hover:bg-info-100 dark:hover:bg-info-900/40 font-medium"
          >
            <Filter className="h-4 w-4" /> Filtrar
          </button>
        }
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-500">Item</label>
          <select
            value={filtros.item_id}
            onChange={e => setFiltros(f => ({ ...f, item_id: e.target.value }))}
            className="border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900"
          >
            <option value="">Todos os itens</option>
            {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-500">Data inicial</label>
          <input
            type="date"
            value={filtros.data_inicio}
            onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
            className="border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-500">Data final</label>
          <input
            type="date"
            value={filtros.data_fim}
            onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
            className="border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900"
          />
        </div>
      </FilterBar>

      {loading ? (
        <LoadingBar label="Carregando movimentações..." />
      ) : (
        <div className="bg-surface rounded-xl border border-ink-200 overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle
              icon={tipo === 'ENTRADA' ? ArrowDownCircle : ArrowUpCircle}
              title={tipo === 'ENTRADA' ? 'Registros de Entradas' : 'Registros de Saídas'}
              subtitle={`${total} registro(s)`}
            />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                {['Data', 'Item', 'Qtd.', 'Valor Unit.', 'Valor Total', 'Doc. Referência', 'Observação'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {movs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-0">
                    <EmptyState
                      icon={tipo === 'ENTRADA' ? ArrowDownCircle : ArrowUpCircle}
                      title={`Nenhuma ${tipo === 'ENTRADA' ? 'entrada' : 'saída'} encontrada`}
                      description="Tente ajustar os filtros ou registre uma nova movimentação."
                    />
                  </td>
                </tr>
              )}
              {movs.map(m => (
                <tr key={m.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                    {fmtDataBR(m.created_at || m.data_movimentacao)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900 dark:text-white">{m.item?.nome}</p>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${tipo === 'ENTRADA' ? 'text-success-600' : 'text-danger-600'}`}>
                    {tipo === 'ENTRADA' ? '+' : '-'}{fmt(m.quantidade)} {m.item?.unidade}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{fmtMoney(m.valor_unitario)}</td>
                  <td className="px-4 py-3 text-ink-600">{fmtMoney(m.valor_total)}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{m.documento_referencia || '—'}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{m.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <Paginacao total={total} pagina={page} setPagina={setPage} porPagina={PER_PAGE}
            setPorPagina={(n) => { setPerPage(n); setPage(1) }} className="border-t border-ink-200" />
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
