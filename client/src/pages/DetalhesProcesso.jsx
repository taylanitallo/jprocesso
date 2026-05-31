import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import ModalTramitacao from '../components/ModalTramitacao'
import ModalDevolver from '../components/ModalDevolver'
import ModalConcluir from '../components/ModalConcluir'
import { gerarDespachoPDF, gerarPautaPDF, gerarRequisicaoPDF } from '../utils/gerarDocumentoPDF'
import {
  ArrowLeft, Send, ArrowLeftCircle, CheckCircle, Paperclip,
  FileText, Calendar, User, Clock, MapPin, AlertCircle, Download, ClipboardList,
  FileDown, Trash2, QrCode, Shield, Zap, ChevronRight
} from 'lucide-react'
import { PageHeader, SectionTitle, EmptyState, ActionBar } from '../components/ui'

/* ── helpers de cor por tipo de tramitação ─────────────────────────────── */
const TIPO_CONFIG = {
  abertura:  { label: 'Abertura',   icon: FileText,        dot: 'bg-blue-500',   badge: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300'  },
  tramite:   { label: 'Tramitação', icon: Send,            dot: 'bg-indigo-500', badge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  devolucao: { label: 'Devolução',  icon: ArrowLeftCircle, dot: 'bg-red-500',    badge: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300'    },
  conclusao: { label: 'Conclusão',  icon: CheckCircle,     dot: 'bg-green-500',  badge: 'bg-green-100  dark:bg-green-900/40  text-green-700  dark:text-green-300'  },
}

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
  const navigate = useNavigate()
  const [showTramitar, setShowTramitar]           = useState(false)
  const [showDevolver, setShowDevolver]           = useState(false)
  const [showConcluir, setShowConcluir]           = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deletando, setDeletando]                 = useState(false)
  const [successMessage, setSuccessMessage]       = useState('')

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
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.nome_arquivo)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao baixar arquivo: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDeleteProcesso = async () => {
    setDeletando(true)
    try {
      await api.delete(`/processos/${id}`)
      navigate(`/${subdomain}/processos`, { replace: true })
    } catch (err) {
      setShowConfirmDelete(false)
      setSuccessMessage('')
      alert('Erro ao excluir processo: ' + (err.response?.data?.error || err.message))
    } finally {
      setDeletando(false)
    }
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

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Mensagem de sucesso ───────────────────────────────────────── */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700
                        text-green-700 dark:text-green-400 px-4 py-3 rounded-xl
                        flex items-center gap-2 text-sm animate-fade-in">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* ── Alerta de não-responsável ─────────────────────────────────── */}
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

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <PageHeader
        icon={FileText}
        eyebrow={processo.tipo_processo ? `Processo · ${processo.tipo_processo}` : 'Processo'}
        title={processo.numero}
        subtitle={processo.assunto}
        actions={
          <ActionBar>
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

            {/* Ações de tramitação */}
            {processo.status !== 'concluido' && (
              <>
                {podeDevolver && (
                  <button onClick={() => setShowDevolver(true)} className="btn-danger">
                    <ArrowLeftCircle className="h-4 w-4" />
                    <span>Devolver</span>
                  </button>
                )}
                <button
                  onClick={() => setShowTramitar(true)}
                  disabled={!isResponsavel}
                  className={isResponsavel ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}
                >
                  <Send className="h-4 w-4" />
                  <span>Tramitar</span>
                </button>
                <button
                  onClick={() => setShowConcluir(true)}
                  disabled={!isResponsavel}
                  className={
                    isResponsavel
                      ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md active:scale-95'
                      : 'btn-secondary opacity-50 cursor-not-allowed'
                  }
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Concluir</span>
                </button>
              </>
            )}

            {/* Botões dinâmicos por tipo */}
            {processo.tipo_processo === 'Did' && (
              <button
                onClick={() => navigate(`/${subdomain}/processos/${id}/did`, { state: { readOnly: !isResponsavel } })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md active:scale-95"
                title={isResponsavel ? 'Abrir DID' : 'Visualizar DID (somente leitura)'}
              >
                <ClipboardList className="h-4 w-4" />
                <span>DID</span>
              </button>
            )}
            {processo.tipo_processo === 'Despacho' && (
              <button
                onClick={() => gerarDespachoPDF(processo)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md active:scale-95"
              >
                <FileDown className="h-4 w-4" />
                <span>Despacho</span>
              </button>
            )}
            {processo.tipo_processo === 'Pauta' && (
              <button
                onClick={() => gerarPautaPDF(processo)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-md active:scale-95"
              >
                <FileDown className="h-4 w-4" />
                <span>Pauta</span>
              </button>
            )}
            {processo.tipo_processo === 'Requisição' && (
              <button
                onClick={() => gerarRequisicaoPDF(processo)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 shadow-sm hover:shadow-md active:scale-95"
              >
                <FileDown className="h-4 w-4" />
                <span>Requisição</span>
              </button>
            )}

            {/* Excluir — somente admin */}
            {currentUser?.tipo === 'admin' && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="btn-danger"
                title="Excluir processo permanentemente"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}
          </ActionBar>
        }
      />

      {/* ── Layout principal ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Coluna principal (2/3) ──────────────────────────────────── */}
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
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{doc.nome_arquivo}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {(doc.tamanho_bytes / 1024).toFixed(1)} KB
                        {' · '}
                        {new Date(doc.data_upload || doc.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadDocumento(doc)}
                      className="shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-slate-500
                                 hover:bg-white dark:hover:bg-slate-600/60
                                 hover:text-gray-700 dark:hover:text-slate-200
                                 opacity-0 group-hover:opacity-100 transition-all"
                      title={`Baixar ${doc.nome_arquivo}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Paperclip}
                title="Nenhum arquivo anexado"
                description="Ainda não há documentos vinculados a este processo."
              />
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
                  {processo.tramitacoes.map((tramitacao, index) => {
                    const tipo  = tramitacao.tipo_acao || tramitacao.tipo
                    const cfg   = TIPO_CONFIG[tipo] || TIPO_CONFIG.tramite
                    const Icon  = cfg.icon
                    const isFirst = index === 0
                    const dt = tramitacao.data_hora || tramitacao.dataHora

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

        {/* ── Sidebar (1/3) ───────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* QR Code — compacto */}
          {processo.qrcode && (
            <div className="card p-4">
              <SectionTitle icon={QrCode} title="QR Code" />
              <div className="flex justify-center">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-100 dark:border-slate-700 inline-block">
                  <img
                    src={processo.qrcode}
                    alt="QR Code do processo"
                    className="w-32 h-32 object-contain"
                  />
                </div>
              </div>
              <p className="text-xs text-center text-gray-400 dark:text-slate-500 mt-3 leading-snug">
                Compartilhe para consulta pública
              </p>
            </div>
          )}

          {/* Ações Rápidas */}
          {processo.status !== 'concluido' && (
            <div className="card p-4">
              <SectionTitle icon={Zap} title="Ações Rápidas" />
              <div className="space-y-2">
                {isResponsavel ? (
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
                ) : (
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                    Você não é o responsável atual. As ações estão disponíveis nos botões do cabeçalho quando aplicável.
                  </p>
                )}
              </div>
            </div>
          )}

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

      {/* ── Modais ───────────────────────────────────────────────────── */}
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

      {/* Modal de confirmação de exclusão — somente admin */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Excluir Processo</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
              Você está prestes a excluir permanentemente o processo:
            </p>
            <p className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4 text-sm">
              {processo.numero}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">
              Esta ação <strong>não pode ser desfeita</strong>. Tramitações, documentos e DID
              vinculados serão removidos permanentemente.
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
