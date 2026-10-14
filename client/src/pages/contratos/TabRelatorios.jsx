import { useState, useEffect } from 'react'
import {
  FileText, CheckCircle2, AlertTriangle, XCircle, DollarSign,
  TrendingUp, Building2, Award, Tag, Activity, X,
  ClipboardList, ShoppingCart, Wrench, FileDown, Loader2,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../services/api'
import LoadingBar from '../../components/LoadingBar'
import { applyTimbradoToPage } from '../../utils/timbradoStore'
import { getMargens } from '../../utils/margensStore'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtMoeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(String(v ?? '').replace(',', '.')) || 0)
const parseVal  = v => parseFloat(String(v ?? '').replace(',', '.')) || 0
const fmtData   = d => { if (!d) return '—'; const [y, m, dia] = d.split('T')[0].split('-'); return `${dia}/${m}/${y}` }
const safe = v => v === null || v === undefined ? '-' : String(v).replace(/[^\x00-\xFF]/g, '').replace(/\s+/g, ' ').trim() || '-'

const STATUS_BADGE = {
  ATIVO:      'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  ENCERRADO:  'bg-ink-100 text-ink-600',
  SUSPENSO:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESCINDIDO: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
}
const STATUS_BAR   = { ATIVO: 'bg-success-500', ENCERRADO: 'bg-ink-400', SUSPENSO: 'bg-amber-500', RESCINDIDO: 'bg-danger-500' }
const CORES = ['bg-info-500','bg-purple-500','bg-teal-500','bg-indigo-500','bg-cyan-500','bg-violet-500','bg-info-500','bg-violet-500']

// ── PDF ───────────────────────────────────────────────────────────────────────
async function gerarListaContratoPDF({ titulo, lista, nomeCredor }) {
  const mg = getMargens()
  const M  = mg.left, UW = 210 - mg.left - mg.right
  const mTop = mg.top, mBottom = mg.bottom

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const UWL = pageW - mg.left - mg.right

  await applyTimbradoToPage(doc, 0)
  let y = mTop + 4

  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text(safe(titulo), M, y); y += 7

  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}  |  Total: ${lista.length} contrato(s)`, M, y)
  doc.setTextColor(0)
  y += 5

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: mg.right, bottom: mBottom + 4 },
    head: [['Nº Contrato', 'Objeto', 'Credor', 'Secretaria', 'Modalidade', 'Valor', 'Início', 'Fim', 'Status']],
    body: lista.map(c => [
      safe(c.numero_contrato),
      safe(c.objeto),
      safe(nomeCredor(c.credor_id)),
      safe(c.secretaria),
      safe(c.modalidade),
      safe(fmtMoeda(parseVal(c.valor))),
      safe(fmtData(c.vigencia_inicio)),
      safe(fmtData(c.vigencia_fim)),
      safe(c.status),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 50 },
      2: { cellWidth: 38 },
      3: { cellWidth: 32 },
      4: { cellWidth: 22 },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 16, halign: 'center' },
    },
    didDrawPage: async (data) => {
      const pg = doc.internal.getCurrentPageInfo().pageNumber
      if (pg > 1) await applyTimbradoToPage(doc, pg - 1)
      doc.setFontSize(7); doc.setTextColor(160)
      doc.text(`Página ${pg}`, pageW - mg.right, pageH - mBottom + 2, { align: 'right' })
      doc.setTextColor(0)
    }
  })

  doc.save(`contratos_${titulo.toLowerCase().replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`)
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function ModalContratos({ titulo, lista, nomeCredor, diasAte, onClose }) {
  const [gerando, setGerando] = useState(false)

  const handlePDF = async () => {
    setGerando(true)
    try { await gerarListaContratoPDF({ titulo, lista, nomeCredor }) }
    finally { setGerando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-[2.5%]">
      <div className="bg-surface rounded-2xl shadow-2xl flex flex-col" style={{ width: '95%', height: '95%' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 bg-ink-900 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-info-400" />
            <h2 className="font-bold text-white text-base">{titulo}</h2>
            <span className="px-2 py-0.5 rounded-full bg-info-500/20 text-info-300 text-xs font-semibold">{lista.length} contrato(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePDF}
              disabled={gerando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-info-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Gerar PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {lista.length === 0 ? (
            <div className="flex items-center justify-center h-full text-ink-400 text-sm">Nenhum contrato nesta categoria</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500 whitespace-nowrap">Nº Contrato</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500">Objeto</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500">Credor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500 hidden lg:table-cell">Secretaria</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-500 hidden md:table-cell">Modalidade</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-ink-500">Valor</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-ink-500 whitespace-nowrap hidden sm:table-cell">Início</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-ink-500 whitespace-nowrap hidden sm:table-cell">Fim</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-ink-500">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-ink-500 hidden md:table-cell">Dias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {lista.map(c => {
                  const dias = diasAte(c.vigencia_fim)
                  return (
                    <tr key={c.id} className="hover:bg-ink-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-brand-600 dark:text-info-400 whitespace-nowrap">{c.numero_contrato || '—'}</td>
                      <td className="py-3 px-4 text-ink-700 max-w-[220px]">
                        <span className="line-clamp-2 text-xs leading-tight">{c.objeto || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-ink-900 dark:text-white font-medium max-w-[160px] truncate">{nomeCredor(c.credor_id)}</td>
                      <td className="py-3 px-4 text-ink-500 hidden lg:table-cell text-xs max-w-[140px] truncate">{c.secretaria || '—'}</td>
                      <td className="py-3 px-4 text-ink-500 hidden md:table-cell text-xs whitespace-nowrap">{c.modalidade || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-ink-900 dark:text-white whitespace-nowrap">{fmtMoeda(parseVal(c.valor))}</td>
                      <td className="py-3 px-4 text-center text-ink-500 hidden sm:table-cell whitespace-nowrap text-xs">{fmtData(c.vigencia_inicio)}</td>
                      <td className="py-3 px-4 text-center text-ink-500 hidden sm:table-cell whitespace-nowrap text-xs">{fmtData(c.vigencia_fim)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[c.status] || 'bg-ink-100 text-ink-600'}`}>{c.status || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-center hidden md:table-cell">
                        {dias !== null ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            dias < 0  ? 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400' :
                            dias <= 7 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                            dias <= 30? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' :
                                        'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                          }`}>
                            {dias < 0 ? `${Math.abs(dias)}d atrás` : dias === 0 ? 'Hoje' : `${dias}d`}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-ink-50 sticky bottom-0">
                <tr>
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-semibold text-ink-500">Total ({lista.length} contratos)</td>
                  <td className="py-2.5 px-4 text-right font-bold text-ink-900 dark:text-white whitespace-nowrap">
                    {fmtMoeda(lista.reduce((a, c) => a + parseVal(c.valor), 0))}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componentes internos ──────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, onClick }) => {
  const str = String(value); const sz = Math.min(1.4, Math.max(0.85, 1.4 - 0.07 * (str.length - 7))) + 'rem'
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-ink-100 rounded-2xl p-4 flex flex-col gap-2 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-info-300 dark:hover:border-brand-600 active:scale-95' : 'hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          <Icon className="w-[18px] h-[18px] text-white" />
        </div>
        {onClick && <span className="text-[10px] text-info-500 dark:text-info-400 font-medium">ver lista →</span>}
      </div>
      <div>
        <p className="font-black tabular-nums text-ink-900 dark:text-white leading-tight truncate" style={{ fontSize: sz }}>{value}</p>
        <p className="text-xs text-ink-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

const DashCardR = ({ icon: Icon, title, badge, children }) => (
  <div className="bg-surface border border-ink-100 rounded-2xl overflow-hidden shadow-sm">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-ink-100 bg-ink-50/70">
      {Icon && <Icon className="w-4 h-4 text-info-500" />}
      <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      {badge && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">{badge}</span>}
    </div>
    <div className="p-5">{children}</div>
  </div>
)

const BarRowR = ({ label, value, extra, pct, bar }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-medium text-ink-700 truncate max-w-[55%]" title={label}>{label}</span>
      <div className="flex items-center gap-2 shrink-0 ml-1">
        {extra && <span className="text-xs text-ink-400 hidden sm:block">{extra}</span>}
        <span className="text-sm font-bold text-ink-900 dark:text-white whitespace-nowrap">{value}</span>
      </div>
    </div>
    <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
      <div className={`h-2 ${bar} rounded-full transition-all duration-700`} style={{ width: Math.min(100, pct) + '%' }} />
    </div>
  </div>
)

// ── Componente principal ──────────────────────────────────────────────────────
function TabRelatorios() {
  const [contratos, setContratos] = useState([])
  const [credores,  setCredores]  = useState([])
  const [ordens,    setOrdens]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal, setModal]         = useState(null) // { titulo, lista }

  useEffect(() => {
    Promise.all([
      api.get('/contratos'),
      api.get('/contratos/credores'),
      api.get('/contratos/ordens').catch(() => ({ data: [] })),
    ])
      .then(([cr, cc, or]) => {
        setContratos(cr.data || [])
        setCredores(cc.data || [])
        setOrdens(or.data || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const nomeCredor = id => credores.find(c => c.id === id)?.razao_social || '—'
  const diasAte = d => {
    if (!d) return null
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const fim  = new Date(d + 'T00:00:00'); fim.setHours(0, 0, 0, 0)
    return Math.ceil((fim - hoje) / 86400000)
  }

  if (loading) return <LoadingBar label="Carregando relatórios..." />

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

  // ── Dados de Ordens ──────────────────────────────────────────────────────────
  const ordensAtivas  = ordens.filter(o => o.status !== 'CANCELADA')
  const ordTotal      = ordens.length
  const ordCompras    = ordens.filter(o => o.tipo === 'COMPRA').length
  const ordServicos   = ordens.filter(o => o.tipo === 'SERVICO').length
  const ordEmitidas   = ordens.filter(o => o.status === 'EMITIDA').length
  const ordAtendidas  = ordens.filter(o => o.status === 'ATENDIDA').length
  const ordCanceladas = ordens.filter(o => o.status === 'CANCELADA').length
  const ordValorTotal = ordensAtivas.reduce((a, o) => a + parseVal(o.valor_total), 0)
  const taxaExecucao  = totalVal > 0 ? Math.min(100, (ordValorTotal / totalVal) * 100).toFixed(1) : '0.0'

  const mapOrdSec = {}
  ordensAtivas.forEach(o => {
    const s = o.secretaria || 'Não informada'
    if (!mapOrdSec[s]) mapOrdSec[s] = { qtd: 0, valor: 0 }
    mapOrdSec[s].qtd++; mapOrdSec[s].valor += parseVal(o.valor_total)
  })
  const ordSecList   = Object.entries(mapOrdSec).sort((a, b) => b[1].valor - a[1].valor).slice(0, 6)
  const maxOrdSecVal = ordSecList[0]?.[1]?.valor || 1

  const mapOrdCont = {}
  ordensAtivas.forEach(o => {
    const num = o.contrato?.numero_contrato || `Contrato #${o.contrato_id}`
    if (!mapOrdCont[num]) mapOrdCont[num] = { qtd: 0, valor: 0 }
    mapOrdCont[num].qtd++; mapOrdCont[num].valor += parseVal(o.valor_total)
  })
  const ordContList   = Object.entries(mapOrdCont).sort((a, b) => b[1].valor - a[1].valor).slice(0, 8)
  const maxOrdContVal = ordContList[0]?.[1]?.valor || 1

  const abrirModal = (titulo, lista) => setModal({ titulo, lista })

  return (
    <div className="space-y-4">
      {/* Modal */}
      {modal && (
        <ModalContratos
          titulo={modal.titulo}
          lista={modal.lista}
          nomeCredor={nomeCredor}
          diasAte={diasAte}
          onClose={() => setModal(null)}
        />
      )}

      {/* KPIs — os 4 primeiros são clicáveis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={FileText}      label="Total Contratos"  value={String(contratos.length)}  color="from-info-500 to-indigo-600"    onClick={() => abrirModal('Todos os Contratos', contratos)} />
        <KpiCard icon={CheckCircle2}  label="Ativos"           value={String(ativos.length)}      color="from-success-500 to-emerald-600"  onClick={() => abrirModal('Contratos Ativos', ativos)} />
        <KpiCard icon={AlertTriangle} label="Vencendo (30d)"   value={String(vencendo.length)}    color="from-warning-400 to-orange-500"  onClick={() => abrirModal('Vencendo em 30 dias', vencendo)} />
        <KpiCard icon={XCircle}       label="Vencidos"         value={String(vencidos.length)}    color="from-danger-500 to-danger-600"       onClick={() => abrirModal('Contratos Vencidos', vencidos)} />
        <KpiCard icon={DollarSign}    label="Valor Total"      value={fmtMoeda(totalVal)}         color="from-info-600 to-indigo-700" />
        <KpiCard icon={TrendingUp}    label="Valor Ativo"      value={fmtMoeda(ativoVal)}         color="from-teal-500 to-cyan-600" />
      </div>

      {/* Alertas de vigência */}
      {(vencendo.length > 0 || vencidos.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vencendo.length > 0 && (
            <div className="bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0" />
                <span className="text-sm font-semibold text-warning-800 dark:text-warning-300">{vencendo.length} contrato(s) vencendo em 30 dias</span>
              </div>
              <div className="space-y-1.5">
                {vencendo.slice(0, 4).map(c => {
                  const d = diasAte(c.vigencia_fim)
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-brand-600 dark:text-info-400 w-24 shrink-0 truncate">{c.numero_contrato}</span>
                      <span className="text-ink-600 flex-1 truncate">{nomeCredor(c.credor_id)}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full shrink-0 ${d === 0 ? 'bg-danger-100 text-danger-600' : d <= 7 ? 'bg-orange-100 text-orange-600' : 'bg-warning-100 text-warning-700'}`}>{d === 0 ? 'Hoje' : `${d}d`}</span>
                    </div>
                  )
                })}
                {vencendo.length > 4 && <p className="text-xs text-warning-600 mt-1">+ {vencendo.length - 4} outros</p>}
              </div>
            </div>
          )}
          {vencidos.length > 0 && (
            <div className="bg-danger-50 dark:bg-danger-900/10 border border-danger-200 dark:border-danger-800/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-danger-600 shrink-0" />
                <span className="text-sm font-semibold text-danger-800 dark:text-danger-300">{vencidos.length} contrato(s) com prazo expirado</span>
              </div>
              <div className="space-y-1.5">
                {vencidos.slice(0, 4).map(c => {
                  const d = diasAte(c.vigencia_fim)
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-brand-600 dark:text-info-400 w-24 shrink-0 truncate">{c.numero_contrato}</span>
                      <span className="text-ink-600 flex-1 truncate">{nomeCredor(c.credor_id)}</span>
                      <span className="font-bold px-2 py-0.5 rounded-full shrink-0 bg-danger-100 text-danger-600">{Math.abs(d)}d atrás</span>
                    </div>
                  )
                })}
                {vencidos.length > 4 && <p className="text-xs text-danger-600 mt-1">+ {vencidos.length - 4} outros</p>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashCardR icon={Tag} title="Por Modalidade" badge={`${modList.length} tipos`}>
          {modList.length === 0 ? <p className="text-sm text-ink-400 text-center py-6">Sem dados</p> : (
            <div className="space-y-3">
              {modList.map(([label, v], i) => (
                <BarRowR key={label} label={label} value={fmtMoeda(v.valor)} extra={`${v.qtd} contrato(s)`} pct={(v.valor / maxModVal) * 100} bar={CORES[i % CORES.length]} />
              ))}
            </div>
          )}
        </DashCardR>

        <DashCardR icon={Activity} title="Por Status">
          {statusList.length === 0 ? <p className="text-sm text-ink-400 text-center py-6">Sem dados</p> : (
            <div className="space-y-3">
              {statusList.map(([status, v]) => {
                const pct = contratos.length > 0 ? (v.qtd / contratos.length) * 100 : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[status] || 'bg-ink-100 text-ink-600'}`}>{status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-400">{Math.round(pct)}%</span>
                        <span className="text-sm font-bold text-ink-900 dark:text-white">{v.qtd}</span>
                        <span className="text-xs text-ink-400 hidden sm:block">{fmtMoeda(v.valor)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                      <div className={`h-2 ${STATUS_BAR[status] || 'bg-ink-400'} rounded-full transition-all`} style={{ width: Math.min(100, (v.qtd / maxStatusQtd) * 100) + '%' }} />
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
          {topCred.length === 0 ? <p className="text-sm text-ink-400 text-center py-6">Sem dados</p> : (
            <div className="space-y-3">
              {topCred.map(([nome, v], i) => (
                <div key={nome} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-ink-400 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-ink-800 truncate max-w-[55%]" title={nome}>{nome}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-1">
                        <span className="text-xs text-ink-400">{v.qtd}</span>
                        <span className="text-sm font-bold text-ink-900 dark:text-white whitespace-nowrap">{fmtMoeda(v.valor)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div className="h-1.5 bg-info-500 rounded-full" style={{ width: Math.min(100, (v.valor / maxCredVal) * 100) + '%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashCardR>

        <DashCardR icon={Building2} title="Top Secretarias por Valor">
          {secList.length <= 1 ? <p className="text-sm text-ink-400 text-center py-6">Secretarias não informadas nos contratos</p> : (
            <div className="space-y-3">
              {secList.map(([nome, v], i) => (
                <BarRowR key={nome} label={nome} value={fmtMoeda(v.valor)} extra={`${v.qtd} contrato(s)`} pct={(v.valor / maxSecVal) * 100} bar={CORES[i % CORES.length]} />
              ))}
            </div>
          )}
        </DashCardR>
      </div>

      {/* ─── Ordens de Compra / Serviço ──────────────────────────────────────── */}
      <div className="bg-surface border border-ink-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-ink-100 bg-ink-50/70">
          <ClipboardList className="w-4 h-4 text-info-500" />
          <h3 className="text-sm font-semibold text-ink-800">Ordens de Compra / Serviço</h3>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">{ordTotal} ordens</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={ClipboardList} label="Total Ordens"  value={String(ordTotal)}       color="from-ink-500 to-ink-600" />
            <KpiCard icon={ShoppingCart}  label="Ordens Compra" value={String(ordCompras)}      color="from-info-500 to-indigo-600" />
            <KpiCard icon={Wrench}        label="Ordens Serviço" value={String(ordServicos)}    color="from-orange-500 to-amber-600" />
            <KpiCard icon={AlertTriangle} label="Emitidas"      value={String(ordEmitidas)}     color="from-warning-400 to-orange-500" />
            <KpiCard icon={CheckCircle2}  label="Atendidas"     value={String(ordAtendidas)}    color="from-success-500 to-emerald-600" />
            <KpiCard icon={DollarSign}    label="Valor Emitido" value={fmtMoeda(ordValorTotal)} color="from-teal-500 to-cyan-600" />
          </div>

          {totalVal > 0 && (
            <div className="bg-info-50 dark:bg-info-900/10 border border-info-100 dark:border-info-800/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-info-800 dark:text-info-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Taxa de execução (valor emitido / valor total dos contratos)
                </span>
                <span className="text-sm font-black text-brand-700 dark:text-info-300">{taxaExecucao}%</span>
              </div>
              <div className="h-2.5 bg-info-100 dark:bg-info-900/30 rounded-full overflow-hidden">
                <div className="h-2.5 bg-info-500 rounded-full transition-all duration-700" style={{ width: taxaExecucao + '%' }} />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-brand-600 dark:text-info-400">
                <span>Emitido: {fmtMoeda(ordValorTotal)}</span>
                <span>Total contratos: {fmtMoeda(totalVal)}</span>
              </div>
            </div>
          )}

          {ordTotal === 0 ? (
            <p className="text-sm text-ink-400 text-center py-4">Nenhuma ordem cadastrada</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">Status das Ordens</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'EMITIDA',   value: ordEmitidas,   bar: 'bg-warning-400', badge: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' },
                    { label: 'ATENDIDA',  value: ordAtendidas,  bar: 'bg-success-500',  badge: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' },
                    { label: 'CANCELADA', value: ordCanceladas, bar: 'bg-danger-500',    badge: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' },
                  ].map(item => {
                    const pct = ordTotal > 0 ? (item.value / ordTotal) * 100 : 0
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${item.badge}`}>{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-400">{Math.round(pct)}%</span>
                            <span className="text-sm font-bold text-ink-900 dark:text-white">{item.value}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                          <div className={`h-2 ${item.bar} rounded-full transition-all`} style={{ width: Math.min(100, (item.value / (ordTotal > 0 ? ordTotal : 1)) * 100) + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">Tipo de Ordem</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'COMPRA',  value: ordCompras,  icon: ShoppingCart, bar: 'bg-info-500',   bg: 'bg-info-50 dark:bg-info-900/10'   },
                    { label: 'SERVIÇO', value: ordServicos, icon: Wrench,       bar: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/10' },
                  ].map(item => {
                    const pct = ordTotal > 0 ? (item.value / ordTotal) * 100 : 0
                    return (
                      <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl ${item.bg}`}>
                        <item.icon className="w-5 h-5 text-ink-500 shrink-0" />
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold text-ink-700">{item.label}</span>
                            <span className="text-sm font-bold text-ink-900 dark:text-white">{item.value} <span className="text-xs text-ink-400">({Math.round(pct)}%)</span></span>
                          </div>
                          <div className="h-2 bg-surface/60 rounded-full overflow-hidden">
                            <div className={`h-2 ${item.bar} rounded-full`} style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {ordContList.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">Contratos com Maior Volume de Ordens</p>
              <div className="space-y-2.5">
                {ordContList.map(([label, v], i) => (
                  <BarRowR key={label} label={label} value={fmtMoeda(v.valor)} extra={`${v.qtd} ordem(ns)`} pct={(v.valor / maxOrdContVal) * 100} bar={CORES[i % CORES.length]} />
                ))}
              </div>
            </div>
          )}

          {ordSecList.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">Ordens por Secretaria</p>
              <div className="space-y-2.5">
                {ordSecList.map(([label, v], i) => (
                  <BarRowR key={label} label={label} value={fmtMoeda(v.valor)} extra={`${v.qtd} ordem(ns)`} pct={(v.valor / maxOrdSecVal) * 100} bar={CORES[(i + 3) % CORES.length]} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TabRelatorios
