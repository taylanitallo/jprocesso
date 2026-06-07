import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText, BarChart3, DollarSign, CheckCircle2, AlertTriangle, Clock3,
  Building2, User, TrendingUp, Search, X, RefreshCw, ArrowLeft,
  Calendar, Tag, Loader2, Shield, Award, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Filter, ShoppingCart, Wrench, ClipboardList,
  ShoppingCart, Wrench, ClipboardList,
} from 'lucide-react'
import api from '../services/api'
import { PageHeader } from '../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(v) || 0)

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, dia] = (d.split('T')[0]).split('-')
  return `${dia}/${m}/${y}`
}

const parseValor = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0

const diasAte = (d) => {
  if (!d) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const fim = new Date(d + 'T00:00:00'); fim.setHours(0, 0, 0, 0)
  return Math.ceil((fim - hoje) / 86400000)
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({ Icon, label, value, sub, color = 'blue', badge }) {
  const gradients = {
    blue:   'from-blue-500 to-indigo-600',
    green:  'from-green-500 to-emerald-600',
    yellow: 'from-yellow-400 to-orange-500',
    purple: 'from-purple-500 to-violet-600',
    teal:   'from-teal-500 to-cyan-600',
  }
  const str = String(value ?? '')
  const len = Math.max(str.length, 1)
  const autoFontSize = Math.min(1.875, Math.max(0.85, 1.875 - 0.0875 * (len - 7))) + 'rem'
  return (
    <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-4 min-h-[110px] min-w-0 overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[color] || gradients.blue} flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.text}</span>}
        {!badge && sub && <span className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 text-right leading-tight flex-shrink-0 max-w-[50%]">{sub}</span>}
      </div>
      <div className="mt-2 min-w-0">
        <p className="font-bold tabular-nums whitespace-nowrap text-gray-900 dark:text-white leading-tight" style={{ fontSize: autoFontSize }}>{value}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{label}</p>
        {badge && sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Mini barra horizontal ────────────────────────────────────────────────────
function BarRow({ label, value, pct, color = 'bg-blue-500', extra }) {
  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-gray-700 dark:text-slate-300 truncate max-w-[55%] font-medium" title={label}>{label || '—'}</span>
        <div className="flex-shrink-0 ml-2 text-right">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
          {extra && <span className="text-xs text-gray-400 ml-1.5">{extra}</span>}
        </div>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
        <div className={`h-2 ${color} rounded-full transition-all duration-700 group-hover:opacity-80`} style={{ width: Math.min(100, pct) + '%' }} />
      </div>
    </div>
  )
}

// ─── Gráfico de barras verticais ──────────────────────────────────────────────
function BarChart({ data, colorClass = 'bg-blue-500' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-44 mt-3 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          {d.value > 0 && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-slate-700 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
              {d.tooltip || d.value}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800 dark:border-t-slate-700" />
            </div>
          )}
          <div
            className={`w-full rounded-t-lg transition-all cursor-default ${d.value > 0 ? colorClass + ' hover:opacity-75' : 'bg-gray-100 dark:bg-slate-700/40'}`}
            style={{ height: d.value > 0 ? Math.max((d.value / max) * 160, 6) + 'px' : '6px' }}
          />
          <div className="text-center">
            {d.value > 0 && <div className="text-[10px] font-bold text-gray-600 dark:text-slate-400">{d.value}</div>}
            <span className="text-[9px] text-gray-400 dark:text-slate-500 select-none">{d.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Paginação ────────────────────────────────────────────────────────────────
const PER_PAGE = 10

function Paginacao({ total, page, perPage = PER_PAGE, onChange }) {
  const totalPags = Math.max(1, Math.ceil(total / perPage))
  if (totalPags <= 1) return null
  const ini = Math.max(1, Math.min(page - 2, totalPags - 4))
  const fim = Math.min(totalPags, ini + 4)
  const paginas = Array.from({ length: fim - ini + 1 }, (_, i) => ini + i)
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 gap-2 flex-wrap">
      <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de{' '}
        <strong className="text-gray-600 dark:text-slate-300">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <BtnPag onClick={() => onChange(1)} disabled={page === 1}><ChevronsLeft className="w-3 h-3" /></BtnPag>
        <BtnPag onClick={() => onChange(page - 1)} disabled={page === 1}><ChevronLeft className="w-3 h-3" /></BtnPag>
        {paginas.map(p => (
          <BtnPag key={p} onClick={() => onChange(p)} active={p === page}>{p}</BtnPag>
        ))}
        <BtnPag onClick={() => onChange(page + 1)} disabled={page === totalPags}><ChevronRight className="w-3 h-3" /></BtnPag>
        <BtnPag onClick={() => onChange(totalPags)} disabled={page === totalPags}><ChevronsRight className="w-3 h-3" /></BtnPag>
      </div>
    </div>
  )
}

function BtnPag({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all border ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'border-slate-200 dark:border-slate-700/50 text-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed'
      }`}
    >{children}</button>
  )
}

// ─── Status ───────────────────────────────────────────────────────────────────
const STATUS_COR = {
  ATIVO:      { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  bar: 'bg-green-500',  dot: 'bg-green-500'  },
  ENCERRADO:  { badge: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400',       bar: 'bg-gray-400',   dot: 'bg-gray-400'   },
  SUSPENSO:   { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  bar: 'bg-amber-500',  dot: 'bg-amber-500'  },
  RESCINDIDO: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',          bar: 'bg-red-500',    dot: 'bg-red-500'    },
}

const MODAL_CORES = [
  'bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-cyan-500',  'bg-violet-500', 'bg-sky-500',  'bg-fuchsia-500',
  'bg-emerald-500', 'bg-rose-500',
]

// ─── Card com header ──────────────────────────────────────────────────────────
function DashCard({ icon: Icon, title, badge, children }) {
  return (
    <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/70 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />}
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</h3>
        </div>
        {badge && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-gray-500 dark:text-slate-400 whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function ContratosDashboard() {
  const { subdomain } = useParams()
  const navigate = useNavigate()

  const [contratos,  setContratos]  = useState([])
  const [credores,   setCredores]   = useState([])
  const [ordens,     setOrdens]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Filtros gerais
  const [filtros, setFiltros] = useState({
    periodo_ini: '', periodo_fim: '', modalidade: '', status: '', secretaria: '', credor: '',
  })
  const [filtrosAtivos, setFiltrosAtivos] = useState({
    periodo_ini: '', periodo_fim: '', modalidade: '', status: '', secretaria: '', credor: '',
  })
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Paginação — credores
  const [credoresPage,  setCredoresPage]  = useState(1)
  const [credoresBusca, setCredoresBusca] = useState('')

  // Paginação — maiores contratos
  const [contratosPage,   setContratosPage]   = useState(1)
  const [contratosBusca,  setContratosBusca]  = useState('')
  const [contratosStatus, setContratosStatus] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, credRes, ordRes] = await Promise.all([
        api.get('/contratos'),
        api.get('/contratos/credores'),
        api.get('/contratos/ordens').catch(() => ({ data: [] })),
      ])
      setContratos(cRes.data || [])
      setCredores(credRes.data || [])
      setOrdens(ordRes.data || [])
      setLastUpdate(new Date())
    } catch { /* silenciar */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const opcoesModalidade = useMemo(() => [...new Set(contratos.map(c => c.modalidade).filter(Boolean))].sort(), [contratos])
  const opcoesSecretaria = useMemo(() => [...new Set(contratos.map(c => c.secretaria).filter(Boolean))].sort(), [contratos])
  const opcoesStatus = ['ATIVO', 'ENCERRADO', 'SUSPENSO', 'RESCINDIDO']

  const nomeCredor = (id) => credores.find(c => c.id === id)?.razao_social || '—'

  // ─── Filtro principal ─────────────────────────────────────────────────────
  const contratosFiltrados = useMemo(() => {
    const f = filtrosAtivos
    return contratos.filter(c => {
      if (f.status     && c.status !== f.status) return false
      if (f.modalidade && c.modalidade !== f.modalidade) return false
      if (f.secretaria && c.secretaria !== f.secretaria) return false
      if (f.credor     && !nomeCredor(c.credor_id).toLowerCase().includes(f.credor.toLowerCase())) return false
      if (f.periodo_ini && c.data_assinatura && c.data_assinatura < f.periodo_ini) return false
      if (f.periodo_fim && c.data_assinatura && c.data_assinatura > f.periodo_fim) return false
      return true
    })
  }, [contratos, credores, filtrosAtivos])

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpiTotal      = contratosFiltrados.length
  const kpiAtivos     = contratosFiltrados.filter(c => c.status === 'ATIVO').length
  const kpiAlerta     = contratosFiltrados.filter(c => {
    if (c.status !== 'ATIVO' || !c.vigencia_fim) return false
    const d = diasAte(c.vigencia_fim)
    return d !== null && d >= 0 && d <= 30
  }).length
  const kpiValorTotal  = contratosFiltrados.reduce((acc, c) => acc + parseValor(c.valor), 0)
  const kpiValorMedio  = kpiTotal > 0 ? kpiValorTotal / kpiTotal : 0
  const kpiCredoresUniq = new Set(contratosFiltrados.map(c => c.credor_id).filter(Boolean)).size

  // ─── Evolução por ano ─────────────────────────────────────────────────────
  const anoAtual = new Date().getFullYear()
  const anosRange = Array.from({ length: 6 }, (_, i) => anoAtual - 5 + i)
  const evoData = anosRange.map(ano => {
    const qty = contratosFiltrados.filter(c => parseInt((c.data_assinatura || c.vigencia_inicio || '').slice(0, 4)) === ano).length
    return { label: String(ano).slice(2), value: qty, tooltip: `${ano}: ${qty} contrato${qty !== 1 ? 's' : ''}` }
  })

  // ─── Por modalidade ───────────────────────────────────────────────────────
  const porModalidade = useMemo(() => {
    const map = {}
    contratosFiltrados.forEach(c => {
      const m = c.modalidade || 'Não informado'
      if (!map[m]) map[m] = { qtd: 0, valor: 0 }
      map[m].qtd++; map[m].valor += parseValor(c.valor)
    })
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.valor - a.valor)
  }, [contratosFiltrados])

  // ─── Por status ───────────────────────────────────────────────────────────
  const porStatus = useMemo(() => {
    const map = {}
    contratosFiltrados.forEach(c => {
      const s = c.status || 'OUTROS'
      if (!map[s]) map[s] = { qtd: 0, valor: 0 }
      map[s].qtd++; map[s].valor += parseValor(c.valor)
    })
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.qtd - a.qtd)
  }, [contratosFiltrados])

  // ─── Credores (todos, paginados) ──────────────────────────────────────────
  const todosCredores = useMemo(() => {
    const map = {}
    contratosFiltrados.forEach(c => {
      const nome = nomeCredor(c.credor_id)
      if (!map[nome]) map[nome] = { qtd: 0, valor: 0 }
      map[nome].qtd++; map[nome].valor += parseValor(c.valor)
    })
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.valor - a.valor)
  }, [contratosFiltrados, credores])

  const credoresFiltrados = useMemo(() => {
    if (!credoresBusca.trim()) return todosCredores
    return todosCredores.filter(c => c.label.toLowerCase().includes(credoresBusca.toLowerCase()))
  }, [todosCredores, credoresBusca])

  const credoresPaginados = useMemo(() => {
    const ini = (credoresPage - 1) * PER_PAGE
    return credoresFiltrados.slice(ini, ini + PER_PAGE)
  }, [credoresFiltrados, credoresPage])

  // ─── Top secretarias ──────────────────────────────────────────────────────
  const topSecretarias = useMemo(() => {
    const map = {}
    contratosFiltrados.forEach(c => {
      const s = c.secretaria || 'Não informada'
      if (!map[s]) map[s] = { qtd: 0, valor: 0 }
      map[s].qtd++; map[s].valor += parseValor(c.valor)
    })
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.valor - a.valor).slice(0, 8)
  }, [contratosFiltrados])

  // ─── Vigência ─────────────────────────────────────────────────────────────
  const vigencia = useMemo(() => {
    let expirados = 0, vencendo30 = 0, vencendo90 = 0, vigente = 0, semData = 0
    contratosFiltrados.filter(c => c.status === 'ATIVO').forEach(c => {
      if (!c.vigencia_fim) { semData++; return }
      const d = diasAte(c.vigencia_fim)
      if (d === null)   semData++
      else if (d < 0)   expirados++
      else if (d <= 30) vencendo30++
      else if (d <= 90) vencendo90++
      else              vigente++
    })
    return { expirados, vencendo30, vencendo90, vigente, semData }
  }, [contratosFiltrados])

  // ─── Por categoria ────────────────────────────────────────────────────────
  const porCategoria = useMemo(() => {
    const map = {}
    contratosFiltrados.forEach(c => {
      const cat = c.tipo_contrato || 'CONTRATO'
      if (!map[cat]) map[cat] = { qtd: 0, valor: 0 }
      map[cat].qtd++; map[cat].valor += parseValor(c.valor)
    })
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.qtd - a.qtd)
  }, [contratosFiltrados])

  // ─── KPIs de Ordens ───────────────────────────────────────────────────────
  const ordensFiltradas = useMemo(() => {
    if (!filtrosAtivos.secretaria) return ordens
    return ordens.filter(o => {
      if (filtrosAtivos.secretaria && o.secretaria !== filtrosAtivos.secretaria) return false
      return true
    })
  }, [ordens, filtrosAtivos])

  const ordensKpi = useMemo(() => {
    const total     = ordensFiltradas.length
    const compras   = ordensFiltradas.filter(o => o.tipo === 'COMPRA').length
    const servicos  = ordensFiltradas.filter(o => o.tipo === 'SERVICO').length
    const emitidas  = ordensFiltradas.filter(o => o.status === 'EMITIDA').length
    const atendidas = ordensFiltradas.filter(o => o.status === 'ATENDIDA').length
    const canceladas= ordensFiltradas.filter(o => o.status === 'CANCELADA').length
    const valorTotal= ordensFiltradas.filter(o => o.status !== 'CANCELADA')
      .reduce((acc, o) => acc + parseValor(o.valor_total), 0)
    return { total, compras, servicos, emitidas, atendidas, canceladas, valorTotal }
  }, [ordensFiltradas])

  const ordensPorContrato = useMemo(() => {
    const map = {}
    ordensFiltradas.filter(o => o.status !== 'CANCELADA').forEach(o => {
      const num = o.contrato?.numero_contrato || `Contrato #${o.contrato_id}`
      if (!map[num]) map[num] = { qtd: 0, valor: 0 }
      map[num].qtd++
      map[num].valor += parseValor(o.valor_total)
    })
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.valor - a.valor).slice(0, 8)
  }, [ordensFiltradas])

  const ordensPorSecretaria = useMemo(() => {
    const map = {}
    ordensFiltradas.filter(o => o.status !== 'CANCELADA').forEach(o => {
      const s = o.secretaria || 'Não informada'
      if (!map[s]) map[s] = { qtd: 0, valor: 0 }
      map[s].qtd++
      map[s].valor += parseValor(o.valor_total)
    })
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.valor - a.valor).slice(0, 6)
  }, [ordensFiltradas])

  // ─── Maiores contratos (todos, paginados) ─────────────────────────────────
  const todosComValor = useMemo(() =>
    [...contratosFiltrados]
      .filter(c => parseValor(c.valor) > 0)
      .sort((a, b) => parseValor(b.valor) - parseValor(a.valor)),
    [contratosFiltrados]
  )

  const maioresFiltrados = useMemo(() => {
    let res = todosComValor
    if (contratosStatus) res = res.filter(c => c.status === contratosStatus)
    if (contratosBusca.trim()) {
      const q = contratosBusca.toLowerCase()
      res = res.filter(c =>
        String(c.numero_contrato || '').toLowerCase().includes(q) ||
        String(c.objeto || '').toLowerCase().includes(q) ||
        nomeCredor(c.credor_id).toLowerCase().includes(q)
      )
    }
    return res
  }, [todosComValor, contratosStatus, contratosBusca, credores])

  const maioresPaginados = useMemo(() => {
    const ini = (contratosPage - 1) * PER_PAGE
    return maioresFiltrados.slice(ini, ini + PER_PAGE)
  }, [maioresFiltrados, contratosPage])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const aplicarFiltros = () => { setFiltrosAtivos({ ...filtros }); setCredoresPage(1); setContratosPage(1) }
  const limparFiltros = () => {
    const vazio = { periodo_ini: '', periodo_fim: '', modalidade: '', status: '', secretaria: '', credor: '' }
    setFiltros(vazio); setFiltrosAtivos(vazio); setCredoresPage(1); setContratosPage(1)
  }
  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const haFiltroAtivo = Object.values(filtrosAtivos).some(Boolean)

  const handleCredoresBusca = (v) => { setCredoresBusca(v); setCredoresPage(1) }
  const handleContratosBusca = (v) => { setContratosBusca(v); setContratosPage(1) }
  const handleContratosStatus = (v) => { setContratosStatus(v); setContratosPage(1) }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        icon={BarChart3}
        title="Dashboard — Contratos"
        subtitle="Análise executiva da carteira de contratos"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate(`/${subdomain}/contratos/contratos`)}
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/70 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-sm font-medium shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Contratos
            </button>
            <button
              onClick={() => setMostrarFiltros(v => !v)}
              className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl text-sm font-medium shadow-sm transition-all border ${
                mostrarFiltros || haFiltroAtivo
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/70 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {haFiltroAtivo && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
            </button>
            <button
              onClick={load}
              className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/70 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 shadow-sm transition-all"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* ── Painel de Filtros ─────────────────────────────────────────────── */}
      {mostrarFiltros && (
        <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Filtros do Dashboard</span>
            </div>
            {lastUpdate && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
                Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Assinatura — de</label>
              <input type="date" className="input-field w-full" value={filtros.periodo_ini} onChange={e => setF('periodo_ini', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Assinatura — até</label>
              <input type="date" className="input-field w-full" value={filtros.periodo_fim} onChange={e => setF('periodo_fim', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Modalidade</label>
              <select className="input-field w-full" value={filtros.modalidade} onChange={e => setF('modalidade', e.target.value)}>
                <option value="">Todas</option>
                {opcoesModalidade.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Status</label>
              <select className="input-field w-full" value={filtros.status} onChange={e => setF('status', e.target.value)}>
                <option value="">Todos</option>
                {opcoesStatus.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Secretaria</label>
              <select className="input-field w-full" value={filtros.secretaria} onChange={e => setF('secretaria', e.target.value)}>
                <option value="">Todas</option>
                {opcoesSecretaria.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Credor</label>
              <input className="input-field w-full" placeholder="Buscar credor..." value={filtros.credor} onChange={e => setF('credor', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-primary text-sm inline-flex items-center gap-1.5" onClick={aplicarFiltros}>
              <Search className="w-4 h-4" /> Filtrar
            </button>
            <button className="btn-secondary text-sm inline-flex items-center gap-1.5" onClick={limparFiltros}>
              <X className="w-4 h-4" /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* ── Loading / Vazio ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm">Carregando contratos...</span>
        </div>
      ) : contratos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium">Nenhum contrato cadastrado</p>
        </div>
      ) : (
        <>
          {/* ── Banner filtro ativo ──────────────────────────────────────── */}
          {haFiltroAtivo && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 text-sm text-blue-700 dark:text-blue-300">
              <Filter className="w-4 h-4 flex-shrink-0" />
              <span>Filtros ativos — exibindo <strong>{kpiTotal}</strong> de {contratos.length} contratos</span>
              <button onClick={limparFiltros} className="ml-auto text-xs underline hover:no-underline flex-shrink-0">Limpar</button>
            </div>
          )}

          {/* ── KPIs ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard Icon={FileText}      color="blue"   label="Total de Contratos"     value={String(kpiTotal)} />
            <MetricCard Icon={CheckCircle2}  color="green"  label="Contratos Ativos"        value={String(kpiAtivos)}
              sub={kpiTotal > 0 ? Math.round(kpiAtivos / kpiTotal * 100) + '% do total' : undefined}
            />
            <MetricCard Icon={AlertTriangle} color={kpiAlerta > 0 ? 'yellow' : 'green'} label="Vencendo em 30 dias" value={String(kpiAlerta)}
              badge={kpiAlerta > 0
                ? { text: 'ATENÇÃO', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
                : { text: 'OK',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
              }
            />
            <MetricCard Icon={DollarSign}   color="blue"   label="Valor Global"            value={fmtMoeda(kpiValorTotal)} />
            <MetricCard Icon={TrendingUp}   color="purple" label="Valor Médio"             value={fmtMoeda(kpiValorMedio)} />
            <MetricCard Icon={User}         color="teal"   label="Total de Credores"       value={String(kpiCredoresUniq)} />
          </div>

          {/* ── Alerta vencimentos ───────────────────────────────────────── */}
          {kpiAlerta > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                    {kpiAlerta} contrato{kpiAlerta !== 1 ? 's' : ''} vencendo nos próximos 30 dias
                  </p>
                  <div className="space-y-1.5">
                    {contratosFiltrados
                      .filter(c => { if (c.status !== 'ATIVO' || !c.vigencia_fim) return false; const d = diasAte(c.vigencia_fim); return d !== null && d >= 0 && d <= 30 })
                      .sort((a, b) => (a.vigencia_fim || '').localeCompare(b.vigencia_fim || ''))
                      .slice(0, 5)
                      .map(c => {
                        const d = diasAte(c.vigencia_fim)
                        return (
                          <div key={c.id} className="flex items-center gap-2 text-xs bg-white/60 dark:bg-slate-800/40 rounded-lg px-2.5 py-1.5">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{c.numero_contrato}</span>
                            <span className="text-gray-600 dark:text-slate-300 truncate flex-1">{c.objeto}</span>
                            <span className={`font-bold whitespace-nowrap flex-shrink-0 px-2 py-0.5 rounded-full ${d === 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : d <= 7 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                              {d === 0 ? 'Hoje' : `${d}d`}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                  {kpiAlerta > 5 && <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">+ {kpiAlerta - 5} outros — veja a tabela de contratos abaixo</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Evolução por ano ─────────────────────────────────────────── */}
          <DashCard icon={Calendar} title="Evolução por Ano (data de assinatura)">
            {evoData.every(d => d.value === 0)
              ? <p className="text-sm text-gray-400 text-center py-6">Nenhum contrato com data de assinatura registrada</p>
              : <BarChart data={evoData} colorClass="bg-blue-500 dark:bg-blue-600" />
            }
          </DashCard>

          {/* ── Modalidade + Status ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <DashCard icon={Tag} title="Por Modalidade" badge={`${porModalidade.length} tipos`}>
              {porModalidade.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">Sem dados</p>
                : (
                  <div className="space-y-3.5">
                    {porModalidade.map((m, i) => {
                      const maxVal = porModalidade[0]?.valor || 1
                      return (
                        <BarRow
                          key={m.label}
                          label={m.label}
                          value={fmtMoeda(m.valor)}
                          pct={Math.min(100, (m.valor / maxVal) * 100)}
                          color={MODAL_CORES[i % MODAL_CORES.length]}
                          extra={`${m.qtd} contrato${m.qtd !== 1 ? 's' : ''}`}
                        />
                      )
                    })}
                  </div>
                )
              }
            </DashCard>

            <DashCard icon={Shield} title="Por Status" badge={`${porStatus.length} status`}>
              {porStatus.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">Sem dados</p>
                : (
                  <div className="space-y-3.5">
                    {porStatus.map(s => {
                      const cor = STATUS_COR[s.label] || { bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
                      const maxQtd = porStatus[0]?.qtd || 1
                      const pct = kpiTotal > 0 ? Math.round((s.qtd / kpiTotal) * 100) : 0
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cor.dot}`} />
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${cor.badge}`}>{s.label}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-gray-400">{pct}%</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">{s.qtd}</span>
                              <span className="text-xs text-gray-400 w-28 text-right hidden sm:block">{fmtMoeda(s.valor)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                            <div className={`h-2 ${cor.bar} rounded-full transition-all duration-700`} style={{ width: Math.min(100, (s.qtd / maxQtd) * 100) + '%' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </DashCard>
          </div>

          {/* ── Tabela de Credores (paginada) ────────────────────────────── */}
          <DashCard icon={Award} title="Credores" badge={`${todosCredores.length} total`}>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input-field w-full pl-9 text-sm"
                placeholder="Buscar credor..."
                value={credoresBusca}
                onChange={e => handleCredoresBusca(e.target.value)}
              />
              {credoresBusca && (
                <button onClick={() => handleCredoresBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {credoresFiltrados.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">Nenhum credor encontrado</p>
              : (
                <>
                  <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700/50">
                          <th className="text-left pb-2.5 px-1 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                          <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Credor</th>
                          <th className="text-center pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">Contratos</th>
                          <th className="text-right pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor Total</th>
                          <th className="pb-2.5 px-2 w-28 hidden sm:table-cell text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">% Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                        {credoresPaginados.map((c, i) => {
                          const rank = (credoresPage - 1) * PER_PAGE + i + 1
                          const pct = kpiValorTotal > 0 ? Math.round((c.valor / kpiValorTotal) * 100) : 0
                          return (
                            <tr key={c.label} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                              <td className="py-3 px-1 text-xs font-bold text-gray-300 dark:text-slate-600">{rank}</td>
                              <td className="py-3 px-2 font-medium text-gray-900 dark:text-white max-w-[200px]">
                                <span className="truncate block" title={c.label}>{c.label}</span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold">
                                  {c.qtd}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-bold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.valor)}</td>
                              <td className="py-3 px-2 hidden sm:table-cell">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                                  <div className="w-16 h-1.5 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                    <div className="h-1.5 bg-blue-500 rounded-full transition-all duration-700" style={{ width: pct + '%' }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Paginacao total={credoresFiltrados.length} page={credoresPage} onChange={setCredoresPage} />
                </>
              )
            }
          </DashCard>

          {/* ── Secretarias + Vigência ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <DashCard icon={Building2} title="Top Secretarias Contratantes" badge={`${topSecretarias.length}`}>
              {topSecretarias.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">Sem dados</p>
                : (
                  <div className="space-y-3.5">
                    {topSecretarias.map((s, i) => {
                      const maxVal = topSecretarias[0]?.valor || 1
                      return (
                        <BarRow
                          key={s.label}
                          label={s.label}
                          value={fmtMoeda(s.valor)}
                          pct={Math.min(100, (s.valor / maxVal) * 100)}
                          color={MODAL_CORES[i % MODAL_CORES.length]}
                          extra={`${s.qtd} contrato${s.qtd !== 1 ? 's' : ''}`}
                        />
                      )
                    })}
                  </div>
                )
              }
            </DashCard>

            <DashCard icon={Clock3} title="Vigência dos Contratos Ativos" badge={`${kpiAtivos} ativos`}>
              <div className="space-y-2.5">
                {[
                  { label: 'Com prazo vigente',      value: vigencia.vigente,    color: 'bg-green-500',  text: 'text-green-700 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/10',   ring: 'ring-green-200 dark:ring-green-900/30'   },
                  { label: 'Vencendo em 30 dias',    value: vigencia.vencendo30, color: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/10', ring: 'ring-yellow-200 dark:ring-yellow-900/30' },
                  { label: 'Vencendo em 31–90 dias', value: vigencia.vencendo90, color: 'bg-orange-400', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10', ring: 'ring-orange-200 dark:ring-orange-900/30' },
                  { label: 'Prazo expirado',         value: vigencia.expirados,  color: 'bg-red-500',    text: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/10',       ring: 'ring-red-200 dark:ring-red-900/30'       },
                  { label: 'Sem data de vigência',   value: vigencia.semData,    color: 'bg-gray-400',   text: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-50 dark:bg-slate-800/40',    ring: 'ring-gray-200 dark:ring-slate-700/50'   },
                ].map(item => {
                  const pct = kpiAtivos > 0 ? Math.min(100, Math.round((item.value / kpiAtivos) * 100)) : 0
                  return (
                    <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl ${item.bg} ring-1 ${item.ring}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-xs font-semibold ${item.text}`}>{item.label}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <span className={`text-xs ${item.text}`}>{pct}%</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
                          <div className={`h-1.5 ${item.color} rounded-full transition-all duration-700`} style={{ width: pct + '%' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </DashCard>
          </div>

          {/* ── Por Categoria ────────────────────────────────────────────── */}
          {porCategoria.length > 1 && (
            <DashCard icon={Tag} title="Por Categoria / Tipo de Contrato" badge={`${porCategoria.length} tipos`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {porCategoria.map((cat, i) => {
                  const pct = kpiTotal > 0 ? Math.round((cat.qtd / kpiTotal) * 100) : 0
                  const paleta = [
                    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-400',   bar: 'bg-blue-500'   },
                    { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', bar: 'bg-purple-500' },
                    { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-700 dark:text-teal-400',   bar: 'bg-teal-500'   },
                    { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', bar: 'bg-indigo-500' },
                    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    text: 'text-cyan-700 dark:text-cyan-400',   bar: 'bg-cyan-500'   },
                    { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', bar: 'bg-violet-500' },
                  ]
                  const p = paleta[i % paleta.length]
                  return (
                    <div key={cat.label} className={`p-4 rounded-xl ${p.bg} flex flex-col gap-1`}>
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-xs font-bold uppercase tracking-wide leading-tight ${p.text}`}>{cat.label}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{pct}%</span>
                      </div>
                      <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white leading-none">{cat.qtd}</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{fmtMoeda(cat.valor)}</p>
                      <div className="mt-1 h-1 bg-white/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                        <div className={`h-1 ${p.bar} rounded-full transition-all duration-700`} style={{ width: pct + '%' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </DashCard>
          )}

          {/* ── Ranking de Contratos por Valor (paginado) ────────────────── */}
          <DashCard icon={TrendingUp} title="Ranking de Contratos por Valor" badge={`${todosComValor.length} registros`}>
            {/* Controles */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input-field w-full pl-9 text-sm"
                  placeholder="Buscar nº contrato, objeto ou credor..."
                  value={contratosBusca}
                  onChange={e => handleContratosBusca(e.target.value)}
                />
                {contratosBusca && (
                  <button onClick={() => handleContratosBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                className="input-field text-sm flex-shrink-0"
                style={{ width: 'auto', minWidth: '130px' }}
                value={contratosStatus}
                onChange={e => handleContratosStatus(e.target.value)}
              >
                <option value="">Todos os status</option>
                {opcoesStatus.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {maioresFiltrados.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">Nenhum contrato encontrado</p>
              : (
                <>
                  <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700/50">
                          <th className="text-left pb-2.5 px-1 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                          <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nº Contrato</th>
                          <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Objeto</th>
                          <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Credor</th>
                          <th className="text-center pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                          <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell whitespace-nowrap">Vigência Fim</th>
                          <th className="text-right pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                        {maioresPaginados.map((c, i) => {
                          const rank = (contratosPage - 1) * PER_PAGE + i + 1
                          const cor = STATUS_COR[c.status] || { badge: 'bg-gray-100 text-gray-600' }
                          const d = c.vigencia_fim ? diasAte(c.vigencia_fim) : null
                          const alerta = d !== null && d >= 0 && d <= 30
                          return (
                            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-1 text-xs font-bold text-gray-300 dark:text-slate-600">{rank}</td>
                              <td className="py-3 px-2 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap text-xs">{c.numero_contrato}</td>
                              <td className="py-3 px-2 text-gray-600 dark:text-slate-400 max-w-[180px] hidden md:table-cell">
                                <span className="truncate block" title={c.objeto}>{c.objeto || '—'}</span>
                              </td>
                              <td className="py-3 px-2 text-gray-700 dark:text-slate-300 max-w-[140px] hidden lg:table-cell">
                                <span className="truncate block">{nomeCredor(c.credor_id)}</span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cor.badge}`}>
                                  {c.status || '—'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-xs hidden sm:table-cell whitespace-nowrap">
                                {alerta
                                  ? <span className="font-semibold text-yellow-600 dark:text-yellow-400">{fmtData(c.vigencia_fim)} <span className="text-yellow-500">({d}d)</span></span>
                                  : <span className="text-gray-500 dark:text-slate-400">{c.vigencia_fim ? fmtData(c.vigencia_fim) : '—'}</span>
                                }
                              </td>
                              <td className="py-3 px-2 text-right font-bold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.valor)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Paginacao total={maioresFiltrados.length} page={contratosPage} onChange={setContratosPage} />
                </>
              )
            }
          </DashCard>

          {/* ── Ordens de Compra / Serviço ───────────────────────────────── */}
          <DashCard icon={ClipboardList} title="Ordens de Compra / Serviço" badge={`${ordensKpi.total} ordens`}>
            {ordensKpi.total === 0
              ? <p className="text-sm text-gray-400 text-center py-6">Nenhuma ordem emitida</p>
              : (
                <div className="space-y-5">
                  {/* KPIs de ordens */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { icon: ClipboardList, label: 'Total de Ordens',   value: ordensKpi.total,       color: 'from-slate-500 to-slate-600' },
                      { icon: ShoppingCart,  label: 'Ordens de Compra',  value: ordensKpi.compras,     color: 'from-blue-500 to-indigo-600' },
                      { icon: Wrench,        label: 'Ordens de Serviço', value: ordensKpi.servicos,    color: 'from-orange-500 to-amber-600' },
                      { icon: AlertTriangle, label: 'Emitidas',          value: ordensKpi.emitidas,    color: 'from-yellow-400 to-orange-500' },
                      { icon: CheckCircle2,  label: 'Atendidas',         value: ordensKpi.atendidas,   color: 'from-green-500 to-emerald-600' },
                      { icon: DollarSign,    label: 'Valor Emitido',     value: fmtMoeda(ordensKpi.valorTotal), color: 'from-teal-500 to-cyan-600' },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <p className="text-base font-black text-gray-900 dark:text-white tabular-nums leading-tight">{value}</p>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Por contrato */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Valor por Contrato</p>
                      {ordensPorContrato.length === 0
                        ? <p className="text-xs text-gray-400 text-center py-4">Sem dados</p>
                        : (
                          <div className="space-y-2.5">
                            {ordensPorContrato.map((item, i) => {
                              const maxVal = ordensPorContrato[0]?.valor || 1
                              return (
                                <BarRow
                                  key={item.label}
                                  label={item.label}
                                  value={fmtMoeda(item.valor)}
                                  pct={Math.min(100, (item.valor / maxVal) * 100)}
                                  color={MODAL_CORES[i % MODAL_CORES.length]}
                                  extra={`${item.qtd} ordem(ns)`}
                                />
                              )
                            })}
                          </div>
                        )
                      }
                    </div>

                    {/* Por secretaria */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Valor por Secretaria</p>
                      {ordensPorSecretaria.length === 0
                        ? <p className="text-xs text-gray-400 text-center py-4">Sem dados</p>
                        : (
                          <div className="space-y-2.5">
                            {ordensPorSecretaria.map((item, i) => {
                              const maxVal = ordensPorSecretaria[0]?.valor || 1
                              return (
                                <BarRow
                                  key={item.label}
                                  label={item.label}
                                  value={fmtMoeda(item.valor)}
                                  pct={Math.min(100, (item.valor / maxVal) * 100)}
                                  color={MODAL_CORES[(i + 4) % MODAL_CORES.length]}
                                  extra={`${item.qtd} ordem(ns)`}
                                />
                              )
                            })}
                          </div>
                        )
                      }
                    </div>
                  </div>

                  {/* Status das ordens */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Status das Ordens</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'EMITIDA',   value: ordensKpi.emitidas,   bg: 'bg-yellow-50 dark:bg-yellow-900/10', text: 'text-yellow-700 dark:text-yellow-400', bar: 'bg-yellow-400',  ring: 'ring-yellow-200 dark:ring-yellow-900/30' },
                        { label: 'ATENDIDA',  value: ordensKpi.atendidas,  bg: 'bg-green-50 dark:bg-green-900/10',   text: 'text-green-700 dark:text-green-400',   bar: 'bg-green-500',   ring: 'ring-green-200 dark:ring-green-900/30'   },
                        { label: 'CANCELADA', value: ordensKpi.canceladas, bg: 'bg-red-50 dark:bg-red-900/10',       text: 'text-red-700 dark:text-red-400',       bar: 'bg-red-500',     ring: 'ring-red-200 dark:ring-red-900/30'       },
                      ].map(item => {
                        const pct = ordensKpi.total > 0 ? Math.round((item.value / ordensKpi.total) * 100) : 0
                        return (
                          <div key={item.label} className={`p-3 rounded-xl ${item.bg} ring-1 ${item.ring}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${item.text} mb-1`}>{item.label}</p>
                            <p className={`text-2xl font-black ${item.text}`}>{item.value}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{pct}% do total</p>
                            <div className="mt-2 h-1 bg-white/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
                              <div className={`h-1 ${item.bar} rounded-full`} style={{ width: pct + '%' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }
          </DashCard>
        </>
      )}
    </div>
  )
}
