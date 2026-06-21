import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, RefreshCw, X,
  CheckCircle, Clock, AlertTriangle, XCircle, Package,
  Send, Truck, ShieldCheck, Key, Zap, ClipboardList, Eye, Printer, Lock
} from 'lucide-react'
import api from '../services/api'
import LoadingBar from '../components/LoadingBar'
import { gerarRequisicaoAlmoxPDF } from '../utils/gerarDocumentoPDF'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, STATUS_REQ, PRIORIDADE } from './almoxConstants'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'
import ActionBar from '../components/ui/ActionBar'

// ─── Ícones por status ────────────────────────────────────────────────────────
const STATUS_ICONS = {
  RASCUNHO:             Clock,
  PENDENTE_AUTORIZACAO: Clock,
  AUTORIZADA:           ShieldCheck,
  EM_SEPARACAO:         Package,
  ENTREGUE:             CheckCircle,
  CANCELADA:            XCircle,
  // legado
  PENDENTE:             Clock,
  APROVADA:             CheckCircle,
  PARCIAL:              AlertTriangle,
  ATENDIDA:             CheckCircle,
}

// ─── Stepper de fluxo ─────────────────────────────────────────────────────────
const STEPS = [
  { key: 'PENDENTE_AUTORIZACAO', label: 'Aguardando' },
  { key: 'AUTORIZADA',           label: 'Autorizada'  },
  { key: 'EM_SEPARACAO',         label: 'Separação'   },
  { key: 'ENTREGUE',             label: 'Entregue'    },
]

function StatusStepper({ status }) {
  const st = STATUS_REQ[status]
  if (!st || st.step < 0) return null  // CANCELADA não mostra stepper
  const currentStep = st.step ?? 0
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done    = STATUS_REQ[s.key]?.step <= currentStep && currentStep > 0
        const current = s.key === status || (status === 'PENDENTE' && s.key === 'PENDENTE_AUTORIZACAO')
        return (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
              done    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              current ? STATUS_REQ[s.key]?.color || 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            }`}>
              {done ? <CheckCircle className="h-3 w-3" /> : null}
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 mx-0.5 rounded ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Passo de Assinatura Eletrônica (reutilizável) ───────────────────────────
function AssinaturaStep({ resumo, onConfirm, onBack, saving, erro }) {
  const [senha, setSenha] = useState('')
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Assinatura Eletrônica</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            Para garantir a autenticidade e rastreabilidade, confirme com sua senha.
          </p>
        </div>
      </div>
      {resumo && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm space-y-1 text-gray-700 dark:text-gray-300">
          {resumo}
        </div>
      )}
      {erro && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Digite sua senha para confirmar *
        </label>
        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && senha && onConfirm(senha)}
          placeholder="••••••••"
          autoFocus
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Sua senha será verificada para gerar a assinatura digital.</p>
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} disabled={saving} className="btn-secondary text-sm">Voltar</button>
        <button onClick={() => onConfirm(senha)} disabled={saving || !senha}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Lock className="h-4 w-4" /> {saving ? 'Assinando...' : 'Assinar e Confirmar'}
        </button>
      </div>
    </div>
  )
}

// ─── Modal: Nova Requisição ───────────────────────────────────────────────────
function NovaRequisicaoModal({ setores, secretarias, onClose, onSave, saving, erro }) {
  const today = () => new Date().toISOString().slice(0, 10)
  const [step,            setStep]           = useState(1) // 1: form, 2: assinatura
  const [secretaria_id,   setSecretariaId]   = useState('')
  const [setor_id,        setSetorId]        = useState('')
  const [prioridade,      setPrioridade]     = useState('NORMAL')
  const [data_solicitacao, setDataSolicitacao] = useState(today())
  const [observacao,      setObservacao]     = useState('')
  const [linhas,          setLinhas]         = useState([])
  const [itensSecretaria, setItensSecretaria] = useState([])
  const [loadingItens,    setLoadingItens]   = useState(false)
  const [buscaItem,       setBuscaItem]      = useState('')

  const setoresFiltrados = secretaria_id
    ? setores.filter(s => s.secretaria_id === secretaria_id || s.secretariaId === secretaria_id)
    : []

  const handleSecretariaChange = async (e) => {
    const id = e.target.value
    setSecretariaId(id)
    setSetorId('')
    setLinhas([])
    setBuscaItem('')
    setItensSecretaria([])
    if (!id) return
    const sec = secretarias.find(s => String(s.id) === String(id))
    if (!sec) return
    setLoadingItens(true)
    try {
      const { data } = await api.get('/almoxarifado/estoque', { params: { secretaria: sec.nome } })
      setItensSecretaria(data)
    } catch { } finally { setLoadingItens(false) }
  }

  const itensFiltrados = buscaItem.trim()
    ? itensSecretaria.filter(it =>
        it.nome?.toLowerCase().includes(buscaItem.toLowerCase()) ||
        it.codigo?.toLowerCase().includes(buscaItem.toLowerCase())
      )
    : itensSecretaria

  const toggleItem = (item) => {
    setLinhas(prev => {
      const exists = prev.find(l => l.item_id === item.id)
      if (exists) return prev.filter(l => l.item_id !== item.id)
      return [...prev, { item_id: item.id, _item: item, quantidade_solicitada: '', observacao: '' }]
    })
  }

  const setLinha = (item_id, k, v) =>
    setLinhas(prev => prev.map(l => {
      if (l.item_id !== item_id) return l
      if (k === 'quantidade_solicitada') {
        const it = l._item || itensSecretaria.find(i => i.id === item_id)
        const max = parseFloat(it?.estoque_atual) || Infinity
        const val = v === '' ? '' : Math.min(parseFloat(v) || 0, max)
        return { ...l, [k]: val === '' ? '' : String(val) }
      }
      return { ...l, [k]: v }
    }))

  const temExcesso = linhas.some(l => {
    const it = l._item || itensSecretaria.find(i => i.id === l.item_id)
    return parseFloat(l.quantidade_solicitada) > parseFloat(it?.estoque_atual || 0)
  })

  const handleSave = (senhaConfirmacao) => {
    if (temExcesso) return
    const itensValidos = linhas.filter(l => l.item_id && l.quantidade_solicitada)
    onSave({ setor_id, secretaria_id: secretaria_id || null, prioridade, data_solicitacao, observacao, itens: itensValidos, senhaConfirmacao })
  }

  const secretariaNome = secretarias.find(s => String(s.id) === String(secretaria_id))?.nome
  const secNome = secretarias.find(s => String(s.id) === String(secretaria_id))?.nome
  const setorNome = setores.find(s => String(s.id) === String(setor_id))?.nome

  if (step === 2) {
    return (
      <AlmoxModal title="Assinatura Eletrônica — Requisição" onClose={onClose}>
        <AssinaturaStep
          resumo={<>
            <p><strong>Secretaria:</strong> {secNome || '—'}</p>
            <p><strong>Setor:</strong> {setorNome || '—'}</p>
            <p><strong>Itens:</strong> {linhas.filter(l => l.quantidade_solicitada).length}</p>
          </>}
          onConfirm={handleSave}
          onBack={() => setStep(1)}
          saving={saving}
          erro={erro}
        />
      </AlmoxModal>
    )
  }

  return (
    <AlmoxModal title="Nova Requisição de Material" onClose={onClose} fullscreen>
      {/* layout em duas colunas: esquerda = catálogo, direita = carrinho */}
      <div className="flex flex-col h-full gap-0 -m-6">

        {/* ── cabeçalho de configuração ─────────────────────────────────── */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {erro && (
            <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
          )}
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Secretaria *</label>
              <select value={secretaria_id} onChange={handleSecretariaChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Setor Solicitante *</label>
              <select value={setor_id} onChange={e => setSetorId(e.target.value)}
                disabled={!secretaria_id}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">{secretaria_id ? 'Selecione...' : '— selecione a secretaria —'}</option>
                {setoresFiltrados.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data da Requisição *</label>
              <input type="date" value={data_solicitacao} onChange={e => setDataSolicitacao(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prioridade</label>
              <select value={prioridade} onChange={e => setPrioridade(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Observação</label>
              <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* ── corpo em duas colunas ──────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Coluna esquerda: catálogo de itens disponíveis */}
          <div className="flex flex-col w-1/2 border-r border-gray-200 dark:border-gray-700 min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Itens em Estoque {secretariaNome && <span className="normal-case font-normal">— {secretariaNome}</span>}
              </p>
              <input
                value={buscaItem}
                onChange={e => setBuscaItem(e.target.value)}
                placeholder="Buscar item por nome ou código..."
                disabled={!secretaria_id}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {!secretaria_id ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
                  <Package className="h-8 w-8 opacity-30" />
                  Selecione a secretaria para ver o estoque
                </div>
              ) : loadingItens ? (
                <LoadingBar label="Carregando itens..." />
              ) : itensFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-amber-500 text-sm gap-2">
                  <Package className="h-8 w-8 opacity-40" />
                  {buscaItem ? 'Nenhum item encontrado' : 'Nenhum item em estoque para esta secretaria'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-8"></th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estoque</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-12">Unid.</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Localização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {itensFiltrados.map(it => {
                      const selecionado = linhas.some(l => l.item_id === it.id)
                      return (
                        <tr
                          key={it.id}
                          onClick={() => toggleItem(it)}
                          className={`cursor-pointer transition-colors ${selecionado ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}
                        >
                          <td className="px-4 py-2 text-center">
                            <div className={`w-4 h-4 rounded border-2 mx-auto flex items-center justify-center transition-colors ${selecionado ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                              {selecionado && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <p className={`font-medium text-xs ${selecionado ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{it.nome}</p>
                            {it.codigo && <p className="text-xs text-gray-400">{it.codigo}</p>}
                          </td>
                          <td className={`px-4 py-2 text-right font-semibold text-xs tabular-nums ${parseFloat(it.estoque_atual) <= parseFloat(it.estoque_minimo || 0) ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
                            {fmt(it.estoque_atual)}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{it.unidade}</td>
                          <td className="px-4 py-2 text-right text-xs text-gray-400">
                            {[it.corredor, it.prateleira, it.gaveta].filter(Boolean).join('-') || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Coluna direita: carrinho / itens selecionados */}
          <div className="flex flex-col w-1/2 min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Itens Selecionados <span className="ml-1 text-blue-600 dark:text-blue-400">{linhas.length}</span>
              </p>
              {linhas.length > 0 && (
                <button onClick={() => setLinhas([])} className="text-xs text-red-500 hover:text-red-700">Limpar tudo</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {linhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
                  <Send className="h-8 w-8 opacity-30" />
                  Clique nos itens ao lado para adicioná-los
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-28">Quantidade</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Observação</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {linhas.map(l => {
                      const it = l._item || itensSecretaria.find(i => i.id === l.item_id)
                      const estoqueMax = parseFloat(it?.estoque_atual) || 0
                      const qtd = parseFloat(l.quantidade_solicitada) || 0
                      const excede = qtd > estoqueMax
                      return (
                        <tr key={l.item_id}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-xs text-gray-900 dark:text-white">{it?.nome}</p>
                            <p className="text-xs text-gray-400">{it?.codigo} · disponível: <span className="font-medium text-green-600 dark:text-green-400">{fmt(estoqueMax)}</span> {it?.unidade}</p>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number" step="0.001" min="0.001"
                              max={estoqueMax}
                              placeholder="Qtd."
                              value={l.quantidade_solicitada}
                              onChange={e => setLinha(l.item_id, 'quantidade_solicitada', e.target.value)}
                              className={`w-full border rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 ${excede ? 'border-red-400 focus:ring-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                              autoFocus={linhas[linhas.length - 1]?.item_id === l.item_id}
                            />
                            {excede && <p className="text-xs text-red-500 mt-0.5 text-center">máx {fmt(estoqueMax)}</p>}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              placeholder="Opcional"
                              value={l.observacao}
                              onChange={e => setLinha(l.item_id, 'observacao', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => toggleItem({ id: l.item_id })} className="p-1 text-red-400 hover:text-red-600 rounded">
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rodapé com ação */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-700/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {linhas.filter(l => l.quantidade_solicitada).length} de {linhas.length} iten(s) com quantidade
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
                <button onClick={() => setStep(2)}
                  disabled={!setor_id || !secretaria_id || linhas.every(l => !l.quantidade_solicitada) || temExcesso}
                  title={temExcesso ? 'Corrija as quantidades que excedem o estoque' : ''}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  <Send className="h-4 w-4" /> Avançar — Assinar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Autorizar ─────────────────────────────────────────────────────────
function AutorizarModal({ req, onClose, onSave, saving, erro }) {
  const [step, setStep] = useState(1) // 1: revisão, 2: assinatura
  const [resultado, setResultado] = useState(null)

  const handleAutorizar = async (senhaConfirmacao) => {
    const res = await onSave(senhaConfirmacao)
    if (res) setResultado(res)
  }

  if (resultado) {
    return (
      <AlmoxModal title="Requisição Autorizada ✓" onClose={onClose}>
        <div className="text-center space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Requisição <strong>{req.numero}</strong> autorizada. Forneça o token abaixo ao almoxarife no momento da entrega:
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-white dark:bg-gray-800 border-2 border-green-400 rounded-xl px-8 py-4">
                <p className="text-4xl font-mono font-bold tracking-widest text-green-700 dark:text-green-300">
                  {resultado.token_entrega}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Key className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Válido por 24h · Expira em {new Date(resultado.token_expiry).toLocaleString('pt-BR')}
            </p>
          </div>
          <button onClick={onClose} className="btn-primary text-sm w-full">Fechar</button>
        </div>
      </AlmoxModal>
    )
  }

  if (step === 2) {
    return (
      <AlmoxModal title={`Autorizar ${req.numero} — Assinatura`} onClose={onClose}>
        <AssinaturaStep
          resumo={<>
            <p><strong>Requisição:</strong> {req.numero}</p>
            <p><strong>Setor:</strong> {req.setor?.nome}</p>
            <p><strong>Solicitante:</strong> {req.solicitante?.nome}</p>
            <p><strong>Itens:</strong> {req.itens?.length}</p>
          </>}
          onConfirm={handleAutorizar}
          onBack={() => setStep(1)}
          saving={saving}
          erro={erro}
        />
      </AlmoxModal>
    )
  }

  return (
    <AlmoxModal title={`Autorizar ${req.numero}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm space-y-1">
          <p><strong>Setor:</strong> {req.setor?.nome}</p>
          <p><strong>Solicitante:</strong> {req.solicitante?.nome}</p>
          <p><strong>Itens:</strong> {req.itens?.length}</p>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(req.itens || []).map(ri => (
            <div key={ri.id} className="flex justify-between text-sm border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2">
              <span className="text-gray-700 dark:text-gray-300">{ri.item?.nome}</span>
              <span className="font-medium text-gray-900 dark:text-white">{fmt(ri.quantidade_solicitada)} {ri.item?.unidade}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Ao autorizar, o sistema verificará o estoque e gerará um token OTP para confirmação da entrega.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={() => setStep(2)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <ShieldCheck className="h-4 w-4" /> Avançar — Assinar
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Entregar com Token ────────────────────────────────────────────────
function EntregarModal({ req, onClose, onSave, saving, erro }) {
  const [step, setStep] = useState(1) // 1: token, 2: assinatura
  const [token, setToken] = useState('')

  if (step === 2) {
    return (
      <AlmoxModal title={`Entrega ${req.numero} — Assinatura`} onClose={onClose}>
        <AssinaturaStep
          resumo={<>
            <p><strong>Requisição:</strong> {req.numero}</p>
            <p><strong>Token OTP:</strong> <span className="font-mono font-bold">{token}</span></p>
          </>}
          onConfirm={(senha) => onSave(token, senha)}
          onBack={() => setStep(1)}
          saving={saving}
          erro={erro}
        />
      </AlmoxModal>
    )
  }

  return (
    <AlmoxModal title={`Confirmar Entrega — ${req.numero}`} onClose={onClose}>
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
          <p>Insira o token de 6 dígitos fornecido pelo autorizador para confirmar a entrega dos materiais.</p>
          <p className="mt-1 text-xs opacity-70">O estoque será deduzido automaticamente via FIFO/PEPS.</p>
        </div>
        <div className="text-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Token de Entrega</label>
          <input
            type="text" maxLength={6} inputMode="numeric" pattern="[0-9]*"
            value={token}
            onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="text-center text-3xl font-mono tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-xl px-6 py-3 w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={() => setStep(2)} disabled={token.length !== 6}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Truck className="h-4 w-4" /> Avançar — Assinar
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Cancelar ─────────────────────────────────────────────────────────
function CancelarModal({ req, onClose, onSave, saving, erro }) {
  const [justificativa, setJustificativa] = useState('')
  return (
    <AlmoxModal title={`Cancelar Requisição ${req.numero}`} onClose={onClose}>
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Justificativa (opcional)</label>
          <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 resize-none" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Voltar</button>
          <button onClick={() => onSave(justificativa)} disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Visualizar / Imprimir Requisição ──────────────────────────────────
function RequisicaoViewModal({ reqId, onClose }) {
  const { tenant } = useAuth() || {}
  const [req, setReq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    api.get(`/almoxarifado/requisicoes/${reqId}`)
      .then(r => setReq(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [reqId])

  // Limpa a URL do blob ao fechar
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const fmtDate = (v) => v ? new Date(String(v).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtDateTime = (v) => v ? new Date(v).toLocaleString('pt-BR') : '—'

  const handleVerPDF = async () => {
    if (!req || generating) return
    setGenerating(true)
    const url = await gerarRequisicaoAlmoxPDF({ req, tenantNome: tenant?.nome, mode: 'preview' })
    if (url) setPreviewUrl(url)
    setGenerating(false)
  }
  const handleGerarPDF = () => req && gerarRequisicaoAlmoxPDF({ req, tenantNome: tenant?.nome, mode: 'download' })
  const handleImprimir = () => req && gerarRequisicaoAlmoxPDF({ req, tenantNome: tenant?.nome, mode: 'print' })

  const st = req ? STATUS_REQ[req.status] || STATUS_REQ.PENDENTE_AUTORIZACAO : null

  return (
    <AlmoxModal title={`Requisição ${req?.numero || '...'}`} onClose={onClose} fullscreen={!!previewUrl} wide={!previewUrl}>
      {loading ? (
        <LoadingBar label="Carregando requisição..." />
      ) : !req ? (
        <p className="text-center text-gray-500 py-8">Não foi possível carregar a requisição.</p>
      ) : previewUrl ? (
        /* ── Visualização do PDF em iframe ── */
        <div className="flex flex-col h-full -m-6">
          <iframe src={previewUrl} className="flex-1 w-full border-0" title={`PDF ${req.numero}`} />
          <div className="flex justify-end gap-3 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button onClick={() => setPreviewUrl(null)} className="btn-secondary text-sm">Voltar</button>
            <button onClick={handleGerarPDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Eye className="h-4 w-4" /> Baixar PDF
            </button>
            <button onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Cabeçalho */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Número</label>
                <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-base">{req.numero}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Secretaria</label>
                <p className="text-sm text-gray-900 dark:text-white">{req.secretaria?.nome || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Setor Solicitante</label>
                <p className="text-sm text-gray-900 dark:text-white">{req.setor?.nome || '—'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                <p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st?.color}`}>
                    {st?.label}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Data da Solicitação</label>
                <p className="text-sm text-gray-900 dark:text-white">{fmtDate(req.data_solicitacao)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Prioridade</label>
                <p className="text-sm text-gray-900 dark:text-white">{PRIORIDADE[req.prioridade]?.label || req.prioridade || 'Normal'}</p>
              </div>
            </div>
          </div>

          {req.observacao && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">Observação</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{req.observacao}</p>
            </div>
          )}

          {/* Tabela de itens */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Itens Solicitados</p>
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['#', 'Item', 'Qtd. Solicitada', 'Qtd. Entregue', 'Unidade'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(req.itens || []).map((ri, i) => (
                  <tr key={ri.id}>
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                      {ri.item?.nome}
                      {ri.item?.codigo && <span className="ml-1 text-xs text-gray-400">({ri.item.codigo})</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{fmt(ri.quantidade_solicitada)}</td>
                    <td className="px-3 py-2 tabular-nums text-green-700 dark:text-green-400">{ri.quantidade_entregue != null ? fmt(ri.quantidade_entregue) : '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{ri.item?.unidade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Blocos de assinatura */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {[
              { nome: req.solicitante?.nome, papel: 'Solicitante', data: fmtDate(req.data_solicitacao), hash: req.hash_solicitante },
              { nome: req.autorizador?.nome, papel: 'Autorizador', data: req.data_autorizacao ? fmtDateTime(req.data_autorizacao) : '—', hash: req.hash_assinatura },
              { nome: req.atendente?.nome,   papel: 'Entregador',  data: req.data_entrega ? fmtDateTime(req.data_entrega) : '—', hash: req.hash_entrega },
            ].map(({ nome, papel, data, hash }) => (
              <div key={papel} className="text-center">
                <div className="border-t-2 border-gray-400 dark:border-gray-500 pt-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{nome || '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{papel}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{data}</p>
                  {hash ? (
                    <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1.5" title="Chave de autenticação">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Chave de autenticação</p>
                      <p className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all leading-snug">{hash}</p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
                      Aguardando assinatura
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
            <button onClick={handleVerPDF} disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {generating ? 'Gerando...' : 'Ver PDF'}
            </button>
            <button onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </div>
        </>
      )}
    </AlmoxModal>
  )
}

// ─── Linha de Requisição ──────────────────────────────────────────────────────
function ReqRow({ r, onAutorizar, onSeparar, onEntregar, onCancelar, onRegenerarToken, onVisualizar, userTipo }) {
  const st      = STATUS_REQ[r.status] || STATUS_REQ.PENDENTE_AUTORIZACAO
  const StIcon  = STATUS_ICONS[r.status] || Clock
  const priorSt = PRIORIDADE[r.prioridade]

  const podeAutorizar  = ['PENDENTE', 'PENDENTE_AUTORIZACAO'].includes(r.status) && ['admin', 'gestor'].includes(userTipo)
  const podeSeparar    = r.status === 'AUTORIZADA'
  const podeEntregar   = ['AUTORIZADA', 'EM_SEPARACAO'].includes(r.status)
  const podeRegToken   = ['AUTORIZADA', 'EM_SEPARACAO'].includes(r.status) && ['admin', 'gestor'].includes(userTipo)
  const podeCancelar   = !['ENTREGUE', 'ATENDIDA', 'CANCELADA'].includes(r.status)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
      <td className="px-4 py-3">
        <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">{r.numero}</p>
        {priorSt && r.prioridade !== 'NORMAL' && (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 ${priorSt.color}`}>
            <Zap className="h-3 w-3" /> {priorSt.label}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.setor?.nome || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.solicitante?.nome || '—'}</td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        {r.data_solicitacao ? new Date(String(r.data_solicitacao).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        {r.itens?.length || 0}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${st.color}`}>
          <StIcon className="h-3 w-3" /> {st.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={() => onVisualizar(r.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 font-medium">
            <Eye className="h-3 w-3" /> Ver
          </button>
          {podeAutorizar && (
            <button onClick={() => onAutorizar(r)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200 font-medium">
              <ShieldCheck className="h-3 w-3" /> Autorizar
            </button>
          )}
          {podeSeparar && (
            <button onClick={() => onSeparar(r.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded hover:bg-purple-200 font-medium">
              <Package className="h-3 w-3" /> Separar
            </button>
          )}
          {podeEntregar && (
            <button onClick={() => onEntregar(r)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 font-medium">
              <Truck className="h-3 w-3" /> Entregar
            </button>
          )}
          {podeRegToken && (
            <button onClick={() => onRegenerarToken(r.id)}
              title="Regenerar token OTP"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded hover:bg-amber-200 font-medium">
              <Key className="h-3 w-3" /> Token
            </button>
          )}
          {podeCancelar && (
            <button onClick={() => onCancelar(r)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-200 font-medium">
              <XCircle className="h-3 w-3" /> Cancelar
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxRequisicoes() {
  const { user } = useAuth() || {}
  const userTipo = user?.tipo || 'operacional'

  const [reqs,         setReqs]        = useState([])
  const [total,        setTotal]       = useState(0)
  const [page,         setPage]        = useState(1)
  const [loading,      setLoading]     = useState(true)
  const [statusFiltro, setStatusFiltro]= useState('')
  const [novaReq,      setNovaReq]     = useState(false)
  const [autorizando,  setAutorizando] = useState(null)
  const [entregando,   setEntregando]  = useState(null)
  const [cancelando,   setCancelando]  = useState(null)
  const [viewingReqId, setViewingReqId] = useState(null)
  const [setores,      setSetores]     = useState([])
  const [secretarias,  setSecretarias] = useState([])
  const [saving,       setSaving]      = useState(false)
  const [erro,         setErro]        = useState('')
  const PER_PAGE = 20

  const load = useCallback(async (p = 1, st = '') => {
    setLoading(true)
    try {
      const { data } = await api.get('/almoxarifado/requisicoes', {
        params: { page: p, limit: PER_PAGE, status: st }
      })
      setReqs(data.requisicoes)
      setTotal(data.total)
    } catch { } finally { setLoading(false) }
  }, [])

  const loadAux = useCallback(async () => {
    try {
      const [setoresR, secR] = await Promise.all([
        api.get('/organizacao/setores'),
        api.get('/organizacao/secretarias').catch(() => ({ data: [] }))
      ])
      setSetores(setoresR.data?.setores || setoresR.data || [])
      setSecretarias(secR.data?.secretarias || secR.data || [])
    } catch { }
  }, [])

  useEffect(() => { load(page, statusFiltro) }, [load, page, statusFiltro])
  useEffect(() => { loadAux() }, [loadAux])

  const handleCriar = async (form) => {
    setSaving(true); setErro('')
    try {
      await api.post('/almoxarifado/requisicoes', form)
      setNovaReq(false)
      load(1, statusFiltro)
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao criar requisição')
    } finally { setSaving(false) }
  }

  const handleAutorizar = async (senhaConfirmacao) => {
    setSaving(true); setErro('')
    try {
      const { data } = await api.put(`/almoxarifado/requisicoes/${autorizando.id}/autorizar`, { senhaConfirmacao })
      load(page, statusFiltro)
      loadAux()
      return data
    } catch (e) {
      const det = e.response?.data?.detalhes
      setErro((e.response?.data?.error || 'Erro ao autorizar') + (det ? ': ' + det.join('; ') : ''))
      return null
    } finally { setSaving(false) }
  }

  const handleSeparar = async (id) => {
    try {
      await api.put(`/almoxarifado/requisicoes/${id}/separacao`)
      load(page, statusFiltro)
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao iniciar separação')
    }
  }

  const handleEntregar = async (token, senhaConfirmacao) => {
    setSaving(true); setErro('')
    try {
      await api.put(`/almoxarifado/requisicoes/${entregando.id}/entregar`, { token, senhaConfirmacao })
      setEntregando(null)
      load(page, statusFiltro)
      loadAux()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao confirmar entrega')
    } finally { setSaving(false) }
  }

  const handleCancelar = async (justificativa) => {
    setSaving(true); setErro('')
    try {
      await api.put(`/almoxarifado/requisicoes/${cancelando.id}/cancelar`, { justificativa })
      setCancelando(null)
      load(page, statusFiltro)
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao cancelar')
    } finally { setSaving(false) }
  }

  const handleRegenerarToken = async (id) => {
    try {
      const { data } = await api.put(`/almoxarifado/requisicoes/${id}/token`)
      alert(`Novo token gerado: ${data.token_entrega}\nVálido até: ${new Date(data.token_expiry).toLocaleString('pt-BR')}`)
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao regenerar token')
    }
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        eyebrow="Almoxarifado"
        title="Requisições de Material"
        subtitle="Gerencie solicitações de materiais, autorizações e entregas com controle por token OTP"
        actions={
          <ActionBar>
            <button onClick={() => load(page, statusFiltro)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={() => { setNovaReq(true); setErro('') }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Nova Requisição
            </button>
          </ActionBar>
        }
      />

      <FilterBar>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
          <select value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value); setPage(1) }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_REQ).filter(([, v]) => v.step !== undefined).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </FilterBar>

      {loading ? (
        <LoadingBar label="Carregando requisições..." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle icon={ClipboardList} title="Lista de Requisições" subtitle={`${total} requisição(ões)`} />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Número', 'Setor', 'Solicitante', 'Data', 'Itens', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reqs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-0">
                    <EmptyState
                      icon={ClipboardList}
                      title="Nenhuma requisição encontrada"
                      description="Tente ajustar o filtro de status ou crie uma nova requisição."
                    />
                  </td>
                </tr>
              )}
              {reqs.map(r => (
                <ReqRow
                  key={r.id}
                  r={r}
                  userTipo={userTipo}
                  onVisualizar={(id) => setViewingReqId(id)}
                  onAutorizar={(req) => { setAutorizando(req); setErro('') }}
                  onSeparar={handleSeparar}
                  onEntregar={(req) => { setEntregando(req); setErro('') }}
                  onCancelar={(req) => { setCancelando(req); setErro('') }}
                  onRegenerarToken={handleRegenerarToken}
                />
              ))}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total: {total}</span>
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

      {/* Modais */}
      {novaReq && (
        <NovaRequisicaoModal
          setores={setores} secretarias={secretarias}
          onClose={() => setNovaReq(false)}
          onSave={handleCriar} saving={saving} erro={erro}
        />
      )}
      {autorizando && (
        <AutorizarModal
          req={autorizando}
          onClose={() => setAutorizando(null)}
          onSave={handleAutorizar} saving={saving} erro={erro}
        />
      )}
      {entregando && (
        <EntregarModal
          req={entregando}
          onClose={() => setEntregando(null)}
          onSave={handleEntregar} saving={saving} erro={erro}
        />
      )}
      {cancelando && (
        <CancelarModal
          req={cancelando}
          onClose={() => setCancelando(null)}
          onSave={handleCancelar} saving={saving} erro={erro}
        />
      )}
      {viewingReqId && (
        <RequisicaoViewModal
          reqId={viewingReqId}
          onClose={() => setViewingReqId(null)}
        />
      )}
    </div>
  )
}

// ─── Modal: Atender Requisição ────────────────────────────────────────────────
function AtenderRequisicaoModal({ requisicao, itens, onClose, onSave, saving, erro }) {
  const [qtds, setQtds] = useState(
    (requisicao.itens || []).reduce((acc, it) => {
      acc[it.item_id] = String(parseFloat(it.quantidade_solicitada) - parseFloat(it.quantidade_atendida))
      return acc
    }, {})
  )

  const handleSave = () => {
    const itensAtendidos = Object.entries(qtds)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([item_id, quantidade_atendida]) => ({ item_id, quantidade_atendida }))
    onSave({ itens_atendidos: itensAtendidos })
  }

  return (
    <AlmoxModal title={`Atender Requisição ${requisicao.numero}`} onClose={onClose} wide>
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
          <strong>Setor:</strong> {requisicao.setor?.nome} &nbsp;|&nbsp;
          <strong>Solicitante:</strong> {requisicao.solicitante?.nome} &nbsp;|&nbsp;
          <strong>Status:</strong> {STATUS_REQ[requisicao.status]?.label}
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['Item', 'Solicitado', 'Já Atendido', 'Estoque Disp.', 'Qtd. a Entregar'].map(h => (
                <th key={h} className="py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center first:text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {(requisicao.itens || []).map(ri => {
              const itemInfo = itens.find(i => i.id === ri.item_id)
              const pendente = parseFloat(ri.quantidade_solicitada) - parseFloat(ri.quantidade_atendida)
              return (
                <tr key={ri.id}>
                  <td className="py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{ri.item?.nome}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{ri.item?.codigo}</p>
                  </td>
                  <td className="py-3 text-center text-gray-700">
                    {fmt(ri.quantidade_solicitada)} {ri.item?.unidade}
                  </td>
                  <td className="py-3 text-center text-green-600">{fmt(ri.quantidade_atendida)}</td>
                  <td className="py-3 text-center text-blue-600">
                    {itemInfo ? fmt(itemInfo.estoque_atual) : '—'}
                  </td>
                  <td className="py-3 text-center">
                    <input
                      type="number" step="0.001" min="0"
                      max={Math.min(pendente, itemInfo?.estoque_atual || 0)}
                      value={qtds[ri.item_id] || ''}
                      onChange={e => setQtds(q => ({ ...q, [ri.item_id]: e.target.value }))}
                      className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Processando...' : 'Confirmar Entrega'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}
