import { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { FileText, Plus, Trash2, Search, X, Check, CheckCircle, Pencil, Loader2, Lock, RotateCcw, ClipboardList, Paperclip, ExternalLink } from 'lucide-react'
import { Field, Input, Textarea, SectionCard, DidReadOnlyContext, alertarPendencias } from '../didShared'
import api from '../../../services/api'

// ─── Modal de seleção de itens do contrato ────────────────────────────────────
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
    const qtdDisponivel = Math.max(0, qtdContrato - qtdUsada)
    return (parseFloat(it.qtd_did) || 0) > qtdDisponivel
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-3 rounded-t-xl shrink-0">
          <div>
            <span className="text-sm font-semibold text-white">Selecionar Itens para o DID</span>
            {contrato && <span className="ml-3 text-xs text-gray-400 font-mono">{contrato.numero_contrato} — {contrato.tipo_contrato}</span>}
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {itensContrato.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-gray-400">
            <p className="text-sm font-medium">Nenhum item encontrado no contrato.</p>
            <p className="text-xs mt-1">Adicione itens ao contrato em Contratos antes de criar o DID.</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 shrink-0 flex items-center gap-2">
              <span>Marque os itens e informe a quantidade desejada para este DID. A coluna <strong>Saldo</strong> mostra o disponível considerando todos os DIDs do contrato.</span>
              {loadingStock && <span className="ml-auto text-blue-500 animate-pulse">Consultando estoque…</span>}
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Descrição</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500 dark:text-gray-400 w-20">Unid.</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-32">Vlr. Unit. (R$)</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-28 whitespace-nowrap" title="Disponível / Total contrato">Saldo Disp.</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-24">Estoque Alm.</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-28">Qtd. DID</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {selecao.map((it, idx) => {
                    const sub = (parseFloat(it.qtd_did) || 0) * (parseFloat(it.valor_unit_did) || 0)
                    const key = (it.descricao || '').trim().toLowerCase()
                    const qtdContrato = parseFloat(it.quantidade) || 0
                    const qtdUsada = stockData[key]?.qtd_usada || 0
                    const qtdDisponivel = Math.max(0, qtdContrato - qtdUsada)
                    const qtdAtual = parseFloat(it.qtd_did) || 0
                    const excede = it.selecionado && qtdAtual > qtdDisponivel
                    const almItem = almStockData[key]
                    const estoqueAlm = almItem != null ? parseFloat(almItem.estoque_atual) : null
                    return (
                      <tr key={idx} onClick={() => toggle(idx)}
                        className={`cursor-pointer transition-colors ${excede ? 'bg-red-50 dark:bg-red-900/10' : it.selecionado ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={it.selecionado} onChange={() => toggle(idx)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">{it.descricao || '—'}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{it.unidade || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-300">
                          {it.valor_unit_did ? parseFloat(it.valor_unit_did).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {loadingStock ? (
                            <span className="text-gray-400 text-xs">…</span>
                          ) : (
                            <>
                              <span className={`text-xs font-bold ${
                                qtdDisponivel <= 0 ? 'text-red-600 dark:text-red-400'
                                : qtdDisponivel < qtdContrato * 0.3 ? 'text-amber-600 dark:text-amber-400'
                                : 'text-green-600 dark:text-green-400'
                              }`}>{qtdDisponivel}</span>
                              <span className="text-gray-400 text-xs"> / {qtdContrato}</span>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {loadingStock ? (
                            <span className="text-gray-400 text-xs">…</span>
                          ) : estoqueAlm !== null ? (
                            <span className={`text-xs font-bold ${
                              estoqueAlm <= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>{estoqueAlm}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                          <input type="number" min="0" max={qtdDisponivel} step="any" value={it.qtd_did}
                            onChange={e => { if (!it.selecionado) toggle(idx); setQtd(idx, e.target.value) }}
                            className={`w-full px-2 py-1 text-xs rounded border text-right font-mono outline-none
                              ${excede
                                ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-1 focus:ring-red-500'
                                : it.selecionado ? 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50'}`}
                            placeholder="0" />
                          {excede && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 text-right whitespace-nowrap">Máx: {qtdDisponivel}</p>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold font-mono">
                          {sub > 0
                            ? <span className="text-blue-700 dark:text-blue-400">{sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={confirmar} disabled={!selecao.some(it => it.selecionado) || temExcesso}
            title={temExcesso ? 'Corrija as quantidades acima do disponível antes de confirmar' : undefined}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Check className="w-4 h-4" /> Confirmar Seleção
          </button>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-semibold transition-colors">
            Cancelar
          </button>
          {temExcesso && (
            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
              ⚠ Item(ns) com quantidade acima do saldo disponível.
            </span>
          )}
          {totalSelecionado > 0 && !temExcesso && (
            <span className="ml-auto text-xs text-gray-500">
              {selecao.filter(it => it.selecionado).length} item(ns) · Total:{' '}
              <strong className="text-blue-700 dark:text-blue-400">
                {totalSelecionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal de seleção de Ordem de Serviço disponível para DID ────────────────
function ModalOrdemServico({ onConfirm, onClose }) {
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/contratos/ordens/disponiveis-did')
      .then(r => setOrdens(Array.isArray(r.data) ? r.data.filter(o => o.tipo === 'SERVICO') : []))
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-3 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Ordens de Serviço Disponíveis</span>
            <span className="text-xs text-gray-400 ml-1">· somente EMITIDAS e não vinculadas</span>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por número, objeto, contrato ou credor..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando ordens...</span>
            </div>
          ) : ordensFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 px-6 text-center">
              <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">
                {busca ? 'Nenhuma ordem encontrada para a busca.' : 'Nenhuma ordem de serviço disponível.'}
              </p>
              <p className="text-xs mt-1 text-gray-400">
                Apenas ordens com status EMITIDA e ainda não vinculadas a um DID são exibidas.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-28">Nº Ordem</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-32">Contrato</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Objeto / Credor</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-32">Valor Total</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-24">Emissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ordensFiltradas.map(o => (
                  <tr key={o.id} onClick={() => onConfirm(o)}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-bold text-blue-700 dark:text-blue-400">{o.numero}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                      {o.contrato?.numero_contrato || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <p className="truncate text-gray-700 dark:text-gray-200 font-medium">{o.objeto || '—'}</p>
                      {o.contrato?.credor?.razao_social && (
                        <p className="truncate text-gray-400 text-xs">{o.contrato.credor.razao_social}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800 dark:text-gray-200">
                      {parseFloat(o.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500">
                      {o.data_emissao ? new Date(o.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-400">
            {loading ? '…' : `${ordensFiltradas.length} ordem(ns) disponível(is)`}
          </span>
          <button onClick={onClose}
            className="ml-auto px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
              text-gray-700 dark:text-gray-200 rounded text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Seção I — Contas Fixas ───────────────────────────────────────────────────
export default function DidFixasSecaoI({
  form, set, inp,
  itensDid, setItensDid, removeItemDid,
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
  // Credores para lookup (todos, necessário para recuperar credor do form salvo)
  const [credoresStorage, setCredoresStorage] = useState([])
  // Resultados do autocomplete (server-side search)
  const [credoresOpts, setCredoresOpts]         = useState([])
  const [buscandoCredores, setBuscandoCredores] = useState(false)

  useEffect(() => {
    api.get('/contratos').then(r => setContratos(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    // Carrega lista completa para uso interno (lookup por form salvo)
    api.get('/contratos/credores')
      .then(r => setCredoresStorage(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  // ── Estado do autocomplete de Credor ─────────────────────────────────────
  const [credorSel,      setCredorSel]      = useState(null)
  const [buscaCredor,    setBuscaCredor]    = useState(form.credor_sec1 || '')
  const [dropdownCredor, setDropdownCredor] = useState(false)

  // Recupera credor a partir do form já salvo
  useEffect(() => {
    if (form.credor_sec1 && !credorSel) {
      // Tenta primeiro no cache local
      const found = credoresStorage.find(c =>
        c.razao_social === form.credor_sec1 || c.cnpj_cpf === form.cnpj_cpf_credor_sec1
      )
      if (found) {
        setCredorSel(found)
      } else if (credoresStorage.length === 0) {
        // Fallback: monta objeto com os dados do form
        setCredorSel({ razao_social: form.credor_sec1, cnpj_cpf: form.cnpj_cpf_credor_sec1 })
      }
    }
  }, [form.credor_sec1, credoresStorage])

  // Busca server-side com debounce de 300ms
  useEffect(() => {
    if (credorSel || !dropdownCredor) return
    const q = buscaCredor.trim()

    // Sem texto: carrega os primeiros da lista completa
    if (!q) {
      setCredoresOpts(credoresStorage.slice(0, 12))
      return
    }

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
    // Limpa contrato anterior ao trocar credor
    setContratoSel(null)
    setBuscaContrato('')
    set('contrato_ref', '')
    set('secretaria_sec1', '')
    set('secretario_nome', '')
    set('nro_licitacao_sec1', '')
    set('tipo_licitacao_sec1', '')
    set('objeto', '')
    set('banco_fornecedor', '')
    set('ag_fornecedor', '')
    set('cc_fornecedor', '')
  }

  const limparCredor = () => {
    setCredorSel(null)
    setBuscaCredor('')
    set('credor_sec1', '')
    set('cnpj_cpf_credor_sec1', '')
    setContratoSel(null)
    setBuscaContrato('')
    set('contrato_ref', '')
    set('secretaria_sec1', '')
    set('secretario_nome', '')
    set('nro_licitacao_sec1', '')
    set('tipo_licitacao_sec1', '')
    set('objeto', '')
    set('banco_fornecedor', '')
    set('ag_fornecedor', '')
    set('cc_fornecedor', '')
  }

  // ── Estado do autocomplete de Contrato ────────────────────────────────────
  const [contratoSel, setContratoSel] = useState(null)
  const [buscaContrato, setBuscaContrato] = useState('')
  const [dropdownContrato, setDropdownContrato] = useState(false)
  const [modalItens, setModalItens] = useState(false)
  const [modalOrdemServico, setModalOrdemServico] = useState(false)
  const [ordemServicoSel, setOrdemServicoSel] = useState(null)
  const [stockData, setStockData] = useState({})
  const [almStockData, setAlmStockData] = useState({})
  const [loadingStock, setLoadingStock] = useState(false)
  const [locked, setLocked] = useState(false)
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [certUploading, setCertUploading] = useState({})
  const certFileRefs = useRef({})
  useEffect(() => { if (didId) setLocked(true) }, [didId])

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
    if (!window.confirm('Remover o arquivo desta certidão?')) return
    try {
      const { data } = await api.delete(`/did/processo/${processoId}/certidao/${certKey}`)
      set('cert_sec1_arquivos', data.cert_sec1_arquivos)
    } catch { alert('Erro ao remover arquivo.') }
  }
  const readOnly = useContext(DidReadOnlyContext)

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

  // Contratos filtrados pelo credor selecionado
  const contratosFiltrados = (() => {
    const q = buscaContrato.trim().toLowerCase()
    let lista = contratos.filter(c => c.status !== 'EXCLUÍDO')
    // Filtra pelo credor selecionado
    if (credorSel) {
      lista = lista.filter(c => String(c.credor_id) === String(credorSel.id))
    }
    if (!q) return lista.slice(0, 12)
    return lista.filter(c =>
      (c.numero_contrato || '').toLowerCase().includes(q) ||
      (c.objeto || '').toLowerCase().includes(q)
    ).slice(0, 12)
  })()

  // Campos vindos do contrato são bloqueados para edição após seleção
  const camposContratoBloqueados = locked || !!contratoSel

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
    // Credor e CNPJ já foram definidos na seleção do credor — não sobrescreve
    set('objeto', c.objeto || form.objeto)
    set('nro_licitacao_sec1', c.numero_licitacao || '')
    set('tipo_licitacao_sec1', c.modalidade || '')
    set('valor_did', '')
    set('secretaria_sec1', c.secretaria || '')
    set('secretario_nome', gestor)
    // Pré-preenche dados bancários do credor a partir do contrato (editável)
    set('banco_fornecedor', c.banco || '')
    set('ag_fornecedor', c.agencia || '')
    set('cc_fornecedor', c.conta || '')
    setItensDid([{ _id: 1, descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])
  }

  const limparContrato = () => {
    setContratoSel(null)
    setBuscaContrato('')
    set('contrato_ref', '')
    set('secretaria_sec1', '')
    set('secretario_nome', '')
    set('nro_licitacao_sec1', '')
    set('tipo_licitacao_sec1', '')
    set('objeto', '')
    set('banco_fornecedor', '')
    set('ag_fornecedor', '')
    set('cc_fornecedor', '')
  }

  const selecionarOrdemServico = (ordem) => {
    setOrdemServicoSel(ordem)
    setModalOrdemServico(false)
    set('ordem_compra_id', ordem.id)
    set('ordem_ref', ordem.numero || '')

    const credor = ordem.contrato?.credor
    const contrato = ordem.contrato
    if (credor) {
      setCredorSel(credor)
      setBuscaCredor(credor.razao_social)
      set('credor_sec1', credor.razao_social)
      set('cnpj_cpf_credor_sec1', credor.cnpj_cpf || '')
    }
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
    if (ordem.objeto) set('objeto', ordem.objeto)
    if (ordem.secretaria) {
      set('secretaria_sec1', ordem.secretaria)
      const dataRef = form.data_did || new Date().toISOString().slice(0, 10)
      const gestor = getResponsavelVigente(ordem.secretaria, dataRef)
      if (gestor) set('secretario_nome', gestor)
    }
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

  const limparOrdemServico = () => {
    setOrdemServicoSel(null)
    set('ordem_compra_id', '')
    set('ordem_ref', '')
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
    form.contrato_ref && form.secretaria_sec1 && form.secretario_nome &&
    form.nro_licitacao_sec1 && form.tipo_licitacao_sec1 &&
    form.credor_sec1 && form.cnpj_cpf_credor_sec1 &&
    form.data_did && form.objeto && temItensPreenchidos
  )

  const abrirModal = async () => {
    if (!contratoSel) return
    setModalItens(true)
    setLoadingStock(true)
    try {
      const params = didId ? `?did_id=${didId}` : ''
      const { data } = await api.get(`/did/estoque/${encodeURIComponent(contratoSel.numero_contrato)}${params}`)
      const map = {}
      for (const entry of (data.estoque || [])) {
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

  const handleSalvarSecaoI = async () => {
    setTentouSalvar(true)
    const completo = alertarPendencias([
      { ok: !!form.contrato_ref, label: 'Contrato' },
      { ok: !!form.secretaria_sec1, label: 'Secretaria' },
      { ok: !!form.secretario_nome, label: 'Secretário Responsável' },
      { ok: !!form.nro_licitacao_sec1, label: 'Nº da Licitação' },
      { ok: !!form.tipo_licitacao_sec1, label: 'Tipo de Licitação' },
      { ok: !!form.credor_sec1, label: 'Credor' },
      { ok: !!form.cnpj_cpf_credor_sec1, label: 'CNPJ/CPF do Credor' },
      { ok: !!form.data_did, label: 'Data' },
      { ok: !!form.objeto, label: 'Objeto' },
      { ok: temItensPreenchidos, label: 'Itens do DID (adicione ao menos um item)' },
    ], 'Seção I')
    if (!completo) return
    if (!onSaveSecaoI) { setLocked(true); return }
    const ok = await onSaveSecaoI()
    if (ok !== false) setLocked(true)
  }

  const handleLimparSecaoI = async () => {
    if (!window.confirm('Limpar todos os campos da Seção I? Os dados serão apagados imediatamente do banco.')) return
    // Limpa estado local do autocomplete
    setCredorSel(null); setBuscaCredor('')
    setContratoSel(null); setBuscaContrato('')
    // Limpa todos os campos do formulário
    setOrdemServicoSel(null)
    const patch = {
      credor_sec1: '', cnpj_cpf_credor_sec1: '', contrato_ref: '',
      nro_licitacao_sec1: '', tipo_licitacao_sec1: '',
      secretaria_sec1: '', secretario_nome: '',
      banco_fornecedor: '', ag_fornecedor: '', cc_fornecedor: '',
      data_did: '', mes_referencia: '', objeto: '',
      fonte_recurso: 'PRÓPRIO', valor_did: '', nf_sec1: '',
      cert_sec1_municipal: false, cert_sec1_trabalhista: false,
      cert_sec1_fgts: false, cert_sec1_estadual: false,
      cert_sec1_federal: false, cert_sec1_simples_nac: false,
      ordem_compra_id: '', ordem_ref: '',
    }
    Object.entries(patch).forEach(([k, v]) => set(k, v))
    setItensDid([{ _id: Date.now(), descricao: '', unidade: '', quantidade: '', valor_unitario: '', valor_total: '' }])
    setLocked(false)
    setTentouSalvar(false)
    // Persiste imediatamente no banco
    if (didId && processoId && processoId !== 'novo') {
      try { await api.post(`/did/processo/${processoId}`, { ...patch, itens_did: [] }) } catch {}
    }
  }

  return (
    <>
      <SectionCard icon={FileText} title="Seção I - Secretaria Geral · Contas Fixas"
        color="bg-gray-800 text-white dark:bg-gray-900">

        {/* ── Ordem de Serviço (seletor principal — pré-preenche toda a seção) ── */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Ordem de Serviço <span className="font-normal text-gray-400 dark:text-slate-500">(opcional — pré-preenche credor, contrato, objeto e itens)</span>
          </label>
          {ordemServicoSel || form.ordem_ref ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-indigo-300 dark:border-indigo-700
                bg-indigo-50 dark:bg-indigo-900/20 flex items-center gap-2 min-w-0">
                <ClipboardList className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
                  {ordemServicoSel?.numero || form.ordem_ref}
                </span>
                {ordemServicoSel?.objeto && (
                  <span className="text-gray-500 text-xs truncate">{ordemServicoSel.objeto.slice(0, 60)}</span>
                )}
                {ordemServicoSel?.valor_total && (
                  <span className="ml-auto text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                    {parseFloat(ordemServicoSel.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                )}
              </div>
              {!locked && (
                <button type="button" onClick={limparOrdemServico} title="Desvincular ordem"
                  className="p-1.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => !locked && setModalOrdemServico(true)} disabled={locked}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                ${locked
                  ? 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                  : 'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                }`}>
              <ClipboardList className="w-4 h-4" />
              Selecionar Ordem de Serviço
            </button>
          )}
        </div>

        {/* ── Linha 1: N° DID | Credor (autocomplete) ── */}
        <Field label="N° do DID" half>
          <input type="text" value={numeroDIDFmt === 'Carregando...' ? '' : numeroDIDFmt}
            readOnly disabled
            className="input-field text-sm font-mono opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800" />
        </Field>

        <Field label="Credor *" half error={tentouSalvar && !form.credor_sec1 ? 'Selecione o credor' : ''}>
          {credorSel ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-green-300 dark:border-green-700
                bg-green-50 dark:bg-green-900/20 flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">{credorSel.razao_social}</span>
              </div>
              {!locked && (
                <button type="button" onClick={limparCredor}
                  className="p-1.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                  title="Trocar credor">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={buscaCredor}
                onChange={e => { setBuscaCredor(e.target.value); setDropdownCredor(true) }}
                onFocus={() => !locked && setDropdownCredor(true)}
                onBlur={() => setTimeout(() => setDropdownCredor(false), 180)}
                disabled={locked}
                placeholder="Buscar credor cadastrado..."
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none${locked ? ' opacity-60 cursor-not-allowed' : ''}`}
              />
              {dropdownCredor && (
                <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  {buscandoCredores ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                    </div>
                  ) : credoresOpts.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-gray-400">
                      {buscaCredor.trim() ? 'Nenhum credor encontrado para esta busca.' : 'Nenhum credor cadastrado.'}
                    </p>
                  ) : credoresOpts.map((cr, i) => (
                    <button key={cr.id ?? i} type="button" onMouseDown={() => selecionarCredor(cr)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{cr.razao_social}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{cr.cnpj_cpf}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        {/* ── Linha 2: CNPJ (bloqueado) | Contrato (filtrado pelo credor) ── */}
        <Field label="CNPJ / CPF do Credor" half error={tentouSalvar && !form.cnpj_cpf_credor_sec1 ? 'Campo obrigatório' : ''}>
          <div className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg border
            bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300
            ${credorSel ? 'border-gray-200 dark:border-gray-600' : 'border-dashed border-gray-200 dark:border-gray-700'}`}>
            {credorSel && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            <span className="font-mono">{form.cnpj_cpf_credor_sec1 || '—'}</span>
          </div>
        </Field>

        <Field label="Contrato *" half error={tentouSalvar && !form.contrato_ref ? 'Selecione o contrato' : ''}>
          {contratoSel ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-green-300 dark:border-green-700
                bg-green-50 dark:bg-green-900/20 flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400 shrink-0">{contratoSel.numero_contrato}</span>
                <span className="text-gray-500 text-xs truncate">{contratoSel.objeto?.slice(0, 30)}</span>
              </div>
              {!locked && (
                <button type="button" onClick={limparContrato}
                  className="p-1.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : locked && form.contrato_ref ? (
            <div className="px-3 py-2 text-sm rounded-lg border border-green-300 dark:border-green-700
              bg-green-50 dark:bg-green-900/20 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{form.contrato_ref}</span>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input value={buscaContrato}
                onChange={e => { setBuscaContrato(e.target.value); setDropdownContrato(true) }}
                onFocus={() => !locked && credorSel && setDropdownContrato(true)}
                onBlur={() => setTimeout(() => setDropdownContrato(false), 150)}
                disabled={locked || !credorSel}
                title={!credorSel ? 'Selecione o credor primeiro' : undefined}
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                  ${(locked || !credorSel) ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
                placeholder={credorSel ? 'Buscar por número ou objeto...' : 'Selecione o credor primeiro'} />
              {dropdownContrato && credorSel && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {contratosFiltrados.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-gray-400">
                      {buscaContrato.trim()
                        ? 'Nenhum contrato encontrado para este credor.'
                        : 'Nenhum contrato cadastrado para este credor.'}
                    </p>
                  ) : contratosFiltrados.map(c => (
                    <button key={c.id} type="button" onMouseDown={() => selecionarContrato(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{c.numero_contrato}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                        <span className="text-xs text-gray-400 ml-auto">{c.tipo_contrato}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{c.objeto}</p>
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
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Banco <span className="font-normal text-gray-400 dark:text-slate-500">(dados do credor)</span>
            </label>
            <Input value={form.banco_fornecedor} onChange={inp('banco_fornecedor')} placeholder="Banco" disabled={locked} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Agência</label>
            <Input value={form.ag_fornecedor} onChange={inp('ag_fornecedor')} placeholder="Agência" disabled={locked} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Conta</label>
            <Input value={form.cc_fornecedor} onChange={inp('cc_fornecedor')} placeholder="Conta" disabled={locked} />
          </div>
        </div>

        {/* ── Linha 3: Secretaria | Secretário ── */}
        <Field label="Secretaria" half error={tentouSalvar && !form.secretaria_sec1 ? 'Campo obrigatório' : ''}>
          <div className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg border
            bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300
            ${camposContratoBloqueados ? 'border-gray-200 dark:border-gray-600' : 'border-dashed border-gray-200 dark:border-gray-700'}`}>
            {camposContratoBloqueados && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            <span>{secDidObj?.nome || form.secretaria_sec1 || secretariaNome || '—'}</span>
          </div>
        </Field>
        <Field label="Secretário Responsável" half error={tentouSalvar && !form.secretario_nome ? 'Selecione o responsável' : ''}>
          {responsaveisDid.length > 0 ? (
            <div className="space-y-1">
              <select value={form.secretario_nome} onChange={inp('secretario_nome')} disabled={locked}
                className={`input-field text-sm${locked ? ' opacity-60 cursor-not-allowed' : ''}`}>
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
                <p className="text-xs text-red-500">Nenhum responsável vigente para {dataRefDid}. Verifique as nomeações cadastradas.</p>
              )}
            </div>
          ) : (
            <Input value={form.secretario_nome} onChange={inp('secretario_nome')} />
          )}
        </Field>

        {/* ── Linha 4: N° Licitação | Tipo Licitação (bloqueados após contrato) ── */}
        <Field label="N° da Licitação *" half error={tentouSalvar && !form.nro_licitacao_sec1 ? 'Campo obrigatório' : ''}>
          <div className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg border
            ${camposContratoBloqueados
              ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'}`}>
            {camposContratoBloqueados && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            {camposContratoBloqueados
              ? <span>{form.nro_licitacao_sec1 || '—'}</span>
              : <input value={form.nro_licitacao_sec1 ?? ''} onChange={inp('nro_licitacao_sec1')}
                  placeholder="Ex: PE 012/2026"
                  className="flex-1 bg-transparent outline-none text-sm" />
            }
          </div>
        </Field>
        <Field label="Tipo de Licitação *" half error={tentouSalvar && !form.tipo_licitacao_sec1 ? 'Campo obrigatório' : ''}>
          {camposContratoBloqueados ? (
            <div className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
              bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{form.tipo_licitacao_sec1 || '—'}</span>
            </div>
          ) : (
            <select value={form.tipo_licitacao_sec1} onChange={inp('tipo_licitacao_sec1')}
              className="input-field text-sm">
              <option value="">Selecione...</option>
              {['Pregão Eletrônico','Pregão Presencial','Tomada de Preços','Concorrência','Convite','Leilão','Dispensa de Licitação','Inexigibilidade'].map(v =>
                <option key={v}>{v}</option>
              )}
            </select>
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
              placeholder={contratoSel ? 'Nenhuma fonte cadastrada no contrato' : 'Selecione um contrato primeiro'}
              disabled={locked || !contratoSel} />
          )}
        </Field>

        {/* ── Objeto ── */}
        <Field label="Objeto *" error={tentouSalvar && !form.objeto ? 'Descreva o objeto' : ''}>
          <Textarea value={form.objeto} onChange={inp('objeto')} placeholder="Descreva o objeto do DID..." disabled={locked} />
        </Field>

        {/* Tabela de Itens — Ordem de Compra (modal) */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-medium ${tentouSalvar && !temItensPreenchidos ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Itens do DID — Ordem de Compra{tentouSalvar && !temItensPreenchidos ? ' — Adicione ao menos um item' : ''}
            </label>
            {!locked && (
              <button type="button" onClick={abrirModal}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors">
                <Plus className="w-3 h-3" /> {temItensPreenchidos ? 'Gerenciar Itens' : 'Adicionar Itens'}
              </button>
            )}
          </div>
          {temItensPreenchidos ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/60">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Descrição</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500 dark:text-gray-400 w-20">Unid.</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-20">Qtd.</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-32">Vlr. Unit.</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-32">Vlr. Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {itensDid.filter(it => it.descricao).map((it, idx) => (
                    <tr key={it._id ?? idx} className="bg-white dark:bg-gray-800">
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">{it.descricao}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{it.unidade || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-300">{it.quantidade || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-300">
                        {it.valor_unitario ? parseFloat(it.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-gray-700 dark:text-gray-300">
                        {it.valor_total ? parseFloat(it.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {!locked && (
                          <button type="button" onClick={() => removeItemDid(idx)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700/60 border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-right">Total</td>
                    <td className="px-3 py-2 text-xs font-bold text-green-700 dark:text-green-400 text-right">
                      {totalItensDid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 py-8 text-center">
              <p className="text-sm text-gray-400">
                {contratoSel ? 'Clique em "Adicionar Itens" para selecionar os itens do contrato.' : 'Selecione um contrato para habilitar a seleção de itens.'}
              </p>
            </div>
          )}
        </div>

        {/* Valor | Mês Referência | NF */}
        <div className="col-span-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {temItensPreenchidos ? 'Valor (calculado dos itens)' : 'Valor (R$)'}
            </label>
            {temItensPreenchidos ? (
              <div className="w-full px-3 py-2 text-sm rounded-lg border border-green-200 dark:border-green-700
                bg-green-50 dark:bg-green-900/20 font-bold text-green-700 dark:text-green-400">
                {totalItensDid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            ) : (
              <Input type="number" value={form.valor_did} onChange={inp('valor_did')} placeholder="0,00" disabled={locked} />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mês de Referência</label>
            <select value={form.mes_referencia || ''} onChange={inp('mes_referencia')} disabled={locked}
              className={`input-field text-sm${locked ? ' opacity-60 cursor-not-allowed' : ''}`}>
              <option value="">Selecione...</option>
              {mesReferenciaOpcoes.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">NF (número)</label>
            <Input type="number" value={form.nf_sec1} onChange={inp('nf_sec1')} placeholder="Ex: 000123" disabled={locked} />
          </div>
        </div>

        {/* Certidões */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Certidões</label>
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
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/15'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50'
                }`}>
                  {/* Linha do checkbox */}
                  <label className={`flex items-center gap-2 text-sm select-none mb-2
                    ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    ${form[key] ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                    <input type="checkbox" checked={!!form[key]}
                      onChange={e => set(key, e.target.checked)} disabled={locked}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60" />
                    {label}
                  </label>

                  {/* Área de arquivo */}
                  {arq ? (
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 min-w-0" title={arq.nome}>
                        {arq.nome}
                      </span>
                      <button type="button" onClick={() => verCertidao(certKey)} title="Ver arquivo"
                        className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      {!locked && (
                        <button type="button" onClick={() => removerCertidao(certKey)} title="Remover arquivo"
                          className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0">
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
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
        <div className="col-span-2 flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-1">
          {!readOnly && (
            <button type="button" onClick={handleLimparSecaoI}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg text-sm font-semibold transition-colors">
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
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar Seção I
            </button>
          ))}
        </div>

      </SectionCard>

      {modalItens && (
        <ModalItensContrato
          contrato={contratoSel}
          itensDid={itensDid}
          stockData={stockData}
          almStockData={almStockData}
          loadingStock={loadingStock}
          onConfirm={novosItens => { setItensDid(novosItens); setModalItens(false) }}
          onClose={() => setModalItens(false)}
        />
      )}
      {modalOrdemServico && (
        <ModalOrdemServico
          onConfirm={selecionarOrdemServico}
          onClose={() => setModalOrdemServico(false)}
        />
      )}
    </>
  )
}
