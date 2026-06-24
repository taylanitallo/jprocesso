import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle, Clock, XCircle, Package,
  Truck, ShieldCheck, ClipboardList, Eye, Lock, Inbox
} from 'lucide-react'
import api from '../services/api'
import LoadingBar from '../components/LoadingBar'
import AlmoxModal from './AlmoxModal'
import { fmt, STATUS_REQ, PRIORIDADE } from './almoxConstants'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'
import ActionBar from '../components/ui/ActionBar'

// ─── Ícones por status ────────────────────────────────────────────────────────
const STATUS_ICONS = {
  AUTORIZADA:          ShieldCheck,
  EM_SEPARACAO:        Package,
  AGUARDANDO_RETIRADA: Clock,
  ENTREGUE:            CheckCircle,
  CANCELADA:           XCircle,
  PENDENTE:            Clock,
  APROVADA:            CheckCircle,
  ATENDIDA:            CheckCircle,
}

// ─── Passo de Assinatura Eletrônica ──────────────────────────────────────────
function AssinaturaStep({ resumo, onConfirm, onBack, saving, erro }) {
  const [senha, setSenha] = useState('')
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Assinatura Eletrônica</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            Confirme com sua senha para registrar a entrega.
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
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} disabled={saving} className="btn-secondary text-sm">Voltar</button>
        <button onClick={() => onConfirm(senha)} disabled={saving || !senha}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          <Truck className="h-4 w-4" /> {saving ? 'Confirmando...' : 'Confirmar Entrega'}
        </button>
      </div>
    </div>
  )
}

// ─── Modal: Confirmar Entrega (com assinatura) ────────────────────────────────
function EntregarModal({ req, onClose, onSave, saving, erro }) {
  const [step, setStep] = useState(1) // 1: revisão, 2: assinatura

  if (step === 2) {
    return (
      <AlmoxModal title={`Confirmar Entrega — ${req.numero}`} onClose={onClose}>
        <AssinaturaStep
          resumo={<>
            <p><strong>Requisição:</strong> {req.numero}</p>
            <p><strong>Setor:</strong> {req.setor?.nome || '—'}</p>
            <p><strong>Itens:</strong> {req.itens?.length || 0}</p>
          </>}
          onConfirm={(senha) => onSave(senha)}
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
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">
            Confirme a entrega dos materiais ao setor solicitante.
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            O estoque será deduzido automaticamente via FIFO/PEPS após a confirmação.
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm space-y-1">
          <p><strong>Setor:</strong> {req.setor?.nome || '—'}</p>
          <p><strong>Solicitante:</strong> {req.solicitante?.nome || '—'}</p>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(req.itens || []).map(ri => (
            <div key={ri.id} className="flex justify-between text-sm border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2">
              <span className="text-gray-700 dark:text-gray-300">{ri.item?.nome}</span>
              <span className="font-medium text-gray-900 dark:text-white">{fmt(ri.quantidade_solicitada)} {ri.item?.unidade}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={() => setStep(2)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
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

// ─── Linha da tabela ──────────────────────────────────────────────────────────
function SolRow({ r, onSeparar, onAguardandoRetirada, onEntregar, onCancelar, onVisualizar, userTipo }) {
  const st     = STATUS_REQ[r.status] || STATUS_REQ.AUTORIZADA
  const StIcon = STATUS_ICONS[r.status] || Clock
  const priorSt = PRIORIDADE[r.prioridade]

  const podeSeparar           = r.status === 'AUTORIZADA'
  const podeAguardandoRetirada = r.status === 'EM_SEPARACAO'
  const podeEntregar          = r.status === 'AGUARDANDO_RETIRADA'
  const podeCancelar          = !['ENTREGUE', 'ATENDIDA', 'CANCELADA'].includes(r.status) && ['admin', 'gestor'].includes(userTipo)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
      <td className="px-4 py-3">
        <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">{r.numero}</p>
        {priorSt && r.prioridade !== 'NORMAL' && (
          <span className={`inline-flex text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 ${priorSt.color}`}>
            {priorSt.label}
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
          {podeSeparar && (
            <button onClick={() => onSeparar(r.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded hover:bg-purple-200 font-medium">
              <Package className="h-3 w-3" /> Separar
            </button>
          )}
          {podeAguardandoRetirada && (
            <button onClick={() => onAguardandoRetirada(r.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded hover:bg-orange-200 font-medium">
              <Clock className="h-3 w-3" /> Pronto p/ Retirada
            </button>
          )}
          {podeEntregar && (
            <button onClick={() => onEntregar(r)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200 font-medium">
              <Truck className="h-3 w-3" /> Entregar
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

// ─── Modal: Visualizar Requisição (simplificado) ─────────────────────────────
function VisualizarModal({ reqId, onClose }) {
  const [req, setReq] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/almoxarifado/requisicoes/${reqId}`)
      .then(r => setReq(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [reqId])

  const fmtDate = (v) => v ? new Date(String(v).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtDateTime = (v) => v ? new Date(v).toLocaleString('pt-BR') : '—'
  const st = req ? STATUS_REQ[req.status] || STATUS_REQ.AUTORIZADA : null

  return (
    <AlmoxModal title={`Requisição ${req?.numero || '...'}`} onClose={onClose} wide>
      {loading ? <LoadingBar label="Carregando..." /> : !req ? (
        <p className="text-center text-gray-500 py-8">Não foi possível carregar a requisição.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Número</label>
                <p className="font-mono font-bold text-blue-700 dark:text-blue-400">{req.numero}</p></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Secretaria</label>
                <p className="text-sm">{req.secretaria?.nome || '—'}</p></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Setor</label>
                <p className="text-sm">{req.setor?.nome || '—'}</p></div>
            </div>
            <div className="space-y-2">
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                <p><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st?.color}`}>{st?.label}</span></p></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Solicitante</label>
                <p className="text-sm">{req.solicitante?.nome || '—'}</p></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Autorizador</label>
                <p className="text-sm">{req.autorizador?.nome || '—'}</p></div>
            </div>
          </div>

          <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {['#', 'Item', 'Qtd. Solicitada', 'Qtd. Entregue', 'Unid.'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(req.itens || []).map((ri, i) => (
                <tr key={ri.id}>
                  <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{ri.item?.nome}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(ri.quantidade_solicitada)}</td>
                  <td className="px-3 py-2 tabular-nums text-green-700 dark:text-green-400">
                    {ri.quantidade_entregue != null ? fmt(ri.quantidade_entregue) : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{ri.item?.unidade || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
                    <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
                      <p className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">{hash}</p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
                      Aguardando
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
          </div>
        </>
      )}
    </AlmoxModal>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxSolicitacoes() {
  const { user } = useAuth() || {}
  const userTipo = user?.tipo || 'operacional'

  const [reqs,         setReqs]        = useState([])
  const [total,        setTotal]       = useState(0)
  const [page,         setPage]        = useState(1)
  const [loading,      setLoading]     = useState(true)
  const [statusFiltro, setStatusFiltro]= useState('ativas')
  const [entregando,   setEntregando]  = useState(null)
  const [cancelando,   setCancelando]  = useState(null)
  const [viewingReqId, setViewingReqId]= useState(null)
  const [saving,       setSaving]      = useState(false)
  const [erro,         setErro]        = useState('')
  const PER_PAGE = 20

  const load = useCallback(async (p = 1, filtro = 'ativas') => {
    setLoading(true)
    try {
      // "ativas" = mostrar AUTORIZADA + EM_SEPARACAO + AGUARDANDO_RETIRADA em uma chamada
      const params = { page: p, limit: PER_PAGE }
      if (filtro === 'ativas') {
        params.status = 'AUTORIZADA,EM_SEPARACAO,AGUARDANDO_RETIRADA'
      } else if (filtro) {
        params.status = filtro
      }
      const { data } = await api.get('/almoxarifado/requisicoes', { params })
      setReqs(data.requisicoes)
      setTotal(data.total)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page, statusFiltro) }, [load, page, statusFiltro])

  const handleSeparar = async (id) => {
    try {
      await api.put(`/almoxarifado/requisicoes/${id}/separacao`)
      load(page, statusFiltro)
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao iniciar separação')
    }
  }

  const handleAguardandoRetirada = async (id) => {
    try {
      await api.put(`/almoxarifado/requisicoes/${id}/aguardando-retirada`)
      load(page, statusFiltro)
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao atualizar status')
    }
  }

  const handleEntregar = async (senhaConfirmacao) => {
    setSaving(true); setErro('')
    try {
      await api.put(`/almoxarifado/requisicoes/${entregando.id}/entregar`, { senhaConfirmacao })
      setEntregando(null)
      load(page, statusFiltro)
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

  const totalPages = Math.ceil(total / PER_PAGE)

  const FILTROS = [
    { value: 'ativas',              label: 'Ativas (em andamento)' },
    { value: 'AUTORIZADA',          label: 'Autorizadas' },
    { value: 'EM_SEPARACAO',        label: 'Em Separação' },
    { value: 'AGUARDANDO_RETIRADA', label: 'Aguardando Retirada' },
    { value: 'ENTREGUE',            label: 'Entregues' },
    { value: 'CANCELADA',           label: 'Canceladas' },
    { value: '',                    label: 'Todas' },
  ]

  return (
    <div>
      <PageHeader
        icon={Inbox}
        eyebrow="Almoxarifado"
        title="Solicitações"
        subtitle="Gerencie o fluxo de entregas: separe os materiais, marque como pronto e confirme a entrega."
        actions={
          <ActionBar>
            <button onClick={() => load(page, statusFiltro)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <RefreshCw className="h-4 w-4" />
            </button>
          </ActionBar>
        }
      />

      <FilterBar>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
          <select value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value); setPage(1) }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            {FILTROS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </FilterBar>

      {loading ? (
        <LoadingBar label="Carregando solicitações..." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle icon={ClipboardList} title="Requisições" subtitle={`${total} solicitação(ões)`} />
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
                        icon={Inbox}
                        title="Nenhuma solicitação encontrada"
                        description="Não há requisições para o filtro selecionado."
                      />
                    </td>
                  </tr>
                )}
                {reqs.map(r => (
                  <SolRow
                    key={r.id}
                    r={r}
                    userTipo={userTipo}
                    onVisualizar={(id) => setViewingReqId(id)}
                    onSeparar={handleSeparar}
                    onAguardandoRetirada={handleAguardandoRetirada}
                    onEntregar={(req) => { setEntregando(req); setErro('') }}
                    onCancelar={(req) => { setCancelando(req); setErro('') }}
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
        <VisualizarModal
          reqId={viewingReqId}
          onClose={() => setViewingReqId(null)}
        />
      )}
    </div>
  )
}
