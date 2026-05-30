import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Search, AlertCircle, ArrowLeft, Share2, Printer, ChevronLeft, SlidersHorizontal, X, LogIn, Building, FileSearch, Clock } from 'lucide-react'
import api from '../services/api'

export default function ConsultaPublica() {
  const { subdomain } = useParams()
  const location = useLocation()
  const [numeroProcesso, setNumeroProcesso] = useState('')
  const [processo, setProcesso] = useState(null)
  const [processosSugestoes, setProcessosSugestoes] = useState([])
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Filtros avançados
  const [showFiltros, setShowFiltros] = useState(false)
  const [filtroSecretaria, setFiltroSecretaria] = useState('')
  const [filtroCredor, setFiltroCredor] = useState('')
  const [filtroNumeroDid, setFiltroNumeroDid] = useState('')
  const [filtroDescricao, setFiltroDescricao] = useState('')
  const [secretariasList, setSecretariasList] = useState([])

  // Carregar secretarias cadastradas para o dropdown público
  useEffect(() => {
    api.get('/organizacao/secretarias/publico', {
      headers: { 'x-tenant-subdomain': subdomain }
    })
      .then(({ data }) => setSecretariasList(data.secretarias || []))
      .catch(() => setSecretariasList([]))
  }, [subdomain])

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

  // Filtros ativos como array de chips
  const filtrosAtivos = [
    filtroSecretaria && { key: 'secretaria', label: `Secretaria: ${filtroSecretaria}`, clear: () => setFiltroSecretaria('') },
    filtroCredor     && { key: 'credor',     label: `Credor: ${filtroCredor}`,         clear: () => setFiltroCredor('') },
    filtroNumeroDid  && { key: 'numero_did', label: `Nº DID: ${filtroNumeroDid}`,       clear: () => setFiltroNumeroDid('') },
    filtroDescricao  && { key: 'descricao',  label: `Descrição: ${filtroDescricao}`,   clear: () => setFiltroDescricao('') },
  ].filter(Boolean)

  const temFiltroAtivo = filtrosAtivos.length > 0 || numeroProcesso.trim()

  const buscarProcesso = async (termo) => {
    const temFiltroCampo = filtroSecretaria || filtroCredor || filtroNumeroDid || filtroDescricao
    const valorTexto = (termo ?? numeroProcesso).trim()

    // Se tem filtros de campo ou não tem texto, usa o endpoint de busca por filtros
    if (temFiltroCampo || (!valorTexto && temFiltroCampo)) {
      return buscarComFiltros(valorTexto)
    }

    if (!valorTexto) return
    setIsLoading(true)
    setSearched(true)
    setProcesso(null)
    setProcessosSugestoes([])
    setShowSugestoes(false)
    try {
      const { data } = await api.get(`/processos/publico/${encodeURIComponent(valorTexto)}`, {
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

  const buscarComFiltros = async (textoLivre = '') => {
    setIsLoading(true)
    setSearched(true)
    setProcesso(null)
    setProcessosSugestoes([])
    setShowSugestoes(false)
    try {
      const params = new URLSearchParams()
      if (textoLivre)       params.set('q',          textoLivre)
      if (filtroSecretaria) params.set('secretaria',  filtroSecretaria)
      if (filtroCredor)     params.set('credor',      filtroCredor)
      if (filtroNumeroDid)  params.set('numero_did',  filtroNumeroDid)
      if (filtroDescricao)  params.set('descricao',   filtroDescricao)
      const { data } = await api.get(`/processos/publico/busca?${params.toString()}`, {
        headers: { 'x-tenant-subdomain': subdomain }
      })
      const lista = data.processos || []
      if (lista.length === 1) {
        setProcesso(lista[0])
        setNumeroProcesso(lista[0].numero)
      } else if (lista.length > 1) {
        setProcessosSugestoes(lista)
        setShowSugestoes(true)
      }
    } catch (err) {
      console.error('Erro na busca por filtros:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConsulta = async (e) => {
    if (e) e.preventDefault()
    const temFiltroCampo = filtroSecretaria || filtroCredor || filtroNumeroDid || filtroDescricao
    if (!numeroProcesso.trim() && !temFiltroCampo) return
    if (temFiltroCampo) {
      await buscarComFiltros(numeroProcesso.trim())
    } else {
      await buscarProcesso()
    }
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
    <div
      className="relative h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-slate-950/60 pointer-events-none" />

      {/* ── HEADER ── */}
      <header className="relative z-20 flex-shrink-0 bg-[#050816]/80 backdrop-blur-xl border-b border-white/10">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to={`/${subdomain}/login`}>
            <img src="/logo_jprocesso.png" alt="jProcesso" className="h-9 w-auto object-contain" />
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider text-white/70 uppercase">
            <Link to={`/${subdomain}/login`} className="hover:text-white transition-colors">Início</Link>
            <a href="#" className="hover:text-white transition-colors">Perguntas Frequentes</a>
            <a href="#" className="hover:text-white transition-colors">Legislações</a>
            <Link
              to={`/${subdomain}/login`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/30 transition-all"
            >
              <LogIn className="h-3.5 w-3.5" />
              Acesso Restrito
            </Link>
          </nav>

          {/* Mobile: botão login */}
          <Link
            to={`/${subdomain}/login`}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-semibold"
          >
            <LogIn className="h-3.5 w-3.5" />
            Login
          </Link>
        </div>
      </header>

      {/* ── CONTEÚDO ── */}
      {searched && processo && !isLoading ? (

        /* ═══ RESULTADO: topo fixo + histórico rolável ═══ */
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

          {/* Topo fixo */}
          <div className="flex-shrink-0 bg-[#050816]/85 backdrop-blur-xl border-b border-white/10 py-3">
            <div className="max-w-2xl mx-auto px-6 space-y-3">

              {/* Linha busca */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSearched(false); setProcesso(null); setNumeroProcesso('') }}
                  className="flex items-center gap-1 text-sm text-fuchsia-300 hover:text-fuchsia-200 font-medium transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
                <form onSubmit={handleConsulta} className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={numeroProcesso}
                      onChange={(e) => setNumeroProcesso(e.target.value)}
                      className="w-full h-10 rounded-xl border border-white/20 bg-white/95 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                      placeholder="Número do processo..."
                    />
                  </div>
                  <button type="submit" className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap">Buscar</button>
                </form>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={handleCompartilhar} title="Compartilhar" className="text-white/50 hover:text-white transition-colors"><Share2 className="h-4 w-4" /></button>
                  <button onClick={handleImprimir} title="Imprimir" className="text-white/50 hover:text-white transition-colors"><Printer className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Dados básicos header */}
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest">Dados Básicos</h2>
                <span className="text-xs text-white/40">Consulta: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Card dados básicos */}
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="font-bold text-white text-sm mb-0.5">NUP {processo.numero}</p>
                <p className="text-xs text-white/50 mb-3">
                  Assunto: <span className="text-white/80">{processo.assunto}</span>
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
                      <p className="text-xs text-white/40">{label}:</p>
                      <p className="text-sm font-medium text-white/90 leading-snug">{value}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-white/40">Prioridade:</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
                      processo.prioridade === 'urgente'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-white/10 text-white/70 border border-white/10'
                    }`}>
                      {processo.prioridade === 'urgente' ? 'Urgente' : 'Normal'}
                    </span>
                  </div>
                </div>
                {processo.tramitacoes && processo.tramitacoes.length > 0 && (
                  <p className="text-xs text-white/40 mt-3 pt-3 border-t border-white/10">
                    <span className="font-semibold text-white/60">Tramitações: {processo.tramitacoes.length}</span>
                    {' | '}
                    Tempo total: {calcularPermanencia(processo.data_abertura || processo.created_at, processo.data_conclusao)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Título histórico fixo */}
          <div className="flex-shrink-0 max-w-2xl mx-auto w-full px-6 pt-4 pb-2 relative z-10">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Histórico de Tramitações</h3>
          </div>

          {/* Histórico rolável */}
          <div className="flex-1 overflow-y-auto pb-5 relative z-10">
            <div className="max-w-2xl mx-auto px-6">
              {processo.tramitacoes && processo.tramitacoes.length > 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-5">
                    {processo.tramitacoes
                      .sort((a, b) => new Date(b.data_hora || b.created_at) - new Date(a.data_hora || a.created_at))
                      .map((tramitacao, index, arr) => (
                        <div key={tramitacao.id || index} className="relative flex pb-6">
                          <div className="flex flex-col items-center mr-4 flex-shrink-0">
                            <div className={`w-3 h-3 rounded-full border-2 border-slate-950 mt-1 flex-shrink-0 ${
                              tramitacao.tipo_acao === 'abertura'  ? 'bg-blue-400' :
                              tramitacao.tipo_acao === 'tramite'   ? 'bg-fuchsia-400' :
                              tramitacao.tipo_acao === 'devolucao' ? 'bg-red-400' :
                              tramitacao.tipo_acao === 'conclusao' ? 'bg-violet-400' :
                              'bg-white/30'
                            }`} />
                            {index < arr.length - 1 && (
                              <div className="w-px flex-1 bg-white/10 mt-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/90">
                              {new Date(tramitacao.data_hora || tramitacao.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {' — '}
                              {new Date(tramitacao.data_hora || tramitacao.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-white/40 mb-1.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Permanência:{' '}
                              {index === 0
                                ? calcularPermanencia(tramitacao.data_hora || tramitacao.created_at, null)
                                : calcularPermanencia(
                                    arr[index + 1]?.data_hora || arr[index + 1]?.created_at,
                                    tramitacao.data_hora || tramitacao.created_at
                                  )
                              }
                            </p>
                            <p className="text-sm text-white/70">
                              <span className="font-medium text-white/90">Situação:</span> {tipoTramitacaoLabels[tramitacao.tipo_acao] || tramitacao.tipo_acao}
                            </p>
                            <p className="text-sm text-white/70">
                              <span className="font-medium text-white/90">Órgão/Unidade:</span>{' '}
                              {tramitacao.destinoSetor
                                ? `${tramitacao.destinoSetor.sigla ? tramitacao.destinoSetor.sigla + ' — ' : ''}${tramitacao.destinoSetor.nome}`
                                : tramitacao.origemSetor
                                ? `${tramitacao.origemSetor.sigla ? tramitacao.origemSetor.sigla + ' — ' : ''}${tramitacao.origemSetor.nome}`
                                : 'Sistema'
                              }
                            </p>
                            {tramitacao.despacho && (
                              <div className="mt-2 bg-white/5 border border-white/10 rounded-lg p-2.5">
                                <p className="text-xs font-semibold text-white/40 mb-0.5">Despacho:</p>
                                <p className="text-sm text-white/80">{tramitacao.despacho}</p>
                              </div>
                            )}
                            {tramitacao.justificativa_devolucao && (
                              <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                                <p className="text-xs font-semibold text-red-400 mb-0.5">Justificativa da Devolução:</p>
                                <p className="text-sm text-red-300">{tramitacao.justificativa_devolucao}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                  <p className="text-sm text-white/40">Nenhuma tramitação registrada para este processo.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      ) : (

        /* ═══ SEM RESULTADO / BUSCA INICIAL ═══ */
        <div className="relative z-10 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">

            {/* Card principal de busca */}
            <div className="bg-[#050816]/75 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_0_40px_rgba(168,85,247,0.15)] mb-4">
              <h1 className="text-lg font-bold text-white mb-1">Consultar processos</h1>
              <p className="text-sm text-white/50 mb-5">
                Pesquise processos sem precisar de login
              </p>

              {/* Form busca */}
              <form onSubmit={handleConsulta} className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    className="w-full h-12 rounded-xl border border-white/20 bg-white/95 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Digite o número do processo (Ex: Proc.2026.0000001 - SEMAD)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFiltros(v => !v)}
                  title="Filtros avançados"
                  className={`inline-flex items-center gap-1.5 h-12 px-4 rounded-xl border text-sm font-medium transition-all ${
                    showFiltros || filtrosAtivos.length > 0
                      ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {filtrosAtivos.length > 0 && (
                    <span className="bg-fuchsia-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {filtrosAtivos.length}
                    </span>
                  )}
                </button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-lg shadow-blue-600/30">
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </form>

              {/* Painel filtros */}
              {showFiltros && (
                <div className="mt-3 p-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 space-y-3">
                  <p className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">Filtros avançados</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Secretaria</label>
                      <select
                        value={filtroSecretaria}
                        onChange={e => setFiltroSecretaria(e.target.value)}
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500"
                      >
                        <option value="">Todas as secretarias</option>
                        {secretariasList.map(s => (
                          <option key={s.id} value={s.nome}>{s.sigla ? `${s.sigla} – ` : ''}{s.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Credor / Interessado</label>
                      <input
                        type="text"
                        value={filtroCredor}
                        onChange={e => setFiltroCredor(e.target.value)}
                        placeholder="Nome, CPF ou CNPJ..."
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Número DID</label>
                      <input
                        type="text"
                        value={filtroNumeroDid}
                        onChange={e => setFiltroNumeroDid(e.target.value)}
                        placeholder="Ex: DID-2026/0001..."
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Descrição / Assunto</label>
                      <input
                        type="text"
                        value={filtroDescricao}
                        onChange={e => setFiltroDescricao(e.target.value)}
                        placeholder="Palavra-chave no assunto..."
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-fuchsia-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setFiltroSecretaria(''); setFiltroCredor(''); setFiltroNumeroDid(''); setFiltroDescricao('') }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Limpar filtros
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConsulta()}
                      className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold transition-colors"
                    >
                      Aplicar filtros
                    </button>
                  </div>
                </div>
              )}

              {/* Chips filtros ativos */}
              {filtrosAtivos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {filtrosAtivos.map(f => (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-fuchsia-500/15 text-fuchsia-300 text-xs font-medium rounded-full border border-fuchsia-500/25"
                    >
                      {f.label}
                      <button onClick={f.clear} className="hover:text-red-400 transition-colors ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Estado inicial */}
            {!searched && (
              <div className="text-center py-6">
                <FileSearch className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm mb-1">Pesquise pelo número do protocolo ou use os filtros avançados.</p>
                <p className="text-white/30 text-xs mb-5">Você pode combinar secretaria, credor, número e descrição ao mesmo tempo.</p>
                <Link
                  to={`/${subdomain}/login`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm font-medium transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Acesso Restrito (Login)
                </Link>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="text-center py-14">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/10 border-t-fuchsia-500"></div>
                <p className="mt-4 text-white/50 text-sm">Buscando processo...</p>
              </div>
            )}

            {/* Múltiplos resultados */}
            {searched && !processo && !isLoading && showSugestoes && processosSugestoes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-white/60 font-medium mb-3">
                  {processosSugestoes.length} resultado(s) encontrado(s). Selecione para ver os detalhes:
                </p>
                {processosSugestoes.map(proc => (
                  <button
                    key={proc.id}
                    onClick={() => handleSelecionarProcesso(proc)}
                    className="w-full text-left bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{proc.numero}</p>
                        <p className="text-xs text-white/50 truncate mt-0.5">{proc.assunto}</p>
                        {proc.interessado_nome && <p className="text-xs text-white/35 truncate">{proc.interessado_nome}</p>}
                      </div>
                      <div className="flex-shrink-0 text-xs text-white/40 text-right">
                        <p>{proc.setorAtual?.secretaria?.sigla || proc.setorAtual?.sigla || ''}</p>
                        <p>{new Date(proc.data_abertura || proc.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Não encontrado */}
            {searched && !processo && !isLoading && !showSugestoes && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <AlertCircle className="h-14 w-14 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Nenhum resultado encontrado</h3>
                <p className="text-white/50 text-sm mb-5">Tente ajustar os filtros ou o número do processo.</p>
                <button
                  onClick={() => { setSearched(false); setNumeroProcesso(''); setShowSugestoes(false); setProcessosSugestoes([]) }}
                  className="text-fuchsia-400 hover:text-fuchsia-300 font-medium text-sm transition-colors"
                >
                  Fazer nova busca
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="relative z-20 flex-shrink-0 bg-[#050816]/80 backdrop-blur-xl border-t border-white/10">
        <div className="w-full px-6 py-3 flex items-center justify-center">
          <p className="text-xs font-medium tracking-[0.18em] text-white/50 uppercase">
            © 2026{' '}
            <a
              href="https://jeossistemas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fuchsia-300 transition-colors"
            >
              JEOS SISTEMAS E ASSESSORIA LTDA
            </a>
            <span className="mx-3 text-fuchsia-400/70">•</span>
            V1.0.0
          </p>
        </div>
      </footer>
    </div>
  )
}
