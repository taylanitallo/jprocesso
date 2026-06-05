import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import {
  Archive, Folder, FolderOpen, FileText, ExternalLink,
  ChevronRight, ChevronDown, Download, FolderInput, X, Search,
} from 'lucide-react'
import { PageHeader } from '../components/ui'

const TIPOS = ['Did', 'Despacho', 'Pauta', 'Requisição', 'Geral']

// ── Agrupa em árvore: Ano → Tipo → Secretaria → [processos] ─────────────────
function buildTree(processos) {
  const tree = {}
  processos.forEach(p => {
    const ano = String(p.ano || new Date().getFullYear())
    const tipo = p.tipo_processo || 'Geral'
    const sec  = p.secretaria?.sigla || p.secretaria?.nome || 'Sem Secretaria'
    if (!tree[ano])            tree[ano] = {}
    if (!tree[ano][tipo])      tree[ano][tipo] = {}
    if (!tree[ano][tipo][sec]) tree[ano][tipo][sec] = []
    tree[ano][tipo][sec].push(p)
  })
  return tree
}

// ── Modal de mover ────────────────────────────────────────────────────────────
function MoveModal({ modal, processos, onConfirm, onClose, loading }) {
  const [selected, setSelected] = useState('')
  const [search, setSearch]     = useState('')

  if (modal.type === 'processo') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Mover Processo</h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 truncate">{modal.processoNumero}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 px-1">Mover para categoria:</p>
            {TIPOS.map(tipo => (
              <button
                key={tipo}
                onClick={() => setSelected(tipo)}
                disabled={tipo === modal.currentTipo}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected === tipo
                    ? 'bg-blue-600 text-white'
                    : tipo === modal.currentTipo
                      ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-300'
                }`}
              >
                <Folder className="h-4 w-4 flex-shrink-0 opacity-70" />
                {tipo}
                {tipo === modal.currentTipo && <span className="ml-auto text-[10px] opacity-60">atual</span>}
              </button>
            ))}
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(selected)}
              disabled={!selected || loading}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Movendo…' : 'Mover'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // type === 'file'
  const filtered = processos
    .filter(p => p.id !== modal.currentProcessoId)
    .filter(p => {
      if (!search) return true
      const q = search.toLowerCase()
      return p.numero.toLowerCase().includes(q) || p.assunto.toLowerCase().includes(q)
    })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Mover Arquivo</h3>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 truncate max-w-[220px]">{modal.docName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar processo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-8 text-sm w-full"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-0.5 -mx-1 px-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Nenhum processo encontrado</p>
            ) : filtered.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  selected === p.id
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-300'
                }`}
              >
                <p className="text-xs font-medium leading-snug">{p.numero}</p>
                <p className={`text-[11px] truncate mt-0.5 ${selected === p.id ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>{p.assunto}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2 border-t border-gray-100 dark:border-slate-700/50 pt-3">
          <button onClick={onClose} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={!selected || loading}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Movendo…' : 'Mover'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Nó de pasta genérico ──────────────────────────────────────────────────────
function FolderNode({ label, badge, depth, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const pl = 12 + depth * 20
  const clr = ['text-amber-500','text-blue-500','text-emerald-500','text-purple-500'][Math.min(depth, 3)]

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
        style={{ paddingLeft: pl, paddingRight: 8 }}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
        {open ? <FolderOpen className={`h-4 w-4 flex-shrink-0 ${clr}`} /> : <Folder className={`h-4 w-4 flex-shrink-0 ${clr}`} />}
        <span className="font-medium text-gray-700 dark:text-slate-300 truncate flex-1 text-left">{label}</span>
        {badge !== undefined && <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">{badge}</span>}
      </button>
      {open && <div className="ml-1">{children}</div>}
    </div>
  )
}

// ── Nó de arquivo ─────────────────────────────────────────────────────────────
function FileNode({ doc, currentProcessoId, depth, onView, onMove }) {
  const pl   = 12 + depth * 20
  const isPdf = doc.tipo_mime === 'application/pdf'

  return (
    <div
      className="flex items-center gap-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
      style={{ paddingLeft: pl, paddingRight: 8 }}
    >
      <button
        onClick={() => onView(doc)}
        className="flex-1 flex items-center gap-2 py-1 text-xs text-left"
        title="Abrir em nova aba"
      >
        <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isPdf ? 'text-red-400' : 'text-gray-400'}`} />
        <span className="truncate flex-1 text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {doc.nome_arquivo}
        </span>
        <span className="flex-shrink-0 text-gray-400 dark:text-slate-500 tabular-nums">{(doc.tamanho_bytes / 1024).toFixed(0)} KB</span>
        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-60 text-blue-500 transition-opacity" />
      </button>
      <button
        onClick={() => onMove({ type: 'file', docId: doc.id, docName: doc.nome_arquivo, currentProcessoId })}
        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
        title="Mover para outro processo"
      >
        <FolderInput className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
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
        className="flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors group"
        style={{ paddingLeft: pl, paddingRight: 8 }}
      >
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center gap-2 py-1.5 text-sm text-left"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
          {open ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-indigo-500" /> : <Folder className="h-4 w-4 flex-shrink-0 text-indigo-400" />}
          <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 flex-shrink-0">{processo.numero}</span>
          <span className="text-[11px] text-gray-400 dark:text-slate-500 truncate flex-1">{processo.assunto}</span>
          <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">{processo.documentos?.length || 0} arq.</span>
        </button>
        {/* Ações no hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ml-1">
          {hasDocs && (
            <button
              onClick={() => onDownloadZip(processo.id, processo.numero)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              title="Baixar ZIP"
            >
              <Download className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
            </button>
          )}
          <button
            onClick={() => onMove({ type: 'processo', processoId: processo.id, processoNumero: processo.numero, currentTipo: processo.tipo_processo })}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            title="Mover para outra categoria"
          >
            <FolderInput className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
      {open && (
        <div className="ml-1">
          {hasDocs ? (
            processo.documentos.map(doc => (
              <FileNode
                key={doc.id}
                doc={doc}
                currentProcessoId={processo.id}
                depth={depth + 1}
                onView={onView}
                onMove={onMove}
              />
            ))
          ) : (
            <p className="text-xs text-gray-400 dark:text-slate-500 py-1" style={{ paddingLeft: 12 + (depth + 1) * 20 }}>
              Nenhum documento anexado
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Arquivo() {
  const queryClient  = useQueryClient()
  const [moveModal,  setMoveModal]  = useState(null)
  const [moveLoading, setMoveLoading] = useState(false)
  const [feedback,   setFeedback]   = useState('')

  const { data, isLoading } = useQuery(
    'arquivo-processos',
    async () => {
      const { data } = await api.get('/processos/arquivo')
      return data.processos || []
    },
    { staleTime: 2 * 60 * 1000 }
  )

  const processos = data || []
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
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        icon={Archive}
        title="Gerenciador de Arquivos"
        subtitle={`${processos.length} processos concluídos · ${totalDocs} documentos`}
      />

      {/* Toast de feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {feedback}
        </div>
      )}

      {anos.length === 0 ? (
        <div className="card p-16 text-center space-y-3">
          <Archive className="h-14 w-14 text-gray-200 dark:text-slate-700 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">Nenhum processo concluído encontrado</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Os processos concluídos aparecerão aqui organizados por ano, tipo e secretaria.
          </p>
        </div>
      ) : (
        <div className="card p-4">
          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 px-3 pb-3 mb-3 border-b border-gray-100 dark:border-slate-700/50 text-[11px] text-gray-400 dark:text-slate-500">
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-amber-400" /> Ano</span>
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-blue-400" /> Tipo</span>
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-emerald-400" /> Secretaria</span>
            <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5 text-indigo-400" /> Processo</span>
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-red-400" /> Arquivo</span>
            <span className="flex items-center gap-1 ml-auto text-gray-300 dark:text-slate-600">
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
      )}

      {/* Modal de mover */}
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
