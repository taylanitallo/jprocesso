import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, ClipboardList, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import api from '../services/api'

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '–'

const statusInfo = {
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700' },
  CONCLUIDO:    { label: 'Concluído',    color: 'bg-green-100 text-green-700' },
  CANCELADO:    { label: 'Cancelado',    color: 'bg-red-100 text-red-700' },
}

const conservacaoOpts = ['OTIMO','BOM','REGULAR','RUIM','PESSIMO','INSERVIVEL']

export default function PatInventario({ userRole }) {
  const [inventarios, setInventarios] = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [invDetail, setInvDetail]     = useState(null)
  const [detLoading, setDetL]         = useState(false)
  const [novoForm, setNovoForm]       = useState({ ano: new Date().getFullYear(), secretaria_id: '' })
  const [showNovo, setShowNovo]       = useState(false)
  const [secretarias, setSecs]        = useState([])
  const [criando, setCriando]         = useState(false)
  const [busca, setBusca]             = useState('')
  const [conferIndicador, setConf]    = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/patrimonio/inventarios')
      setInventarios(data.inventarios || [])
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/organizacao/secretarias').then(({ data }) => setSecs(data.secretarias || data || []))
  }, [])

  const abrirInventario = async (inv) => {
    setSelected(inv)
    setInvDetail(null)
    setDetL(true)
    try {
      const { data } = await api.get(`/patrimonio/inventarios/${inv.id}`)
      setInvDetail(data.inventario)
    } catch { } finally { setDetL(false) }
  }

  const criarInventario = async (e) => {
    e.preventDefault()
    setCriando(true)
    try {
      const { data } = await api.post('/patrimonio/inventarios', novoForm)
      alert(data.message)
      setShowNovo(false)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar inventário')
    } finally { setCriando(false) }
  }

  const conferirItem = async (inventarioId, itemId, encontrado, estadoCons) => {
    setConf(c => ({ ...c, [itemId]: true }))
    try {
      await api.put(`/patrimonio/inventarios/${inventarioId}/itens/${itemId}/conferir`, {
        encontrado, estado_conservacao_encontrado: estadoCons
      })
      const { data } = await api.get(`/patrimonio/inventarios/${inventarioId}`)
      setInvDetail(data.inventario)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao conferir item')
    } finally { setConf(c => ({ ...c, [itemId]: false })) }
  }

  const concluir = async (inventarioId) => {
    if (!window.confirm('Confirma a conclusão do inventário?')) return
    try {
      const { data } = await api.put(`/patrimonio/inventarios/${inventarioId}/concluir`)
      alert(data.message)
      await load()
      setSelected(null)
      setInvDetail(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro')
    }
  }

  const itensFiltrados = invDetail?.itens?.filter(item =>
    !busca ||
    item.numero_tombamento?.includes(busca) ||
    item.bem?.descricao?.toLowerCase().includes(busca.toLowerCase())
  ) || []

  const podeEditar = userRole === 'admin' || userRole === 'gestor'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Inventário Patrimonial</h3>
          <p className="text-sm text-gray-500">Conformidade TCE-Ceará</p>
        </div>
        {podeEditar && (
          <button onClick={() => setShowNovo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Novo Inventário
          </button>
        )}
      </div>

      {/* Formulário novo inventário */}
      {showNovo && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">📋 Novo Inventário Patrimonial</h4>
          <form onSubmit={criarInventario} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
                value={novoForm.ano} onChange={e => setNovoForm(f => ({ ...f, ano: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Secretaria (vazio = todas)
              </label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
                value={novoForm.secretaria_id} onChange={e => setNovoForm(f => ({ ...f, secretaria_id: e.target.value }))}>
                <option value="">Todas as secretarias</option>
                {secretarias.map(s => <option key={s.id} value={s.id}>{s.sigla || s.nome}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={criando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                {criando && <RefreshCw className="h-4 w-4 animate-spin" />}
                Criar
              </button>
              <button type="button" onClick={() => setShowNovo(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de inventários */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : inventarios.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum inventário cadastrado</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Número</th>
                <th className="px-4 py-3 text-left font-medium">Ano</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Secretaria</th>
                <th className="px-4 py-3 text-left font-medium">Bens</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Conferidos</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {inventarios.map(inv => {
                const si = statusInfo[inv.status] || { label: inv.status, color: 'bg-gray-100 text-gray-700' }
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.numero}</td>
                    <td className="px-4 py-3">{inv.ano_exercicio}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500 text-xs">{inv.secretaria?.sigla || 'Todas'}</td>
                    <td className="px-4 py-3">{inv.total_bens}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {inv.total_conferidos} / {inv.total_bens}
                      {inv.total_divergencias > 0 && (
                        <span className="ml-2 text-red-500 text-xs">({inv.total_divergencias} diverg.)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${si.color}`}>{si.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => abrirInventario(inv)}
                        className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600"
                        title="Abrir">
                        <ClipboardList className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detalhe do inventário */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl my-8"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-gray-700 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selected.numero}</h2>
                <p className="text-sm text-gray-500">Ano {selected.ano_exercicio} — {selected.secretaria?.nome || 'Todas as secretarias'}</p>
              </div>
              <div className="flex items-center gap-2">
                {invDetail && selected.status === 'EM_ANDAMENTO' && podeEditar && (
                  <button onClick={() => concluir(selected.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                    Concluir Inventário
                  </button>
                )}
                <button onClick={() => { setSelected(null); setInvDetail(null) }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                  ✕
                </button>
              </div>
            </div>

            {detLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
              </div>
            ) : invDetail ? (
              <div className="p-6 space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-700">{invDetail.total_conferidos}</p>
                    <p className="text-xs text-green-600">Conferidos</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-red-700">{invDetail.total_divergencias}</p>
                    <p className="text-xs text-red-600">Divergências</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {invDetail.total_bens - invDetail.total_conferidos}
                    </p>
                    <p className="text-xs text-gray-500">Pendentes</p>
                  </div>
                </div>

                {/* Busca */}
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Filtrar por tombamento ou descrição..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />

                {/* Itens */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {itensFiltrados.map(item => {
                    const conf = conferIndicador[item.id]
                    return (
                      <div key={item.id}
                        className={`border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${
                          item.encontrado === true  ? 'border-green-200 bg-green-50 dark:bg-green-900/10' :
                          item.encontrado === false ? 'border-red-200 bg-red-50 dark:bg-red-900/10' :
                          'border-gray-200 dark:border-gray-700'
                        }`}>
                        <div className="flex-1">
                          <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                            {item.numero_tombamento || item.bem?.numero_tombamento}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{item.bem?.descricao}</p>
                          <p className="text-xs text-gray-500">
                            {item.bem?.secretaria?.sigla || ''} {item.bem?.setor ? `/ ${item.bem.setor.sigla}` : ''}
                          </p>
                        </div>
                        {item.encontrado !== null && item.encontrado !== undefined ? (
                          <div className="flex items-center gap-2 text-sm">
                            {item.encontrado
                              ? <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> Encontrado</span>
                              : <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /> Não encontrado</span>
                            }
                            {item.estado_conservacao_encontrado && (
                              <span className="text-xs text-gray-500">• {item.estado_conservacao_encontrado}</span>
                            )}
                          </div>
                        ) : selected.status === 'EM_ANDAMENTO' ? (
                          <div className="flex items-center gap-2">
                            <select
                              id={`cons-${item.id}`}
                              className="border rounded px-2 py-1 text-xs dark:bg-gray-700 dark:border-gray-600"
                              defaultValue="BOM"
                            >
                              {conservacaoOpts.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <button
                              disabled={conf}
                              onClick={() => {
                                const cons = document.getElementById(`cons-${item.id}`)?.value || 'BOM'
                                conferirItem(invDetail.id, item.id, true, cons)
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-60"
                            >
                              {conf ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Encontrado
                            </button>
                            <button
                              disabled={conf}
                              onClick={() => conferirItem(invDetail.id, item.id, false, null)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-60"
                            >
                              {conf ? <RefreshCw className="h-3 w-3 animate-spin" /> : <AlertCircle className="h-3 w-3" />}
                              Não enc.
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Não conferido</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
