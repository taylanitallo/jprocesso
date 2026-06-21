import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Shield, RefreshCw, Search, ChevronDown, ChevronRight,
  User, Calendar, Monitor, Package, FileText, AlertTriangle,
  CheckCircle, XCircle, Truck, ArrowDownCircle, ArrowUpCircle,
  Settings, Key, ClipboardList, Filter, X
} from 'lucide-react'
import api from '../services/api'
import LoadingBar from '../components/LoadingBar'

// ─── Configuração de ações ────────────────────────────────────────────────────
const ACAO_CFG = {
  CRIOU:          { label: 'Criou',          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',      icon: FileText,       dot: 'bg-blue-500'    },
  AUTORIZOU:      { label: 'Autorizou',      color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',  icon: CheckCircle,    dot: 'bg-green-500'   },
  SEPAROU:        { label: 'Separou',        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',  icon: Package,        dot: 'bg-amber-500'   },
  ENTREGOU:       { label: 'Entregou',       color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', icon: Truck,     dot: 'bg-emerald-500' },
  CANCELOU:       { label: 'Cancelou',       color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',          icon: XCircle,        dot: 'bg-red-500'     },
  ENTRADA:        { label: 'Entrada',        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: ArrowDownCircle, dot: 'bg-purple-500' },
  SAIDA:          { label: 'Saída',          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: ArrowUpCircle, dot: 'bg-orange-500'  },
  ATUALIZOU:      { label: 'Atualizou',      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',         icon: Settings,       dot: 'bg-gray-400'    },
  TOKEN_GERADO:   { label: 'Token Gerado',   color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300', icon: Key,           dot: 'bg-indigo-500'  },
  REGENEROU_TOKEN:{ label: 'Regen. Token',  color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300', icon: Key,           dot: 'bg-indigo-400'  },
  CONCLUIU:       { label: 'Concluiu',       color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',      icon: ClipboardList,  dot: 'bg-teal-500'    },
}

const TABELAS = [
  { value: '', label: 'Todas as tabelas' },
  { value: 'almoxarifado_requisicoes', label: 'Requisições' },
  { value: 'almoxarifado_lotes', label: 'Lotes / Entradas' },
  { value: 'almoxarifado_movimentacoes', label: 'Movimentações' },
  { value: 'almoxarifado_itens', label: 'Itens' },
  { value: 'almox_inventarios', label: 'Inventários' },
]

const ACOES = [
  { value: '', label: 'Todas as ações' },
  ...Object.entries(ACAO_CFG).map(([value, cfg]) => ({ value, label: cfg.label })),
]

// ─── Helpers visuais ──────────────────────────────────────────────────────────
function iniciais(nome) {
  if (!nome) return '?'
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const USER_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
]
function avatarColor(nome) {
  if (!nome) return 'bg-gray-400'
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % USER_COLORS.length
  return USER_COLORS[h]
}

function UserAvatar({ nome, size = 'sm' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <span className={`${dim} ${avatarColor(nome)} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {iniciais(nome)}
    </span>
  )
}

function AcaoBadge({ acao }) {
  const cfg = ACAO_CFG[acao]
  const Ic  = cfg?.icon || AlertTriangle
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg?.color || 'bg-gray-100 text-gray-700'}`}>
      <Ic className="h-3 w-3" />
      {cfg?.label || acao}
    </span>
  )
}

function TabelaBadge({ tabela }) {
  const label = tabela?.replace(/^almox(arifado)?_/, '') ?? '-'
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 font-mono">
      {label}
    </span>
  )
}

// ─── Diff JSON melhorado ──────────────────────────────────────────────────────
function JsonDiff({ antes, depois }) {
  if (!antes && !depois) return <p className="text-gray-500 text-xs italic">Sem snapshot registrado.</p>

  // Detectar campos alterados
  const mudancas = []
  if (antes && depois) {
    const keys = new Set([...Object.keys(antes), ...Object.keys(depois)])
    keys.forEach(k => {
      const a = JSON.stringify(antes[k])
      const d = JSON.stringify(depois[k])
      if (a !== d) mudancas.push({ campo: k, antes: antes[k], depois: depois[k] })
    })
  }

  return (
    <div className="space-y-3">
      {mudancas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Campos alterados</p>
          <div className="space-y-1">
            {mudancas.map(({ campo, antes: a, depois: d }) => (
              <div key={campo} className="grid grid-cols-[140px_1fr_1fr] gap-2 text-xs items-start">
                <span className="font-mono text-gray-500 truncate pt-0.5">{campo}</span>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded px-2 py-1 text-red-800 dark:text-red-300 break-all">
                  {a === undefined ? <em className="opacity-50">—</em> : String(a ?? '—')}
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded px-2 py-1 text-green-800 dark:text-green-300 break-all">
                  {d === undefined ? <em className="opacity-50">—</em> : String(d ?? '—')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {antes && (
          <div>
            <p className="text-xs font-semibold text-red-500 mb-1 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Antes
            </p>
            <pre className="text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2 overflow-auto max-h-48 text-red-900 dark:text-red-300">
              {JSON.stringify(antes, null, 2)}
            </pre>
          </div>
        )}
        {depois && (
          <div>
            <p className="text-xs font-semibold text-green-600 mb-1 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Depois
            </p>
            <pre className="text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 overflow-auto max-h-48 text-green-900 dark:text-green-300">
              {JSON.stringify(depois, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

// Substitui UUID no início da descrição pelo nome do usuário, se disponível
function formatDesc(descricao, userName) {
  if (!descricao) return '—'
  if (userName && UUID_RE.test(descricao)) {
    return descricao.replace(UUID_RE, userName)
  }
  return descricao
}

// ─── Linha do log ─────────────────────────────────────────────────────────────
function LogRow({ log, isLast }) {
  const [expanded, setExpanded] = useState(false)
  const temDados = log.dados_anteriores || log.dados_novos
  const cfg = ACAO_CFG[log.acao]
  const dot = cfg?.dot || 'bg-gray-400'

  const dt = new Date(log.created_at)
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const data = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="relative pl-8">
      {/* Linha vertical da timeline */}
      {!isLast && (
        <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      )}
      {/* Dot */}
      <div className={`absolute left-1.5 top-4 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${dot}`} />

      <div
        className={`mb-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden ${temDados ? 'cursor-pointer' : ''}`}
        onClick={() => temDados && setExpanded(v => !v)}
      >
        {/* Linha principal */}
        <div className="flex items-start gap-3 px-4 py-3">
          {/* Avatar */}
          <div className="pt-0.5 shrink-0">
            {log.user_nome
              ? <UserAvatar nome={log.user_nome} />
              : <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-400" />
                </span>
            }
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <AcaoBadge acao={log.acao} />
              <TabelaBadge tabela={log.tabela} />
              {temDados && (
                <span className="ml-auto">
                  {expanded
                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                    : <ChevronRight className="h-4 w-4 text-gray-400" />
                  }
                </span>
              )}
            </div>

            {/* Descrição */}
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 leading-snug">
              {formatDesc(log.descricao, log.user_nome)}
            </p>

            {/* Meta: usuário | data/hora | IP */}
            <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-gray-400 dark:text-gray-500">
              {log.user_nome && (
                <span className="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
                  <User className="h-3 w-3" />
                  {log.user_nome}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {data} às {hora}
              </span>
              {log.ip && (
                <span className="flex items-center gap-1 font-mono">
                  <Monitor className="h-3 w-3" />
                  {log.ip}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Diff expandido */}
        {expanded && temDados && (
          <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-4"
               onClick={e => e.stopPropagation()}>
            <JsonDiff antes={log.dados_anteriores} depois={log.dados_novos} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Cards de resumo ──────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Ic }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Ic className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxAuditLog() {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage]       = useState(1)
  const LIMIT = 40

  const [filtTabela, setFiltTabela] = useState('')
  const [filtAcao, setFiltAcao]     = useState('')
  const [filtUser, setFiltUser]     = useState('')
  const [filtDataDe, setFiltDataDe] = useState('')
  const [filtDataAte, setFiltDataAte] = useState('')

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT })
      if (filtTabela)  params.set('tabela',    filtTabela)
      if (filtAcao)    params.set('acao',       filtAcao)
      if (filtUser)    params.set('user_nome',  filtUser)
      if (filtDataDe)  params.set('data_de',   filtDataDe)
      if (filtDataAte) params.set('data_ate',  filtDataAte)

      const res = await api.get(`/almoxarifado/auditlog?${params}`)
      const payload = res.data
      const logsArr = payload.logs ?? payload.rows ?? (Array.isArray(payload) ? payload : [])
      setLogs(logsArr)
      setTotal(payload.total ?? logsArr.length)
    } catch (err) {
      console.error('Erro ao buscar auditlog:', err)
    } finally {
      setLoading(false)
    }
  }, [filtTabela, filtAcao, filtUser, filtDataDe, filtDataAte])

  useEffect(() => {
    setPage(1)
    fetchLogs(1)
  }, [filtTabela, filtAcao, filtUser, filtDataDe, filtDataAte, fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  function handlePage(p) {
    setPage(p)
    fetchLogs(p)
  }

  const hasFilters = filtTabela || filtAcao || filtUser || filtDataDe || filtDataAte
  function clearFilters() {
    setFiltTabela('')
    setFiltAcao('')
    setFiltUser('')
    setFiltDataDe('')
    setFiltDataAte('')
  }

  // Estatísticas derivadas dos registros atuais (top de ações)
  const stats = useMemo(() => {
    const counts = {}
    logs.forEach(l => { counts[l.acao] = (counts[l.acao] || 0) + 1 })
    return counts
  }, [logs])

  // Usuários únicos na página
  const usuarios = useMemo(() => {
    const map = {}
    logs.forEach(l => { if (l.user_nome) map[l.user_nome] = (map[l.user_nome] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [logs])

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Trilha de Auditoria
          </h2>
          {!loading && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              {total} registro{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600 normal-case font-medium">
              <X className="h-3.5 w-3.5" /> Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={filtTabela} onChange={e => setFiltTabela(e.target.value)} className="input-field text-sm w-44">
            {TABELAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select value={filtAcao} onChange={e => setFiltAcao(e.target.value)} className="input-field text-sm w-44">
            {ACOES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Filtrar por usuário..." value={filtUser}
              onChange={e => setFiltUser(e.target.value)}
              className="input-field text-sm pl-9 w-44" />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="date" value={filtDataDe} onChange={e => setFiltDataDe(e.target.value)}
                className="input-field text-sm pl-9 w-40" title="Data inicial" />
            </div>
            <span className="text-gray-400 text-xs">até</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="date" value={filtDataAte} onChange={e => setFiltDataAte(e.target.value)}
                className="input-field text-sm pl-9 w-40" title="Data final" />
            </div>
          </div>
        </div>
      </div>

      {/* Layout: timeline + painel lateral */}
      <div className="flex gap-5 items-start">

        {/* Timeline principal */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <LoadingBar label="Carregando registros..." />
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Shield className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Nenhum registro encontrado</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-2 text-xs text-indigo-500 hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="pl-1">
              {logs.map((log, i) => (
                <LogRow key={log.id} log={log} isLast={i === logs.length - 1} />
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
              <p className="text-xs text-gray-500">
                Pág. {page} de {totalPages} — {total} registros
              </p>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => handlePage(page - 1)}
                  className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
                  ← Ant.
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : Math.min(page + i - 3, totalPages - 6 + i)
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => handlePage(p)}
                      className={`px-3 py-1 text-xs rounded border transition-colors ${
                        p === page ? 'bg-indigo-600 text-white border-indigo-600'
                                   : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page >= totalPages} onClick={() => handlePage(page + 1)}
                  className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Próx. →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Painel lateral — resumo */}
        {!loading && logs.length > 0 && (
          <div className="w-60 shrink-0 space-y-4">

            {/* Ações na página */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Ações nesta página
              </p>
              <div className="space-y-2">
                {Object.entries(stats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([acao, count]) => {
                    const cfg = ACAO_CFG[acao]
                    const Ic  = cfg?.icon || AlertTriangle
                    const max = Math.max(...Object.values(stats))
                    return (
                      <div key={acao}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <Ic className="h-3.5 w-3.5 text-gray-400" />
                            {cfg?.label || acao}
                          </span>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cfg?.dot || 'bg-gray-400'}`}
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Usuários ativos na página */}
            {usuarios.length > 0 && (
              <div className="card p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Usuários nesta página
                </p>
                <div className="space-y-2">
                  {usuarios.slice(0, 8).map(([nome, count]) => (
                    <div key={nome} className="flex items-center gap-2">
                      <UserAvatar nome={nome} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{nome}</p>
                        <p className="text-xs text-gray-400">{count} ação{count !== 1 ? 'ões' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dica */}
            <p className="text-xs text-gray-400 dark:text-gray-600 flex items-start gap-1">
              <Shield className="h-3 w-3 mt-0.5 shrink-0" />
              Clique em um registro para ver o snapshot antes/depois da operação.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
