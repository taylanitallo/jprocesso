import NumeroLink from '../components/ui/NumeroLink'
import { useState, useEffect, useCallback } from 'react'
import { usePode } from '../utils/permissions'
import { RefreshCw, Plus, ClipboardList, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import api from '../services/api'
import { Paginacao, usePaginacao } from '../components/ui'
import LoadingBar from '../components/LoadingBar'
import PageHeader from '../components/ui/PageHeader'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'
import ActionBar from '../components/ui/ActionBar'
import ConfirmModal from '../components/ui/ConfirmModal'

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '–'

const statusInfo = {
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-warning-100 text-warning-700' },
  CONCLUIDO:    { label: 'Concluído',    color: 'bg-success-100 text-success-700' },
  CANCELADO:    { label: 'Cancelado',    color: 'bg-danger-100 text-danger-700' },
}

const conservacaoOpts = ['OTIMO','BOM','REGULAR','RUIM','PESSIMO','INSERVIVEL']

export default function PatInventario({ userRole }) {
  // Ações conforme o editor de permissões. Só "Ver" = sem botões de ação.
  const pode = usePode('patrimonio', 'inventario')
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
  const [confirmarConcluir, setConfirmarConcluir] = useState(false)

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
    try {
      const { data } = await api.put(`/patrimonio/inventarios/${inventarioId}/concluir`)
      alert(data.message)
      await load()
      setSelected(null)
      setInvDetail(null)
      setConfirmarConcluir(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro')
    }
  }

  const itensFiltrados = invDetail?.itens?.filter(item =>
    !busca ||
    item.numero_tombamento?.includes(busca) ||
    item.bem?.descricao?.toLowerCase().includes(busca.toLowerCase())
  ) || []

  const podeEditar = ['admin', 'gestor', 'jeos'].includes(userRole) && pode('realizar')

  const pgInventarios = usePaginacao('patrimonio-inventarios', inventarios.length);

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        icon={ClipboardList}
        eyebrow="Patrimônio"
        title="Inventário Patrimonial"
        subtitle="Conformidade TCE-Ceará"
        actions={podeEditar && (
          <button onClick={() => setShowNovo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Novo Inventário
          </button>
        )}
      />

      {/* Formulário novo inventário */}
      {showNovo && (
        <div className="bg-surface border rounded-xl p-5">
          <h4 className="font-medium text-ink-900 dark:text-white mb-3">
            <SectionTitle icon={ClipboardList} title="Novo Inventário Patrimonial" />
          </h4>
          <form onSubmit={criarInventario} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Ano</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={novoForm.ano} onChange={e => setNovoForm(f => ({ ...f, ano: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Secretaria (vazio = todas)
              </label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={novoForm.secretaria_id} onChange={e => setNovoForm(f => ({ ...f, secretaria_id: e.target.value }))}>
                <option value="">Todas as secretarias</option>
                {secretarias.map(s => <option key={s.id} value={s.id}>{s.sigla || s.nome}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={criando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60">
                {criando && <RefreshCw className="h-4 w-4 animate-spin" />}
                Criar
              </button>
              <button type="button" onClick={() => setShowNovo(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-ink-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de inventários */}
      <div className="bg-surface rounded-xl border border-ink-200 overflow-hidden">
        {loading ? (
          <LoadingBar label="Carregando inventários..." />
        ) : inventarios.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhum inventário cadastrado"
            description="Crie um novo inventário para iniciar a conferência dos bens patrimoniais."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-600">
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
            <tbody className="divide-y divide-ink-100">
              {pgInventarios.fatia(inventarios).map(inv => {
                const si = statusInfo[inv.status] || { label: inv.status, color: 'bg-ink-100 text-ink-700' }
                return (
                  <tr key={inv.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-700 dark:text-info-400">
                      <NumeroLink onClick={() => abrirInventario(inv)}>{inv.numero}</NumeroLink>
                    </td>
                    <td className="px-4 py-3">{inv.ano_exercicio}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-ink-500 text-xs">{inv.secretaria?.sigla || 'Todas'}</td>
                    <td className="px-4 py-3">{inv.total_bens}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {inv.total_conferidos} / {inv.total_bens}
                      {inv.total_divergencias > 0 && (
                        <span className="ml-2 text-danger-500 text-xs">({inv.total_divergencias} diverg.)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-sm text-xs font-medium ${si.color}`}>{si.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActionBar align="left">
                        <button onClick={() => abrirInventario(inv)}
                          className="p-1.5 rounded-sm hover:bg-info-50 dark:hover:bg-info-900/30 text-brand-600"
                          title="Abrir">
                          <ClipboardList className="h-4 w-4" />
                        </button>
                      </ActionBar>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {inventarios.length > 0 && <Paginacao {...pgInventarios} total={inventarios.length} rotulo="inventário" className="border-t border-ink-100" />}
      </div>

      {/* Detalhe do inventário */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-surface rounded-2xl w-full max-w-4xl my-8"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink-900 dark:text-white">{selected.numero}</h2>
                <p className="text-sm text-ink-500">Ano {selected.ano_exercicio} — {selected.secretaria?.nome || 'Todas as secretarias'}</p>
              </div>
              <div className="flex items-center gap-2">
                {invDetail && selected.status === 'EM_ANDAMENTO' && podeEditar && (
                  <button onClick={() => setConfirmarConcluir(true)}
                    className="px-4 py-2 bg-success-600 text-white rounded-lg text-sm hover:bg-success-700">
                    Concluir Inventário
                  </button>
                )}
                <button onClick={() => { setSelected(null); setInvDetail(null) }}
                  className="p-1.5 rounded-sm hover:bg-ink-100 text-ink-500">
                  ✕
                </button>
              </div>
            </div>

            {detLoading ? (
              <LoadingBar label="Carregando detalhes..." />
            ) : invDetail ? (
              <div className="p-6 space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-success-700">{invDetail.total_conferidos}</p>
                    <p className="text-xs text-success-600">Conferidos</p>
                  </div>
                  <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-danger-700">{invDetail.total_divergencias}</p>
                    <p className="text-xs text-danger-600">Divergências</p>
                  </div>
                  <div className="bg-ink-50 border rounded-lg p-3">
                    <p className="text-2xl font-bold text-ink-700">
                      {invDetail.total_bens - invDetail.total_conferidos}
                    </p>
                    <p className="text-xs text-ink-500">Pendentes</p>
                  </div>
                </div>

                {/* Busca */}
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
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
                          item.encontrado === true  ? 'border-success-200 bg-success-50 dark:bg-success-900/10' :
                          item.encontrado === false ? 'border-danger-200 bg-danger-50 dark:bg-danger-900/10' :
                          'border-ink-200'
                        }`}>
                        <div className="flex-1">
                          <p className="font-mono text-xs font-semibold text-ink-900 dark:text-white">
                            {item.numero_tombamento || item.bem?.numero_tombamento}
                          </p>
                          <p className="text-sm text-ink-700">{item.bem?.descricao}</p>
                          <p className="text-xs text-ink-500">
                            {item.bem?.secretaria?.sigla || ''} {item.bem?.setor ? `/ ${item.bem.setor.sigla}` : ''}
                          </p>
                        </div>
                        {item.encontrado !== null && item.encontrado !== undefined ? (
                          <div className="flex items-center gap-2 text-sm">
                            {item.encontrado
                              ? <span className="flex items-center gap-1 text-success-600"><CheckCircle className="h-4 w-4" /> Encontrado</span>
                              : <span className="flex items-center gap-1 text-danger-600"><XCircle className="h-4 w-4" /> Não encontrado</span>
                            }
                            {item.estado_conservacao_encontrado && (
                              <span className="text-xs text-ink-500">• {item.estado_conservacao_encontrado}</span>
                            )}
                          </div>
                        ) : selected.status === 'EM_ANDAMENTO' ? (
                          <div className="flex items-center gap-2">
                            <select
                              id={`cons-${item.id}`}
                              className="border rounded-sm px-2 py-1 text-xs"
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
                              className="flex items-center gap-1 px-2 py-1 bg-success-600 text-white rounded-sm text-xs hover:bg-success-700 disabled:opacity-60"
                            >
                              {conf ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Encontrado
                            </button>
                            <button
                              disabled={conf}
                              onClick={() => conferirItem(invDetail.id, item.id, false, null)}
                              className="flex items-center gap-1 px-2 py-1 bg-danger-600 text-white rounded-sm text-xs hover:bg-danger-700 disabled:opacity-60"
                            >
                              {conf ? <RefreshCw className="h-3 w-3 animate-spin" /> : <AlertCircle className="h-3 w-3" />}
                              Não enc.
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">Não conferido</span>
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
      {confirmarConcluir && (
        <ConfirmModal
          title="Concluir inventário?"
          message="Esta ação não pode ser desfeita."
          confirmLabel="Concluir"
          onConfirm={() => concluir(selected.id)}
          onClose={() => setConfirmarConcluir(false)}
        />
      )}
    </div>
  )
}
