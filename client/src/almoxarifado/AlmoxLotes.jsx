import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Package, RefreshCw, ChevronLeft, ChevronRight,
  Calendar, FileText, Truck, AlertTriangle, X, Upload, CheckCircle2,
  QrCode, Key, ShieldAlert
} from 'lucide-react'
import api from '../services/api'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, today } from './almoxConstants'

// ─── Badge de validade ────────────────────────────────────────────────────────
function ValidadeBadge({ data }) {
  if (!data) return <span className="text-xs text-gray-400">—</span>
  const dias = Math.ceil((new Date(data) - new Date()) / 86400000)
  const cls = dias < 0   ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            : dias <= 30 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            :               'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {dias < 0 ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
      {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}
      {dias < 0 ? ' (vencido)' : dias <= 30 ? ` (+${dias}d)` : ''}
    </span>
  )
}

// ─── Modal: Nova Entrada (Lote) ───────────────────────────────────────────────
function NovaEntradaModal({ itens, onClose, onSave, saving, erro }) {
  const [form, setForm] = useState({
    item_id: '',
    quantidade: '',
    valor_unitario: '',
    data_entrada: today(),
    data_validade: '',
    numero_empenho: '',
    numero_nf: '',
    chave_nfe: '',
    numero_contrato: '',
    fornecedor_cnpj: '',
    fornecedor_nome: '',
    conferencia_cega_qtd: '',
    observacao: ''
  })
  const [importando, setImportando] = useState(false)
  const [msgImport, setMsgImport]   = useState('')
  const fileRef = useRef(null)

  // ── NFS-e ─────────────────────────────────────────────────────────────────
  const [nfseInput,     setNfseInput]     = useState('')
  const [nfseLoading,   setNfseLoading]   = useState(false)
  const [nfseErro,      setNfseErro]      = useState('')   // '' | mensagem de erro (incluindo TOMADOR_INVALIDO)
  const [nfseAviso,     setNfseAviso]     = useState('')
  const [nfseOk,        setNfseOk]        = useState(false)

  const consultarNFSe = async () => {
    if (!nfseInput.trim()) return
    setNfseLoading(true); setNfseErro(''); setNfseAviso(''); setNfseOk(false)
    try {
      const payload = nfseInput.includes('http') || nfseInput.includes('://')
        ? { qrcode_url: nfseInput.trim() }
        : { chave: nfseInput.trim() }
      const { data } = await api.post('/almoxarifado/nfse/consultar', payload)

      // Preenche campos do formulario com os dados mapeados
      setForm(f => ({
        ...f,
        fornecedor_cnpj:  data.fornecedor_cnpj_fmt || data.fornecedor_cnpj || f.fornecedor_cnpj,
        fornecedor_nome:  data.fornecedor_nome     || f.fornecedor_nome,
        data_entrada:     data.data_emissao        || f.data_entrada,
        chave_nfse:       data.chave_nfse          || data.chave           || f.chave_nfse,
        numero_nfse:      data.numero_nfse         || f.numero_nfse,
        valor_unitario:   data.valor_total > 0 ? String(data.valor_total) : f.valor_unitario,
        observacao:       data.descricao_servico   || f.observacao,
      }))

      if (data._aviso) setNfseAviso(data._aviso)
      setNfseOk(true)
    } catch (err) {
      const code = err?.response?.data?.code
      const apiMsg = err?.response?.data?.error || err.message || 'Erro ao consultar NFS-e'
      if (code === 'NFSE_AUTH_REQUIRED') {
        setNfseErro('A API NFS-e Nacional requer autenticação.\nConfigure NFSE_API_TOKEN no servidor (server/.env) com o token OAuth2 obtido em nfse.gov.br')
      } else {
        setNfseErro(apiMsg)
      }
    } finally {
      setNfseLoading(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const itemSelecionado = itens.find(i => i.id === form.item_id)

  const handleXmlFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setMsgImport('')
    try {
      const xmlContent = await file.text()
      const { data } = await api.post('/almoxarifado/nfe/importar', { xmlContent })
      setForm(f => ({
        ...f,
        numero_nf:       data.numero_nf      || f.numero_nf,
        chave_nfe:       data.chave_nfe      || f.chave_nfe,
        fornecedor_nome: data.fornecedor_nome || f.fornecedor_nome,
        fornecedor_cnpj: data.fornecedor_cnpj || f.fornecedor_cnpj,
        valor_unitario:  data.itens?.[0]?.valor_unitario || f.valor_unitario,
      }))
      setMsgImport(`NF-e ${data.numero_nf || ''} importada com ${data.itens?.length || 0} item(ns)`)
    } catch (err) {
      setMsgImport('Erro ao importar XML: ' + (err?.response?.data?.error || err.message))
    } finally { setImportando(false) }
  }

  return (
    <AlmoxModal title="Registrar Entrada de Material" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Importar XML NF-e */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <Upload className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Importar XML de NF-e (preenche campos automaticamente)</p>
            {msgImport && <p className="text-xs mt-0.5 text-blue-600 dark:text-blue-400">{msgImport}</p>}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importando}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {importando ? 'Lendo...' : 'Escolher XML'}
          </button>
          <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={handleXmlFile} />
        </div>

        {/* Consultar NFS-e por Chave ou QR Code */}
        <div className={`p-3 border rounded-lg space-y-2 ${
          nfseErro
            ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700'
            : nfseOk
            ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700'
            : 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700'
        }`}>
          <div className="flex items-center gap-2">
            <QrCode className={`h-4 w-4 flex-shrink-0 ${nfseErro ? 'text-red-500' : nfseOk ? 'text-green-500' : 'text-violet-500'}`} />
            <p className={`text-xs font-medium ${nfseErro ? 'text-red-700 dark:text-red-300' : nfseOk ? 'text-green-700 dark:text-green-300' : 'text-violet-700 dark:text-violet-300'}`}>
              Consultar NFS-e por Chave de Acesso ou QR Code
            </p>
            {nfseOk && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
          </div>

          <div className="flex gap-2">
            <input
              value={nfseInput}
              onChange={e => { setNfseInput(e.target.value); setNfseErro(''); setNfseOk(false) }}
              onKeyDown={e => e.key === 'Enter' && consultarNFSe()}
              placeholder="Cole a URL do QR Code ou a chave de acesso numerica..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 font-mono"
            />
            <button
              type="button"
              onClick={consultarNFSe}
              disabled={nfseLoading || !nfseInput.trim()}
              className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Key className="h-3 w-3" />
              {nfseLoading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>

          {/* Erro de tomador invalido — destaque especial */}
          {nfseErro && (
            <div className="flex items-start gap-2 mt-1">
              <ShieldAlert className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400 whitespace-pre-line font-medium">{nfseErro}</p>
            </div>
          )}

          {/* Aviso de modo demo */}
          {nfseAviso && !nfseErro && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{nfseAviso}</p>
          )}
        </div>

        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">
            {erro}
          </div>
        )}

        {/* Item + Quantidade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item *</label>
            <select
              value={form.item_id}
              onChange={e => {
                const it = itens.find(i => i.id === e.target.value)
                set('item_id', e.target.value)
                if (it) set('valor_unitario', it.valor_unitario || '')
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Selecione o item...</option>
              {itens.map(i => (
                <option key={i.id} value={i.id}>{i.codigo} — {i.nome} ({i.unidade})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantidade * {itemSelecionado ? `(${itemSelecionado.unidade})` : ''}
            </label>
            <input
              type="number" step="0.001" min="0.001"
              value={form.quantidade}
              onChange={e => set('quantidade', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Unitário (R$)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.valor_unitario}
              onChange={e => set('valor_unitario', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Entrada *</label>
            <input
              type="date"
              value={form.data_entrada}
              onChange={e => set('data_entrada', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data de Validade <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={form.data_validade}
              onChange={e => set('data_validade', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Empenho / NF / Contrato */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número do Empenho *</label>
            <input
              value={form.numero_empenho}
              onChange={e => set('numero_empenho', e.target.value)}
              placeholder="ex: 2026NE001234"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número da NF</label>
            <input
              value={form.numero_nf}
              onChange={e => set('numero_nf', e.target.value)}
              placeholder="ex: 000123"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chave NF-e (44 dígitos)</label>
            <input
              value={form.chave_nfe}
              onChange={e => set('chave_nfe', e.target.value)}
              placeholder="00000000000000000000000000000000000000000000"
              maxLength={44}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número do Contrato</label>
            <input
              value={form.numero_contrato}
              onChange={e => set('numero_contrato', e.target.value)}
              placeholder="ex: 001/2026"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ do Fornecedor</label>
            <input
              value={form.fornecedor_cnpj}
              onChange={e => set('fornecedor_cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Fornecedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor</label>
          <input
            value={form.fornecedor_nome}
            onChange={e => set('fornecedor_nome', e.target.value)}
            placeholder="Razão social ou nome"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Conferência Cega */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Conferência Cega — Qtd contada <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.001" min="0"
              value={form.conferencia_cega_qtd}
              onChange={e => set('conferencia_cega_qtd', e.target.value)}
              placeholder="Qtd contada fisicamente"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
            {form.conferencia_cega_qtd && form.quantidade && (
              parseFloat(form.conferencia_cega_qtd) === parseFloat(form.quantidade)
                ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" title="Qtds conferem" />
                : <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" title="Divergência!" />
            )}
          </div>
          {form.conferencia_cega_qtd && form.quantidade &&
            parseFloat(form.conferencia_cega_qtd) !== parseFloat(form.quantidade) && (
            <p className="text-xs text-red-600 mt-1">
              Divergência: NF={fmt(form.quantidade)}, contado={fmt(form.conferencia_cega_qtd)}
            </p>
          )}
        </div>

        {/* Observação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação</label>
          <textarea
            value={form.observacao}
            onChange={e => set('observacao', e.target.value)}
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        {/* Total previsto */}
        {form.quantidade && form.valor_unitario && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2 text-sm">
            <strong>Total do lote:</strong>{' '}
            <span className="text-amber-700 dark:text-amber-300 font-semibold">
              {fmtMoney(parseFloat(form.quantidade) * parseFloat(form.valor_unitario))}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.item_id || !form.quantidade || !form.data_entrada}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Registrando...' : 'Registrar Entrada'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxLotes() {
  const [lotes,    setLotes]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [itens,    setItens]    = useState([])
  const [novaModal,setNovaModal]= useState(false)
  const [saving,   setSaving]   = useState(false)
  const [erro,     setErro]     = useState('')
  const [filtroItem, setFiltroItem] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('true')
  const PER_PAGE = 30

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: PER_PAGE }
      if (filtroItem)  params.item_id = filtroItem
      if (filtroAtivo) params.ativo   = filtroAtivo
      const { data } = await api.get('/almoxarifado/lotes', { params })
      setLotes(data.lotes)
      setTotal(data.total)
    } catch { } finally { setLoading(false) }
  }, [filtroItem, filtroAtivo])

  useEffect(() => {
    api.get('/almoxarifado/itens').then(r => setItens(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const handleSave = async (form) => {
    setSaving(true); setErro('')
    try {
      await api.post('/almoxarifado/lotes', form)
      setNovaModal(false)
      load(1)
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao registrar entrada')
    } finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={filtroItem}
            onChange={e => { setFiltroItem(e.target.value); setPage(1) }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos os itens</option>
            {itens.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.nome}</option>)}
          </select>
          <select
            value={filtroAtivo}
            onChange={e => { setFiltroAtivo(e.target.value); setPage(1) }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="true">Com saldo</option>
            <option value="">Todos os lotes</option>
          </select>
          <button onClick={() => load(page)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => { setNovaModal(true); setErro('') }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Entrada
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Item', 'Empenho / NF', 'Fornecedor', 'Entrada', 'Validade', 'Qtd Inicial', 'Saldo', 'Valor Unit.'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {lotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Nenhum lote encontrado
                  </td>
                </tr>
              )}
              {lotes.map(lote => {
                const pct = lote.quantidade_inicial > 0
                  ? (parseFloat(lote.quantidade_atual) / parseFloat(lote.quantidade_inicial)) * 100
                  : 0
                return (
                  <tr key={lote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{lote.item?.nome || '—'}</p>
                      <p className="text-xs text-gray-400">{lote.item?.codigo} · {lote.item?.categoria}</p>
                    </td>
                    <td className="px-4 py-3">
                      {lote.numero_empenho && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <FileText className="h-3 w-3" /> {lote.numero_empenho}
                        </div>
                      )}
                      {lote.numero_nf && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          NF {lote.numero_nf}
                        </div>
                      )}
                      {lote.numero_contrato && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          Contrato {lote.numero_contrato}
                        </div>
                      )}
                      {lote.chave_nfe && (
                        <div className="text-xs text-gray-400 font-mono truncate max-w-[180px]" title={lote.chave_nfe}>
                          {lote.chave_nfe.slice(0, 12)}...
                        </div>
                      )}
                      {lote.conferencia_cega_ok === false && (
                        <div className="flex items-center gap-1 text-xs text-red-500">
                          <AlertTriangle className="h-3 w-3" /> Diverg. cega
                        </div>
                      )}
                      {!lote.numero_empenho && !lote.numero_nf && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lote.fornecedor_nome ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                          <Truck className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{lote.fornecedor_nome}</span>
                        </div>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {lote.data_entrada ? new Date(lote.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ValidadeBadge data={lote.data_validade} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">
                      {fmt(lote.quantidade_inicial)} {lote.item?.unidade}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">
                        {fmt(lote.quantidade_atual)} {lote.item?.unidade}
                      </div>
                      {/* Barra de progresso do saldo */}
                      <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden w-20">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 50 ? 'bg-green-500' : pct > 15 ? 'bg-orange-400' : 'bg-red-500'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">
                      {fmtMoney(lote.valor_unitario)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total: {total} lotes</span>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm">{page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {novaModal && (
        <NovaEntradaModal
          itens={itens}
          onClose={() => setNovaModal(false)}
          onSave={handleSave}
          saving={saving}
          erro={erro}
        />
      )}
    </div>
  )
}
