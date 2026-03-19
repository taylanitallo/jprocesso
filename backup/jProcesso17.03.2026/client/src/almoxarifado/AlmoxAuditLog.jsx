import { useState, useEffect, useCallback } from 'react'
import { Shield, ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react'
import api from '../services/api'

const TABELAS = [
  { value: '', label: 'Todas as tabelas' },
  { value: 'almoxarifado_requisicoes', label: 'Requisições' },
  { value: 'almoxarifado_lotes', label: 'Lotes / Entradas' },
  { value: 'almoxarifado_movimentacoes', label: 'Movimentações' },
  { value: 'almoxarifado_itens', label: 'Itens' },
]

const ACOES = [
  { value: '', label: 'Todas as ações' },
  { value: 'CRIOU', label: 'Criou' },
  { value: 'AUTORIZOU', label: 'Autorizou' },
  { value: 'SEPAROU', label: 'Separou' },
  { value: 'ENTREGOU', label: 'Entregou' },
  { value: 'CANCELOU', label: 'Cancelou' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'ATUALIZOU', label: 'Atualizou' },
  { value: 'TOKEN_GERADO', label: 'Token Gerado' },
]

const ACAO_COLORS = {
  CRIOU:         'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  AUTORIZOU:     'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  SEPAROU:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  ENTREGOU:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELOU:      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  ENTRADA:       'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  SAIDA:         'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  ATUALIZOU:     'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  TOKEN_GERADO:  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
}

function AcaoBadge({ acao }) {
  const cls = ACAO_COLORS[acao] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {acao}
    </span>
  )
}

function TabelaBadge({ tabela }) {
  const label = tabela?.split('almoxarifado_')[1] ?? tabela ?? '-'
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 font-mono">
      {label}
    </span>
  )
}

function JsonDiff({ antes, depois }) {
  if (!antes && !depois) return <p className="text-gray-500 text-xs italic">Sem dados registrados.</p>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {antes && (
        <div>
          <p className="text-xs font-semibold text-red-500 mb-1 uppercase tracking-wide">Antes</p>
          <pre className="text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2 overflow-auto max-h-40 text-red-900 dark:text-red-300">
            {JSON.stringify(antes, null, 2)}
          </pre>
        </div>
      )}
      {depois && (
        <div>
          <p className="text-xs font-semibold text-green-600 mb-1 uppercase tracking-wide">Depois</p>
          <pre className="text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 overflow-auto max-h-40 text-green-900 dark:text-green-300">
            {JSON.stringify(depois, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const temDados = log.dados_anteriores || log.dados_novos

  return (
    <>
      <tr
        onClick={() => temDados && setExpanded(v => !v)}
        className={`border-b border-gray-100 dark:border-gray-700 text-sm transition-colors ${
          temDados ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''
        }`}
      >
        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap font-mono text-xs">
          {new Date(log.created_at).toLocaleString('pt-BR')}
        </td>
        <td className="px-4 py-3">
          <TabelaBadge tabela={log.tabela} />
        </td>
        <td className="px-4 py-3">
          <AcaoBadge acao={log.acao} />
        </td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
          {log.descricao || '-'}
        </td>
        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
          {log.user_nome || '-'}
        </td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-500 whitespace-nowrap font-mono text-xs">
          {log.ip || '-'}
        </td>
        <td className="px-4 py-3 text-center">
          {temDados
            ? expanded
              ? <ChevronDown className="h-4 w-4 text-gray-400 mx-auto" />
              : <ChevronRight className="h-4 w-4 text-gray-400 mx-auto" />
            : null
          }
        </td>
      </tr>
      {expanded && temDados && (
        <tr className="bg-gray-50 dark:bg-gray-800/60">
          <td colSpan={7} className="px-6 py-4">
            <JsonDiff antes={log.dados_anteriores} depois={log.dados_novos} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function AlmoxAuditLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const LIMIT = 30

  const [filtTabela, setFiltTabela] = useState('')
  const [filtAcao, setFiltAcao] = useState('')
  const [filtUser, setFiltUser] = useState('')

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT })
      if (filtTabela) params.set('tabela', filtTabela)
      if (filtAcao)   params.set('acao', filtAcao)
      if (filtUser)   params.set('user_nome', filtUser)

      const res = await api.get(`/almoxarifado/auditlog?${params}`)
      setLogs(res.data.rows ?? res.data)
      setTotal(res.data.total ?? res.data.length)
    } catch (err) {
      console.error('Erro ao buscar auditlog:', err)
    } finally {
      setLoading(false)
    }
  }, [filtTabela, filtAcao, filtUser])

  useEffect(() => {
    setPage(1)
    fetchLogs(1)
  }, [filtTabela, filtAcao, filtUser, fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  function handlePage(p) {
    setPage(p)
    fetchLogs(p)
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Trilha de Auditoria
          </h2>
          {!loading && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({total} registro{total !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="btn-secondary flex items-center gap-1 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtTabela}
          onChange={e => setFiltTabela(e.target.value)}
          className="input-field text-sm w-48"
        >
          {TABELAS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={filtAcao}
          onChange={e => setFiltAcao(e.target.value)}
          className="input-field text-sm w-44"
        >
          {ACOES.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por usuário..."
            value={filtUser}
            onChange={e => setFiltUser(e.target.value)}
            className="input-field text-sm pl-9 w-48"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  Data / Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Tabela
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Ação
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Descrição
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  Usuário
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  IP
                </th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando registros...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                logs.map(log => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages} — {total} registro{total !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => handlePage(page - 1)}
                className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3
                if (p < 1 || p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => handlePage(p)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      p === page
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => handlePage(page + 1)}
                className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Clique em um registro para expandir e ver os dados antes/depois da operação.
      </p>
    </div>
  )
}
