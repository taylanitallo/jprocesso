import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, Plus, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, X, Eye
} from 'lucide-react'
import api from '../services/api'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, STATUS_INVENTARIO } from './almoxConstants'

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_INVENTARIO[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
  )
}

// ─── Modal: Detalhe do Inventário (contagem) ─────────────────────────────────
function InventarioDetalheModal({ inventario, onClose, onRefresh }) {
  const [itens,   setItens]   = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(null)
  const [concluindo, setConcluindo] = useState(false)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/almoxarifado/inventarios/${inventario.id}`)
      setItens(data.itens || [])
    } catch { } finally { setLoading(false) }
  }, [inventario.id])

  useEffect(() => { carregar() }, [carregar])

  const handleContar = async (linha, qtd) => {
    if (qtd === '' || qtd === null) return
    setSalvando(linha.id)
    try {
      await api.put(`/almoxarifado/inventarios/${inventario.id}/itens/${linha.id}/contar`, {
        quantidade_contada: parseFloat(qtd)
      })
      setItens(prev => prev.map(i => i.id === linha.id
        ? { ...i, quantidade_contada: parseFloat(qtd), contado: true, diferenca: parseFloat(qtd) - parseFloat(i.quantidade_sistema) }
        : i
      ))
    } catch { } finally { setSalvando(null) }
  }

  const handleConcluir = async () => {
    if (!window.confirm('Concluir inventario? Esta acao nao pode ser desfeita.')) return
    setConcluindo(true)
    try {
      await api.put(`/almoxarifado/inventarios/${inventario.id}/concluir`)
      onRefresh()
      onClose()
    } catch { } finally { setConcluindo(false) }
  }

  const itensFiltrados = busca
    ? itens.filter(i =>
        i.item?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        i.item?.codigo?.toLowerCase().includes(busca.toLowerCase())
      )
    : itens

  const totalContados = itens.filter(i => i.contado).length
  const totalDiverg   = itens.filter(i => i.contado && parseFloat(i.diferenca) !== 0).length
  const podeConcluir  = inventario.status === 'EM_ANDAMENTO'

  return (
    <AlmoxModal title={`Inventario ${inventario.numero}`} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{itens.length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Total de itens</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{totalContados}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Contados</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${totalDiverg > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
            <p className={`text-xl font-bold ${totalDiverg > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-500'}`}>{totalDiverg}</p>
            <p className={`text-xs ${totalDiverg > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>Divergencias</p>
          </div>
        </div>

        {/* Busca */}
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar item..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        />

        {/* Lista de itens */}
        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                <tr>
                  {['Item', 'Qtd Sistema', 'Qtd Contada', 'Diferenca', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {itensFiltrados.map(linha => {
                  const diverg = linha.contado && parseFloat(linha.diferenca) !== 0
                  return (
                    <tr key={linha.id} className={`${diverg ? 'bg-red-50/50 dark:bg-red-900/10' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/40`}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900 dark:text-white text-xs">{linha.item?.nome}</p>
                        <p className="text-xs text-gray-400">{linha.item?.codigo} · {linha.item?.corredor && `${linha.item.corredor}-${linha.item.prateleira ?? ''}`}</p>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-gray-600 dark:text-gray-400">
                        {fmt(linha.quantidade_sistema)} {linha.item?.unidade}
                      </td>
                      <td className="px-3 py-2">
                        {inventario.status === 'EM_ANDAMENTO' ? (
                          <input
                            type="number" step="0.001" min="0"
                            defaultValue={linha.quantidade_contada ?? ''}
                            onBlur={e => handleContar(linha, e.target.value)}
                            disabled={salvando === linha.id}
                            className="w-28 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-gray-600 dark:text-gray-400">{linha.contado ? fmt(linha.quantidade_contada) : '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {linha.contado ? (
                          <span className={`text-xs font-semibold ${parseFloat(linha.diferenca) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(linha.diferenca) > 0 ? '+' : ''}{fmt(linha.diferenca)}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {linha.contado && parseFloat(linha.diferenca) === 0 && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                        {linha.contado && parseFloat(linha.diferenca) !== 0 && (
                          <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Acoes */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
          {podeConcluir && (
            <button
              onClick={handleConcluir}
              disabled={concluindo || totalContados === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {concluindo ? 'Concluindo...' : 'Concluir Inventario'}
            </button>
          )}
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Novo Inventario ───────────────────────────────────────────────────
function NovoInventarioModal({ onClose, onSave, saving, erro }) {
  const [obs, setObs] = useState('')
  return (
    <AlmoxModal title="Iniciar Novo Inventario" onClose={onClose}>
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Sera criado um novo inventario com foto do estoque atual de todos os itens ativos.
          Voce podera lancar as contagens fisicas em seguida.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observacao</label>
          <textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={2}
            placeholder="Ex: Inventario anual 2026"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => onSave({ observacao: obs })}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Criando...' : 'Iniciar Inventario'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxInventario() {
  const [inventarios, setInventarios] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [novoModal,   setNovoModal]   = useState(false)
  const [detalhe,     setDetalhe]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [erro,        setErro]        = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroStatus) params.status = filtroStatus
      const { data } = await api.get('/almoxarifado/inventarios', { params })
      setInventarios(Array.isArray(data) ? data : [])
    } catch { } finally { setLoading(false) }
  }, [filtroStatus])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true); setErro('')
    try {
      await api.post('/almoxarifado/inventarios', form)
      setNovoModal(false)
      load()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao criar inventario')
    } finally { setSaving(false) }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_INVENTARIO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => { setNovoModal(true); setErro('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Inventario
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : inventarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Nenhum inventario encontrado</p>
          <p className="text-sm mt-1">Clique em "Novo Inventario" para iniciar a contagem periodica.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Numero', 'Data Inicio', 'Data Conclusao', 'Status', 'Itens', 'Divergencias', 'Responsavel', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {inventarios.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800 dark:text-gray-200">{inv.numero}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {inv.data_inicio ? new Date(inv.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {inv.data_conclusao ? new Date(inv.data_conclusao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{inv.total_itens || 0}</td>
                  <td className="px-4 py-3 text-center">
                    {(inv.total_divergencias || 0) > 0
                      ? <span className="font-semibold text-red-600">{inv.total_divergencias}</span>
                      : <span className="text-gray-300 dark:text-gray-600">0</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{inv.responsavel?.nome || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetalhe(inv)}
                      className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600"
                      title="Ver / contar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novoModal && (
        <NovoInventarioModal
          onClose={() => setNovoModal(false)}
          onSave={handleSave}
          saving={saving}
          erro={erro}
        />
      )}

      {detalhe && (
        <InventarioDetalheModal
          inventario={detalhe}
          onClose={() => setDetalhe(null)}
          onRefresh={load}
        />
      )}
    </div>
  )
}
