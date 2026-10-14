import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Shield, RefreshCw, Search, ChevronDown, ChevronRight,
  User, Calendar, Monitor, Package, FileText, AlertTriangle,
  CheckCircle, XCircle, Truck, ArrowDownCircle, ArrowUpCircle,
  Settings, Key, ClipboardList, Filter, X, Printer
} from 'lucide-react'
import api from '../services/api'
import { Paginacao, usePorPagina } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import LoadingBar from '../components/LoadingBar'

// ─── Configuração de ações ────────────────────────────────────────────────────
const ACAO_CFG = {
  CRIOU:          { label: 'Criou',          color: 'bg-info-100 text-info-800 dark:bg-info-900/40 dark:text-info-300',      icon: FileText,       dot: 'bg-info-500'    },
  AUTORIZOU:      { label: 'Autorizou',      color: 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300',  icon: CheckCircle,    dot: 'bg-success-500'   },
  SEPAROU:        { label: 'Separou',        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',  icon: Package,        dot: 'bg-amber-500'   },
  ENTREGOU:       { label: 'Entregou',       color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', icon: Truck,     dot: 'bg-emerald-500' },
  CANCELOU:       { label: 'Cancelou',       color: 'bg-danger-100 text-danger-800 dark:bg-danger-900/40 dark:text-danger-300',          icon: XCircle,        dot: 'bg-danger-500'     },
  ENTRADA:        { label: 'Entrada',        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: ArrowDownCircle, dot: 'bg-purple-500' },
  SAIDA:          { label: 'Saída',          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: ArrowUpCircle, dot: 'bg-orange-500'  },
  ATUALIZOU:      { label: 'Atualizou',      color: 'bg-ink-100 text-ink-700',         icon: Settings,       dot: 'bg-ink-400'    },
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
  'bg-violet-500', 'bg-info-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-danger-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
]
function avatarColor(nome) {
  if (!nome) return 'bg-ink-400'
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg?.color || 'bg-ink-100 text-ink-700'}`}>
      <Ic className="h-3 w-3" />
      {cfg?.label || acao}
    </span>
  )
}

function TabelaBadge({ tabela }) {
  const label = tabela?.replace(/^almox(arifado)?_/, '') ?? '-'
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-ink-100 text-ink-500 font-mono">
      {label}
    </span>
  )
}

// ─── Diff JSON melhorado ──────────────────────────────────────────────────────
function JsonDiff({ antes, depois }) {
  if (!antes && !depois) return <p className="text-ink-500 text-xs italic">Sem snapshot registrado.</p>

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
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Campos alterados</p>
          <div className="space-y-1">
            {mudancas.map(({ campo, antes: a, depois: d }) => (
              <div key={campo} className="grid grid-cols-[140px_1fr_1fr] gap-2 text-xs items-start">
                <span className="font-mono text-ink-500 truncate pt-0.5">{campo}</span>
                <div className="bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-sm px-2 py-1 text-danger-800 dark:text-danger-300 break-all">
                  {a === undefined ? <em className="opacity-50">—</em> : String(a ?? '—')}
                </div>
                <div className="bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-800 rounded-sm px-2 py-1 text-success-800 dark:text-success-300 break-all">
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
            <p className="text-xs font-semibold text-danger-500 mb-1 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-danger-400 inline-block" /> Antes
            </p>
            <pre className="text-xs bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-sm p-2 overflow-auto max-h-48 text-danger-900 dark:text-danger-300">
              {JSON.stringify(antes, null, 2)}
            </pre>
          </div>
        )}
        {depois && (
          <div>
            <p className="text-xs font-semibold text-success-600 mb-1 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success-500 inline-block" /> Depois
            </p>
            <pre className="text-xs bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-800 rounded-sm p-2 overflow-auto max-h-48 text-success-900 dark:text-success-300">
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
  const dot = cfg?.dot || 'bg-ink-400'

  const dt = new Date(log.created_at)
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const data = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="relative pl-8">
      {/* Linha vertical da timeline */}
      {!isLast && (
        <div className="absolute left-3 top-8 bottom-0 w-px bg-ink-200" />
      )}
      {/* Dot */}
      <div className={`absolute left-1.5 top-4 w-3 h-3 rounded-full border-2 border-white ${dot}`} />

      <div
        className={`mb-3 rounded-xl border border-ink-100 bg-surface shadow-sm overflow-hidden ${temDados ? 'cursor-pointer' : ''}`}
        onClick={() => temDados && setExpanded(v => !v)}
      >
        {/* Linha principal */}
        <div className="flex items-start gap-3 px-4 py-3">
          {/* Avatar */}
          <div className="pt-0.5 shrink-0">
            {log.user_nome
              ? <UserAvatar nome={log.user_nome} />
              : <span className="w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-ink-400" />
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
                    ? <ChevronDown className="h-4 w-4 text-ink-400" />
                    : <ChevronRight className="h-4 w-4 text-ink-400" />
                  }
                </span>
              )}
            </div>

            {/* Descrição */}
            <p className="mt-1 text-sm text-ink-800 leading-snug">
              {formatDesc(log.descricao, log.user_nome)}
            </p>

            {/* Meta: usuário | data/hora | IP */}
            <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-ink-400">
              {log.user_nome && (
                <span className="flex items-center gap-1 font-medium text-ink-600">
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
          <div className="border-t border-ink-100 bg-ink-50 px-4 py-4"
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
        <p className="text-2xl font-bold text-ink-800">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxAuditLog() {
  const { tenant, user } = useAuth()
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage]       = useState(1)
  const [LIMIT, setLimit] = usePorPagina('almox-auditoria', 30)

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
  }, [filtTabela, filtAcao, filtUser, filtDataDe, filtDataAte, LIMIT])

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

  const gerarPDF = () => {
    if (!logs.length) return
    const agora = new Date()
    const dataGeracao = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaGeracao = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const geradoPor = user?.nome || user?.email || '—'

    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const filtrosAtivos = []
    if (filtTabela)  filtrosAtivos.push(`Tabela: ${TABELAS.find(t => t.value === filtTabela)?.label || filtTabela}`)
    if (filtAcao)    filtrosAtivos.push(`Ação: ${ACAO_CFG[filtAcao]?.label || filtAcao}`)
    if (filtUser)    filtrosAtivos.push(`Usuário: ${filtUser}`)
    if (filtDataDe)  filtrosAtivos.push(`De: ${new Date(filtDataDe + 'T12:00:00').toLocaleDateString('pt-BR')}`)
    if (filtDataAte) filtrosAtivos.push(`Até: ${new Date(filtDataAte + 'T12:00:00').toLocaleDateString('pt-BR')}`)

    const linhas = logs.map(l => {
      const dt   = new Date(l.created_at)
      const data = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const acaoLabel  = ACAO_CFG[l.acao]?.label || l.acao || '—'
      const tabelaLabel = (l.tabela || '').replace(/^almox(arifado)?_/, '') || '—'
      return `<tr>
        <td style="white-space:nowrap">${data}<br><span style="color:#6b7280;font-size:11px">${hora}</span></td>
        <td>${esc(acaoLabel)}</td>
        <td class="mono">${esc(tabelaLabel)}</td>
        <td>${esc(l.user_nome || '—')}</td>
        <td>${esc(formatDesc(l.descricao, l.user_nome))}</td>
        <td class="mono" style="white-space:nowrap">${esc(l.ip || '—')}</td>
      </tr>`
    }).join('')

    const title = 'Trilha de Auditoria — Almoxarifado'
    const _mg = tenant?.configuracoes?.margens
    const mgTop = _mg?.top ?? 20, mgRight = _mg?.right ?? 14, mgBottom = _mg?.bottom ?? 20, mgLeft = _mg?.left ?? 14
    const PRINT_CSS = `
      @page{size:A4 portrait;margin:0}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
      body{font-family:Arial,sans-serif;color:#111;margin:0}
      .layout{width:100%;border-collapse:collapse}
      .layout>thead>tr>td,.layout>tfoot>tr>td{border:0;padding:0}
      .layout>tbody>tr>td{border:0}
      .sp-top{height:${mgTop}mm}.sp-bottom{height:${mgBottom}mm}
      .content{padding:0 ${mgRight}mm 0 ${mgLeft}mm!important}
      h2{margin:0 0 2px;font-size:17px}p{margin:2px 0;font-size:12px;color:#555}
      .meta{margin:10px 0 4px;font-size:12px;color:#374151}
      .meta strong{color:#111}
      table.data{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      table.data th,table.data td{padding:6px 9px;border:1px solid #d1d5db;text-align:left;vertical-align:top}
      table.data thead{display:table-header-group}
      table.data tr{page-break-inside:avoid}
      .th-indigo{background:#3730a3!important;color:#fff!important}
      .mono{font-family:'Courier New',monospace;font-size:11px}
      table.data tbody tr:nth-child(even){background:#f9fafb!important}
      ${tenant?.configuracoes?.timbrado ? `body::before{content:'';position:fixed;top:0;left:0;width:210mm;height:297mm;background-image:url("${tenant.configuracoes.timbrado}");background-size:210mm 297mm;background-repeat:no-repeat;background-position:top left;opacity:.75;z-index:-1;pointer-events:none;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}` : ''}
      @media print{ .th-indigo{background:#3730a3!important;color:#fff!important} table.data tbody tr:nth-child(even){background:#f9fafb!important} }`

    const body = `<table class="layout">
      <thead><tr><td><div class="sp-top"></div></td></tr></thead>
      <tfoot><tr><td><div class="sp-bottom"></div></td></tr></tfoot>
      <tbody><tr><td class="content">
        <h2>${title}</h2>
        <p class="meta">Gerado em <strong>${dataGeracao}</strong> às <strong>${horaGeracao}</strong> por <strong>${esc(geradoPor)}</strong></p>
        <p class="meta">${total} registro${total !== 1 ? 's' : ''} no total — exibindo ${logs.length} desta página${filtrosAtivos.length ? ` &nbsp;·&nbsp; Filtros: ${esc(filtrosAtivos.join(' | '))}` : ''}</p>
        <table class="data">
          <thead><tr>
            <th class="th-indigo">Data / Hora</th>
            <th class="th-indigo">Ação</th>
            <th class="th-indigo">Tabela</th>
            <th class="th-indigo">Usuário</th>
            <th class="th-indigo">Descrição</th>
            <th class="th-indigo">IP</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </td></tr></tbody>
    </table>`

    const win = window.open('', '_blank', 'width=940,height=720')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>${PRINT_CSS}</style></head><body>${body}</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-ink-800">
            Trilha de Auditoria
          </h2>
          {!loading && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              {total} registro{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={gerarPDF}
            disabled={loading || logs.length === 0}
            className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-40"
            title="Gerar PDF da página atual"
          >
            <Printer className="h-4 w-4" />
            Gerar PDF
          </button>
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-500 uppercase tracking-wide">
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-danger-500 hover:text-danger-600 normal-case font-medium">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input type="text" placeholder="Filtrar por usuário..." value={filtUser}
              onChange={e => setFiltUser(e.target.value)}
              className="input-field text-sm pl-9 w-44" />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="date" value={filtDataDe} onChange={e => setFiltDataDe(e.target.value)}
                className="input-field text-sm pl-9 w-40" title="Data inicial" />
            </div>
            <span className="text-ink-400 text-xs">até</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
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
            <div className="flex flex-col items-center justify-center py-20 text-ink-400">
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
          {!loading && (
            <Paginacao total={total} pagina={page} setPagina={handlePage} porPagina={LIMIT} setPorPagina={setLimit}
              className="border-t border-ink-100 mt-2" />
          )}
        </div>

        {/* Painel lateral — resumo */}
        {!loading && logs.length > 0 && (
          <div className="w-60 shrink-0 space-y-4">

            {/* Ações na página */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">
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
                          <span className="flex items-center gap-1.5 text-xs text-ink-600">
                            <Ic className="h-3.5 w-3.5 text-ink-400" />
                            {cfg?.label || acao}
                          </span>
                          <span className="text-xs font-bold text-ink-700">{count}</span>
                        </div>
                        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cfg?.dot || 'bg-ink-400'}`}
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
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">
                  Usuários nesta página
                </p>
                <div className="space-y-2">
                  {usuarios.slice(0, 8).map(([nome, count]) => (
                    <div key={nome} className="flex items-center gap-2">
                      <UserAvatar nome={nome} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink-700 truncate">{nome}</p>
                        <p className="text-xs text-ink-400">{count} ação{count !== 1 ? 'ões' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dica */}
            <p className="text-xs text-ink-400 flex items-start gap-1">
              <Shield className="h-3 w-3 mt-0.5 shrink-0" />
              Clique em um registro para ver o snapshot antes/depois da operação.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
