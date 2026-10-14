import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import api from '../services/api'
import { Paginacao, usePaginacao } from '../components/ui'
import NumeroProcesso from '../components/NumeroProcesso'
import {
  Archive, Folder, FolderOpen, FileText, ExternalLink,
  ChevronRight, ChevronDown, Download, FolderInput, X, Zap, Trash2,
} from 'lucide-react'
import { PageHeader, ConfirmModal } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import LoadingBar from '../components/LoadingBar'
import BotaoExcluidos from '../components/lixeira/BotaoExcluidos'

const TIPO_LABEL = {
  did:        { label: 'DID',           cor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  despacho:   { label: 'Despacho',      cor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  oficio:     { label: 'Ofício',        cor: 'bg-info-100 text-brand-700 dark:bg-info-900/40 dark:text-info-300' },
  pauta:      { label: 'Pauta',         cor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  protocolo:  { label: 'Protocolo',     cor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  requisicao: { label: 'Requisição',    cor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  ordem:      { label: 'Ordem',         cor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  gerado:     { label: 'Gerado',        cor: 'bg-ink-100 text-ink-600' },
}

const TIPOS = ['Did', 'Despacho', 'Pauta', 'Protocolo', 'Requisição', 'Geral']

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildTree(processos) {
  const tree = {}
  processos.forEach(p => {
    const ano  = String(p.ano || new Date().getFullYear())
    const tipo = p.tipo_processo || 'Geral'
    const sec  = p.secretaria?.sigla || p.secretaria?.nome || 'Sem Secretaria'
    if (!tree[ano])            tree[ano] = {}
    if (!tree[ano][tipo])      tree[ano][tipo] = {}
    if (!tree[ano][tipo][sec]) tree[ano][tipo][sec] = []
    tree[ano][tipo][sec].push(p)
  })
  return tree
}

// ── Linha de pasta na árvore ──────────────────────────────────────────────────
function TreeRow({ depth, open, onToggle, icon, label, right }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-1.5 rounded-lg
                 hover:bg-ink-100 transition-colors"
      style={{ paddingLeft: 12 + depth * 18, paddingRight: 8 }}
    >
      {open
        ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-ink-400" />
        : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />
      }
      {icon}
      <span className="text-sm text-ink-700 font-medium flex-1 text-left truncate">{label}</span>
      {right && <span className="shrink-0 text-[11px] text-ink-400">{right}</span>}
    </button>
  )
}

// ── Modal de mover ────────────────────────────────────────────────────────────
function MoveModal({ modal, processos, onConfirm, onClose, loading }) {
  const [selected, setSelected] = useState(null)
  const [openNodes, setOpenNodes] = useState({})

  const toggle = key => setOpenNodes(p => ({ ...p, [key]: !p[key] }))
  const isOpen = key => !!openNodes[key]

  // ── Mover PROCESSO: escolhe pasta (tipo) de destino ───────────────────────
  if (modal.type === 'processo') {
    const tipoCounts = {}
    processos.forEach(p => {
      const t = p.tipo_processo || 'Geral'
      tipoCounts[t] = (tipoCounts[t] || 0) + 1
    })

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-ink-100">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Mover Processo</h3>
              <p className="text-[11px] text-ink-400 mt-0.5">{modal.processoNumero}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Árvore de pastas de destino */}
          <div className="px-3 py-3">
            <p className="text-xs font-medium text-ink-500 px-2 mb-2">
              Selecione a pasta de destino:
            </p>

            {/* Pasta raiz */}
            <div>
              <TreeRow
                depth={0}
                open={isOpen('root')}
                onToggle={() => toggle('root')}
                icon={<Folder className="h-4 w-4 text-amber-500" />}
                label="Tipo de Processo"
              />

              {isOpen('root') && (
                <div className="ml-1 space-y-0.5">
                  {TIPOS.map(tipo => {
                    const count     = tipoCounts[tipo] || 0
                    const isCurrent = tipo === (modal.currentTipo || 'Geral')
                    const isSel     = selected === tipo

                    return (
                      <button
                        key={tipo}
                        disabled={isCurrent}
                        onClick={() => !isCurrent && setSelected(tipo)}
                        className={`w-full flex items-center gap-2 py-2 rounded-xl text-sm transition-colors
                          ${isSel     ? 'bg-brand-600 text-white' :
                            isCurrent ? 'text-ink-400 cursor-not-allowed' :
                                        'hover:bg-ink-100 text-ink-700'}
                        `}
                        style={{ paddingLeft: 12 + 18 + 8, paddingRight: 10 }}
                      >
                        {isSel
                          ? <FolderOpen className="h-4 w-4 shrink-0 text-white" />
                          : <Folder    className={`h-4 w-4 shrink-0 ${isCurrent ? 'text-ink-400' : 'text-info-400'}`} />
                        }
                        <span className="flex-1 text-left font-medium">{tipo}</span>
                        {isCurrent && (
                          <span className="text-[10px] opacity-60">pasta atual</span>
                        )}
                        <span className={`text-[11px] tabular-nums ${isSel ? 'text-info-100' : 'text-ink-400'}`}>
                          {count} proc.
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Destino selecionado */}
          {selected && (
            <div className="mx-5 mb-3 px-3 py-2 bg-info-50 dark:bg-info-900/20 rounded-xl border border-info-100 dark:border-info-800/40">
              <p className="text-[11px] text-info-500 dark:text-info-400 font-medium">
                Mover para: <span className="font-bold">{selected}</span>
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm border border-ink-200 rounded-xl
                         text-ink-600 hover:bg-ink-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(selected)}
              disabled={!selected || loading}
              className="flex-1 px-3 py-2 text-sm bg-brand-600 text-white rounded-xl
                         hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Movendo…' : 'Mover'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Mover ARQUIVO: navega a árvore e escolhe o processo destino ──────────
  const tree = buildTree(processos)
  const anos = Object.keys(tree).sort((a, b) => b - a)

  const selectedProcesso = selected ? processos.find(p => p.id === selected) : null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-ink-100">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Mover Arquivo</h3>
            <p className="text-[11px] text-ink-400 mt-0.5 max-w-[280px] truncate">{modal.docName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instrução */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-xs text-ink-500">
            Navegue pelas pastas e selecione o processo de destino:
          </p>
        </div>

        {/* Árvore navegável */}
        <div className="px-3 py-2 max-h-72 overflow-y-auto">
          {anos.map(ano => (
            <div key={ano}>
              <TreeRow
                depth={0}
                open={isOpen(`a-${ano}`)}
                onToggle={() => toggle(`a-${ano}`)}
                icon={<Folder className="h-4 w-4 text-amber-500" />}
                label={ano}
              />

              {isOpen(`a-${ano}`) && Object.keys(tree[ano]).sort().map(tipo => (
                <div key={tipo}>
                  <TreeRow
                    depth={1}
                    open={isOpen(`t-${ano}-${tipo}`)}
                    onToggle={() => toggle(`t-${ano}-${tipo}`)}
                    icon={<Folder className="h-4 w-4 text-info-500" />}
                    label={tipo}
                  />

                  {isOpen(`t-${ano}-${tipo}`) && Object.keys(tree[ano][tipo]).sort().map(sec => (
                    <div key={sec}>
                      <TreeRow
                        depth={2}
                        open={isOpen(`s-${ano}-${tipo}-${sec}`)}
                        onToggle={() => toggle(`s-${ano}-${tipo}-${sec}`)}
                        icon={<Folder className="h-4 w-4 text-emerald-500" />}
                        label={sec}
                        right={`${tree[ano][tipo][sec].length} proc.`}
                      />

                      {isOpen(`s-${ano}-${tipo}-${sec}`) && tree[ano][tipo][sec]
                        .filter(p => p.id !== modal.currentProcessoId)
                        .map(p => {
                          const isSel = selected === p.id
                          return (
                            <button
                              key={p.id}
                              onClick={() => setSelected(p.id)}
                              className={`w-full flex items-center gap-2 py-2 rounded-xl text-xs transition-colors
                                ${isSel
                                  ? 'bg-brand-600 text-white'
                                  : 'hover:bg-ink-100 text-ink-700'
                                }
                              `}
                              style={{ paddingLeft: 12 + 3 * 18, paddingRight: 8 }}
                            >
                              {isSel
                                ? <FolderOpen className="h-4 w-4 shrink-0 text-white" />
                                : <Folder    className="h-4 w-4 shrink-0 text-indigo-400" />
                              }
                              <NumeroProcesso numero={p.numero} className="font-semibold shrink-0" />
                              <span className={`truncate flex-1 ${isSel ? 'text-info-100' : 'text-ink-400'}`}>
                                {p.assunto}
                              </span>
                            </button>
                          )
                        })
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Destino selecionado */}
        {selectedProcesso && (
          <div className="mx-5 mb-3 px-3 py-2 bg-info-50 dark:bg-info-900/20 rounded-xl border border-info-100 dark:border-info-800/40">
            <p className="text-[11px] text-info-500 dark:text-info-400">
              Mover para: <NumeroProcesso numero={selectedProcesso.numero} className="font-bold" />
            </p>
            <p className="text-[11px] text-info-400 dark:text-info-500 truncate">{selectedProcesso.assunto}</p>
          </div>
        )}

        {/* Ações */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-sm border border-ink-200 rounded-xl
                       text-ink-600 hover:bg-ink-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={!selected || loading}
            className="flex-1 px-3 py-2 text-sm bg-brand-600 text-white rounded-xl
                       hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Movendo…' : 'Mover'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Nó de pasta ───────────────────────────────────────────────────────────────
function FolderNode({ label, badge, depth, children }) {
  const [open, setOpen] = useState(false)
  const pl  = 12 + depth * 20
  const clr = ['text-amber-500','text-info-500','text-emerald-500','text-purple-500'][Math.min(depth, 3)]

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 py-1.5 rounded-lg text-sm
                   hover:bg-ink-100 transition-colors"
        style={{ paddingLeft: pl, paddingRight: 8 }}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
        {open ? <FolderOpen className={`h-4 w-4 shrink-0 ${clr}`} /> : <Folder className={`h-4 w-4 shrink-0 ${clr}`} />}
        <span className="font-medium text-ink-700 truncate flex-1 text-left">{label}</span>
        {badge !== undefined && <span className="shrink-0 text-[11px] text-ink-400 tabular-nums">{badge}</span>}
      </button>
      {open && <div className="ml-1">{children}</div>}
    </div>
  )
}

// ── Nó de arquivo ─────────────────────────────────────────────────────────────
function FileNode({ doc, currentProcessoId, depth, onView, onMove }) {
  const pl    = 12 + depth * 20
  const isPdf = doc.tipo_mime === 'application/pdf'

  return (
    <div
      className="flex items-center rounded-lg hover:bg-info-50 dark:hover:bg-info-900/20 transition-colors group"
      style={{ paddingLeft: pl, paddingRight: 8 }}
    >
      <button
        onClick={() => onView(doc)}
        className="flex-1 flex items-center gap-2 py-1 text-xs text-left"
        title="Abrir em nova aba"
      >
        <FileText className={`h-3.5 w-3.5 shrink-0 ${isPdf ? 'text-danger-400' : 'text-ink-400'}`} />
        <span className="truncate flex-1 text-ink-600 group-hover:text-brand-600 dark:group-hover:text-info-400 transition-colors">
          {doc.nome_arquivo}
        </span>
        <span className="shrink-0 text-ink-400 tabular-nums">{(doc.tamanho_bytes / 1024).toFixed(0)} KB</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 text-info-500 transition-opacity" />
      </button>
      <button
        onClick={() => onMove({ type: 'file', docId: doc.id, docName: doc.nome_arquivo, currentProcessoId })}
        className="shrink-0 p-1 rounded-sm opacity-0 group-hover:opacity-70 hover:!opacity-100
                   hover:bg-ink-200 transition-all"
        title="Mover para outra pasta"
      >
        <FolderInput className="h-3.5 w-3.5 text-ink-500" />
      </button>
    </div>
  )
}

// ── Nó de processo ────────────────────────────────────────────────────────────
function ProcessoNode({ processo, depth, onView, onDownloadZip, onMove }) {
  const [open, setOpen] = useState(false)
  const pl      = 12 + depth * 20
  const hasDocs = processo.documentos?.length > 0

  return (
    <div>
      <div
        className="flex items-center rounded-lg hover:bg-ink-100 transition-colors group"
        style={{ paddingLeft: pl, paddingRight: 8 }}
      >
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center gap-2 py-1.5 text-sm text-left"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
          {open ? <FolderOpen className="h-4 w-4 shrink-0 text-indigo-500" /> : <Folder className="h-4 w-4 shrink-0 text-indigo-400" />}
          <NumeroProcesso numero={processo.numero} className="text-xs font-semibold text-ink-800 shrink-0" />
          <span className="text-[11px] text-ink-400 truncate flex-1">{processo.assunto}</span>
          <span className="shrink-0 text-[11px] text-ink-400 tabular-nums">{processo.documentos?.length || 0} arq.</span>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ml-1">
          {hasDocs && (
            <button
              onClick={() => onDownloadZip(processo.id, processo.numero)}
              className="p-1 rounded-sm hover:bg-ink-200 transition-colors"
              title="Baixar ZIP"
            >
              <Download className="h-3.5 w-3.5 text-ink-500" />
            </button>
          )}
          <button
            onClick={() => onMove({ type: 'processo', processoId: processo.id, processoNumero: processo.numero, currentTipo: processo.tipo_processo })}
            className="p-1 rounded-sm hover:bg-ink-200 transition-colors"
            title="Mover para outra pasta"
          >
            <FolderInput className="h-3.5 w-3.5 text-ink-500" />
          </button>
        </div>
      </div>
      {open && (
        <div className="ml-1">
          {hasDocs ? processo.documentos.map(doc => (
            <FileNode
              key={doc.id}
              doc={doc}
              currentProcessoId={processo.id}
              depth={depth + 1}
              onView={onView}
              onMove={onMove}
            />
          )) : (
            <p className="text-xs text-ink-400 py-1" style={{ paddingLeft: 12 + (depth + 1) * 20 }}>
              Nenhum documento
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Arquivo() {
  const { user } = useAuth()
  const isAdmin = user?.tipo === 'admin' || user?.tipo === 'jeos'
  const queryClient   = useQueryClient()
  const [moveModal,   setMoveModal]   = useState(null)
  const [moveLoading, setMoveLoading] = useState(false)
  const [feedback,    setFeedback]    = useState('')
  const [aba,         setAba]         = useState('processos') // 'processos' | 'gerados'
  const [confirmarExcluirDoc, setConfirmarExcluirDoc] = useState(null)

  const { data, isLoading } = useQuery(
    'arquivo-processos',
    async () => {
      const { data } = await api.get('/processos/arquivo')
      return data.processos || []
    },
    { staleTime: 2 * 60 * 1000 }
  )

  const { data: dataGerados, isLoading: loadingGerados } = useQuery(
    'documentos-gerados',
    async () => {
      const { data } = await api.get('/documentos/gerados')
      return data.documentos || []
    },
    { staleTime: 60 * 1000 }
  )

  const processos      = data || []
  const docsGerados    = dataGerados || []
  const pgDocs = usePaginacao('arquivo-documentos', docsGerados.length)
  const tree      = buildTree(processos)
  const anos      = Object.keys(tree).sort((a, b) => b - a)
  const totalDocs = processos.reduce((s, p) => s + (p.documentos?.length || 0), 0)

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 3000) }

  const handleViewDoc = async (doc) => {
    try {
      const { data } = await api.get(`/documentos/view/${doc.id}`)
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch { alert('Não foi possível abrir o arquivo.') }
  }

  const handleDeleteDoc = async (doc) => {
    try {
      await api.delete(`/documentos/${doc.id}`)
      queryClient.invalidateQueries('documentos-gerados')
      setConfirmarExcluirDoc(null)
      showFeedback('Documento excluído com sucesso')
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir documento.')
    }
  }

  const handleDownloadZip = async (processoId, numero) => {
    try {
      const response = await api.get(`/documentos/zip/${processoId}`, { responseType: 'blob' })
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', `${numero}-documentos.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch { alert('Erro ao gerar ZIP.') }
  }

  const handleConfirmMove = async (destinoId) => {
    if (!destinoId) return
    setMoveLoading(true)
    try {
      if (moveModal.type === 'file') {
        await api.patch(`/documentos/${moveModal.docId}/mover`, { processoDestinoId: destinoId })
        showFeedback('Arquivo movido com sucesso')
      } else {
        await api.patch(`/processos/${moveModal.processoId}/tipo`, { tipo_processo: destinoId })
        showFeedback('Processo movido com sucesso')
      }
      queryClient.invalidateQueries('arquivo-processos')
      setMoveModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao mover')
    } finally {
      setMoveLoading(false)
    }
  }

  if (isLoading) {
    return <LoadingBar label="Carregando arquivo..." />
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        icon={Archive}
        title="Gerenciador de Arquivos"
        subtitle={`${processos.length} processos concluídos · ${totalDocs} documentos · ${docsGerados.length} gerados`}
        actions={
          <BotaoExcluidos entidade="documentos" rotulo="Documentos excluídos"
            onAlterado={() => { queryClient.invalidateQueries('arquivo-processos'); queryClient.invalidateQueries('documentos-gerados') }} />
        }
      />

      {/* Toast */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm font-medium
                        px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {feedback}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 bg-ink-100 p-1 rounded-xl w-fit">
        {[
          { id: 'processos', label: 'Processos Concluídos', icon: Archive },
          { id: 'gerados',   label: 'Documentos Gerados',  icon: Zap     },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              aba === id
                ? 'bg-surface text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              aba === id ? 'bg-info-100 dark:bg-info-900/40 text-brand-700 dark:text-info-300' : 'bg-ink-200 text-ink-500'
            }`}>
              {id === 'processos' ? processos.length : docsGerados.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── ABA: Documentos Gerados ── */}
      {aba === 'gerados' && (
        <div className="card p-4">
          {loadingGerados ? (
            <LoadingBar label="Carregando documentos gerados..." />
          ) : docsGerados.length === 0 ? (
            <div className="text-center py-14 space-y-3">
              <Zap className="h-10 w-10 text-ink-200 mx-auto" />
              <p className="text-sm text-ink-500">Nenhum documento gerado ainda</p>
              <p className="text-xs text-ink-400">
                Documentos são salvos automaticamente ao gerar PDFs de DID, despacho, ofício e outros.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {pgDocs.fatia(docsGerados).map(doc => {
                const meta = TIPO_LABEL[doc.tipo_origem] || TIPO_LABEL.gerado
                const data = doc.created_at || doc.data_upload
                return (
                  <div key={doc.id} className="flex items-center gap-3 py-2.5 group">
                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-100 dark:border-danger-800/30">
                      <FileText className="h-4 w-4 text-danger-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleViewDoc(doc)}
                        className="text-sm font-medium text-brand-600 dark:text-info-400 hover:underline truncate block text-left max-w-full"
                        title="Abrir em nova aba"
                      >
                        {doc.nome_arquivo}
                      </button>
                      <p className="text-xs text-ink-400">
                        {data ? new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        {doc.uploadPor?.nome && ` · ${doc.uploadPor.nome}`}
                        {' · '}{(doc.tamanho_bytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.cor}`}>
                      {meta.label}
                    </span>
                    <ExternalLink
                      className="h-3.5 w-3.5 text-ink-400 group-hover:text-info-400 transition-colors cursor-pointer shrink-0"
                      onClick={() => handleViewDoc(doc)}
                    />
                    {isAdmin && (
                      <Trash2
                        className="h-3.5 w-3.5 text-ink-400 hover:text-danger-500 transition-colors cursor-pointer shrink-0"
                        title="Excluir documento"
                        onClick={() => setConfirmarExcluirDoc(doc)}
                      />
                    )}
                  </div>
                )
              })}
              <Paginacao {...pgDocs} total={docsGerados.length} rotulo="documento" />
            </div>
          )}
        </div>
      )}

      {confirmarExcluirDoc && (
        <ConfirmModal
          title="Excluir documento gerado?"
          message={`"${confirmarExcluirDoc.nome_arquivo}" sai do arquivo e vai para os Documentos excluídos, de onde pode ser restaurado.`}
          confirmLabel="Excluir"
          onConfirm={() => handleDeleteDoc(confirmarExcluirDoc)}
          onClose={() => setConfirmarExcluirDoc(null)}
        />
      )}

      {/* ── ABA: Processos Concluídos ── */}
      {aba === 'processos' && (anos.length === 0 ? (
        <div className="card p-16 text-center space-y-3">
          <Archive className="h-14 w-14 text-ink-200 mx-auto" />
          <p className="text-ink-500 font-medium">Nenhum processo concluído encontrado</p>
        </div>
      ) : (
        <div className="card p-4">
          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 px-3 pb-3 mb-3 border-b border-ink-100 text-[11px] text-ink-400">
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-amber-400" /> Ano</span>
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-info-400" /> Tipo</span>
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-emerald-400" /> Secretaria</span>
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-indigo-400" /> Processo</span>
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-danger-400" /> Arquivo</span>
            <span className="flex items-center gap-1 ml-auto text-ink-400">
              <FolderInput className="h-3.5 w-3.5" /> hover para mover
            </span>
          </div>

          <div className="space-y-0.5">
            {anos.map(ano => {
              const totalAno = Object.values(tree[ano]).flatMap(t => Object.values(t)).reduce((s, a) => s + a.length, 0)
              return (
                <FolderNode key={ano} label={ano} badge={`${totalAno} proc.`} depth={0}>
                  {Object.keys(tree[ano]).sort().map(tipo => {
                    const totalTipo = Object.values(tree[ano][tipo]).reduce((s, a) => s + a.length, 0)
                    return (
                      <FolderNode key={tipo} label={tipo} badge={`${totalTipo} proc.`} depth={1}>
                        {Object.keys(tree[ano][tipo]).sort().map(sec => {
                          const procs = tree[ano][tipo][sec]
                          return (
                            <FolderNode key={sec} label={sec} badge={`${procs.length} proc.`} depth={2}>
                              {procs.map(processo => (
                                <ProcessoNode
                                  key={processo.id}
                                  processo={processo}
                                  depth={3}
                                  onView={handleViewDoc}
                                  onDownloadZip={handleDownloadZip}
                                  onMove={setMoveModal}
                                />
                              ))}
                            </FolderNode>
                          )
                        })}
                      </FolderNode>
                    )
                  })}
                </FolderNode>
              )
            })}
          </div>
        </div>
      ))}

      {moveModal && (
        <MoveModal
          modal={moveModal}
          processos={processos}
          onConfirm={handleConfirmMove}
          onClose={() => setMoveModal(null)}
          loading={moveLoading}
        />
      )}
    </div>
  )
}
