import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, RefreshCw, X,
  CheckCircle, Clock, AlertTriangle, XCircle, Package,
  Send, ShieldCheck, Zap, ClipboardList, Eye, Printer, Lock
} from 'lucide-react'
import api from '../services/api'
import { Paginacao, usePorPagina } from '../components/ui'
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
  { key: 'PENDENTE_AUTORIZACAO', label: 'Aguardando'  },
  { key: 'AUTORIZADA',           label: 'Autorizada'  },
  { key: 'EM_SEPARACAO',         label: 'Separação'   },
  { key: 'AGUARDANDO_RETIRADA',  label: 'Retirada'    },
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
              done    ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
              current ? STATUS_REQ[s.key]?.color || 'bg-info-100 text-brand-700' :
                        'bg-ink-100 text-ink-400'
            }`}>
              {done ? <CheckCircle className="h-3 w-3" /> : null}
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 mx-0.5 rounded-sm ${done ? 'bg-success-400' : 'bg-ink-200'}`} />
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
      <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-700 rounded-lg p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-brand-600 dark:text-info-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-info-900 dark:text-info-300">Assinatura Eletrônica</p>
          <p className="text-xs text-brand-700 dark:text-info-400 mt-1">
            Para garantir a autenticidade e rastreabilidade, confirme com sua senha.
          </p>
        </div>
      </div>
      {resumo && (
        <div className="bg-ink-50 rounded-lg p-3 text-sm space-y-1 text-ink-700">
          {resumo}
        </div>
      )}
      {erro && (
        <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-danger-700 dark:text-danger-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-2">
          Digite sua senha para confirmar *
        </label>
        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && senha && onConfirm(senha)}
          placeholder="••••••••"
          autoFocus
          className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-ink-400 mt-1">Sua senha será verificada para gerar a assinatura digital.</p>
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} disabled={saving} className="btn-secondary text-sm">Voltar</button>
        <button onClick={() => onConfirm(senha)} disabled={saving || !senha}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
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
        <div className="px-6 pt-4 pb-3 border-b border-ink-200 shrink-0">
          {erro && (
            <div className="mb-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-danger-700 dark:text-danger-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
          )}
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Secretaria *</label>
              <select value={secretaria_id} onChange={handleSecretariaChange}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500">
                <option value="">Selecione...</option>
                {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Setor Solicitante *</label>
              <select value={setor_id} onChange={e => setSetorId(e.target.value)}
                disabled={!secretaria_id}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 disabled:opacity-50">
                <option value="">{secretaria_id ? 'Selecione...' : '— selecione a secretaria —'}</option>
                {setoresFiltrados.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Data da Requisição *</label>
              <input type="date" value={data_solicitacao} onChange={e => setDataSolicitacao(e.target.value)}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Prioridade</label>
              <select value={prioridade} onChange={e => setPrioridade(e.target.value)}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500">
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Observação</label>
              <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional"
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        {/* ── corpo em duas colunas ──────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Coluna esquerda: catálogo de itens disponíveis */}
          <div className="flex flex-col w-1/2 border-r border-ink-200 min-h-0">
            <div className="px-4 py-3 border-b border-ink-100 shrink-0">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                Itens em Estoque {secretariaNome && <span className="normal-case font-normal">— {secretariaNome}</span>}
              </p>
              <input
                value={buscaItem}
                onChange={e => setBuscaItem(e.target.value)}
                placeholder="Buscar item por nome ou código..."
                disabled={!secretaria_id}
                className="w-full border border-ink-300 rounded-lg px-3 py-1.5 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 disabled:opacity-40"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {!secretaria_id ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-400 text-sm gap-2">
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
                  <thead className="bg-ink-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-ink-500 uppercase w-8"></th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-ink-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-ink-500 uppercase">Estoque</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-ink-500 uppercase w-12">Unid.</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-ink-500 uppercase">Localização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {itensFiltrados.map(it => {
                      const selecionado = linhas.some(l => l.item_id === it.id)
                      return (
                        <tr
                          key={it.id}
                          onClick={() => toggleItem(it)}
                          className={`cursor-pointer transition-colors ${selecionado ? 'bg-info-50 dark:bg-info-900/20' : 'hover:bg-ink-50'}`}
                        >
                          <td className="px-4 py-2 text-center">
                            <div className={`w-4 h-4 rounded-sm border-2 mx-auto flex items-center justify-center transition-colors ${selecionado ? 'bg-brand-600 border-brand-600' : 'border-ink-300'}`}>
                              {selecionado && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <p className={`font-medium text-xs ${selecionado ? 'text-brand-700 dark:text-info-300' : 'text-ink-900 dark:text-white'}`}>{it.nome}</p>
                            {it.codigo && <p className="text-xs text-ink-400">{it.codigo}</p>}
                          </td>
                          <td className={`px-4 py-2 text-right font-semibold text-xs tabular-nums ${parseFloat(it.estoque_atual) <= parseFloat(it.estoque_minimo || 0) ? 'text-danger-600' : 'text-success-700 dark:text-success-400'}`}>
                            {fmt(it.estoque_atual)}
                          </td>
                          <td className="px-4 py-2 text-xs text-ink-500">{it.unidade}</td>
                          <td className="px-4 py-2 text-right text-xs text-ink-400">
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
            <div className="px-4 py-3 border-b border-ink-100 shrink-0 flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                Itens Selecionados <span className="ml-1 text-brand-600 dark:text-info-400">{linhas.length}</span>
              </p>
              {linhas.length > 0 && (
                <button onClick={() => setLinhas([])} className="text-xs text-danger-500 hover:text-danger-700">Limpar tudo</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {linhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-400 text-sm gap-2">
                  <Send className="h-8 w-8 opacity-30" />
                  Clique nos itens ao lado para adicioná-los
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-ink-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-ink-500 uppercase w-28">Quantidade</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-ink-500 uppercase">Observação</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {linhas.map(l => {
                      const it = l._item || itensSecretaria.find(i => i.id === l.item_id)
                      const estoqueMax = parseFloat(it?.estoque_atual) || 0
                      const qtd = parseFloat(l.quantidade_solicitada) || 0
                      const excede = qtd > estoqueMax
                      return (
                        <tr key={l.item_id}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-xs text-ink-900 dark:text-white">{it?.nome}</p>
                            <p className="text-xs text-ink-400">{it?.codigo} · disponível: <span className="font-medium text-success-600 dark:text-success-400">{fmt(estoqueMax)}</span> {it?.unidade}</p>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number" step="0.001" min="0.001"
                              max={estoqueMax}
                              placeholder="Qtd."
                              value={l.quantidade_solicitada}
                              onChange={e => setLinha(l.item_id, 'quantidade_solicitada', e.target.value)}
                              className={`w-full border rounded-lg px-2 py-1.5 text-sm text-center bg-surface text-ink-900 focus:ring-2 ${excede ? 'border-danger-400 focus:ring-danger-400 bg-danger-50 dark:bg-danger-900/20' : 'border-ink-300 focus:ring-brand-500'}`}
                              autoFocus={linhas[linhas.length - 1]?.item_id === l.item_id}
                            />
                            {excede && <p className="text-xs text-danger-500 mt-0.5 text-center">máx {fmt(estoqueMax)}</p>}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              placeholder="Opcional"
                              value={l.observacao}
                              onChange={e => setLinha(l.item_id, 'observacao', e.target.value)}
                              className="w-full border border-ink-300 rounded-lg px-2 py-1.5 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => toggleItem({ id: l.item_id })} className="p-1 text-danger-400 hover:text-danger-600 rounded-sm">
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
            <div className="px-4 py-3 border-t border-ink-200 flex items-center justify-between shrink-0 bg-ink-50">
              <p className="text-xs text-ink-500">
                {linhas.filter(l => l.quantidade_solicitada).length} de {linhas.length} iten(s) com quantidade
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
                <button onClick={() => setStep(2)}
                  disabled={!setor_id || !secretaria_id || linhas.every(l => !l.quantidade_solicitada) || temExcesso}
                  title={temExcesso ? 'Corrija as quantidades que excedem o estoque' : ''}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
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

  const handleAutorizar = async (senhaConfirmacao) => {
    const ok = await onSave(senhaConfirmacao)
    if (ok) onClose()
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
        <div className="bg-ink-50 rounded-lg p-3 text-sm space-y-1">
          <p><strong>Setor:</strong> {req.setor?.nome}</p>
          <p><strong>Solicitante:</strong> {req.solicitante?.nome}</p>
          <p><strong>Itens:</strong> {req.itens?.length}</p>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(req.itens || []).map(ri => (
            <div key={ri.id} className="flex justify-between text-sm border border-ink-100 rounded-lg px-3 py-2">
              <span className="text-ink-700">{ri.item?.nome}</span>
              <span className="font-medium text-ink-900 dark:text-white">{fmt(ri.quantidade_solicitada)} {ri.item?.unidade}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-400">
          Ao autorizar, o sistema verificará o estoque disponível. A entrega será gerenciada na aba Solicitações.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={() => setStep(2)}
            className="flex items-center gap-2 px-4 py-2 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700">
            <ShieldCheck className="h-4 w-4" /> Avançar — Assinar
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
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-danger-700 dark:text-danger-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Justificativa (opcional)</label>
          <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3}
            className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-danger-500 resize-none" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Voltar</button>
          <button onClick={() => onSave(justificativa)} disabled={saving}
            className="px-4 py-2 bg-danger-600 text-white rounded-lg text-sm font-medium hover:bg-danger-700 disabled:opacity-50">
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
        <p className="text-center text-ink-500 py-8">Não foi possível carregar a requisição.</p>
      ) : previewUrl ? (
        /* ── Visualização do PDF em iframe ── */
        <div className="flex flex-col h-full -m-6">
          <iframe src={previewUrl} className="flex-1 w-full border-0" title={`PDF ${req.numero}`} />
          <div className="flex justify-end gap-3 px-6 py-3 border-t border-ink-200 shrink-0">
            <button onClick={() => setPreviewUrl(null)} className="btn-secondary text-sm">Voltar</button>
            <button onClick={handleGerarPDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Eye className="h-4 w-4" /> Baixar PDF
            </button>
            <button onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 bg-ink-700 text-white rounded-lg text-sm font-medium hover:bg-ink-800">
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
                <label className="text-xs font-semibold text-ink-500 uppercase">Número</label>
                <p className="font-mono font-bold text-brand-700 dark:text-info-400 text-base">{req.numero}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 uppercase">Secretaria</label>
                <p className="text-sm text-ink-900 dark:text-white">{req.secretaria?.nome || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 uppercase">Setor Solicitante</label>
                <p className="text-sm text-ink-900 dark:text-white">{req.setor?.nome || '—'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-ink-500 uppercase">Status</label>
                <p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st?.color}`}>
                    {st?.label}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 uppercase">Data da Solicitação</label>
                <p className="text-sm text-ink-900 dark:text-white">{fmtDate(req.data_solicitacao)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 uppercase">Prioridade</label>
                <p className="text-sm text-ink-900 dark:text-white">{PRIORIDADE[req.prioridade]?.label || req.prioridade || 'Normal'}</p>
              </div>
            </div>
          </div>

          {req.observacao && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">Observação</p>
              <p className="text-sm text-ink-700">{req.observacao}</p>
            </div>
          )}

          {/* Tabela de itens */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Itens Solicitados</p>
            <table className="w-full text-sm border border-ink-200 rounded-lg overflow-hidden">
              <thead className="bg-ink-50">
                <tr>
                  {['#', 'Item', 'Qtd. Solicitada', 'Qtd. Entregue', 'Unidade'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-ink-500 uppercase border-b border-ink-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {(req.itens || []).map((ri, i) => (
                  <tr key={ri.id}>
                    <td className="px-3 py-2 text-xs text-ink-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-ink-900 dark:text-white">
                      {ri.item?.nome}
                      {ri.item?.codigo && <span className="ml-1 text-xs text-ink-400">({ri.item.codigo})</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{fmt(ri.quantidade_solicitada)}</td>
                    <td className="px-3 py-2 tabular-nums text-success-700 dark:text-success-400">{ri.quantidade_entregue != null ? fmt(ri.quantidade_entregue) : '—'}</td>
                    <td className="px-3 py-2 text-ink-500">{ri.item?.unidade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Blocos de assinatura */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-ink-200">
            {[
              { nome: req.solicitante?.nome, papel: 'Solicitante', data: fmtDate(req.data_solicitacao), hash: req.hash_solicitante },
              { nome: req.autorizador?.nome, papel: 'Autorizador', data: req.data_autorizacao ? fmtDateTime(req.data_autorizacao) : '—', hash: req.hash_assinatura },
              { nome: req.atendente?.nome,   papel: 'Entregador',  data: req.data_entrega ? fmtDateTime(req.data_entrega) : '—', hash: req.hash_entrega },
            ].map(({ nome, papel, data, hash }) => (
              <div key={papel} className="text-center">
                <div className="border-t-2 border-ink-400 pt-3">
                  <p className="text-xs font-semibold text-ink-700">{nome || '—'}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{papel}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{data}</p>
                  {hash ? (
                    <div className="mt-2 bg-ink-50 rounded-sm px-2 py-1.5" title="Chave de autenticação">
                      <p className="text-xs text-ink-400 mb-0.5">Chave de autenticação</p>
                      <p className="text-xs font-mono text-brand-600 dark:text-info-400 break-all leading-snug">{hash}</p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 rounded-sm px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
                      Aguardando assinatura
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-ink-200 mt-6">
            <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
            <button onClick={handleVerPDF} disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {generating ? 'Gerando...' : 'Ver PDF'}
            </button>
            <button onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 bg-ink-700 text-white rounded-lg text-sm font-medium hover:bg-ink-800">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </div>
        </>
      )}
    </AlmoxModal>
  )
}

// ─── Linha de Requisição ──────────────────────────────────────────────────────
function ReqRow({ r, onAutorizar, onCancelar, onVisualizar, userTipo }) {
  const st      = STATUS_REQ[r.status] || STATUS_REQ.PENDENTE_AUTORIZACAO
  const StIcon  = STATUS_ICONS[r.status] || Clock
  const priorSt = PRIORIDADE[r.prioridade]

  const podeAutorizar = ['PENDENTE', 'PENDENTE_AUTORIZACAO'].includes(r.status) && ['admin', 'gestor'].includes(userTipo)
  const podeCancelar  = ['PENDENTE', 'PENDENTE_AUTORIZACAO'].includes(r.status)

  return (
    <tr className="hover:bg-ink-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-mono text-xs font-semibold text-brand-700 dark:text-info-400">{r.numero}</p>
        {priorSt && r.prioridade !== 'NORMAL' && (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-xs font-medium mt-0.5 ${priorSt.color}`}>
            <Zap className="h-3 w-3" /> {priorSt.label}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-ink-700">{r.setor?.nome || '—'}</td>
      <td className="px-4 py-3 text-sm text-ink-700">{r.solicitante?.nome || '—'}</td>
      <td className="px-4 py-3 text-xs text-ink-500">
        {r.data_solicitacao ? new Date(String(r.data_solicitacao).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-ink-500 text-center">
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
            className="flex items-center gap-1 px-2 py-1 text-xs bg-ink-100 text-ink-700 rounded-sm hover:bg-ink-200 font-medium">
            <Eye className="h-3 w-3" /> Ver
          </button>
          {podeAutorizar && (
            <button onClick={() => onAutorizar(r)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300 rounded-sm hover:bg-success-200 font-medium">
              <ShieldCheck className="h-3 w-3" /> Autorizar
            </button>
          )}
          {podeCancelar && (
            <button onClick={() => onCancelar(r)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300 rounded-sm hover:bg-danger-200 font-medium">
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
  const [cancelando,   setCancelando]  = useState(null)
  const [viewingReqId, setViewingReqId] = useState(null)
  const [setores,      setSetores]     = useState([])
  const [secretarias,  setSecretarias] = useState([])
  const [saving,       setSaving]      = useState(false)
  const [erro,         setErro]        = useState('')
  const [PER_PAGE, setPerPage] = usePorPagina('almox-requisicoes', 20)

  const load = useCallback(async (p = 1, st = '') => {
    setLoading(true)
    try {
      const { data } = await api.get('/almoxarifado/requisicoes', {
        params: { page: p, limit: PER_PAGE, status: st }
      })
      setReqs(data.requisicoes)
      setTotal(data.total)
    } catch { } finally { setLoading(false) }
  }, [PER_PAGE])

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
      await api.put(`/almoxarifado/requisicoes/${autorizando.id}/autorizar`, { senhaConfirmacao })
      load(page, statusFiltro)
      return true
    } catch (e) {
      const det = e.response?.data?.detalhes
      setErro((e.response?.data?.error || 'Erro ao autorizar') + (det ? ': ' + det.join('; ') : ''))
      return null
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

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        eyebrow="Almoxarifado"
        title="Requisições de Material"
        subtitle="Crie e autorize requisições de materiais. Entregas são gerenciadas na aba Solicitações."
        actions={
          <ActionBar>
            <button onClick={() => load(page, statusFiltro)} className="p-2 text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={() => { setNovaReq(true); setErro('') }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
              <Plus className="h-4 w-4" /> Nova Requisição
            </button>
          </ActionBar>
        }
      />

      <FilterBar>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-500">Status</label>
          <select value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value); setPage(1) }}
            className="border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900">
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
        <div className="bg-surface rounded-xl border border-ink-200 overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle icon={ClipboardList} title="Lista de Requisições" subtitle={`${total} requisição(ões)`} />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                {['Número', 'Setor', 'Solicitante', 'Data', 'Itens', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
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
                  onCancelar={(req) => { setCancelando(req); setErro('') }}
                />
              ))}
            </tbody>
          </table>
          </div>

          <Paginacao total={total} pagina={page} setPagina={setPage} porPagina={PER_PAGE}
            setPorPagina={(n) => { setPerPage(n); setPage(1) }} rotulo="requisição" rotuloPlural="requisições" className="border-t border-ink-200" />
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
          <div className="bg-danger-50 border border-danger-200 text-danger-700 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <div className="text-sm text-ink-600 bg-ink-50 rounded-lg px-4 py-3">
          <strong>Setor:</strong> {requisicao.setor?.nome} &nbsp;|&nbsp;
          <strong>Solicitante:</strong> {requisicao.solicitante?.nome} &nbsp;|&nbsp;
          <strong>Status:</strong> {STATUS_REQ[requisicao.status]?.label}
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200">
              {['Item', 'Solicitado', 'Já Atendido', 'Estoque Disp.', 'Qtd. a Entregar'].map(h => (
                <th key={h} className="py-2 text-xs font-semibold text-ink-500 uppercase text-center first:text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {(requisicao.itens || []).map(ri => {
              const itemInfo = itens.find(i => i.id === ri.item_id)
              const pendente = parseFloat(ri.quantidade_solicitada) - parseFloat(ri.quantidade_atendida)
              return (
                <tr key={ri.id}>
                  <td className="py-3">
                    <p className="font-medium text-ink-900 dark:text-white">{ri.item?.nome}</p>
                    <p className="text-xs text-ink-400">{ri.item?.codigo}</p>
                  </td>
                  <td className="py-3 text-center text-ink-700">
                    {fmt(ri.quantidade_solicitada)} {ri.item?.unidade}
                  </td>
                  <td className="py-3 text-center text-success-600">{fmt(ri.quantidade_atendida)}</td>
                  <td className="py-3 text-center text-brand-600">
                    {itemInfo ? fmt(itemInfo.estoque_atual) : '—'}
                  </td>
                  <td className="py-3 text-center">
                    <input
                      type="number" step="0.001" min="0"
                      max={Math.min(pendente, itemInfo?.estoque_atual || 0)}
                      value={qtds[ri.item_id] || ''}
                      onChange={e => setQtds(q => ({ ...q, [ri.item_id]: e.target.value }))}
                      className="w-24 border border-ink-300 rounded-lg px-2 py-1 text-sm text-center bg-surface text-ink-900 focus:ring-2 focus:ring-success-500"
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
            className="px-4 py-2 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700 disabled:opacity-50"
          >
            {saving ? 'Processando...' : 'Confirmar Entrega'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}
