import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Eye, DownloadCloud, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../services/api'

const statusColor = {
  ATIVO:        'bg-green-100 text-green-700',
  TRANSFERIDO:  'bg-blue-100 text-blue-700',
  CEDIDO:       'bg-purple-100 text-purple-700',
  BAIXADO:      'bg-red-100 text-red-700',
  EXTRAVIADO:   'bg-orange-100 text-orange-700',
}

const conservacaoColor = {
  OTIMO:      'bg-green-100 text-green-700',
  BOM:        'bg-blue-100 text-blue-700',
  REGULAR:    'bg-yellow-100 text-yellow-700',
  RUIM:       'bg-orange-100 text-orange-700',
  PESSIMO:    'bg-red-100 text-red-700',
  INSERVIVEL: 'bg-gray-100 text-gray-700',
}

const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '–'

export default function PatBens({ onEntrada, onTransferir, onBaixar }) {
  const [bens, setBens]           = useState([])
  const [total, setTotal]         = useState(0)
  const [pages, setPages]         = useState(1)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [statusFiltro, setStatusF]= useState('')
  const [grupos, setGrupos]       = useState([])
  const [grupofiltro, setGrupoF]  = useState('')
  const [secFiltro, setSecF]      = useState('')
  const [secretarias, setSecretarias] = useState([])
  const [detalhe, setDetalhe]     = useState(null)
  const [detLoading, setDetL]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 25 })
      if (q)            params.append('q', q)
      if (statusFiltro) params.append('status', statusFiltro)
      if (grupofiltro)  params.append('grupo_id', grupofiltro)
      if (secFiltro)    params.append('secretaria_id', secFiltro)
      const { data } = await api.get(`/patrimonio/bens?${params}`)
      setBens(data.bens)
      setTotal(data.total)
      setPages(data.pages)
    } catch { } finally { setLoading(false) }
  }, [page, q, statusFiltro, grupofiltro, secFiltro])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/patrimonio/grupos').then(({ data }) => setGrupos(data.grupos || []))
    api.get('/organizacao/secretarias').then(({ data }) => setSecretarias(data.secretarias || data || []))
  }, [])

  const abrirDetalhe = async (bem) => {
    setDetalhe(null)
    setDetL(true)
    try {
      const { data } = await api.get(`/patrimonio/bens/${bem.id}`)
      setDetalhe(data.bem)
    } catch { } finally { setDetL(false) }
  }

  const exportCSV = () => {
    const params = new URLSearchParams({ formato: 'csv' })
    if (statusFiltro) params.append('status', statusFiltro)
    if (grupofiltro)  params.append('grupo_id', grupofiltro)
    if (secFiltro)    params.append('secretaria_id', secFiltro)
    window.open(`/api/patrimonio/relatorio?${params}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            placeholder="Buscar por tombamento, descrição, série, placa..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          value={statusFiltro}
          onChange={e => { setStatusF(e.target.value); setPage(1) }}
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="TRANSFERIDO">Transferido</option>
          <option value="CEDIDO">Cedido</option>
          <option value="BAIXADO">Baixado</option>
          <option value="EXTRAVIADO">Extraviado</option>
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          value={grupofiltro}
          onChange={e => { setGrupoF(e.target.value); setPage(1) }}
        >
          <option value="">Todos os grupos</option>
          {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          value={secFiltro}
          onChange={e => { setSecF(e.target.value); setPage(1) }}
        >
          <option value="">Todas as secretarias</option>
          {secretarias.map(s => <option key={s.id} value={s.id}>{s.sigla || s.nome}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
          <DownloadCloud className="h-4 w-4" /> CSV
        </button>
        <button onClick={load} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Tombamento</th>
              <th className="px-4 py-3 text-left font-medium">Descrição</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Grupo</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Secretaria</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Valor Aq.</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
              </td></tr>
            ) : bens.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-500">
                Nenhum bem encontrado
              </td></tr>
            ) : bens.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-white">
                  {b.numero_tombamento}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{b.descricao}</p>
                  {b.marca && <p className="text-xs text-gray-500">{b.marca} {b.modelo || ''}</p>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-300 text-xs">
                  {b.grupo?.nome || '–'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-300 text-xs">
                  {b.secretaria?.sigla || '–'} {b.setor ? `/ ${b.setor.sigla}` : ''}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-700 dark:text-gray-300 text-xs">
                  {fmtMoney(b.valor_aquisicao)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${conservacaoColor[b.estado_conservacao] || 'bg-gray-100 text-gray-700'}`}>
                    {b.estado_conservacao}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[b.status] || 'bg-gray-100 text-gray-700'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => abrirDetalhe(b)}
                      className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600"
                      title="Detalhe"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {b.status !== 'BAIXADO' && onTransferir && (
                      <button
                        onClick={() => onTransferir(b)}
                        className="p-1.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/30 text-yellow-600"
                        title="Transferir"
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{total} bens encontrados</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Página {page} de {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal detalhe */}
      {(detLoading || detalhe) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetalhe(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {detLoading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : detalhe && (
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{detalhe.descricao}</h2>
                    <p className="text-sm text-gray-500 font-mono">Tombamento: {detalhe.numero_tombamento}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[detalhe.status]}`}>
                    {detalhe.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    ['Grupo',          detalhe.grupo?.nome],
                    ['Marca/Modelo',   [detalhe.marca, detalhe.modelo].filter(Boolean).join(' ')],
                    ['Nº Série',       detalhe.numero_serie],
                    ['Data Aquisição', fmtDate(detalhe.data_aquisicao)],
                    ['Valor Aquisição',fmtMoney(detalhe.valor_aquisicao)],
                    ['Estado',         detalhe.estado_conservacao],
                    ['Secretaria',     detalhe.secretaria?.nome],
                    ['Setor',          detalhe.setor?.nome],
                    ['Responsável',    detalhe.responsavel?.nome],
                    ['Local',          detalhe.local_fisico],
                    ['Sala',           detalhe.sala],
                    ['N.F.',           detalhe.numero_nota_fiscal],
                  ].map(([l, v]) => v ? (
                    <div key={l}>
                      <p className="text-xs text-gray-500">{l}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{v}</p>
                    </div>
                  ) : null)}
                </div>

                {detalhe.responsabilidades?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📋 Termos de Responsabilidade</h3>
                    <div className="space-y-2">
                      {detalhe.responsabilidades.map(r => (
                        <div key={r.id} className="border rounded-lg p-3 text-sm bg-gray-50 dark:bg-gray-700/50">
                          <div className="flex justify-between">
                            <span className="font-medium">{r.numero_termo}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'VIGENTE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400">
                            {r.nome_responsavel} — {r.secretaria?.sigla || ''} {r.setor ? `/ ${r.setor.sigla}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">{fmtDate(r.data_inicio)} até {r.data_fim ? fmtDate(r.data_fim) : 'atual'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detalhe.movimentacoes?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔄 Histórico de Movimentações</h3>
                    <div className="space-y-2">
                      {detalhe.movimentacoes.map(m => (
                        <div key={m.id} className="border rounded-lg p-3 text-sm bg-gray-50 dark:bg-gray-700/50">
                          <div className="flex justify-between">
                            <span className="font-medium text-blue-700 dark:text-blue-400">{m.tipo}</span>
                            <span className="text-xs text-gray-500">{fmtDate(m.data_movimentacao)}</span>
                          </div>
                          {m.justificativa && <p className="text-gray-600 dark:text-gray-400">{m.justificativa}</p>}
                          {m.secretariaDestino && (
                            <p className="text-xs text-gray-500">
                              → {m.secretariaDestino.sigla} {m.setorDestino ? `/ ${m.setorDestino.sigla}` : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  {detalhe.status !== 'BAIXADO' && onTransferir && (
                    <button
                      onClick={() => { setDetalhe(null); onTransferir(detalhe) }}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                    >
                      Transferir
                    </button>
                  )}
                  {detalhe.status !== 'BAIXADO' && onBaixar && (
                    <button
                      onClick={() => { setDetalhe(null); onBaixar(detalhe) }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                      Baixar Bem
                    </button>
                  )}
                  <button onClick={() => setDetalhe(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
