import { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, Search, X, Check, CheckCircle, Pencil, Loader2 } from 'lucide-react'
import { Field, Input, Textarea, SectionCard } from '../didShared'
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
            <div className="flex-1 overflow-y-auto">
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

// ─── Seção I — Contas Fixas ───────────────────────────────────────────────────
export default function DidFixasSecaoI({
  form, set, inp,
  itensDid, setItensDid, removeItemDid,
  numeroDIDFmt,
  secretariasApi,
  secDidObj, responsaveisDid, dataRefDid,
  secretariaNome,
  didId,
  onSaveSecaoI,
  saving,
}) {
  const [contratos, setContratos] = useState([])
  const [credoresStorage, setCredoresStorage] = useState([])
  useEffect(() => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
    api.get('/contratos/credores').then(r => setCredoresStorage(r.data)).catch(() => {})
  }, [])
  const [contratoSel, setContratoSel] = useState(null)
  const [buscaContrato, setBuscaContrato] = useState('')
  const [dropdownContrato, setDropdownContrato] = useState(false)
  const [modalItens, setModalItens] = useState(false)
  const [stockData, setStockData] = useState({})
  const [almStockData, setAlmStockData] = useState({})
  const [loadingStock, setLoadingStock] = useState(false)
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  useEffect(() => {
    if (form.contrato_ref && !contratoSel) {
      const c = contratos.find(c => c.numero_contrato === form.contrato_ref)
      if (c) { setContratoSel(c); setBuscaContrato(c.numero_contrato) }
    }
  }, [form.contrato_ref])

  const contratosFiltrados = (() => {
    const q = buscaContrato.trim().toLowerCase()
    const lista = contratos.filter(c => c.status !== 'EXCLUÍDO')
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
    const credor = credoresStorage.find(cr => cr.id === c.credor_id)
    const dataRef = form.data_did || new Date().toISOString().slice(0, 10)
    const gestor = getResponsavelVigente(c.secretaria || '', dataRef)
    set('contrato_ref', c.numero_contrato || '')
    set('credor_sec1', credor?.razao_social || '')
    set('cnpj_cpf_credor_sec1', credor?.cnpj_cpf || '')
    set('objeto', c.objeto || form.objeto)
    set('nro_licitacao_sec1', c.numero_licitacao || '')
    set('tipo_licitacao_sec1', c.modalidade || '')
    set('valor_did', '')
    set('secretaria_sec1', c.secretaria || '')
    set('secretario_nome', gestor)
    setItensDid([{ _id: 1, descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])
  }

  const limparContrato = () => {
    setContratoSel(null)
    setBuscaContrato('')
    set('contrato_ref', '')
    set('secretaria_sec1', '')
    set('secretario_nome', '')
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
    if (!onSaveSecaoI) { setLocked(true); return }
    const ok = await onSaveSecaoI()
    if (ok !== false) setLocked(true)
  }

  return (
    <>
      <SectionCard icon={FileText} title="Seção I - Secretaria Geral · Contas Fixas"
        color="bg-gray-800 text-white dark:bg-gray-900">

        {/* N° DID | Contrato */}
        <Field label="N° do DID" half>
          <input type="text" inputMode="numeric" value={form.numero_did ?? ''}
            onChange={e => inp('numero_did')({ target: { value: e.target.value.replace(/\D/g, '') } })}
            disabled={locked} placeholder="Ex: 123"
            className={`input-field text-sm font-mono${locked ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`} />
        </Field>
        <Field label="Contrato *" half>
          {contratoSel ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-green-300 dark:border-green-700
                bg-green-50 dark:bg-green-900/20 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400 shrink-0">{contratoSel.numero_contrato}</span>
                <span className="text-gray-500 text-xs truncate">{contratoSel.objeto?.slice(0, 35)}</span>
              </div>
              {!locked && (
                <button type="button" onClick={limparContrato}
                  className="p-1.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={buscaContrato}
                onChange={e => { setBuscaContrato(e.target.value); setDropdownContrato(true) }}
                onFocus={() => !locked && setDropdownContrato(true)}
                onBlur={() => setTimeout(() => setDropdownContrato(false), 150)}
                disabled={locked}
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none${locked ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
                placeholder="Buscar por número ou objeto..." />
              {dropdownContrato && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {contratosFiltrados.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-gray-400">
                      {buscaContrato.trim() ? 'Nenhum contrato encontrado.' : 'Nenhum contrato cadastrado.'}
                    </p>
                  ) : contratosFiltrados.map(c => {
                    const credor = credoresStorage.find(cr => cr.id === c.credor_id)
                    return (
                      <button key={c.id} type="button" onMouseDown={() => selecionarContrato(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{c.numero_contrato}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                          <span className="text-xs text-gray-400 ml-auto">{c.tipo_contrato}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{c.objeto}</p>
                        {credor && <p className="text-xs text-gray-400 truncate mt-0.5">{credor.razao_social}</p>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Field>

        {/* Secretaria | Secretário */}
        <Field label="Secretaria" half>
          <div className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
            bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {secDidObj?.nome || form.secretaria_sec1 || secretariaNome || '—'}
          </div>
        </Field>
        <Field label="Secretário Responsável" half>
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

        {/* N° Licitação | Tipo */}
        <Field label="N° da Licitação *" half>
          <Input value={form.nro_licitacao_sec1} onChange={inp('nro_licitacao_sec1')} placeholder="Ex: PE 012/2026" disabled={locked} />
        </Field>
        <Field label="Tipo de Licitação *" half>
          <select value={form.tipo_licitacao_sec1} onChange={inp('tipo_licitacao_sec1')} disabled={locked}
            className={`input-field text-sm${locked ? ' opacity-60 cursor-not-allowed' : ''}`}>
            <option value="">Selecione...</option>
            {['Pregão Eletrônico','Pregão Presencial','Tomada de Preços','Concorrência','Convite','Leilão','Dispensa de Licitação','Inexigibilidade'].map(v =>
              <option key={v}>{v}</option>
            )}
          </select>
        </Field>

        {/* Credor | CNPJ/CPF */}
        <Field label="Credor" half>
          <Input value={form.credor_sec1} onChange={inp('credor_sec1')} disabled={locked} />
        </Field>
        <Field label="CNPJ / CPF do Credor" half>
          <Input value={form.cnpj_cpf_credor_sec1} onChange={inp('cnpj_cpf_credor_sec1')} placeholder="Ex: 00.000.000/0001-00" disabled={locked} />
        </Field>

        {/* Data | Fonte de Recurso */}
        <Field label="Data" half>
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

        {/* Objeto */}
        <Field label="Objeto *">
          <Textarea value={form.objeto} onChange={inp('objeto')} placeholder="Descreva o objeto do DID..." disabled={locked} />
        </Field>

        {/* Tabela de Itens — Ordem de Compra (modal) */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Itens do DID — Ordem de Compra
            </label>
            {!locked && (
              <button type="button" onClick={abrirModal}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors">
                <Plus className="w-3 h-3" /> {temItensPreenchidos ? 'Gerenciar Itens' : 'Adicionar Itens'}
              </button>
            )}
          </div>
          {temItensPreenchidos ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
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
        <Field label="Certidões">
          <div className="flex flex-wrap gap-5 pt-1">
            {[
              { key: 'cert_sec1_municipal',   label: 'Municipal' },
              { key: 'cert_sec1_trabalhista', label: 'Trabalhista' },
              { key: 'cert_sec1_fgts',        label: 'FGTS' },
              { key: 'cert_sec1_estadual',    label: 'Estadual' },
              { key: 'cert_sec1_federal',     label: 'Federal' },
            ].map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-2 text-sm select-none
                ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                ${form[key] ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                <input type="checkbox" checked={!!form[key]}
                  onChange={e => set(key, e.target.checked)} disabled={locked}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60" />
                {label}
              </label>
            ))}
          </div>
        </Field>

        {/* Botões */}
        <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-1">
          {locked ? (
            <button type="button" onClick={() => setLocked(false)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <Pencil className="w-3.5 h-3.5" /> Alterar
            </button>
          ) : (
            <button type="button" onClick={handleSalvarSecaoI}
              disabled={!secaoICompleta || saving}
              title={!secaoICompleta ? 'Preencha todos os campos obrigatórios para salvar' : 'Salvar e bloquear Seção I'}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar Seção I
            </button>
          )}
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
    </>
  )
}
