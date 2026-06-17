import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, BarChart3,
  Calendar, FolderOpen, Tag, Building2, Landmark, DollarSign,
  Search, X, RefreshCw, FileDown, Eye,
  CheckCircle2, Clock3, AlertCircle,
  Loader2, AlertTriangle, TrendingUp, ChevronDown,
} from 'lucide-react'
import api from '../services/api'
import { PageHeader, SectionTitle, ActionBar } from '../components/ui'
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
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', emoji: '⏳' },
  pago:     { label: 'Pago',     color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',  emoji: '✅' },
  vencido:  { label: 'Vencido',  color: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',    emoji: '🔴' },
  cancelado:{ label: 'Cancelado',color: 'bg-gray-100   text-gray-600   dark:bg-slate-700/50  dark:text-slate-400',   emoji: '❌' },
}
const PROC_STATUS = {
  aberto:     { label: 'Aberto',      color: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400' },
  em_analise: { label: 'Em Análise',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  concluido:  { label: 'Concluído',   color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400' },
  devolvido:  { label: 'Devolvido',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  arquivado:  { label: 'Arquivado',   color: 'bg-gray-100   text-gray-600   dark:bg-slate-700/50  dark:text-slate-400' },
}
const TABS = [
  { id: 'painel',    label: 'Painel',        Icon: LayoutDashboard },
  { id: 'processos', label: 'Processos DID', Icon: FileText },
  { id: 'relatorio', label: 'Relatório',     Icon: BarChart3 },
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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700/50">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-500 dark:text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Card de métrica ──────────────────────────────────────────────────────────
function MetricCard({ Icon, emoji, label, value, sub, color = 'blue' }) {
  const gradients = {
    blue:   'from-blue-500   to-indigo-600',
    green:  'from-green-500  to-emerald-600',
    yellow: 'from-yellow-400 to-orange-500',
    red:    'from-red-500    to-rose-600',
    purple: 'from-purple-500 to-violet-600',
  }
  const IconComponent = Icon || null
  const str = String(value ?? '')
  const len = Math.max(str.length, 1)
  // Escala linear: 1.875rem para ≤7 chars → 1rem para 17 chars → mín 0.85rem
  // R$ 125.000.000,00 (17 chars) → 1rem, sempre sem quebra de linha
  const autoFontSize = Math.min(1.875, Math.max(0.85, 1.875 - 0.0875 * (len - 7))) + 'rem'
  return (
    <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-5 min-h-[120px] min-w-0 overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center shadow-md flex-shrink-0`}>
          {IconComponent
            ? <IconComponent className="w-6 h-6 text-white" />
            : <span className="text-xl">{emoji}</span>
          }
        </div>
        {sub && <span className="text-xs text-gray-400 dark:text-slate-500 mt-1 text-right leading-tight flex-shrink-0 max-w-[55%]">{sub}</span>}
      </div>
      <div className="mt-3 min-w-0">
        <p
          className="font-bold tabular-nums whitespace-nowrap text-gray-900 dark:text-white leading-tight"
          style={{ fontSize: autoFontSize }}
        >{value}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 leading-snug truncate">{label}</p>
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
      {label && <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input-field w-full text-left flex items-center justify-between gap-2 text-sm min-h-[38px]"
      >
        <span className={selected.length === 0 ? 'text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white truncate'}>
          {selected.length === 0 ? placeholder
            : selected.length === 1 ? (options.find(o => (o.v ?? o) === selected[0])?.l ?? selected[0])
            : `${selected.length} selecionados`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[11px] font-medium">
              {options.find(o => (o.v ?? o) === v)?.l ?? v}
              <button type="button" onClick={e => { e.stopPropagation(); toggle(v) }} className="hover:text-red-500 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl" style={{ minWidth: '200px' }}>
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="w-full text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">Nenhuma opção encontrada</p>
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
                    checked ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center text-[10px] transition-colors ${
                    checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-slate-500'
                  }`}>{checked ? '✓' : ''}</span>
                  <span className="truncate">{l}</span>
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false) }}
                className="w-full text-xs text-red-500 hover:text-red-600 py-1 text-center"
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
      <span className="text-[11px] text-gray-400 dark:text-slate-500 w-44 flex-shrink-0 pt-0.5">{l}</span>
      <span className="text-[12px] font-medium text-gray-900 dark:text-white">{v}</span>
    </div>
  ) : null

  const SecBar = ({ num, titulo, color }) => (
    <div className={`flex items-center gap-2 px-4 py-2 ${color}`}>
      <span className="text-[10px] font-bold text-white bg-black/25 rounded px-1.5 py-0.5">{num}</span>
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
        <span key={i} className="text-[11px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">{item}</span>
      ))}
    </div>
  )

  const isVar = did?.tipo_did === 'variaveis'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '94vh' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {loading && <span className="text-gray-400 text-sm">Carregando...</span>}
            {!loading && !did && <span className="text-gray-400 text-sm">DID não encontrado</span>}
            {did && (
              <>
                <span className="font-mono font-bold text-white text-base">
                  DID-{String(did.numero_did || '').padStart(3, '0')}
                </span>
                <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                  isVar ? 'bg-purple-500/30 text-purple-200' : 'bg-blue-500/30 text-blue-200'
                )}>
                  {isVar ? 'Contas Variáveis' : 'Contas Fixas'}
                </span>
                <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                  did.pago === 'sim' ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'
                )}>
                  {did.pago === 'sim' ? <><CheckCircle2 className="w-3 h-3" /> Pago</> : <><Clock3 className="w-3 h-3" /> Pendente</>}
                </span>
                {did.secretaria_sec1 && <span className="text-xs text-gray-400">· {did.secretaria_sec1}</span>}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handlePDF} disabled={!did || gerando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
              {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Gerar PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm">Carregando DID...</span>
            </div>
          ) : !did ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <span className="text-sm">DID não encontrado ou não preenchido para este processo.</span>
            </div>
          ) : (
            <>
              {/* ══ SEÇÃO I — Dados Gerais (comum aos dois tipos) ══ */}
              <Sec num="I" titulo="Dados Gerais" color="bg-blue-700">
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
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">Certidões (Sec. I)</span>
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
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">Despacho via C.I.</span>
                    <p className="text-[12px] text-gray-800 dark:text-slate-200 mt-0.5 whitespace-pre-wrap">{did.despacho_ci}</p>
                  </div>
                )}
              </Sec>

              {/* ══ ITENS ══ */}
              {did.itens_did?.length > 0 && (
                <div className="card overflow-hidden">
                  <SecBar num="ITENS" titulo="Itens do DID" color="bg-teal-700" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-slate-400">Descrição</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-500 dark:text-slate-400 w-16">Unid.</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-500 dark:text-slate-400 w-20">Qtd.</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-500 dark:text-slate-400 w-28">Vlr. Unit.</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-500 dark:text-slate-400 w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {did.itens_did.map((it, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2 px-3 text-gray-800 dark:text-slate-200">{it.descricao || '—'}</td>
                            <td className="py-2 px-3 text-center text-gray-500">{it.unidade || '—'}</td>
                            <td className="py-2 px-3 text-right text-gray-700 dark:text-slate-300">{it.quantidade || '—'}</td>
                            <td className="py-2 px-3 text-right text-gray-700 dark:text-slate-300">{it.valor_unitario ? fmtM(it.valor_unitario) : '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white">{it.valor_total ? fmtM(it.valor_total) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 dark:bg-slate-800/80">
                          <td colSpan={4} className="py-2 px-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300">Total Itens</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
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
                  <SecBar num="VI" titulo="Tesouraria" color="bg-green-800" />
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                    <R l="Recebido em" v={fmtD(did.tesouraria_recebido_em)} />
                    <R l="Responsável" v={did.tesouraria_responsavel} />
                    <R l="Banco Pagador" v={did.banco_pagador} />
                    <R l="Ag. Pagador" v={did.ag_pagador} />
                    <R l="C/C Pagador" v={did.cc_pagador} />
                    {/* Certidões Tesouraria */}
                    {hasAny(did.cert_teso_cnd, did.cert_teso_fgts, did.cert_teso_estadual, did.cert_teso_trabalhista, did.cert_teso_municipal) && (
                      <div className="col-span-2 mt-1">
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">Certidões</span>
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
                      <span className="text-[11px] text-gray-400 dark:text-slate-500 w-44">Status de Pagamento</span>
                      <span className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ' + (did.pago === 'sim' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300')}>
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
                      <span className="text-[11px] text-gray-400 dark:text-slate-500">Observações</span>
                      <p className="text-[12px] text-gray-800 dark:text-slate-200 mt-0.5 whitespace-pre-wrap">{did.receb_obs}</p>
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
                  <SecBar num="XI" titulo="Tesouraria" color="bg-green-800" />
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                    <R l="Recebido em" v={fmtD(did.tesouraria_recebido_em)} />
                    <R l="Responsável" v={did.tesouraria_responsavel} />
                    <R l="Banco Pagador" v={did.banco_pagador} />
                    <R l="Ag. Pagador" v={did.ag_pagador} />
                    <R l="C/C Pagador" v={did.cc_pagador} />
                    {/* Certidões Tesouraria */}
                    {hasAny(did.cert_teso_cnd, did.cert_teso_fgts, did.cert_teso_estadual, did.cert_teso_trabalhista, did.cert_teso_municipal) && (
                      <div className="col-span-2 mt-1">
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">Certidões</span>
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
                      <span className="text-[11px] text-gray-400 dark:text-slate-500 w-44">Status de Pagamento</span>
                      <span className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ' + (did.pago === 'sim' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300')}>
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
  const VALID_TABS_FIN = TABS.map(t => t.id)
  const tab = VALID_TABS_FIN.includes(tabParam) ? tabParam : 'painel'
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
    status:      [],  // 'pago' | 'pendente'
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
  const [relFiltros, setRelFiltros] = useState({ data_inicio: '', data_fim: '', tipo: '' })
  const [relLoading, setRelLoading] = useState(false)
  // ── Tabela analítica de DIDs (relatório)
  const [relDids, setRelDids] = useState([])
  const [relDidsPage, setRelDidsPage] = useState(1)
  const [relDidsBusca, setRelDidsBusca] = useState('')
  const [relDidsSort, setRelDidsSort] = useState('data')
  const [relDidsSortDir, setRelDidsSortDir] = useState('desc')
  const REL_DIDS_PER_PAGE = 10

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const LIMIT = 15

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
      if (painelFiltros.meses_ref.length)   p.set('meses_ref',    painelFiltros.meses_ref.join(','))
      if (painelFiltros.data_inicio)        p.set('data_inicio',  painelFiltros.data_inicio)
      if (painelFiltros.data_fim)           p.set('data_fim',     painelFiltros.data_fim)
      if (painelFiltros.status.length === 1) p.set('status',      painelFiltros.status[0])
      if (painelFiltros.secretarias.length) p.set('secretarias',  painelFiltros.secretarias.join(','))
      if (painelFiltros.credores.length)    p.set('credores',     painelFiltros.credores.join(','))
      if (painelFiltros.fontes.length)      p.set('fontes',       painelFiltros.fontes.join(','))
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
      const p = new URLSearchParams({ page: painelDidsPage, limit: 20, ano: painelAno })
      if (painelFiltros.data_inicio)         p.set('data_inicio',  painelFiltros.data_inicio)
      if (painelFiltros.data_fim)            p.set('data_fim',     painelFiltros.data_fim)
      if (painelFiltros.status.length === 1) p.set('status_pago',  painelFiltros.status[0])
      if (painelFiltros.tipos.length)        p.set('tipo_did',     painelFiltros.tipos.join(','))
      if (painelFiltros.secretarias.length)  p.set('secretaria',   painelFiltros.secretarias.join(','))
      if (painelFiltros.credores.length)     p.set('credor',       painelFiltros.credores.join(','))
      if (painelFiltros.meses_ref.length)    p.set('mes_ref',      painelFiltros.meses_ref.join(','))
      const { data } = await api.get(`/financeiro/processos-did?${p}`)
      setPainelDids(data.processos || [])
      setPainelDidsTotal(data.total || 0)
    } catch { /* silenciar */ }
    setPainelDidsLoading(false)
  }, [painelAno, painelFiltros, painelDidsPage])

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
  }, [procsPage, procsFiltros])

  useEffect(() => { if (tab === 'processos') loadProcs() }, [tab, loadProcs])

  // ── Relatório
  const loadRelatorio = useCallback(async () => {
    setRelLoading(true)
    try {
      const p = new URLSearchParams(Object.fromEntries(Object.entries(relFiltros).filter(([, v]) => v)))
      // Carrega dados agregados E lista completa de DIDs em paralelo
      const [relRes, didsRes] = await Promise.all([
        api.get(`/financeiro/relatorio?${p}`),
        api.get(`/financeiro/processos-did?limit=500&${p.toString()}`),
      ])
      setRelatorio(relRes.data)
      setRelDids(didsRes.data.processos || [])
      setRelDidsPage(1)
      setRelDidsBusca('')
    } catch { /* silenciar */ }
    setRelLoading(false)
  }, [relFiltros])

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
  const pendentesQtd = painel?.dids?.pendentes?.length || 0
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
    <div className="space-y-6 animate-fade-in">
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
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/70 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
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
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/70 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-sm font-medium shadow-sm transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
            {tab === 'painel' && (
              <button
                className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  painel
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 cursor-not-allowed'
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
        <div className="flex gap-1 bg-gray-100/70 dark:bg-slate-800/50 rounded-xl p-1 min-w-max w-fit">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
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
        <div className="space-y-6">

          {/* ── Painel de filtros ────────────────────────────────────────── */}
          {mostrarFiltros && <div className="card p-4 space-y-4">
            {/* Linha 1: Ano + Tipo + Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Ano</p>
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
                options={[{ v: 'pago', l: '✅ Pago' }, { v: 'pendente', l: '⏳ Pendente' }]}
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
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Pagamento — Início</p>
                <input
                  type="date"
                  className="input-field w-full"
                  value={painelFiltros.data_inicio}
                  onChange={e => setPainelFiltros(f => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Pagamento — Fim</p>
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
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors"
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
                <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap ml-auto">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                  {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>}

          {loadingPainel ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm">Carregando painel...</span>
            </div>
          ) : painel ? (
            <>
              {/* ── Cards de métricas DID ─────────────────────────── */}
              {painel.dids && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <MetricCard Icon={DollarSign}   label="Valor Bruto Total"  value={fmtMoeda(painel.dids.valorBrutoTotal)}  color="blue"   />
                  <MetricCard Icon={CheckCircle2} label="Total Pago"         value={fmtMoeda(painel.dids.valorPago)}        color="green"  />
                  <MetricCard Icon={Clock3}       label="Total Pendente"     value={fmtMoeda(painel.dids.valorPendente)}    color="yellow" />
                  <MetricCard Icon={FileText}     label="Total DIDs"         value={totalDIDs}                              color="blue"   />
                  <MetricCard Icon={AlertCircle}  label="Inadimplência"      value={inadValue} sub={inadSub}               color={inadColor} />
                </div>
              )}

              {/* ── Relação de DIDs (lista completa filtrada) ───────────── */}
              <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50">
                  <p className="section-title">Relação de DIDs — {painelAno}</p>
                  {painelDidsTotal > 0 && (
                    <span className="text-xs text-gray-400 dark:text-slate-500">{painelDidsTotal} DID{painelDidsTotal !== 1 ? 's' : ''}</span>
                  )}
                </div>
                {painelDidsLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr className="border-b border-slate-200 dark:border-slate-700/50">
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Nº DID</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Tipo</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Credor</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Secretaria</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Mês Ref.</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Data</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Valor Bruto</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Pagto.</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {painelDids.length === 0 ? (
                          <tr><td colSpan={9} className="py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Nenhum DID registrado no período</td></tr>
                        ) : painelDids.map(proc => {
                          const d = proc.did
                          return (
                            <tr key={proc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                {d ? `DID-${String(d.numero_did).padStart(3, '0')}` : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                {d ? (
                                  <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                                    d.tipo_did === 'variaveis'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  )}>
                                    {d.tipo_did === 'variaveis' ? 'Variáveis' : 'Fixas'}
                                  </span>
                                ) : <span className="text-xs text-gray-400">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-gray-900 dark:text-white max-w-[160px] truncate">{d?.credor_sec1 || proc.interessado_nome || '—'}</td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300" title={d?.secretaria_sec1 || ''}>
                                  {secSigla(d?.secretaria_sec1)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{d?.mes_referencia || '—'}</td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{fmtData(d?.data_did || proc.data_abertura)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                {d?.valor_bruto ? fmtMoeda(d.valor_bruto) : <span className="text-gray-400 text-xs">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {d ? (
                                  d.pago === 'sim'
                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3" /> Pago</span>
                                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock3 className="w-3 h-3" /> Pendente</span>
                                ) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  disabled={!d}
                                  onClick={() => d && setDidVizId(proc.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                {painelDidsTotal > 20 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{painelDidsTotal} registros</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        disabled={painelDidsPage === 1} onClick={() => setPainelDidsPage(p => p - 1)}
                      >← Anterior</button>
                      <span className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {painelDidsPage} / {Math.ceil(painelDidsTotal / 20)}
                      </span>
                      <button
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        disabled={painelDidsPage * 20 >= painelDidsTotal} onClick={() => setPainelDidsPage(p => p + 1)}
                      >Próxima →</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Distribuição por Tipo + Status de Pagamento ───────── */}
              {painel.dids && totalDIDs > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Distribuição por Tipo */}
                  <div className="card p-5">
                    <SectionTitle icon={BarChart3} title="Distribuição por Tipo" />
                    <div className="space-y-4">
                      <div className="h-10 rounded-xl overflow-hidden flex shadow-inner">
                        <div
                          className="bg-blue-500 flex items-center justify-center transition-all"
                          style={{ width: pctFixas + '%' }}
                        >
                          {pctFixas > 12 && <span className="text-white text-xs font-bold drop-shadow">{pctFixas}%</span>}
                        </div>
                        <div
                          className="bg-purple-500 flex items-center justify-center transition-all"
                          style={{ width: pctVariaveis + '%' }}
                        >
                          {pctVariaveis > 12 && <span className="text-white text-xs font-bold drop-shadow">{pctVariaveis}%</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-blue-500 rounded flex-shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{painel.dids.totalFixas}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">Contas Fixas</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-purple-500 rounded flex-shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{painel.dids.totalVariaveis}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">Contas Variáveis</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status de Pagamento */}
                  <div className="card p-5">
                    <SectionTitle icon={CheckCircle2} title="Status de Pagamento" />
                    <div className="space-y-4">
                      <div className="h-10 rounded-xl overflow-hidden flex shadow-inner">
                        <div
                          className="bg-green-500 flex items-center justify-center transition-all"
                          style={{ width: pctPago + '%' }}
                        >
                          {pctPago > 12 && <span className="text-white text-xs font-bold drop-shadow">{pctPago}%</span>}
                        </div>
                        <div
                          className="bg-yellow-400 flex items-center justify-center transition-all"
                          style={{ width: (100 - pctPago) + '%' }}
                        >
                          {(100 - pctPago) > 12 && <span className="text-white text-xs font-bold drop-shadow">{100 - pctPago}%</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-green-500 rounded flex-shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">{totalDIDs - pendentesQtd}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">DIDs Pagos</div>
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">{fmtMoeda(painel.dids.valorPago)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-yellow-400 rounded flex-shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{pendentesQtd}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">DIDs Pendentes</div>
                            <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mt-0.5">{fmtMoeda(painel.dids.valorPendente)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Separador · Lançamentos Financeiros ─────────────── */}
              {(painel.totais.lancamentos > 0 || parseFloat(painel.totais.valorTotal) > 0) && (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-2">Lançamentos Financeiros</span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard Icon={DollarSign} label="Total Despesas"  value={fmtMoeda(painel.totais.valorTotal)}     color="blue"   />
                    <MetricCard Icon={CheckCircle2} label="Valores Pagos"   value={fmtMoeda(painel.totais.valorPago)}      color="green"  />
                    <MetricCard Icon={Clock3} label="A Pagar"         value={fmtMoeda(painel.totais.valorPendente)}  color="yellow" />
                    <MetricCard Icon={AlertCircle} label="Vencidos"        value={fmtMoeda(painel.totais.valorVencido)}   color="red"    />
                  </div>
                </>
              )}

              {/* Gráfico por mês — DIDs */}
              <div className="card p-5">
                <SectionTitle icon={Calendar} title={`DIDs por Mês — ${painelAno}`} />
                {mesesData.every(v => v === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhum DID com data registrada neste período</p>
                ) : (
                  <div className="flex items-end gap-1.5 h-44 mt-2">
                    {mesesData.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {v > 0 && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-slate-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {fmtMoeda(v)}
                          </div>
                        )}
                        <div
                          className={`w-full rounded-t-md transition-all cursor-default ${
                            v > 0 ? 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-400' : 'bg-gray-100 dark:bg-slate-700'
                          }`}
                          style={{ height: v > 0 ? Math.max((v / mesesMax) * 140, 4) + 'px' : '4px' }}
                        />
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 select-none">{MESES[i]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Por Secretaria */}
                <div className="card p-5">
                  <SectionTitle icon={Building2} title="Por Secretaria" />
                  {(!painel.dids?.porSecretaria || painel.dids.porSecretaria.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
                  )}
                  <div className="space-y-3">
                    {painel.dids?.porSecretaria?.map((c, i) => {
                      const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                      const itemTotal = parseFloat(c.total) || 0
                      const pct = totalGeral > 0 && itemTotal > 0 ? Math.min(100, Math.round((itemTotal / totalGeral) * 100)) : 0
                      const cores = ['bg-blue-500','bg-purple-500','bg-teal-500','bg-indigo-500','bg-cyan-500','bg-violet-500','bg-sky-500','bg-fuchsia-500']
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-slate-300 truncate max-w-[65%]" title={c.secretaria}>{c.secretaria || '—'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap ml-2">{fmtMoeda(c.total)} <span className="text-xs text-gray-400">({c.qtd} DID{c.qtd !== 1 ? 's' : ''})</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full">
                            <div className={'h-2 ' + cores[i % cores.length] + ' rounded-full transition-all'} style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* DIDs Pendentes */}
                <div className="card p-5">
                  <SectionTitle icon={Clock3} title="DIDs Pendentes" />
                  {(!painel.dids?.pendentes || painel.dids.pendentes.length === 0) ? (
                    <p className="text-sm text-gray-400 text-center py-4">✅ Nenhum DID pendente de pagamento</p>
                  ) : (
                    <div className="space-y-2">
                      {painel.dids.pendentes.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                                DID-{String(d.numero_did).padStart(3,'0')}
                              </span>
                              <span className={'inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ' + (
                                d.tipo_did === 'variaveis'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              )}>{d.tipo_did === 'variaveis' ? 'Var.' : 'Fix.'}</span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-slate-400 truncate">{d.credor_sec1 || d.secretaria_sec1 || '—'}</p>
                            {d.mes_referencia && <p className="text-[10px] text-gray-400">Ref: {d.mes_referencia}</p>}
                          </div>
                          <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400 whitespace-nowrap">{fmtMoeda(d.valor_bruto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Credores */}
              <div className="card p-5">
                <SectionTitle icon={TrendingUp} title="Top Credores" />
                {(!painel.dids?.porCredor || painel.dids.porCredor.length === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum credor registrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700/50">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">#</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Credor</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">DIDs</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Total</th>
                          <th className="py-2 px-3 w-32"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {painel.dids.porCredor.map((c, i) => {
                          const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                          const pct = totalGeral > 0 ? Math.round((parseFloat(c.total) / totalGeral) * 100) : 0
                          return (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-2 px-3 text-gray-400 text-xs font-bold">{i + 1}º</td>
                              <td className="py-2 px-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{c.credor || '—'}</td>
                              <td className="py-2 px-3 text-center text-gray-500 dark:text-slate-400">{c.qtd}</td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.total)}</td>
                              <td className="py-2 px-3">
                                <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full">
                                  <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: pct + '%' }} />
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
                <div className="card p-5">
                  <SectionTitle icon={BarChart3} title="Top Credores — Visão Gráfica" />
                  <div className="space-y-3">
                    {painel.dids.porCredor.slice(0, 5).map((c, i) => {
                      const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                      const pct = totalGeral > 0 ? Math.round((parseFloat(c.total) / totalGeral) * 100) : 0
                      const paleta = [
                        { bg: 'bg-blue-500',   light: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400' },
                        { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
                        { bg: 'bg-teal-500',   light: 'bg-teal-50 dark:bg-teal-900/20',     text: 'text-teal-600 dark:text-teal-400' },
                        { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
                        { bg: 'bg-rose-500',   light: 'bg-rose-50 dark:bg-rose-900/20',     text: 'text-rose-600 dark:text-rose-400' },
                      ]
                      const cor = paleta[i % paleta.length]
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={'text-xs font-bold w-5 text-center flex-shrink-0 ' + cor.text}>{i + 1}º</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{c.credor || '—'}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400">{c.qtd} DID{c.qtd !== 1 ? 's' : ''}</span>
                                <span className={'text-xs font-bold ' + cor.text}>{pct}%</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.total)}</span>
                              </div>
                            </div>
                            <div className="h-5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <span className="text-sm">Erro ao carregar o painel</span>
              <button onClick={loadPainel} className="text-xs text-blue-500 hover:text-blue-400 underline">Tentar novamente</button>
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

          <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              {procsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="text-sm">Carregando processos...</span>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Nº Processo / DID</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Tipo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Credor / Secretaria</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Data</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Valor Bruto</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Pagto.</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Lançamentos</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                    {procsVisiveis.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 text-center text-gray-400 dark:text-slate-500">Nenhum processo DID encontrado</td></tr>
                    ) : procsVisiveis.map(p => {
                      const totalLanc = p.lancamentos?.reduce((acc, l) => acc + parseFloat(l.valor || 0), 0) || 0
                      const did = p.did
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-mono text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">{p.numero}</p>
                            {did?.numero_did && <p className="text-xs text-gray-400">DID-{String(did.numero_did).padStart(3,'0')}</p>}
                          </td>
                          <td className="py-3 px-4">
                            {did ? (
                              <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                                did.tipo_did === 'variaveis'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              )}>{did.tipo_did === 'variaveis' ? 'Variáveis' : 'Fixas'}</span>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-900 dark:text-white font-medium">{did?.credor_sec1 || p.interessado_nome || '—'}</p>
                            {did?.secretaria_sec1 && (
                              <p className="text-xs text-gray-400" title={did.secretaria_sec1}>{secSigla(did.secretaria_sec1)}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-slate-400 whitespace-nowrap">{fmtData(did?.data_did || p.data_abertura)}</td>
                          <td className="py-3 px-4 text-right">
                            {did?.valor_bruto
                              ? <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(did.valor_bruto)}</span>
                              : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {did
                              ? did.pago === 'sim'
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3" /> Pago</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock3 className="w-3 h-3" /> Pendente</span>
                              : '—'
                            }
                          </td>
                          <td className="py-3 px-4 text-right">
                            {p.lancamentos?.length > 0
                              ? <span className="font-semibold text-green-600 dark:text-green-400">{fmtMoeda(totalLanc)}<br /><span className="text-xs font-normal text-gray-400">{p.lancamentos.length} lanç.</span></span>
                              : <span className="text-gray-400 dark:text-slate-500 text-xs">Sem lançamentos</span>
                            }
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              to={'/' + subdomain + '/processos/' + p.id}
                              className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-block"
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
            {procsTotal > LIMIT && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="text-xs text-slate-500 dark:text-slate-400">{procsTotal} processos</span>
                <div className="flex items-center gap-1.5">
                  <button
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    disabled={procsPage === 1} onClick={() => setProcsPage(p => p - 1)}
                  >← Anterior</button>
                  <span className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">Pág. {procsPage}</span>
                  <button
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    disabled={procsPage * LIMIT >= procsTotal} onClick={() => setProcsPage(p => p + 1)}
                  >Próxima →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB: RELATÓRIO ════════════════════════════════════════════════════ */}
      {tab === 'relatorio' && (
        <div className="space-y-5">

          {/* ── Sub-header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Relatório Financeiro
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Análise consolidada de DIDs, pagamentos e pendências
                {(relFiltros.data_inicio || relFiltros.data_fim) && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
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

          {/* ── Filtros compactos ────────────────────────────────────────────── */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Filtros
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data início</label>
                <input type="date" className="input-field w-full" value={relFiltros.data_inicio} onChange={e => setRelFiltros(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data fim</label>
                <input type="date" className="input-field w-full" value={relFiltros.data_fim} onChange={e => setRelFiltros(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Tipo</label>
                <select className="input-field w-full" value={relFiltros.tipo} onChange={e => setRelFiltros(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="">Todos os tipos</option>
                  <option value="fixas">Fixas</option>
                  <option value="variaveis">Variáveis</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button className="btn-primary text-sm flex-1 h-[38px] inline-flex items-center justify-center gap-1.5" onClick={loadRelatorio}>
                  <BarChart3 className="w-4 h-4" /> Gerar
                </button>
                <button
                  className="btn-secondary text-sm h-[38px] inline-flex items-center justify-center px-3"
                  onClick={() => { setRelFiltros({ data_inicio: '', data_fim: '', tipo: '' }); setTimeout(loadRelatorio, 0) }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {relLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm">Gerando relatório...</span>
            </div>
          ) : relatorio ? (
            <>
              {/* ── KPI Cards — linha 1: 4 principais ─────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard Icon={DollarSign}   color="blue"   label="Total do Período" value={fmtMoeda(relTotal)} />
                <MetricCard Icon={CheckCircle2} color="green"  label="Total Pago"       value={fmtMoeda(relPago)} />
                <MetricCard Icon={Clock3}       color="yellow" label="Total Pendente"   value={fmtMoeda(relPendente)} />
                <MetricCard Icon={FileText}     color="blue"   label="Qtd. DIDs"        value={String(relQtdTotal)} />
              </div>

              {/* ── KPI Cards — linha 2: 3 secundários ────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard Icon={TrendingUp}   color="purple"       label="Ticket Médio"  value={fmtMoeda(relTicket)} />
                <MetricCard Icon={CheckCircle2} color="green"        label="% Pago"        value={relPctPago + '%'} sub={relQtdPago + ' de ' + relQtdTotal} />
                <MetricCard Icon={AlertCircle}  color={relInadColor} label="Inadimplência" value={relInad + '%'} sub={(relQtdTotal - relQtdPago) + ' pendente(s)'} />
              </div>

              {/* ── Resumo Executivo ──────────────────────────────────────────── */}
              <div className="card p-5 border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Resumo Executivo</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  {relQtdTotal === 0
                    ? 'Nenhum DID encontrado para o período e filtros selecionados.'
                    : `No período analisado, foram registrados ${relQtdTotal} DID${relQtdTotal !== 1 ? 's' : ''}, totalizando ${fmtMoeda(relTotal)} em valor bruto. `}
                  {relPago > 0 && `Do total, ${fmtMoeda(relPago)} (${relPctPago}%) já foi pago${relQtdPago > 0 ? ` em ${relQtdPago} DID${relQtdPago !== 1 ? 's' : ''}` : ''}. `}
                  {relPendente > 0 && `Há ${fmtMoeda(relPendente)} (${relInad}%) de valor pendente de pagamento. `}
                  {relTicket > 0 && `O ticket médio por DID é de ${fmtMoeda(relTicket)}. `}
                  {relatorio.porSecretaria?.length > 0 && `A secretaria com maior volume é "${secSigla(relatorio.porSecretaria[0].secretaria) || 'não informada'}", com ${fmtMoeda(relatorio.porSecretaria[0].total)}. `}
                  {relatorio.porCredor?.length > 0 && `O principal credor é "${relatorio.porCredor[0].credor || 'não informado'}", com ${fmtMoeda(relatorio.porCredor[0].total)}.`}
                </p>
              </div>

              {/* ── Alertas ──────────────────────────────────────────────────── */}
              {(relInad > 0 || relatorio.porCredor?.length > 0 || relatorio.porSecretaria?.length > 0) && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Alertas e Destaques</h3>
                  </div>
                  <div className="space-y-2">
                    {relInad > 30 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                          <strong>Alto índice de inadimplência:</strong> {relInad}% do valor total está pendente ({fmtMoeda(relPendente)}).
                        </p>
                      </div>
                    )}
                    {relInad > 0 && relInad <= 30 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30">
                        <Clock3 className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          <strong>Pagamentos pendentes:</strong> {relInad}% do valor ({fmtMoeda(relPendente)}) aguarda pagamento.
                        </p>
                      </div>
                    )}
                    {relatorio.porCredor?.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
                        <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Maior credor:</strong> {relatorio.porCredor[0].credor || 'Não informado'} com {fmtMoeda(relatorio.porCredor[0].total)} ({relatorio.porCredor[0].qtd} DID{Number(relatorio.porCredor[0].qtd) !== 1 ? 's' : ''}).
                        </p>
                      </div>
                    )}
                    {relatorio.porSecretaria?.length > 0 && (() => {
                      const topSec = relatorio.porSecretaria[0]
                      const pctSec = relTotal > 0 ? Math.round((parseFloat(topSec.total) / relTotal) * 100) : 0
                      return pctSec > 40 ? (
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30">
                          <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            <strong>Alta concentração:</strong> {secSigla(topSec.secretaria) || 'Não informada'} representa {pctSec}% do total de despesas ({fmtMoeda(topSec.total)}).
                          </p>
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              )}

              {/* ── Grid 2×2: Status, Tipo, Secretarias, Credores ────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Status de pagamento */}
                <div className="card p-5">
                  <SectionTitle icon={CheckCircle2} title="Status de Pagamento" />
                  <div className="mt-4 space-y-3">
                    {[
                      { label: 'Pago',     value: relPago,     qtd: relQtdPago,              color: 'bg-green-500',  textColor: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20'  },
                      { label: 'Pendente', value: relPendente, qtd: relQtdTotal - relQtdPago, color: 'bg-yellow-400', textColor: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                    ].map(item => {
                      const pct = relTotal > 0 ? Math.min(100, Math.round((item.value / relTotal) * 100)) : 0
                      return (
                        <div key={item.label} className={`p-3 rounded-xl ${item.bg}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm font-semibold ${item.textColor}`}>{item.label}</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtMoeda(item.value)}</span>
                              <span className="text-xs text-gray-400 ml-1.5">{pct}% · {item.qtd} DID{item.qtd !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-white/60 dark:bg-slate-800/60 rounded-full">
                            <div className={`h-2 ${item.color} rounded-full transition-all duration-700`} style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      )
                    })}
                    {relQtdTotal === 0 && <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>}
                  </div>
                </div>

                {/* Distribuição por Tipo */}
                <div className="card p-5">
                  <SectionTitle icon={Tag} title="Distribuição por Tipo" />
                  <div className="mt-4 space-y-3">
                    {relatorio.porTipo?.length > 0 ? relatorio.porTipo.map((t, i) => {
                      const val = parseFloat(t.total) || 0
                      const pct = relTotal > 0 ? Math.min(100, Math.round((val / relTotal) * 100)) : 0
                      const colors   = ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500']
                      const bgs      = ['bg-blue-50 dark:bg-blue-900/20', 'bg-purple-50 dark:bg-purple-900/20', 'bg-indigo-50 dark:bg-indigo-900/20']
                      const texts    = ['text-blue-700 dark:text-blue-400', 'text-purple-700 dark:text-purple-400', 'text-indigo-700 dark:text-indigo-400']
                      return (
                        <div key={i} className={`p-3 rounded-xl ${bgs[i % bgs.length]}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm font-semibold ${texts[i % texts.length]}`}>
                              {t.tipo_did === 'variaveis' ? 'Variáveis' : t.tipo_did === 'fixas' ? 'Fixas' : t.tipo_did || 'Outros'}
                            </span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtMoeda(val)}</span>
                              <span className="text-xs text-gray-400 ml-1.5">{pct}% · {t.qtd} DID{Number(t.qtd) !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-white/60 dark:bg-slate-800/60 rounded-full">
                            <div className={`h-2 ${colors[i % colors.length]} rounded-full transition-all duration-700`} style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      )
                    }) : <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>}
                  </div>
                </div>

                {/* Ranking por Secretaria */}
                <div className="card p-5">
                  <SectionTitle icon={Building2} title="Ranking por Secretaria" />
                  <div className="mt-4 space-y-2.5">
                    {relatorio.porSecretaria?.length > 0 ? relatorio.porSecretaria.map((s, i) => {
                      const val    = parseFloat(s.total) || 0
                      const maxVal = parseFloat(relatorio.porSecretaria[0]?.total) || 1
                      const pctBar  = Math.min(100, Math.round((val / maxVal) * 100))
                      const pctTot  = relTotal > 0 ? Math.min(100, Math.round((val / relTotal) * 100)) : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                              <span className="text-sm text-gray-700 dark:text-slate-300 truncate" title={s.secretaria || ''}>{secSigla(s.secretaria) || 'Não informada'}</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmtMoeda(val)}</span>
                              <span className="text-xs text-gray-400 ml-1">({pctTot}%) · {s.qtd}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full">
                            <div className="h-1.5 bg-blue-500 rounded-full transition-all duration-700" style={{ width: pctBar + '%' }} />
                          </div>
                        </div>
                      )
                    }) : <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>}
                  </div>
                </div>

                {/* Ranking por Credor */}
                <div className="card p-5">
                  <SectionTitle icon={TrendingUp} title="Ranking por Credor" />
                  <div className="mt-4 space-y-2.5">
                    {relatorio.porCredor?.length > 0 ? relatorio.porCredor.map((c, i) => {
                      const val    = parseFloat(c.total) || 0
                      const maxVal = parseFloat(relatorio.porCredor[0]?.total) || 1
                      const pctBar  = Math.min(100, Math.round((val / maxVal) * 100))
                      const pctTot  = relTotal > 0 ? Math.min(100, Math.round((val / relTotal) * 100)) : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                              <span className="text-sm text-gray-700 dark:text-slate-300 truncate" title={c.credor || ''}>{c.credor || 'Não informado'}</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmtMoeda(val)}</span>
                              <span className="text-xs text-gray-400 ml-1">({pctTot}%) · {c.qtd}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full">
                            <div className="h-1.5 bg-indigo-500 rounded-full transition-all duration-700" style={{ width: pctBar + '%' }} />
                          </div>
                        </div>
                      )
                    }) : <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>}
                  </div>
                </div>
              </div>

              {/* ── Tabela Analítica de DIDs ───────────────────────────────────── */}
              <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Tabela Analítica de DIDs
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{relDidsOrdenados.length} DID{relDidsOrdenados.length !== 1 ? 's' : ''} encontrado{relDidsOrdenados.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Busca rápida */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        className="input-field pl-8 text-sm h-9 w-52"
                        placeholder="Buscar DID, credor, secretaria..."
                        value={relDidsBusca}
                        onChange={e => { setRelDidsBusca(e.target.value); setRelDidsPage(1) }}
                      />
                      {relDidsBusca && (
                        <button onClick={() => { setRelDidsBusca(''); setRelDidsPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Exportar PDF */}
                    {relDidsOrdenados.length > 0 && (
                      <button
                        className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/70 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-xs font-medium shadow-sm transition-all"
                        onClick={() => {
                          const rows = relDidsOrdenados.map(p => {
                            const d = p.did
                            return [
                              d ? `DID-${String(d.numero_did).padStart(3,'0')}` : p.numero || '—',
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
                            body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#222}
                            h2{font-size:15px;margin-bottom:4px}p{color:#666;margin-bottom:12px;font-size:11px}
                            table{width:100%;border-collapse:collapse}
                            th{background:#1e40af;color:#fff;padding:6px 8px;text-align:left;font-size:10px;font-weight:600}
                            td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}
                            tr:nth-child(even) td{background:#f8fafc}
                            .pago{color:#16a34a;font-weight:600}.pend{color:#d97706;font-weight:600}
                            ${tenant?.configuracoes?.timbrado ? `body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;background-image:url("${tenant.configuracoes.timbrado}");background-size:100% 100%;background-repeat:no-repeat;opacity:.75;z-index:-1;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}` : ''}
                          </style></head><body>
                            <h2>Tabela Analítica de DIDs${periodo}</h2>
                            <p>${relDidsOrdenados.length} DID${relDidsOrdenados.length !== 1 ? 's' : ''} — gerado em ${new Date().toLocaleString('pt-BR')}</p>
                            <table><thead><tr><th>DID</th><th>Credor</th><th>Secretaria</th><th>Tipo</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
                            <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td class="${r[6]==='Pago'?'pago':'pend'}">${r[6]}</td></tr>`).join('')}</tbody></table>
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
                  <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                    Nenhum DID carregado. Clique em <strong className="text-blue-600 dark:text-blue-400">Gerar Relatório</strong> para carregar os dados.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800">
                          <tr className="border-b border-slate-200 dark:border-slate-700/50">
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
                                className={`py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400 cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${col.cls} ${col.key === 'valor' ? 'text-right' : col.key === 'status' ? 'text-center' : 'text-left'}`}
                                onClick={() => relDidsToggleSort(col.key)}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {col.label}
                                  {relDidsSort === col.key && (
                                    <span className="text-blue-500">{relDidsSortDir === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                          {relDidsPagina.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-gray-400 dark:text-slate-500">
                                Nenhum DID encontrado para "{relDidsBusca}"
                              </td>
                            </tr>
                          ) : relDidsPagina.map(p => {
                            const did = p.did
                            const isPago = did?.pago === 'sim'
                            return (
                              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                  {did ? `DID-${String(did.numero_did).padStart(3,'0')}` : p.numero || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-gray-700 dark:text-slate-300 max-w-[200px] truncate" title={did?.credor_sec1 || p.interessado_nome || ''}>
                                  {did?.credor_sec1 || p.interessado_nome || <span className="text-gray-400">—</span>}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 hidden md:table-cell max-w-[160px] truncate" title={did?.secretaria_sec1 || ''}>
                                  {did?.secretaria_sec1 || <span className="text-gray-400">—</span>}
                                </td>
                                <td className="py-2.5 px-3 hidden sm:table-cell">
                                  {did ? (
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      did.tipo_did === 'variaveis'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>
                                      {did.tipo_did === 'variaveis' ? 'Variável' : 'Fixa'}
                                    </span>
                                  ) : <span className="text-gray-400">—</span>}
                                </td>
                                <td className="py-2.5 px-3 text-gray-500 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell text-xs">
                                  {fmtData(did?.data_emissao || p.created_at)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                  {fmtMoeda(did?.valor_bruto || 0)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {did ? (
                                    isPago
                                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3" />Pago</span>
                                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock3 className="w-3 h-3" />Pendente</span>
                                  ) : <span className="text-gray-400 text-xs">—</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    {relDidsPageCount > 1 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {(relDidsPage - 1) * REL_DIDS_PER_PAGE + 1}–{Math.min(relDidsPage * REL_DIDS_PER_PAGE, relDidsOrdenados.length)} de {relDidsOrdenados.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            disabled={relDidsPage === 1}
                            onClick={() => setRelDidsPage(p => p - 1)}
                          >← Anterior</button>
                          {Array.from({ length: Math.min(relDidsPageCount, 7) }, (_, i) => {
                            let pg
                            if (relDidsPageCount <= 7) pg = i + 1
                            else if (relDidsPage <= 4) pg = i + 1
                            else if (relDidsPage >= relDidsPageCount - 3) pg = relDidsPageCount - 6 + i
                            else pg = relDidsPage - 3 + i
                            return (
                              <button
                                key={pg}
                                onClick={() => setRelDidsPage(pg)}
                                className={`w-8 py-1.5 text-xs rounded-lg border transition-colors ${
                                  pg === relDidsPage
                                    ? 'bg-blue-500 border-blue-500 text-white font-semibold'
                                    : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                              >{pg}</button>
                            )
                          })}
                          <button
                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            disabled={relDidsPage === relDidsPageCount}
                            onClick={() => setRelDidsPage(p => p + 1)}
                          >Próxima →</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Nenhum relatório gerado</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Configure os filtros e clique em <strong className="text-blue-600 dark:text-blue-400">Gerar Relatório</strong></p>
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
