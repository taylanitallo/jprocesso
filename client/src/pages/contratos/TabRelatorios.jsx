import { useState, useEffect, useMemo } from 'react'
import {
  FileText, CheckCircle2, AlertTriangle, XCircle, DollarSign,
  TrendingUp, Building2, Award, Tag, Activity, Loader2,
  ClipboardList, ShoppingCart, Wrench,
} from 'lucide-react'
import api from '../../services/api'
import LoadingBar from '../../components/LoadingBar'

function TabRelatorios() {
  const [contratos, setContratos] = useState([])
  const [credores,  setCredores]  = useState([])
  const [ordens,    setOrdens]    = useState([])
  const [loading,   setLoading]   = useState(true)

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

  const fmtMoeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(String(v ?? '').replace(',', '.')) || 0)
  const parseVal  = v => parseFloat(String(v ?? '').replace(',', '.')) || 0
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

  const STATUS_BAR   = { ATIVO: 'bg-green-500', ENCERRADO: 'bg-gray-400', SUSPENSO: 'bg-amber-500', RESCINDIDO: 'bg-red-500' }
  const STATUS_BADGE = { ATIVO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', ENCERRADO: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400', SUSPENSO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', RESCINDIDO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  const CORES = ['bg-blue-500','bg-purple-500','bg-teal-500','bg-indigo-500','bg-cyan-500','bg-violet-500','bg-sky-500','bg-fuchsia-500']

  // ── Dados de Ordens ────────────────────────────────────────────────────────
  const ordensAtivas = ordens.filter(o => o.status !== 'CANCELADA')
  const ordTotal     = ordens.length
  const ordCompras   = ordens.filter(o => o.tipo === 'COMPRA').length
  const ordServicos  = ordens.filter(o => o.tipo === 'SERVICO').length
  const ordEmitidas  = ordens.filter(o => o.status === 'EMITIDA').length
  const ordAtendidas = ordens.filter(o => o.status === 'ATENDIDA').length
  const ordCanceladas= ordens.filter(o => o.status === 'CANCELADA').length
  const ordValorTotal= ordensAtivas.reduce((a, o) => a + parseVal(o.valor_total), 0)
  const taxaExecucao = totalVal > 0 ? Math.min(100, (ordValorTotal / totalVal) * 100).toFixed(1) : '0.0'

  const mapOrdSec = {}
  ordensAtivas.forEach(o => {
    const s = o.secretaria || 'Não informada'
    if (!mapOrdSec[s]) mapOrdSec[s] = { qtd: 0, valor: 0 }
    mapOrdSec[s].qtd++; mapOrdSec[s].valor += parseVal(o.valor_total)
  })
  const ordSecList = Object.entries(mapOrdSec).sort((a, b) => b[1].valor - a[1].valor).slice(0, 6)
  const maxOrdSecVal = ordSecList[0]?.[1]?.valor || 1

  const mapOrdCont = {}
  ordensAtivas.forEach(o => {
    const num = o.contrato?.numero_contrato || `Contrato #${o.contrato_id}`
    if (!mapOrdCont[num]) mapOrdCont[num] = { qtd: 0, valor: 0 }
    mapOrdCont[num].qtd++; mapOrdCont[num].valor += parseVal(o.valor_total)
  })
  const ordContList    = Object.entries(mapOrdCont).sort((a, b) => b[1].valor - a[1].valor).slice(0, 8)
  const maxOrdContVal  = ordContList[0]?.[1]?.valor || 1

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

      {/* ─── Ordens de Compra / Serviço ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/70 dark:bg-slate-800/30">
          <ClipboardList className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Ordens de Compra / Serviço</h3>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-gray-500">{ordTotal} ordens</span>
        </div>
        <div className="p-5 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={ClipboardList} label="Total Ordens"     value={String(ordTotal)}          color="from-slate-500 to-slate-600" />
            <KpiCard icon={ShoppingCart}  label="Ordens Compra"    value={String(ordCompras)}         color="from-blue-500 to-indigo-600" />
            <KpiCard icon={Wrench}        label="Ordens Serviço"   value={String(ordServicos)}        color="from-orange-500 to-amber-600" />
            <KpiCard icon={AlertTriangle} label="Emitidas"         value={String(ordEmitidas)}        color="from-yellow-400 to-orange-500" />
            <KpiCard icon={CheckCircle2}  label="Atendidas"        value={String(ordAtendidas)}       color="from-green-500 to-emerald-600" />
            <KpiCard icon={DollarSign}    label="Valor Emitido"    value={fmtMoeda(ordValorTotal)}    color="from-teal-500 to-cyan-600" />
          </div>

          {/* Taxa de execução */}
          {totalVal > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Taxa de execução (valor emitido / valor total dos contratos)
                </span>
                <span className="text-sm font-black text-blue-700 dark:text-blue-300">{taxaExecucao}%</span>
              </div>
              <div className="h-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                <div className="h-2.5 bg-blue-500 rounded-full transition-all duration-700" style={{ width: taxaExecucao + '%' }} />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-blue-600 dark:text-blue-400">
                <span>Emitido: {fmtMoeda(ordValorTotal)}</span>
                <span>Total contratos: {fmtMoeda(totalVal)}</span>
              </div>
            </div>
          )}

          {ordTotal === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma ordem cadastrada</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Por status */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Status das Ordens</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'EMITIDA',   value: ordEmitidas,   bar: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
                    { label: 'ATENDIDA',  value: ordAtendidas,  bar: 'bg-green-500',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                    { label: 'CANCELADA', value: ordCanceladas, bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                  ].map(item => {
                    const pct = ordTotal > 0 ? (item.value / ordTotal) * 100 : 0
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${item.badge}`}>{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                          <div className={`h-2 ${item.bar} rounded-full transition-all`} style={{ width: Math.min(100, (item.value / (ordTotal > 0 ? ordTotal : 1)) * 100) + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Por tipo */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Tipo de Ordem</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'COMPRA',  value: ordCompras,  icon: ShoppingCart, bar: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/10'   },
                    { label: 'SERVIÇO', value: ordServicos, icon: Wrench,       bar: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/10' },
                  ].map(item => {
                    const pct = ordTotal > 0 ? (item.value / ordTotal) * 100 : 0
                    return (
                      <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl ${item.bg}`}>
                        <item.icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{item.label}</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value} <span className="text-xs text-gray-400">({Math.round(pct)}%)</span></span>
                          </div>
                          <div className="h-2 bg-white/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
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

          {/* Top contratos com mais ordens */}
          {ordContList.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Contratos com Maior Volume de Ordens</p>
              <div className="space-y-2.5">
                {ordContList.map(([label, v], i) => (
                  <BarRowR key={label} label={label} value={fmtMoeda(v.valor)} extra={`${v.qtd} ordem(ns)`} pct={(v.valor / maxOrdContVal) * 100} bar={CORES[i % CORES.length]} />
                ))}
              </div>
            </div>
          )}

          {/* Por secretaria (ordens) */}
          {ordSecList.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Ordens por Secretaria</p>
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

// ══════════════════════════════════════════════════════════════════════════════
//  PÁGINA CONTRATOS
// ══════════════════════════════════════════════════════════════════════════════

export default TabRelatorios
