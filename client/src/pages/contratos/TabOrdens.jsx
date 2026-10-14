import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, ShoppingCart, Wrench, Plus, Pencil, Trash2, Eye,
  Search, X, AlertTriangle, CheckCircle2, XCircle,
  PackageOpen, RefreshCw, FileText, Printer,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../services/api'
import BotaoExcluidos from '../../components/lixeira/BotaoExcluidos'
import LoadingBar from '../../components/LoadingBar'
import { useAuth } from '../../context/AuthContext'
import { salvarDocumentoGerado } from '../../utils/salvarDocumentoGerado'
import { setPDFLoading } from '../../utils/pdfLoadingStore'
import { applyTimbradoToPage } from '../../utils/timbradoStore'
import { getMargens } from '../../utils/margensStore'
import {
  SectionCard, PremiumInput, PremiumTextarea,
} from './ContratosShared'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBRL = (v) => {
  const n = parseFloat(v || 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

// ── Modal de Seleção de Contrato ──────────────────────────────────────────────
function SelecionarContratoModal({ contratos, tipoOrdem, onSelect, onClose }) {
  const [filtros, setFiltros] = useState({ q: '', credorQ: '', modalidade: '', vigencia: '' })
  const [saldos, setSaldos] = useState({}) // { [contrato_id]: saldoInfo }
  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))

  const hoje = new Date()

  // Pré-filtra contratos elegíveis e carrega saldos em lote
  const elegíveis = contratos.filter(c => {
    if (c.status !== 'ATIVO') return false
    if (c.tipo_objeto) {
      if (tipoOrdem === 'COMPRA'  && c.tipo_objeto !== 'Material') return false
      if (tipoOrdem === 'SERVICO' && c.tipo_objeto !== 'Serviço')  return false
    }
    return true
  })

  useEffect(() => {
    // Carrega saldos dos contratos elegíveis em paralelo (máx 20)
    const ids = elegíveis.slice(0, 20).map(c => c.id)
    Promise.all(ids.map(id =>
      api.get(`/contratos/ordens/saldo/${id}`).then(r => ({ id, data: r.data })).catch(() => null)
    )).then(results => {
      const map = {}
      results.forEach(r => { if (r) map[r.id] = r.data })
      setSaldos(map)
    })
  }, [])

  const calcDiasVigencia = (fim) => {
    if (!fim) return null
    return Math.floor((new Date(fim + 'T00:00:00') - hoje) / 86400000)
  }

  const modalidades = [...new Set(elegíveis.map(c => c.modalidade).filter(Boolean))].sort()

  const filtrados = elegíveis.filter(c => {
    if (filtros.modalidade && c.modalidade !== filtros.modalidade) return false
    if (filtros.vigencia) {
      const dias = calcDiasVigencia(c.vigencia_fim)
      if (filtros.vigencia === 'vigente'  && (dias === null || dias < 0)) return false
      if (filtros.vigencia === 'vencendo' && (dias === null || dias < 0 || dias > 30)) return false
      if (filtros.vigencia === 'vencido'  && (dias === null || dias >= 0)) return false
    }
    const q = filtros.q.toLowerCase()
    if (q && !(
      (c.numero_contrato || '').toLowerCase().includes(q) ||
      (c.objeto          || '').toLowerCase().includes(q)
    )) return false
    const qc = filtros.credorQ.toLowerCase()
    if (qc && !(c.credor?.razao_social || '').toLowerCase().includes(qc)) return false
    return true
  })

  const vigenciaInfo = (c) => {
    const dias = calcDiasVigencia(c.vigencia_fim)
    if (dias === null) return null
    if (dias < 0)   return { cor: 'text-danger-500',    bg: 'bg-danger-50 dark:bg-danger-900/20',     texto: 'Vencido',       icone: '🔴' }
    if (dias <= 30) return { cor: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',  texto: `Vence em ${dias}d`, icone: '🟡' }
    return           { cor: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', texto: `${dias}d restantes`, icone: '🟢' }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxWidth: '920px', maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between bg-ink-900 px-5 py-3.5 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-white/80" />
            <span className="text-sm font-semibold text-white">Selecionar Contrato</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              tipoOrdem === 'COMPRA' ? 'bg-info-500/30 text-info-200' : 'bg-amber-500/30 text-amber-200'
            }`}>
              {tipoOrdem === 'COMPRA' ? '🛒 Materiais' : '🔧 Serviços'}
            </span>
            <span className="text-[10px] text-white/40">{filtrados.length} resultado(s)</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-surface/10 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-4 py-3 shrink-0 border-b border-ink-100 bg-ink-50">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-400" />
              <input autoFocus value={filtros.q} onChange={e => setF('q', e.target.value)}
                placeholder="Nº contrato ou objeto..." className="input-field pl-7 text-xs w-full" />
            </div>
            <div className="col-span-3">
              <input value={filtros.credorQ} onChange={e => setF('credorQ', e.target.value)}
                placeholder="Buscar credor..." className="input-field text-xs w-full" />
            </div>
            <div className="col-span-2">
              <select value={filtros.modalidade} onChange={e => setF('modalidade', e.target.value)} className="input-field text-xs w-full">
                <option value="">Todas modalidades</option>
                {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <select value={filtros.vigencia} onChange={e => setF('vigencia', e.target.value)} className="input-field text-xs w-full">
                <option value="">Toda vigência</option>
                <option value="vigente">Vigentes</option>
                <option value="vencendo">Vencendo em 30d</option>
                <option value="vencido">Vencidos</option>
              </select>
            </div>
            <div className="col-span-1 flex items-center justify-end">
              <button onClick={() => setFiltros({ q: '', credorQ: '', modalidade: '', vigencia: '' })}
                className="text-xs text-ink-400 hover:text-ink-600 underline whitespace-nowrap">Limpar</button>
            </div>
          </div>
        </div>

        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-ink-100/70 border-b border-ink-200 shrink-0 text-[10px] font-bold text-ink-400 uppercase tracking-wide">
          <div className="col-span-2">Nº Contrato</div>
          <div className="col-span-3">Objeto / Credor</div>
          <div className="col-span-2">Modalidade</div>
          <div className="col-span-2 text-right">Valor Total</div>
          <div className="col-span-2 text-right">Saldo Disponível</div>
          <div className="col-span-1 text-center">Vigência</div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-ink-100">
          {filtrados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-ink-400">
              <FileText className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum contrato encontrado</p>
            </div>
          )}
          {filtrados.map(c => {
            const vig    = vigenciaInfo(c)
            const saldo  = saldos[c.id]
            const saldoV = saldo?.saldo ?? null
            const pct    = saldo?.percentual_usado ?? null

            return (
              <button key={c.id} onClick={() => onSelect(c)}
                className="w-full text-left grid grid-cols-12 gap-2 px-4 py-3 hover:bg-info-50 dark:hover:bg-info-900/20 transition-colors items-center group">

                {/* Nº + tipo */}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-brand-600 dark:text-info-400 group-hover:underline">{c.numero_contrato}</p>
                  {c.tipo_objeto && (
                    <span className="text-[9px] px-1 py-0.5 rounded-sm bg-ink-100 text-ink-500 mt-0.5 inline-block">{c.tipo_objeto}</span>
                  )}
                </div>

                {/* Objeto / Credor */}
                <div className="col-span-3 min-w-0">
                  <p className="text-xs text-ink-800 line-clamp-2 leading-tight">{c.objeto}</p>
                  {c.credor?.razao_social && (
                    <p className="text-[10px] text-ink-400 truncate mt-0.5">{c.credor.razao_social}</p>
                  )}
                </div>

                {/* Modalidade */}
                <div className="col-span-2">
                  <p className="text-[10px] text-ink-500 leading-tight">{c.modalidade || '—'}</p>
                </div>

                {/* Valor total */}
                <div className="col-span-2 text-right">
                  <p className="text-xs font-bold text-ink-800 whitespace-nowrap">{fmtBRL(c.valor)}</p>
                </div>

                {/* Saldo disponível */}
                <div className="col-span-2 text-right">
                  {saldo ? (
                    <div>
                      <p className={`text-xs font-bold whitespace-nowrap ${
                        saldo.sem_saldo ? 'text-danger-600' : saldo.alerta_baixo ? 'text-amber-600' : 'text-emerald-600'
                      }`}>{fmtBRL(saldoV)}</p>
                      {/* Barra de uso */}
                      <div className="w-full h-1.5 bg-ink-200 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          saldo.sem_saldo ? 'bg-danger-500' : saldo.alerta_baixo ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} style={{ width: `${Math.min(100, pct || 0)}%` }} />
                      </div>
                      <p className="text-[9px] text-ink-400 mt-0.5">{(pct || 0).toFixed(0)}% utilizado</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-ink-400">...</p>
                  )}
                </div>

                {/* Vigência */}
                <div className="col-span-1 text-center">
                  {vig ? (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full block text-center ${vig.bg} ${vig.cor}`}>
                      {vig.texto}
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-400">—</span>
                  )}
                  {c.vigencia_fim && (
                    <p className="text-[9px] text-ink-400 mt-0.5">{fmtData(c.vigencia_fim)}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-ink-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-ink-400">Clique em um contrato para selecioná-lo</span>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de Seleção de Item do Contrato ──────────────────────────────────────
function SelecionarItemModal({ contrato_id, itensBase = [], onSelect, onClose }) {
  const [uso, setUso] = useState({})  // { [vinculo_id]: { qtd_usada, qtd_disponivel, percentual_uso, esgotado } }
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [itemQtd, setItemQtd] = useState(null) // item aguardando confirmação de quantidade
  const [qtd, setQtd] = useState('')

  useEffect(() => {
    // Busca dados de uso via endpoint; mesmo se falhar, mostra os itens base
    api.get(`/contratos/ordens/itens-contrato/${contrato_id}`)
      .then(r => {
        const map = {}
        r.data.forEach(it => { map[it.id] = it })
        setUso(map)
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [contrato_id])

  // Monta itens unindo base + dados de uso
  const itens = itensBase.map(v => {
    const u = uso[v.id] || {}
    const qtd_contratada = parseFloat(v.quantidade || 0)
    const qtd_usada      = u.qtd_usada      ?? 0
    const qtd_disponivel = u.qtd_disponivel ?? qtd_contratada
    const percentual_uso = u.percentual_uso ?? (qtd_contratada > 0 ? Math.min(100, (qtd_usada / qtd_contratada) * 100) : 0)
    return {
      id:            v.id,
      item_id:       v.item_id,
      descricao:     v.descricao || '',
      unidade:       v.unidade   || '',
      lote:          v.lote      || '',
      codigo_item:   v.codigo_item || '',
      valor_unitario: parseFloat(v.valor_unitario || 0),
      qtd_contratada,
      qtd_usada,
      qtd_disponivel,
      percentual_uso,
      esgotado:      qtd_disponivel <= 0,
    }
  })

  const filtrados = itens.filter(it =>
    !busca || it.descricao.toLowerCase().includes(busca.toLowerCase())
  )

  const abrirQtd = (it) => { setItemQtd(it); setQtd('1') }
  const qtdNum = parseFloat(String(qtd).replace(',', '.')) || 0
  const qtdInvalida = itemQtd && (qtdNum <= 0 || qtdNum > itemQtd.qtd_disponivel)

  const confirmarQtd = () => {
    if (qtdInvalida) return
    onSelect({ ...itemQtd, quantidade: qtdNum })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxWidth: '680px', maxHeight: '82vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between bg-ink-900 px-5 py-3.5 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <PackageOpen className="w-4 h-4 text-white/80" />
            <span className="text-sm font-semibold text-white">
              {itemQtd ? 'Informe a Quantidade' : 'Itens do Contrato'}
            </span>
            {!carregando && !itemQtd && (
              <span className="text-[10px] text-white/40">{filtrados.length} item(ns)</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-surface/10 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {itemQtd ? (
          <>
            {/* Tela de confirmação de quantidade */}
            <div className="px-5 py-5 flex-1 overflow-y-auto">
              <p className="text-sm font-medium text-ink-800 leading-tight">{itemQtd.descricao}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {itemQtd.lote && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-ink-100 text-ink-500 font-medium">
                    Lote {itemQtd.lote}
                  </span>
                )}
                <span className="text-[10px] text-ink-500">{itemQtd.unidade || '—'}</span>
                <span className="text-[10px] text-ink-500">{fmtBRL(itemQtd.valor_unitario)}/un.</span>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {itemQtd.qtd_disponivel % 1 === 0 ? itemQtd.qtd_disponivel : itemQtd.qtd_disponivel.toFixed(2)} disponível
                </span>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-ink-600 mb-1 block">Quantidade</label>
                <MaskedInput value={qtd} onChange={setQtd} placeholder="0,00"
                  className="input-field text-sm w-full font-mono" />
                {qtdInvalida && (
                  <p className="text-[11px] text-danger-500 mt-1.5">
                    {qtdNum <= 0 ? 'Informe uma quantidade maior que zero.' : `Quantidade maior que o disponível (${itemQtd.qtd_disponivel}).`}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-ink-100 flex items-center justify-between shrink-0">
              <button onClick={() => setItemQtd(null)} className="px-3 py-1.5 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-50">
                Voltar
              </button>
              <button onClick={confirmarQtd} disabled={qtdInvalida}
                className="px-3 py-1.5 text-xs rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold">
                Adicionar à Ordem
              </button>
            </div>
          </>
        ) : (
        <>
        {/* Busca */}
        <div className="px-4 py-3 border-b border-ink-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
            <input
              autoFocus value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por descrição..."
              className="input-field pl-9 text-xs w-full"
            />
          </div>
        </div>

        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-ink-50 border-b border-ink-200 shrink-0 text-[10px] font-bold text-ink-400 uppercase tracking-wide">
          <div className="col-span-5">Descrição</div>
          <div className="col-span-1 text-center">Unid.</div>
          <div className="col-span-2 text-right">V. Unit.</div>
          <div className="col-span-4">Consumo</div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-ink-100">
          {carregando && filtrados.length === 0 && (
            <LoadingBar label="Carregando dados de uso..." />
          )}
          {!carregando && filtrados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-ink-400">
              <PackageOpen className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum item encontrado</p>
              {itens.length === 0 && (
                <p className="text-xs text-ink-400 mt-1">Este contrato não possui itens vinculados</p>
              )}
            </div>
          )}
          {filtrados.map((it, idx) => {
            const pct = it.percentual_uso
            const cor = it.esgotado ? 'bg-danger-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
            const corTexto = it.esgotado ? 'text-danger-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'

            return (
              <button key={idx}
                onClick={() => !it.esgotado && abrirQtd(it)}
                disabled={it.esgotado}
                className={`w-full text-left grid grid-cols-12 gap-2 px-4 py-3 transition-colors items-center
                  ${it.esgotado
                    ? 'opacity-50 cursor-not-allowed bg-ink-50'
                    : 'hover:bg-info-50 dark:hover:bg-info-900/20 group'
                  }`}
              >
                {/* Descrição */}
                <div className="col-span-5 min-w-0">
                  <p className={`text-xs font-medium leading-tight line-clamp-2 ${it.esgotado ? 'text-ink-400' : 'text-ink-800 group-hover:text-brand-700 dark:group-hover:text-info-300'}`}>
                    {it.descricao}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {it.lote && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-ink-100 text-ink-500 font-medium">
                        Lote {it.lote}
                      </span>
                    )}
                    {it.esgotado && (
                      <span className="text-[9px] text-danger-500 font-semibold">ESGOTADO</span>
                    )}
                  </div>
                </div>

                {/* Unidade */}
                <div className="col-span-1 text-center">
                  <span className="text-[10px] text-ink-500">{it.unidade || '—'}</span>
                </div>

                {/* Valor unitário */}
                <div className="col-span-2 text-right">
                  <span className="text-xs text-ink-700 font-medium">{fmtBRL(it.valor_unitario)}</span>
                </div>

                {/* Consumo visual */}
                <div className="col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold ${corTexto}`}>
                      {it.qtd_usada % 1 === 0 ? it.qtd_usada : it.qtd_usada.toFixed(2)}
                      <span className="text-ink-400 font-normal">/{it.qtd_contratada % 1 === 0 ? it.qtd_contratada : it.qtd_contratada.toFixed(2)}</span>
                    </span>
                    <span className={`text-[9px] font-semibold ${corTexto}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[9px] text-ink-400 mt-0.5">
                    {it.qtd_disponivel % 1 === 0 ? it.qtd_disponivel : it.qtd_disponivel.toFixed(2)} disponível
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-ink-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-ink-400">Clique no item para informar a quantidade</span>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-50">
            Fechar
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  )
}

// ── Barra de Saldo ─────────────────────────────────────────────────────────────
function SaldoBar({ saldo }) {
  if (!saldo) return null
  const pct = Math.min(100, saldo.percentual_usado || 0)
  const livre = 100 - pct
  const cor = saldo.sem_saldo
    ? 'bg-danger-500'
    : saldo.alerta_baixo
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  return (
    <div className="rounded-xl border border-ink-200 p-3 bg-surface flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-700">Saldo do Contrato</span>
        <span className={`font-bold ${saldo.sem_saldo ? 'text-danger-600' : saldo.alerta_baixo ? 'text-amber-600' : 'text-emerald-600'}`}>
          {fmtBRL(saldo.saldo)} disponível
        </span>
      </div>
      <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-ink-400">
        <span>Usado: {fmtBRL(saldo.total_usado)}</span>
        <span>Total: {fmtBRL(saldo.valor_contrato)}</span>
      </div>
      {saldo.sem_saldo && (
        <div className="flex items-center gap-1.5 text-xs text-danger-600 font-semibold">
          <XCircle className="w-3.5 h-3.5" /> Saldo esgotado — emissão bloqueada
        </div>
      )}
      {!saldo.sem_saldo && saldo.alerta_baixo && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" /> Saldo abaixo de 10% — atenção!
        </div>
      )}
    </div>
  )
}

// ── Linha de Item da Ordem ─────────────────────────────────────────────────────
// Helpers de máscara
const parsePtBR = (v) => parseFloat((v || '0').replace(/\./g, '').replace(',', '.')) || 0
const fmtQtd   = (v) => {
  const n = parseFloat(v || 0)
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}
const fmtVUnit  = (v) => {
  const n = parseFloat(v || 0)
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const stripMask = (v) => v.replace(/[^0-9,]/g, '').replace(',', '.')

function MaskedInput({ value, onChange, placeholder, prefix = '', className = '' }) {
  const [display, setDisplay] = useState(() => {
    const n = parsePtBR(String(value))
    if (!n) return ''
    return prefix
      ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  })
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (focused) return
    const n = parsePtBR(String(value))
    if (!n) { setDisplay(''); return }
    setDisplay(prefix
      ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    )
  }, [value, focused])

  return (
    <input
      value={display}
      placeholder={focused ? '' : placeholder}
      className={className}
      onFocus={() => { setFocused(true); setDisplay(String(value || '')) }}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9.,]/g, '')
        setDisplay(raw)
        const num = parseFloat(raw.replace(',', '.')) || 0
        onChange(num)
      }}
      onBlur={() => {
        setFocused(false)
        const n = parsePtBR(display)
        onChange(n)
        setDisplay(n
          ? prefix
            ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
          : ''
        )
      }}
    />
  )
}

function ItemRow({ item, idx, onChange, onRemove, onConfirm, onEdit, editing, readonly, catalogoItens }) {
  const vTotal = Math.round(parseFloat(item.valor_unitario || 0) * parseFloat(item.quantidade || 0) * 100) / 100
  const isEditing = !readonly && editing

  return (
    <div className={`grid grid-cols-12 gap-2 items-center py-1.5 border-b border-ink-100 ${isEditing ? 'bg-info-50/40 dark:bg-info-900/10' : ''}`}>
      <div className="col-span-3">
        {isEditing ? (
          <>
            <input
              list={`catalogo-list-${idx}`}
              value={item.descricao}
              onChange={e => onChange(idx, 'descricao', e.target.value)}
              placeholder="Descrição do item"
              className="input-field text-xs w-full"
            />
            <datalist id={`catalogo-list-${idx}`}>
              {catalogoItens.map(c => (
                <option key={c.id} value={c.descricao} data-id={c.id} />
              ))}
            </datalist>
          </>
        ) : (
          <p className="text-xs text-ink-800 truncate px-1">{item.descricao || '—'}</p>
        )}
      </div>
      <div className="col-span-2">
        {isEditing
          ? <input value={item.unidade} onChange={e => onChange(idx, 'unidade', e.target.value)}
              placeholder="Unidade" className="input-field text-xs w-full text-center" />
          : <p className="text-xs text-center text-ink-600">{item.unidade || '—'}</p>
        }
      </div>
      <div className="col-span-2">
        {isEditing
          ? <MaskedInput value={item.quantidade} onChange={v => onChange(idx, 'quantidade', v)}
              placeholder="0,00" className="input-field text-xs w-full text-center font-mono" />
          : <p className="text-xs text-right font-mono text-ink-700 px-1">{fmtQtd(item.quantidade)}</p>
        }
      </div>
      <div className="col-span-2">
        {/* V. Unitário: sempre somente leitura — vem do catálogo/contrato */}
        <p className="text-xs text-right font-mono text-ink-700 px-1">{fmtVUnit(item.valor_unitario)}</p>
      </div>
      <div className="col-span-2">
        <p className="text-xs text-right font-mono font-semibold text-ink-700 px-1">
          {vTotal > 0 ? fmtVUnit(vTotal) : '—'}
        </p>
      </div>
      <div className="col-span-1 flex items-center justify-end gap-0.5">
        {!readonly && (
          isEditing ? (
            <>
              <button title="Confirmar" onClick={() => onConfirm(idx)}
                className="p-1 rounded-sm hover:bg-success-100 dark:hover:bg-success-900/30 text-success-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button title="Excluir" onClick={() => onRemove(idx)}
                className="p-1 rounded-sm hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button title="Editar" onClick={() => onEdit(idx)}
                className="p-1 rounded-sm hover:bg-info-100 dark:hover:bg-info-900/30 text-info-500">
                <Pencil className="w-3 h-3" />
              </button>
              <button title="Excluir" onClick={() => onRemove(idx)}
                className="p-1 rounded-sm hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )
        )}
      </div>
    </div>
  )
}

// ── Modal de Ordem ─────────────────────────────────────────────────────────────
function OrdemModal({ modo, ordem, contratos, catalogoItens, onSave, onClose }) {
  const readonly = modo === 'visualizar'

  const FORM_VAZIO = {
    tipo: '',
    destino_did: '',
    contrato_id: '',
    data_emissao: new Date().toISOString().slice(0, 10),
    data_entrega_prevista: '',
    objeto: '',
    justificativa: '',
    secretaria: '',
    fiscal_responsavel: '',
    local_entrega: '',
    observacoes: '',
    status: 'EMITIDA',
  }

  const [form, setForm] = useState(() => ordem ? {
    tipo:                  ordem.tipo || '',
    destino_did:           ordem.destino_did || '',
    contrato_id:           ordem.contrato_id || '',
    data_emissao:          ordem.data_emissao || new Date().toISOString().slice(0, 10),
    data_entrega_prevista: ordem.data_entrega_prevista || '',
    objeto:                ordem.objeto || '',
    justificativa:         ordem.justificativa || '',
    secretaria:            ordem.secretaria || '',
    fiscal_responsavel:    ordem.fiscal_responsavel || '',
    local_entrega:         ordem.local_entrega || '',
    observacoes:           ordem.observacoes || '',
    status:                ordem.status || 'EMITIDA',
  } : FORM_VAZIO)

  const [itens, setItens] = useState(() => {
    if (!ordem?.itens) return []
    const contratoItens = contratos.find(c => String(c.id) === String(ordem.contrato_id))?.itens || []
    return ordem.itens.map(it => {
      const vinculo = contratoItens.find(v => String(v.id) === String(it.item_id) || String(v.item_id) === String(it.item_id))
      return {
        id: it.id,
        item_id: it.item_id || '',
        lote: it.lote || vinculo?.lote || '',
        codigo_item: it.codigo_item || vinculo?.codigo_item || '',
        descricao: it.descricao || '',
        unidade: it.unidade || '',
        quantidade: it.quantidade || 1,
        valor_unitario: it.valor_unitario || 0,
      }
    })
  })

  const [buscaContrato, setBuscaContrato] = useState('')
  const [modalContrato, setModalContrato] = useState(false)
  const [modalItens, setModalItens] = useState(false)
  const [saldo, setSaldo] = useState(null)
  const [carregandoSaldo, setCarregandoSaldo] = useState(false)
  const [secretarias, setSecretarias] = useState([])

  // Carrega secretarias para resolver sigla → nome
  useEffect(() => {
    api.get('/organizacao/secretarias').then(r => setSecretarias(r.data.secretarias || [])).catch(() => {})
  }, [])

  // Quando secretarias carregam, resolve sigla → nome no campo secretaria
  useEffect(() => {
    if (secretarias.length === 0) return
    if (!form.secretaria) return
    const nome = resolverNomeSecretaria(form.secretaria)
    if (nome !== form.secretaria) set('secretaria', nome)
  }, [secretarias])

  const resolverNomeSecretaria = (valor) => {
    if (!valor) return ''
    const match = secretarias.find(s => s.sigla === valor || s.nome === valor)
    return match ? match.nome : valor
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Carrega saldo quando contrato é selecionado
  useEffect(() => {
    if (!form.contrato_id) { setSaldo(null); return }
    setCarregandoSaldo(true)
    api.get(`/contratos/ordens/saldo/${form.contrato_id}`)
      .then(r => setSaldo(r.data))
      .catch(() => setSaldo(null))
      .finally(() => setCarregandoSaldo(false))
  }, [form.contrato_id])

  const [editingIdxs, setEditingIdxs] = useState(() => {
    // novos itens (sem id) entram em modo edição; itens carregados ficam em view
    const s = new Set()
    if (!ordem?.itens?.length) return s
    return s
  })

  const valorTotal = itens.reduce((acc, it) => {
    return acc + Math.round(parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 1) * 100) / 100
  }, 0)

  const addItem = () => {
    setItens(p => {
      const next = [...p, { item_id: '', descricao: '', unidade: '', quantidade: 1, valor_unitario: 0 }]
      setEditingIdxs(s => { const n = new Set(s); n.add(next.length - 1); return n })
      return next
    })
  }
  const removeItem = (idx) => {
    setItens(p => p.filter((_, i) => i !== idx))
    setEditingIdxs(s => {
      const n = new Set()
      s.forEach(i => { if (i < idx) n.add(i); else if (i > idx) n.add(i - 1) })
      return n
    })
  }
  const confirmItem = (idx) => setEditingIdxs(s => { const n = new Set(s); n.delete(idx); return n })
  const startEditItem = (idx) => setEditingIdxs(s => { const n = new Set(s); n.add(idx); return n })
  const changeItem = (idx, k, v) => {
    setItens(p => {
      const arr = [...p]
      arr[idx] = { ...arr[idx], [k]: v }
      // Autocomplete do catálogo
      if (k === 'descricao') {
        const found = catalogoItens.find(c => c.descricao === v)
        if (found) {
          arr[idx].item_id = found.id
          arr[idx].unidade = found.unidade_medida || ''
          if (!arr[idx].valor_unitario) arr[idx].valor_unitario = found.valor_unitario || 0
        }
      }
      return arr
    })
  }

  // ── Campos obrigatórios: lista o que falta e destaca no formulário ──
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const camposFaltando = () => {
    const f = []
    if (!form.tipo) f.push({ campo: 'tipo', label: 'Tipo de ordem' })
    if (form.tipo === 'SERVICO' && !form.destino_did) f.push({ campo: 'destino_did', label: 'Destino da ordem (Conta Fixa ou Conta Variável)' })
    if (!form.contrato_id) f.push({ campo: 'contrato_id', label: 'Contrato' })
    if (!form.data_emissao) f.push({ campo: 'data_emissao', label: 'Data de emissão' })
    if (!form.data_entrega_prevista) f.push({ campo: 'data_entrega_prevista', label: form.tipo === 'SERVICO' ? 'Data de conclusão prevista' : 'Data de entrega prevista' })
    if (!form.objeto.trim()) f.push({ campo: 'objeto', label: 'Objeto / descrição' })
    if (itens.length === 0) f.push({ campo: 'itens', label: 'Ao menos um item' })
    else if (itens.some(it => !String(it.descricao || '').trim())) f.push({ campo: 'itens', label: 'Descrição de todos os itens' })
    return f
  }
  const faltando = tentouSalvar ? camposFaltando() : []
  const temErro = (campo) => faltando.some(f => f.campo === campo)
  const clsErro = (campo) => temErro(campo) ? 'border-danger-400 ring-2 ring-danger-200 dark:ring-danger-900/40' : ''

  const salvar = () => {
    setTentouSalvar(true)
    if (camposFaltando().length > 0) return
    if (saldo?.sem_saldo)   { alert('Saldo insuficiente no contrato!'); return }
    // OC é sempre conta variável — não carrega destino
    const destino_did = form.tipo === 'SERVICO' ? form.destino_did : null
    onSave({ ...form, destino_did, itens, valor_total: valorTotal })
  }

  const contratoSel = contratos.find(c => String(c.id) === String(form.contrato_id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-ink-50 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: '90vw', maxHeight: '92vh', width: '760px' }}>

        {/* Header */}
        <div className="bg-surface border-b border-ink-100 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
                form.tipo === 'COMPRA'
                  ? 'bg-gradient-to-br from-info-500 to-indigo-600'
                  : form.tipo === 'SERVICO'
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                    : 'bg-gradient-to-br from-ink-500 to-ink-600'
              }`}>
                {form.tipo === 'SERVICO'
                  ? <Wrench className="w-5 h-5 text-white" />
                  : <ShoppingCart className="w-5 h-5 text-white" />
                }
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-900 dark:text-white">
                  {readonly ? 'Detalhes da Ordem' : modo === 'novo' ? 'Nova Ordem' : `Editar — ${ordem?.numero}`}
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  {readonly ? ordem?.numero : 'Preencha os dados da ordem de compra/serviço'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Tipo de Ordem */}
          <SectionCard icon={ClipboardList} title="Tipo de Ordem" subtitle="Selecione o tipo antes de preencher os demais campos">
            {readonly
              ? <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink-800">
                    {form.tipo === 'COMPRA' ? '🛒 Ordem de Compra' : '🔧 Ordem de Serviço'}
                  </p>
                  {form.tipo === 'SERVICO' && (
                    <p className="text-xs text-ink-500">
                      Destino: {form.destino_did === 'FIXA' ? 'DID Contas Fixas' : form.destino_did === 'VARIAVEL' ? 'DID Contas Variáveis' : 'Não definido (aparece nos dois DIDs)'}
                    </p>
                  )}
                </div>
              : (
                <div className="space-y-3">
                  <div className={`grid grid-cols-2 gap-3 rounded-xl ${temErro('tipo') ? 'ring-2 ring-danger-300 p-1' : ''}`}>
                    {[
                      { value: 'COMPRA',  label: 'Ordem de Compra',  icon: ShoppingCart, cor: 'blue'   },
                      { value: 'SERVICO', label: 'Ordem de Serviço', icon: Wrench,       cor: 'orange' },
                    ].map(({ value, label, icon: Icon, cor }) => (
                      <button
                        key={value}
                        onClick={() => set('tipo', value)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                          form.tipo === value
                            ? cor === 'blue'
                              ? 'border-brand-500 bg-info-50 dark:bg-info-900/20 text-brand-700 dark:text-info-300'
                              : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                            : 'border-ink-200 hover:border-ink-300 text-ink-600'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="font-semibold text-sm">{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Destino do DID — só para Ordem de Serviço (OC é sempre conta variável) */}
                  {form.tipo === 'SERVICO' && (
                    <div>
                      <p className="text-xs font-semibold text-ink-500 mb-1.5">
                        Destino da Ordem — em qual DID esta ordem vai aparecer?
                      </p>
                      <div className={`grid grid-cols-2 gap-3 rounded-xl ${temErro('destino_did') ? 'ring-2 ring-danger-300 p-1' : ''}`}>
                        {[
                          { value: 'FIXA',    label: 'Conta Fixa',     desc: 'DID Contas Fixas',     cor: 'purple' },
                          { value: 'VARIAVEL', label: 'Conta Variável', desc: 'DID Contas Variáveis', cor: 'emerald' },
                        ].map(({ value, label, desc, cor }) => (
                          <button
                            key={value}
                            onClick={() => set('destino_did', value)}
                            className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 transition-all text-left ${
                              form.destino_did === value
                                ? cor === 'purple'
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                  : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                : 'border-ink-200 hover:border-ink-300 text-ink-600'
                            }`}
                          >
                            <span className="font-semibold text-sm">{label}</span>
                            <span className="text-[10px] opacity-70">{desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </SectionCard>

          {/* Contrato */}
          {form.tipo && (
            <SectionCard icon={ClipboardList} title="Contrato" subtitle="Selecione o contrato vinculado">
              <div className="space-y-3">
                {readonly
                  ? <p className="text-sm font-medium text-ink-800">
                      {contratoSel ? `${contratoSel.numero_contrato} — ${contratoSel.objeto}` : '—'}
                    </p>
                  : (
                    <div className="space-y-2">
                      {/* Contrato selecionado */}
                      {form.contrato_id && contratoSel ? (
                        <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-700">
                          <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-info-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-brand-700 dark:text-info-300">{contratoSel.numero_contrato}</p>
                            <p className="text-xs text-brand-600 dark:text-info-400 truncate">{contratoSel.objeto}</p>
                            {contratoSel.credor?.razao_social && (
                              <p className="text-[10px] text-info-500 dark:text-info-500">{contratoSel.credor.razao_social}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-brand-700 dark:text-info-300">{fmtBRL(contratoSel.valor)}</p>
                            <button onClick={() => { set('contrato_id', ''); setSaldo(null) }}
                              className="text-[10px] text-info-400 hover:text-danger-500 mt-1 underline">
                              Trocar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setModalContrato(true)}
                          className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed ${temErro('contrato_id') ? 'border-danger-400 text-danger-600' : 'border-ink-300 text-ink-500'} hover:border-info-400 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-info-400 transition-colors text-sm`}>
                          <Search className="w-4 h-4" />
                          Clique para selecionar um contrato...
                        </button>
                      )}
                    </div>
                  )
                }
                {modalContrato && (
                  <SelecionarContratoModal
                    contratos={contratos}
                    tipoOrdem={form.tipo}
                    onSelect={c => {
                      set('contrato_id', c.id)
                      if (!form.secretaria && c.secretaria) set('secretaria', resolverNomeSecretaria(c.secretaria))
                      if (!form.fiscal_responsavel && c.fiscal) set('fiscal_responsavel', c.fiscal)
                      setModalContrato(false)
                    }}
                    onClose={() => setModalContrato(false)}
                  />
                )}
                {carregandoSaldo && (
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Calculando saldo...
                  </div>
                )}
                {saldo && <SaldoBar saldo={saldo} />}
              </div>
            </SectionCard>
          )}

          {/* Dados da Ordem */}
          {form.tipo && form.contrato_id && (
            <SectionCard icon={ClipboardList} title="Dados da Ordem" subtitle="Informações gerais">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-500 mb-1.5">Data de Emissão *</label>
                  {readonly
                    ? <p className="text-sm font-medium text-ink-800">{fmtData(form.data_emissao)}</p>
                    : <PremiumInput type="date" value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)} className={clsErro('data_emissao')} />
                  }
                  {temErro('data_emissao') && <p className="text-xs text-danger-600 mt-1">Informe a data de emissão.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-500 mb-1.5">
                    {form.tipo === 'COMPRA' ? 'Data de Entrega Prevista *' : 'Data de Conclusão Prevista *'}
                  </label>
                  {readonly
                    ? <p className="text-sm font-medium text-ink-800">{fmtData(form.data_entrega_prevista)}</p>
                    : <PremiumInput type="date" value={form.data_entrega_prevista} onChange={e => set('data_entrega_prevista', e.target.value)} className={clsErro('data_entrega_prevista')} />
                  }
                  {temErro('data_entrega_prevista') && (
                    <p className="text-xs text-danger-600 mt-1">Informe a data de {form.tipo === 'SERVICO' ? 'conclusão' : 'entrega'} prevista.</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink-500 mb-1.5">Objeto / Descrição *</label>
                  {readonly
                    ? <p className="text-sm font-medium text-ink-800">{form.objeto}</p>
                    : <PremiumTextarea value={form.objeto} onChange={e => set('objeto', e.target.value)} rows={2} placeholder="Descreva o objeto desta ordem..." className={clsErro('objeto')} />
                  }
                  {temErro('objeto') && <p className="text-xs text-danger-600 mt-1">Informe o objeto/descrição da ordem.</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink-500 mb-1.5">Justificativa</label>
                  {readonly
                    ? <p className="text-sm text-ink-700 whitespace-pre-wrap">{form.justificativa || '—'}</p>
                    : <PremiumTextarea value={form.justificativa} onChange={e => set('justificativa', e.target.value)} rows={2} placeholder="Justificativa para a aquisição/contratação..." />
                  }
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-500 mb-1.5">Secretaria</label>
                  {readonly
                    ? <p className="text-sm text-ink-700">{form.secretaria || '—'}</p>
                    : <PremiumInput value={form.secretaria} onChange={e => set('secretaria', e.target.value)} placeholder="Secretaria solicitante" />
                  }
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-500 mb-1.5">Fiscal / Responsável</label>
                  {readonly
                    ? <p className="text-sm text-ink-700">{form.fiscal_responsavel || '—'}</p>
                    : <PremiumInput value={form.fiscal_responsavel} onChange={e => set('fiscal_responsavel', e.target.value)} placeholder="Nome do fiscal" />
                  }
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink-500 mb-1.5">
                    {form.tipo === 'COMPRA' ? 'Local de Entrega' : 'Local de Execução'}
                  </label>
                  {readonly
                    ? <p className="text-sm text-ink-700">{form.local_entrega || '—'}</p>
                    : <PremiumInput value={form.local_entrega} onChange={e => set('local_entrega', e.target.value)} placeholder="Endereço / local" />
                  }
                </div>
              </div>
            </SectionCard>
          )}

          {/* Itens */}
          {form.tipo && form.contrato_id && (() => {
            // Agrupa itens por lote mantendo ordem de aparição
            const lotesOrdem = []
            const loteMap = {}
            itens.forEach((it, idx) => {
              const lote = it.lote || ''
              if (!loteMap[lote]) { loteMap[lote] = []; lotesOrdem.push(lote) }
              loteMap[lote].push({ it, idx })
            })
            const usarGrupos = lotesOrdem.length > 1

            const cabecalho = (
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-ink-400 uppercase tracking-widest pb-1 border-b border-ink-200">
                <div className="col-span-3">Descrição</div>
                <div className="col-span-2">Unidade</div>
                <div className="col-span-2 text-right">Qtd</div>
                <div className="col-span-2 text-right">V. Unitário</div>
                <div className="col-span-2 text-right">V. Total</div>
                <div className="col-span-1" />
              </div>
            )

            return (
              <SectionCard
                icon={PackageOpen}
                title="Itens"
                subtitle={`${itens.length} item(ns) — Total: ${fmtBRL(valorTotal)}`}
              >
                <div>
                  {itens.length === 0 && (
                    <p className="text-xs text-ink-400 text-center py-4">Nenhum item adicionado.</p>
                  )}

                  {usarGrupos
                    ? lotesOrdem.map(lote => {
                        const grupo = loteMap[lote]
                        const totalLote = grupo.reduce((acc, { it }) => {
                          return acc + Math.round(parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 0) * 100) / 100
                        }, 0)
                        return (
                          <div key={lote} className="mb-4">
                            {/* Sub-título do lote */}
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-brand-600 dark:text-info-400 uppercase tracking-wider px-2 py-0.5 bg-info-50 dark:bg-info-900/20 rounded-sm">
                                {lote ? `Lote ${lote}` : 'Sem Lote'}
                              </span>
                              <span className="text-[10px] text-ink-500 font-semibold">
                                Subtotal: {fmtBRL(totalLote)}
                              </span>
                            </div>
                            {cabecalho}
                            {grupo.map(({ it, idx }) => (
                              <ItemRow
                                key={idx} idx={idx} item={it}
                                onChange={changeItem} onRemove={removeItem}
                                onConfirm={confirmItem} onEdit={startEditItem}
                                editing={editingIdxs.has(idx)}
                                readonly={readonly} catalogoItens={catalogoItens}
                              />
                            ))}
                          </div>
                        )
                      })
                    : (
                      <>
                        {itens.length > 0 && cabecalho}
                        {itens.map((it, idx) => (
                          <ItemRow
                            key={idx} idx={idx} item={it}
                            onChange={changeItem} onRemove={removeItem}
                            onConfirm={confirmItem} onEdit={startEditItem}
                            editing={editingIdxs.has(idx)}
                            readonly={readonly} catalogoItens={catalogoItens}
                          />
                        ))}
                      </>
                    )
                  }

                  {!readonly && (
                    <div className="mt-3 flex items-center gap-3">
                      <button onClick={() => setModalItens(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors">
                        <Search className="w-3.5 h-3.5" /> Buscar item do contrato
                      </button>
                    </div>
                  )}
                  {itens.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-ink-200 text-right text-sm font-bold text-ink-800 dark:text-white">
                      Total: {fmtBRL(valorTotal)}
                    </div>
                  )}
                </div>
              </SectionCard>
            )
          })()}

          {modalItens && (
            <SelecionarItemModal
              contrato_id={form.contrato_id}
              itensBase={contratoSel?.itens || []}
              onSelect={item => {
                setItens(p => [...p, {
                  item_id: item.item_id || '',
                  lote: item.lote || '',
                  codigo_item: item.codigo_item || '',
                  descricao: item.descricao,
                  unidade: item.unidade,
                  quantidade: item.quantidade || 1,
                  valor_unitario: item.valor_unitario || 0,
                }])
                setModalItens(false)
              }}
              onClose={() => setModalItens(false)}
            />
          )}

          {/* Observações */}
          {form.tipo && form.contrato_id && (
            <SectionCard icon={ClipboardList} title="Observações" subtitle="Informações adicionais">
              {readonly
                ? <p className="text-sm text-ink-700 whitespace-pre-wrap">{form.observacoes || '—'}</p>
                : <PremiumTextarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} placeholder="Observações gerais..." />
              }
            </SectionCard>
          )}
        </div>

        {/* Aviso de campos obrigatórios */}
        {!readonly && faltando.length > 0 && (
          <div role="alert" className="mx-6 mb-3 shrink-0 flex items-start gap-3 px-4 py-3 rounded-xl border border-danger-200 dark:border-danger-700 bg-danger-50 dark:bg-danger-900/20">
            <AlertTriangle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-danger-700 dark:text-danger-300">
                Não foi possível salvar. Preencha {faltando.length === 1 ? 'o campo obrigatório' : `os ${faltando.length} campos obrigatórios`}:
              </p>
              <ul className="mt-1 text-xs text-danger-600 dark:text-danger-400 list-disc pl-4 space-y-0.5">
                {faltando.map(f => <li key={f.label}>{f.label}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-surface border-t border-ink-100 px-6 py-3 shrink-0 flex items-center justify-between">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 transition-colors">
            {readonly ? 'Fechar' : 'Cancelar'}
          </button>
          {!readonly && (
            <button onClick={salvar}
              disabled={saldo?.sem_saldo}
              className="px-6 py-2 text-sm rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-sm transition-colors">
              Salvar Ordem
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Gerador de PDF da Ordem ────────────────────────────────────────────────────
async function gerarPdf(ordemRaw, contratos = []) {
  setPDFLoading(true)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const mg = getMargens()
  const M  = mg.left
  const MR = mg.right
  const mTop = mg.top

  // Enriquece itens com lote do contrato quando não foi salvo no item da ordem
  const contratoItens = contratos.find(c => String(c.id) === String(ordemRaw.contrato_id))?.itens || []
  const itensEnriquecidos = (ordemRaw.itens || []).map(it => {
    const vinculo = contratoItens.find(v => String(v.id) === String(it.item_id) || String(v.item_id) === String(it.item_id))
    return {
      ...it,
      lote: it.lote || vinculo?.lote || '',
      codigo_item: it.codigo_item || vinculo?.codigo_item || '',
    }
  })
  const ordem = { ...ordemRaw, itens: itensEnriquecidos }

  const fmtD = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtV = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtN = (v) => {
    const n = parseFloat(v || 0)
    const s = n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    return s.replace(/,?0+$/, '').replace(/,$/, '')
  }

  const AZUL  = [30, 80, 160]
  const CINZA = [120, 120, 120]
  const CLARO = [245, 247, 250]

  // Timbrado de fundo (marca d'água por página)
  applyTimbradoToPage(doc)

  // Cabeçalho (sem faixa de fundo — respeita margens e timbrado)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...AZUL)
  const titulo = ordem.tipo === 'COMPRA' ? 'ORDEM DE COMPRA' : 'ORDEM DE SERVIÇO'
  doc.text(titulo, M, mTop + 2)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 70, 90)
  if (ordem.numero) doc.text(`N\u00ba ${ordem.numero}`, M, mTop + 9)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(ordem.status || '', W - MR, mTop + 9, { align: 'right' })
  doc.setDrawColor(...AZUL)
  doc.line(M, mTop + 12, W - MR, mTop + 12)

  // Contrato
  let y = mTop + 18
  const secTitle = (label) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...AZUL)
    doc.text(label, M, y)
    doc.setDrawColor(...AZUL)
    doc.line(M, y + 1, W - MR, y + 1)
    y += 5
  }

  secTitle('CONTRATO')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  const contrato = ordem.contrato
  if (contrato) {
    doc.setFont('helvetica', 'bold')
    doc.text(contrato.numero_contrato || '—', M, y)
    doc.setFont('helvetica', 'normal')
    const objLines = doc.splitTextToSize(contrato.objeto || '', W - M - MR - 38)
    doc.text(objLines, M + 36, y)
    y += Math.max(5, objLines.length * 4.5)
    if (contrato.credor?.razao_social) {
      doc.setTextColor(...CINZA)
      doc.setFontSize(8)
      doc.text(`Contratado: ${contrato.credor.razao_social}`, M, y)
      if (contrato.credor.cnpj_cpf) doc.text(`CNPJ/CPF: ${contrato.credor.cnpj_cpf}`, W - MR, y, { align: 'right' })
      y += 5
    }
  }

  // Dados
  y += 2
  secTitle('DADOS DA ORDEM')
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ['Data de Emiss\u00e3o', fmtD(ordem.data_emissao), 'Data Entrega/Conclus\u00e3o', fmtD(ordem.data_entrega_prevista)],
      ['Secretaria', ordem.secretaria || '—', 'Fiscal / Respons\u00e1vel', ordem.fiscal_responsavel || '—'],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: [30, 30, 30] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: CINZA, cellWidth: 45 },
      1: { cellWidth: 'auto' },
      2: { fontStyle: 'bold', textColor: CINZA, cellWidth: 45 },
      3: { cellWidth: 'auto' },
    },
    margin: { left: M, right: MR },
  })
  y = doc.lastAutoTable.finalY + 3

  const textField = (label, value) => {
    if (!value) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...CINZA)
    doc.text(`${label}:`, M, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    const lines = doc.splitTextToSize(value, W - M - MR - label.length * 2 - 4)
    doc.text(lines, M + label.length * 2 + 4, y)
    y += Math.max(5, lines.length * 4)
  }

  textField('Objeto', ordem.objeto || '—')
  textField('Justificativa', ordem.justificativa || '—')
  textField(ordem.tipo === 'COMPRA' ? 'Local de Entrega' : 'Local de Execu\u00e7\u00e3o', ordem.local_entrega)

  // Itens — agrupados por lote
  const itens = ordem.itens || []
  const totalGeral = itens.reduce((acc, it) => {
    return acc + Math.round(parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 0) * 100) / 100
  }, 0)

  // Agrupa mantendo ordem de aparição dos lotes
  const lotesOrdem = []
  const loteMap = {}
  itens.forEach(it => {
    const lote = it.lote || ''
    if (!loteMap[lote]) { loteMap[lote] = []; lotesOrdem.push(lote) }
    loteMap[lote].push(it)
  })

  const usarTablasSeparadas = lotesOrdem.length > 1

  y += 2
  secTitle('ITENS')

  let itemGlobalIdx = 0
  lotesOrdem.forEach((lote, loteIdx) => {
    const grupo = loteMap[lote]
    const totalLote = grupo.reduce((acc, it) => {
      return acc + Math.round(parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 0) * 100) / 100
    }, 0)

    if (usarTablasSeparadas) {
      // Sub-título do lote
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...AZUL)
      const loteLabel = lote ? `LOTE ${lote}` : 'SEM LOTE'
      doc.text(loteLabel, M, y)
      y += 4
    }

    autoTable(doc, {
      startY: y,
      head: [['Nº Item', 'Descri\u00e7\u00e3o', 'Unid.', 'Qtd.', 'V. Unit\u00e1rio', 'V. Total']],
      body: grupo.map((it) => {
        const tot = Math.round(parseFloat(it.valor_unitario || 0) * parseFloat(it.quantidade || 0) * 100) / 100
        itemGlobalIdx++
        return [it.codigo_item || itemGlobalIdx, it.descricao || '\u2014', it.unidade || '\u2014', fmtN(it.quantidade), fmtV(it.valor_unitario), fmtV(tot)]
      }),
      foot: usarTablasSeparadas
        ? [['', '', '', '', `Total Lote ${lote || (loteIdx + 1)}`, fmtV(totalLote)]]
        : [['', '', '', '', 'TOTAL', fmtV(totalGeral)]],
      theme: 'striped',
      headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: CLARO, textColor: [30, 30, 30], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: M, right: MR },
    })
    y = doc.lastAutoTable.finalY + (usarTablasSeparadas ? 5 : 6)
  })

  // Total geral quando há múltiplos lotes
  if (usarTablasSeparadas) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(`TOTAL GERAL: ${fmtV(totalGeral)}`, W - MR, y, { align: 'right' })
    y += 6
  }

  // Observações
  if (ordem.observacoes) {
    secTitle('OBSERVA\u00c7\u00d5ES')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(30, 30, 30)
    const obsLines = doc.splitTextToSize(ordem.observacoes, W - M - MR)
    doc.text(obsLines, M, y)
    y += obsLines.length * 4 + 4
  }

  // Assinaturas
  const pageH = doc.internal.pageSize.getHeight()
  const sigY = Math.max(y + 10, pageH - 38)
  const lineW = (W - M - MR) / 2 - 8
  const col2 = W / 2 + 8
  doc.setDrawColor(80, 80, 80)
  doc.line(M, sigY, M + lineW, sigY)
  doc.line(col2, sigY, col2 + lineW, sigY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...CINZA)
  doc.text('Ordenador de Despesa', M, sigY + 4)
  doc.text(ordem.fiscal_responsavel ? `Fiscal: ${ordem.fiscal_responsavel}` : 'Fiscal / Respons\u00e1vel', col2, sigY + 4)

  // Rodapé
  doc.setFontSize(6)
  doc.setTextColor(180, 180, 180)
  const agora = new Date().toLocaleString('pt-BR')
  doc.text(`Gerado em ${agora}`, M, pageH - 5)
  doc.text('P\u00e1gina 1', W - MR, pageH - 5, { align: 'right' })

  const nomeArqOrdem = `ordem_${(ordem.numero || 'sem_numero').replace(/\//g, '-')}.pdf`
  const blobOrdem = doc.output('blob')
  salvarDocumentoGerado(blobOrdem, { nome: nomeArqOrdem, tipoOrigem: 'ordem' })
  const urlOrdem = URL.createObjectURL(blobOrdem)
  const aOrdem = document.createElement('a')
  aOrdem.href = urlOrdem; aOrdem.download = nomeArqOrdem; aOrdem.click()
  setTimeout(() => URL.revokeObjectURL(urlOrdem), 10000)
  setPDFLoading(false)
}

// ── Modal Confirmar Cancelamento ───────────────────────────────────────────────
function ConfirmModal({ numero, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
        <XCircle className="w-12 h-12 text-danger-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-ink-900 dark:text-white mb-1">Cancelar Ordem?</h3>
        <p className="text-sm text-ink-500 mb-5">
          A ordem <strong>{numero}</strong> será marcada como cancelada e o saldo será devolvido ao contrato.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-ink-300 text-sm text-ink-600 hover:bg-ink-50">
            Não
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-danger-600 hover:bg-danger-700 text-white text-sm font-semibold">
            Sim, cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Confirmar Exclusão (somente admin, ordem já cancelada) ────────────────
function ConfirmExcluirModal({ numero, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
        <Trash2 className="w-12 h-12 text-danger-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-ink-900 dark:text-white mb-1">Excluir Ordem?</h3>
        <p className="text-sm text-ink-500 mb-5">
          A ordem <strong>{numero}</strong> sai da listagem e vai para os Excluídos, onde fica registrado quem excluiu e quando.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-ink-300 text-sm text-ink-600 hover:bg-ink-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-danger-600 hover:bg-danger-700 text-white text-sm font-semibold">
            Sim, excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab Principal ──────────────────────────────────────────────────────────────
function TabOrdens() {
  const { user } = useAuth()
  const isAdmin = user?.tipo === 'admin' || user?.tipo === 'jeos'
  const [ordens, setOrdens] = useState([])
  const [contratos, setContratos] = useState([])
  const [catalogoItens, setCatalogoItens] = useState([])
  const [loading, setLoading] = useState(false)

  const [filtros, setFiltros] = useState({ tipo: '', status: '', q: '', contrato_id: '' })
  const [selecionada, setSelecionada] = useState(null)
  const [modal, setModal] = useState(null) // 'novo' | 'editar' | 'visualizar' | 'cancelar'

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtros.tipo)        params.tipo = filtros.tipo
      if (filtros.status)      params.status = filtros.status
      if (filtros.q)           params.q = filtros.q
      if (filtros.contrato_id) params.contrato_id = filtros.contrato_id
      const r = await api.get('/contratos/ordens', { params })
      setOrdens(r.data)
    } catch { setOrdens([]) }
    setLoading(false)
  }, [filtros])

  useEffect(() => {
    carregar()
    api.get('/contratos', { params: { status: 'ATIVO' } }).then(r => setContratos(r.data)).catch(() => {})
    api.get('/contratos/itens', { params: { status: 'ATIVO' } }).then(r => setCatalogoItens(r.data)).catch(() => {})
  }, [])

  const ordemSel = ordens.find(o => o.id === selecionada)

  const salvar = async (dados) => {
    try {
      if (modal === 'novo') {
        await api.post('/contratos/ordens', dados)
      } else {
        await api.put(`/contratos/ordens/${ordemSel.id}`, dados)
      }
      setModal(null)
      setSelecionada(null)
      carregar()
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao salvar ordem'
      const saldoDisp = err.response?.data?.saldo_disponivel
      alert(saldoDisp != null
        ? `${msg}\nSaldo disponível: ${fmtBRL(saldoDisp)}`
        : msg
      )
    }
  }

  const cancelar = async () => {
    try {
      await api.delete(`/contratos/ordens/${ordemSel.id}`)
      setModal(null)
      setSelecionada(null)
      carregar()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cancelar ordem')
    }
  }

  const excluirDefinitivo = async () => {
    try {
      await api.delete(`/contratos/ordens/${ordemSel.id}/definitivo`)
      setModal(null)
      setSelecionada(null)
      carregar()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir ordem')
    }
  }

  const statusCor = (s) => {
    if (s === 'EMITIDA')   return 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-400'
    if (s === 'ATENDIDA')  return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
    if (s === 'CANCELADA') return 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
    return 'bg-ink-100 text-ink-600'
  }

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <div className="bg-surface rounded-2xl border border-ink-200 p-4 space-y-3">
        <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Opções para filtro</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-ink-500 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input value={filtros.q} onChange={e => setFiltros(p => ({ ...p, q: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && carregar()}
                placeholder="Nº da ordem ou objeto..." className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-ink-500 mb-1">Tipo</label>
            <select value={filtros.tipo} onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value }))} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="COMPRA">Compra</option>
              <option value="SERVICO">Serviço</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setFiltros(p => ({ ...p, status: e.target.value }))} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="EMITIDA">Emitida</option>
              <option value="ATENDIDA">Atendida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button onClick={() => { setFiltros({ tipo: '', status: '', q: '', contrato_id: '' }); setTimeout(carregar, 0) }}
              className="px-3 py-1.5 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-100 transition-colors">
              Limpar
            </button>
            <button onClick={carregar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors">
              <Search className="w-3.5 h-3.5" /> Pesquisar
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setSelecionada(null); setModal('novo') }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors">
          <Plus className="w-3.5 h-3.5" /> Incluir
        </button>
        <button onClick={() => ordemSel && setModal('editar')}
          disabled={!selecionada || ordemSel?.status === 'CANCELADA' || (ordemSel?.status === 'EMITIDA' && (ordemSel?.did_vinculado || ordemSel?.dataValues?.did_vinculado))}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-sm transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Alterar
        </button>
        <button onClick={() => ordemSel && ordemSel.status !== 'CANCELADA' && !(ordemSel.status === 'EMITIDA' && (ordemSel.did_vinculado || ordemSel.dataValues?.did_vinculado)) && setModal('cancelar')}
          disabled={!selecionada || ordemSel?.status === 'CANCELADA' || (ordemSel?.status === 'EMITIDA' && (ordemSel?.did_vinculado || ordemSel?.dataValues?.did_vinculado))}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-danger-600 hover:bg-danger-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-sm transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Cancelar
        </button>
        {isAdmin && (
          <button onClick={() => ordemSel && ordemSel.status === 'CANCELADA' && setModal('excluir')}
            disabled={!selecionada || ordemSel?.status !== 'CANCELADA'}
            title="Excluir (somente ordens já canceladas)"
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-danger-800 hover:bg-danger-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-sm transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        )}
        <button onClick={() => ordemSel && setModal('visualizar')}
          disabled={!selecionada}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-ink-600 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-sm transition-colors">
          <Eye className="w-3.5 h-3.5" /> Visualizar
        </button>
        <button onClick={() => ordemSel && gerarPdf(ordemSel, contratos)}
          disabled={!selecionada}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-sm transition-colors">
          <Printer className="w-3.5 h-3.5" /> Gerar PDF
        </button>
        <BotaoExcluidos entidade="ordens" compacto onAlterado={carregar} />
      </div>

      {/* Tabela */}
      <div className="bg-surface rounded-2xl border border-ink-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                {[
                  { label: 'Nº Ordem',  cls: 'text-left px-3 py-2.5 font-semibold w-28' },
                  { label: 'Tipo',      cls: 'text-left px-3 py-2.5 font-semibold w-24' },
                  { label: 'Contrato',  cls: 'text-left px-3 py-2.5 font-semibold' },
                  { label: 'Objeto',    cls: 'text-left px-3 py-2.5 font-semibold min-w-[200px]' },
                  { label: 'Emissão',   cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { label: 'Valor',     cls: 'text-right px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { label: 'Saldo',     cls: 'text-right px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { label: 'Status',    cls: 'text-center px-3 py-2.5 font-semibold' },
                ].map(({ label, cls }) => (
                  <th key={label} className={`${cls} text-ink-500 text-[11px] uppercase tracking-wide`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {loading && (
                <tr><td colSpan={8} className="text-center py-10 text-ink-400">
                  <LoadingBar label="Carregando ordens..." />
                </td></tr>
              )}
              {!loading && ordens.length === 0 && (
                <tr><td colSpan={8} className="text-center py-14 text-ink-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Nenhuma ordem encontrada
                </td></tr>
              )}
              {!loading && ordens.map(o => {
                const sel = o.id === selecionada
                const saldoInfo = o.dataValues?.saldo_info || o.saldo_info
                return (
                  <tr key={o.id}
                    onClick={() => setSelecionada(sel ? null : o.id)}
                    onDoubleClick={() => { setSelecionada(o.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-info-100 dark:bg-info-900/30 text-info-900 dark:text-info-100'
                        : 'hover:bg-ink-50 text-ink-700'
                    } ${o.status === 'CANCELADA' ? 'opacity-50 line-through' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono font-semibold text-brand-600 dark:text-info-400">{o.numero}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1 w-fit">
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit ${
                          o.tipo === 'COMPRA' ? 'bg-info-50 text-brand-700 dark:bg-info-900/20 dark:text-info-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>
                          {o.tipo === 'COMPRA' ? <ShoppingCart className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                          {o.tipo === 'COMPRA' ? 'Compra' : 'Serviço'}
                        </span>
                        {o.tipo === 'SERVICO' && o.destino_did && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md w-fit ${
                            o.destino_did === 'FIXA'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                          }`}>
                            {o.destino_did === 'FIXA' ? 'Fixa' : 'Variável'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{o.contrato?.numero_contrato || '—'}</td>
                    <td className="px-3 py-2 max-w-[220px] truncate">{o.objeto}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtData(o.data_emissao)}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmtBRL(o.valor_total)}</td>
                    <td className="px-3 py-2 text-right">
                      {saldoInfo ? (
                        <div className="text-right">
                          <p className={`text-[10px] font-bold ${saldoInfo.sem_saldo ? 'text-danger-600' : saldoInfo.alerta_baixo ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {fmtBRL(saldoInfo.saldo)}
                          </p>
                        </div>
                      ) : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCor(o.status)}`}>
                          {o.status}
                        </span>
                        {(o.dataValues?.did_vinculado || o.did_vinculado) && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 whitespace-nowrap">
                            Vinculada DID
                          </span>
                        )}
                        {(o.dataValues?.numero_processo_vinculado || o.numero_processo_vinculado) && (
                          <span className="text-[9px] text-ink-500 whitespace-nowrap font-medium">
                            Proc. {o.dataValues?.numero_processo_vinculado || o.numero_processo_vinculado}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Rodapé */}
        <div className="border-t border-ink-200 px-4 py-2 text-[11px] text-ink-400">
          {selecionada && ordemSel && (
            <span className="text-brand-600 dark:text-info-400 font-medium">✓ {ordemSel.numero}</span>
          )}
          <span className="float-right">
            {ordens.length} registro(s)
          </span>
        </div>
      </div>

      {/* Modais */}
      {(modal === 'novo' || modal === 'editar' || modal === 'visualizar') && (
        <OrdemModal
          modo={modal}
          ordem={modal === 'novo' ? null : ordemSel}
          contratos={contratos}
          catalogoItens={catalogoItens}
          onSave={salvar}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'cancelar' && (
        <ConfirmModal
          numero={ordemSel?.numero}
          onConfirm={cancelar}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'excluir' && (
        <ConfirmExcluirModal
          numero={ordemSel?.numero}
          onConfirm={excluirDefinitivo}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default TabOrdens
