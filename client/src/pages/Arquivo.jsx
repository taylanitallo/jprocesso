import { useState } from 'react'
import { useQuery } from 'react-query'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import {
  Archive, Folder, FolderOpen, FileText, ExternalLink,
  ChevronRight, ChevronDown, Download,
} from 'lucide-react'
import { PageHeader } from '../components/ui'

// ── Agrupa processos em árvore: Ano → Tipo → Secretaria → [processos] ────────
function buildTree(processos) {
  const tree = {}
  processos.forEach(p => {
    const ano = String(p.ano || new Date().getFullYear())
    const tipo = p.tipo_processo || 'Geral'
    const sec  = p.secretaria?.sigla || p.secretaria?.nome || 'Sem Secretaria'

    if (!tree[ano])           tree[ano] = {}
    if (!tree[ano][tipo])     tree[ano][tipo] = {}
    if (!tree[ano][tipo][sec]) tree[ano][tipo][sec] = []
    tree[ano][tipo][sec].push(p)
  })
  return tree
}

// ── Nó de pasta genérico ──────────────────────────────────────────────────────
function FolderNode({ nodeKey, label, badge, depth, children }) {
  const [open, setOpen] = useState(false)
  const pl = 12 + depth * 20

  const colors = [
    'text-amber-500 dark:text-amber-400',
    'text-blue-500  dark:text-blue-400',
    'text-emerald-500 dark:text-emerald-400',
    'text-purple-500 dark:text-purple-400',
  ]
  const clr = colors[Math.min(depth, colors.length - 1)]

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 py-1.5 rounded-lg text-sm
                   hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
        style={{ paddingLeft: pl, paddingRight: 8 }}
      >
        {open
          ? <ChevronDown  className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        }
        {open
          ? <FolderOpen className={`h-4 w-4 flex-shrink-0 ${clr}`} />
          : <Folder     className={`h-4 w-4 flex-shrink-0 ${clr}`} />
        }
        <span className="font-medium text-gray-700 dark:text-slate-300 truncate flex-1 text-left">
          {label}
        </span>
        {badge !== undefined && (
          <span className="ml-auto flex-shrink-0 text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="ml-1">{children}</div>}
    </div>
  )
}

// ── Nó de arquivo ─────────────────────────────────────────────────────────────
function FileNode({ doc, depth, onView }) {
  const pl = 12 + depth * 20
  const isPdf = doc.tipo_mime === 'application/pdf'

  return (
    <button
      onClick={() => onView(doc)}
      className="w-full flex items-center gap-2 py-1 rounded-lg text-xs
                 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
      style={{ paddingLeft: pl, paddingRight: 8 }}
      title={`Abrir ${doc.nome_arquivo} em nova aba`}
    >
      <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isPdf ? 'text-red-400' : 'text-gray-400'}`} />
      <span className="truncate flex-1 text-left text-gray-600 dark:text-slate-400
                       group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {doc.nome_arquivo}
      </span>
      <span className="flex-shrink-0 text-gray-400 dark:text-slate-500 tabular-nums">
        {(doc.tamanho_bytes / 1024).toFixed(0)} KB
      </span>
      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-60 text-blue-500 transition-opacity" />
    </button>
  )
}

// ── Nó de processo ────────────────────────────────────────────────────────────
function ProcessoNode({ processo, depth, onView, onDownloadZip }) {
  const [open, setOpen] = useState(false)
  const pl = 12 + depth * 20
  const hasDocs = processo.documentos?.length > 0

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 py-1.5 rounded-lg text-sm
                   hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors group"
        style={{ paddingLeft: pl, paddingRight: 8 }}
      >
        {open
          ? <ChevronDown  className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        }
        {open
          ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
          : <Folder     className="h-4 w-4 flex-shrink-0 text-indigo-400 dark:text-indigo-500" />
        }
        <div className="flex-1 min-w-0 text-left">
          <span className="font-medium text-gray-800 dark:text-slate-200 text-xs">
            {processo.numero}
          </span>
          <span className="ml-2 text-gray-400 dark:text-slate-500 text-[11px] truncate">
            {processo.assunto}
          </span>
        </div>
        <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-slate-500 tabular-nums mr-1">
          {processo.documentos?.length || 0} arq.
        </span>
        {hasDocs && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownloadZip(processo.id, processo.numero) }}
            className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-80
                       hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
            title="Baixar todos como ZIP"
          >
            <Download className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
          </button>
        )}
      </button>
      {open && (
        <div className="ml-1">
          {hasDocs ? (
            processo.documentos.map(doc => (
              <FileNode key={doc.id} doc={doc} depth={depth + 1} onView={onView} />
            ))
          ) : (
            <p
              className="text-xs text-gray-400 dark:text-slate-500 py-1"
              style={{ paddingLeft: 12 + (depth + 1) * 20 }}
            >
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
  const { subdomain } = useParams()

  const { data, isLoading } = useQuery(
    'arquivo-processos',
    async () => {
      const { data } = await api.get('/processos/arquivo')
      return data.processos || []
    },
    { staleTime: 2 * 60 * 1000 }
  )

  const processos  = data || []
  const tree       = buildTree(processos)
  const anos       = Object.keys(tree).sort((a, b) => b - a)
  const totalDocs  = processos.reduce((s, p) => s + (p.documentos?.length || 0), 0)

  const handleViewDoc = async (doc) => {
    try {
      const { data } = await api.get(`/documentos/view/${doc.id}`)
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Não foi possível abrir o arquivo.')
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
    } catch {
      alert('Erro ao gerar ZIP.')
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
        title="Arquivo de Processos"
        subtitle={`${processos.length} processos concluídos · ${totalDocs} documentos`}
      />

      {anos.length === 0 ? (
        <div className="card p-16 text-center space-y-3">
          <Archive className="h-14 w-14 text-gray-200 dark:text-slate-700 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">
            Nenhum processo concluído encontrado
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Os processos concluídos aparecerão aqui organizados por ano, tipo e secretaria.
          </p>
        </div>
      ) : (
        <div className="card p-4">
          {/* Legenda de estrutura */}
          <div className="flex flex-wrap gap-4 px-3 pb-3 mb-3 border-b border-gray-100 dark:border-slate-700/50 text-[11px] text-gray-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 text-amber-400" /> Ano
            </span>
            <span className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 text-blue-400" /> Tipo de Processo
            </span>
            <span className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 text-emerald-400" /> Secretaria
            </span>
            <span className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 text-indigo-400" /> Processo
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-red-400" /> Arquivo
            </span>
          </div>

          <div className="space-y-0.5">
            {anos.map(ano => {
              const totalAno = Object.values(tree[ano])
                .flatMap(tipos => Object.values(tipos))
                .reduce((s, arr) => s + arr.length, 0)

              return (
                <FolderNode key={ano} label={ano} badge={`${totalAno} proc.`} depth={0}>
                  {Object.keys(tree[ano]).sort().map(tipo => {
                    const totalTipo = Object.values(tree[ano][tipo])
                      .reduce((s, arr) => s + arr.length, 0)

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
    </div>
  )
}
