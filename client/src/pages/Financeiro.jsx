import { useState, useEffect, useCallback, useRef } from 'react'
import { timbradoFundoCSS } from '../utils/timbradoStore'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { hasPerm } from '../utils/permissions'
import { conferirAbasDoModulo } from '../utils/permissoesSchema'
import {
  LayoutDashboard, FileText, BarChart3,
  Calendar, FolderOpen, Tag, Building2, Landmark, DollarSign,
  Search, X, RefreshCw, FileDown, Eye,
  CheckCircle2, Clock3, AlertCircle,
  Loader2, AlertTriangle, TrendingUp, ChevronDown, ClipboardCheck,
} from 'lucide-react'
import api from '../services/api'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend as RLegend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart
} from 'recharts'
import { PageHeader, SectionTitle, ActionBar } from '../components/ui'
import LoadingBar from '../components/LoadingBar'
import { Paginacao, usePorPagina } from '../components/ui'
import { gerarPainelPDF } from './financeiro/gerarPainelPDF'
import { gerarDidPDF } from './did/gerarDidPDF'
import { useAuth } from '../context/AuthContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtMoeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(v) || 0)

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, dia] = (d.split('T')[0]).split('-')
  return `${dia}/${m}/${y}`
}

// Números novos já vêm formatados por secretaria (ex: "SEJUV-001"); números
// antigos são só o sequencial global e recebem o zero-padding legado.
const fmtNumeroDid = (numeroDid) => {
  if (!numeroDid) return '—'
  const str = String(numeroDid)
  return /^[A-Za-z]+-\d+$/.test(str) ? str : `DID-${str.padStart(3, '0')}`
}

// Situação financeira granular do DID: pago > liquidado a pagar > empenhado a pagar > pendente.
// "Liquidado" mora em colunas diferentes conforme o tipo (Fixas: contabil_liquidado / Variáveis: contabil_pc_liquidado).
const situacaoDid = (d) => {
  if (!d) return null
  if (d.pago === 'sim') {
    return { label: 'Pago', cls: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400', Icon: CheckCircle2 }
  }
  const liquidado = d.contabil_liquidado === 'sim' || d.contabil_pc_liquidado === 'sim'
  if (liquidado) {
    return { label: 'Liquidado a pagar', cls: 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-400', Icon: ClipboardCheck }
  }
  if (d.contabil_empenhado === 'sim') {
    return { label: 'Empenhado a pagar', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', Icon: FileText }
  }
  return { label: 'Pendente', cls: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400', Icon: Clock3 }
}

function SituacaoDidBadge({ d }) {
  const s = situacaoDid(d)
  if (!s) return '—'
  const { label, cls, Icon } = s
  return (
    <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ' + cls}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}

// Converte valor em formato BRL para número (ex: "R$ 1.000,50" → 1000.50)
const parseBRL = (s) => {
  if (!s) return null
  const clean = String(s).replace(/R\$\s*/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

const CATEGORIAS = ['material', 'servicos', 'pessoal', 'obras', 'outros']
const TIPOS = ['empenho', 'liquidacao', 'pagamento', 'receita', 'outros']
const STATUS_LABELS = {
  pendente: { label: 'Pendente', color: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400', emoji: '⏳' },
  pago:     { label: 'Pago',     color: 'bg-success-100  text-success-700  dark:bg-success-900/30  dark:text-success-400',  emoji: '✅' },
  vencido:  { label: 'Vencido',  color: 'bg-danger-100    text-danger-700    dark:bg-danger-900/30    dark:text-danger-400',    emoji: '🔴' },
  cancelado:{ label: 'Cancelado',color: 'bg-ink-100   text-ink-600',   emoji: '❌' },
}
const PROC_STATUS = {
  aberto:     { label: 'Aberto',      color: 'bg-info-100   text-brand-700   dark:bg-info-900/30   dark:text-info-400' },
  em_analise: { label: 'Em Análise',  color: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' },
  concluido:  { label: 'Concluído',   color: 'bg-success-100  text-success-700  dark:bg-success-900/30  dark:text-success-400' },
  devolvido:  { label: 'Devolvido',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  arquivado:  { label: 'Arquivado',   color: 'bg-ink-100   text-ink-600' },
}
const TABS = [
  { id: 'painel',    label: 'Painel',        Icon: LayoutDashboard, permPath: ['financeiro', 'painel',        'ver'] },
  { id: 'processos', label: 'Processos DID', Icon: FileText,        permPath: ['financeiro', 'processos_did', 'ver'] },
  { id: 'relatorio', label: 'Relatório',     Icon: BarChart3,       permPath: ['financeiro', 'relatorio',     'ver'] },
]
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_NOMES = [
  { v: '01', l: 'Janeiro' }, { v: '02', l: 'Fevereiro' }, { v: '03', l: 'Março' },
  { v: '04', l: 'Abril' },   { v: '05', l: 'Maio' },      { v: '06', l: 'Junho' },
  { v: '07', l: 'Julho' },  { v: '08', l: 'Agosto' },    { v: '09', l: 'Setembro' },
  { v: '10', l: 'Outubro' },{ v: '11', l: 'Novembro' },  { v: '12', l: 'Dezembro' },
]

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-ink-200">
          <h3 className="font-bold text-ink-900 dark:text-white text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Card de métrica ──────────────────────────────────────────────────────────
function MetricCard({ Icon, emoji, label, value, sub, color = 'blue' }) {
  const gradients = {
    blue:   'from-info-500   to-indigo-600',
    green:  'from-success-500  to-emerald-600',
    yellow: 'from-warning-400 to-orange-500',
    red:    'from-danger-500    to-danger-600',
    purple: 'from-purple-500 to-violet-600',
    orange: 'from-orange-500 to-amber-600',
    indigo: 'from-indigo-500 to-info-700',
  }
  const IconComponent = Icon || null
  const str = String(value ?? '')
  const len = Math.max(str.length, 1)
  // Escala linear: 1.875rem para ≤7 chars → 1rem para 17 chars → mín 0.85rem
  // R$ 125.000.000,00 (17 chars) → 1rem, sempre sem quebra de linha
  const autoFontSize = Math.min(1.875, Math.max(0.85, 1.875 - 0.0875 * (len - 7))) + 'rem'
  return (
    <div className="bg-surface border border-ink-100 rounded-2xl p-5 min-h-[120px] min-w-0 overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center shadow-md flex-shrink-0`}>
          {IconComponent
            ? <IconComponent className="w-6 h-6 text-white" />
            : <span className="text-xl">{emoji}</span>
          }
        </div>
        {sub && <span className="text-xs text-ink-400 mt-1 text-right leading-tight shrink-0 max-w-[55%]">{sub}</span>}
      </div>
      <div className="mt-3 min-w-0">
        <p
          className="font-bold tabular-nums whitespace-nowrap text-ink-900 dark:text-white leading-tight"
          style={{ fontSize: autoFontSize }}
        >{value}</p>
        <p className="text-sm text-ink-500 mt-0.5 leading-snug truncate">{label}</p>
      </div>
    </div>
  )
}

// ─── MultiSelect pesquisável ──────────────────────────────────────────────────
function MultiSelect({ label, placeholder, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)
  useEffect(() => {
    if (!open) { setBusca('') ; return }
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    setTimeout(() => inputRef.current?.focus(), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  const filtered = options.filter(opt => {
    const l = opt.l ?? opt
    return String(l).toLowerCase().includes(busca.toLowerCase())
  })

  return (
    <div className="relative" ref={ref}>
      {label && <p className="text-xs font-medium text-ink-500 mb-1">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input-field w-full text-left flex items-center justify-between gap-2 text-sm min-h-[38px]"
      >
        <span className={selected.length === 0 ? 'text-ink-400' : 'text-ink-900 dark:text-white truncate'}>
          {selected.length === 0 ? placeholder
            : selected.length === 1 ? (options.find(o => (o.v ?? o) === selected[0])?.l ?? selected[0])
            : `${selected.length} selecionados`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-ink-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-info-100 text-brand-700 dark:bg-info-900/40 dark:text-info-300 rounded-full text-[11px] font-medium">
              {options.find(o => (o.v ?? o) === v)?.l ?? v}
              <button type="button" onClick={e => { e.stopPropagation(); toggle(v) }} className="hover:text-danger-500 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="absolute z-40 mt-1 w-full bg-surface border border-ink-200 rounded-xl shadow-xl" style={{ minWidth: '200px' }}>
          <div className="p-2 border-b border-ink-100">
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="w-full text-xs px-2 py-1.5 rounded-lg bg-ink-50 border border-ink-200 text-ink-700 outline-hidden focus:ring-1 focus:ring-brand-500"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-ink-400 text-center py-3">Nenhuma opção encontrada</p>
            )}
            {filtered.map(opt => {
              const v = opt.v ?? opt
              const l = opt.l ?? opt
              const checked = selected.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggle(v)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                    checked ? 'bg-info-50 dark:bg-info-900/20 text-brand-700 dark:text-info-300' : 'text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-sm border-2 shrink-0 flex items-center justify-center text-[10px] transition-colors ${
                    checked ? 'bg-info-500 border-brand-500 text-white' : 'border-ink-300'
                  }`}>{checked ? '✓' : ''}</span>
                  <span className="truncate">{l}</span>
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-ink-100">
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false) }}
                className="w-full text-xs text-danger-500 hover:text-danger-600 py-1 text-center"
              >Limpar seleção</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal: Visualizar DID (somente leitura) ─────────────────────────────────
function ModalVerDid({ processoId, tenant, onClose }) {
  const [did, setDid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    api.get(`/did/processo/${processoId}`)
      .then(r => setDid(r.data.did))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [processoId])

  const DESCONTO_KEYS = ['desconto_inss', 'desconto_iss', 'desconto_irrf', 'desconto_sindicato',
    'desconto_bb', 'desconto_caixa', 'desconto_pensao', 'desconto_outros']
  const calcVliq = (d) =>
    (parseFloat(d.valor_bruto) || 0) -
    DESCONTO_KEYS.reduce((acc, k) => acc + (parseFloat(d[k]) || 0), 0)

  const handlePDF = async () => {
    if (!did) return
    setGerando(true)
    try {
      await gerarDidPDF({ form: did, itensDid: did.itens_did || [], vliq: calcVliq(did), tenant, tipoDid: did.tipo_did })
    } finally { setGerando(false) }
  }

  const fmtD = (d) => {
    if (!d) return null
    const s = d.split('T')[0].split('-')
    return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : d
  }
  const fmtM = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(v) || 0)
  const simNao = (v) => v === 'sim' ? '✅ Sim' : v === 'nao' ? '❌ Não' : null
  const hasAny = (...vals) => vals.some(v => v !== null && v !== undefined && String(v).trim() !== '')

  // Linha label+valor — só renderiza se houver valor
  const R = ({ l, v }) => (v !== null && v !== undefined && String(v).trim()) ? (
    <div className="flex gap-2 py-0.5">
      <span className="text-[11px] text-ink-400 w-44 shrink-0 pt-0.5">{l}</span>
      <span className="text-[12px] font-medium text-ink-900 dark:text-white">{v}</span>
    </div>
  ) : null

  const SecBar = ({ num, titulo, color }) => (
    <div className={`flex items-center gap-2 px-4 py-2 ${color}`}>
      <span className="text-[10px] font-bold text-white bg-black/25 rounded-sm px-1.5 py-0.5">{num}</span>
      <span className="text-xs font-semibold text-white uppercase tracking-wide">{titulo}</span>
    </div>
  )

  const Sec = ({ num, titulo, color, children }) => (
    <div className="card overflow-hidden">
      <SecBar num={num} titulo={titulo} color={color} />
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
        {children}
      </div>
    </div>
  )

  const Chips = ({ items }) => (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.filter(Boolean).map((item, i) => (
        <span key={i} className="text-[11px] bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 px-2 py-0.5 rounded-full">{item}</span>
      ))}
    </div>
  )

  const isVar = did?.tipo_did === 'variaveis'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '94vh' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3 bg-ink-900 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {loading && <span className="text-ink-400 text-sm">Carregando...</span>}
            {!loading && !did && <span className="text-ink-400 text-sm">DID não encontrado</span>}
            {did && (
              <>
                <span className="font-mono font-bold text-white text-base">
                  {fmtNumeroDid(did.numero_did)}
                </span>
                <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                  isVar ? 'bg-purple-500/30 text-purple-200' : 'bg-info-500/30 text-info-200'
                )}>
                  {isVar ? 'Contas Variáveis' : 'Contas Fixas'}
                </span>
                <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                  did.pago === 'sim' ? 'bg-success-500/30 text-success-300' : 'bg-warning-500/30 text-warning-300'
                )}>
                  {did.pago === 'sim' ? <><CheckCircle2 className="w-3 h-3" /> Pago</> : <><Clock3 className="w-3 h-3" /> Pendente</>}
                </span>
                {did.secretaria_sec1 && <span className="text-xs text-ink-400">· {did.secretaria_sec1}</span>}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handlePDF} disabled={!did || gerando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-info-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
              {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Gerar PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-700 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {loading ? (
            <LoadingBar label="Carregando DID..." />
          ) : !did ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-ink-400">
              <AlertTriangle className="w-8 h-8 text-warning-500" />
              <span className="text-sm">DID não encontrado ou não preenchido para este processo.</span>
            </div>
          ) : (
            <>
              {/* ══ SEÇÃO I — Dados Gerais (comum aos dois tipos) ══ */}
              <Sec num="I" titulo="Dados Gerais" color="bg-brand-700">
                <R l="Objeto" v={did.objeto} />
                <R l="Data DID" v={fmtD(did.data_did)} />
                <R l="Secretaria" v={did.secretaria_sec1} />
                <R l="Secretário(a)" v={did.secretario_nome} />
                <R l="Fonte de Recurso" v={did.fonte_recurso} />
                {!isVar && <R l="Contrato de Referência" v={did.contrato_ref} />}
                <R l="Credor" v={did.credor_sec1} />
                <R l="CNPJ / CPF" v={did.cnpj_cpf_credor_sec1} />
                {!isVar && <R l="Nº Licitação" v={did.nro_licitacao_sec1} />}
                {!isVar && <R l="Modalidade" v={did.tipo_licitacao_sec1} />}
                <R l="Mês de Referência" v={did.mes_referencia} />
                <R l="Nota Fiscal" v={did.nf_sec1} />
                {isVar && <R l="Valor DID" v={did.valor_did ? fmtM(did.valor_did) : null} />}
                <R l="Detalhes em Anexo" v={did.detalhes_em_anexo ? '✅ Sim' : null} />
                {hasAny(did.cert_sec1_municipal, did.cert_sec1_trabalhista, did.cert_sec1_fgts, did.cert_sec1_estadual, did.cert_sec1_federal, did.cert_sec1_simples_nac) && (
                  <div className="col-span-2 mt-1">
                    <span className="text-[11px] text-ink-400">Certidões (Sec. I)</span>
                    <Chips items={[
                      did.cert_sec1_municipal      && '✅ Municipal',
                      did.cert_sec1_trabalhista    && '✅ Trabalhista',
                      did.cert_sec1_fgts           && '✅ FGTS',
                      did.cert_sec1_estadual       && '✅ Estadual',
                      did.cert_sec1_federal        && '✅ Federal',
                      did.cert_sec1_simples_nac    && '✅ Simples Nacional',
                    ]} />
                  </div>
                )}
              </Sec>

              {/* ══ SEÇÃO II — Controle Interno (comum) ══ */}
              <Sec num="II" titulo="Controle Interno" color="bg-indigo-700">
                <R l="Recebido em" v={fmtD(did.ci_recebido_em)} />
                <R l="Responsável" v={did.ci_responsavel} />
                {did.despacho_ci && (
                  <div className="col-span-2 mt-1">
                    <span className="text-[11px] text-ink-400">Despacho via C.I.</span>
                    <p className="text-[12px] text-ink-800 mt-0.5 whitespace-pre-wrap">{did.despacho_ci}</p>
                  </div>
                )}
              </Sec>

              {/* ══ ITENS ══ */}
              {did.itens_did?.length > 0 && (
                <div className="card overflow-hidden">
                  <SecBar num="ITENS" titulo="Itens do DID" color="bg-teal-700" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-ink-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-ink-500">Descrição</th>
                          <th className="text-center py-2 px-3 font-semibold text-ink-500 w-16">Unid.</th>
                          <th className="text-right py-2 px-3 font-semibold text-ink-500 w-20">Qtd.</th>
                          <th className="text-right py-2 px-3 font-semibold text-ink-500 w-28">Vlr. Unit.</th>
                          <th className="text-right py-2 px-3 font-semibold text-ink-500 w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200">
                        {did.itens_did.map((it, i) => (
                          <tr key={i} className="hover:bg-ink-50">
                            <td className="py-2 px-3 text-ink-800">{it.descricao || '—'}</td>
                            <td className="py-2 px-3 text-center text-ink-500">{it.unidade || '—'}</td>
                            <td className="py-2 px-3 text-right text-ink-700">{it.quantidade || '—'}</td>
                            <td className="py-2 px-3 text-right text-ink-700">{it.valor_unitario ? fmtM(it.valor_unitario) : '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-ink-900 dark:text-white">{it.valor_total ? fmtM(it.valor_total) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-ink-100">
                          <td colSpan={4} className="py-2 px-3 text-right text-xs font-semibold text-ink-600">Total Itens</td>
                          <td className="py-2 px-3 text-right font-bold text-brand-600 dark:text-info-400">
                            {fmtM(did.itens_did.reduce((acc, it) => acc + (parseFloat(it.valor_total) || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  SEÇÕES ESPECÍFICAS — CONTAS FIXAS (III–VII)
                  ══════════════════════════════════════════════ */}
              {!isVar && (<>

                {/* III — Finanças (pré-empenho) */}
                <Sec num="III" titulo="Secretaria de Finanças" color="bg-teal-700">
                  <R l="Recebido em" v={fmtD(did.financas_recebido_em)} />
                  <R l="Responsável" v={did.financas_responsavel} />
                </Sec>

                {/* IV — Contabilidade */}
                <Sec num="IV" titulo="Contabilidade" color="bg-purple-700">
                  <R l="Recebido em" v={fmtD(did.contabil_recebido_em)} />
                  <R l="Responsável" v={did.contabil_responsavel} />
                  <R l="Auditor" v={did.contabil_auditor} />
                  <R l="Nº Empenho" v={did.empenho_numero} />
                  <R l="Tipo Empenho" v={did.tipo_empenho} />
                  <R l="Data Empenho" v={fmtD(did.data_empenho)} />
                  <R l="Nº Liquidação" v={did.liquidacao_numero} />
                  <R l="Data Liquidação" v={fmtD(did.data_liquidacao)} />
                  <R l="Doc. Caixa" v={did.doc_caixa} />
                </Sec>

                {/* V — Finanças (pós-empenho) */}
                <Sec num="V" titulo="Secretaria de Finanças (Pós-Empenho)" color="bg-teal-700">
                  <R l="Recebido em" v={fmtD(did.financas2_recebido_em)} />
                  <R l="Responsável" v={did.financas2_responsavel} />
                  <R l="Enviado p/ Pagamento" v={fmtD(did.financas2_enviado_pagamento)} />
                </Sec>

                {/* VI — Tesouraria */}
                <div className="card overflow-hidden">
                  <SecBar num="VI" titulo="Tesouraria" color="bg-success-800" />
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                    <R l="Recebido em" v={fmtD(did.tesouraria_recebido_em)} />
                    <R l="Responsável" v={did.tesouraria_responsavel} />
                    <R l="Banco Pagador" v={did.banco_pagador} />
                    <R l="Ag. Pagador" v={did.ag_pagador} />
                    <R l="C/C Pagador" v={did.cc_pagador} />
                    {/* Certidões Tesouraria */}
                    {hasAny(did.cert_teso_cnd, did.cert_teso_fgts, did.cert_teso_estadual, did.cert_teso_trabalhista, did.cert_teso_municipal) && (
                      <div className="col-span-2 mt-1">
                        <span className="text-[11px] text-ink-400">Certidões</span>
                        <Chips items={[
                          did.cert_teso_cnd        && '✅ Unificada',
                          did.cert_teso_fgts       && '✅ FGTS',
                          did.cert_teso_estadual   && '✅ Estadual',
                          did.cert_teso_trabalhista && '✅ Trabalhista',
                          did.cert_teso_municipal  && '✅ Municipal',
                        ]} />
                      </div>
                    )}
                    {/* Descontos */}
                    {[
                      { k: 'desconto_inss', l: 'Desconto INSS' }, { k: 'desconto_iss', l: 'Desconto ISS' },
                      { k: 'desconto_irrf', l: 'Desconto IRRF' }, { k: 'desconto_outros', l: 'Outros Descontos' },
                    ].filter(d2 => parseFloat(did[d2.k]) > 0).map(d2 => (
                      <R key={d2.k} l={d2.l} v={fmtM(did[d2.k])} />
                    ))}
                    {parseFloat(did.valor_bruto) > 0 && (
                      <>
                        <R l="Valor Bruto" v={fmtM(did.valor_bruto)} />
                        <R l="Valor Líquido" v={fmtM(calcVliq(did))} />
                      </>
                    )}
                    {/* Status */}
                    <div className="col-span-2 mt-2 flex items-center gap-3">
                      <span className="text-[11px] text-ink-400 w-44">Status de Pagamento</span>
                      <span className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ' + (did.pago === 'sim' ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300' : 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300')}>
                        {did.pago === 'sim' ? <><CheckCircle2 className="w-3 h-3" /> Pago</> : <><Clock3 className="w-3 h-3" /> Pendente</>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VII — Contabilidade Fechamento */}
                <Sec num="VII" titulo="Contabilidade — Fechamento" color="bg-purple-900">
                  <R l="Processo Finalizado" v={simNao(did.contab_fech_finalizado)} />
                  <R l="Enviado para TCE/SIM" v={simNao(did.contab_fech_tce)} />
                </Sec>

              </>)}

              {/* ══════════════════════════════════════════════
                  SEÇÕES ESPECÍFICAS — CONTAS VARIÁVEIS (III–XII)
                  ══════════════════════════════════════════════ */}
              {isVar && (<>

                {/* III — Finanças pré-empenho */}
                <Sec num="III" titulo="Secretaria de Finanças" color="bg-teal-700">
                  <R l="Recebido em" v={fmtD(did.financas_recebido_em)} />
                  <R l="Responsável" v={did.financas_responsavel} />
                </Sec>

                {/* IV — Compras (Solicitação de Empenho) */}
                <Sec num="IV" titulo="Setor de Compras — Solicitação de Empenho" color="bg-amber-700">
                  <R l="Recebido em" v={fmtD(did.compras2_recebido_em)} />
                  <R l="Responsável" v={did.compras2_responsavel} />
                  <R l="Nº Empenho Solic." v={did.compras2_nro_empenho_solicitacao} />
                </Sec>

                {/* V — Contabilidade (Empenho) */}
                <Sec num="V" titulo="Contabilidade — Empenho" color="bg-purple-700">
                  <R l="Recebido em" v={fmtD(did.contabil_recebido_em)} />
                  <R l="Responsável" v={did.contabil_responsavel} />
                  <R l="Auditor" v={did.contabil_auditor} />
                  <R l="Nº Empenho" v={did.empenho_numero} />
                  <R l="Tipo Empenho" v={did.tipo_empenho} />
                  <R l="Data Empenho" v={fmtD(did.data_empenho)} />
                </Sec>

                {/* VI — Compras (Ordem de Compra) */}
                <Sec num="VI" titulo="Setor de Compras — Ordem de Compra" color="bg-amber-700">
                  <R l="Recebido em" v={fmtD(did.compras_recebido_em)} />
                  <R l="Responsável" v={did.compras_responsavel} />
                  <R l="Nº Empenho Solic." v={did.nro_empenho_solicitacao} />
                  <R l="Local de Entrega" v={did.local_entrega} />
                </Sec>

                {/* VII — Recebimento de Material */}
                <Sec num="VII" titulo="Recebimento de Material" color="bg-cyan-700">
                  <R l="Data de Recebimento" v={fmtD(did.receb_data)} />
                  <R l="Responsável" v={did.receb_responsavel} />
                  <R l="Cargo" v={did.receb_cargo} />
                  <R l="Data NF" v={fmtD(did.receb_nf_data)} />
                  <R l="NF Enviada às Compras" v={fmtD(did.receb_nf_enviado_compras)} />
                  {did.receb_obs && (
                    <div className="col-span-2 mt-1">
                      <span className="text-[11px] text-ink-400">Observações</span>
                      <p className="text-[12px] text-ink-800 mt-0.5 whitespace-pre-wrap">{did.receb_obs}</p>
                    </div>
                  )}
                </Sec>

                {/* VIII — Compras (Ateste de NF) */}
                <Sec num="VIII" titulo="Setor de Compras — Ateste de NF" color="bg-amber-700">
                  <R l="Recebido em" v={fmtD(did.compras3_recebido_em)} />
                  <R l="Responsável" v={did.compras3_responsavel} />
                  <R l="Local de Entrega" v={fmtD(did.compras3_local_entrega)} />
                </Sec>

                {/* IX — Contabilidade (Liquidação) */}
                <Sec num="IX" titulo="Contabilidade — Liquidação" color="bg-purple-700">
                  <R l="Recebido em" v={fmtD(did.contabil_pc_recebido_em)} />
                  <R l="Responsável" v={did.contabil_pc_responsavel} />
                  <R l="Auditor" v={did.contabil_pc_auditor} />
                  <R l="Nº Liquidação" v={did.contabil_pc_liquidacao_numero} />
                  <R l="Data Liquidação" v={fmtD(did.contabil_pc_data_liquidacao)} />
                </Sec>

                {/* X — Finanças (pós-empenho) */}
                <Sec num="X" titulo="Secretaria de Finanças (Envio p/ Pagamento)" color="bg-teal-700">
                  <R l="Recebido em" v={fmtD(did.financas2_recebido_em)} />
                  <R l="Responsável" v={did.financas2_responsavel} />
                  <R l="Enviado p/ Pagamento" v={fmtD(did.financas2_enviado_pagamento)} />
                </Sec>

                {/* XI — Tesouraria */}
                <div className="card overflow-hidden">
                  <SecBar num="XI" titulo="Tesouraria" color="bg-success-800" />
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                    <R l="Recebido em" v={fmtD(did.tesouraria_recebido_em)} />
                    <R l="Responsável" v={did.tesouraria_responsavel} />
                    <R l="Banco Pagador" v={did.banco_pagador} />
                    <R l="Ag. Pagador" v={did.ag_pagador} />
                    <R l="C/C Pagador" v={did.cc_pagador} />
                    {/* Certidões Tesouraria */}
                    {hasAny(did.cert_teso_cnd, did.cert_teso_fgts, did.cert_teso_estadual, did.cert_teso_trabalhista, did.cert_teso_municipal) && (
                      <div className="col-span-2 mt-1">
                        <span className="text-[11px] text-ink-400">Certidões</span>
                        <Chips items={[
                          did.cert_teso_cnd        && '✅ Unificada',
                          did.cert_teso_fgts       && '✅ FGTS',
                          did.cert_teso_estadual   && '✅ Estadual',
                          did.cert_teso_trabalhista && '✅ Trabalhista',
                          did.cert_teso_municipal  && '✅ Municipal',
                        ]} />
                      </div>
                    )}
                    {[
                      { k: 'desconto_inss', l: 'Desconto INSS' }, { k: 'desconto_iss', l: 'Desconto ISS' },
                      { k: 'desconto_irrf', l: 'Desconto IRRF' }, { k: 'desconto_outros', l: 'Outros Descontos' },
                    ].filter(d2 => parseFloat(did[d2.k]) > 0).map(d2 => (
                      <R key={d2.k} l={d2.l} v={fmtM(did[d2.k])} />
                    ))}
                    {parseFloat(did.valor_bruto) > 0 && (
                      <>
                        <R l="Valor Bruto" v={fmtM(did.valor_bruto)} />
                        <R l="Valor Líquido" v={fmtM(calcVliq(did))} />
                      </>
                    )}
                    <R l="Doc. Caixa" v={did.doc_caixa} />
                    <div className="col-span-2 mt-2 flex items-center gap-3">
                      <span className="text-[11px] text-ink-400 w-44">Status de Pagamento</span>
                      <span className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ' + (did.pago === 'sim' ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300' : 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300')}>
                        {did.pago === 'sim' ? <><CheckCircle2 className="w-3 h-3" /> Pago</> : <><Clock3 className="w-3 h-3" /> Pendente</>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* XII — Contabilidade Fechamento */}
                <Sec num="XII" titulo="Contabilidade — Fechamento" color="bg-purple-900">
                  <R l="Processo Finalizado" v={simNao(did.contab_fech_finalizado)} />
                  <R l="Enviado para TCE/SIM" v={simNao(did.contab_fech_tce)} />
                </Sec>

              </>)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Financeiro() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  conferirAbasDoModulo('financeiro', TABS.map(t => t.permPath[1]))
  const visibleTabsFin = TABS.filter(t => hasPerm(user, ...t.permPath))
  const VALID_TABS_FIN = visibleTabsFin.map(t => t.id)
  const tab = VALID_TABS_FIN.includes(tabParam) ? tabParam : (visibleTabsFin[0]?.id || 'painel')
  const setTab = (key) => navigate(`/${subdomain}/financeiro/${key}`)

  // ── Painel state
  const [painel, setPainel] = useState(null)
  const [painelAno, setPainelAno] = useState(new Date().getFullYear())
  const [secMap, setSecMap] = useState({})

  useEffect(() => {
    api.get('/organizacao/secretarias')
      .then(({ data }) => {
        const list = data.secretarias || data || []
        const m = {}
        list.forEach(s => { if (s.nome && s.sigla) m[s.nome.trim().toLowerCase()] = s.sigla })
        setSecMap(m)
      })
      .catch(() => {})
  }, [])

  const secSigla = (nome) => {
    if (!nome) return '—'
    return secMap[nome.trim().toLowerCase()] || nome
  }
  const [loadingPainel, setLoadingPainel] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [painelFiltros, setPainelFiltros] = useState({
    meses_ref:   [],
    data_inicio: '',
    data_fim:    '',
    status:      [],  // 'pago' | 'liquidado_pagar' | 'empenhado_pagar' | 'pendente'
    secretarias: [],
    credores:    [],
    fontes:      [],
    tipos:       [],  // 'fixas' | 'variaveis'
  })
  const [painelOptions, setPainelOptions] = useState({ secretarias: [], credores: [], fontes: [], mesesRef: [] })

  // ── Processos DID state
  const [procs, setProcs] = useState([])
  const [procsTotal, setProcsTotal] = useState(0)
  const [procsPage, setProcsPage] = useState(1)
  const [procsLoading, setProcsLoading] = useState(false)
  const [procsFiltros, setProcsFiltros] = useState({ status: '', busca: '', data_inicio: '', data_fim: '', credor: '', valor_min: '', valor_max: '' })

  // ── Relatório state
  const [relatorio, setRelatorio] = useState(null)
  const [relFiltros, setRelFiltros] = useState({ data_inicio: '', data_fim: '', tipo: '', secretarias: [], credores: [], fontes: [] })
  const [relOptions, setRelOptions] = useState({ secretarias: [], credores: [], fontes: [] })
  const [relLoading, setRelLoading] = useState(false)
  // ── Tabela analítica de DIDs (relatório)
  const [relDids, setRelDids] = useState([])
  const [relDidsPage, setRelDidsPage] = useState(1)
  const [relDidsBusca, setRelDidsBusca] = useState('')
  const [relDidsSort, setRelDidsSort] = useState('data')
  const [relDidsSortDir, setRelDidsSortDir] = useState('desc')
  const [REL_DIDS_PER_PAGE, setRelDidsPorPagina] = usePorPagina('financeiro-relatorio', 10)

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const [LIMIT, setLimitProcs] = usePorPagina('financeiro-processos', 15)
  const [porPagPainelDids, setPorPagPainelDids] = usePorPagina('financeiro-painel-dids', 20)

  // ── Auth
  const { tenant } = useAuth()

  // ── Painel — Relação completa de DIDs
  const [painelDids, setPainelDids] = useState([])
  const [painelDidsTotal, setPainelDidsTotal] = useState(0)
  const [painelDidsPage, setPainelDidsPage] = useState(1)
  const [painelDidsLoading, setPainelDidsLoading] = useState(false)

  // ── Modal visualizar DID (read-only)
  const [didVizId, setDidVizId] = useState(null)

  // ── Painel
  const loadPainel = useCallback(async () => {
    setLoadingPainel(true)
    try {
      const p = new URLSearchParams({ ano: painelAno })
      if (painelFiltros.meses_ref.length)   p.set('meses_ref',    painelFiltros.meses_ref.join('|'))
      if (painelFiltros.data_inicio)        p.set('data_inicio',  painelFiltros.data_inicio)
      if (painelFiltros.data_fim)           p.set('data_fim',     painelFiltros.data_fim)
      if (painelFiltros.status.length)      p.set('status',       painelFiltros.status.join(','))
      if (painelFiltros.secretarias.length) p.set('secretarias',  painelFiltros.secretarias.join('|'))
      if (painelFiltros.credores.length)    p.set('credores',     painelFiltros.credores.join('|'))
      if (painelFiltros.fontes.length)      p.set('fontes',       painelFiltros.fontes.join('|'))
      if (painelFiltros.tipos.length)       p.set('tipos',        painelFiltros.tipos.join(','))
      const { data } = await api.get(`/financeiro/dashboard?${p.toString()}`)
      setPainel(data)
      setLastUpdated(new Date())
    } catch { /* silenciar */ }
    setLoadingPainel(false)
  }, [painelAno, painelFiltros])

  // Carrega opções dos filtros sempre que o ano muda
  useEffect(() => {
    api.get(`/financeiro/dashboard/options?ano=${painelAno}`)
      .then(r => setPainelOptions(r.data || { secretarias: [], credores: [], fontes: [], mesesRef: [] }))
      .catch(() => {})
  }, [painelAno])

  useEffect(() => { if (tab === 'painel') loadPainel() }, [tab, loadPainel])
  useEffect(() => {
    if (tab !== 'painel') return
    const id = setInterval(loadPainel, 60000)
    return () => clearInterval(id)
  }, [tab, loadPainel])

  // ── Painel DID list
  const loadPainelDids = useCallback(async () => {
    setPainelDidsLoading(true)
    try {
      const p = new URLSearchParams({ page: painelDidsPage, limit: porPagPainelDids, ano: painelAno })
      if (painelFiltros.data_inicio)         p.set('data_inicio',  painelFiltros.data_inicio)
      if (painelFiltros.data_fim)            p.set('data_fim',     painelFiltros.data_fim)
      if (painelFiltros.status.length)      p.set('status_pago',  painelFiltros.status.join(','))
      if (painelFiltros.tipos.length)        p.set('tipo_did',     painelFiltros.tipos.join(','))
      if (painelFiltros.secretarias.length)  p.set('secretaria',   painelFiltros.secretarias.join('|'))
      if (painelFiltros.credores.length)     p.set('credor',       painelFiltros.credores.join('|'))
      if (painelFiltros.meses_ref.length)    p.set('mes_ref',      painelFiltros.meses_ref.join('|'))
      if (painelFiltros.fontes.length)       p.set('fontes',       painelFiltros.fontes.join('|'))
      const { data } = await api.get(`/financeiro/processos-did?${p}`)
      setPainelDids(data.processos || [])
      setPainelDidsTotal(data.total || 0)
    } catch { /* silenciar */ }
    setPainelDidsLoading(false)
  }, [painelAno, painelFiltros, painelDidsPage, porPagPainelDids])

  useEffect(() => { if (tab === 'painel') loadPainelDids() }, [tab, loadPainelDids])

  // ── Processos DID
  const loadProcs = useCallback(async () => {
    setProcsLoading(true)
    try {
      const p = new URLSearchParams({
        page: procsPage, limit: LIMIT,
        ...Object.fromEntries(Object.entries(procsFiltros).filter(([, v]) => v))
      })
      const { data } = await api.get(`/financeiro/processos-did?${p}`)
      setProcs(data.processos || [])
      setProcsTotal(data.total || 0)
    } catch { /* silenciar */ }
    setProcsLoading(false)
  }, [procsPage, procsFiltros, LIMIT])

  useEffect(() => { if (tab === 'processos') loadProcs() }, [tab, loadProcs])

  // ── Relatório
  const loadRelatorio = useCallback(async () => {
    setRelLoading(true)
    try {
      // Params para /relatorio (usa nomes próprios da rota de relatório)
      const pRel = new URLSearchParams()
      if (relFiltros.data_inicio) pRel.set('data_inicio', relFiltros.data_inicio)
      if (relFiltros.data_fim)    pRel.set('data_fim',    relFiltros.data_fim)
      if (relFiltros.tipo)        pRel.set('tipo',        relFiltros.tipo)
      if (relFiltros.secretarias.length) pRel.set('secretarias', relFiltros.secretarias.join('|'))
      if (relFiltros.credores.length)    pRel.set('credores',    relFiltros.credores.join('|'))
      if (relFiltros.fontes.length)      pRel.set('fontes',      relFiltros.fontes.join('|'))

      // Params para /processos-did (nomes diferentes!)
      const pDid = new URLSearchParams({ limit: 500 })
      if (relFiltros.data_inicio)        pDid.set('data_inicio', relFiltros.data_inicio)
      if (relFiltros.data_fim)           pDid.set('data_fim',    relFiltros.data_fim)
      if (relFiltros.tipo)               pDid.set('tipo_did',    relFiltros.tipo)
      if (relFiltros.secretarias.length) pDid.set('secretaria',  relFiltros.secretarias.join('|'))
      if (relFiltros.credores.length)    pDid.set('credor',      relFiltros.credores.join('|'))
      if (relFiltros.fontes.length)      pDid.set('fontes',      relFiltros.fontes.join('|'))

      const [relRes, didsRes] = await Promise.all([
        api.get(`/financeiro/relatorio?${pRel}`),
        api.get(`/financeiro/processos-did?${pDid}`),
      ])
      setRelatorio(relRes.data)
      setRelDids(didsRes.data.processos || [])
      setRelDidsPage(1)
      setRelDidsBusca('')
    } catch { /* silenciar */ }
    setRelLoading(false)
  }, [relFiltros])

  useEffect(() => {
    if (tab !== 'relatorio') return
    api.get('/financeiro/dashboard/options')
      .then(r => setRelOptions(r.data || { secretarias: [], credores: [], fontes: [] }))
      .catch(() => {})
  }, [tab])

  useEffect(() => { if (tab === 'relatorio') loadRelatorio() }, [tab, loadRelatorio])

  // ── Montar dados do gráfico de barras (por mês — DIDs)
  const buildMesesData = () => {
    const src = painel?.dids?.porMes
    if (!src) return Array(12).fill(0)
    const arr = Array(12).fill(0)
    src.forEach(item => {
      const mes = new Date(item.mes).getMonth()
      arr[mes] = parseFloat(item.total) || 0
    })
    return arr
  }
  const mesesData = buildMesesData()
  const mesesMax = Math.max(...mesesData, 1)
  const totalDIDs = (painel?.dids?.totalFixas || 0) + (painel?.dids?.totalVariaveis || 0)
  // "Não pago" = soma das 3 situações que ainda aguardam pagamento (pendente + empenhado a pagar + liquidado a pagar)
  const pendentesQtd = (painel?.dids?.totalPendentes || 0) + (painel?.dids?.totalEmpenhadosPagar || 0) + (painel?.dids?.totalLiquidadosPagar || 0)
  const taxaInad = totalDIDs > 0 ? Math.round((pendentesQtd / totalDIDs) * 100) : 0
  const ticketMedio = totalDIDs > 0 ? parseFloat(painel?.dids?.valorBrutoTotal || 0) / totalDIDs : 0
  const pctPago = totalDIDs > 0 ? Math.round(((totalDIDs - pendentesQtd) / totalDIDs) * 100) : 0
  const pctFixas = totalDIDs > 0 ? Math.round((painel?.dids?.totalFixas || 0) / totalDIDs * 100) : 50
  const pctVariaveis = 100 - pctFixas
  const inadValue = taxaInad + '%'
  const inadSub = pendentesQtd + ' pendente' + (pendentesQtd !== 1 ? 's' : '')
  const inadColor = taxaInad > 20 ? 'red' : taxaInad > 10 ? 'yellow' : 'green'
  const pctPagoValue = pctPago + '%'
  const pctPagoSub = (totalDIDs - pendentesQtd) + ' de ' + totalDIDs

  // ── Helper: converte porMes [{mes, pago, total, qtd}] → [{mes, total, pago, pendente, qtd}]
  const buildLinhaData = (porMes) => {
    if (!porMes?.length) return []
    const mapa = {}
    porMes.forEach(row => {
      const d = new Date(row.mes)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      const label = MESES[d.getUTCMonth()] + '/' + String(d.getUTCFullYear()).slice(2)
      if (!mapa[key]) mapa[key] = { mes: label, sort: key, total: 0, pago: 0, pendente: 0, qtd: 0 }
      const v = parseFloat(row.total) || 0
      mapa[key].total += v
      mapa[key].qtd   += parseInt(row.qtd) || 0
      if (row.pago === 'sim') mapa[key].pago     += v
      else                    mapa[key].pendente  += v
    })
    return Object.values(mapa).sort((a, b) => a.sort.localeCompare(b.sort))
  }

  const painelLinhaData = buildLinhaData(painel?.dids?.porMes)

  // ── Relatório — valores derivados
  const relTotal    = parseFloat(relatorio?.valorTotal) || 0
  const relPago     = parseFloat(relatorio?.porStatus?.find(s => s.pago === 'sim')?.total || 0)
  const relPendente = relTotal - relPago
  const relQtdTotal = (relatorio?.porStatus || []).reduce((a, s) => a + parseInt(s.qtd || 0), 0)
  const relQtdPago  = parseInt(relatorio?.porStatus?.find(s => s.pago === 'sim')?.qtd || 0)
  const relTicket   = relQtdTotal > 0 ? relTotal / relQtdTotal : 0
  const relPctPago  = relTotal > 0 ? Math.min(100, Math.round((relPago    / relTotal) * 100)) : 0
  const relInad     = relTotal > 0 ? Math.min(100, Math.round((relPendente / relTotal) * 100)) : 0
  const relInadColor = relInad > 30 ? 'red' : relInad > 15 ? 'yellow' : 'green'

  // Situação financeira granular (pago / liquidado a pagar / empenhado a pagar / pendente)
  const relSituMap = (relatorio?.porSituacao || []).reduce((acc, s) => { acc[s.situacao] = s; return acc }, {})
  const relLiquidadoPagar    = parseFloat(relSituMap.liquidado_pagar?.total || 0)
  const relQtdLiquidadoPagar = parseInt(relSituMap.liquidado_pagar?.qtd || 0)
  const relEmpenhadoPagar    = parseFloat(relSituMap.empenhado_pagar?.total || 0)
  const relQtdEmpenhadoPagar = parseInt(relSituMap.empenhado_pagar?.qtd || 0)
  const relPendenteEstrito    = parseFloat(relSituMap.pendente?.total || 0)
  const relQtdPendenteEstrito = parseInt(relSituMap.pendente?.qtd || 0)

  // ─── Tabela Analítica de DIDs — sort + filtro client-side ─────────────────
  const relDidsToggleSort = (col) => {
    if (relDidsSort === col) setRelDidsSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setRelDidsSort(col); setRelDidsSortDir('asc') }
    setRelDidsPage(1)
  }
  const relDidsFiltrados = relDids.filter(p => {
    if (!relDidsBusca) return true
    const q = relDidsBusca.toLowerCase()
    const did = p.did
    return (
      (did?.numero_did && String(did.numero_did).includes(q)) ||
      (did?.credor_sec1 || p.interessado_nome || '').toLowerCase().includes(q) ||
      (did?.secretaria_sec1 || '').toLowerCase().includes(q) ||
      (p.numero || '').toLowerCase().includes(q)
    )
  })
  const relDidsOrdenados = [...relDidsFiltrados].sort((a, b) => {
    const dir = relDidsSortDir === 'asc' ? 1 : -1
    const da = a.did, db = b.did
    if (relDidsSort === 'did') return dir * (parseInt(da?.numero_did || 0) - parseInt(db?.numero_did || 0))
    if (relDidsSort === 'credor') return dir * ((da?.credor_sec1 || a.interessado_nome || '').localeCompare(db?.credor_sec1 || b.interessado_nome || ''))
    if (relDidsSort === 'secretaria') return dir * ((da?.secretaria_sec1 || '').localeCompare(db?.secretaria_sec1 || ''))
    if (relDidsSort === 'tipo') return dir * ((da?.tipo_did || '').localeCompare(db?.tipo_did || ''))
    if (relDidsSort === 'valor') return dir * ((parseFloat(da?.valor_bruto || 0)) - (parseFloat(db?.valor_bruto || 0)))
    if (relDidsSort === 'status') return dir * ((da?.pago || '').localeCompare(db?.pago || ''))
    // data (default)
    return dir * (new Date(da?.data_emissao || a.created_at || 0) - new Date(db?.data_emissao || b.created_at || 0))
  })
  const relDidsPageCount = Math.ceil(relDidsOrdenados.length / REL_DIDS_PER_PAGE)
  const relDidsPagina = relDidsOrdenados.slice((relDidsPage - 1) * REL_DIDS_PER_PAGE, relDidsPage * REL_DIDS_PER_PAGE)

  // ─── Processos DID — filtros client-side (credor e valor) ─────────────────
  const procsVisiveis = procs.filter(p => {
    if (procsFiltros.credor) {
      const credorStr = (p.did?.credor_sec1 || p.interessado_nome || '').toLowerCase()
      if (!credorStr.includes(procsFiltros.credor.toLowerCase())) return false
    }
    const vMin = parseBRL(procsFiltros.valor_min)
    if (vMin !== null) {
      const val = parseFloat(p.did?.valor_bruto || 0)
      if (val < vMin) return false
    }
    const vMax = parseBRL(procsFiltros.valor_max)
    if (vMax !== null) {
      const val = parseFloat(p.did?.valor_bruto || 0)
      if (val > vMax) return false
    }
    return true
  })

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        icon={DollarSign}
        title="Financeiro"
        subtitle="Gestão financeira, DIDs e relatórios"
        actions={
          <ActionBar>
            {tab === 'painel' && (
              <button
                onClick={() => setMostrarFiltros(v => !v)}
                className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 border ${
                  mostrarFiltros
                    ? 'bg-info-50 dark:bg-info-900/20 border-info-300 dark:border-brand-600 text-brand-700 dark:text-info-300'
                    : 'border-ink-200 bg-surface text-ink-600 hover:bg-ink-50'
                }`}
              >
                <Search className="w-4 h-4" />
                Filtros
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
              </button>
            )}
            <button
              onClick={() => {
                if (tab === 'painel') { loadPainel(); setPainelDidsPage(1) }
                else if (tab === 'processos') { setProcsPage(1); loadProcs() }
                else if (tab === 'relatorio') loadRelatorio()
              }}
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50 text-sm font-medium shadow-sm transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
            {tab === 'painel' && (
              <button
                className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  painel
                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                    : 'bg-ink-200 text-ink-400 cursor-not-allowed'
                }`}
                disabled={!painel}
                onClick={() => gerarPainelPDF({ painel, filtros: painelFiltros, ano: painelAno, orgNome: '' })}
              >
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </button>
            )}
          </ActionBar>
        }
      />

      {/* Tabs */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-none touch-pan-x">
        <div className="flex gap-1 bg-ink-100/70 rounded-xl p-1 min-w-max w-fit">
          {visibleTabsFin.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                tab === id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-500 hover:bg-ink-100 hover:text-ink-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB: PAINEL ═══════════════════════════════════════════════════════ */}
      {tab === 'painel' && (
        <div className="space-y-4">

          {/* ── Painel de filtros ────────────────────────────────────────── */}
          {mostrarFiltros && <div className="card p-4 space-y-4">
            {/* Linha 1: Ano + Tipo + Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs font-medium text-ink-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Ano</p>
                <select className="input-field w-full" value={painelAno} onChange={e => { setPainelAno(Number(e.target.value)) }}>
                  {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <MultiSelect
                label="Tipo"
                placeholder="Todos os tipos"
                options={[{ v: 'fixas', l: 'Contas Fixas' }, { v: 'variaveis', l: 'Contas Variáveis' }]}
                selected={painelFiltros.tipos}
                onChange={v => setPainelFiltros(f => ({ ...f, tipos: v }))}
              />

              <MultiSelect
                label="Status"
                placeholder="Todos os status"
                options={[
                  { v: 'pago',             l: '✅ Pago' },
                  { v: 'liquidado_pagar',  l: '📋 Liquidado a pagar' },
                  { v: 'empenhado_pagar',  l: '📄 Empenhado a pagar' },
                  { v: 'pendente',         l: '⏳ Pendente' },
                ]}
                selected={painelFiltros.status}
                onChange={v => setPainelFiltros(f => ({ ...f, status: v }))}
              />

              <MultiSelect
                label="Mês de Referência"
                placeholder="Todos os meses"
                options={painelOptions.mesesRef.length > 0
                  ? painelOptions.mesesRef.map(m => ({ v: m, l: m }))
                  : MESES_NOMES
                }
                selected={painelFiltros.meses_ref}
                onChange={v => setPainelFiltros(f => ({ ...f, meses_ref: v }))}
              />
            </div>

            {/* Linha 2: Datas de pagamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs font-medium text-ink-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Pagamento — Início</p>
                <input
                  type="date"
                  className="input-field w-full"
                  value={painelFiltros.data_inicio}
                  onChange={e => setPainelFiltros(f => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Pagamento — Fim</p>
                <input
                  type="date"
                  className="input-field w-full"
                  value={painelFiltros.data_fim}
                  onChange={e => setPainelFiltros(f => ({ ...f, data_fim: e.target.value }))}
                />
              </div>

              <MultiSelect
                label="Fonte de Recurso"
                placeholder="Todas as fontes"
                options={painelOptions.fontes}
                selected={painelFiltros.fontes}
                onChange={v => setPainelFiltros(f => ({ ...f, fontes: v }))}
              />

              <div /> {/* espaço reservado */}
            </div>

            {/* Linha 3: Secretaria + Credor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MultiSelect
                label="Secretaria"
                placeholder="Todas as secretarias"
                options={painelOptions.secretarias}
                selected={painelFiltros.secretarias}
                onChange={v => setPainelFiltros(f => ({ ...f, secretarias: v }))}
              />

              <MultiSelect
                label="Credor"
                placeholder="Todos os credores"
                options={painelOptions.credores}
                selected={painelFiltros.credores}
                onChange={v => setPainelFiltros(f => ({ ...f, credores: v }))}
              />
            </div>

            {/* Botões rápidos de período */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { l: 'Hoje',       fn: () => { const t = new Date().toISOString().split('T')[0]; setPainelFiltros(f => ({ ...f, data_inicio: t, data_fim: t })) } },
                { l: '7 dias',     fn: () => { const t = new Date(); const i = new Date(t); i.setDate(i.getDate()-6); setPainelFiltros(f => ({ ...f, data_inicio: i.toISOString().split('T')[0], data_fim: t.toISOString().split('T')[0] })) } },
                { l: '30 dias',    fn: () => { const t = new Date(); const i = new Date(t); i.setDate(i.getDate()-29); setPainelFiltros(f => ({ ...f, data_inicio: i.toISOString().split('T')[0], data_fim: t.toISOString().split('T')[0] })) } },
                { l: 'Mês atual',  fn: () => { const t = new Date(); const y = t.getFullYear(); const m = String(t.getMonth()+1).padStart(2,'0'); setPainelFiltros(f => ({ ...f, data_inicio: `${y}-${m}-01`, data_fim: `${y}-${m}-31` })) } },
                { l: 'Ano atual',  fn: () => { const y = new Date().getFullYear(); setPainelFiltros(f => ({ ...f, data_inicio: `${y}-01-01`, data_fim: `${y}-12-31` })) } },
                { l: '12 meses',   fn: () => { const t = new Date(); const i = new Date(t); i.setMonth(i.getMonth()-11); i.setDate(1); setPainelFiltros(f => ({ ...f, data_inicio: i.toISOString().split('T')[0], data_fim: t.toISOString().split('T')[0] })) } },
              ].map(({ l, fn }) => (
                <button
                  key={l}
                  type="button"
                  onClick={fn}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-ink-200 bg-surface text-ink-600 hover:bg-info-50 hover:border-info-300 hover:text-brand-700 dark:hover:bg-info-900/20 dark:hover:text-info-300 transition-colors"
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button className="btn-primary text-sm inline-flex items-center gap-1.5" onClick={() => { loadPainel(); setPainelDidsPage(1) }}>
                <Search className="w-4 h-4" /> Filtrar
              </button>
              <button
                className="btn-secondary text-sm inline-flex items-center gap-1.5"
                onClick={() => {
                  setPainelFiltros({ meses_ref: [], data_inicio: '', data_fim: '', status: [], secretarias: [], credores: [], fontes: [], tipos: [] })
                  setPainelDidsPage(1)
                  setTimeout(loadPainel, 0)
                }}
              >
                <X className="w-4 h-4" /> Limpar
              </button>
              {lastUpdated && (
                <span className="flex items-center gap-1.5 text-xs text-ink-400 whitespace-nowrap ml-auto">
                  <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse inline-block" />
                  {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>}

          {loadingPainel ? (
            <LoadingBar label="Carregando painel..." />
          ) : painel ? (
            <>
              {/* ── Cards de métricas DID ─────────────────────────── */}
              {painel.dids && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <MetricCard Icon={DollarSign}   label="Valor Bruto Total"  value={fmtMoeda(painel.dids.valorBrutoTotal)}  color="blue"   />
                    <MetricCard Icon={FileText}     label="Total DIDs"         value={totalDIDs}                              color="blue"   />
                    <MetricCard Icon={AlertCircle}  label="Inadimplência"      value={inadValue} sub={inadSub}               color={inadColor} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <MetricCard Icon={CheckCircle2}     label="Pago"                value={fmtMoeda(painel.dids.valorPago)}             color="green"  />
                    <MetricCard Icon={ClipboardCheck}   label="Liquidado a pagar"   value={fmtMoeda(painel.dids.valorLiquidadoPagar)}   sub={`${painel.dids.totalLiquidadosPagar || 0} processo(s)`}   color="indigo" />
                    <MetricCard Icon={FileText}         label="Empenhado a pagar"   value={fmtMoeda(painel.dids.valorEmpenhadoPagar)}   sub={`${painel.dids.totalEmpenhadosPagar || 0} processo(s)`}   color="orange" />
                    <MetricCard Icon={Clock3}           label="Pendente"            value={fmtMoeda(painel.dids.valorPendente)}         sub={`${painel.dids.totalPendentes || 0} processo(s)`}         color="yellow" />
                  </div>
                </>
              )}

              {/* ── Relação de DIDs (lista completa filtrada) ───────────── */}
              <div className="bg-surface border border-ink-100 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100">
                  <p className="section-title">Relação de DIDs — {painelAno}</p>
                  {painelDidsTotal > 0 && (
                    <span className="text-xs text-ink-400">{painelDidsTotal} DID{painelDidsTotal !== 1 ? 's' : ''}</span>
                  )}
                </div>
                {painelDidsLoading ? (
                  <LoadingBar label="Carregando DIDs..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-ink-100">
                        <tr className="border-b border-ink-200">
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-ink-500">Nº DID</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-ink-500">Tipo</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-ink-500">Credor</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-ink-500">Secretaria</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-ink-500">Mês Ref.</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-ink-500">Data</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-ink-500">Valor Bruto</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold text-ink-500">Pagto.</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold text-ink-500">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200">
                        {painelDids.length === 0 ? (
                          <tr><td colSpan={9} className="py-10 text-center text-ink-400 text-sm">Nenhum DID registrado no período</td></tr>
                        ) : painelDids.map(proc => {
                          const d = proc.did
                          return (
                            <tr key={proc.id} className="hover:bg-ink-50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-semibold text-brand-600 dark:text-info-400 whitespace-nowrap">
                                {d ? fmtNumeroDid(d.numero_did) : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                {d ? (
                                  <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                                    d.tipo_did === 'variaveis'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                      : 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-300'
                                  )}>
                                    {d.tipo_did === 'variaveis' ? 'Variáveis' : 'Fixas'}
                                  </span>
                                ) : <span className="text-xs text-ink-400">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-ink-900 dark:text-white max-w-[160px] truncate">{d?.credor_sec1 || proc.interessado_nome || '—'}</td>
                              <td className="py-2.5 px-3 text-ink-500 whitespace-nowrap">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-ink-100 text-ink-600" title={d?.secretaria_sec1 || ''}>
                                  {secSigla(d?.secretaria_sec1)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-ink-500 whitespace-nowrap">{d?.mes_referencia || '—'}</td>
                              <td className="py-2.5 px-3 text-ink-500 whitespace-nowrap">{fmtData(d?.data_did || proc.data_abertura)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-ink-900 dark:text-white whitespace-nowrap">
                                {d?.valor_bruto ? fmtMoeda(d.valor_bruto) : <span className="text-ink-400 text-xs">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <SituacaoDidBadge d={d} />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  disabled={!d}
                                  onClick={() => d && setDidVizId(proc.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-info-50 text-brand-600 hover:bg-info-100 dark:bg-info-900/20 dark:text-info-400 dark:hover:bg-info-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Ver DID"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Ver DID
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <Paginacao total={painelDidsTotal} pagina={painelDidsPage} setPagina={setPainelDidsPage} porPagina={porPagPainelDids}
                  setPorPagina={(n) => { setPorPagPainelDids(n); setPainelDidsPage(1) }} className="border-t border-ink-100 px-5" />
              </div>

              {/* ── Distribuição por Tipo + Status de Pagamento ───────── */}
              {painel.dids && totalDIDs > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Distribuição por Tipo */}
                  <div className="card p-4">
                    <SectionTitle icon={BarChart3} title="Distribuição por Tipo" />
                    <div className="space-y-4">
                      <div className="h-10 rounded-xl overflow-hidden flex shadow-inner">
                        <div
                          className="bg-info-500 flex items-center justify-center transition-all"
                          style={{ width: pctFixas + '%' }}
                        >
                          {pctFixas > 12 && <span className="text-white text-xs font-bold drop-shadow-sm">{pctFixas}%</span>}
                        </div>
                        <div
                          className="bg-purple-500 flex items-center justify-center transition-all"
                          style={{ width: pctVariaveis + '%' }}
                        >
                          {pctVariaveis > 12 && <span className="text-white text-xs font-bold drop-shadow-sm">{pctVariaveis}%</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-info-50 dark:bg-info-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-info-500 rounded-sm shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-brand-600 dark:text-info-400">{painel.dids.totalFixas}</div>
                            <div className="text-xs text-ink-500">Contas Fixas</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-purple-500 rounded-sm shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{painel.dids.totalVariaveis}</div>
                            <div className="text-xs text-ink-500">Contas Variáveis</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status de Pagamento */}
                  <div className="card p-4">
                    <SectionTitle icon={CheckCircle2} title="Status de Pagamento" />
                    <div className="space-y-4">
                      <div className="h-10 rounded-xl overflow-hidden flex shadow-inner">
                        <div
                          className="bg-success-500 flex items-center justify-center transition-all"
                          style={{ width: pctPago + '%' }}
                        >
                          {pctPago > 12 && <span className="text-white text-xs font-bold drop-shadow-sm">{pctPago}%</span>}
                        </div>
                        <div
                          className="bg-warning-400 flex items-center justify-center transition-all"
                          style={{ width: (100 - pctPago) + '%' }}
                        >
                          {(100 - pctPago) > 12 && <span className="text-warning-900 text-xs font-bold">{100 - pctPago}%</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-success-500 rounded-sm shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-success-600 dark:text-success-400">{totalDIDs - pendentesQtd}</div>
                            <div className="text-xs text-ink-500">DIDs Pagos</div>
                            <div className="text-xs font-semibold text-success-600 dark:text-success-400 mt-0.5">{fmtMoeda(painel.dids.valorPago)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-warning-400 rounded-sm shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-warning-600 dark:text-warning-400">{pendentesQtd}</div>
                            <div className="text-xs text-ink-500">DIDs Pendentes</div>
                            <div className="text-xs font-semibold text-warning-600 dark:text-warning-400 mt-0.5">{fmtMoeda(painel.dids.valorPendente)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Evolução mensal (linha) ──────────────────────────── */}
              {painelLinhaData.length > 1 && (
                <div className="card p-4">
                  <SectionTitle icon={TrendingUp} title="Evolução Mensal das Despesas" />
                  <p className="text-xs text-ink-400 mt-0.5 mb-4">Valor bruto por mês — pago vs pendente</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={painelLinhaData} margin={{ top: 6, right: 20, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPendente" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#facc15" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                      <RTooltip formatter={(v, name) => [fmtMoeda(v), name === 'total' ? 'Total' : name === 'pago' ? 'Pago' : 'Pendente']} labelStyle={{ fontWeight: 600, color: '#374151' }} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <RLegend formatter={v => <span style={{ color: 'var(--color-ink-600)' }}>{v === 'total' ? 'Total' : v === 'pago' ? 'Pago' : 'Pendente'}</span>} wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="total"    stroke="#3b82f6" strokeWidth={2} fill="url(#gradTotal)"    dot={false} activeDot={{ r: 5 }} isAnimationActive />
                      <Area type="monotone" dataKey="pago"     stroke="#22c55e" strokeWidth={2} fill="url(#gradPago)"     dot={false} activeDot={{ r: 5 }} isAnimationActive />
                      <Area type="monotone" dataKey="pendente" stroke="#facc15" strokeWidth={2} fill="url(#gradPendente)" dot={false} activeDot={{ r: 5 }} isAnimationActive />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Gráfico por mês — DIDs */}
              <div className="card p-4">
                <SectionTitle icon={Calendar} title={`DIDs por Mês — ${painelAno}`} />
                {mesesData.every(v => v === 0) ? (
                  <p className="text-sm text-ink-400 text-center py-8">Nenhum DID com data registrada neste período</p>
                ) : (
                  <div className="flex items-end gap-1.5 h-44 mt-2">
                    {mesesData.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {v > 0 && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink-800 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {fmtMoeda(v)}
                          </div>
                        )}
                        <div
                          className={`w-full rounded-t-md transition-all cursor-default ${
                            v > 0 ? 'bg-info-500 dark:bg-brand-600 hover:bg-info-400' : 'bg-ink-100'
                          }`}
                          style={{ height: v > 0 ? Math.max((v / mesesMax) * 140, 4) + 'px' : '4px' }}
                        />
                        <span className="text-[10px] text-ink-400 select-none">{MESES[i]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Por Secretaria */}
                <div className="card p-4">
                  <SectionTitle icon={Building2} title="Por Secretaria" />
                  {(!painel.dids?.porSecretaria || painel.dids.porSecretaria.length === 0) && (
                    <p className="text-sm text-ink-400 text-center py-4">Sem dados</p>
                  )}
                  <div className="space-y-3">
                    {painel.dids?.porSecretaria?.map((c, i) => {
                      const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                      const itemTotal = parseFloat(c.total) || 0
                      const pct = totalGeral > 0 && itemTotal > 0 ? Math.min(100, Math.round((itemTotal / totalGeral) * 100)) : 0
                      const cores = ['bg-info-500','bg-purple-500','bg-teal-500','bg-indigo-500','bg-cyan-500','bg-violet-500','bg-info-500','bg-violet-500']
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-ink-700 truncate max-w-[65%]" title={c.secretaria}>{c.secretaria || '—'}</span>
                            <span className="font-semibold text-ink-900 dark:text-white whitespace-nowrap ml-2">{fmtMoeda(c.total)} <span className="text-xs text-ink-400">({c.qtd} DID{c.qtd !== 1 ? 's' : ''})</span></span>
                          </div>
                          <div className="h-2 bg-ink-100 rounded-full">
                            <div className={'h-2 ' + cores[i % cores.length] + ' rounded-full transition-all'} style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* DIDs Pendentes */}
                <div className="card p-4">
                  <SectionTitle icon={Clock3} title="DIDs Pendentes" />
                  {(!painel.dids?.pendentes || painel.dids.pendentes.length === 0) ? (
                    <p className="text-sm text-ink-400 text-center py-4">✅ Nenhum DID pendente de pagamento</p>
                  ) : (
                    <div className="space-y-2">
                      {painel.dids.pendentes.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-2.5 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-brand-600 dark:text-info-400">
                                {fmtNumeroDid(d.numero_did)}
                              </span>
                              <span className={'inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ' + (
                                d.tipo_did === 'variaveis'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                  : 'bg-info-100 text-brand-700 dark:bg-info-900/40 dark:text-info-300'
                              )}>{d.tipo_did === 'variaveis' ? 'Var.' : 'Fix.'}</span>
                            </div>
                            <p className="text-xs text-ink-600 truncate">{d.credor_sec1 || d.secretaria_sec1 || '—'}</p>
                            {d.mes_referencia && <p className="text-[10px] text-ink-400">Ref: {d.mes_referencia}</p>}
                          </div>
                          <span className="text-sm font-bold text-warning-700 dark:text-warning-400 whitespace-nowrap">{fmtMoeda(d.valor_bruto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Credores */}
              <div className="card p-4">
                <SectionTitle icon={TrendingUp} title="Top Credores" />
                {(!painel.dids?.porCredor || painel.dids.porCredor.length === 0) ? (
                  <p className="text-sm text-ink-400 text-center py-4">Nenhum credor registrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-ink-500">#</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-ink-500">Credor</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-ink-500">DIDs</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-ink-500">Total</th>
                          <th className="py-2 px-3 w-32"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200">
                        {painel.dids.porCredor.map((c, i) => {
                          const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                          const pct = totalGeral > 0 ? Math.round((parseFloat(c.total) / totalGeral) * 100) : 0
                          return (
                            <tr key={i} className="hover:bg-ink-50">
                              <td className="py-2 px-3 text-ink-400 text-xs font-bold">{i + 1}º</td>
                              <td className="py-2 px-3 font-medium text-ink-900 dark:text-white max-w-[200px] truncate">{c.credor || '—'}</td>
                              <td className="py-2 px-3 text-center text-ink-500">{c.qtd}</td>
                              <td className="py-2 px-3 text-right font-semibold text-ink-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.total)}</td>
                              <td className="py-2 px-3">
                                <div className="h-1.5 bg-ink-100 rounded-full">
                                  <div className="h-1.5 bg-info-500 rounded-full" style={{ width: pct + '%' }} />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* ── Top 5 Credores — Gráfico ─────────────────────────── */}
              {painel.dids?.porCredor && painel.dids.porCredor.length > 0 && (
                <div className="card p-4">
                  <SectionTitle icon={BarChart3} title="Top Credores — Visão Gráfica" />
                  <div className="space-y-3">
                    {painel.dids.porCredor.slice(0, 5).map((c, i) => {
                      const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                      const pct = totalGeral > 0 ? Math.round((parseFloat(c.total) / totalGeral) * 100) : 0
                      const paleta = [
                        { bg: 'bg-info-500',   light: 'bg-info-50 dark:bg-info-900/20',     text: 'text-brand-600 dark:text-info-400' },
                        { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
                        { bg: 'bg-teal-600',   light: 'bg-teal-50 dark:bg-teal-900/20',     text: 'text-teal-600 dark:text-teal-400' },
                        { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
                        { bg: 'bg-danger-500',   light: 'bg-danger-50 dark:bg-danger-900/20',     text: 'text-danger-600 dark:text-danger-400' },
                      ]
                      const cor = paleta[i % paleta.length]
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={'text-xs font-bold w-5 text-center shrink-0 ' + cor.text}>{i + 1}º</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <span className="text-sm font-medium text-ink-800 truncate">{c.credor || '—'}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-ink-400">{c.qtd} DID{c.qtd !== 1 ? 's' : ''}</span>
                                <span className={'text-xs font-bold ' + cor.text}>{pct}%</span>
                                <span className="text-sm font-semibold text-ink-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.total)}</span>
                              </div>
                            </div>
                            <div className="h-5 bg-ink-100 rounded-full overflow-hidden">
                              <div
                              className={'h-5 ' + cor.bg + ' rounded-full transition-all flex items-center justify-end pr-2'}
                                style={{ width: Math.max(pct, 2) + '%' }}
                              >
                                {pct > 8 && <span className="text-white text-[10px] font-bold">{pct}%</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-400">
              <AlertTriangle className="w-8 h-8 text-warning-500" />
              <span className="text-sm">Erro ao carregar o painel</span>
              <button onClick={loadPainel} className="text-xs text-info-500 hover:text-info-400 underline">Tentar novamente</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: PROCESSOS DID ════════════════════════════════════════════════ */}
      {tab === 'processos' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            {/* Linha 1: Busca | Status | Credor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                className="input-field"
                placeholder="Buscar número, assunto, interessado..."
                value={procsFiltros.busca}
                onChange={e => setProcsFiltros(f => ({ ...f, busca: e.target.value }))}
              />
              <select className="input-field" value={procsFiltros.status} onChange={e => setProcsFiltros(f => ({ ...f, status: e.target.value }))}>
                <option value="">Todos status</option>
                {Object.entries(PROC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input
                className="input-field"
                placeholder="Buscar por credor..."
                value={procsFiltros.credor}
                onChange={e => setProcsFiltros(f => ({ ...f, credor: e.target.value }))}
              />
            </div>
            {/* Linha 2: Valor mín | Valor máx | Buscar | Limpar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                className="input-field"
                placeholder="Valor mín. (ex: 1000)"
                value={procsFiltros.valor_min}
                onChange={e => setProcsFiltros(f => ({ ...f, valor_min: e.target.value }))}
              />
              <input
                className="input-field"
                placeholder="Valor máx. (ex: 5000)"
                value={procsFiltros.valor_max}
                onChange={e => setProcsFiltros(f => ({ ...f, valor_max: e.target.value }))}
              />
              <button
                className="btn-primary text-sm inline-flex items-center justify-center gap-1.5"
                onClick={() => { setProcsPage(1); loadProcs() }}
              >
                <Search className="w-4 h-4" /> Buscar
              </button>
              <button
                className="btn-secondary text-sm inline-flex items-center justify-center gap-1.5"
                onClick={() => { setProcsFiltros({ status: '', busca: '', data_inicio: '', data_fim: '', credor: '', valor_min: '', valor_max: '' }); setProcsPage(1) }}
              >
                <X className="w-4 h-4" /> Limpar
              </button>
            </div>
          </div>

          <div className="bg-surface border border-ink-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              {procsLoading ? (
                <LoadingBar label="Carregando processos..." />
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-ink-100 border-b border-ink-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500">Nº Processo / DID</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500">Tipo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500">Credor / Secretaria</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500">Data</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-ink-500">Valor Bruto</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-ink-500">Pagto.</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-ink-500" title="Valor que saiu da conta para o credor (bruto − retenções)">Líquido / Pago em</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-ink-500">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-200">
                    {procsVisiveis.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 text-center text-ink-400">Nenhum processo DID encontrado</td></tr>
                    ) : procsVisiveis.map(p => {
                      const did = p.did
                      return (
                        <tr key={p.id} className="hover:bg-ink-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-mono text-brand-600 dark:text-info-400 font-semibold whitespace-nowrap">{p.numero}</p>
                            {did?.numero_did && <p className="text-xs text-ink-400">{fmtNumeroDid(did.numero_did)}</p>}
                          </td>
                          <td className="py-3 px-4">
                            {did ? (
                              <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                                did.tipo_did === 'variaveis'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-300'
                              )}>{did.tipo_did === 'variaveis' ? 'Variáveis' : 'Fixas'}</span>
                            ) : <span className="text-xs text-ink-400">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-ink-900 dark:text-white font-medium">{did?.credor_sec1 || p.interessado_nome || '—'}</p>
                            {did?.secretaria_sec1 && (
                              <p className="text-xs text-ink-400" title={did.secretaria_sec1}>{secSigla(did.secretaria_sec1)}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-ink-500 whitespace-nowrap">{fmtData(did?.data_did || p.data_abertura)}</td>
                          <td className="py-3 px-4 text-right">
                            {did?.valor_bruto
                              ? <span className="font-semibold text-ink-900 dark:text-white whitespace-nowrap">{fmtMoeda(did.valor_bruto)}</span>
                              : <span className="text-ink-400 text-xs">—</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <SituacaoDidBadge d={did} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            {did?.valor_bruto
                              ? <span className="font-semibold text-ink-800 dark:text-white whitespace-nowrap">
                                  {fmtMoeda(did.valor_liquido)}<br />
                                  <span className="text-xs font-normal text-ink-400">
                                    {did.data_pagamento_efetiva ? `pago em ${fmtData(did.data_pagamento_efetiva)}` : 'a pagar'}
                                  </span>
                                </span>
                              : <span className="text-ink-400 text-xs">—</span>
                            }
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              to={'/' + subdomain + '/processos/' + p.id}
                              className="p-1.5 rounded-lg text-brand-600 dark:text-info-400 hover:bg-info-50 dark:hover:bg-info-900/20 transition-colors inline-block"
                              title="Ver processo"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <Paginacao total={procsTotal} pagina={procsPage} setPagina={setProcsPage} porPagina={LIMIT}
              setPorPagina={(n) => { setLimitProcs(n); setProcsPage(1) }} rotulo="processo" className="border-t border-ink-100 px-5" />
          </div>
        </div>
      )}

      {/* ═══ TAB: RELATÓRIO ════════════════════════════════════════════════════ */}
      {tab === 'relatorio' && (
        <div className="space-y-4">

          {/* ── Sub-header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-info-500" />
                Relatório Financeiro
              </h2>
              <p className="text-sm text-ink-500 mt-0.5">
                Análise consolidada de DIDs, pagamentos e pendências
                {(relFiltros.data_inicio || relFiltros.data_fim) && (
                  <span className="ml-2 text-brand-600 dark:text-info-400 font-medium">
                    · {relFiltros.data_inicio ? fmtData(relFiltros.data_inicio) : '—'} até {relFiltros.data_fim ? fmtData(relFiltros.data_fim) : '—'}
                  </span>
                )}
              </p>
            </div>
            <button
              className="h-9 btn-primary inline-flex items-center gap-1.5 px-4 text-sm"
              onClick={loadRelatorio}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Gerar Relatório
            </button>
          </div>

          {/* ── Filtros ─────────────────────────────────────────────────────── */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-ink-500 mb-3 uppercase tracking-wide flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Filtros
            </p>
            {/* Linha 1: Datas + Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Data início</label>
                <input type="date" className="input-field w-full" value={relFiltros.data_inicio} onChange={e => setRelFiltros(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Data fim</label>
                <input type="date" className="input-field w-full" value={relFiltros.data_fim} onChange={e => setRelFiltros(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Tipo</label>
                <select className="input-field w-full" value={relFiltros.tipo} onChange={e => setRelFiltros(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="">Todos os tipos</option>
                  <option value="fixas">Fixas</option>
                  <option value="variaveis">Variáveis</option>
                </select>
              </div>
            </div>
            {/* Linha 2: Secretaria + Credor + Fonte */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MultiSelect
                label="Secretaria"
                placeholder="Todas as secretarias"
                options={relOptions.secretarias}
                selected={relFiltros.secretarias}
                onChange={v => setRelFiltros(f => ({ ...f, secretarias: v }))}
              />
              <MultiSelect
                label="Credor"
                placeholder="Todos os credores"
                options={relOptions.credores}
                selected={relFiltros.credores}
                onChange={v => setRelFiltros(f => ({ ...f, credores: v }))}
              />
              <MultiSelect
                label="Fonte de Recurso"
                placeholder="Todas as fontes"
                options={relOptions.fontes}
                selected={relFiltros.fontes}
                onChange={v => setRelFiltros(f => ({ ...f, fontes: v }))}
              />
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ink-100">
              <button className="btn-primary text-sm h-[36px] inline-flex items-center gap-1.5 px-4" onClick={loadRelatorio}>
                <BarChart3 className="w-4 h-4" /> Gerar Relatório
              </button>
              <button
                className="btn-secondary text-sm h-[36px] inline-flex items-center justify-center px-3"
                onClick={() => { setRelFiltros({ data_inicio: '', data_fim: '', tipo: '', secretarias: [], credores: [], fontes: [] }); setTimeout(loadRelatorio, 0) }}
                title="Limpar filtros"
              >
                <X className="w-4 h-4" />
              </button>
              {(relFiltros.data_inicio || relFiltros.data_fim || relFiltros.tipo || relFiltros.secretarias.length || relFiltros.credores.length || relFiltros.fontes.length) && (
                <span className="text-xs text-brand-600 dark:text-info-400 font-medium">Filtros ativos</span>
              )}
            </div>
          </div>

          {relLoading ? (
            <LoadingBar label="Gerando relatório..." />
          ) : relatorio ? (
            <>
              {/* ── KPI Cards — linha 1: 4 principais ─────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard Icon={DollarSign}   color="blue"   label="Total do Período" value={fmtMoeda(relTotal)} />
                <MetricCard Icon={CheckCircle2} color="green"  label="Total Pago"       value={fmtMoeda(relPago)} />
                <MetricCard Icon={Clock3}       color="yellow" label="Total Pendente"   value={fmtMoeda(relPendente)} />
                <MetricCard Icon={FileText}     color="blue"   label="Qtd. DIDs"        value={String(relQtdTotal)} />
              </div>

              {/* ── KPI Cards — linha 1b: situação financeira granular ────── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard Icon={ClipboardCheck} color="indigo" label="Liquidado a pagar" value={fmtMoeda(relLiquidadoPagar)} sub={`${relQtdLiquidadoPagar} DID(s)`} />
                <MetricCard Icon={FileText}       color="orange" label="Empenhado a pagar" value={fmtMoeda(relEmpenhadoPagar)} sub={`${relQtdEmpenhadoPagar} DID(s)`} />
                <MetricCard Icon={Clock3}         color="yellow" label="Pendente"          value={fmtMoeda(relPendenteEstrito)} sub={`${relQtdPendenteEstrito} DID(s)`} />
              </div>

              {/* ── KPI Cards — linha 2: 3 secundários ────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard Icon={TrendingUp}   color="purple"       label="Ticket Médio"  value={fmtMoeda(relTicket)} />
                <MetricCard Icon={CheckCircle2} color="green"        label="% Pago"        value={relPctPago + '%'} sub={relQtdPago + ' de ' + relQtdTotal} />
                <MetricCard Icon={AlertCircle}  color={relInadColor} label="Inadimplência" value={relInad + '%'} sub={(relQtdTotal - relQtdPago) + ' pendente(s)'} />
              </div>

              {/* ── Resumo Executivo ──────────────────────────────────────────── */}
              <div className="card p-4 border-l-4 border-brand-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-info-100 dark:bg-info-900/30 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-brand-600 dark:text-info-400" />
                  </div>
                  <h3 className="font-semibold text-ink-900 dark:text-white">Resumo Executivo</h3>
                </div>
                <p className="text-sm text-ink-600 leading-relaxed">
                  {relQtdTotal === 0
                    ? 'Nenhum DID encontrado para o período e filtros selecionados.'
                    : `No período analisado, foram registrados ${relQtdTotal} DID${relQtdTotal !== 1 ? 's' : ''}, totalizando ${fmtMoeda(relTotal)} em valor bruto. `}
                  {relPago > 0 && `Do total, ${fmtMoeda(relPago)} (${relPctPago}%) já foi pago${relQtdPago > 0 ? ` em ${relQtdPago} DID${relQtdPago !== 1 ? 's' : ''}` : ''}. `}
                  {relLiquidadoPagar > 0 && `${fmtMoeda(relLiquidadoPagar)} está liquidado e aguardando pagamento (${relQtdLiquidadoPagar} DID${relQtdLiquidadoPagar !== 1 ? 's' : ''}). `}
                  {relEmpenhadoPagar > 0 && `${fmtMoeda(relEmpenhadoPagar)} está empenhado e aguardando liquidação/pagamento (${relQtdEmpenhadoPagar} DID${relQtdEmpenhadoPagar !== 1 ? 's' : ''}). `}
                  {relPendente > 0 && `Há ${fmtMoeda(relPendente)} (${relInad}%) de valor ainda não pago no total. `}
                  {relTicket > 0 && `O ticket médio por DID é de ${fmtMoeda(relTicket)}. `}
                  {relatorio.porSecretaria?.length > 0 && `A secretaria com maior volume é "${secSigla(relatorio.porSecretaria[0].secretaria) || 'não informada'}", com ${fmtMoeda(relatorio.porSecretaria[0].total)}. `}
                  {relatorio.porCredor?.length > 0 && `O principal credor é "${relatorio.porCredor[0].credor || 'não informado'}", com ${fmtMoeda(relatorio.porCredor[0].total)}.`}
                </p>
              </div>

              {/* ── Alertas ──────────────────────────────────────────────────── */}
              {(relInad > 0 || relatorio.porCredor?.length > 0 || relatorio.porSecretaria?.length > 0) && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="font-semibold text-ink-900 dark:text-white">Alertas e Destaques</h3>
                  </div>
                  <div className="space-y-2">
                    {relInad > 30 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/30">
                        <AlertCircle className="w-4 h-4 text-danger-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-danger-700 dark:text-danger-300">
                          <strong>Alto índice de inadimplência:</strong> {relInad}% do valor total está pendente ({fmtMoeda(relPendente)}).
                        </p>
                      </div>
                    )}
                    {relInad > 0 && relInad <= 30 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/30">
                        <Clock3 className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-warning-700 dark:text-warning-300">
                          <strong>Pagamentos pendentes:</strong> {relInad}% do valor ({fmtMoeda(relPendente)}) aguarda pagamento.
                        </p>
                      </div>
                    )}
                    {relatorio.porCredor?.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800/30">
                        <TrendingUp className="w-4 h-4 text-info-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-brand-700 dark:text-info-300">
                          <strong>Maior credor:</strong> {relatorio.porCredor[0].credor || 'Não informado'} com {fmtMoeda(relatorio.porCredor[0].total)} ({relatorio.porCredor[0].qtd} DID{Number(relatorio.porCredor[0].qtd) !== 1 ? 's' : ''}).
                        </p>
                      </div>
                    )}
                    {relatorio.porSecretaria?.length > 0 && (() => {
                      const topSec = relatorio.porSecretaria[0]
                      const pctSec = relTotal > 0 ? Math.round((parseFloat(topSec.total) / relTotal) * 100) : 0
                      return pctSec > 40 ? (
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30">
                          <Building2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            <strong>Alta concentração:</strong> {secSigla(topSec.secretaria) || 'Não informada'} representa {pctSec}% do total de despesas ({fmtMoeda(topSec.total)}).
                          </p>
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              )}

              {/* ── Gráficos — linha 1: dois donuts ──────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Donut: Status de pagamento */}
                <div className="card p-4">
                  <SectionTitle icon={CheckCircle2} title="Status de Pagamento" />
                  {relQtdTotal > 0 ? (() => {
                    const donutData = [
                      { name: 'Pago',             value: relPago,             fill: '#22c55e' },
                      { name: 'Liquidado a pagar', value: relLiquidadoPagar,   fill: '#6366f1' },
                      { name: 'Empenhado a pagar', value: relEmpenhadoPagar,   fill: '#f97316' },
                      { name: 'Pendente',         value: relPendenteEstrito,  fill: '#facc15' },
                    ].filter(d => d.value > 0)
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-4 mt-3">
                        <ResponsiveContainer width={160} height={160}>
                          <PieChart>
                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" isAnimationActive paddingAngle={3}>
                              {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <RTooltip formatter={(v) => fmtMoeda(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2 w-full">
                          {[
                            { label: 'Pago',             value: relPago,            qtd: relQtdPago,            color: 'bg-success-500',  text: 'text-success-700 dark:text-success-400'  },
                            { label: 'Liquidado a pagar', value: relLiquidadoPagar, qtd: relQtdLiquidadoPagar,  color: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400' },
                            { label: 'Empenhado a pagar', value: relEmpenhadoPagar, qtd: relQtdEmpenhadoPagar,  color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
                            { label: 'Pendente',         value: relPendenteEstrito, qtd: relQtdPendenteEstrito, color: 'bg-warning-400', text: 'text-warning-700 dark:text-warning-400' },
                          ].map(item => {
                            const pct = relTotal > 0 ? Math.min(100, Math.round((item.value / relTotal) * 100)) : 0
                            return (
                              <div key={item.label}>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`} />
                                    <span className={`text-sm font-medium ${item.text}`}>{item.label}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold text-ink-900 dark:text-white">{fmtMoeda(item.value)}</span>
                                    <span className="text-xs text-ink-400 ml-1">{pct}%</span>
                                  </div>
                                </div>
                                <div className="h-1.5 bg-ink-100 rounded-full">
                                  <div className={`h-1.5 ${item.color} rounded-full transition-all duration-700`} style={{ width: pct + '%' }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })() : <p className="text-sm text-ink-400 text-center py-8">Sem dados no período</p>}
                </div>

                {/* Donut: Distribuição por Tipo */}
                <div className="card p-4">
                  <SectionTitle icon={Tag} title="Distribuição por Tipo" />
                  {relatorio.porTipo?.length > 0 ? (() => {
                    const TIPO_COLORS = ['#3b82f6', '#a855f7', '#6366f1', '#0ea5e9']
                    const donutData = relatorio.porTipo.map((t, i) => ({
                      name:  t.tipo_did === 'variaveis' ? 'Variáveis' : t.tipo_did === 'fixas' ? 'Fixas' : t.tipo_did || 'Outros',
                      value: parseFloat(t.total) || 0,
                      fill:  TIPO_COLORS[i % TIPO_COLORS.length],
                      qtd:   t.qtd
                    }))
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-4 mt-3">
                        <ResponsiveContainer width={160} height={160}>
                          <PieChart>
                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" isAnimationActive paddingAngle={3}>
                              {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <RTooltip formatter={(v) => fmtMoeda(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2 w-full">
                          {donutData.map((item, i) => {
                            const pct = relTotal > 0 ? Math.min(100, Math.round((item.value / relTotal) * 100)) : 0
                            return (
                              <div key={i}>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
                                    <span className="text-sm font-medium text-ink-700">{item.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold text-ink-900 dark:text-white">{fmtMoeda(item.value)}</span>
                                    <span className="text-xs text-ink-400 ml-1">{pct}%</span>
                                  </div>
                                </div>
                                <div className="h-1.5 bg-ink-100 rounded-full">
                                  <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: pct + '%', background: item.fill }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })() : <p className="text-sm text-ink-400 text-center py-8">Sem dados no período</p>}
                </div>
              </div>

              {/* ── Gráfico de evolução mensal (linha) ───────────────────────── */}
              {relatorio.porMes?.length > 0 && (() => {
                const linhaData = buildLinhaData(relatorio.porMes)
                if (linhaData.length < 2) return null
                return (
                  <div className="card p-4">
                    <SectionTitle icon={TrendingUp} title="Evolução Mensal das Despesas" />
                    <p className="text-xs text-ink-400 mt-0.5 mb-4">Valor bruto por mês — pago vs pendente (conforme filtros selecionados)</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={linhaData} margin={{ top: 6, right: 20, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradRelTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradRelPago" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradRelPend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#facc15" stopOpacity={0.2} /><stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                        <RTooltip formatter={(v, name) => [fmtMoeda(v), name === 'total' ? 'Total' : name === 'pago' ? 'Pago' : 'Pendente']} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <RLegend formatter={v => <span style={{ color: 'var(--color-ink-600)' }}>{v === 'total' ? 'Total' : v === 'pago' ? 'Pago' : 'Pendente'}</span>} wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="total"    stroke="#3b82f6" strokeWidth={2} fill="url(#gradRelTotal)" dot={false} activeDot={{ r: 5 }} isAnimationActive />
                        <Area type="monotone" dataKey="pago"     stroke="#22c55e" strokeWidth={2} fill="url(#gradRelPago)"  dot={false} activeDot={{ r: 5 }} isAnimationActive />
                        <Area type="monotone" dataKey="pendente" stroke="#facc15" strokeWidth={2} fill="url(#gradRelPend)"  dot={false} activeDot={{ r: 5 }} isAnimationActive />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}

              {/* ── Gráficos — linha 2: barras horizontais ────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Bar horizontal: Secretarias */}
                <div className="card p-4">
                  <SectionTitle icon={Building2} title="Ranking por Secretaria" />
                  {relatorio.porSecretaria?.length > 0 ? (() => {
                    const data = relatorio.porSecretaria.map(s => ({
                      name:  secSigla(s.secretaria) || 'N/I',
                      value: parseFloat(s.total) || 0,
                      pct:   relTotal > 0 ? Math.min(100, Math.round((parseFloat(s.total) / relTotal) * 100)) : 0,
                    })).reverse()
                    return (
                      <div className="mt-3">
                        <ResponsiveContainer width="100%" height={data.length * 36 + 16}>
                          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                            <RTooltip formatter={(v) => fmtMoeda(v)} cursor={{ fill: 'rgba(59,130,246,.07)' }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} isAnimationActive>
                              {data.map((_, i) => <Cell key={i} fill={`hsl(${220 - i * 10},70%,${55 + i * 3}%)`} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  })() : <p className="text-sm text-ink-400 text-center py-8">Sem dados no período</p>}
                </div>

                {/* Bar horizontal: Credores */}
                <div className="card p-4">
                  <SectionTitle icon={TrendingUp} title="Ranking por Credor" />
                  {relatorio.porCredor?.length > 0 ? (() => {
                    const data = relatorio.porCredor.map(c => ({
                      name:  (c.credor || 'N/I').length > 22 ? (c.credor || 'N/I').slice(0, 22) + '…' : (c.credor || 'N/I'),
                      full:   c.credor || 'Não informado',
                      value:  parseFloat(c.total) || 0,
                    })).reverse()
                    return (
                      <div className="mt-3">
                        <ResponsiveContainer width="100%" height={data.length * 36 + 16}>
                          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                            <RTooltip formatter={(v, _, p) => [fmtMoeda(v), p.payload.full]} cursor={{ fill: 'rgba(99,102,241,.07)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive>
                              {data.map((_, i) => <Cell key={i} fill={`hsl(${260 - i * 8},60%,${55 + i * 3}%)`} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  })() : <p className="text-sm text-ink-400 text-center py-8">Sem dados no período</p>}
                </div>
              </div>

              {/* ── Gráfico — Fonte de Recurso ───────────────────────────────── */}
              {relatorio.porFonte?.length > 0 && (
                <div className="card p-4">
                  <SectionTitle icon={Landmark} title="Distribuição por Fonte de Recurso" />
                  {(() => {
                    const FONTE_COLORS = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316']
                    const data = relatorio.porFonte.map((f, i) => ({
                      name:  (f.fonte || 'N/I').length > 30 ? (f.fonte || 'N/I').slice(0, 30) + '…' : (f.fonte || 'N/I'),
                      full:   f.fonte || 'Não informada',
                      value:  parseFloat(f.total) || 0,
                      fill:   FONTE_COLORS[i % FONTE_COLORS.length],
                    }))
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" isAnimationActive paddingAngle={2}>
                              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <RTooltip formatter={(v, _, p) => [fmtMoeda(v), p.payload.full]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 self-center">
                          {data.map((item, i) => {
                            const pct = relTotal > 0 ? Math.min(100, Math.round((item.value / relTotal) * 100)) : 0
                            return (
                              <div key={i}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
                                    <span className="text-xs text-ink-600 truncate" title={item.full}>{item.name}</span>
                                  </div>
                                  <span className="text-xs font-semibold text-ink-800 dark:text-white ml-2 shrink-0">{pct}%</span>
                                </div>
                                <div className="h-1 bg-ink-100 rounded-full">
                                  <div className="h-1 rounded-full" style={{ width: pct + '%', background: item.fill }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* ── Tabela Analítica de DIDs ───────────────────────────────────── */}
              <div className="bg-surface border border-ink-100 rounded-2xl overflow-hidden">
                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-ink-100">
                  <div>
                    <h3 className="font-semibold text-ink-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-info-500" />
                      Tabela Analítica de DIDs
                    </h3>
                    <p className="text-xs text-ink-400 mt-0.5">{relDidsOrdenados.length} DID{relDidsOrdenados.length !== 1 ? 's' : ''} encontrado{relDidsOrdenados.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Busca rápida */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
                      <input
                        className="input-field pl-8 text-sm h-9 w-52"
                        placeholder="Buscar DID, credor, secretaria..."
                        value={relDidsBusca}
                        onChange={e => { setRelDidsBusca(e.target.value); setRelDidsPage(1) }}
                      />
                      {relDidsBusca && (
                        <button onClick={() => { setRelDidsBusca(''); setRelDidsPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Exportar PDF */}
                    {relDidsOrdenados.length > 0 && (
                      <button
                        className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50 text-xs font-medium shadow-sm transition-all"
                        onClick={() => {
                          const rows = relDidsOrdenados.map(p => {
                            const d = p.did
                            return [
                              d ? fmtNumeroDid(d.numero_did) : p.numero || '—',
                              d?.credor_sec1 || p.interessado_nome || '—',
                              d?.secretaria_sec1 || '—',
                              d?.tipo_did === 'variaveis' ? 'Variável' : d?.tipo_did === 'fixas' ? 'Fixa' : '—',
                              fmtData(d?.data_emissao || p.created_at),
                              fmtMoeda(d?.valor_bruto || 0),
                              d?.pago === 'sim' ? 'Pago' : 'Pendente',
                            ]
                          })
                          // Gerar PDF simples via print
                          const win = window.open('', '_blank', 'width=900,height=700')
                          if (!win) return
                          const periodo = (relFiltros.data_inicio || relFiltros.data_fim)
                            ? ` — ${relFiltros.data_inicio ? fmtData(relFiltros.data_inicio) : '...'} até ${relFiltros.data_fim ? fmtData(relFiltros.data_fim) : '...'}`
                            : ''
                          win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório DIDs</title><style>
                            @page{size:A4 portrait;margin:0}
                            *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
                            body{font-family:Arial,sans-serif;font-size:11px;color:#222;margin:0}
                            .layout{width:100%;border-collapse:collapse}
                            .layout>thead>tr>td,.layout>tfoot>tr>td{border:0!important;padding:0!important;background:transparent!important}
                            .layout>tbody>tr>td{border:0!important;background:transparent!important}
                            .sp-top{height:${tenant?.configuracoes?.margens?.top??20}mm}.sp-bottom{height:${tenant?.configuracoes?.margens?.bottom??20}mm}
                            .content{padding:0 ${tenant?.configuracoes?.margens?.right??14}mm 0 ${tenant?.configuracoes?.margens?.left??14}mm!important}
                            h2{font-size:15px;margin-bottom:4px}p{color:#666;margin-bottom:12px;font-size:11px}
                            table.data{width:100%;border-collapse:collapse}
                            table.data thead{display:table-header-group}
                            table.data th{background:#1e40af;color:#fff;padding:6px 8px;text-align:left;font-size:10px;font-weight:600}
                            table.data td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}
                            table.data tbody tr:nth-child(even) td{background:#f8fafc}
                            .pago{color:#16a34a;font-weight:600}.pend{color:#d97706;font-weight:600}
                            ${timbradoFundoCSS()}
                          </style></head><body>
                            <table class="layout">
                            <thead><tr><td><div class="sp-top"></div></td></tr></thead>
                            <tfoot><tr><td><div class="sp-bottom"></div></td></tr></tfoot>
                            <tbody><tr><td class="content">
                            <h2>Tabela Analítica de DIDs${periodo}</h2>
                            <p>${relDidsOrdenados.length} DID${relDidsOrdenados.length !== 1 ? 's' : ''} — gerado em ${new Date().toLocaleString('pt-BR')}</p>
                            <table class="data"><thead><tr><th>DID</th><th>Credor</th><th>Secretaria</th><th>Tipo</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
                            <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td class="${r[6]==='Pago'?'pago':'pend'}">${r[6]}</td></tr>`).join('')}</tbody></table>
                            </td></tr></tbody></table>
                            <script>window.onload=()=>{window.print();window.close()}</script></body></html>`)
                          win.document.close()
                        }}
                      >
                        <FileDown className="w-3.5 h-3.5" /> PDF
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabela */}
                {relDids.length === 0 ? (
                  <div className="py-12 text-center text-ink-400 text-sm">
                    Nenhum DID carregado. Clique em <strong className="text-brand-600 dark:text-info-400">Gerar Relatório</strong> para carregar os dados.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-ink-100">
                          <tr className="border-b border-ink-200">
                            {[
                              { key: 'did',        label: 'DID',        cls: 'w-24' },
                              { key: 'credor',     label: 'Credor',     cls: '' },
                              { key: 'secretaria', label: 'Secretaria', cls: 'hidden md:table-cell' },
                              { key: 'tipo',       label: 'Tipo',       cls: 'hidden sm:table-cell w-24' },
                              { key: 'data',       label: 'Data',       cls: 'hidden sm:table-cell w-28' },
                              { key: 'valor',      label: 'Valor',      cls: 'w-32 text-right' },
                              { key: 'status',     label: 'Status',     cls: 'w-24 text-center' },
                            ].map(col => (
                              <th
                                key={col.key}
                                className={`py-2.5 px-3 text-xs font-semibold text-ink-500 cursor-pointer select-none hover:text-brand-600 dark:hover:text-info-400 transition-colors ${col.cls} ${col.key === 'valor' ? 'text-right' : col.key === 'status' ? 'text-center' : 'text-left'}`}
                                onClick={() => relDidsToggleSort(col.key)}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {col.label}
                                  {relDidsSort === col.key && (
                                    <span className="text-info-500">{relDidsSortDir === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-200">
                          {relDidsPagina.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-ink-400">
                                Nenhum DID encontrado para "{relDidsBusca}"
                              </td>
                            </tr>
                          ) : relDidsPagina.map(p => {
                            const did = p.did
                            const isPago = did?.pago === 'sim'
                            return (
                              <tr key={p.id} className="hover:bg-ink-50 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-semibold text-brand-600 dark:text-info-400 whitespace-nowrap">
                                  {did ? fmtNumeroDid(did.numero_did) : p.numero || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-ink-700 max-w-[200px] truncate" title={did?.credor_sec1 || p.interessado_nome || ''}>
                                  {did?.credor_sec1 || p.interessado_nome || <span className="text-ink-400">—</span>}
                                </td>
                                <td className="py-2.5 px-3 text-ink-600 hidden md:table-cell max-w-[160px] truncate" title={did?.secretaria_sec1 || ''}>
                                  {did?.secretaria_sec1 || <span className="text-ink-400">—</span>}
                                </td>
                                <td className="py-2.5 px-3 hidden sm:table-cell">
                                  {did ? (
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      did.tipo_did === 'variaveis'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                        : 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-300'
                                    }`}>
                                      {did.tipo_did === 'variaveis' ? 'Variável' : 'Fixa'}
                                    </span>
                                  ) : <span className="text-ink-400">—</span>}
                                </td>
                                <td className="py-2.5 px-3 text-ink-500 whitespace-nowrap hidden sm:table-cell text-xs">
                                  {fmtData(did?.data_emissao || p.created_at)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-ink-900 dark:text-white whitespace-nowrap">
                                  {fmtMoeda(did?.valor_bruto || 0)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {did ? (
                                    isPago
                                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"><CheckCircle2 className="w-3 h-3" />Pago</span>
                                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"><Clock3 className="w-3 h-3" />Pendente</span>
                                  ) : <span className="text-ink-400 text-xs">—</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    <Paginacao total={relDidsOrdenados.length} pagina={relDidsPage} setPagina={setRelDidsPage} porPagina={REL_DIDS_PER_PAGE}
                      setPorPagina={(n) => { setRelDidsPorPagina(n); setRelDidsPage(1) }} rotulo="DID" className="border-t border-ink-100 px-5" />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-ink-400">
              <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-ink-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink-500">Nenhum relatório gerado</p>
                <p className="text-xs text-ink-400 mt-1">Configure os filtros e clique em <strong className="text-brand-600 dark:text-info-400">Gerar Relatório</strong></p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAIS ════════════════════════════════════════════════════════════ */}
      {didVizId && (
        <ModalVerDid processoId={didVizId} tenant={tenant} onClose={() => setDidVizId(null)} />
      )}
    </div>
  )
}
