import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
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

const CATEGORIAS = ['material', 'servicos', 'pessoal', 'obras', 'outros']
const TIPOS = ['empenho', 'liquidacao', 'pagamento', 'receita', 'outros']
const STATUS_LABELS = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', emoji: '⏳' },
  pago:     { label: 'Pago',     color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',  emoji: '✅' },
  vencido:  { label: 'Vencido',  color: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',    emoji: '🔴' },
  cancelado:{ label: 'Cancelado',color: 'bg-gray-100   text-gray-600   dark:bg-gray-700      dark:text-gray-400',   emoji: '❌' },
}
const PROC_STATUS = {
  aberto:     { label: 'Aberto',      color: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400' },
  em_analise: { label: 'Em Análise',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  concluido:  { label: 'Concluído',   color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400' },
  devolvido:  { label: 'Devolvido',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  arquivado:  { label: 'Arquivado',   color: 'bg-gray-100   text-gray-600   dark:bg-gray-700      dark:text-gray-400' },
}
const TABS = [
  { id: 'painel',    label: '🏠 Painel' },
  { id: 'processos', label: '📋 Processos DID' },
  { id: 'relatorio', label: '📊 Relatório' },
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">✕</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Card de métrica ──────────────────────────────────────────────────────────
function MetricCard({ emoji, label, value, sub, color = 'blue', delay = '' }) {
  const colors = {
    blue:   'from-blue-500   to-indigo-600',
    green:  'from-green-500  to-emerald-600',
    yellow: 'from-yellow-400 to-orange-500',
    red:    'from-red-500    to-rose-600',
    purple: 'from-purple-500 to-violet-600',
  }
  const bgSoft = {
    blue:   'dark:bg-blue-900/20',
    green:  'dark:bg-green-900/20',
    yellow: 'dark:bg-yellow-900/20',
    red:    'dark:bg-red-900/20',
    purple: 'dark:bg-purple-900/20',
  }
  return (
    <div className={`card p-5 animate-bounce-in ${delay}`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-xl shadow-md`}>
          {emoji}
        </div>
        {sub && <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────
function MultiSelect({ label, placeholder, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  const displayLabel = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? (options.find(o => (o.v ?? o) === selected[0])?.l ?? selected[0])
      : `${selected.length} selecionados`

  return (
    <div className="relative" ref={ref}>
      {label && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input-field w-full text-left flex items-center justify-between gap-2 text-sm"
      >
        <span className={selected.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}>
          {displayLabel}
        </span>
        <span className="text-gray-400 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map(v => (
            <span key={v} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded text-[10px] font-medium">
              {options.find(o => (o.v ?? o) === v)?.l ?? v}
              <button onClick={() => toggle(v)} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {options.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">Nenhuma opção disponível</p>
          )}
          {options.map(opt => {
            const v = opt.v ?? opt
            const l = opt.l ?? opt
            const checked = selected.includes(v)
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggle(v)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  checked ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                  checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-500'
                }`}>{checked ? '✓' : ''}</span>
                {l}
              </button>
            )
          })}
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
      <span className="text-[11px] text-gray-400 dark:text-gray-500 w-44 flex-shrink-0 pt-0.5">{l}</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '94vh' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-900 rounded-t-xl flex-shrink-0">
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
                <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + (
                  did.pago === 'sim' ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'
                )}>
                  {did.pago === 'sim' ? '✅ Pago' : '⏳ Pendente'}
                </span>
                {did.secretaria_sec1 && <span className="text-xs text-gray-400">· {did.secretaria_sec1}</span>}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handlePDF} disabled={!did || gerando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
              {gerando ? '⏳' : '📄'} Gerar PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">✕</button>
          </div>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500">⏳ Carregando DID...</div>
          ) : !did ? (
            <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500">DID não encontrado ou não preenchido para este processo.</div>
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
                {hasAny(did.cert_sec1_municipal, did.cert_sec1_trabalhista, did.cert_sec1_fgts, did.cert_sec1_estadual, did.cert_sec1_federal) && (
                  <div className="col-span-2 mt-1">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">Certidões (Sec. I)</span>
                    <Chips items={[
                      did.cert_sec1_municipal   && '✅ Municipal',
                      did.cert_sec1_trabalhista && '✅ Trabalhista',
                      did.cert_sec1_fgts        && '✅ FGTS',
                      did.cert_sec1_estadual    && '✅ Estadual',
                      did.cert_sec1_federal     && '✅ Federal',
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
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">Despacho via C.I.</span>
                    <p className="text-[12px] text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap">{did.despacho_ci}</p>
                  </div>
                )}
              </Sec>

              {/* ══ ITENS ══ */}
              {did.itens_did?.length > 0 && (
                <div className="card overflow-hidden">
                  <SecBar num="ITENS" titulo="Itens do DID" color="bg-teal-700" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400">Descrição</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 w-16">Unid.</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 w-20">Qtd.</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 w-28">Vlr. Unit.</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {did.itens_did.map((it, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{it.descricao || '—'}</td>
                            <td className="py-2 px-3 text-center text-gray-500">{it.unidade || '—'}</td>
                            <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{it.quantidade || '—'}</td>
                            <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{it.valor_unitario ? fmtM(it.valor_unitario) : '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white">{it.valor_total ? fmtM(it.valor_total) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <td colSpan={4} className="py-2 px-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">Total Itens</td>
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
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Certidões</span>
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
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 w-44">Status de Pagamento</span>
                      <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + (did.pago === 'sim' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                        {did.pago === 'sim' ? '✅ Pago' : '⏳ Pendente'}
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
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">Observações</span>
                      <p className="text-[12px] text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap">{did.receb_obs}</p>
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
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Certidões</span>
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
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 w-44">Status de Pagamento</span>
                      <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + (did.pago === 'sim' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                        {did.pago === 'sim' ? '✅ Pago' : '⏳ Pendente'}
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
  const [loadingPainel, setLoadingPainel] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
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
  const [procsFiltros, setProcsFiltros] = useState({ status: '', busca: '', data_inicio: '', data_fim: '' })

  // ── Relatório state
  const [relatorio, setRelatorio] = useState(null)
  const [relFiltros, setRelFiltros] = useState({ data_inicio: '', data_fim: '', categoria: '' })
  const [relLoading, setRelLoading] = useState(false)

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
      const { data } = await api.get(`/financeiro/relatorio?${p}`)
      setRelatorio(data)
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

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">💵 Financeiro</h1>
          <p className="page-subtitle">Controle de despesas, empenhos e processos DID da entidade</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB: PAINEL ═══════════════════════════════════════════════════════ */}
      {tab === 'painel' && (
        <div className="space-y-6">

          {/* ── Painel de filtros ────────────────────────────────────────── */}
          <div className="card p-4 space-y-4">
            {/* Linha 1: Ano + Tipo + Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📅 Ano</p>
                <select className="input-field w-full" value={painelAno} onChange={e => { setPainelAno(Number(e.target.value)) }}>
                  {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <MultiSelect
                label="📂 Tipo"
                placeholder="Todos os tipos"
                options={[{ v: 'fixas', l: 'Contas Fixas' }, { v: 'variaveis', l: 'Contas Variáveis' }]}
                selected={painelFiltros.tipos}
                onChange={v => setPainelFiltros(f => ({ ...f, tipos: v }))}
              />

              <MultiSelect
                label="🔖 Status"
                placeholder="Todos os status"
                options={[{ v: 'pago', l: '✅ Pago' }, { v: 'pendente', l: '⏳ Pendente' }]}
                selected={painelFiltros.status}
                onChange={v => setPainelFiltros(f => ({ ...f, status: v }))}
              />

              <MultiSelect
                label="📆 Mês de Referência"
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
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📅 Data Pagamento — Início</p>
                <input
                  type="date"
                  className="input-field w-full"
                  value={painelFiltros.data_inicio}
                  onChange={e => setPainelFiltros(f => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📅 Data Pagamento — Fim</p>
                <input
                  type="date"
                  className="input-field w-full"
                  value={painelFiltros.data_fim}
                  onChange={e => setPainelFiltros(f => ({ ...f, data_fim: e.target.value }))}
                />
              </div>

              <MultiSelect
                label="💰 Fonte de Recurso"
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
                label="🏛️ Secretaria"
                placeholder="Todas as secretarias"
                options={painelOptions.secretarias}
                selected={painelFiltros.secretarias}
                onChange={v => setPainelFiltros(f => ({ ...f, secretarias: v }))}
              />

              <MultiSelect
                label="🏢 Credor"
                placeholder="Todos os credores"
                options={painelOptions.credores}
                selected={painelFiltros.credores}
                onChange={v => setPainelFiltros(f => ({ ...f, credores: v }))}
              />
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2 pt-1">
              <button className="btn-primary text-sm" onClick={() => { loadPainel(); setPainelDidsPage(1) }}>🔍 Filtrar</button>
              <button
                className="btn-secondary text-sm"
                onClick={() => {
                  setPainelFiltros({ meses_ref: [], data_inicio: '', data_fim: '', status: [], secretarias: [], credores: [], fontes: [], tipos: [] })
                  setPainelDidsPage(1)
                  setTimeout(loadPainel, 0)
                }}
              >✕ Limpar</button>
              <button className="btn-secondary text-sm ml-auto" onClick={loadPainel}>🔄 Atualizar</button>
              {lastUpdated && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                  {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button
                className={'text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ' + (
                  painel
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                )}
                disabled={!painel}
                onClick={() => gerarPainelPDF({ painel, filtros: painelFiltros, ano: painelAno, orgNome: '' })}
              >
                📄 Gerar PDF
              </button>
            </div>
          </div>

          {loadingPainel ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">⏳ Carregando...</div>
          ) : painel ? (
            <>
              {/* ── Cards DID (dados principais) ─────────────────────── */}
              {painel.dids && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MetricCard emoji="💵" label="Valor Bruto Total (DID)"  value={fmtMoeda(painel.dids.valorBrutoTotal)}   color="blue"   />
                  <MetricCard emoji="✅" label="Total Pago"               value={fmtMoeda(painel.dids.valorPago)}         color="green"  delay="[animation-delay:60ms]" />
                  <MetricCard emoji="⏳" label="Total Pendente"           value={fmtMoeda(painel.dids.valorPendente)}     color="yellow" delay="[animation-delay:120ms]" />
                </div>
              )}

              {/* ── Cards KPI extras ─────────────────────────────────── */}
              {painel.dids && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MetricCard emoji="📋" label="Total DIDs Emitidos"   value={totalDIDs}  color="blue"   delay="[animation-delay:60ms]" />
                  <MetricCard emoji="🔔" label="Taxa de Inadimplencia"  value={inadValue}  sub={inadSub}  color={inadColor} delay="[animation-delay:120ms]" />
                </div>
              )}

              {/* ── Relação de DIDs (lista completa filtrada) ───────────── */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                  <p className="section-header">📋 Relação de DIDs — {painelAno}</p>
                  {painelDidsTotal > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{painelDidsTotal} DID{painelDidsTotal !== 1 ? 's' : ''}</span>
                  )}
                </div>
                {painelDidsLoading ? (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500">⏳ Carregando...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Nº DID</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Tipo</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Credor</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Secretaria</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Mês Ref.</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Data</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Valor Bruto</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Pagto.</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {painelDids.length === 0 ? (
                          <tr><td colSpan={9} className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Nenhum DID registrado no período</td></tr>
                        ) : painelDids.map(proc => {
                          const d = proc.did
                          return (
                            <tr key={proc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
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
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 max-w-[130px] truncate">{d?.secretaria_sec1 || '—'}</td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{d?.mes_referencia || '—'}</td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtData(d?.data_did || proc.data_abertura)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                {d?.valor_bruto ? fmtMoeda(d.valor_bruto) : <span className="text-gray-400 text-xs">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {d ? (
                                  d.pago === 'sim'
                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✅ Pago</span>
                                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">⏳ Pendente</span>
                                ) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  disabled={!d}
                                  onClick={() => d && setDidVizId(proc.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Ver DID"
                                >
                                  👁 Ver DID
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
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{painelDidsTotal} registros</span>
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary text-xs" disabled={painelDidsPage === 1} onClick={() => setPainelDidsPage(p => p - 1)}>← Anterior</button>
                      <span className="text-xs text-gray-500 dark:text-gray-400 py-1.5">Pág. {painelDidsPage} / {Math.ceil(painelDidsTotal / 20)}</span>
                      <button className="btn-secondary text-xs" disabled={painelDidsPage * 20 >= painelDidsTotal} onClick={() => setPainelDidsPage(p => p + 1)}>Próxima →</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Distribuição por Tipo + Status de Pagamento ───────── */}
              {painel.dids && totalDIDs > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Distribuição por Tipo */}
                  <div className="card p-5">
                    <p className="section-header mb-4">📊 Distribuição por Tipo</p>
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
                            <div className="text-xs text-gray-500 dark:text-gray-400">Contas Fixas</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-purple-500 rounded flex-shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{painel.dids.totalVariaveis}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Contas Variáveis</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status de Pagamento */}
                  <div className="card p-5">
                    <p className="section-header mb-4">💳 Status de Pagamento</p>
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
                            <div className="text-xs text-gray-500 dark:text-gray-400">DIDs Pagos</div>
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">{fmtMoeda(painel.dids.valorPago)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="w-3 h-3 bg-yellow-400 rounded flex-shrink-0" />
                          <div>
                            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{pendentesQtd}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">DIDs Pendentes</div>
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
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">💰 Lançamentos Financeiros</span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard emoji="💰" label="Total Despesas"  value={fmtMoeda(painel.totais.valorTotal)}     color="blue"   />
                    <MetricCard emoji="✅" label="Valores Pagos"   value={fmtMoeda(painel.totais.valorPago)}      color="green"  delay="[animation-delay:60ms]" />
                    <MetricCard emoji="⏳" label="A Pagar"         value={fmtMoeda(painel.totais.valorPendente)}  color="yellow" delay="[animation-delay:120ms]" />
                    <MetricCard emoji="🔴" label="Vencidos"        value={fmtMoeda(painel.totais.valorVencido)}   color="red"    delay="[animation-delay:180ms]" />
                  </div>
                </>
              )}

              {/* Gráfico por mês — DIDs */}
              <div className="card p-5">
                <p className="section-header mb-4">📈 DIDs por Mês — {painelAno}</p>
                {mesesData.every(v => v === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhum DID com data registrada neste período</p>
                ) : (
                  <div className="flex items-end gap-1 h-36">
                    {mesesData.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {v > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {fmtMoeda(v)}
                          </span>
                        )}
                        <div
                          className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-400 cursor-default"
                          style={{ height: ((v / mesesMax) * 100) + '%', minHeight: v > 0 ? '4px' : '0' }}
                          title={MESES[i] + ': ' + fmtMoeda(v)}
                        />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{MESES[i]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Por Secretaria */}
                <div className="card p-5">
                  <p className="section-header mb-4">🏛️ Por Secretaria</p>
                  {(!painel.dids?.porSecretaria || painel.dids.porSecretaria.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
                  )}
                  <div className="space-y-3">
                    {painel.dids?.porSecretaria?.map((c, i) => {
                      const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                      const pct = totalGeral > 0 ? Math.round((parseFloat(c.total) / totalGeral) * 100) : 0
                      const cores = ['bg-blue-500','bg-purple-500','bg-teal-500','bg-indigo-500','bg-cyan-500','bg-violet-500','bg-sky-500','bg-fuchsia-500']
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[65%]" title={c.secretaria}>{c.secretaria || '—'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap ml-2">{fmtMoeda(c.total)} <span className="text-xs text-gray-400">({c.qtd} DID{c.qtd !== 1 ? 's' : ''})</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded-full">
                            <div className={'h-2 ' + cores[i % cores.length] + ' rounded-full transition-all'} style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* DIDs Pendentes */}
                <div className="card p-5">
                  <p className="section-header mb-4">⏳ DIDs Pendentes</p>
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
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{d.credor_sec1 || d.secretaria_sec1 || '—'}</p>
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
                <p className="section-header mb-4">🏆 Top Credores</p>
                {(!painel.dids?.porCredor || painel.dids.porCredor.length === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum credor registrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Credor</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">DIDs</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Total</th>
                          <th className="py-2 px-3 w-32"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {painel.dids.porCredor.map((c, i) => {
                          const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 0
                          const pct = totalGeral > 0 ? Math.round((parseFloat(c.total) / totalGeral) * 100) : 0
                          return (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                              <td className="py-2 px-3 text-gray-400 text-xs font-bold">{i + 1}º</td>
                              <td className="py-2 px-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{c.credor || '—'}</td>
                              <td className="py-2 px-3 text-center text-gray-500 dark:text-gray-400">{c.qtd}</td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.total)}</td>
                              <td className="py-2 px-3">
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full">
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
                  <p className="section-header mb-4">📊 Top Credores — Visão Gráfica</p>
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
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.credor || '—'}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400">{c.qtd} DID{c.qtd !== 1 ? 's' : ''}</span>
                                <span className={'text-xs font-bold ' + cor.text}>{pct}%</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(c.total)}</span>
                              </div>
                            </div>
                            <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">Erro ao carregar painel</div>
          )}
        </div>
      )}

      {/* ═══ TAB: PROCESSOS DID ════════════════════════════════════════════════ */}
      {tab === 'processos' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                className="input-field col-span-2"
                placeholder="🔍 Buscar número, assunto, interessado..."
                value={procsFiltros.busca}
                onChange={e => setProcsFiltros(f => ({ ...f, busca: e.target.value }))}
              />
              <select className="input-field" value={procsFiltros.status} onChange={e => setProcsFiltros(f => ({ ...f, status: e.target.value }))}>
                <option value="">Todos status</option>
                {Object.entries(PROC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="flex gap-2">
                <button className="btn-primary text-sm flex-1" onClick={() => { setProcsPage(1); loadProcs() }}>🔍</button>
                <button className="btn-secondary text-sm" onClick={() => setProcsFiltros({ status: '', busca: '', data_inicio: '', data_fim: '' })}>✕</button>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              {procsLoading ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">⏳ Carregando...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Nº Processo / DID</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Tipo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Credor / Secretaria</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Data</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Valor Bruto</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Pagto.</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Lançamentos</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {procs.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">Nenhum processo DID encontrado</td></tr>
                    ) : procs.map(p => {
                      const totalLanc = p.lancamentos?.reduce((acc, l) => acc + parseFloat(l.valor || 0), 0) || 0
                      const did = p.did
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
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
                              )}>{did.tipo_did === 'variaveis' ? '📊 Variáveis' : '📌 Fixas'}</span>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-900 dark:text-white font-medium">{did?.credor_sec1 || p.interessado_nome || '—'}</p>
                            {did?.secretaria_sec1 && <p className="text-xs text-gray-400">{did.secretaria_sec1}</p>}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtData(did?.data_did || p.data_abertura)}</td>
                          <td className="py-3 px-4 text-right">
                            {did?.valor_bruto
                              ? <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtMoeda(did.valor_bruto)}</span>
                              : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {did
                              ? did.pago === 'sim'
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✅ Pago</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">⏳ Pendente</span>
                              : '—'
                            }
                          </td>
                          <td className="py-3 px-4 text-right">
                            {p.lancamentos?.length > 0
                              ? <span className="font-semibold text-green-600 dark:text-green-400">{fmtMoeda(totalLanc)}<br /><span className="text-xs font-normal text-gray-400">{p.lancamentos.length} lanç.</span></span>
                              : <span className="text-gray-400 dark:text-gray-500 text-xs">Sem lançamentos</span>
                            }
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              to={'/' + subdomain + '/processos/' + p.id}
                              className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-block"
                              title="Ver processo"
                            >
                              👁️
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">{procsTotal} processos</span>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs" disabled={procsPage === 1} onClick={() => setProcsPage(p => p - 1)}>← Anterior</button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 py-1.5">Pág. {procsPage}</span>
                  <button className="btn-secondary text-xs" disabled={procsPage * LIMIT >= procsTotal} onClick={() => setProcsPage(p => p + 1)}>Próxima →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB: RELATÓRIO ════════════════════════════════════════════════════ */}
      {tab === 'relatorio' && (
        <div className="space-y-5">
          {/* Filtros */}
          <div className="card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data início</label>
                <input type="date" className="input-field" value={relFiltros.data_inicio} onChange={e => setRelFiltros(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data fim</label>
                <input type="date" className="input-field" value={relFiltros.data_fim} onChange={e => setRelFiltros(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Categoria</label>
                <select className="input-field" value={relFiltros.categoria} onChange={e => setRelFiltros(f => ({ ...f, categoria: e.target.value }))}>
                  <option value="">Todas</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button className="btn-primary text-sm flex-1" onClick={loadRelatorio}>📊 Gerar</button>
                <button className="btn-secondary text-sm" onClick={() => setRelFiltros({ data_inicio: '', data_fim: '', categoria: '' })}>✕</button>
              </div>
            </div>
          </div>

          {relLoading ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">⏳ Gerando relatório...</div>
          ) : relatorio ? (
            <>
              {/* Total geral */}
              <div className="card p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Geral do Período</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-400 mt-1">{fmtMoeda(relatorio.valorTotal)}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Por status */}
                <div className="card p-5">
                  <p className="section-header mb-4">📊 Por Status</p>
                  <div className="space-y-2">
                    {relatorio.porStatus?.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ' + STATUS_LABELS[s.status]?.color}>
                          {STATUS_LABELS[s.status]?.emoji} {STATUS_LABELS[s.status]?.label || s.status}
                        </span>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{fmtMoeda(s.total)}</p>
                          <p className="text-xs text-gray-400">{s.qtd} lanç.</p>
                        </div>
                      </div>
                    ))}
                    {relatorio.porStatus?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
                  </div>
                </div>

                {/* Por tipo */}
                <div className="card p-5">
                  <p className="section-header mb-4">🏷️ Por Tipo</p>
                  <div className="space-y-2">
                    {relatorio.porTipo?.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{t.tipo}</span>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{fmtMoeda(t.total)}</p>
                          <p className="text-xs text-gray-400">{t.qtd} lanç.</p>
                        </div>
                      </div>
                    ))}
                    {relatorio.porTipo?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
                  </div>
                </div>

                {/* Por categoria */}
                <div className="card p-5">
                  <p className="section-header mb-4">📂 Por Categoria</p>
                  <div className="space-y-3">
                    {relatorio.porCategoria?.map((c, i) => {
                      const pct = parseFloat(relatorio.valorTotal) > 0
                        ? Math.round((parseFloat(c.total) / parseFloat(relatorio.valorTotal)) * 100)
                        : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-gray-300 capitalize">{c.categoria || 'outros'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{fmtMoeda(c.total)} <span className="text-xs text-gray-400">({pct}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded-full">
                            <div className="h-2 bg-green-500 rounded-full" style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      )
                    })}
                    {relatorio.porCategoria?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
                  </div>
                </div>

                {/* Por setor */}
                <div className="card p-5">
                  <p className="section-header mb-4">🏛️ Por Setor</p>
                  <div className="space-y-2">
                    {relatorio.porSetor?.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{s.setor?.nome || 'Sem setor'}</span>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{fmtMoeda(s.dataValues?.total || s.total)}</p>
                          <p className="text-xs text-gray-400">{s.dataValues?.qtd || s.qtd} lanç.</p>
                        </div>
                      </div>
                    ))}
                    {relatorio.porSetor?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-3">📊</p>
              <p>Configure os filtros e clique em <strong>Gerar</strong> para visualizar o relatório</p>
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
