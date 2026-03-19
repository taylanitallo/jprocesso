import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, RefreshCw, X,
  CheckCircle, Clock, AlertTriangle, XCircle, Package,
  Send, Truck, ShieldCheck, Key, Zap
} from 'lucide-react'
import api from '../services/api'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, STATUS_REQ, PRIORIDADE } from './almoxConstants'
import { useAuth } from '../context/AuthContext'

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

// ─── Modal: Nova Requisição ───────────────────────────────────────────────────
function NovaRequisicaoModal({ itens, setores, secretarias, onClose, onSave, saving, erro }) {
  const [setor_id,    setSetorId]    = useState('')
  const [secretaria_id, setSecretariaId] = useState('')
  const [prioridade,  setPrioridade] = useState('NORMAL')
  const [observacao,  setObservacao] = useState('')
  const [linhas, setLinhas] = useState([{ item_id: '', quantidade_solicitada: '', observacao: '' }])

  const addLinha    = () => setLinhas(l => [...l, { item_id: '', quantidade_solicitada: '', observacao: '' }])
  const removeLinha = (i) => setLinhas(l => l.filter((_, idx) => idx !== i))
  const setLinha    = (i, k, v) => setLinhas(l => l.map((r, idx) => idx === i ? { ...r, [k]: v } : r))

  const handleSave = () => {
    const itensValidos = linhas.filter(l => l.item_id && l.quantidade_solicitada)
    onSave({ setor_id, secretaria_id: secretaria_id || null, prioridade, observacao, itens: itensValidos })
  }

  return (
    <AlmoxModal title="Nova Requisição de Material" onClose={onClose} wide>
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Setor Solicitante *</label>
            <select value={setor_id} onChange={e => setSetorId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secretaria</label>
            <select value={secretaria_id} onChange={e => setSecretariaId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
              <option value="">Opcional</option>
              {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridade</label>
            <select value={prioridade} onChange={e => setPrioridade(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação</label>
          <input value={observacao} onChange={e => setObservacao(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Itens Solicitados *</label>
            <button onClick={addLinha} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <Plus className="h-4 w-4" /> Adicionar item
            </button>
          </div>
          <div className="space-y-2">
            {linhas.map((linha, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={linha.item_id} onChange={e => setLinha(i, 'item_id', e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione o item...</option>
                  {itens.map(it => (
                    <option key={it.id} value={it.id}>{it.codigo ? `${it.codigo} — ` : ''}{it.nome} — Estoque: {fmt(it.estoque_atual)} {it.unidade}</option>
                  ))}
                </select>
                <input type="number" step="0.001" min="0.001" placeholder="Qtd."
                  value={linha.quantidade_solicitada}
                  onChange={e => setLinha(i, 'quantidade_solicitada', e.target.value)}
                  className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Obs." value={linha.observacao}
                  onChange={e => setLinha(i, 'observacao', e.target.value)}
                  className="w-36 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                {linhas.length > 1 && (
                  <button onClick={() => removeLinha(i)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !setor_id || linhas.every(l => !l.item_id)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Send className="h-4 w-4" /> {saving ? 'Enviando...' : 'Enviar para Autorização'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Autorizar ─────────────────────────────────────────────────────────
function AutorizarModal({ req, onClose, onSave, saving, erro }) {
  const [resultado, setResultado] = useState(null) // token após autorizar

  const handleAutorizar = async () => {
    const res = await onSave()
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

  return (
    <AlmoxModal title={`Autorizar ${req.numero}`} onClose={onClose}>
      <div className="space-y-4">
        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">{erro}</div>
        )}
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
          <button onClick={handleAutorizar} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            <ShieldCheck className="h-4 w-4" /> {saving ? 'Autorizando...' : 'Confirmar Autorização'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Entregar com Token ────────────────────────────────────────────────
function EntregarModal({ req, onClose, onSave, saving, erro }) {
  const [token, setToken] = useState('')

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
          <button onClick={() => onSave(token)} disabled={saving || token.length !== 6}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Truck className="h-4 w-4" /> {saving ? 'Processando...' : 'Confirmar Entrega'}
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

// ─── Linha de Requisição ──────────────────────────────────────────────────────
function ReqRow({ r, onAutorizar, onSeparar, onEntregar, onCancelar, onRegenerarToken, userTipo }) {
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
        {r.data_solicitacao ? new Date(r.data_solicitacao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
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
  const [itens,        setItens]       = useState([])
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
      const [itensR, setoresR, secR] = await Promise.all([
        api.get('/almoxarifado/itens'),
        api.get('/organizacao/setores'),
        api.get('/organizacao/secretarias').catch(() => ({ data: [] }))
      ])
      setItens(itensR.data)
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

  const handleAutorizar = async () => {
    setSaving(true); setErro('')
    try {
      const { data } = await api.put(`/almoxarifado/requisicoes/${autorizando.id}/autorizar`)
      load(page, statusFiltro)
      loadAux()
      return data // retorna para mostrar token no modal
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

  const handleEntregar = async (token) => {
    setSaving(true); setErro('')
    try {
      await api.put(`/almoxarifado/requisicoes/${entregando.id}/entregar`, { token })
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <select value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value); setPage(1) }}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_REQ).filter(([, v]) => v.step !== undefined).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={() => load(page, statusFiltro)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => { setNovaReq(true); setErro('') }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nova Requisição
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                    Nenhuma requisição encontrada
                  </td>
                </tr>
              )}
              {reqs.map(r => (
                <ReqRow
                  key={r.id}
                  r={r}
                  userTipo={userTipo}
                  onAutorizar={(req) => { setAutorizando(req); setErro('') }}
                  onSeparar={handleSeparar}
                  onEntregar={(req) => { setEntregando(req); setErro('') }}
                  onCancelar={(req) => { setCancelando(req); setErro('') }}
                  onRegenerarToken={handleRegenerarToken}
                />
              ))}
            </tbody>
          </table>

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
          itens={itens} setores={setores} secretarias={secretarias}
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
