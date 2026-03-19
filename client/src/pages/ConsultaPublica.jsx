import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Search, FileText, AlertCircle, ArrowLeft, Share2, Printer, ChevronLeft, Facebook, Twitter, Instagram, Sun, Moon } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../context/ThemeContext'

export default function ConsultaPublica() {
  const { subdomain } = useParams()
  const location = useLocation()
  const { theme, toggleTheme, isDark } = useTheme()
  const [numeroProcesso, setNumeroProcesso] = useState('')
  const [processo, setProcesso] = useState(null)
  const [processosSugestoes, setProcessosSugestoes] = useState([])
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchType, setSearchType] = useState('suite')

  // Não carregar sugestões automaticamente - apenas buscar quando usuário pesquisar
  // useEffect removido para evitar erro 400 em rota protegida

  const tipoTramitacaoLabels = {
    abertura: 'Abertura',
    tramite: 'Tramitação',
    tramitacao: 'Tramitação',
    analise: 'Em análise',
    deferimento: 'Deferido',
    indeferimento: 'Indeferido',
    conclusao: 'Concluído',
    devolucao: 'Devolvido',
    arquivamento: 'Arquivado'
  }

  useEffect(() => {
    const query = location.state?.query
    if (query) {
      setNumeroProcesso(query)
      buscarProcesso(query)
    }
  }, [])

  const buscarProcesso = async (termo) => {
    const valor = (termo ?? numeroProcesso).trim()
    if (!valor) return
    setIsLoading(true)
    setSearched(true)
    setProcesso(null)
    setProcessosSugestoes([])
    setShowSugestoes(false)
    try {
      const { data } = await api.get(`/processos/publico/${encodeURIComponent(valor)}`, {
        headers: { 'x-tenant-subdomain': subdomain }
      })
      if (data.multiple) {
        setProcessosSugestoes(data.processos || [])
        setShowSugestoes(true)
      } else if (data && data.id) {
        setProcesso(data)
        setNumeroProcesso(data.numero)
      } else if (data.processo) {
        setProcesso(data.processo)
        setNumeroProcesso(data.processo.numero)
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setProcessosSugestoes([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleConsulta = async (e) => {
    if (e) e.preventDefault()
    if (!numeroProcesso.trim()) return
    await buscarProcesso()
  }

  const handleSelecionarProcesso = async (proc) => {
    setNumeroProcesso(proc.numero)
    setShowSugestoes(false)
    setSearched(true)
    setIsLoading(true)

    try {
      const { data } = await api.get(`/processos/publico/${encodeURIComponent(proc.numero)}`, {
        headers: { 'x-tenant-subdomain': subdomain }
      })
      setProcesso(data && data.id ? data : (data.processo || null))
    } catch (error) {
      console.error('Erro ao consultar processo:', error)
      setProcesso(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompartilhar = async () => {
    const url = `${window.location.origin}${window.location.pathname}?processo=${encodeURIComponent(processo?.numero || numeroProcesso)}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Processo ${processo?.numero || numeroProcesso}`,
          text: `Acompanhe a tramitação do processo ${processo?.numero || numeroProcesso}`,
          url,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copiado para a área de transferência!')
    }
  }

  const handleImprimir = () => {
    window.print()
  }

  const calcularPermanencia = (dataInicio, dataFim) => {
    const inicio = new Date(dataInicio)
    const fim = dataFim ? new Date(dataFim) : new Date()
    const diffMs = fim - inicio
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (diffDays > 0) {
      return `${diffDays} dia(s) ${diffHours}h`
    }
    return `${diffHours}h`
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">

      {/* Header */}
      <div className="bg-teal-700 dark:bg-teal-900 text-white shadow-md">
        <div className="w-full px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo / nome */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <FileText className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">jProcesso</div>
                <div className="text-sm font-bold leading-none">Consulta de Processos</div>
              </div>
            </div>

            {/* Nav + toggle */}
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-5 text-xs font-medium">
                <Link to={`/${subdomain}/login`} className="hover:text-teal-200 transition-colors">INÍCIO</Link>
                <a href="#" className="hover:text-teal-200 transition-colors">PERGUNTAS FREQUENTES</a>
                <a href="#" className="hover:text-teal-200 transition-colors">LEGISLAÇÕES</a>
              </nav>

              {/* Tema */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark
                  ? <Sun className="h-4 w-4 text-yellow-300" />
                  : <Moon className="h-4 w-4 text-white" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Área de conteúdo */}
      {searched && processo && !isLoading ? (

        /* ═══ RESULTADO: coluna única — topo fixo + histórico rolável ═══ */
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── TOPO FIXO: busca + dados básicos ── */}
          <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-3">
          <div className="max-w-2xl mx-auto px-6 space-y-3">

            {/* Linha: Voltar + form + compartilhar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSearched(false); setProcesso(null); setNumeroProcesso('') }}
                className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium transition-colors flex-shrink-0"
                title="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <form onSubmit={handleConsulta} className="flex-1 flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Digite o número do processo (Ex: Proc.2026.0000001 - SEMAD)"
                  />
                </div>
                <button type="submit" className="btn-primary px-5 py-2.5 whitespace-nowrap">Buscar</button>
              </form>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-500 dark:text-gray-400">Compartilhe:</span>
                <button onClick={handleCompartilhar} title="Compartilhar link" className="text-gray-400 hover:text-blue-500 transition-colors"><Share2 className="h-4 w-4" /></button>
                <button onClick={handleImprimir} title="Imprimir" className="text-gray-400 hover:text-blue-500 transition-colors"><Printer className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Título Dados Básicos */}
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Dados Básicos</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Data da consulta: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            {/* Card Dados Básicos */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
              <p className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">NUP {processo.numero}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Assunto: <span className="text-gray-700 dark:text-gray-300">{processo.assunto}</span>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
                {[
                  { label: 'Órgão', value: processo.setorAtual?.secretaria?.nome || processo.setorAtual?.nome || 'Não identificado' },
                  { label: 'Unidade', value: processo.setorAtual?.nome || 'Não identificado' },
                  { label: 'Interessado', value: processo.interessado_nome || 'Não informado' },
                  { label: 'Data de abertura', value: new Date(processo.data_abertura || processo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                  { label: 'Nível de acesso', value: 'Restrito' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{label}:</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">{value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Nível de prioridade:</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
                    processo.prioridade === 'urgente'
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {processo.prioridade === 'urgente' ? 'Urgente' : 'Normal'}
                  </span>
                </div>
              </div>
              {processo.tramitacoes && processo.tramitacoes.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Tramitações: {processo.tramitacoes.length}</span>
                  {' | '}
                  Tempo {calcularPermanencia(processo.data_abertura || processo.created_at, processo.data_conclusao)}
                </p>
              )}
            </div>
          </div>
          </div>

          {/* ── TÍTULO FIXO: Histórico ── */}
          <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 max-w-2xl mx-auto w-full px-6 pt-4 pb-2">
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Histórico de Tramitações</h3>
          </div>

          {/* ── HISTÓRICO: somente esta área rola ── */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-5">
          <div className="max-w-2xl mx-auto px-6">
            {processo.tramitacoes && processo.tramitacoes.length > 0 ? (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-5">
                  {processo.tramitacoes
                    .sort((a, b) => new Date(b.data_hora || b.created_at) - new Date(a.data_hora || a.created_at))
                    .map((tramitacao, index, arr) => (
                      <div key={tramitacao.id || index} className="relative flex pb-6">
                        <div className="flex flex-col items-center mr-4 flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 mt-1 flex-shrink-0 ${
                            tramitacao.tipo_acao === 'abertura'  ? 'bg-blue-500' :
                            tramitacao.tipo_acao === 'tramite'   ? 'bg-teal-500' :
                            tramitacao.tipo_acao === 'devolucao' ? 'bg-red-500' :
                            tramitacao.tipo_acao === 'conclusao' ? 'bg-purple-500' :
                            'bg-gray-400'
                          }`} />
                          {index < arr.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 dark:bg-gray-600 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {new Date(tramitacao.data_hora || tramitacao.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {' - '}
                            {new Date(tramitacao.data_hora || tramitacao.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                            Permanência : {index === 0
                              ? calcularPermanencia(tramitacao.data_hora || tramitacao.created_at, null)
                              : calcularPermanencia(
                                  arr[index + 1]?.data_hora || arr[index + 1]?.created_at,
                                  tramitacao.data_hora || tramitacao.created_at
                                )
                            }
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Situação:</span> {tipoTramitacaoLabels[tramitacao.tipo_acao] || tramitacao.tipo_acao}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Órgão/Unidade:</span>{' '}
                            {tramitacao.destinoSetor
                              ? `${tramitacao.destinoSetor.sigla ? tramitacao.destinoSetor.sigla + ' - ' : ''}${tramitacao.destinoSetor.nome}`
                              : tramitacao.origemSetor
                              ? `${tramitacao.origemSetor.sigla ? tramitacao.origemSetor.sigla + ' - ' : ''}${tramitacao.origemSetor.nome}`
                              : 'Sistema'
                            }
                          </p>
                          {tramitacao.despacho && (
                            <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded p-2.5">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Despacho:</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{tramitacao.despacho}</p>
                            </div>
                          )}
                          {tramitacao.justificativa_devolucao && (
                            <div className="mt-2 bg-red-50 dark:bg-red-900/20 rounded p-2.5">
                              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">Justificativa da Devolução:</p>
                              <p className="text-sm text-red-800 dark:text-red-300">{tramitacao.justificativa_devolucao}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-600">Nenhuma tramitação registrada para este processo.</p>
              </div>
            )}
          </div>
          </div>
        </div>

      ) : (

        /* ═══ SEM RESULTADO: coluna única com scroll normal ═══ */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-6">

            {/* Barra: form + compartilhar + voltar */}
            <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <form onSubmit={handleConsulta} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Digite o número do processo (Ex: Proc.2026.0000001 - SEMAD)"
                  />
                </div>
                <button type="submit" className="btn-primary px-5 py-2.5 whitespace-nowrap">Buscar</button>
              </form>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={searchType === 'suite'} onChange={() => setSearchType('suite')} className="w-4 h-4 text-teal-600 focus:ring-teal-500" />
                  <span className="text-gray-600 dark:text-gray-300">jProcesso <span className="text-gray-400">(Ex: Proc.2026.0000001 - SEMAD)</span></span>
                </label>
              </div>
            </div>
            {/* Compartilhar + Voltar */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Compartilhe:</span>
                <button onClick={handleCompartilhar} title="Compartilhar link" className="hover:text-blue-500 transition-colors"><Share2 className="h-4 w-4" /></button>
                <button onClick={handleImprimir} title="Imprimir" className="hover:text-blue-500 transition-colors"><Printer className="h-4 w-4" /></button>
              </div>
              {searched && processo && (
                <button
                  onClick={() => { setSearched(false); setProcesso(null); setNumeroProcesso('') }}
                  className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Voltar</span>
                </button>
              )}
            </div>
          </div>

          {/* Estado inicial */}
          {!searched && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 mb-3">Pesquise pelo número do protocolo para acompanhar a tramitação.</p>
              <Link
                to={`/${subdomain}/login`}
                className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Acesso Restrito (Login)</span>
              </Link>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 dark:border-teal-400"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Buscando processo...</p>
            </div>
          )}

          {/* Não encontrado */}
          {searched && !processo && !isLoading && (
            <div className="card p-12 text-center mt-4">
              <AlertCircle className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Processo não encontrado</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Não foi possível encontrar um processo com o número informado.</p>
              <button
                onClick={() => { setSearched(false); setNumeroProcesso('') }}
                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium"
              >
                Fazer nova busca
              </button>
            </div>
          )}

        </div>
      </div>

      )}

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <div className="w-full px-6 py-1.5 flex items-center justify-center gap-4">
          <a href="https://jeossistemas.com" target="_blank" rel="noreferrer" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">JEOS Sistemas</a>
          <a href="#" className="text-teal-600 dark:text-teal-400 hover:opacity-80"><Facebook className="h-3.5 w-3.5" /></a>
          <a href="#" className="text-teal-600 dark:text-teal-400 hover:opacity-80"><Twitter className="h-3.5 w-3.5" /></a>
          <a href="#" className="text-teal-600 dark:text-teal-400 hover:opacity-80"><Instagram className="h-3.5 w-3.5" /></a>
          <span className="text-xs text-gray-400 dark:text-gray-600">© {new Date().getFullYear()} JEOS Sistemas de Governo</span>
        </div>
      </footer>
    </div>
  )
}
