import CampoSugerido from '../../components/ui/CampoSugerido'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { retanguloEmCss } from '../../utils/escalaTela'
import { FileText, ShoppingBag, User, BarChart2, ClipboardList, Gavel } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
export const TABS = [
  { key: 'licitacoes', label: 'Licitação',               icon: Gavel,         emoji: '⚖️', permPath: ['contratos', 'licitacoes','ver'] },
  { key: 'credor',     label: 'Credores',                icon: User,          emoji: '🏢', permPath: ['contratos', 'credores',  'ver'] },
  { key: 'itens',      label: 'Itens',                   icon: ShoppingBag,   emoji: '📦', permPath: ['contratos', 'itens',     'ver'] },
  { key: 'contratos',  label: 'Contratos',              icon: FileText,      emoji: '📋', permPath: ['contratos', 'contratos', 'ver'] },
  { key: 'ordens',     label: 'Ordem de Serviço/Compra', icon: ClipboardList, emoji: '🛒', permPath: ['contratos', 'ordens',    'ver'] },
  { key: 'relatorios', label: 'Relatórios',              icon: BarChart2,     emoji: '📊', permPath: ['contratos', 'relatorios','ver'] },
]

// Unidades de medida do banco de itens (compras, serviços, obras, saúde e publicidade)
export const UNIDADES      = ['UNIDADE',
  // Contagem e embalagens
  'AMPOLA','BALDE','BANDEJA','BARRA','BISNAGA','BLOCO','BOBINA','BOLSA','BOMBONA','CAIXA','CÁPSULA','CARTELA','CARTUCHO',
  'CENTO','CHAPA','CILINDRO','COMPRIMIDO','CONJUNTO','DRÁGEA','DÚZIA','ENVELOPE','EXEMPLAR','FARDO','FOLHA','FRASCO','GALÃO',
  'GARRAFA','GARRAFÃO','JOGO','KIT','LATA','MAÇO','MILHEIRO','PACOTE','PAR','PEÇA','PLACA','POTE','REFIL','RESMA','ROLO',
  'SACHÊ','SACO','TABLETE','TAMBOR','TUBO','VIDRO','VOLUME',
  // Peso, volume e medidas
  'MG','G','KG','ARROBA','TONELADA','ML','LITRO','M³','MM','CM','METRO','METRO LINEAR','M²','KM','KM RODADO',
  // Publicidade
  'CM POR COLUNA','INSERÇÃO','SEGUNDO','MINUTO','PALAVRA','CARACTERE','LAUDA','PÁGINA','VEICULAÇÃO',
  // Tempo e serviços
  'HORA','HORA/MÁQUINA','HORA TÉCNICA','DIA','DIÁRIA','SEMANA','QUINZENA','MÊS','BIMESTRE','TRIMESTRE','SEMESTRE','ANO',
  'SERVIÇO','SERVIÇOS','EVENTO','SESSÃO','VISITA','ATENDIMENTO','CONSULTA','EXAME','PROCEDIMENTO','PLANTÃO','PESSOA',
  'ALUNO','REFEIÇÃO','KIT REFEIÇÃO','VIAGEM','TRECHO','FRETE','LICENÇA','ASSINATURA','ACESSO','USUÁRIO','PONTO',
  // Obras
  'VERBA','GLOBAL','ETAPA','MEDIÇÃO','PARCELA','LOTE',
]
export const CATEGORIAS    = ['COMPRAS','SERVIÇOS']
export const STATUS_ITEM   = ['ATIVO','INATIVO']

// Item do catálogo vinculado (contrato, ordens, DID): descrição e especificação num campo só
export function descricaoComEspecificacao(item) {
  const desc = String(item?.descricao || '').trim()
  const esp  = String(item?.especificacao || '').trim()
  if (!esp || desc.toLowerCase().includes(esp.toLowerCase())) return desc
  return desc ? `${desc} - ${esp}` : esp
}
export const ESTADOS_BR    = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
// Lei 14.133/2021: modalidades (art. 28), contratação direta (arts. 72-75) e adesão a ata
// de registro de preços (art. 86, "carona"). Os nomes já gravados (Concorrência, Dispensa…) se mantêm.
export const MODALIDADES   = ['Pregão Eletrônico','Pregão Presencial','Concorrência','Concurso','Leilão','Diálogo Competitivo',
  'Dispensa','Inexigibilidade','Credenciamento','Adesão a Ata de Registro de Preços']
// Lei 8.666/1993 e RDC: só aparecem em contratos/licitações antigos que já usam
export const MODALIDADES_ANTIGAS = ['Tomada de Preços','Convite','RDC']
export const TIPOS_OBJETO  = ['Material','Serviço','Obra','Locação de Imóveis','Locação de Veículos','Consultoria','Tecnologia da Informação','Manutenção','Outros']

// ── Helpers ───────────────────────────────────────────────────────────────────
export function proximoCodigo(itens) {
  if (!itens || itens.length === 0) return '00001'
  const max = itens.reduce((m, item) => {
    const n = parseInt(item.codigo) || 0
    return n > m ? n : m
  }, 0)
  return String(max + 1).padStart(5, '0')
}

// ── UI Primitives ─────────────────────────────────────────────────────────────
export function FieldRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 min-h-[34px]">
      <span className="w-36 shrink-0 text-sm text-right text-ink-600">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export function SectionTitle({ children }) {
  return (
    <div className="bg-ink-100 px-4 py-1.5 -mx-6 text-xs font-bold text-ink-600 uppercase tracking-wide border-y border-ink-200">
      {children}
    </div>
  )
}

// ── Card de Seção Premium ──────────────────────────────────────────────────────
export function SectionCard({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-ink-100 bg-surface shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-info-50 dark:bg-info-900/30 flex items-center justify-center">
              <Icon className="w-4 h-4 text-brand-600 dark:text-info-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-800">{title}</p>
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── PortalDropdown — renderiza o dropdown em document.body via portal ─────────
// Evita corte por overflow-hidden/overflow-y-auto nos cards e modais.
export function PortalDropdown({ anchorRef, open, children, minWidth = 0, className = '' }) {
  const [style, setStyle] = useState({})
  useEffect(() => {
    if (!open) return
    const el = anchorRef?.current
    if (!el) return
    const update = () => {
      const r = retanguloEmCss(el)
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
      className={`bg-surface border border-ink-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto ${className}`}
    >
      {children}
    </div>,
    document.body
  )
}

// ── Campo de Exibição (Visualização) ──────────────────────────────────────────
export function ViewField({ label, value, mono = false, badge = null, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">{label}</p>
      {badge ? badge : (
        <p className={`text-sm font-medium text-ink-800 ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-ink-400">—</span>}
        </p>
      )}
    </div>
  )
}

// ── Input Premium ──────────────────────────────────────────────────────────────
export function PremiumInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full h-11 px-3.5 rounded-xl border border-ink-200 bg-surface text-sm text-ink-800 placeholder-gray-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${className}`}
      {...props}
    />
  )
}

// ── Select Premium ─────────────────────────────────────────────────────────────
export function PremiumSelect({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full h-11 px-3.5 rounded-xl border border-ink-200 bg-surface text-sm text-ink-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

// ── Select com busca ──────────────────────────────────────────────────────────
// Digita e a lista filtra na hora (sem acento/maiúscula; quem começa com o texto vem
// primeiro). Só aceita uma opção da lista: ao sair do campo sem escolher, volta ao valor.
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
export function SelectBusca({ value, onChange, opcoes = [], placeholder = 'Digite para buscar...', className = '' }) {
  const [texto, setTexto] = useState(value || '')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const anchorRef = useRef(null)
  useEffect(() => { if (!aberto) setTexto(value || '') }, [value, aberto])

  // Valor gravado fora da lista (item antigo) continua aparecendo
  const lista = value && !opcoes.includes(value) ? [value, ...opcoes] : opcoes
  const q = semAcento(texto)
  const filtradas = !q || texto === value ? lista : [
    ...lista.filter(o => semAcento(o).startsWith(q)),
    ...lista.filter(o => !semAcento(o).startsWith(q) && semAcento(o).includes(q)),
  ]

  const escolher = (o) => { onChange(o); setTexto(o); setAberto(false) }
  const sair = () => {
    const exata = lista.find(o => semAcento(o) === q)
    if (exata && exata !== value) onChange(exata)
    setTexto(exata || value || '')
    setAberto(false)
  }
  const teclas = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo(i => Math.min(i + 1, filtradas.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (aberto && filtradas[ativo]) escolher(filtradas[ativo]) }
    else if (e.key === 'Escape') { setTexto(value || ''); setAberto(false) }
  }

  return (
    <div ref={anchorRef}>
      <input
        value={texto}
        onChange={e => { setTexto(e.target.value); setAberto(true); setAtivo(0) }}
        onFocus={e => { e.target.select(); setAberto(true); setAtivo(0) }}
        onBlur={() => setTimeout(sair, 150)}
        onKeyDown={teclas}
        placeholder={placeholder}
        className={`w-full h-11 px-3.5 rounded-xl border border-ink-200 bg-surface text-sm text-ink-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${className}`}
      />
      <PortalDropdown anchorRef={anchorRef} open={aberto}>
        {filtradas.length === 0
          ? <p className="px-3 py-2 text-xs text-ink-400">Nenhuma opção encontrada</p>
          : filtradas.map((o, i) => (
            <button key={o} type="button" onMouseDown={() => escolher(o)} onMouseEnter={() => setAtivo(i)}
              className={`w-full text-left px-3 py-1.5 text-sm ${i === ativo ? 'bg-info-50 dark:bg-info-900/20' : ''} ${o === value ? 'font-semibold text-brand-700 dark:text-info-400' : 'text-ink-800'}`}>
              {o}
            </button>
          ))}
      </PortalDropdown>
    </div>
  )
}

// ── Textarea Premium ───────────────────────────────────────────────────────────
// sugestao: { campo, rotulo, contexto, pronto?, quando? } — abre o campo em branco já com um texto da Ayla
export function PremiumTextarea({ className = '', sugestao, ...props }) {
  const cls = `w-full px-3.5 py-3 rounded-xl border border-ink-200 bg-surface text-sm text-ink-800 placeholder-gray-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none ${className}`
  if (sugestao) {
    return <CampoSugerido campo={sugestao.campo} rotulo={sugestao.rotulo} contexto={sugestao.contexto} pronto={sugestao.pronto ?? true} quando={sugestao.quando}
      registrarNoEnvio={false} className={cls} {...props} />
  }
  return <textarea className={cls} {...props} />
}

// ── Stepper ───────────────────────────────────────────────────────────────────
export function ModalStepper({ steps, currentStep, onStep }) {
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
                ? 'bg-brand-600 text-white shadow-sm'
                : done
                ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400 border border-success-200 dark:border-success-700/50'
                : 'bg-ink-50 text-ink-500 border border-ink-200 hover:border-info-300 hover:text-brand-600 dark:hover:text-info-400'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              active ? 'bg-surface/20 text-white' : done ? 'bg-success-500 text-white' : 'bg-ink-200 text-ink-500'
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
export function VigenciaProgress({ inicio, fim, assinatura }) {
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
  const barColor  = vencido ? 'bg-danger-500' : proximo ? 'bg-amber-400' : 'bg-success-500'
  const fmtDate   = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  return (
    <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-4 space-y-3">
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Assinatura',  value: fmtDate(assinatura || inicio) },
          { label: 'Início',      value: fmtDate(inicio) },
          { label: 'Fim',         value: fmtDate(fim) },
          { label: 'Dias restantes', value: vencido ? `Vencido há ${Math.abs(diasRest)}d` : `${diasRest}d`, highlight: vencido ? 'text-danger-600' : proximo ? 'text-amber-600' : 'text-success-600' },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
            <p className={`text-sm font-bold ${highlight || 'text-ink-800'}`}>{value}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-ink-400 mt-1 text-right">{Math.round(pct)}% do período decorrido</p>
      </div>
    </div>
  )
}

