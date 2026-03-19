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
  FileDown, FileCheck
} from 'lucide-react'

export default function DetalhesProcesso() {
  const { id, subdomain } = useParams()
  const navigate = useNavigate()
  const [showTramitar, setShowTramitar] = useState(false)
  const [showDevolver, setShowDevolver] = useState(false)
  const [showConcluir, setShowConcluir] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { data: processo, refetch } = useQuery(['processo', id], async () => {
    const { data } = await api.get(`/processos/${id}`)
    return data.processo
  })

  const { user: currentUser } = useAuth()

  // Verificar se o usuário logado é o responsável atual
  const isResponsavel = !!(currentUser && processo && processo.status !== 'concluido' && (
    processo.usuario_atual_id === currentUser.id ||
    (processo.usuario_atual_id === null && processo.setor_atual_id === currentUser.setor?.id) ||
    currentUser.tipo === 'admin'
  ))

  const podeDevolver = isResponsavel && processo?.status !== 'aberto'

  const ultimaTramitacaoValida = processo?.tramitacoes
    ?.filter(t => t.tipo_acao === 'tramite' || t.tipo_acao === 'devolucao')
    .sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora))[0] ?? null
  const destinoDevolucao = ultimaTramitacaoValida ? {
    setor: ultimaTramitacaoValida.origemSetor,
    usuario: ultimaTramitacaoValida.origemUsuario
  } : null

  const handleTramitacaoSuccess = (data) => {
    setSuccessMessage(`Processo tramitado com sucesso! Assinatura: ${data.assinatura_digital.substring(0, 16)}...`)
    setTimeout(() => setSuccessMessage(''), 5000)
    refetch()
  }

  const statusLabels = {
    aberto: 'Aberto',
    em_analise: 'Em Análise',
    pendente: 'Pendente',
    devolvido: 'Devolvido',
    concluido: 'Concluído'
  }

  const statusColors = {
    aberto: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    em_analise: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700',
    pendente: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700',
    devolvido: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
    concluido: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
  }

  const tipoTramitacaoLabels = {
    abertura: 'Abertura',
    tramite: 'Tramitação',
    devolucao: 'Devolução',
    conclusao: 'Conclusão'
  }

  const tipoIcons = {
    abertura: FileText,
    tramite: Send,
    devolucao: ArrowLeftCircle,
    conclusao: CheckCircle
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

  if (!processo) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">⏳ Carregando processo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="page-title">📋 Processo {processo.numero}</h1>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${statusColors[processo.status]}`}>
                {statusLabels[processo.status]}
              </span>
              {processo.prioridade === 'urgente' && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white">
                  URGENTE
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Alerta quando não é responsável (só para processos não concluídos) */}
          {processo.status !== 'concluido' && !isResponsavel && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-4 py-2 rounded-lg text-sm flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
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
          
          <div className="flex flex-wrap gap-2">
            {processo.status !== 'concluido' && (
              <>
                {podeDevolver && (
                  <button
                    onClick={() => setShowDevolver(true)}
                    className="px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md transition-all bg-red-600 text-white hover:bg-red-700 hover:shadow-lg"
                  >
                    <ArrowLeftCircle className="h-5 w-5" />
                    <span>Devolver</span>
                  </button>
                )}
                <button
                  onClick={() => setShowTramitar(true)}
                  disabled={!isResponsavel}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md transition-all ${
                    isResponsavel
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="h-5 w-5" />
                  <span>Tramitar</span>
                </button>
                <button
                  onClick={() => setShowConcluir(true)}
                  disabled={!isResponsavel}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md transition-all ${
                    isResponsavel
                      ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Concluir</span>
                </button>
              </>
            )}
            {/* Botão dinâmico por tipo de processo */}
            {processo.tipo_processo === 'Did' && (
              <button
                onClick={() => navigate(`/${subdomain}/processos/${id}/did`)}
                disabled={!isResponsavel}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md transition-all ${
                  isResponsavel
                    ? 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title="Abrir Documento de Intenção de Despesas"
              >
                <ClipboardList className="h-5 w-5" />
                <span>DID</span>
              </button>
            )}
            {processo.tipo_processo === 'Despacho' && (
              <button
                onClick={() => gerarDespachoPDF(processo)}
                className="px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md transition-all bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg"
                title="Gerar PDF do Despacho"
              >
                <FileDown className="h-5 w-5" />
                <span>Despacho</span>
              </button>
            )}
            {processo.tipo_processo === 'Pauta' && (
              <button
                onClick={() => gerarPautaPDF(processo)}
                className="px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md transition-all bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg"
                title="Gerar PDF da Pauta"
              >
                <FileDown className="h-5 w-5" />
                <span>Pauta</span>
              </button>
            )}
            {processo.tipo_processo === 'Requisição' && (
              <button
                onClick={() => gerarRequisicaoPDF(processo)}
                className="px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md transition-all bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg"
                title="Gerar PDF da Requisição"
              >
                <FileDown className="h-5 w-5" />
                <span>Requisição</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="section-header flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              📋 Informações do Processo
            </h2>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{processo.assunto}</h3>
              <p className="text-gray-700 dark:text-gray-300">{processo.descricao}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <User className="h-4 w-4 mr-2" />
                    Interessado
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{processo.interessado_nome || processo.interessadoNome}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{processo.interessado_cpf_cnpj || processo.interessadoCpfCnpj}</p>
                </div>
                
                <div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Data de Abertura
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {processo.data_abertura || processo.created_at ? (
                      new Date(processo.data_abertura || processo.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    ) : 'Data não disponível'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {(processo.interessado_email || processo.interessadoEmail) && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Email</div>
                    <p className="font-semibold text-gray-900">{processo.interessado_email || processo.interessadoEmail}</p>
                  </div>
                )}
                
                {(processo.interessado_telefone || processo.interessadoTelefone) && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Telefone</div>
                    <p className="font-semibold text-gray-900">{processo.interessado_telefone || processo.interessadoTelefone}</p>
                  </div>
                )}

                {processo.setorAtual && (
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4 mr-2" />
                      Localização Atual
                    </div>
                    <p className="font-semibold text-gray-900">
                      {processo.setorAtual.nome}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {processo.documentos && processo.documentos.length > 0 && (
            <div className="card p-6">
              <h2 className="section-header flex items-center">
                <Paperclip className="h-5 w-5 mr-2 text-blue-600" />
                📎 Documentos Anexados ({processo.documentos.length})
              </h2>
              <div className="space-y-2">
                {processo.documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="bg-red-100 p-2 rounded">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{doc.nomeOriginal}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {(doc.tamanho / 1024).toFixed(2)} KB • {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors">
                      <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <h2 className="section-header flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              ⏰ Linha do Tempo
            </h2>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600"></div>
              <div className="space-y-6">
                {processo.tramitacoes?.map((tramitacao, index) => {
                  const Icon = tipoIcons[tramitacao.tipo] || FileText
                  const isLast = index === processo.tramitacoes.length - 1
                  
                  return (
                    <div key={tramitacao.id} className="relative pl-14">
                      <div className={`
                        absolute left-0 w-12 h-12 rounded-full flex items-center justify-center
                        ${isLast ? 'bg-blue-500' : 'bg-gray-300'}
                        shadow-md
                      `}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      
                      <div className={`
                        p-4 rounded-lg border-2 transition-all
                        ${isLast ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-700/30 border-gray-200 dark:border-gray-600'}
                      `}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {tipoTramitacaoLabels[tramitacao.tipo_acao || tramitacao.tipo]}
                            </span>
                            {tramitacao.origemSetor && (
                              <p className="text-sm text-gray-600 mt-1">
                                {tramitacao.origemSetor.nome}
                                {tramitacao.destinoSetor && (
                                  <span> → {tramitacao.destinoSetor.nome}</span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs text-gray-500 whitespace-nowrap ml-4">
                            <div className="font-semibold">
                              {new Date(tramitacao.data_hora || tramitacao.dataHora).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-gray-400">
                              {new Date(tramitacao.data_hora || tramitacao.dataHora).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        
                        {tramitacao.despacho && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600 mb-2">
                            {tramitacao.despacho}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-600 flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {tramitacao.origemUsuario?.nome}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="section-header">📱 QR Code de Acompanhamento</h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              {processo.qrcode && (
                <img src={processo.qrcode} alt="QR Code" className="w-full h-auto mx-auto" />
              )}
            </div>
            <p className="text-xs text-center text-gray-600 mt-3">
              Compartilhe este código para consulta pública
            </p>
          </div>

          {processo.status !== 'concluido' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">⚡ Ações Rápidas</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Use os botões no topo para tramitar, devolver, concluir ou preencher o DID do processo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Tramitação com Assinatura Eletrônica */}
      {showTramitar && (
        <ModalTramitacao
          processo={processo}
          onClose={() => setShowTramitar(false)}
          onSuccess={handleTramitacaoSuccess}
        />
      )}

      {/* Modal de Devolução */}
      {showDevolver && (
        <ModalDevolver
          processoId={id}
          destinoDevolucao={destinoDevolucao}
          onClose={() => setShowDevolver(false)}
          onSuccess={handleDevolverSuccess}
        />
      )}

      {/* Modal de Conclusão */}
      {showConcluir && (
        <ModalConcluir
          processoId={id}
          onClose={() => setShowConcluir(false)}
          onSuccess={handleConcluirSuccess}
        />
      )}
    </div>
  )
}
