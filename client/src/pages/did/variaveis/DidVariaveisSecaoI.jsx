import { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { FileText, Plus, Trash2, Search, X, Check, CheckCircle, Pencil, Loader2, ListPlus, Lock, ClipboardList, RotateCcw, Paperclip, ExternalLink } from 'lucide-react'
import { Field, Input, Textarea, SectionCard, DidReadOnlyContext, alertarPendencias } from '../didShared'
import { ConfirmModal } from '../../../components/ui'
import api from '../../../services/api'

// ─── Modal de seleção de Ordem de Compra disponível para DID ─────────────────
function ModalOrdemCompra({ onConfirm, onClose }) {
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/contratos/ordens/disponiveis-did', { params: { destino: 'variaveis' } })
      .then(r => setOrdens(Array.isArray(r.data) ? r.data : []))
      .catch(() => setOrdens([]))
      .finally(() => setLoading(false))
  }, [])

  const ordensFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return ordens
    return ordens.filter(o =>
      (o.numero || '').toLowerCase().includes(q) ||
      (o.objeto || '').toLowerCase().includes(q) ||
      (o.contrato?.numero_contrato || '').toLowerCase().includes(q) ||
      (o.contrato?.credor?.razao_social || '').toLowerCase().includes(q)
    )
  }, [ordens, busca])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between bg-ink-800 px-4 py-3 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-white">Ordens de Compra Disponíveis</span>
            <span className="text-xs text-ink-400 ml-1">· somente EMITIDAS e não vinculadas</span>
          </div>
          <button onClick={onClose} className="p-0.5 rounded-sm hover:bg-ink-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-ink-200 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por número, objeto, contrato ou credor..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-ink-200
                bg-surface text-ink-900
                outline-hidden focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-ink-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando ordens...</span>
            </div>
          ) : ordensFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-ink-400 px-6 text-center">
              <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">
                {busca ? 'Nenhuma ordem encontrada para a busca.' : 'Nenhuma ordem de compra disponível.'}
              </p>
              <p className="text-xs mt-1 text-ink-400">
                Apenas ordens com status EMITIDA e ainda não vinculadas a um DID são exibidas.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-ink-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-ink-500 w-28">Nº Ordem</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink-500 w-12">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-500 w-32">Contrato</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-500">Objeto / Credor</th>
                  <th className="px-3 py-2 text-right font-semibold text-ink-500 w-32">Valor Total</th>
                  <th className="px-3 py-2 text-right font-semibold text-ink-500 w-24">Emissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ordensFiltradas.map(o => (
                  <tr key={o.id} onClick={() => onConfirm(o)}
                    className="cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-bold text-orange-700 dark:text-orange-400">
                      {o.numero}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded-sm text-xs font-semibold ${
                        o.tipo === 'COMPRA'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                          : 'bg-info-100 text-brand-700 dark:bg-info-900/40 dark:text-info-300'
                      }`}>
                        {o.tipo === 'COMPRA' ? 'OC' : 'OS'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-ink-700">
                      {o.contrato?.numero_contrato || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <p className="truncate text-ink-700 font-medium">{o.objeto || '—'}</p>
                      {o.contrato?.credor?.razao_social && (
                        <p className="truncate text-ink-400 text-xs">{o.contrato.credor.razao_social}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-ink-800">
                      {parseFloat(o.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-500">
                      {o.data_emissao
                        ? new Date(o.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <span className="text-xs text-ink-400">
            {loading ? '…' : `${ordensFiltradas.length} ordem(ns) disponível(is)`}
          </span>
          <button onClick={onClose}
            className="ml-auto px-4 py-1.5 bg-ink-200 hover:bg-ink-300
              text-ink-700 rounded-sm text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de seleção de itens do contrato (com Saldo DID + Estoque Almoxarifado) ────
function ModalItensContrato({ contrato, itensDid, onConfirm, onClose, stockData = {}, almStockData = {}, loadingStock = false }) {
  const itensContrato = contrato?.itens?.filter(it => it.descricao) || []

  const [selecao, setSelecao] = useState(() =>
    itensContrato.map(it => {
      const existente = itensDid.find(d => d.descricao === it.descricao)
      return {
        ...it,
        selecionado: !!existente,
        qtd_did: existente?.quantidade || it.quantidade || '',
        valor_unit_did: existente?.valor_unitario || it.valor_unitario || '',
      }
    })
  )

  const toggle  = idx => setSelecao(p => p.map((it, i) => i === idx ? { ...it, selecionado: !it.selecionado } : it))
  const setQtd  = (idx, v) => setSelecao(p => p.map((it, i) => i === idx ? { ...it, qtd_did: v } : it))

  const totalSelecionado = selecao.filter(it => it.selecionado).reduce((acc, it) => {
    return acc + (parseFloat(it.qtd_did) || 0) * (parseFloat(it.valor_unit_did) || 0)
  }, 0)

  const temExcesso = selecao.some(it => {
    if (!it.selecionado) return false
    const key = (it.descricao || '').trim().toLowerCase()
    const qtdContrato = parseFloat(it.quantidade) || 0
    const qtdUsada = stockData[key]?.qtd_usada || 0
    const saldo = Math.max(0, qtdContrato - qtdUsada)
    return (parseFloat(it.qtd_did) || 0) > saldo
  })

  const confirmar = () => {
    const novosItens = selecao.filter(it => it.selecionado).map(it => {
      const q = parseFloat(it.qtd_did) || 0
      const u = parseFloat(it.valor_unit_did) || 0
      return {
        _id: Date.now() + Math.random(),
        descricao: it.descricao || '',
        unidade: it.unidade || '',
        quantidade: it.qtd_did,
        valor_unitario: it.valor_unit_did,
        valor_total: q && u ? (q * u).toFixed(2) : '',
      }
    })
    onConfirm(novosItens)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between bg-ink-800 px-4 py-3 rounded-t-xl shrink-0">
          <div>
            <span className="text-sm font-semibold text-white">Selecionar Itens para o DID</span>
            {contrato && <span className="ml-3 text-xs text-ink-400 font-mono">{contrato.numero_contrato} — {contrato.tipo_contrato}</span>}
          </div>
          <button onClick={onClose} className="p-0.5 rounded-sm hover:bg-ink-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {itensContrato.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-ink-400">
            <p className="text-sm font-medium">Nenhum item encontrado no contrato.</p>
            <p className="text-xs mt-1">Adicione itens ao contrato em Contratos antes de criar o DID.</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-info-50 dark:bg-info-900/20 border-b border-info-100 dark:border-info-800 text-xs text-brand-700 dark:text-info-300 shrink-0 flex items-center gap-2">
              <span><strong>Saldo DID</strong> = disponível no contrato · <strong>Estoque Alm.</strong> = estoque físico no almoxarifado</span>
              {loadingStock && <span className="ml-auto text-info-500 animate-pulse">Consultando...</span>}
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-ink-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2 text-left font-semibold text-ink-500">Descrição</th>
                    <th className="px-3 py-2 text-center font-semibold text-ink-500 w-16">Unid.</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-28">Vlr. Unit.</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-24" title="Disponível / Total contrato">Saldo DID</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-24">Estoque Alm.</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-24">Qtd. DID</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {selecao.map((it, idx) => {
                    const sub = (parseFloat(it.qtd_did) || 0) * (parseFloat(it.valor_unit_did) || 0)
                    const key = (it.descricao || '').trim().toLowerCase()
                    const qtdContrato = parseFloat(it.quantidade) || 0
                    const qtdUsada = stockData[key]?.qtd_usada || 0
                    const saldoDID = Math.max(0, qtdContrato - qtdUsada)
                    const qtdAtual = parseFloat(it.qtd_did) || 0
                    const excede = it.selecionado && qtdAtual > saldoDID
                    const almItem = almStockData[key]
                    const estoqueAlm = almItem != null ? parseFloat(almItem.estoque_atual) : null
                    return (
                      <tr key={idx} onClick={() => toggle(idx)}
                        className={`cursor-pointer transition-colors ${excede ? 'bg-danger-50 dark:bg-danger-900/10' : it.selecionado ? 'bg-info-50 dark:bg-info-900/20' : 'hover:bg-ink-50'}`}>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={it.selecionado} onChange={() => toggle(idx)}
                            className="w-4 h-4 accent-info-600 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 text-ink-800 font-medium">{it.descricao || '—'}</td>
                        <td className="px-3 py-2 text-center text-ink-500">{it.unidade || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-ink-600">
                          {it.valor_unit_did ? parseFloat(it.valor_unit_did).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {loadingStock ? (
                            <span className="text-ink-400">…</span>
                          ) : (
                            <>
                              <span className={`text-xs font-bold ${
                                saldoDID <= 0 ? 'text-danger-600 dark:text-danger-400'
                                : saldoDID < qtdContrato * 0.3 ? 'text-amber-600 dark:text-amber-400'
                                : 'text-success-600 dark:text-success-400'
                              }`}>{saldoDID}</span>
                              <span className="text-ink-400 text-xs"> / {qtdContrato}</span>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {loadingStock ? (
                            <span className="text-ink-400">…</span>
                          ) : estoqueAlm !== null ? (
                            <span className={`text-xs font-bold ${
                              estoqueAlm <= 0 ? 'text-danger-600 dark:text-danger-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>{estoqueAlm}</span>
                          ) : (
                            <span className="text-ink-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                          <input type="number" min="0" max={saldoDID} step="any" value={it.qtd_did}
                            onChange={e => { if (!it.selecionado) toggle(idx); setQtd(idx, e.target.value) }}
                            className={`w-full px-2 py-1 text-xs rounded-sm border text-right font-mono outline-hidden
                              ${excede
                                ? 'border-danger-400 bg-danger-50 dark:bg-danger-900/20 focus:ring-1 focus:ring-danger-500'
                                : it.selecionado ? 'border-info-300 dark:border-brand-600 bg-surface focus:ring-1 focus:ring-brand-500'
                                : 'border-ink-200 bg-ink-50 opacity-50'}`}
                            placeholder="0" />
                          {excede && <p className="text-xs text-danger-600 mt-0.5 text-right whitespace-nowrap">Máx: {saldoDID}</p>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold font-mono">
                          {sub > 0
                            ? <span className="text-brand-700 dark:text-info-400">{sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            : <span className="text-ink-400">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="border-t border-ink-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={confirmar} disabled={!selecao.some(it => it.selecionado) || temExcesso}
            title={temExcesso ? 'Corrija as quantidades acima do saldo antes de confirmar' : undefined}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-sm text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Check className="w-4 h-4" /> Confirmar Seleção
          </button>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-ink-200 hover:bg-ink-300 text-ink-700 rounded-sm text-sm font-semibold transition-colors">
            Cancelar
          </button>
          {temExcesso && (
            <span className="text-xs text-danger-600 dark:text-danger-400 font-semibold">
              ⚠ Item(ns) com quantidade acima do saldo disponível.
            </span>
          )}
          {totalSelecionado > 0 && !temExcesso && (
            <span className="ml-auto text-xs text-ink-500">
              {selecao.filter(it => it.selecionado).length} item(ns) · Total:{' '}
              <strong className="text-brand-700 dark:text-info-400">
                {totalSelecionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Seção I — Contas Variáveis ───────────────────────────────────────────────
export default function DidVariaveisSecaoI({
  form, set, inp,
  itensDid, setItensDid, removeItemDid, addItemDid, setItemDid,
  numeroDIDFmt,
  secretariasApi,
  secDidObj, responsaveisDid, dataRefDid,
  secretariaNome,
  didId,
  processoId,
  onSaveSecaoI,
  saving,
}) {
  const [contratos, setContratos] = useState([])
  const [credoresStorage, setCredoresStorage] = useState([])
  const [credoresOpts, setCredoresOpts] = useState([])
  const [buscandoCredores, setBuscandoCredores] = useState(false)

  // ── Estado da Ordem de Compra ─────────────────────────────────────────────
  const [ordemSel, setOrdemSel] = useState(null)
  const [modalOrdens, setModalOrdens] = useState(false)

  useEffect(() => {
    api.get('/contratos').then(r => setContratos(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    api.get('/contratos/credores').then(r => setCredoresStorage(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  // ── Autocomplete de Credor (server-side) ─────────────────────────────────
  const [credorSel,      setCredorSel]      = useState(null)
  const [buscaCredor,    setBuscaCredor]    = useState(form.credor_sec1 || '')
  const [dropdownCredor, setDropdownCredor] = useState(false)

  // Recupera credor do form salvo
  useEffect(() => {
    if (form.credor_sec1 && !credorSel) {
      const found = credoresStorage.find(c =>
        c.razao_social === form.credor_sec1 || c.cnpj_cpf === form.cnpj_cpf_credor_sec1
      )
      if (found) setCredorSel(found)
      else if (credoresStorage.length === 0)
        setCredorSel({ razao_social: form.credor_sec1, cnpj_cpf: form.cnpj_cpf_credor_sec1 })
    }
  }, [form.credor_sec1, credoresStorage])

  // Busca server-side com debounce 300ms
  useEffect(() => {
    if (credorSel || !dropdownCredor) return
    const q = buscaCredor.trim()
    if (!q) { setCredoresOpts(credoresStorage.slice(0, 12)); return }
    setBuscandoCredores(true)
    const timer = setTimeout(() => {
      api.get(`/contratos/credores?q=${encodeURIComponent(q)}`)
        .then(r => setCredoresOpts(Array.isArray(r.data) ? r.data.slice(0, 12) : []))
        .catch(() => setCredoresOpts([]))
        .finally(() => setBuscandoCredores(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [buscaCredor, dropdownCredor, credorSel, credoresStorage])

  const selecionarCredor = (credor) => {
    setCredorSel(credor)
    setBuscaCredor(credor.razao_social)
    setDropdownCredor(false)
    set('credor_sec1', credor.razao_social)
    set('cnpj_cpf_credor_sec1', credor.cnpj_cpf || '')
  }

  const limparCredor = () => {
    setCredorSel(null)
    setBuscaCredor('')
    set('credor_sec1', '')
    set('cnpj_cpf_credor_sec1', '')
  }

  // ── Contrato (opcional) ───────────────────────────────────────────────────
  const [contratoSel, setContratoSel] = useState(null)
  const [buscaContrato, setBuscaContrato] = useState('')
  const [dropdownContrato, setDropdownContrato] = useState(false)
  const [locked, setLocked] = useState(false)
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [modalItens, setModalItens] = useState(false)
  const [stockData, setStockData] = useState({})
  const [almStockData, setAlmStockData] = useState({})
  const [loadingStock, setLoadingStock] = useState(false)
  const [certUploading, setCertUploading] = useState({})
  const [confirmarRemoverCertidao, setConfirmarRemoverCertidao] = useState(null)
  const [confirmarLimparSecao, setConfirmarLimparSecao] = useState(false)
  const certFileRefs = useRef({})
  useEffect(() => { if (didId) setLocked(true) }, [didId])
  const readOnly = useContext(DidReadOnlyContext)

  const certArquivos = form.cert_sec1_arquivos || {}

  const uploadCertidao = async (certKey, file) => {
    if (!processoId || processoId === 'novo') { alert('Salve o DID antes de anexar arquivos.'); return }
    setCertUploading(p => ({ ...p, [certKey]: true }))
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post(
        `/did/processo/${processoId}/certidao/${certKey}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      set('cert_sec1_arquivos', data.cert_sec1_arquivos)
    } catch { alert('Erro ao fazer upload do arquivo.') }
    finally { setCertUploading(p => ({ ...p, [certKey]: false })) }
  }

  const verCertidao = async (certKey) => {
    try {
      const { data } = await api.get(`/did/processo/${processoId}/certidao/${certKey}/url`)
      window.open(data.url, '_blank')
    } catch { alert('Erro ao abrir arquivo.') }
  }

  const removerCertidao = async (certKey) => {
    try {
      const { data } = await api.delete(`/did/processo/${processoId}/certidao/${certKey}`)
      set('cert_sec1_arquivos', data.cert_sec1_arquivos)
      setConfirmarRemoverCertidao(null)
    } catch { alert('Erro ao remover arquivo.') }
  }

  // Quando há uma ordem de compra vinculada, credor/contrato/secretaria/secretário ficam bloqueados
  const ordemVinculada = !!(ordemSel || form.ordem_ref)

  useEffect(() => {
    if (form.contrato_ref && !contratoSel && contratos.length > 0) {
      const c = contratos.find(c => c.numero_contrato === form.contrato_ref)
      if (c) { setContratoSel(c); setBuscaContrato(c.numero_contrato) }
    }
  }, [form.contrato_ref, contratos])

  // Preenche os dados bancários do credor a partir do contrato sempre que estiverem
  // vazios (ex.: DID salvo antes deste recurso existir, ou contrato editado depois).
  useEffect(() => {
    if (!contratoSel) return
    if (!form.banco_fornecedor && contratoSel.banco)   set('banco_fornecedor', contratoSel.banco)
    if (!form.ag_fornecedor && contratoSel.agencia)     set('ag_fornecedor', contratoSel.agencia)
    if (!form.cc_fornecedor && contratoSel.conta)       set('cc_fornecedor', contratoSel.conta)
  }, [contratoSel])

  // Filtra contratos pelo credor selecionado (se houver)
  const contratosFiltrados = (() => {
    const q = buscaContrato.trim().toLowerCase()
    let lista = contratos.filter(c => c.status !== 'EXCLUÍDO')
    if (credorSel?.id) lista = lista.filter(c => String(c.credor_id) === String(credorSel.id))
    if (!q) return lista.slice(0, 12)
    return lista.filter(c =>
      (c.numero_contrato || '').toLowerCase().includes(q) ||
      (c.objeto || '').toLowerCase().includes(q)
    ).slice(0, 12)
  })()

  const getResponsavelVigente = (secretariaNomeOuSigla, dataRef) => {
    const secObj = secretariasApi.find(s => s.sigla === secretariaNomeOuSigla || s.nome === secretariaNomeOuSigla)
    if (!secObj) return ''
    const ref = dataRef ? new Date(dataRef + 'T00:00:00') : new Date()
    const vigentes = (secObj.responsaveis || []).filter(r => {
      if (!r.data_inicio) return false
      const ini = new Date(r.data_inicio + 'T00:00:00')
      const fim = r.data_fim ? new Date(r.data_fim + 'T00:00:00') : null
      return ref >= ini && (!fim || ref <= fim)
    })
    return vigentes.length > 0 ? vigentes[0].nome : ''
  }

  const selecionarContrato = (c) => {
    setContratoSel(c)
    setBuscaContrato(c.numero_contrato)
    setDropdownContrato(false)
    const dataRef = form.data_did || new Date().toISOString().slice(0, 10)
    const gestor = getResponsavelVigente(c.secretaria || '', dataRef)
    set('contrato_ref', c.numero_contrato || '')
    // Pré-preenche credor/CNPJ apenas se não estiver já selecionado
    if (!credorSel) {
      const credor = credoresStorage.find(cr => String(cr.id) === String(c.credor_id))
      if (credor) {
        setCredorSel(credor)
        setBuscaCredor(credor.razao_social)
        set('credor_sec1', credor.razao_social)
        set('cnpj_cpf_credor_sec1', credor.cnpj_cpf || '')
      }
    }
    set('objeto', c.objeto || form.objeto)
    set('secretaria_sec1', c.secretaria || '')
    set('secretario_nome', gestor)
    // Pré-preenche dados bancários do credor a partir do contrato (editável)
    set('banco_fornecedor', c.banco || '')
    set('ag_fornecedor', c.agencia || '')
    set('cc_fornecedor', c.conta || '')
  }

  const limparContrato = () => {
    setContratoSel(null)
    setBuscaContrato('')
    set('contrato_ref', '')
    set('banco_fornecedor', '')
    set('ag_fornecedor', '')
    set('cc_fornecedor', '')
  }

  // ── Seleção de Ordem de Compra ────────────────────────────────────────────
  // Ao selecionar uma ordem, preenche automaticamente credor, contrato, objeto e itens
  const selecionarOrdem = (ordem) => {
    setOrdemSel(ordem)
    setModalOrdens(false)
    set('ordem_compra_id', ordem.id)
    set('ordem_ref', ordem.numero || '')

    const credor = ordem.contrato?.credor
    const contrato = ordem.contrato

    // Preenche credor
    if (credor) {
      setCredorSel(credor)
      setBuscaCredor(credor.razao_social)
      set('credor_sec1', credor.razao_social)
      set('cnpj_cpf_credor_sec1', credor.cnpj_cpf || '')
    }

    // Preenche contrato
    if (contrato) {
      setContratoSel(contrato)
      setBuscaContrato(contrato.numero_contrato)
      set('contrato_ref', contrato.numero_contrato || '')
      set('nro_licitacao_sec1', contrato.numero_licitacao || '')
      set('tipo_licitacao_sec1', contrato.modalidade || '')
      // Pré-preenche dados bancários do credor a partir do contrato (editável)
      set('banco_fornecedor', contrato.banco || '')
      set('ag_fornecedor', contrato.agencia || '')
      set('cc_fornecedor', contrato.conta || '')
    }

    // Preenche objeto
    if (ordem.objeto) set('objeto', ordem.objeto)

    // Preenche secretaria e secretário
    if (ordem.secretaria) {
      set('secretaria_sec1', ordem.secretaria)
      const dataRef = form.data_did || new Date().toISOString().slice(0, 10)
      const gestor = getResponsavelVigente(ordem.secretaria, dataRef)
      if (gestor) set('secretario_nome', gestor)
    }

    // Preenche itens do DID a partir dos itens da ordem
    if (ordem.itens?.length) {
      const novosItens = ordem.itens.map((it, i) => {
        const q = parseFloat(it.quantidade) || 0
        const u = parseFloat(it.valor_unitario) || 0
        return {
          _id: Date.now() + i,
          descricao: it.descricao || '',
          unidade: it.unidade || '',
          quantidade: String(it.quantidade || ''),
          valor_unitario: String(it.valor_unitario || ''),
          valor_total: q && u ? (q * u).toFixed(2) : '',
        }
      })
      setItensDid(novosItens)
    }
  }

  const limparOrdem = async () => {
    setOrdemSel(null)
    set('ordem_compra_id', '')
    set('ordem_ref', '')
    // Limpa todos os campos que foram preenchidos automaticamente pela ordem
    setCredorSel(null)
    setBuscaCredor('')
    set('credor_sec1', '')
    set('cnpj_cpf_credor_sec1', '')
    setContratoSel(null)
    setBuscaContrato('')
    set('contrato_ref', '')
    set('nro_licitacao_sec1', '')
    set('tipo_licitacao_sec1', '')
    set('objeto', '')
    set('secretaria_sec1', '')
    set('secretario_nome', '')
    set('banco_fornecedor', '')
    set('ag_fornecedor', '')
    set('cc_fornecedor', '')
    setItensDid([{ _id: Date.now(), descricao: '', unidade: '', quantidade: '', valor_unitario: '', valor_total: '' }])

    // Persiste a remoção do vínculo da ordem no banco imediatamente
    // (apenas os campos de referência da ordem — os demais o usuário preenche e salva)
    if (didId && processoId && processoId !== 'novo') {
      try {
        await api.post(`/did/processo/${processoId}`, {
          ordem_compra_id: null,
          ordem_ref: null,
        })
      } catch { /* silently ignore — o usuário vai ver ao tentar salvar manualmente */ }
    }
  }

  const abrirModal = async () => {
    if (!contratoSel) return
    setModalItens(true)
    setLoadingStock(true)
    try {
      const params = didId ? `?did_id=${didId}` : ''
      const stockRes = await api.get(`/did/estoque/${encodeURIComponent(contratoSel.numero_contrato)}${params}`)
      const map = {}
      for (const entry of (stockRes.data.estoque || [])) {
        const k = (entry.descricao || '').trim().toLowerCase()
        map[k] = entry
      }
      setStockData(map)

      // Busca estoque físico no almoxarifado
      const descricoes = (contratoSel?.itens || []).filter(it => it.descricao).map(it => it.descricao).join(',')
      if (descricoes) {
        try {
          const almRes = await api.get(`/did/alm-estoque?descricoes=${encodeURIComponent(descricoes)}`)
          const almMap = {}
          for (const entry of (almRes.data.itens || [])) {
            const k = (entry.descricao_did || '').trim().toLowerCase()
            almMap[k] = entry
          }
          setAlmStockData(almMap)
        } catch { setAlmStockData({}) }
      }
    } catch {
      setStockData({})
      setAlmStockData({})
    } finally {
      setLoadingStock(false)
    }
  }

  const totalItensDid = itensDid.reduce((acc, it) => acc + (parseFloat(it.valor_total) || 0), 0)
  const temItensPreenchidos = itensDid.some(it => it.valor_total)

  const mesReferenciaOpcoes = (() => {
    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const opcoes = []
    for (const ano of [2026, 2027]) {
      for (let m = 0; m < 12; m++) {
        opcoes.push({ value: `${String(m + 1).padStart(2, '0')}/${ano}`, label: `${MESES[m]}/${ano}` })
      }
    }
    return opcoes
  })()

  const secaoICompleta = !!(
    form.secretaria_sec1 && form.secretario_nome &&
    form.credor_sec1 && form.cnpj_cpf_credor_sec1 &&
    form.data_did && form.mes_referencia && form.objeto && temItensPreenchidos
  )

  // Auto-calculate total when qty or unit price changes
  const handleItemChange = (idx, field, value) => {
    setItemDid(idx, field, value)
    if (field === 'quantidade' || field === 'valor_unitario') {
      const it = itensDid[idx]
      const q = field === 'quantidade' ? parseFloat(value) || 0 : parseFloat(it.quantidade) || 0
      const u = field === 'valor_unitario' ? parseFloat(value) || 0 : parseFloat(it.valor_unitario) || 0
      setItemDid(idx, 'valor_total', q && u ? (q * u).toFixed(2) : '')
    }
  }

  const handleSalvarSecaoI = async () => {
    setTentouSalvar(true)
    const completo = alertarPendencias([
      { ok: !!form.credor_sec1, label: 'Credor' },
      { ok: !!form.cnpj_cpf_credor_sec1, label: 'CNPJ/CPF do Credor' },
      { ok: !!form.secretaria_sec1, label: 'Secretaria' },
      { ok: !!form.secretario_nome, label: 'Secretário Responsável' },
      { ok: !!form.data_did, label: 'Data' },
      { ok: !!form.mes_referencia, label: 'Mês de Referência' },
      { ok: !!form.objeto, label: 'Objeto' },
      { ok: temItensPreenchidos, label: 'Itens do DID (adicione ao menos um item com valor)' },
    ], 'Seção I')
    if (!completo) return
    if (!onSaveSecaoI) { setLocked(true); return }
    const ok = await onSaveSecaoI()
    if (ok !== false) setLocked(true)
  }

  const handleLimparSecaoI = async () => {
    // Limpa estado local do autocomplete e ordem
    setOrdemSel(null)
    setCredorSel(null); setBuscaCredor('')
    setContratoSel(null); setBuscaContrato('')
    // Limpa todos os campos do formulário
    const patch = {
      ordem_compra_id: '', ordem_ref: '',
      credor_sec1: '', cnpj_cpf_credor_sec1: '', contrato_ref: '',
      nro_licitacao_sec1: '', tipo_licitacao_sec1: '',
      objeto: '', secretaria_sec1: '', secretario_nome: '',
      banco_fornecedor: '', ag_fornecedor: '', cc_fornecedor: '',
      data_did: '', mes_referencia: '', fonte_recurso: 'PRÓPRIO',
      nf_sec1: '', valor_did: '',
      cert_sec1_municipal: false, cert_sec1_trabalhista: false,
      cert_sec1_fgts: false, cert_sec1_estadual: false,
      cert_sec1_federal: false, cert_sec1_simples_nac: false,
    }
    Object.entries(patch).forEach(([k, v]) => set(k, v))
    setItensDid([{ _id: Date.now(), descricao: '', unidade: '', quantidade: '', valor_unitario: '', valor_total: '' }])
    setLocked(false)
    setTentouSalvar(false)
    // Persiste imediatamente no banco
    if (didId && processoId && processoId !== 'novo') {
      try {
        await api.post(`/did/processo/${processoId}`, {
          ...patch,
          ordem_compra_id: null,
          itens_did: []
        })
      } catch {}
    }
  }

  return (
    <>
    <SectionCard icon={FileText} title="Seção I - Secretaria Geral · Contas Variáveis"
      color="bg-ink-800 text-white">

      {/* ── Ordem de Compra (seletor principal — pré-preenche toda a seção) ── */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-ink-500 mb-1">
          Ordem de Compra <span className="font-normal text-ink-400">(opcional — pré-preenche credor, contrato, objeto e itens)</span>
        </label>
        {ordemSel || form.ordem_ref ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-orange-300 dark:border-orange-700
              bg-orange-50 dark:bg-orange-900/20 flex items-center gap-2 min-w-0">
              <ClipboardList className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="font-mono font-bold text-orange-700 dark:text-orange-400 shrink-0">
                {ordemSel?.numero || form.ordem_ref}
              </span>
              {ordemSel?.objeto && (
                <span className="text-ink-500 text-xs truncate">{ordemSel.objeto.slice(0, 50)}</span>
              )}
              {ordemSel?.valor_total && (
                <span className="ml-auto text-xs font-semibold text-ink-600 shrink-0">
                  {parseFloat(ordemSel.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>
            {!locked && (
              <button type="button" onClick={limparOrdem}
                title="Desvincular ordem"
                className="p-1.5 rounded-sm border border-ink-200 text-ink-500 hover:bg-ink-100 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => !locked && setModalOrdens(true)}
            disabled={locked}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
              ${locked
                ? 'border-ink-200 text-ink-400 cursor-not-allowed opacity-60'
                : 'border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
              }`}
          >
            <ClipboardList className="w-4 h-4" />
            Selecionar Ordem de Compra
          </button>
        )}
      </div>

      {/* ── Linha 1: N° DID | Credor (autocomplete) ── */}
      <Field label="N° do DID" half>
        <input type="text" value={numeroDIDFmt === 'Carregando...' ? '' : numeroDIDFmt}
          readOnly disabled
          className="input-field text-sm font-mono opacity-60 cursor-not-allowed bg-ink-50" />
      </Field>

      <Field label="Credor *" half error={tentouSalvar && !form.credor_sec1 ? 'Selecione o credor' : ''}>
        {credorSel ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-success-300 dark:border-success-700
              bg-success-50 dark:bg-success-900/20 flex items-center gap-2 min-w-0">
              <CheckCircle className="w-4 h-4 text-success-500 shrink-0" />
              <span className="font-semibold text-ink-800 truncate">{credorSel.razao_social}</span>
            </div>
            {!locked && !ordemVinculada && (
              <button type="button" onClick={limparCredor}
                className="p-1.5 rounded-sm border border-ink-200 text-ink-500 hover:bg-ink-100 shrink-0"
                title="Trocar credor">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
            <input
              value={buscaCredor}
              onChange={e => { setBuscaCredor(e.target.value); setDropdownCredor(true) }}
              onFocus={() => !locked && setDropdownCredor(true)}
              onBlur={() => setTimeout(() => setDropdownCredor(false), 180)}
              disabled={locked}
              placeholder="Buscar credor cadastrado..."
              className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-ink-200
                bg-surface text-ink-900
                focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none${locked ? ' opacity-60 cursor-not-allowed' : ''}`}
            />
            {dropdownCredor && (
              <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-surface border border-ink-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                {buscandoCredores ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-ink-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                  </div>
                ) : credoresOpts.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-ink-400">
                    {buscaCredor.trim() ? 'Nenhum credor encontrado.' : 'Nenhum credor cadastrado.'}
                  </p>
                ) : credoresOpts.map((cr, i) => (
                  <button key={cr.id ?? i} type="button" onMouseDown={() => selecionarCredor(cr)}
                    className="w-full text-left px-3 py-2.5 hover:bg-info-50 dark:hover:bg-info-900/20 border-b border-ink-100 last:border-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{cr.razao_social}</p>
                    <p className="text-xs text-ink-400 font-mono mt-0.5">{cr.cnpj_cpf}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Field>

      {/* ── Linha 2: CNPJ (editável, pré-preenchido) | Contrato (opcional, filtrado pelo credor) ── */}
      <Field label="CNPJ / CPF do Credor *" half error={tentouSalvar && !form.cnpj_cpf_credor_sec1 ? 'Informe o CNPJ/CPF' : ''}>
        <Input value={form.cnpj_cpf_credor_sec1} onChange={inp('cnpj_cpf_credor_sec1')}
          placeholder="Ex: 00.000.000/0001-00" disabled={locked || ordemVinculada} />
      </Field>

      <Field label={<span>Contrato <span className="font-normal text-ink-400">(opcional — pré-preenche dados)</span></span>} half>
        {contratoSel ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-success-300 dark:border-success-700
              bg-success-50 dark:bg-success-900/20 flex items-center gap-2 min-w-0">
              <CheckCircle className="w-4 h-4 text-success-500 shrink-0" />
              <span className="font-mono font-bold text-brand-700 dark:text-info-400 shrink-0">{contratoSel.numero_contrato}</span>
              <span className="text-ink-500 text-xs truncate">{contratoSel.objeto?.slice(0, 30)}</span>
            </div>
            {!locked && !ordemVinculada && (
              <button type="button" onClick={limparContrato}
                className="p-1.5 rounded-sm border border-ink-200 text-ink-500 hover:bg-ink-100 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : locked && form.contrato_ref ? (
          <div className="px-3 py-2 text-sm rounded-lg border border-success-300 dark:border-success-700
            bg-success-50 dark:bg-success-900/20 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success-500 shrink-0" />
            <span className="font-mono font-bold text-brand-700 dark:text-info-400">{form.contrato_ref}</span>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
            <input value={buscaContrato}
              onChange={e => { setBuscaContrato(e.target.value); setDropdownContrato(true) }}
              onFocus={() => !locked && setDropdownContrato(true)}
              onBlur={() => setTimeout(() => setDropdownContrato(false), 150)}
              disabled={locked}
              className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-ink-200
                bg-surface text-ink-900
                focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none${locked ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}
              placeholder={credorSel ? 'Buscar por número ou objeto...' : 'Buscar por número ou objeto (facultativo)...'} />
            {dropdownContrato && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-surface border border-ink-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {contratosFiltrados.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-ink-400">
                    {credorSel
                      ? 'Nenhum contrato encontrado para este credor.'
                      : buscaContrato.trim() ? 'Nenhum contrato encontrado.' : 'Nenhum contrato cadastrado.'}
                  </p>
                ) : contratosFiltrados.map(c => (
                  <button key={c.id} type="button" onMouseDown={() => selecionarContrato(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-info-50 dark:hover:bg-info-900/20 border-b border-ink-100 last:border-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-brand-700 dark:text-info-400 text-sm">{c.numero_contrato}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-sm font-medium ${c.status === 'ATIVO' ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-500'}`}>{c.status}</span>
                      <span className="text-xs text-ink-400 ml-auto">{c.tipo_contrato}</span>
                    </div>
                    <p className="text-xs text-ink-600 truncate">{c.objeto}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Field>

      {/* ── Dados Bancários do Credor (pré-preenchidos pelo contrato/ordem, editáveis) ── */}
      <div className="col-span-2 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">
            Banco <span className="font-normal text-ink-400">(dados do credor)</span>
          </label>
          <Input value={form.banco_fornecedor} onChange={inp('banco_fornecedor')} placeholder="Banco" disabled={locked} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Agência</label>
          <Input value={form.ag_fornecedor} onChange={inp('ag_fornecedor')} placeholder="Agência" disabled={locked} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Conta</label>
          <Input value={form.cc_fornecedor} onChange={inp('cc_fornecedor')} placeholder="Conta" disabled={locked} />
        </div>
      </div>

      {/* ── Linha 3: Secretaria | Secretário ── */}
      <Field label="Secretaria" half error={tentouSalvar && !form.secretaria_sec1 ? 'Campo obrigatório' : ''}>
        <div className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200
          bg-ink-50 text-ink-700">
          {secDidObj?.nome || form.secretaria_sec1 || secretariaNome || '—'}
        </div>
      </Field>
      <Field label="Secretário Responsável" half error={tentouSalvar && !form.secretario_nome ? 'Selecione o responsável' : ''}>
        {responsaveisDid.length > 0 ? (
          <div className="space-y-1">
            <select value={form.secretario_nome} onChange={inp('secretario_nome')} disabled={locked || ordemVinculada}
              className={`input-field text-sm${(locked || ordemVinculada) ? ' opacity-60 cursor-not-allowed' : ''}`}>
              <option value="">Selecione o responsável...</option>
              {responsaveisDid.map((r, i) => (
                <option key={i} value={r.nome} disabled={!r.vigente}>
                  {r.vigente ? '✓' : '⛔'} {r.nome}
                  {!r.vigente && r.data_inicio ? ` (${r.data_inicio}${r.data_fim ? ` a ${r.data_fim}` : ''})` : ''}
                </option>
              ))}
            </select>
            {form.secretario_nome && !responsaveisDid.find(r => r.nome === form.secretario_nome && r.vigente) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">⛔ Este responsável está fora do período de nomeação para a data do DID.</p>
            )}
            {!form.secretario_nome && (
              <p className="text-xs text-danger-500">Nenhum responsável vigente para {dataRefDid}. Verifique as nomeações cadastradas.</p>
            )}
          </div>
        ) : (
          <Input value={form.secretario_nome} onChange={inp('secretario_nome')} />
        )}
      </Field>

      {/* Data | Fonte de Recurso */}
      <Field label="Data *" half error={tentouSalvar && !form.data_did ? 'Informe a data' : ''}>
        <Input type="date" value={form.data_did} onChange={inp('data_did')} disabled={locked} />
      </Field>
      <Field label="Fonte de Recurso" half>
        {contratoSel?.fontes_recurso?.filter(Boolean).length > 0 ? (
          <select value={form.fonte_recurso} onChange={inp('fonte_recurso')} disabled={locked}
            className={`input-field text-sm${locked ? ' opacity-60 cursor-not-allowed' : ''}`}>
            <option value="">Selecione...</option>
            {contratoSel.fontes_recurso.filter(Boolean).map((f, i) => (
              <option key={i} value={f}>{f}</option>
            ))}
          </select>
        ) : (
          <Input value={form.fonte_recurso} onChange={inp('fonte_recurso')}
            placeholder="Fonte de recurso / rubrica..."
            disabled={locked} />
        )}
      </Field>

      {/* Objeto */}
      <Field label="Objeto *" error={tentouSalvar && !form.objeto ? 'Descreva o objeto' : ''}>
        <Textarea value={form.objeto} onChange={inp('objeto')} placeholder="Descreva o objeto do DID..." disabled={locked} />
      </Field>

      {/* Tabela de Itens — Quantidades Variáveis (inline editável) */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-2">
          <label className={`text-xs font-medium ${tentouSalvar && !temItensPreenchidos ? 'text-danger-500 dark:text-danger-400' : 'text-ink-500'}`}>
            Itens do DID — Quantidades Variáveis{tentouSalvar && !temItensPreenchidos ? ' — Adicione ao menos um item com valor' : ''}
          </label>
          {!locked && !ordemVinculada && (
            <div className="flex items-center gap-2">
              {contratoSel?.itens?.filter(it => it.descricao).length > 0 && (
                <button type="button" onClick={abrirModal}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-sm font-semibold transition-colors">
                  <ListPlus className="w-3 h-3" /> Itens do Contrato
                </button>
              )}
              <button type="button" onClick={addItemDid}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-ink-500 hover:bg-ink-600 text-white rounded-sm font-semibold transition-colors">
                <Plus className="w-3 h-3" /> Linha em Branco
              </button>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-ink-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-ink-50">
                <th className="px-3 py-2 text-left font-semibold text-ink-500">Descrição</th>
                <th className="px-3 py-2 text-center font-semibold text-ink-500 w-20">Unid.</th>
                <th className="px-3 py-2 text-right font-semibold text-ink-500 w-24">Qtd.</th>
                <th className="px-3 py-2 text-right font-semibold text-ink-500 w-32">Vlr. Unit.</th>
                <th className="px-3 py-2 text-right font-semibold text-ink-500 w-32">Vlr. Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {itensDid.map((it, idx) => (
                <tr key={it._id ?? idx} className="bg-surface">
                  <td className="px-2 py-1.5">
                    <input value={it.descricao || ''} onChange={e => handleItemChange(idx, 'descricao', e.target.value)}
                      disabled={locked || ordemVinculada} placeholder="Descrição do item..."
                      className={`w-full px-2 py-1 text-xs rounded-sm border border-ink-200 bg-surface text-ink-900 outline-hidden focus:ring-1 focus:ring-brand-500${(locked || ordemVinculada) ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={it.unidade || ''} onChange={e => handleItemChange(idx, 'unidade', e.target.value)}
                      disabled={locked || ordemVinculada} placeholder="Ex: UN"
                      className={`w-full px-2 py-1 text-xs rounded-sm border border-ink-200 bg-surface text-ink-900 outline-hidden focus:ring-1 focus:ring-brand-500 text-center${(locked || ordemVinculada) ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="any" value={it.quantidade || ''}
                      onChange={e => handleItemChange(idx, 'quantidade', e.target.value)}
                      disabled={locked || ordemVinculada} placeholder="0"
                      className={`w-full px-2 py-1 text-xs rounded-sm border border-ink-200 bg-surface text-ink-900 outline-hidden focus:ring-1 focus:ring-brand-500 text-right font-mono${(locked || ordemVinculada) ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="any" value={it.valor_unitario || ''}
                      onChange={e => handleItemChange(idx, 'valor_unitario', e.target.value)}
                      disabled={locked || ordemVinculada} placeholder="0,00"
                      className={`w-full px-2 py-1 text-xs rounded-sm border border-ink-200 bg-surface text-ink-900 outline-hidden focus:ring-1 focus:ring-brand-500 text-right font-mono${(locked || ordemVinculada) ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold font-mono text-ink-700">
                    {it.valor_total
                      ? parseFloat(it.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                      : <span className="text-ink-400">—</span>}
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    {!locked && !ordemVinculada && itensDid.length > 1 && (
                      <button type="button" onClick={() => removeItemDid(idx)}
                        className="p-1 rounded-sm text-danger-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {temItensPreenchidos && (
              <tfoot>
                <tr className="bg-ink-50 border-t border-ink-200">
                  <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-ink-600 text-right">Total</td>
                  <td className="px-3 py-2 text-xs font-bold text-success-700 dark:text-success-400 text-right">
                    {totalItensDid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Valor | Mês Referência */}
      <div className="col-span-2 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">
            {temItensPreenchidos ? 'Valor (calculado dos itens)' : 'Valor (R$)'}
          </label>
          {temItensPreenchidos ? (
            <div className="w-full px-3 py-2 text-sm rounded-lg border border-success-200 dark:border-success-700
              bg-success-50 dark:bg-success-900/20 font-bold text-success-700 dark:text-success-400">
              {totalItensDid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          ) : (
            <Input type="number" value={form.valor_did} onChange={inp('valor_did')} placeholder="0,00" disabled={locked} />
          )}
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${tentouSalvar && !form.mes_referencia ? 'text-danger-500 dark:text-danger-400' : 'text-ink-500'}`}>Mês de Referência *</label>
          <select value={form.mes_referencia || ''} onChange={inp('mes_referencia')} disabled={locked}
            className={`input-field text-sm${locked ? ' opacity-60 cursor-not-allowed' : ''}${tentouSalvar && !form.mes_referencia ? ' border-danger-400 dark:border-danger-500' : ''}`}>
            <option value="">Selecione...</option>
            {mesReferenciaOpcoes.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {tentouSalvar && !form.mes_referencia && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">Selecione o mês de referência</p>}
        </div>
      </div>

      {/* Certidões */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-ink-500 mb-2">Certidões</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { key: 'cert_sec1_municipal',    certKey: 'municipal',    label: 'Municipal' },
            { key: 'cert_sec1_trabalhista',  certKey: 'trabalhista',  label: 'Trabalhista' },
            { key: 'cert_sec1_fgts',         certKey: 'fgts',         label: 'FGTS' },
            { key: 'cert_sec1_estadual',     certKey: 'estadual',     label: 'Estadual' },
            { key: 'cert_sec1_federal',      certKey: 'federal',      label: 'Federal' },
            { key: 'cert_sec1_simples_nac',  certKey: 'simples_nac',  label: 'Simples Nacional' },
          ].map(({ key, certKey, label }) => {
            const arq = certArquivos[certKey]
            const uploading = certUploading[certKey]
            return (
              <div key={key} className={`rounded-lg border p-2.5 transition-colors ${
                form[key]
                  ? 'border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/15'
                  : 'border-ink-200 bg-surface'
              }`}>
                {/* Linha do checkbox */}
                <label className={`flex items-center gap-2 text-sm select-none mb-2
                  ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                  ${form[key] ? 'text-success-700 dark:text-success-400 font-semibold' : 'text-ink-700'}`}>
                  <input type="checkbox" checked={!!form[key]}
                    onChange={e => set(key, e.target.checked)} disabled={locked}
                    className="w-4 h-4 rounded-sm border-ink-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60" />
                  {label}
                </label>

                {/* Área de arquivo */}
                {arq ? (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-info-500 shrink-0" />
                    <span className="text-xs text-ink-600 truncate flex-1 min-w-0" title={arq.nome}>
                      {arq.nome}
                    </span>
                    <button type="button" onClick={() => verCertidao(certKey)} title="Ver arquivo"
                      className="p-1 rounded-sm text-info-500 hover:bg-info-50 dark:hover:bg-info-900/20 shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    {!locked && (
                      <button type="button" onClick={() => setConfirmarRemoverCertidao(certKey)} title="Remover arquivo"
                        className="p-1 rounded-sm text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      ref={el => { certFileRefs.current[certKey] = el }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) { uploadCertidao(certKey, file); e.target.value = '' }
                      }}
                    />
                    <button type="button"
                      disabled={locked || uploading}
                      onClick={() => certFileRefs.current[certKey]?.click()}
                      className="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-600 dark:hover:text-info-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {uploading
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Paperclip className="w-3 h-3" />
                      }
                      {uploading ? 'Enviando...' : 'Anexar arquivo'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Botões */}
      <div className="col-span-2 flex justify-between items-center pt-2 border-t border-ink-100 mt-1">
        {!readOnly && (
          <button type="button" onClick={() => setConfirmarLimparSecao(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-50 hover:bg-danger-100 dark:bg-danger-900/20 dark:hover:bg-danger-900/40 text-danger-600 dark:text-danger-400 border border-danger-200 dark:border-danger-700 rounded-lg text-sm font-semibold transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Limpar Seção
          </button>
        )}
        {!readOnly && (locked ? (
          <button type="button" onClick={() => setLocked(false)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Pencil className="w-3.5 h-3.5" /> Alterar
          </button>
        ) : (
          <button type="button" onClick={handleSalvarSecaoI}
            disabled={saving}
            title="Salvar e bloquear Seção I"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-success-600 hover:bg-success-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar Seção I
          </button>
        ))}
      </div>

    </SectionCard>

    {modalItens && contratoSel && (
      <ModalItensContrato
        contrato={contratoSel}
        itensDid={itensDid}
        stockData={stockData}
        almStockData={almStockData}
        loadingStock={loadingStock}
        onConfirm={novosItens => {
          if (novosItens.length > 0) setItensDid(novosItens)
          setModalItens(false)
        }}
        onClose={() => setModalItens(false)}
      />
    )}

    {modalOrdens && (
      <ModalOrdemCompra
        onConfirm={selecionarOrdem}
        onClose={() => setModalOrdens(false)}
      />
    )}

    {confirmarRemoverCertidao && (
      <ConfirmModal
        title="Remover arquivo da certidão?"
        message="O arquivo anexado será removido permanentemente."
        confirmLabel="Remover"
        onConfirm={() => removerCertidao(confirmarRemoverCertidao)}
        onClose={() => setConfirmarRemoverCertidao(null)}
      />
    )}

    {confirmarLimparSecao && (
      <ConfirmModal
        title="Limpar Seção I?"
        message="Todos os campos preenchidos nesta seção serão apagados imediatamente do banco."
        confirmLabel="Limpar"
        onConfirm={async () => { await handleLimparSecaoI(); setConfirmarLimparSecao(false) }}
        onClose={() => setConfirmarLimparSecao(false)}
      />
    )}
  </>
  )
}
