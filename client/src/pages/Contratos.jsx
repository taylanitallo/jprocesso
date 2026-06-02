import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText, ShoppingBag, User, PackageOpen, Search, X, Plus, Edit3,
  Trash2, Eye, BarChart2, BarChart3, List, Check, AlertTriangle, Printer, ChevronUp, ChevronDown,
  Loader2, CheckCircle2, XCircle, Download, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  DollarSign, TrendingUp, Building2, Award, Tag, Activity
} from 'lucide-react'

import api from '../services/api'
import { PageHeader } from '../components/ui'

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'contratos',  label: 'Contratos',  icon: FileText,    emoji: '📋' },
  { key: 'credor',     label: 'Credores',   icon: User,        emoji: '🏢' },
  { key: 'itens',      label: 'Itens',      icon: ShoppingBag, emoji: '📦' },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart2,   emoji: '📊' },
]

const UNIDADES      = ['UNIDADE','MÊS','SERVIÇO','SERVIÇOS','CONJUNTO','KG','LITRO','METRO','HORA','DIA','PACOTE','RESMA','CAIXA','PAR','AMPOLA','COMPRIMIDO','FRASCO']
const CATEGORIAS    = ['COMPRAS','SERVIÇOS']
const STATUS_ITEM   = ['ATIVO','INATIVO']
const ESTADOS_BR    = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const MODALIDADES   = ['Pregão Eletrônico','Pregão Presencial','Concorrência','Tomada de Preços','Convite','Dispensa','Inexigibilidade','RDC','Concurso','Leilão']

// ── Helpers ───────────────────────────────────────────────────────────────────
function proximoCodigo(itens) {
  if (!itens || itens.length === 0) return '00001'
  const max = itens.reduce((m, item) => {
    const n = parseInt(item.codigo) || 0
    return n > m ? n : m
  }, 0)
  return String(max + 1).padStart(5, '0')
}

// ── UI Primitives ─────────────────────────────────────────────────────────────
function FieldRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 min-h-[34px]">
      <span className="w-36 shrink-0 text-sm text-right text-gray-600 dark:text-slate-400">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-700 px-4 py-1.5 -mx-6 text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide border-y border-gray-200 dark:border-slate-600">
      {children}
    </div>
  )
}

// ── Card de Seção Premium ──────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/60 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800/80">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── PortalDropdown — renderiza o dropdown em document.body via portal ─────────
// Evita corte por overflow-hidden/overflow-y-auto nos cards e modais.
function PortalDropdown({ anchorRef, open, children, minWidth = 0, className = '' }) {
  const [style, setStyle] = useState({})
  useEffect(() => {
    if (!open) return
    const el = anchorRef?.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setStyle({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, minWidth) })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef, minWidth])
  if (!open || !style.top) return null
  return createPortal(
    <div
      style={{ position: 'fixed', zIndex: 10000, ...style }}
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl max-h-52 overflow-y-auto ${className}`}
    >
      {children}
    </div>,
    document.body
  )
}

// ── Campo de Exibição (Visualização) ──────────────────────────────────────────
function ViewField({ label, value, mono = false, badge = null, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      {badge ? badge : (
        <p className={`text-sm font-medium text-gray-800 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-gray-300 dark:text-slate-600">—</span>}
        </p>
      )}
    </div>
  )
}

// ── Input Premium ──────────────────────────────────────────────────────────────
function PremiumInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
      {...props}
    />
  )
}

// ── Select Premium ─────────────────────────────────────────────────────────────
function PremiumSelect({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

// ── Textarea Premium ───────────────────────────────────────────────────────────
function PremiumTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${className}`}
      {...props}
    />
  )
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function ModalStepper({ steps, currentStep, onStep }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
      {steps.map((s, i) => {
        const active  = i === currentStep
        const done    = i < currentStep
        return (
          <button
            key={i}
            onClick={() => onStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : done
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-700/50'
                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              active ? 'bg-white/20 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
            }`}>
              {done ? '✓' : i + 1}
            </span>
            {s}
          </button>
        )
      })}
    </div>
  )
}

// ── Barra de Progresso de Vigência ────────────────────────────────────────────
function VigenciaProgress({ inicio, fim, assinatura }) {
  if (!inicio || !fim) return null
  const today     = new Date(); today.setHours(0,0,0,0)
  const dtInicio  = new Date(inicio + 'T00:00:00')
  const dtFim     = new Date(fim    + 'T00:00:00')
  const dtAssin   = assinatura ? new Date(assinatura + 'T00:00:00') : dtInicio
  const total     = dtFim - dtInicio
  const elapsed   = Math.min(today - dtInicio, total)
  const pct       = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0
  const diasRest  = Math.floor((dtFim - today) / 86400000)
  const vencido   = diasRest < 0
  const proximo   = !vencido && diasRest <= 30
  const barColor  = vencido ? 'bg-red-500' : proximo ? 'bg-amber-400' : 'bg-green-500'
  const fmtDate   = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-800/50 p-4 space-y-3">
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Assinatura',  value: fmtDate(assinatura || inicio) },
          { label: 'Início',      value: fmtDate(inicio) },
          { label: 'Fim',         value: fmtDate(fim) },
          { label: 'Dias restantes', value: vencido ? `Vencido há ${Math.abs(diasRest)}d` : `${diasRest}d`, highlight: vencido ? 'text-red-600' : proximo ? 'text-amber-600' : 'text-green-600' },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
            <p className={`text-sm font-bold ${highlight || 'text-gray-800 dark:text-slate-200'}`}>{value}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(pct)}% do período decorrido</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE ITEM (Incluir / Alterar / Visualizar) — PREMIUM
// ══════════════════════════════════════════════════════════════════════════════
function ItemModal({ modo, item, codigoProximo, onSave, onClose }) {
  const readonly = modo === 'visualizar'
  const [form, setForm] = useState(() => ({
    codigo:           item?.codigo           || codigoProximo || '00001',
    descricao:        item?.descricao        || '',
    categoria:        item?.categoria        || '',
    unidade_medida:   item?.unidade_medida   || '',
    catalogo:         item?.catalogo         || '',
    classificacao:    item?.classificacao    || '',
    subclassificacao: item?.subclassificacao || '',
    especificacao:    item?.especificacao    || item?.detalhes || '',
    palavra1:         item?.palavra1         || '',
    palavra2:         item?.palavra2         || '',
    palavra3:         item?.palavra3         || '',
    palavra4:         item?.palavra4         || '',
    catmat_serv:      item?.catmat_serv      || '',
    status:           item?.status           || 'ATIVO',
    validado:         item?.validado         || false,
  }))
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const titulo = { novo: 'Inclusão', editar: 'Edição', visualizar: 'Visualização' }[modo]

  const salvar = () => {
    if (!form.descricao.trim()) { alert('Informe a descrição do item.'); return }
    if (!form.categoria)        { alert('Selecione a categoria.'); return }
    if (!form.unidade_medida)   { alert('Selecione a unidade de medida.'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-gray-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '680px' }}>

        {/* ── Header Premium ── */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/60 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
                <PackageOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {readonly ? 'Detalhes do Item' : `Item — ${titulo}`}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {readonly ? 'Informações completas do item cadastrado' : 'Preencha as informações do item do catálogo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {form.status && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  form.status === 'ATIVO'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>{form.status}</span>
              )}
              {form.validado && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  ✓ Validado
                </span>
              )}
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-4">

              {/* Identificação */}
              <SectionCard icon={Tag} title="Identificação" subtitle="Código, descrição e classificação do item">
                <div className="grid grid-cols-12 gap-4">
                  {/* Código */}
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Código</label>
                    {readonly
                      ? <p className="font-mono font-bold text-lg text-gray-800 dark:text-slate-200">{form.codigo}</p>
                      : <PremiumInput value={form.codigo} readOnly className="bg-gray-50 dark:bg-slate-700 cursor-default font-mono font-bold tracking-widest text-center" />
                    }
                  </div>

                  {/* Categoria */}
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Categoria *</label>
                    {readonly
                      ? <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{form.categoria || '—'}</p>
                      : <PremiumSelect value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                          <option value="">Selecione...</option>
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </PremiumSelect>
                    }
                  </div>

                  {/* Unidade */}
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Unidade de Medida *</label>
                    {readonly
                      ? <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{form.unidade_medida || '—'}</p>
                      : <PremiumSelect value={form.unidade_medida} onChange={e => set('unidade_medida', e.target.value)}>
                          <option value="">Selecione...</option>
                          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </PremiumSelect>
                    }
                  </div>

                  {/* Descrição */}
                  <div className="col-span-12">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                      Descrição do Item (Nomenclatura) *
                    </label>
                    {readonly
                      ? <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 uppercase">{form.descricao}</p>
                      : <PremiumInput
                          value={form.descricao}
                          onChange={e => set('descricao', e.target.value.toUpperCase())}
                          placeholder="NOMENCLATURA DO ITEM..."
                          className="uppercase font-medium"
                          autoFocus
                        />
                    }
                  </div>
                </div>
              </SectionCard>

              {/* Especificação */}
              <SectionCard icon={FileText} title="Especificação" subtitle="Detalhamento técnico completo do item">
                {readonly
                  ? <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{form.especificacao || '—'}</p>
                  : <PremiumTextarea
                      value={form.especificacao}
                      onChange={e => set('especificacao', e.target.value)}
                      rows={4}
                      placeholder="Especificação técnica detalhada do item..."
                    />
                }
              </SectionCard>

              {/* Palavras-chave */}
              <SectionCard icon={Search} title="Palavras-chave para busca" subtitle="Termos que facilitam a localização do item">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n}>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Palavra {n}</label>
                      {readonly
                        ? <p className="text-sm text-gray-700 dark:text-slate-300">{form[`palavra${n}`] || '—'}</p>
                        : <PremiumInput value={form[`palavra${n}`]} onChange={e => set(`palavra${n}`, e.target.value)} placeholder={`Palavra ${n}...`} />
                      }
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* PNCP */}
              <SectionCard icon={FileText} title="Informações PNCP" subtitle="Portal Nacional de Contratações Públicas">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Catálogo CNBS</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.catalogo || '—'}</p>
                      : <PremiumInput value={form.catalogo} onChange={e => set('catalogo', e.target.value)} placeholder="Código CNBS..." className="font-mono" />
                    }
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Classificação</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.classificacao || '—'}</p>
                      : <PremiumInput value={form.classificacao} onChange={e => set('classificacao', e.target.value)} placeholder="Classificação..." />
                    }
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Subclassificação</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.subclassificacao || '—'}</p>
                      : <PremiumInput value={form.subclassificacao} onChange={e => set('subclassificacao', e.target.value)} placeholder="Subclassificação..." />
                    }
                  </div>
                </div>
              </SectionCard>


            </div>
          </div>
        </div>

        {/* ── Aviso + Footer ── */}
        <div className="bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/60 shrink-0">
          <div className="bg-amber-50 dark:bg-amber-900/15 border-b border-amber-100 dark:border-amber-800/30 px-5 py-2.5 flex items-center justify-between gap-4">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              No campo descrição, informar a <strong>nomenclatura</strong> do item — não a especificação!
            </p>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {item?.id && <span>ID: <span className="font-mono">{item.id}</span></span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all">
                {readonly ? 'Fechar' : 'Cancelar'}
              </button>
              {!readonly && (
                <button onClick={salvar}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
                  <Check className="w-4 h-4" /> Salvar Item
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: RELATÓRIO DO ITEM
// ══════════════════════════════════════════════════════════════════════════════
function RelatorioModal({ item, onClose }) {
  // Estrutura pronta — dados virão da API quando o backend for conectado
  const usos = []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Relatório do Item</h2>
            <p className="text-xs text-gray-500 mt-0.5">Todos os contratos e processos onde o item é utilizado</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Item selecionado</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm mt-0.5">{item.descricao}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>Código: <strong className="text-gray-700 dark:text-slate-300">{item.codigo || '—'}</strong></span>
            <span>Unidade: <strong className="text-gray-700 dark:text-slate-300">{item.unidade_medida}</strong></span>
            <span>Categoria: <strong className="text-gray-700 dark:text-slate-300">{item.categoria}</strong></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {usos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum uso encontrado</p>
              <p className="text-sm mt-1">Este item ainda não foi utilizado em nenhum contrato ou processo.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 font-semibold">Contrato / Processo</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Secretaria</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Qtd</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Valor Unit.</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {usos.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-medium text-blue-600">{u.contrato}</td>
                    <td className="px-3 py-2 text-gray-600">{u.secretaria}</td>
                    <td className="px-3 py-2 text-right">{u.quantidade}</td>
                    <td className="px-3 py-2 text-right">{u.valor_unit}</td>
                    <td className="px-3 py-2 text-right font-semibold">{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700/50 flex justify-between items-center">
          <span className="text-xs text-gray-400">{usos.length} registro(s) encontrado(s)</span>
          <div className="flex gap-3">
            <button className="btn-secondary text-sm flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: LISTAGEM
// ══════════════════════════════════════════════════════════════════════════════
function ListagemModal({ item, onClose }) {
  // Contratos e secretarias que possuem este item — dados virão da API
  const registros = []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><List className="w-4 h-4" /> Listagem</h2>
            <p className="text-xs text-slate-400 mt-0.5">Contratos e secretarias que possuem este item</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Item</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm mt-0.5">{item.descricao}</p>
          <p className="text-xs text-gray-500 mt-0.5">Código: {item.codigo || '—'} · {item.unidade_medida} · {item.categoria}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {registros.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">Este item não está presente em nenhum contrato ou secretaria.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 font-semibold">N° Contrato</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Credor</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Secretaria</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Vigência</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {registros.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-medium text-blue-600">{r.contrato}</td>
                    <td className="px-3 py-2 text-gray-600">{r.credor}</td>
                    <td className="px-3 py-2 text-gray-600">{r.secretaria}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{r.vigencia}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700/50 flex justify-between items-center">
          <span className="text-xs text-gray-400">{registros.length} registro(s)</span>
          <div className="flex gap-3">
            <button className="btn-secondary text-sm flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONFIRMAR EXCLUSÃO
// ══════════════════════════════════════════════════════════════════════════════
function ConfirmModal({ item, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Excluir Item</h3>
              <p className="text-sm text-gray-500">Esta ação marcará o item como excluído.</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-5">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{item.descricao}</p>
            <p className="text-xs text-red-500 mt-1">Código: {item.codigo || '—'}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE CREDOR (Incluir / Alterar / Visualizar)
// ══════════════════════════════════════════════════════════════════════════════
// ── Máscaras ──────────────────────────────────────────────────────────────────
function maskCNPJ(v) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d.replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{2}\.\d{3})(\d)/, '$1.$2')
          .replace(/(\.\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
}
function maskCPF(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3}\.\d{3})(\d)/, '$1.$2')
          .replace(/(\.\d{3})(\d)/, '$1-$2')
}
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})(\d)/, '$1.$2-$3')
}
function maskCEP(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d)/, '$1-$2')
}

// ── Validadores algorítmicos ──────────────────────────────────────────────────
function validarCNPJ(cnpj) {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (s, n) => {
    let sum = 0, pos = s.length - 7
    for (let i = s.length; i >= 1; i--) {
      sum += parseInt(s.charAt(s.length - i)) * pos--
      if (pos < 2) pos = 9
    }
    const r = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return r === parseInt(n)
  }
  return calc(d.slice(0, 12), d[12]) && calc(d.slice(0, 13), d[13])
}
function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const calc = (slice, len) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return (r === 10 || r === 11 ? 0 : r) === parseInt(d[len])
  }
  return calc(d, 9) && calc(d, 10)
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE CREDOR (Incluir / Alterar / Visualizar) — PREMIUM
// ══════════════════════════════════════════════════════════════════════════════
function CredorModal({ modo, credor, onSave, onClose }) {
  const readonly = modo === 'visualizar'
  const [form, setForm] = useState(() => ({
    tipo:         credor?.tipo         || 'Jurídica',
    razao_social: credor?.razao_social || '',
    nome_fantasia:credor?.nome_fantasia|| '',
    cnpj_cpf:     credor?.cnpj_cpf     || '',
    email:        credor?.email        || '',
    telefone:     credor?.telefone     || '',
    celular:      credor?.celular      || '',
    cep:          credor?.cep          || '',
    logradouro:   credor?.logradouro   || '',
    numero:       credor?.numero       || '',
    complemento:  credor?.complemento  || '',
    bairro:       credor?.bairro       || '',
    cidade:       credor?.cidade       || '',
    uf:           credor?.uf           || '',
    status:       credor?.status       || 'ATIVO',
  }))
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const titulo = { novo: 'Inclusão', editar: 'Edição', visualizar: 'Visualização' }[modo]
  const isPJ = form.tipo === 'Jurídica'

  const [docStatus, setDocStatus] = useState('idle')
  const [docMsg, setDocMsg]       = useState('')
  const debounceRef               = useRef(null)

  const onDocChange = (raw) => {
    const digits = raw.replace(/\D/g, '')
    const masked = isPJ ? maskCNPJ(raw) : maskCPF(raw)
    set('cnpj_cpf', masked)
    setDocStatus('idle')
    setDocMsg('')
    clearTimeout(debounceRef.current)
    const completo = isPJ ? digits.length === 14 : digits.length === 11
    if (!completo) return
    const valido = isPJ ? validarCNPJ(digits) : validarCPF(digits)
    if (!valido) { setDocStatus('error'); setDocMsg(isPJ ? 'CNPJ inválido' : 'CPF inválido'); return }
    if (isPJ) {
      setDocStatus('loading')
      debounceRef.current = setTimeout(async () => {
        try {
          const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
          if (!res.ok) throw new Error('não encontrado')
          const data = await res.json()
          setForm(p => ({ ...p, razao_social: (data.razao_social || '').toUpperCase(), nome_fantasia: (data.nome_fantasia || '').toUpperCase() }))
          setDocStatus('ok'); setDocMsg('CNPJ encontrado na Receita Federal')
        } catch {
          setDocStatus('ok'); setDocMsg('CNPJ válido — preencha os dados manualmente')
        }
      }, 400)
    } else {
      setDocStatus('ok'); setDocMsg('CPF válido')
    }
  }

  const onTipoChange = (t) => {
    if (readonly) return
    set('tipo', t); set('cnpj_cpf', ''); setDocStatus('idle'); setDocMsg('')
  }

  const salvar = () => {
    if (!form.cnpj_cpf.trim())    { alert(isPJ ? 'Informe o CNPJ.' : 'Informe o CPF.'); return }
    if (!form.razao_social.trim()) { alert(isPJ ? 'Informe a Razão Social.' : 'Informe o Nome.'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-gray-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '820px' }}>

        {/* ── Header Premium ── */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/60 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${isPJ ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-teal-500 to-emerald-600'}`}>
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {readonly ? (form.razao_social || 'Detalhes do Credor') : `Credor — ${titulo}`}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {readonly ? (form.cnpj_cpf || 'Informações completas do credor') : 'Dados do fornecedor ou prestador de serviço'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                form.status === 'ATIVO'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>{form.status || 'ATIVO'}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isPJ ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'}`}>
                {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </span>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-4">

            {/* Dados Principais */}
              <SectionCard icon={User} title="Dados Principais" subtitle="Identificação e situação do credor">
                <div className="space-y-4">
                  {/* Tipo de Pessoa */}
                  {!readonly && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Tipo de Pessoa</label>
                      <div className="flex gap-3">
                        {['Jurídica', 'Física'].map(t => (
                          <label key={t} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                            form.tipo === t
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300'
                          }`}>
                            <input type="radio" name="tipo_credor" value={t} checked={form.tipo === t}
                              onChange={() => onTipoChange(t)} disabled={readonly} className="sr-only" />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.tipo === t ? 'border-blue-500' : 'border-gray-300'}`}>
                              {form.tipo === t && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                            </div>
                            <span className="text-sm font-medium">Pessoa {t}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CNPJ / CPF */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">{isPJ ? 'CNPJ *' : 'CPF *'}</label>
                      {readonly
                        ? <p className="font-mono font-semibold text-gray-800 dark:text-slate-200">{form.cnpj_cpf}</p>
                        : <div className="relative">
                            <PremiumInput
                              value={form.cnpj_cpf}
                              onChange={e => onDocChange(e.target.value)}
                              placeholder={isPJ ? '00.000.000/0000-00' : '000.000.000-00'}
                              maxLength={isPJ ? 18 : 14}
                              className={`font-mono pr-10 ${docStatus === 'error' ? 'border-red-400 focus:ring-red-300' : docStatus === 'ok' ? 'border-green-400 focus:ring-green-300' : ''}`}
                              autoFocus
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {docStatus === 'loading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                              {docStatus === 'ok'      && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {docStatus === 'error'   && <XCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </div>
                      }
                      {docMsg && (
                        <p className={`text-xs mt-1 ${docStatus === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{docMsg}</p>
                      )}
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Status</label>
                      {readonly
                        ? <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${form.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{form.status}</span>
                        : <PremiumSelect value={form.status} onChange={e => set('status', e.target.value)}>
                            <option value="ATIVO">ATIVO</option>
                            <option value="INATIVO">INATIVO</option>
                          </PremiumSelect>
                      }
                    </div>
                  </div>

                  {/* Razão Social */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">{isPJ ? 'Razão Social *' : 'Nome Completo *'}</label>
                    {readonly
                      ? <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 uppercase">{form.razao_social}</p>
                      : <PremiumInput value={form.razao_social} onChange={e => set('razao_social', e.target.value.toUpperCase())}
                          placeholder={isPJ ? 'Razão social...' : 'Nome completo...'} className="uppercase font-medium" />
                    }
                  </div>

                  {isPJ && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Nome Fantasia</label>
                      {readonly
                        ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.nome_fantasia || '—'}</p>
                        : <PremiumInput value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value.toUpperCase())} placeholder="Nome fantasia..." className="uppercase" />
                      }
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Contato */}
              <SectionCard icon={Activity} title="Contato" subtitle="Informações para comunicação">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">E-mail</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.email || '—'}</p>
                      : <PremiumInput value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="email@empresa.com.br" />
                    }
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Telefone</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.telefone || '—'}</p>
                      : <PremiumInput value={form.telefone} onChange={e => set('telefone', maskPhone(e.target.value))} placeholder="(88) 0000-0000" maxLength={15} className="font-mono" />
                    }
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Celular</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.celular || '—'}</p>
                      : <PremiumInput value={form.celular} onChange={e => set('celular', maskPhone(e.target.value))} placeholder="(88) 9.9999-9999" maxLength={16} className="font-mono" />
                    }
                  </div>
                </div>
              </SectionCard>

              {/* Endereço */}
              <SectionCard icon={Building2} title="Endereço" subtitle="Localização do credor">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">CEP</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.cep || '—'}</p>
                      : <PremiumInput value={form.cep} onChange={e => set('cep', maskCEP(e.target.value))} placeholder="00000-000" maxLength={9} className="font-mono" />
                    }
                  </div>
                  <div className="col-span-8">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Logradouro</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.logradouro || '—'}</p>
                      : <PremiumInput value={form.logradouro} onChange={e => set('logradouro', e.target.value.toUpperCase())} placeholder="Rua, Av., Travessa..." className="uppercase" />
                    }
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Número</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.numero || '—'}</p>
                      : <PremiumInput value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Nº" />
                    }
                  </div>
                  <div className="col-span-9">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Complemento</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.complemento || '—'}</p>
                      : <PremiumInput value={form.complemento} onChange={e => set('complemento', e.target.value.toUpperCase())} placeholder="Complemento" className="uppercase" />
                    }
                  </div>
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Bairro</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.bairro || '—'}</p>
                      : <PremiumInput value={form.bairro} onChange={e => set('bairro', e.target.value.toUpperCase())} placeholder="Bairro" className="uppercase" />
                    }
                  </div>
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Cidade</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.cidade || '—'}</p>
                      : <PremiumInput value={form.cidade} onChange={e => set('cidade', e.target.value.toUpperCase())} placeholder="Cidade" className="uppercase" />
                    }
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">UF</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.uf || '—'}</p>
                      : <PremiumSelect value={form.uf} onChange={e => set('uf', e.target.value)}>
                          <option value="">UF</option>
                          {ESTADOS_BR.map(u => <option key={u} value={u}>{u}</option>)}
                        </PremiumSelect>
                    }
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/60 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            {credor?.id && <span>ID: <span className="font-mono">{credor.id}</span></span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all">
              {readonly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readonly && (
              <button onClick={salvar}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
                <Check className="w-4 h-4" /> Salvar Credor
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONFIRMAR EXCLUSÃO DE CREDOR
// ══════════════════════════════════════════════════════════════════════════════
function ConfirmModalCredor({ credor, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Excluir Credor</h3>
              <p className="text-sm text-gray-500">Esta ação marcará o credor como inativo.</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-5">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{credor.razao_social}</p>
            <p className="text-xs text-red-500 mt-1">{credor.cnpj_cpf}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB ITENS
// ══════════════════════════════════════════════════════════════════════════════
function TabItens() {
  const [itens, setItens] = useState([])
  const FILTROS_VAZIOS = { descricao: '', codigo: '', catalogo: '', categoria: '', status: '', validado: '', mostrarExcluido: false }
  const [filtros, setFiltros]           = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]   = useState(null)
  const [modal, setModal]               = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'|'relatorio'|'listagem'
  const [ordenar, setOrdenar]           = useState({ col: 'descricao', asc: true })
  const [pagina, setPagina]             = useState(1)
  const PER_PAGE_ITEM = 20

  const recarregarItens = () =>
    api.get('/contratos/itens').then(r => setItens(r.data)).catch(() => {})

  useEffect(() => { recarregarItens() }, [])

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))

  const pesquisar = () => { setFiltrosAtivos({ ...filtros }); setPagina(1) }

  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS)
    setFiltrosAtivos(FILTROS_VAZIOS)
    setPagina(1)
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  const f = filtrosAtivos
  const itensFiltrados = itens
    .filter(item => {
      if (!f.mostrarExcluido && item.status === 'EXCLUÍDO') return false
      if (f.descricao && !item.descricao.toLowerCase().includes(f.descricao.toLowerCase())) return false
      if (f.codigo && !String(item.codigo || '').includes(f.codigo)) return false
      if (f.catalogo && !String(item.catalogo || '').toLowerCase().includes(f.catalogo.toLowerCase())) return false
      if (f.categoria && item.categoria !== f.categoria) return false
      if (f.status && item.status !== f.status) return false
      if (f.validado === 'SIM' && !item.validado) return false
      if (f.validado === 'NÃO' && item.validado) return false
      return true
    })
    .sort((a, b) => {
      const av = String(a[ordenar.col] || '')
      const bv = String(b[ordenar.col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const totalPagsItem = Math.max(1, Math.ceil(itensFiltrados.length / PER_PAGE_ITEM))
  const itensPaginados = itensFiltrados.slice((pagina - 1) * PER_PAGE_ITEM, pagina * PER_PAGE_ITEM)

  const itemSelecionado = itens.find(i => i.id === selecionado)

  const toggleSort = (col) => setOrdenar(p => ({ col, asc: p.col === col ? !p.asc : true }))
  const SortIcon = ({ col }) => {
    if (ordenar.col !== col) return null
    return ordenar.asc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  // ── Próximo código sequencial ────────────────────────────────────────────
  const proxCod = () => proximoCodigo(itens)

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const incluir = async (data) => {
    try {
      const { data: novo } = await api.post('/contratos/itens', data)
      setItens(prev => [...prev, novo])
      setModal(null)
    } catch { alert('Erro ao salvar item.') }
  }
  const alterar = async (data) => {
    try {
      const { data: atualizado } = await api.put(`/contratos/itens/${selecionado}`, data)
      setItens(prev => prev.map(i => i.id === selecionado ? atualizado : i))
      setModal(null)
    } catch { alert('Erro ao salvar item.') }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/itens/${selecionado}`)
      setItens(prev => prev.map(i => i.id === selecionado ? { ...i, status: 'EXCLUÍDO' } : i))
      setSelecionado(null)
      setModal(null)
    } catch { alert('Erro ao excluir item.') }
  }

  const abrirEditar = () => { if (itemSelecionado) setModal('editar') }
  const abrirExcluir = () => { if (itemSelecionado) setModal('excluir') }
  const abrirVisualizar = () => { if (itemSelecionado) setModal('visualizar') }
  const abrirRelatorio = () => { if (itemSelecionado) setModal('relatorio') }
  const abrirListagem = () => { if (itemSelecionado) setModal('listagem') }

  const podeAgir = !!itemSelecionado

  return (
    <div className="flex flex-col gap-3">

      {/* ── Mini KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Itens',  value: itens.length,                                              icon: PackageOpen,  color: 'from-blue-500 to-indigo-600'  },
          { label: 'Ativos',       value: itens.filter(i => i.status === 'ATIVO').length,            icon: CheckCircle2, color: 'from-green-500 to-emerald-600' },
          { label: 'Filtrados',    value: itensFiltrados.length,                                     icon: Search,       color: 'from-purple-500 to-violet-600' },
          { label: 'Categorias',   value: new Set(itens.map(i => i.categoria).filter(Boolean)).size, icon: Tag,          color: 'from-teal-500 to-cyan-600'    },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white leading-tight">{k.value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções para filtro</p>

        {/* Linha 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Descrição</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={filtros.descricao} onChange={e => setF('descricao', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar pela descrição" className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Catálogo</label>
            <input value={filtros.catalogo} onChange={e => setF('catalogo', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar catálogo" className="input-field text-sm" />
          </div>
        </div>

        {/* Linha 2 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Código</label>
            <input value={filtros.codigo} onChange={e => setF('codigo', e.target.value)}
              placeholder="Código" className="input-field text-sm" />
          </div>
          <div className="flex items-center pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filtros.mostrarExcluido} onChange={e => setF('mostrarExcluido', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">Mostrar excluído</span>
            </label>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Categoria</label>
            <select value={filtros.categoria} onChange={e => setF('categoria', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              {STATUS_ITEM.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Validado</label>
            <select value={filtros.validado} onChange={e => setF('validado', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="SIM">Sim</option>
              <option value="NÃO">Não</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button onClick={limparFiltros}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              Limpar
            </button>
            <button onClick={pesquisar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors">
              <Search className="w-3.5 h-3.5" /> Pesquisar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs select-none uppercase tracking-wider">
                {[
                  { col: 'codigo',        label: 'Código',            cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-24' },
                  { col: 'descricao',     label: 'Descrição',         cls: 'text-left px-3 py-2.5 font-semibold min-w-[260px]' },
                  { col: 'unidade_medida',label: 'Unid. de medida',   cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'categoria',     label: 'Categoria',         cls: 'text-left px-3 py-2.5 font-semibold' },
                  { col: 'catmat_serv',   label: 'CatMat\\Serv',      cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'status',        label: 'Status',            cls: 'text-center px-3 py-2.5 font-semibold' },
                  { col: 'validado',      label: 'Validado',          cls: 'text-center px-3 py-2.5 font-semibold' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)}
                    style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 dark:text-slate-500">
                    <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum item encontrado
                  </td>
                </tr>
              )}
              {itensPaginados.map(item => {
                const sel = item.id === selecionado
                return (
                  <tr key={item.id}
                    onClick={() => setSelecionado(sel ? null : item.id)}
                    onDoubleClick={() => { setSelecionado(item.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-300'
                    } ${item.status === 'EXCLUÍDO' ? 'opacity-50 line-through' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono text-gray-500 dark:text-slate-400">{item.codigo}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">{item.descricao}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.unidade_medida}</td>
                    <td className="px-3 py-2">{item.categoria}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{item.catmat_serv || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        item.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : item.status === 'EXCLUÍDO'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.validado
                        ? <Check className="w-3.5 h-3.5 text-green-600 mx-auto" />
                        : <span className="text-gray-300 dark:text-slate-600">—</span>}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Detalhe do item selecionado */}
        {itemSelecionado?.detalhes && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-amber-700 dark:text-amber-400 mr-1">Detalhes:</span>
            {itemSelecionado.detalhes}
          </div>
        )}

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {itemSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {itemSelecionado.descricao}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-gray-500">
            Foram encontrados <strong>{itensFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

      {/* ── Paginação ── */}
      {totalPagsItem > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Mostrando{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">
              {(pagina - 1) * PER_PAGE_ITEM + 1}–{Math.min(pagina * PER_PAGE_ITEM, itensFiltrados.length)}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">
              {itensFiltrados.length}
            </span>{' '}
            itens
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >← Anterior</button>
            {(() => {
              const pages = []
              for (let i = 1; i <= totalPagsItem; i++) {
                if (i === 1 || i === totalPagsItem || (i >= pagina - 1 && i <= pagina + 1)) {
                  pages.push(i)
                } else if (pages[pages.length - 1] !== '...') {
                  pages.push('...')
                }
              }
              return pages.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="px-1.5 text-xs text-gray-400 dark:text-slate-500">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      pagina === p
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >{p}</button>
                )
              )
            })()}
            <button
              onClick={() => setPagina(p => Math.min(totalPagsItem, p + 1))}
              disabled={pagina === totalPagsItem}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >Próximo →</button>
          </div>
        </div>
      )}

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Incluir
        </button>
        <button onClick={abrirEditar} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Edit3 className="w-4 h-4" /> Alterar
        </button>
        <button onClick={abrirExcluir} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
        <button onClick={abrirVisualizar} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Eye className="w-4 h-4" /> Visualizar
        </button>

        <div className="flex-1" />

        <button onClick={abrirRelatorio} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <BarChart2 className="w-4 h-4" /> Relatório do item
        </button>
        <button onClick={abrirListagem} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <List className="w-4 h-4" /> Listagem
        </button>
      </div>

      {/* ── Modais ── */}
      {modal === 'novo' && (
        <ItemModal modo="novo" item={null} codigoProximo={proxCod()} onSave={incluir} onClose={() => setModal(null)} />
      )}
      {modal === 'editar' && itemSelecionado && (
        <ItemModal modo="editar" item={itemSelecionado} onSave={alterar} onClose={() => setModal(null)} />
      )}
      {modal === 'visualizar' && itemSelecionado && (
        <ItemModal modo="visualizar" item={itemSelecionado} onSave={null} onClose={() => setModal(null)} />
      )}
      {modal === 'excluir' && itemSelecionado && (
        <ConfirmModal item={itemSelecionado} onConfirm={excluir} onClose={() => setModal(null)} />
      )}
      {modal === 'relatorio' && itemSelecionado && (
        <RelatorioModal item={itemSelecionado} onClose={() => setModal(null)} />
      )}
      {modal === 'listagem' && itemSelecionado && (
        <ListagemModal item={itemSelecionado} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONTRATOS DO CREDOR
// ══════════════════════════════════════════════════════════════════════════════
function CredorContratosModal({ credor, onClose }) {
  const [contratos, setContratos] = useState([])
  useEffect(() => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
  }, [])

  const vinculados = contratos.filter(c => c.credor_id === credor.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4" /> Contratos vinculados</h2>
            <p className="text-xs text-slate-400 mt-0.5">Todos os contratos e atas ligados a este credor</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do credor */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Credor</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm mt-0.5">{credor.razao_social}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>{credor.tipo === 'Jurídica' ? 'CNPJ' : 'CPF'}: <strong className="text-gray-700 dark:text-slate-300 font-mono">{credor.cnpj_cpf}</strong></span>
            {credor.cidade && <span>Cidade: <strong className="text-gray-700 dark:text-slate-300">{credor.cidade}{credor.uf ? '/' + credor.uf : ''}</strong></span>}
          </div>
        </div>

        {/* Tabela de contratos */}
        <div className="flex-1 overflow-y-auto">
          {vinculados.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum contrato vinculado</p>
              <p className="text-sm mt-1">Este credor ainda não possui contratos cadastrados.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-semibold">N° Contrato</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Objeto</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Modalidade</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Valor</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Vigência</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {vinculados.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs text-gray-700 dark:text-slate-300">
                    <td className="px-4 py-2 font-mono font-medium text-blue-600">{c.numero_contrato || '—'}</td>
                    <td className="px-4 py-2 max-w-xs truncate">{c.objeto || '—'}</td>
                    <td className="px-4 py-2">{c.modalidade || '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold">{c.valor ? Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{c.vigencia_inicio ? `${c.vigencia_inicio} a ${c.vigencia_fim || '...'}` : '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        c.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : c.status === 'ENCERRADO'
                          ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>{c.status || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <span className="text-xs text-gray-400">{vinculados.length} contrato(s) encontrado(s)</span>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB CREDOR
// ══════════════════════════════════════════════════════════════════════════════
function TabCredor() {
  const [credores, setCredores] = useState([])
  const [syncando, setSyncando] = useState(false)

  const FILTROS_VAZIOS = { razao_social: '', cnpj_cpf: '', tipo: '', status: '' }
  const [filtros, setFiltros]             = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]     = useState(null)
  const [modal, setModal]                 = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'
  const [ordenar, setOrdenar]             = useState({ col: 'razao_social', asc: true })
  const [pagina, setPagina]               = useState(1)
  const PER_PAGE_CREDOR = 15

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const pesquisar = () => { setFiltrosAtivos({ ...filtros }); setPagina(1) }
  const limparFiltros = () => { setFiltros(FILTROS_VAZIOS); setFiltrosAtivos(FILTROS_VAZIOS); setPagina(1) }

  useEffect(() => {
    api.get('/contratos/credores').then(r => setCredores(r.data)).catch(() => {})
  }, [])

  const f = filtrosAtivos
  const credoresFiltrados = credores
    .filter(c => {
      if (f.razao_social && !c.razao_social.toLowerCase().includes(f.razao_social.toLowerCase())) return false
      if (f.cnpj_cpf && !String(c.cnpj_cpf || '').includes(f.cnpj_cpf)) return false
      if (f.tipo && c.tipo !== f.tipo) return false
      if (f.status && c.status !== f.status) return false
      return true
    })
    .sort((a, b) => {
      const av = String(a[ordenar.col] || '')
      const bv = String(b[ordenar.col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const totalPags = Math.max(1, Math.ceil(credoresFiltrados.length / PER_PAGE_CREDOR))
  const credoresPaginados = credoresFiltrados.slice((pagina - 1) * PER_PAGE_CREDOR, pagina * PER_PAGE_CREDOR)

  const credorSelecionado = credores.find(c => c.id === selecionado)
  const podeAgir = !!credorSelecionado

  const toggleSort = (col) => setOrdenar(p => ({ col, asc: p.col === col ? !p.asc : true }))
  const SortIcon = ({ col }) => {
    if (ordenar.col !== col) return null
    return ordenar.asc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  const proxCod = () => proximoCodigo(credores)

  const incluir = async (data) => {
    try {
      const { data: novo } = await api.post('/contratos/credores', data)
      setCredores(prev => [...prev, novo])
      setModal(null)
    } catch (err) {
      if (err.response?.status === 409) { alert('CNPJ/CPF já cadastrado.'); return }
      alert('Erro ao salvar credor.')
    }
  }
  const alterar = async (data) => {
    try {
      const { data: atualizado } = await api.put(`/contratos/credores/${selecionado}`, data)
      setCredores(prev => prev.map(c => c.id === selecionado ? atualizado : c))
      setModal(null)
    } catch { alert('Erro ao salvar credor.') }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/credores/${selecionado}`)
      setCredores(prev => prev.map(c => c.id === selecionado ? { ...c, status: 'EXCLUÍDO' } : c))
      setSelecionado(null)
      setModal(null)
    } catch { alert('Erro ao excluir credor.') }
  }

  const syncDids = async () => {
    if (!confirm('Importar credores dos DIDs existentes que ainda não estão cadastrados aqui?')) return
    setSyncando(true)
    try {
      const { data } = await api.post('/contratos/sync-from-dids')
      if (data.criados > 0) {
        const novos = await api.get('/contratos/credores')
        setCredores(novos.data)
      }
      alert(`Sincronização concluída!\n✅ ${data.criados} credor(es) importado(s) dos DIDs.\n⏭ ${data.ignorados} já existiam.`)
    } catch (err) {
      alert('Erro ao sincronizar: ' + (err.response?.data?.error || err.message))
    } finally {
      setSyncando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Mini KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Credores', value: credores.length,                                  icon: User,         color: 'from-blue-500 to-indigo-600'  },
          { label: 'Ativos',         value: credores.filter(c => c.status === 'ATIVO').length, icon: CheckCircle2, color: 'from-green-500 to-emerald-600' },
          { label: 'Inativos',       value: credores.filter(c => c.status !== 'ATIVO').length, icon: XCircle,      color: 'from-gray-400 to-slate-500'   },
          { label: 'Filtrados',      value: credoresFiltrados.length,                          icon: Search,       color: 'from-purple-500 to-violet-600' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white leading-tight">{k.value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções para filtro</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Razão Social / Nome</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={filtros.razao_social} onChange={e => setF('razao_social', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar por nome ou razão social" className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">CNPJ / CPF</label>
            <input value={filtros.cnpj_cpf} onChange={e => setF('cnpj_cpf', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar CNPJ ou CPF" className="input-field text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Tipo</label>
            <select value={filtros.tipo} onChange={e => setF('tipo', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="Jurídica">Jurídica</option>
              <option value="Física">Física</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button onClick={limparFiltros}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              Limpar
            </button>
            <button onClick={pesquisar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors">
              <Search className="w-3.5 h-3.5" /> Pesquisar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs select-none uppercase tracking-wider">
                {[
                  { col: 'tipo',         label: 'Tipo',           cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-20' },
                  { col: 'razao_social', label: 'Razão Social / Nome', cls: 'text-left px-3 py-2.5 font-semibold min-w-[240px]' },
                  { col: 'cnpj_cpf',    label: 'CNPJ / CPF',     cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'cidade',       label: 'Cidade/UF',      cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'telefone',     label: 'Telefone',       cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'status',       label: 'Status',         cls: 'text-center px-3 py-2.5 font-semibold w-20' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {credoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 dark:text-slate-500">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum credor encontrado
                  </td>
                </tr>
              )}
              {credoresPaginados.map(c => {
                const sel = c.id === selecionado
                return (
                  <tr key={c.id}
                    onClick={() => setSelecionado(sel ? null : c.id)}
                    onDoubleClick={() => { setSelecionado(c.id); setModal('contratos_credor') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{c.tipo === 'Jurídica' ? 'PJ' : 'PF'}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">
                      {c.razao_social}
                      {c.nome_fantasia && <span className="ml-1 text-gray-400 font-normal">({c.nome_fantasia})</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600 dark:text-slate-400">{c.cnpj_cpf}</td>
                    <td className="px-3 py-2">{c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—'}</td>
                    <td className="px-3 py-2">{c.telefone || c.celular || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        c.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {credorSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {credorSelecionado.razao_social}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <div className="flex items-center gap-4">
            {totalPags > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(1)} disabled={pagina === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: totalPags }, (_, i) => i + 1)
                  .filter(p => p >= Math.max(1, pagina - 2) && p <= Math.min(totalPags, pagina + 2))
                  .map(p => (
                    <button key={p} onClick={() => setPagina(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors ${
                      p === pagina ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}>{p}</button>
                  ))}
                <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPagina(totalPags)} disabled={pagina === totalPags} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <span className="text-xs text-gray-500">
              Foram encontrados <strong>{credoresFiltrados.length}</strong> registro(s)
              {totalPags > 1 && <> · pág. <strong>{pagina}</strong>/{totalPags}</>}
            </span>
          </div>
        </div>
      </div>

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Incluir
        </button>
        <button onClick={() => podeAgir && setModal('editar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Edit3 className="w-4 h-4" /> Alterar
        </button>
        <button onClick={() => podeAgir && setModal('excluir')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
        <button onClick={() => podeAgir && setModal('contratos_credor')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <FileText className="w-4 h-4" /> Ver Contratos
        </button>
        <button onClick={syncDids} disabled={syncando}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 ml-auto">
          {syncando ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : <><RefreshCw className="w-4 h-4" /> Importar do DID</>}
        </button>
      </div>

      {/* ── Modais ── */}
      {modal === 'novo' && (
        <CredorModal modo="novo" credor={null} onSave={incluir} onClose={() => setModal(null)} />
      )}
      {modal === 'editar' && credorSelecionado && (
        <CredorModal modo="editar" credor={credorSelecionado} onSave={alterar} onClose={() => setModal(null)} />
      )}
      {modal === 'contratos_credor' && credorSelecionado && (
        <CredorContratosModal credor={credorSelecionado} onClose={() => setModal(null)} />
      )}
      {modal === 'excluir' && credorSelecionado && (
        <ConfirmModalCredor credor={credorSelecionado} onConfirm={excluir} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: BUSCA DE ITEM DO CATÁLOGO
// ══════════════════════════════════════════════════════════════════════════════
function BuscarItemModal({ catalogoItens, onSelect, onClose }) {
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [expId, setExpId] = useState(null)

  const todos = catalogoItens.filter(i => i.status !== 'INATIVO')
  const categorias = [...new Set(todos.map(i => (i.categoria || '').toUpperCase()).filter(Boolean))].sort()

  const filtrados = todos.filter(i => {
    const q = busca.trim().toLowerCase()
    const matchBusca = !q ||
      (i.descricao     || '').toLowerCase().includes(q) ||
      (i.codigo        || '').toLowerCase().includes(q) ||
      (i.especificacao || '').toLowerCase().includes(q)
    const matchCat = !catFiltro || (i.categoria || '').toUpperCase() === catFiltro
    return matchBusca && matchCat
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '86vh' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-white/80" />
            <span className="text-sm font-semibold text-white">Selecionar Item do Catálogo</span>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-indigo-600 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtros + Busca */}
        <div className="px-5 pt-3 pb-2.5 border-b border-gray-200 dark:border-slate-700/50 shrink-0 space-y-2">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por código, descrição ou especificação..."
              className="input-field pl-9 text-sm w-full"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Filtros de categoria */}
          <div className="flex items-center gap-2 flex-wrap">
            {['', ...categorias].map(cat => (
              <button key={cat} onClick={() => setCatFiltro(cat)}
                className={`px-3 py-0.5 text-xs font-semibold rounded-full border transition-colors ${
                  catFiltro === cat
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}>
                {cat || 'Todos'}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-auto">{filtrados.length} item(ns) encontrado(s)</span>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <PackageOpen className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">{busca ? 'Nenhum item encontrado para a busca.' : 'Nenhum item cadastrado no sistema.'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-300 text-xs w-24 uppercase tracking-wider">Código</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wider">Descrição / Especificação</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-300 text-xs w-28 uppercase tracking-wider">Unidade</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-300 text-xs w-28 uppercase tracking-wider">Categoria</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filtrados.map(item => (
                  <tr key={item.id}
                    className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group"
                    onClick={() => { onSelect(item); onClose() }}>
                    <td className="px-4 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold align-top">{item.codigo}</td>
                    <td className="px-4 py-2.5 align-top max-w-xs">
                      <p className="text-gray-800 dark:text-slate-200 font-medium leading-snug">{item.descricao}</p>
                      {item.especificacao && (
                        <>
                          <p className={`text-xs text-gray-400 dark:text-slate-500 mt-0.5 leading-snug ${expId === item.id ? '' : 'line-clamp-2'}`}>
                            {item.especificacao}
                          </p>
                          {item.especificacao.length > 100 && (
                            <button type="button"
                              onClick={e => { e.stopPropagation(); setExpId(p => p === item.id ? null : item.id) }}
                              className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 mt-0.5 font-medium">
                              {expId === item.id ? 'ver menos ▲' : 'ver mais ▼'}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs align-top whitespace-nowrap">{item.unidade_medida || '—'}</td>
                    <td className="px-4 py-2.5 align-top">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                        (item.categoria || '').toUpperCase() === 'COMPRAS'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : (item.categoria || '').toUpperCase() === 'SERVIÇOS'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                      }`}>{item.categoria || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right align-top">
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Selecionar
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-200 dark:border-slate-700/50 px-5 py-2.5 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400">Clique em um item para selecioná-lo</p>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded text-sm font-medium transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE CONTRATO (Incluir / Alterar / Visualizar)
// ══════════════════════════════════════════════════════════════════════════════
const STATUS_CONTRATO  = ['ATIVO','ENCERRADO','SUSPENSO','RESCINDIDO']
const TIPOS_CONTRATO   = ['CONTRATO','ATA DE REGISTRO DE PREÇO','TERMO ADITIVO','CONVÊNIO','ACORDO','OUTRO']

function ContratoModal({ modo, contrato, credores, onSave, onClose }) {
  const readonly = modo === 'visualizar'

  // Catálogo de itens do sistema
  const [catalogoItens, setCatalogoItens] = useState([])
  useEffect(() => {
    api.get('/contratos/itens').then(r => setCatalogoItens(r.data)).catch(() => {})
  }, [])

  const credorInicial = contrato?.credor_id
    ? credores.find(c => c.id === contrato.credor_id) || null
    : null

  const [form, setForm] = useState(() => ({
    tipo_contrato:    contrato?.tipo_contrato    || 'CONTRATO',
    numero_contrato:  contrato?.numero_contrato  || '',
    objeto:           contrato?.objeto           || '',
    modalidade:       contrato?.modalidade       || '',
    numero_licitacao: contrato?.numero_licitacao || '',
    credor_id:        contrato?.credor_id        || '',
    valor:            contrato?.valor            || '',
    vigencia_inicio:  contrato?.vigencia_inicio  || '',
    vigencia_fim:     contrato?.vigencia_fim     || '',
    data_assinatura:  contrato?.data_assinatura  || '',
    secretaria:       contrato?.secretaria       || '',
    fiscal:           contrato?.fiscal           || '',
    observacoes:      contrato?.observacoes      || '',
    status:           contrato?.status           || 'ATIVO',
    dias_alerta:      contrato?.dias_alerta      ?? 30,
  }))

  // Fontes de recurso (multi-valor)
  const [fontesRecurso, setFontesRecurso] = useState(() =>
    contrato?.fontes_recurso?.length ? [...contrato.fontes_recurso] : ['']
  )
  // Dotações orçamentárias (multi-valor)
  const [dotacoes, setDotacoes] = useState(() =>
    contrato?.dotacoes?.length ? [...contrato.dotacoes] : ['']
  )

  // Itens do contrato
  const [itensContrato, setItensContrato] = useState(() =>
    contrato?.itens ? [...contrato.itens] : []
  )
  // Linha de item sendo editada inline
  const [itemBusca, setItemBusca] = useState({})   // { [idx]: string }
  const [itemDrop,  setItemDrop]  = useState(null)  // idx com dropdown aberto
  const [itemModalIdx, setItemModalIdx] = useState(null) // idx para modal de busca
  const [showAddPicker, setShowAddPicker] = useState(false) // modal de seleção ao clicar + Adicionar Item

  // Credor
  const [credorSel, setCredorSel] = useState(credorInicial)
  const [buscaCredor, setBuscaCredor] = useState(credorInicial?.razao_social || '')
  const [dropdownCredor, setDropdownCredor] = useState(false)
  const credorAnchorRef = useRef(null)

  // Secretaria (via API)
  const [secretarias, setSecretarias] = useState([])
  const [secSel, setSecSel] = useState(null)
  const [buscaSec, setBuscaSec] = useState(contrato?.secretaria || '')
  const [dropdownSec, setDropdownSec] = useState(false)
  const secAnchorRef = useRef(null)

  // Item table dropdown anchor
  const [itemDropEl, setItemDropEl] = useState(null)

  useEffect(() => {
    api.get('/organizacao/secretarias')
      .then(r => {
        const lista = r.data.secretarias || []
        setSecretarias(lista)
        // Se editando, re-selecionar secretaria salva
        if (contrato?.secretaria) {
          const encontrada = lista.find(s =>
            s.sigla === contrato.secretaria || s.nome === contrato.secretaria
          )
          if (encontrada) setSecSel(encontrada)
        }
      })
      .catch(() => {})
  }, [])

  const secFiltradas = (() => {
    const q = buscaSec.trim().toLowerCase()
    if (!q) return secretarias.filter(s => s.ativo !== false).slice(0, 12)
    return secretarias.filter(s =>
      s.ativo !== false && (
        s.nome.toLowerCase().includes(q) ||
        (s.sigla || '').toLowerCase().includes(q)
      )
    ).slice(0, 12)
  })()

  // ── Fiscais disponíveis na secretaria selecionada, classificados por vigência ─
  const fiscaisClassificados = (() => {
    if (!secSel) return []
    const d = form.vigencia_inicio || form.data_assinatura || ''
    const ref = d ? new Date(d + 'T00:00:00') : new Date()
    return (secSel.responsaveis || []).map(r => {
      const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null
      const fim = r.data_fim    ? new Date(r.data_fim    + 'T00:00:00') : null
      return { ...r, vigente: !!ini && ref >= ini && (!fim || ref <= fim) }
    })
  })()

  // Limpa o fiscal se a data de vigência mudar e ele sair do período de nomeação
  useEffect(() => {
    if (!secSel || !form.fiscal) return
    const d = form.vigencia_inicio || form.data_assinatura || ''
    const ref = d ? new Date(d + 'T00:00:00') : new Date()
    const ainda = (secSel.responsaveis || []).some(r => {
      const label = r.nome
      if (label !== form.fiscal) return false
      const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null
      const fim = r.data_fim    ? new Date(r.data_fim    + 'T00:00:00') : null
      return !!ini && ref >= ini && (!fim || ref <= fim)
    })
    if (!ainda) set('fiscal', '')
  }, [form.vigencia_inicio, form.data_assinatura, secSel])

  const selecionarSecretaria = (s) => {
    setSecSel(s)
    setBuscaSec(s.sigla || s.nome)
    set('secretaria', s.sigla || s.nome)
    setDropdownSec(false)
    // auto-seleciona o primeiro fiscal dentro do período de vigência
    const d = form.vigencia_inicio || form.data_assinatura || ''
    const ref = d ? new Date(d + 'T00:00:00') : new Date()
    const vigentes = (s.responsaveis || []).filter(r => {
      if (!r.data_inicio) return false
      const ini = new Date(r.data_inicio + 'T00:00:00')
      const fim = r.data_fim ? new Date(r.data_fim + 'T00:00:00') : null
      return ref >= ini && (!fim || ref <= fim)
    })
    set('fiscal', vigentes.length >= 1 ? vigentes[0].nome : '')
  }

  const limparSecretaria = () => {
    setSecSel(null)
    setBuscaSec('')
    set('secretaria', '')
    set('fiscal', '')
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const titulo = { novo: 'Inclusão', editar: 'Edição', visualizar: 'Visualização' }[modo]

  // ── Alerta de vencimento ──────────────────────────────────────────────────
  const alertaVencimento = (() => {
    if (!form.vigencia_fim) return null
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const fim  = new Date(form.vigencia_fim + 'T00:00:00')
    const diff = Math.floor((fim - hoje) / 86400000)
    if (diff < 0)                              return { tipo: 'vencido',   texto: `Vencido há ${Math.abs(diff)} dia(s)` }
    if (diff <= (Number(form.dias_alerta)||30)) return { tipo: 'proximo',  texto: `Vence em ${diff} dia(s)` }
    return { tipo: 'vigente', texto: `Vigente · ${diff} dia(s) restante(s)` }
  })()

  const alertaCor = {
    vencido: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300',
    proximo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300',
    vigente: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300',
  }

  // ── Credor search ─────────────────────────────────────────────────────────
  const credoresFiltradosModal = (() => {
    const q = buscaCredor.trim().toLowerCase()
    if (!q) return credores.filter(c => c.status !== 'INATIVO').slice(0, 12)
    return credores.filter(c =>
      c.razao_social.toLowerCase().includes(q) ||
      (c.cnpj_cpf || '').includes(q)
    ).slice(0, 12)
  })()

  const selecionarCredor = (c) => {
    setCredorSel(c)
    setBuscaCredor(c.razao_social)
    set('credor_id', c.id)
    setDropdownCredor(false)
  }

  const limparCredor = () => { setCredorSel(null); setBuscaCredor(''); set('credor_id', '') }

  // ── Itens do contrato ─────────────────────────────────────────────────────
  const itemCatalogFiltrado = (busca) => {
    const q = (busca || '').trim().toLowerCase()
    if (!q) return catalogoItens.filter(i => i.status !== 'INATIVO').slice(0, 10)
    return catalogoItens.filter(i =>
      i.status !== 'INATIVO' && (
        (i.descricao || '').toLowerCase().includes(q) ||
        (i.codigo    || '').toLowerCase().includes(q)
      )
    ).slice(0, 10)
  }

  const novoItemRow = () => ({
    _id: Date.now() + Math.random(),
    lote: '',
    item_id: '',
    descricao: '',
    unidade: '',
    quantidade: '',
    valor_unitario: '',
    valor_total: '',
  })

  const adicionarItem = () => setShowAddPicker(true)

  const selecionarItemParaAdicionar = (item) => {
    setItensContrato(p => [...p, {
      ...novoItemRow(),
      item_id:   item.id,
      descricao: item.descricao,
      unidade:   item.unidade_medida || '',
    }])
    setShowAddPicker(false)
  }

  const removerItem = (idx) => {
    setItensContrato(p => p.filter((_, i) => i !== idx))
    setItemBusca(p => { const n = { ...p }; delete n[idx]; return n })
  }

  const setItem = (idx, k, v) => {
    setItensContrato(p => {
      const arr = [...p]
      arr[idx] = { ...arr[idx], [k]: v }
      // Auto-calcular valor_total
      if (k === 'quantidade' || k === 'valor_unitario') {
        const qtd = parseFloat(String(k === 'quantidade' ? v : arr[idx].quantidade).replace(',', '.')) || 0
        const vun = parseFloat(String(k === 'valor_unitario' ? v : arr[idx].valor_unitario).replace(',', '.')) || 0
        arr[idx].valor_total = qtd && vun ? (qtd * vun).toFixed(2) : ''
      }
      return arr
    })
  }

  const selecionarItemCatalogo = (idx, item) => {
    setItensContrato(p => {
      const arr = [...p]
      arr[idx] = {
        ...arr[idx],
        item_id:   item.id,
        descricao: item.descricao,
        unidade:   item.unidade_medida || '',
      }
      return arr
    })
    setItemBusca(p => ({ ...p, [idx]: item.descricao }))
    setItemDrop(null)
  }

  // ── Valor total automático ────────────────────────────────────────────────
  const valorTotalItens = itensContrato.reduce((acc, it) => {
    const v = parseFloat(String(it.valor_total || '0').replace(',', '.')) || 0
    return acc + v
  }, 0)

  const fmtBRL = (n) =>
    n > 0 ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''

  // Sincroniza valor do form com total dos itens
  const valorExibido = itensContrato.length > 0
    ? fmtBRL(valorTotalItens)
    : form.valor

  // ── Salvar ────────────────────────────────────────────────────────────────
  const salvar = () => {
    if (!form.numero_contrato.trim()) { alert('Informe o número do contrato.'); return }
    if (!form.objeto.trim())          { alert('Informe o objeto.'); return }
    if (!form.credor_id)              { alert('Selecione o credor.'); return }
    // Envia sempre valor numérico puro (nunca string formatada em BRL)
    const valorFinal = itensContrato.length > 0
      ? valorTotalItens
      : (form.valor ? parseFloat(String(form.valor).replace(/[^\d,.]/g, '').replace(',', '.')) || null : null)
    const fontesLimpas = fontesRecurso.map(s => s.trim()).filter(Boolean)
    const dotacoesLimpas = dotacoes.map(s => s.trim()).filter(Boolean)
    onSave({ ...form, valor: valorFinal, itens: itensContrato, fontes_recurso: fontesLimpas, dotacoes: dotacoesLimpas })
  }

  const alertaIcone = alertaVencimento?.tipo === 'vencido'
    ? <XCircle className="w-3.5 h-3.5" />
    : alertaVencimento?.tipo === 'proximo'
      ? <AlertTriangle className="w-3.5 h-3.5" />
      : <CheckCircle2 className="w-3.5 h-3.5" />

  const alertaBadgeCls = {
    vencido: 'bg-red-100 text-red-700 border-red-200',
    proximo: 'bg-amber-100 text-amber-700 border-amber-200',
    vigente: 'bg-green-100 text-green-700 border-green-200',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '720px', maxWidth: '95vw', maxHeight: '92vh' }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {form.numero_contrato ? form.numero_contrato : 'Novo Contrato'}
              {form.tipo_contrato && form.tipo_contrato !== 'CONTRATO' && (
                <span className="ml-2 text-sm font-normal text-gray-500">· {form.tipo_contrato}</span>
              )}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
              {form.objeto ? form.objeto.substring(0, 80) + (form.objeto.length > 80 ? '…' : '') : 'Contrato — ' + titulo}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {form.status && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                form.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                form.status === 'ENCERRADO' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>{form.status}</span>
            )}
            {alertaVencimento && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${alertaBadgeCls[alertaVencimento.tipo]}`}>
                {alertaIcone} {alertaVencimento.texto}
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Barra de Progresso de Vigência ─────────────────────────── */}
        {(form.vigencia_inicio || form.vigencia_fim) && (
          <VigenciaProgress inicio={form.vigencia_inicio} fim={form.vigencia_fim} assinatura={form.data_assinatura} />
        )}

        {/* ── Corpo ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-5">

              {/* SectionCard — Identificação */}
              <SectionCard icon={FileText} title="Identificação" subtitle="Tipo, número e data de assinatura">
                {readonly ? (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4"><ViewField label="Tipo" value={form.tipo_contrato} /></div>
                    <div className="col-span-4"><ViewField label="Nº Contrato" value={form.numero_contrato} mono /></div>
                    <div className="col-span-4"><ViewField label="Data Assinatura" value={form.data_assinatura ? new Date(form.data_assinatura + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Tipo *</label>
                      <PremiumSelect value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)}>
                        {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
                      </PremiumSelect>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Nº Contrato *</label>
                      <PremiumInput value={form.numero_contrato} onChange={e => set('numero_contrato', e.target.value.toUpperCase())}
                        className="uppercase" placeholder="Ex: 001/2026" autoFocus />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Data Assinatura</label>
                      <PremiumInput type="date" value={form.data_assinatura} onChange={e => set('data_assinatura', e.target.value)} />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Objeto e Licitação */}
              <SectionCard icon={Award} title="Objeto e Licitação" subtitle="Descrição, modalidade e processo licitatório">
                {readonly ? (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12"><ViewField label="Objeto" value={form.objeto} /></div>
                    <div className="col-span-6"><ViewField label="Modalidade" value={form.modalidade || '—'} /></div>
                    <div className="col-span-6"><ViewField label="Nº Licitação" value={form.numero_licitacao || '—'} mono /></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Objeto *</label>
                      <PremiumTextarea value={form.objeto} onChange={e => set('objeto', e.target.value.toUpperCase())}
                        rows={3} className="uppercase resize-none" placeholder="Descrição do objeto do contrato..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Modalidade</label>
                        <PremiumSelect value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>
                          <option value="">Selecione...</option>
                          {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                        </PremiumSelect>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Nº Licitação</label>
                        <PremiumInput value={form.numero_licitacao} onChange={e => set('numero_licitacao', e.target.value.toUpperCase())}
                          className="uppercase" placeholder="Ex: PE 012/2026" />
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Credor */}
              <SectionCard icon={User} title="Credor" subtitle="Empresa ou pessoa física contratada">
                {readonly ? (
                  <ViewField label="Credor" value={credorSel ? `${credorSel.razao_social} · ${credorSel.cnpj_cpf}` : form.credor_id ? `ID: ${form.credor_id}` : '—'} />
                ) : (
                  <div className="relative w-full">
                    {credorSel ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-11 px-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-medium text-gray-800 dark:text-slate-100 truncate">{credorSel.razao_social}</span>
                          <span className="text-gray-400 font-mono text-xs shrink-0">{credorSel.cnpj_cpf}</span>
                        </div>
                        <button type="button" onClick={limparCredor} className="p-2 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative" ref={credorAnchorRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <PremiumInput
                          value={buscaCredor}
                          onChange={e => { setBuscaCredor(e.target.value); setDropdownCredor(true) }}
                          onFocus={() => setDropdownCredor(true)}
                          onBlur={() => setTimeout(() => setDropdownCredor(false), 150)}
                          className="pl-10" placeholder="Buscar credor por nome ou CNPJ/CPF..."
                        />
                        <PortalDropdown anchorRef={credorAnchorRef} open={dropdownCredor}>
                          {credoresFiltradosModal.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400">Nenhum credor encontrado.</p>
                          ) : credoresFiltradosModal.map(c => (
                            <button key={c.id} type="button" onMouseDown={() => selecionarCredor(c)}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 dark:text-slate-200 truncate">{c.razao_social}</p>
                                <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.cnpj_cpf}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                            </button>
                          ))}
                        </PortalDropdown>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Vigência */}
              <SectionCard icon={Activity} title="Vigência" subtitle="Datas de início, fim e alerta de vencimento">
                {readonly ? (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4"><ViewField label="Início" value={form.vigencia_inicio ? new Date(form.vigencia_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} /></div>
                    <div className="col-span-4"><ViewField label="Fim" value={form.vigencia_fim ? new Date(form.vigencia_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} /></div>
                    <div className="col-span-4"><ViewField label="Alerta (dias)" value={form.dias_alerta} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Início</label>
                      <PremiumInput type="date" value={form.vigencia_inicio} onChange={e => set('vigencia_inicio', e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Fim</label>
                      <PremiumInput type="date" value={form.vigencia_fim} onChange={e => set('vigencia_fim', e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Alerta (dias)</label>
                      <PremiumInput type="number" min={0} value={form.dias_alerta}
                        onChange={e => set('dias_alerta', Number(e.target.value))} placeholder="30" />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Responsáveis */}
              <SectionCard icon={Building2} title="Responsáveis" subtitle="Secretaria e fiscal do contrato">
                {readonly ? (
                  <div className="grid grid-cols-2 gap-4">
                    <ViewField label="Secretaria" value={form.secretaria || '—'} />
                    <ViewField label="Fiscal" value={form.fiscal || '—'} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Secretaria</label>
                      {secSel ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 flex items-center gap-2 text-sm overflow-hidden">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-medium text-gray-800 dark:text-slate-100 truncate">{secSel.nome}</span>
                            {secSel.sigla && <span className="text-gray-400 text-xs shrink-0 whitespace-nowrap">({secSel.sigla})</span>}
                          </div>
                          <button type="button" onClick={limparSecretaria} className="shrink-0 p-2 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative" ref={secAnchorRef}>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <PremiumInput
                            value={buscaSec}
                            onChange={e => { setBuscaSec(e.target.value); set('secretaria', e.target.value.toUpperCase()); setDropdownSec(true) }}
                            onFocus={() => setDropdownSec(true)}
                            onBlur={() => setTimeout(() => setDropdownSec(false), 150)}
                            className="pl-10 uppercase" placeholder="Buscar secretaria..."
                          />
                          <PortalDropdown anchorRef={secAnchorRef} open={dropdownSec && secretarias.length > 0}>
                            {secFiltradas.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-gray-400">Nenhuma encontrada.</p>
                            ) : secFiltradas.map(s => (
                              <button key={s.id} type="button" onMouseDown={() => selecionarSecretaria(s)}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 dark:text-slate-200 truncate">{s.nome}</p>
                                  {s.sigla && <p className="text-xs text-gray-400 font-mono mt-0.5">{s.sigla}</p>}
                                </div>
                              </button>
                            ))}
                          </PortalDropdown>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Fiscal</label>
                      <div className="flex items-center gap-2 min-w-0">
                        <PremiumSelect value={form.fiscal} onChange={e => set('fiscal', e.target.value)} disabled={!secSel}
                          className={!secSel ? 'opacity-50 cursor-not-allowed' : ''}>
                          <option value="">{!secSel ? 'Selecione a secretaria primeiro' : fiscaisClassificados.length === 0 ? 'Nenhum responsável cadastrado' : 'Selecione o fiscal...'}</option>
                          {fiscaisClassificados.map((r, idx) => (
                            <option key={idx} value={r.nome} disabled={!r.vigente}>
                              {r.vigente ? r.nome : `${r.nome} (fora do período)`}
                            </option>
                          ))}
                        </PremiumSelect>
                        {form.fiscal && (
                          <button type="button" onClick={() => set('fiscal', '')}
                            className="p-2 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Itens do Contrato */}
              <SectionCard icon={ShoppingBag} title="Itens do Contrato" subtitle="Produtos e serviços contratados">
                {itensContrato.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 dark:text-slate-500">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum item adicionado</p>
                    {!readonly && (
                      <button type="button" onClick={adicionarItem}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Adicionar Item
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Lote</th>
                            <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                            <th className="px-3 py-2 text-left font-semibold">Unid.</th>
                            <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                            <th className="px-3 py-2 text-right font-semibold">V. Unit.</th>
                            <th className="px-3 py-2 text-right font-semibold">V. Total</th>
                            {!readonly && <th className="px-3 py-2" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                          {itensContrato.map((it, idx) => (
                            <tr key={it._id || idx} className="bg-white dark:bg-slate-900/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                              <td className="px-2 py-1.5">
                                {readonly ? <span className="font-mono">{it.lote || '—'}</span> : (
                                  <input value={it.lote} onChange={e => setItem(idx, 'lote', e.target.value)}
                                    className="w-14 h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono" />
                                )}
                              </td>
                              <td className="px-2 py-1.5 max-w-xs">
                                {readonly ? <span className="text-gray-800 dark:text-slate-200">{it.descricao || '—'}</span> : (
                                  <div className="relative">
                                    <input
                                      value={itemBusca[idx] !== undefined ? itemBusca[idx] : (it.descricao || '')}
                                      onChange={e => { setItemBusca(p => ({ ...p, [idx]: e.target.value })); setItemDrop(idx) }}
                                      onFocus={e => { setItemDrop(idx); setItemDropEl(e.currentTarget.closest('.relative')) }}
                                      onBlur={() => setTimeout(() => { setItemDrop(null); setItemDropEl(null) }, 150)}
                                      className="w-48 h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                      placeholder="Buscar item..."
                                    />
                                    {itemDrop === idx && itemDropEl && createPortal(
                                      <div style={{ position: 'fixed', zIndex: 10000, top: itemDropEl.getBoundingClientRect().bottom + 4, left: itemDropEl.getBoundingClientRect().left, width: 288 }}
                                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                                        {itemCatalogFiltrado(itemBusca[idx]).length === 0
                                          ? <p className="px-3 py-2 text-xs text-gray-400">Nenhum item encontrado</p>
                                          : itemCatalogFiltrado(itemBusca[idx]).map(i => (
                                            <button key={i.id} type="button" onMouseDown={() => selecionarItemCatalogo(idx, i)}
                                              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                                              <p className="font-medium text-gray-800 dark:text-slate-200 truncate">{i.descricao}</p>
                                              <p className="text-gray-400 mt-0.5 font-mono">{i.codigo} · {i.unidade_medida}</p>
                                            </button>
                                          ))
                                        }
                                        <button type="button" onMouseDown={() => { setItemModalIdx(idx); setItemDrop(null); setItemDropEl(null) }}
                                          className="w-full px-3 py-2 text-xs text-blue-600 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-gray-100 dark:border-slate-700 flex items-center gap-1">
                                          <Search className="w-3 h-3" /> Busca avançada
                                        </button>
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                {readonly ? <span>{it.unidade || '—'}</span> : (
                                  <input value={it.unidade} onChange={e => setItem(idx, 'unidade', e.target.value)}
                                    className="w-16 h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {readonly ? <span className="font-mono">{it.quantidade || '—'}</span> : (
                                  <input type="number" min={0} value={it.quantidade} onChange={e => setItem(idx, 'quantidade', e.target.value)}
                                    className="w-20 h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right font-mono" />
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {readonly ? <span className="font-mono">{it.valor_unitario || '—'}</span> : (
                                  <input type="number" min={0} step="0.01" value={it.valor_unitario} onChange={e => setItem(idx, 'valor_unitario', e.target.value)}
                                    className="w-24 h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right font-mono" />
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                {it.valor_total ? `R$ ${parseFloat(it.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              {!readonly && (
                                <td className="px-2 py-1.5">
                                  <button type="button" onClick={() => removerItem(idx)}
                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        {itensContrato.length > 0 && (
                          <tfoot className="bg-gray-100 dark:bg-slate-800 border-t-2 border-gray-200 dark:border-slate-700">
                            <tr>
                              <td colSpan={readonly ? 5 : 5} className="px-3 py-2 text-right text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide">Total do Contrato:</td>
                              <td className="px-3 py-2 text-right font-bold text-blue-700 dark:text-blue-400 font-mono whitespace-nowrap">{fmtBRL(valorTotalItens) || '—'}</td>
                              {!readonly && <td />}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    {!readonly && (
                      <button type="button" onClick={adicionarItem}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Adicionar Item
                      </button>
                    )}
                  </>
                )}
              </SectionCard>

              {/* SectionCard — Recursos */}
              <SectionCard icon={DollarSign} title="Recursos" subtitle="Valor, fontes de recurso e dotações orçamentárias">
                <div className="space-y-4">
                  {/* Valor */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Valor Total</label>
                    {readonly ? (
                      <ViewField label="" value={valorExibido || '—'} mono />
                    ) : (
                      <div className="flex items-center gap-3">
                        <PremiumInput value={valorExibido}
                          onChange={e => { if (itensContrato.length === 0) set('valor', e.target.value) }}
                          readOnly={itensContrato.length > 0}
                          className={`w-52 font-mono ${itensContrato.length > 0 ? 'bg-gray-100 dark:bg-slate-700 cursor-default font-bold text-blue-700 dark:text-blue-400' : ''}`}
                          placeholder="R$ 0,00" />
                        {itensContrato.length > 0 && (
                          <span className="text-xs text-gray-500">Calculado pelos itens</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fontes de Recurso */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Fontes de Recurso</label>
                    {readonly ? (
                      <div className="flex flex-wrap gap-2">
                        {fontesRecurso.filter(Boolean).length === 0
                          ? <span className="text-sm text-gray-400">—</span>
                          : fontesRecurso.filter(Boolean).map((f, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">{f}</span>
                          ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fontesRecurso.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <PremiumInput value={val}
                              onChange={e => setFontesRecurso(p => { const a = [...p]; a[i] = e.target.value.toUpperCase(); return a })}
                              className="flex-1 uppercase" placeholder="Ex: PRÓPRIO, FEDERAL, CONVÊNIO..." />
                            {fontesRecurso.length > 1 && (
                              <button type="button" onClick={() => setFontesRecurso(p => p.filter((_, j) => j !== i))}
                                className="p-2 rounded-xl border border-gray-200 dark:border-slate-600 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setFontesRecurso(p => [...p, ''])}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          <Plus className="w-3 h-3" /> Adicionar fonte
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dotações */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Dotações Orçamentárias</label>
                    {readonly ? (
                      <div className="flex flex-wrap gap-2">
                        {dotacoes.filter(Boolean).length === 0
                          ? <span className="text-sm text-gray-400">—</span>
                          : dotacoes.filter(Boolean).map((d, i) => (
                            <span key={i} className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-xs font-mono">{d}</span>
                          ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dotacoes.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <PremiumInput value={val}
                              onChange={e => setDotacoes(p => { const a = [...p]; a[i] = e.target.value; return a })}
                              className="flex-1 font-mono" placeholder="Ex: 3.3.90.39.00" />
                            {dotacoes.length > 1 && (
                              <button type="button" onClick={() => setDotacoes(p => p.filter((_, j) => j !== i))}
                                className="p-2 rounded-xl border border-gray-200 dark:border-slate-600 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setDotacoes(p => [...p, ''])}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          <Plus className="w-3 h-3" /> Adicionar dotação
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* SectionCard — Observações */}
              <SectionCard icon={List} title="Observações" subtitle="Notas e informações adicionais">
                {readonly ? (
                  <ViewField label="" value={form.observacoes || '—'} />
                ) : (
                  <PremiumTextarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                    rows={3} className="resize-none" placeholder="Observações adicionais..." />
                )}
              </SectionCard>
            </div>
          </div>
        </div>

        {/* Modal de busca de item (inline) */}
        {itemModalIdx !== null && (
          <BuscarItemModal
            catalogoItens={catalogoItens}
            onSelect={item => {
              selecionarItemCatalogo(itemModalIdx, item)
              setItemModalIdx(null)
            }}
            onClose={() => setItemModalIdx(null)}
          />
        )}

        {/* Modal de seleção de item ao clicar "+ Adicionar Item" */}
        {showAddPicker && (
          <BuscarItemModal
            catalogoItens={catalogoItens}
            onSelect={selecionarItemParaAdicionar}
            onClose={() => setShowAddPicker(false)}
          />
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            {contrato?.id && (
              <span className="text-xs text-gray-400 font-mono">ID #{contrato.id}</span>
            )}
            {itensContrato.length > 0 && (
              <span className="text-xs text-gray-500 ml-3">
                {itensContrato.length} item(ns) · <strong className="text-blue-700 dark:text-blue-400">{fmtBRL(valorTotalItens)}</strong>
              </span>
            )}
          </div>
          {!readonly && (
            <button onClick={salvar}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
              <Check className="w-4 h-4" /> Salvar Contrato
            </button>
          )}
          <button onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-all">
            {readonly ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModalContrato({ contrato, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Excluir Contrato</h3>
              <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-5">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{contrato.numero_contrato}</p>
            <p className="text-xs text-red-500 mt-1 truncate">{contrato.objeto}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB CONTRATOS
// ══════════════════════════════════════════════════════════════════════════════
function TabContratos() {
  const { subdomain } = useParams()
  const navigate = useNavigate()
  const [contratos, setContratos] = useState([])
  const [credores, setCredores] = useState([])

  const recarregarContratos = () => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
    api.get('/contratos/credores').then(r => setCredores(r.data)).catch(() => {})
  }

  useEffect(() => {
    recarregarContratos()
  }, [])

  const FILTROS_VAZIOS = { numero: '', objeto: '', credor: '', modalidade: '', status: '' }
  const [filtros, setFiltros]               = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos]   = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]       = useState(null)
  const [modal, setModal]                   = useState(null)
  const [ordenar, setOrdenar]               = useState({ col: 'numero_contrato', asc: true })
  const [paginaCtr, setPaginaCtr]           = useState(1)
  const PER_PAGE_CTR = 15

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const pesquisar  = () => { setFiltrosAtivos({ ...filtros }); setPaginaCtr(1) }
  const limpar     = () => { setFiltros(FILTROS_VAZIOS); setFiltrosAtivos(FILTROS_VAZIOS); setPaginaCtr(1) }

  const nomeCredor = (id) => credores.find(c => c.id === id)?.razao_social || '—'

  const f = filtrosAtivos
  const contratosFiltrados = contratos
    .filter(c => {
      if (f.numero  && !String(c.numero_contrato || '').toLowerCase().includes(f.numero.toLowerCase())) return false
      if (f.objeto  && !String(c.objeto || '').toLowerCase().includes(f.objeto.toLowerCase())) return false
      if (f.credor  && !nomeCredor(c.credor_id).toLowerCase().includes(f.credor.toLowerCase())) return false
      if (f.modalidade && c.modalidade !== f.modalidade) return false
      if (f.status  && c.status !== f.status) return false
      return true
    })
    .sort((a, b) => {
      const av = String(a[ordenar.col] || '')
      const bv = String(b[ordenar.col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const totalPagsCtr = Math.max(1, Math.ceil(contratosFiltrados.length / PER_PAGE_CTR))
  const contratosPaginados = contratosFiltrados.slice((paginaCtr - 1) * PER_PAGE_CTR, paginaCtr * PER_PAGE_CTR)

  const contratoSelecionado = contratos.find(c => c.id === selecionado)
  const podeAgir = !!contratoSelecionado

  const diasAteVencer = (d) => {
    if (!d) return null
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const fim  = new Date(d + 'T00:00:00'); fim.setHours(0, 0, 0, 0)
    return Math.ceil((fim - hoje) / 86400000)
  }

  const toggleSort = (col) => setOrdenar(p => ({ col, asc: p.col === col ? !p.asc : true }))
  const SortIcon = ({ col }) => {
    if (ordenar.col !== col) return null
    return ordenar.asc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  const incluir = async (data) => {
    try {
      const { data: novo } = await api.post('/contratos', data)
      setContratos(prev => [...prev, novo])
      setModal(null)
    } catch (err) {
      if (err.response?.status === 409) { alert('Número de contrato já cadastrado.'); return }
      alert('Erro ao salvar contrato.')
    }
  }
  const alterar = async (data) => {
    try {
      const { data: atualizado } = await api.put(`/contratos/${selecionado}`, data)
      setContratos(prev => prev.map(c => c.id === selecionado ? atualizado : c))
      setModal(null)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro desconhecido'
      alert(`Erro ao salvar contrato: ${msg}`)
    }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/${selecionado}`)
      setContratos(prev => prev.filter(c => c.id !== selecionado))
      setSelecionado(null)
      setModal(null)
    } catch { alert('Erro ao excluir contrato.') }
  }

  const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtValor = (v) => {
    if (!v) return '—'
    const n = parseFloat(String(v).replace(/[^\d,]/g, '').replace(',', '.'))
    return isNaN(n) ? v : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const statusCor = (s) => {
    if (s === 'ATIVO')      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (s === 'ENCERRADO')  return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
    if (s === 'SUSPENSO')   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    if (s === 'RESCINDIDO') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções para filtro</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">N° Contrato</label>
            <input value={filtros.numero} onChange={e => setF('numero', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Ex: 001/2026" className="input-field text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Objeto</label>
            <input value={filtros.objeto} onChange={e => setF('objeto', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar pelo objeto" className="input-field text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Credor</label>
            <input value={filtros.credor} onChange={e => setF('credor', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Nome do credor..." className="input-field text-sm" />
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Modalidade</label>
            <select value={filtros.modalidade} onChange={e => setF('modalidade', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              {STATUS_CONTRATO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5 ml-auto">
            <button onClick={limpar}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              Limpar
            </button>
            <button onClick={pesquisar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors">
              <Search className="w-3.5 h-3.5" /> Pesquisar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs select-none uppercase tracking-wider">
                {[
                  { col: 'tipo_contrato',   label: 'Tipo',        cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-24' },
                  { col: 'numero_contrato', label: 'N° Contrato', cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-32' },
                  { col: 'credor_id',       label: 'Credor',      cls: 'text-left px-3 py-2.5 font-semibold min-w-[200px]' },
                  { col: 'objeto',          label: 'Objeto',      cls: 'text-left px-3 py-2.5 font-semibold min-w-[200px]' },
                  { col: 'modalidade',      label: 'Modalidade',  cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'valor',           label: 'Valor',       cls: 'text-right px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'vigencia_fim',    label: 'Vigência até',cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap hidden sm:table-cell' },
                  { col: '_dias',           label: 'Dias',        cls: 'text-center px-3 py-2.5 font-semibold whitespace-nowrap w-20 hidden sm:table-cell' },
                  { col: 'status',          label: 'Status',      cls: 'text-center px-3 py-2.5 font-semibold w-24' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {contratosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-gray-400 dark:text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum contrato encontrado
                  </td>
                </tr>
              )}
              {contratosPaginados.map(c => {
                const sel = c.id === selecionado
                const dv  = diasAteVencer(c.vigencia_fim)
                return (
                  <tr key={c.id}
                    onClick={() => setSelecionado(sel ? null : c.id)}
                    onDoubleClick={() => { setSelecionado(c.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500">{c.tipo_contrato || '—'}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">{c.numero_contrato}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate font-medium">{nomeCredor(c.credor_id)}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{c.objeto || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.modalidade || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmtValor(c.valor)}</td>
                    <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">{fmtData(c.vigencia_fim)}</td>
                    <td className="px-3 py-2 text-center hidden sm:table-cell">
                      {dv === null ? <span className="text-gray-300 dark:text-slate-600">—</span>
                        : dv < 0   ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{Math.abs(dv)}d exp.</span>
                        : dv === 0 ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Hoje</span>
                        : dv <= 30 ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{dv}d</span>
                        :            <span className="text-xs text-gray-400 dark:text-slate-500">{dv}d</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${statusCor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {contratoSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {contratoSelecionado.numero_contrato}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-gray-500">
            Foram encontrados <strong>{contratosFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

      {/* ── Paginação ── */}
      {totalPagsCtr > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Mostrando{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">
              {(paginaCtr - 1) * PER_PAGE_CTR + 1}–{Math.min(paginaCtr * PER_PAGE_CTR, contratosFiltrados.length)}
            </span>{' '}de{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">{contratosFiltrados.length}</span>{' '}contratos
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPaginaCtr(p => Math.max(1, p - 1))} disabled={paginaCtr === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Anterior
            </button>
            {(() => {
              const pages = []
              for (let i = 1; i <= totalPagsCtr; i++) {
                if (i === 1 || i === totalPagsCtr || (i >= paginaCtr - 1 && i <= paginaCtr + 1)) pages.push(i)
                else if (pages[pages.length - 1] !== '...') pages.push('...')
              }
              return pages.map((p, idx) => p === '...'
                ? <span key={`dots-${idx}`} className="px-1.5 text-xs text-gray-400 dark:text-slate-500">…</span>
                : <button key={p} onClick={() => setPaginaCtr(p)}
                    className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      paginaCtr === p ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}>{p}</button>
              )
            })()}
            <button onClick={() => setPaginaCtr(p => Math.min(totalPagsCtr, p + 1))} disabled={paginaCtr === totalPagsCtr}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Incluir
        </button>
        <button onClick={() => podeAgir && setModal('editar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Edit3 className="w-4 h-4" /> Alterar
        </button>
        <button onClick={() => podeAgir && setModal('excluir')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
        <button onClick={() => podeAgir && setModal('visualizar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Eye className="w-4 h-4" /> Visualizar
        </button>
      </div>

      {/* ── Modais ── */}
      {modal === 'novo' && (
        <ContratoModal modo="novo" contrato={null} credores={credores} onSave={incluir} onClose={() => setModal(null)} />
      )}
      {modal === 'editar' && contratoSelecionado && (
        <ContratoModal modo="editar" contrato={contratoSelecionado} credores={credores} onSave={alterar} onClose={() => setModal(null)} />
      )}
      {modal === 'visualizar' && contratoSelecionado && (
        <ContratoModal modo="visualizar" contrato={contratoSelecionado} credores={credores} onSave={null} onClose={() => setModal(null)} />
      )}
      {modal === 'excluir' && contratoSelecionado && (
        <ConfirmModalContrato contrato={contratoSelecionado} onConfirm={excluir} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  RELATÓRIOS
// ══════════════════════════════════════════════════════════════════════════════
function TabRelatorios() {
  const [contratos, setContratos] = useState([])
  const [credores,  setCredores]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([api.get('/contratos'), api.get('/contratos/credores')])
      .then(([cr, cc]) => { setContratos(cr.data || []); setCredores(cc.data || []) })
      .finally(() => setLoading(false))
  }, [])

  const fmtMoeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(String(v ?? '').replace(',', '.')) || 0)
  const parseVal  = v => parseFloat(String(v ?? '').replace(',', '.')) || 0
  const nomeCredor = id => credores.find(c => c.id === id)?.razao_social || '—'
  const diasAte = d => {
    if (!d) return null
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const fim  = new Date(d + 'T00:00:00'); fim.setHours(0, 0, 0, 0)
    return Math.ceil((fim - hoje) / 86400000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="text-sm">Carregando relatórios...</span>
    </div>
  )

  const ativos   = contratos.filter(c => c.status === 'ATIVO')
  const totalVal = contratos.reduce((a, c) => a + parseVal(c.valor), 0)
  const ativoVal = ativos.reduce((a, c) => a + parseVal(c.valor), 0)
  const vencendo = ativos.filter(c => { const d = diasAte(c.vigencia_fim); return d !== null && d >= 0 && d <= 30 })
  const vencidos = ativos.filter(c => { const d = diasAte(c.vigencia_fim); return d !== null && d < 0 })

  const mapMod = {}
  contratos.forEach(c => { const m = c.modalidade || 'N/I'; if (!mapMod[m]) mapMod[m] = { qtd: 0, valor: 0 }; mapMod[m].qtd++; mapMod[m].valor += parseVal(c.valor) })
  const modList    = Object.entries(mapMod).sort((a, b) => b[1].valor - a[1].valor)
  const maxModVal  = modList[0]?.[1]?.valor || 1

  const mapStatus = {}
  contratos.forEach(c => { const s = c.status || 'N/I'; if (!mapStatus[s]) mapStatus[s] = { qtd: 0, valor: 0 }; mapStatus[s].qtd++; mapStatus[s].valor += parseVal(c.valor) })
  const statusList   = Object.entries(mapStatus).sort((a, b) => b[1].qtd - a[1].qtd)
  const maxStatusQtd = statusList[0]?.[1]?.qtd || 1

  const mapCred = {}
  contratos.forEach(c => { const n = nomeCredor(c.credor_id); if (!mapCred[n]) mapCred[n] = { qtd: 0, valor: 0 }; mapCred[n].qtd++; mapCred[n].valor += parseVal(c.valor) })
  const topCred    = Object.entries(mapCred).sort((a, b) => b[1].valor - a[1].valor).slice(0, 8)
  const maxCredVal = topCred[0]?.[1]?.valor || 1

  const mapSec = {}
  contratos.forEach(c => { const s = c.secretaria || 'Não informada'; if (!mapSec[s]) mapSec[s] = { qtd: 0, valor: 0 }; mapSec[s].qtd++; mapSec[s].valor += parseVal(c.valor) })
  const secList   = Object.entries(mapSec).sort((a, b) => b[1].valor - a[1].valor).slice(0, 8)
  const maxSecVal = secList[0]?.[1]?.valor || 1

  const STATUS_BAR   = { ATIVO: 'bg-green-500', ENCERRADO: 'bg-gray-400', SUSPENSO: 'bg-amber-500', RESCINDIDO: 'bg-red-500' }
  const STATUS_BADGE = { ATIVO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', ENCERRADO: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400', SUSPENSO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', RESCINDIDO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  const CORES = ['bg-blue-500','bg-purple-500','bg-teal-500','bg-indigo-500','bg-cyan-500','bg-violet-500','bg-sky-500','bg-fuchsia-500']

  const KpiCard = ({ icon: Icon, label, value, color }) => {
    const str = String(value); const sz = Math.min(1.4, Math.max(0.85, 1.4 - 0.07 * (str.length - 7))) + 'rem'
    return (
      <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          <Icon className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <p className="font-black tabular-nums text-gray-900 dark:text-white leading-tight truncate" style={{ fontSize: sz }}>{value}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{label}</p>
        </div>
      </div>
    )
  }

  const DashCardR = ({ icon: Icon, title, badge, children }) => (
    <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/70 dark:bg-slate-800/30">
        {Icon && <Icon className="w-4 h-4 text-blue-500" />}
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</h3>
        {badge && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-gray-500">{badge}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )

  const BarRowR = ({ label, value, extra, pct, bar }) => (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate max-w-[55%]" title={label}>{label}</span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-1">
          {extra && <span className="text-xs text-gray-400 hidden sm:block">{extra}</span>}
          <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{value}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
        <div className={`h-2 ${bar} rounded-full transition-all duration-700`} style={{ width: Math.min(100, pct) + '%' }} />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={FileText}     label="Total Contratos"  value={String(contratos.length)} color="from-blue-500 to-indigo-600" />
        <KpiCard icon={CheckCircle2} label="Ativos"           value={String(ativos.length)}    color="from-green-500 to-emerald-600" />
        <KpiCard icon={AlertTriangle} label="Vencendo (30d)" value={String(vencendo.length)}  color="from-yellow-400 to-orange-500" />
        <KpiCard icon={XCircle}      label="Vencidos"         value={String(vencidos.length)}  color="from-red-500 to-rose-600" />
        <KpiCard icon={DollarSign}   label="Valor Total"      value={fmtMoeda(totalVal)}       color="from-blue-600 to-indigo-700" />
        <KpiCard icon={TrendingUp}   label="Valor Ativo"      value={fmtMoeda(ativoVal)}       color="from-teal-500 to-cyan-600" />
      </div>

      {/* Alertas de vigência */}
      {(vencendo.length > 0 || vencidos.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vencendo.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">{vencendo.length} contrato(s) vencendo em 30 dias</span>
              </div>
              <div className="space-y-1.5">
                {vencendo.slice(0, 4).map(c => {
                  const d = diasAte(c.vigencia_fim)
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 w-24 shrink-0 truncate">{c.numero_contrato}</span>
                      <span className="text-gray-600 dark:text-slate-300 flex-1 truncate">{nomeCredor(c.credor_id)}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full shrink-0 ${d === 0 ? 'bg-red-100 text-red-600' : d <= 7 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-700'}`}>{d === 0 ? 'Hoje' : `${d}d`}</span>
                    </div>
                  )
                })}
                {vencendo.length > 4 && <p className="text-xs text-yellow-600 mt-1">+ {vencendo.length - 4} outros</p>}
              </div>
            </div>
          )}
          {vencidos.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-red-800 dark:text-red-300">{vencidos.length} contrato(s) com prazo expirado</span>
              </div>
              <div className="space-y-1.5">
                {vencidos.slice(0, 4).map(c => {
                  const d = diasAte(c.vigencia_fim)
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 w-24 shrink-0 truncate">{c.numero_contrato}</span>
                      <span className="text-gray-600 dark:text-slate-300 flex-1 truncate">{nomeCredor(c.credor_id)}</span>
                      <span className="font-bold px-2 py-0.5 rounded-full shrink-0 bg-red-100 text-red-600">{Math.abs(d)}d atrás</span>
                    </div>
                  )
                })}
                {vencidos.length > 4 && <p className="text-xs text-red-600 mt-1">+ {vencidos.length - 4} outros</p>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashCardR icon={Tag} title="Por Modalidade" badge={`${modList.length} tipos`}>
          {modList.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sem dados</p> : (
            <div className="space-y-3">
              {modList.map(([label, v], i) => (
                <BarRowR key={label} label={label} value={fmtMoeda(v.valor)} extra={`${v.qtd} contrato(s)`} pct={(v.valor / maxModVal) * 100} bar={CORES[i % CORES.length]} />
              ))}
            </div>
          )}
        </DashCardR>

        <DashCardR icon={Activity} title="Por Status">
          {statusList.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sem dados</p> : (
            <div className="space-y-3">
              {statusList.map(([status, v]) => {
                const pct = contratos.length > 0 ? (v.qtd / contratos.length) * 100 : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{v.qtd}</span>
                        <span className="text-xs text-gray-400 hidden sm:block">{fmtMoeda(v.valor)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div className={`h-2 ${STATUS_BAR[status] || 'bg-gray-400'} rounded-full transition-all`} style={{ width: Math.min(100, (v.qtd / maxStatusQtd) * 100) + '%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DashCardR>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashCardR icon={Award} title="Top Credores por Valor">
          {topCred.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sem dados</p> : (
            <div className="space-y-3">
              {topCred.map(([nome, v], i) => (
                <div key={nome} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 dark:text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate max-w-[55%]" title={nome}>{nome}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-1">
                        <span className="text-xs text-gray-400">{v.qtd}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(v.valor)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: Math.min(100, (v.valor / maxCredVal) * 100) + '%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashCardR>

        <DashCardR icon={Building2} title="Top Secretarias por Valor">
          {secList.length <= 1 ? <p className="text-sm text-gray-400 text-center py-6">Secretarias não informadas nos contratos</p> : (
            <div className="space-y-3">
              {secList.map(([nome, v], i) => (
                <BarRowR key={nome} label={nome} value={fmtMoeda(v.valor)} extra={`${v.qtd} contrato(s)`} pct={(v.valor / maxSecVal) * 100} bar={CORES[i % CORES.length]} />
              ))}
            </div>
          )}
        </DashCardR>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PÁGINA CONTRATOS
// ══════════════════════════════════════════════════════════════════════════════
export default function Contratos() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const VALID_TABS_CTR = TABS.map(t => t.key)
  const tab = VALID_TABS_CTR.includes(tabParam) ? tabParam : 'contratos'
  const setTab = (key) => navigate(`/${subdomain}/contratos/${key}`)

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        icon={FileText}
        title="Gestão Contratual"
        subtitle="Monitoramento de contratos, vigências, credores e execução financeira"
        actions={
          <button
            onClick={() => navigate(`/${subdomain}/contratos/dashboard`)}
            className="h-9 inline-flex items-center gap-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all"
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700/50 overflow-hidden">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none touch-pan-x">
          {TABS.map(t => {
            const active = tab === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Conteúdo */}
      {tab === 'contratos'  && <TabContratos />}
      {tab === 'credor'     && <TabCredor />}
      {tab === 'itens'      && <TabItens />}
      {tab === 'relatorios' && <TabRelatorios />}
    </div>
  )
}
