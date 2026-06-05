import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useState, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import ModalTramitacao from '../components/ModalTramitacao'
import ModalDevolver from '../components/ModalDevolver'
import ModalConcluir from '../components/ModalConcluir'
import { gerarDespachoPDF, gerarPautaPDF, gerarRequisicaoPDF } from '../utils/gerarDocumentoPDF'
import {
  ArrowLeft, Send, ArrowLeftCircle, CheckCircle, Paperclip,
  FileText, Calendar, User, Clock, MapPin, AlertCircle, Download,
  ClipboardList, FileDown, Trash2, QrCode, Shield, Zap, ChevronRight,
  Plus, X, Upload, ExternalLink, Archive, FilePlus2,
} from 'lucide-react'
import { PageHeader, SectionTitle, EmptyState } from '../components/ui'

/* ── helpers de cor por tipo de tramitação ──────────────────────────────── */
const TIPO_CONFIG = {
  abertura:  { label: 'Abertura',    icon: FileText,        dot: 'bg-blue-500',   badge: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300'  },
  tramite:   { label: 'Tramitação',  icon: Send,            dot: 'bg-indigo-500', badge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  devolucao: { label: 'Devolução',   icon: ArrowLeftCircle, dot: 'bg-red-500',    badge: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300'    },
  conclusao: { label: 'Conclusão',   icon: CheckCircle,     dot: 'bg-green-500',  badge: 'bg-green-100  dark:bg-green-900/40  text-green-700  dark:text-green-300'  },
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB

function InfoField({ icon: Icon, label, value, sub }) {
  if (!value) return null
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />}
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-slate-500">{sub}</p>}
    </div>
  )
}

export default function DetalhesProcesso() {
  const { id, subdomain } = useParams()
  const navigate           = useNavigate()
  const fileInputRef       = useRef(null)

  /* ── estado dos modais ── */
  const [showTramitar,      setShowTramitar]      = useState(false)
  const [showDevolver,      setShowDevolver]       = useState(false)
  const [showConcluir,      setShowConcluir]       = useState(false)
  const [showConfirmDelete, setShowConfirmDelete]  = useState(false)
  const [deletando,         setDeletando]          = useState(false)
  const [successMessage,    setSuccessMessage]     = useState('')

  /* ── estado modal Anexar ── */
  const [showAnexar,  setShowAnexar]  = useState(false)
  const [nomeDoc,     setNomeDoc]     = useState('')
  const [arquivo,     setArquivo]     = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading,   setUploading]   = useState(false)

  const { data: processo, refetch } = useQuery(['processo', id], async () => {
    const { data } = await api.get(`/processos/${id}`)
    return data.processo
  })

  const { user: currentUser } = useAuth()

  const isResponsavel = !!(currentUser && processo && processo.status !== 'concluido' && (
    processo.usuario_atual_id === currentUser.id ||
    (processo.usuario_atual_id === null && processo.setor_atual_id === currentUser.setor?.id) ||
    currentUser.tipo === 'admin' ||
    (currentUser.tipo === 'gestor' && processo.setorAtual?.secretariaId === currentUser.secretariaId)
  ))

  const podeDevolver = isResponsavel && processo?.status !== 'aberto'

  const ultimaTramitacaoValida = processo?.tramitacoes
    ?.filter(t => t.tipo_acao === 'tramite' || t.tipo_acao === 'devolucao')
    .sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora))[0] ?? null
  const destinoDevolucao = ultimaTramitacaoValida ? {
    setor:   ultimaTramitacaoValida.origemSetor,
    usuario: ultimaTramitacaoValida.origemUsuario
  } : null

  const handleTramitacaoSuccess = (data) => {
    setSuccessMessage(`Processo tramitado com sucesso! Assinatura: ${data.assinatura_digital.substring(0, 16)}...`)
    setTimeout(() => setSuccessMessage(''), 5000)
    refetch()
  }

  const handleDevolverSuccess = (msg) => {
    setShowDevolver(false)
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 5000)
    refetch()
  }

  const handleConcluirSuccess = (msg) => {
    setShowConcluir(false)
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 5000)
    refetch()
  }

  const handleDownloadDocumento = async (doc) => {
    try {
      const response = await api.get(`/documentos/download/${doc.id}`, { responseType: 'blob' })
      const url  = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', doc.nome_arquivo)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao baixar arquivo: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleViewDocumento = async (doc) => {
    try {
      const { data } = await api.get(`/documentos/view/${doc.id}`)
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      alert('Erro ao abrir arquivo: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDownloadZip = async () => {
    try {
      const response = await api.get(`/documentos/zip/${id}`, { responseType: 'blob' })
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', `${processo.numero}-documentos.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao gerar ZIP: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDownloadMerged = async () => {
    try {
      const response = await api.get(`/documentos/merged/${id}`, { responseType: 'blob' })
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', `${processo.numero}-unificado.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao mesclar PDFs: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDeleteDocumento = async (docId) => {
    if (!window.confirm('Deseja excluir este documento permanentemente?')) return
    try {
      await api.delete(`/documentos/${docId}`)
      refetch()
    } catch (err) {
      alert('Erro ao excluir documento: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDeleteProcesso = async () => {
    setDeletando(true)
    try {
      await api.delete(`/processos/${id}`)
      navigate(`/${subdomain}/processos`, { replace: true })
    } catch (err) {
      setShowConfirmDelete(false)
      alert('Erro ao excluir processo: ' + (err.response?.data?.error || err.message))
    } finally {
      setDeletando(false)
    }
  }

  const handleArquivoChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > MAX_UPLOAD_BYTES) {
      setUploadError('O arquivo excede o limite de 20 MB.')
      setArquivo(null)
      return
    }
    setUploadError('')
    setArquivo(f)
    if (!nomeDoc) {
      // pré-preenche nome com nome do arquivo sem extensão
      setNomeDoc(f.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleAnexarSubmit = async (e) => {
    e.preventDefault()
    if (!nomeDoc.trim()) { setUploadError('Informe o nome do documento.'); return }
    if (!arquivo)        { setUploadError('Selecione um arquivo.');        return }
    if (arquivo.size > MAX_UPLOAD_BYTES) {
      setUploadError('O arquivo excede o limite de 20 MB.')
      return
    }

    setUploading(true)
    setUploadError('')
    try {
      const ext         = arquivo.name.substring(arquivo.name.lastIndexOf('.'))
      const nomeArquivo = nomeDoc.trim() + ext
      const fileRename  = new File([arquivo], nomeArquivo, { type: arquivo.type })

      const form = new FormData()
      form.append('file', fileRename)
      form.append('processoId', id)

      await api.post('/documentos/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSuccessMessage('Documento anexado com sucesso!')
      setTimeout(() => setSuccessMessage(''), 4000)
      setShowAnexar(false)
      setNomeDoc('')
      setArquivo(null)
      refetch()
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Erro ao enviar arquivo.')
    } finally {
      setUploading(false)
    }
  }

  const fecharAnexar = () => {
    setShowAnexar(false)
    setNomeDoc('')
    setArquivo(null)
    setUploadError('')
  }

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (!processo) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Carregando processo...</p>
        </div>
      </div>
    )
  }

  /* ── helpers locais ──────────────────────────────────────────────────── */
  const statusCls = {
    aberto:     'status-aberto',
    em_analise: 'status-em_analise',
    pendente:   'status-pendente',
    devolvido:  'status-devolvido',
    concluido:  'status-concluido',
  }

  const statusLabels = {
    aberto:     'Aberto',
    em_analise: 'Em Análise',
    pendente:   'Pendente',
    devolvido:  'Devolvido',
    concluido:  'Concluído',
  }

  const nivelAcessoLabels = { publico: 'Público', restrito: 'Restrito', sigiloso: 'Sigiloso' }

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const formatTime = (d) => d
    ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Mensagem de sucesso ── */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700
                        text-green-700 dark:text-green-400 px-4 py-3 rounded-xl
                        flex items-center gap-2 text-sm animate-fade-in">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* ── Alerta de não-responsável ── */}
      {processo.status !== 'concluido' && !isResponsavel && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700
                        text-amber-800 dark:text-amber-300 px-4 py-2.5 rounded-xl
                        text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Este processo está com{' '}
            <strong>
              {processo.usuarioAtual?.nome
                ? processo.usuarioAtual.nome
                : processo.setorAtual?.nome || 'outro setor'}
            </strong>.
          </span>
        </div>
      )}

      {/* ── Page Header ── */}
      <PageHeader
        icon={FileText}
        eyebrow={processo.tipo_processo ? `Processo · ${processo.tipo_processo}` : 'Processo'}
        title={processo.numero}
        subtitle={processo.assunto}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* badges */}
            <span className={statusCls[processo.status] || 'badge bg-gray-100 text-gray-600'}>
              {statusLabels[processo.status] || processo.status}
            </span>
            {processo.prioridade === 'urgente' && (
              <span className="badge bg-red-500 text-white">URGENTE</span>
            )}
            {/* Voltar */}
            <button onClick={() => navigate(-1)} className="btn-ghost gap-1.5" title="Voltar">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          </div>
        }
      />

      {/* ── Layout principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Coluna principal (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Card: Informações do Processo */}
          <div className="card p-6">
            <SectionTitle icon={FileText} title="Informações do Processo" />

            {/* Assunto em destaque */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Assunto</p>
              <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-relaxed">{processo.assunto}</p>
              {processo.descricao && (
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1.5 leading-relaxed">{processo.descricao}</p>
              )}
            </div>

            {/* Grid de campos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <InfoField
                icon={User}
                label="Interessado"
                value={processo.interessado_nome || processo.interessadoNome}
                sub={processo.interessado_cpf_cnpj || processo.interessadoCpfCnpj}
              />
              <InfoField
                icon={MapPin}
                label="Localização Atual"
                value={processo.setorAtual?.nome}
              />
              <InfoField
                icon={Calendar}
                label="Data de Abertura"
                value={formatDate(processo.data_abertura || processo.created_at)}
                sub={formatTime(processo.data_abertura || processo.created_at)}
              />
              <InfoField
                icon={Shield}
                label="Nível de Acesso"
                value={nivelAcessoLabels[processo.nivel_acesso] || processo.nivel_acesso}
              />
              <InfoField
                icon={Zap}
                label="Prioridade"
                value={processo.prioridade
                  ? processo.prioridade.charAt(0).toUpperCase() + processo.prioridade.slice(1)
                  : null}
              />
              <InfoField
                icon={Clock}
                label="Status"
                value={statusLabels[processo.status] || processo.status}
              />
              {(processo.interessado_email || processo.interessadoEmail) && (
                <InfoField
                  label="E-mail"
                  value={processo.interessado_email || processo.interessadoEmail}
                />
              )}
              {(processo.interessado_telefone || processo.interessadoTelefone) && (
                <InfoField
                  label="Telefone"
                  value={processo.interessado_telefone || processo.interessadoTelefone}
                />
              )}
            </div>
          </div>

          {/* Card: Documentos */}
          <div className="card p-6">
            <SectionTitle
              icon={Paperclip}
              title={
                processo.documentos?.length
                  ? `Documentos Anexados (${processo.documentos.length})`
                  : 'Documentos Anexados'
              }
              action={
                <div className="flex items-center gap-2 flex-wrap">
                  {processo.documentos?.length > 0 && (
                    <>
                      <button
                        onClick={handleDownloadZip}
                        title="Baixar todos os arquivos em ZIP"
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg
                                   bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300
                                   hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        ZIP
                      </button>
                      <button
                        onClick={handleDownloadMerged}
                        title="Baixar todos os PDFs mesclados em um único arquivo"
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg
                                   bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300
                                   hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        PDF Único
                      </button>
                    </>
                  )}
                  {processo.status !== 'concluido' && (
                    <button
                      onClick={() => setShowAnexar(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400
                                 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Anexar documento
                    </button>
                  )}
                </div>
              }
            />
            {processo.documentos && processo.documentos.length > 0 ? (
              <div className="space-y-2">
                {processo.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-3 py-2.5
                               bg-gray-50 dark:bg-slate-700/30
                               border border-gray-100 dark:border-slate-700/40
                               rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/60
                               transition-colors group"
                  >
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/40">
                      <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleViewDocumento(doc)}
                        className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400
                                   hover:text-blue-800 dark:hover:text-blue-300 hover:underline truncate
                                   max-w-full text-left transition-colors"
                        title={`Abrir ${doc.nome_arquivo} em nova aba`}
                      >
                        <span className="truncate">{doc.nome_arquivo}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
                      </button>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {(doc.tamanho_bytes / 1024).toFixed(1)} KB
                        {' · '}
                        {new Date(doc.data_upload || doc.createdAt).toLocaleDateString('pt-BR')}
                        {doc.uploadPor?.nome && ` · ${doc.uploadPor.nome}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleDownloadDocumento(doc)}
                        className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500
                                   hover:bg-white dark:hover:bg-slate-600/60
                                   hover:text-gray-700 dark:hover:text-slate-200 transition-all"
                        title={`Baixar ${doc.nome_arquivo}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {currentUser?.tipo === 'admin' && (
                        <button
                          onClick={() => handleDeleteDocumento(doc.id)}
                          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500
                                     hover:bg-red-50 dark:hover:bg-red-900/20
                                     hover:text-red-600 dark:hover:text-red-400 transition-all"
                          title="Excluir documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                  <Paperclip className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Nenhum arquivo anexado</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Ainda não há documentos vinculados a este processo.</p>
                {processo.status !== 'concluido' && (
                  <button
                    onClick={() => setShowAnexar(true)}
                    className="btn-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Anexar documento
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card: Linha do Tempo */}
          <div className="card p-6">
            <SectionTitle icon={Clock} title="Linha do Tempo" />

            {(!processo.tramitacoes || processo.tramitacoes.length === 0) ? (
              <EmptyState
                icon={Clock}
                title="Sem registros de tramitação"
                description="Nenhuma movimentação foi registrada ainda."
              />
            ) : (
              <div className="relative">
                {/* Linha vertical */}
                <div className="absolute left-[18px] top-5 bottom-5 w-px bg-gray-200 dark:bg-slate-700" />

                <div className="space-y-4">
                  {[...processo.tramitacoes]
                    .sort((a, b) => new Date(b.data_hora || b.dataHora) - new Date(a.data_hora || a.dataHora))
                    .map((tramitacao, index) => {
                    const tipo   = tramitacao.tipo_acao || tramitacao.tipo
                    const cfg    = TIPO_CONFIG[tipo] || TIPO_CONFIG.tramite
                    const Icon   = cfg.icon
                    const isFirst = index === 0
                    const dt     = tramitacao.data_hora || tramitacao.dataHora

                    return (
                      <div key={tramitacao.id} className="relative flex gap-4">
                        {/* Dot com ícone */}
                        <div className={`
                          relative z-10 shrink-0
                          flex items-center justify-center
                          w-9 h-9 rounded-full shadow-sm
                          ${cfg.dot} text-white
                          ${isFirst ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-current' : ''}
                        `}>
                          <Icon className="w-4 h-4" strokeWidth={2} />
                        </div>

                        {/* Card do evento */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className={`
                            rounded-xl border p-4 transition-colors
                            ${isFirst
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                              : 'bg-white dark:bg-slate-800/50 border-gray-100 dark:border-slate-700/40'}
                          `}>
                            {/* Topo: badge + data */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`badge text-xs ${cfg.badge}`}>{cfg.label}</span>
                                {tramitacao.origemSetor && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                                    <span className="font-medium text-gray-700 dark:text-slate-300">
                                      {tramitacao.origemSetor.nome}
                                    </span>
                                    {tramitacao.destinoSetor && (
                                      <>
                                        <ChevronRight className="w-3 h-3 shrink-0" />
                                        <span className="font-medium text-gray-700 dark:text-slate-300">
                                          {tramitacao.destinoSetor.nome}
                                        </span>
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                              {dt && (
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                                    {new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-slate-500">
                                    {new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Despacho */}
                            {tramitacao.despacho && (
                              <blockquote className="text-sm text-gray-700 dark:text-slate-300
                                                     bg-gray-50 dark:bg-slate-800/80
                                                     border-l-2 border-gray-300 dark:border-slate-600
                                                     rounded-r-lg px-3 py-2 mb-2.5
                                                     leading-relaxed italic">
                                {tramitacao.despacho}
                              </blockquote>
                            )}

                            {/* Autor */}
                            {tramitacao.origemUsuario?.nome && (
                              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500">
                                <User className="w-3 h-3 shrink-0" />
                                {tramitacao.origemUsuario.nome}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar (1/3) ── */}
        <div className="space-y-5">

          {/* QR Code */}
          {processo.qrcode && (
            <div className="card p-4">
              <SectionTitle icon={QrCode} title="QR Code" />
              <div className="flex justify-center">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-100 dark:border-slate-700 inline-block">
                  <img
                    src={processo.qrcode}
                    alt="QR Code do processo"
                    className="w-36 h-36 object-contain"
                  />
                </div>
              </div>
              <p className="text-xs text-center text-gray-400 dark:text-slate-500 mt-3 leading-snug">
                Compartilhe para consulta pública
              </p>
            </div>
          )}

          {/* Ações Rápidas */}
          <div className="card p-4">
            <SectionTitle icon={Zap} title="Ações Rápidas" />
            <div className="space-y-2">

              {/* Ações de tramitação — somente se não concluído */}
              {processo.status !== 'concluido' && isResponsavel && (
                <>
                  <button
                    onClick={() => setShowTramitar(true)}
                    className="w-full btn-primary justify-start"
                  >
                    <Send className="h-4 w-4" />
                    Tramitar processo
                  </button>
                  <button
                    onClick={() => setShowConcluir(true)}
                    className="w-full inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                               bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md
                               active:scale-95 justify-start"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Concluir processo
                  </button>
                  {podeDevolver && (
                    <button
                      onClick={() => setShowDevolver(true)}
                      className="w-full btn-danger justify-start"
                    >
                      <ArrowLeftCircle className="h-4 w-4" />
                      Devolver processo
                    </button>
                  )}
                </>
              )}

              {/* DID — qualquer um com acesso */}
              {processo.tipo_processo === 'Did' && (
                <button
                  onClick={() => navigate(`/${subdomain}/processos/${id}/did`, { state: { readOnly: !isResponsavel } })}
                  className="w-full inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                             bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md
                             active:scale-95 justify-start"
                >
                  <ClipboardList className="h-4 w-4" />
                  {isResponsavel ? 'Abrir DID' : 'Visualizar DID'}
                </button>
              )}

              {/* PDF por tipo */}
              {processo.tipo_processo === 'Despacho' && (
                <button
                  onClick={() => gerarDespachoPDF(processo)}
                  className="w-full inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                             bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md
                             active:scale-95 justify-start"
                >
                  <FileDown className="h-4 w-4" />
                  Gerar Despacho (PDF)
                </button>
              )}
              {processo.tipo_processo === 'Pauta' && (
                <button
                  onClick={() => gerarPautaPDF(processo)}
                  className="w-full inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                             bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-md
                             active:scale-95 justify-start"
                >
                  <FileDown className="h-4 w-4" />
                  Gerar Pauta (PDF)
                </button>
              )}
              {processo.tipo_processo === 'Requisição' && (
                <button
                  onClick={() => gerarRequisicaoPDF(processo)}
                  className="w-full inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                             bg-orange-600 text-white hover:bg-orange-700 shadow-sm hover:shadow-md
                             active:scale-95 justify-start"
                >
                  <FileDown className="h-4 w-4" />
                  Gerar Requisição (PDF)
                </button>
              )}

              {/* Excluir — somente admin */}
              {currentUser?.tipo === 'admin' && (
                <>
                  <div className="border-t border-gray-100 dark:border-slate-700/50 pt-2 mt-1" />
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full btn-danger justify-start"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir processo
                  </button>
                </>
              )}

              {/* Sem ações */}
              {processo.status === 'concluido' && currentUser?.tipo !== 'admin'
                && processo.tipo_processo !== 'Did'
                && processo.tipo_processo !== 'Despacho'
                && processo.tipo_processo !== 'Pauta'
                && processo.tipo_processo !== 'Requisição' && (
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed text-center py-2">
                  Processo concluído. Nenhuma ação disponível.
                </p>
              )}
            </div>
          </div>

          {/* Localização atual */}
          {processo.setorAtual && (
            <div className="card p-4">
              <SectionTitle icon={MapPin} title="Localização Atual" />
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{processo.setorAtual.nome}</p>
                {processo.usuarioAtual?.nome && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                    <User className="w-3.5 h-3.5" />
                    {processo.usuarioAtual.nome}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Anexar Documento ── */}
      {showAnexar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700/50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">Anexar Documento</h3>
              </div>
              <button
                onClick={fecharAnexar}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAnexarSubmit} className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                  Nome do documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomeDoc}
                  onChange={(e) => setNomeDoc(e.target.value)}
                  placeholder="Ex: Ofício de encaminhamento"
                  className="input-field text-sm"
                  maxLength={200}
                />
              </div>

              {/* Arquivo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                  Arquivo <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleArquivoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 px-4 py-5
                             border-2 border-dashed border-gray-200 dark:border-slate-600
                             rounded-xl hover:border-blue-400 dark:hover:border-blue-500
                             hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all
                             text-gray-500 dark:text-slate-400"
                >
                  <Upload className="h-6 w-6" />
                  {arquivo
                    ? <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{arquivo.name}</span>
                    : <span className="text-sm">Clique para selecionar o arquivo</span>
                  }
                  <span className="text-xs text-gray-400 dark:text-slate-500">PDF, DOC, DOCX, JPG, PNG — máx. 20 MB</span>
                </button>
              </div>

              {/* Erro */}
              {uploadError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={fecharAnexar} className="flex-1 btn-secondary" disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={uploading}>
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Anexar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modais de tramitação ── */}
      {showTramitar && (
        <ModalTramitacao
          processo={processo}
          onClose={() => setShowTramitar(false)}
          onSuccess={handleTramitacaoSuccess}
        />
      )}
      {showDevolver && (
        <ModalDevolver
          processoId={id}
          destinoDevolucao={destinoDevolucao}
          onClose={() => setShowDevolver(false)}
          onSuccess={handleDevolverSuccess}
        />
      )}
      {showConcluir && (
        <ModalConcluir
          processoId={id}
          onClose={() => setShowConcluir(false)}
          onSuccess={handleConcluirSuccess}
        />
      )}

      {/* ── Confirm Delete ── */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">Excluir Processo</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">
              Você está prestes a excluir permanentemente o processo:
            </p>
            <p className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4 text-sm">
              {processo.numero}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">
              Tramitações, documentos e DID vinculados serão removidos permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={deletando}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProcesso}
                disabled={deletando}
                className="btn-danger"
              >
                <Trash2 className="h-4 w-4" />
                {deletando ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
