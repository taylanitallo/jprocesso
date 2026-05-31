import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Search, AlertCircle, ArrowLeft, Share2, Printer, ChevronLeft, SlidersHorizontal, X, LogIn, Building, FileSearch, Clock, Sun, Moon } from 'lucide-react'
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
  const [modoClaro, setModoClaro] = useState(false)

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

  // ── TEMA ──────────────────────────────────────────────────────────────────
  const mc = modoClaro
  const bgCard     = mc ? 'rgba(255,255,255,0.97)'      : 'rgba(8,12,30,0.88)'
  const bdCard     = mc ? 'border-slate-200'            : 'border-slate-700/60'
  const bdHdr      = mc ? 'border-slate-200/80'         : 'border-slate-700/50'
  const bgCardHdr  = mc ? 'rgba(139,92,246,0.05)'       : 'rgba(139,92,246,0.07)'
  const txt1       = mc ? 'text-slate-900'              : 'text-white'
  const txt2       = mc ? 'text-slate-700'              : 'text-slate-300'
  const txt3       = mc ? 'text-slate-500'              : 'text-slate-500'
  const txtV       = mc ? 'text-violet-700'             : 'text-violet-300'
  const bgDesp     = mc ? 'bg-slate-100 border-slate-200'          : 'bg-slate-800/40 border-slate-700/50'
  const bgDev      = mc ? 'bg-orange-50 border-orange-200'         : 'border-orange-500/25'
  const txtDevT    = mc ? 'text-orange-600'             : 'text-orange-400'
  const txtDevB    = mc ? 'text-orange-800'             : 'text-orange-200'
  const hdrBg      = mc ? 'rgba(255,255,255,0.96)'      : 'rgba(5,8,22,0.9)'
  const tbrBg      = mc ? 'rgba(248,250,252,0.96)'      : 'rgba(6,10,26,0.9)'
  const ftrBg      = mc ? 'rgba(248,250,252,0.95)'      : 'rgba(6,10,26,0.9)'
  const bdPg       = mc ? 'border-slate-200/80'         : 'border-white/[0.08]'
  const overlayClass = mc ? 'bg-white/80'               : 'bg-slate-950/75'
  const searchInputBg = mc ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/95 border-white/20 text-slate-900'
  const txtNav     = mc ? 'text-slate-600 hover:text-slate-900' : 'text-white/55 hover:text-white/90'
  const bgSugest   = mc ? 'rgba(255,255,255,0.97)'      : 'rgba(8,12,30,0.88)'
  const bdSugest   = mc ? 'border-slate-200'            : 'border-slate-700/60'
  const txtMeta    = mc ? 'text-slate-400'              : 'text-slate-400'

  // helpers de badge
  const badgeSituacao = (tipo) => {
    const dark = {
      abertura:      { label: 'Abertura',    cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      tramite:       { label: 'Tramitação',  cls: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
      tramitacao:    { label: 'Tramitação',  cls: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
      analise:       { label: 'Em análise',  cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      deferimento:   { label: 'Deferido',    cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      indeferimento: { label: 'Indeferido',  cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
      conclusao:     { label: 'Concluído',   cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
      devolucao:     { label: 'Devolvido',   cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
      arquivamento:  { label: 'Arquivado',   cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    }
    const light = {
      abertura:      { label: 'Abertura',    cls: 'bg-blue-100 text-blue-700 border-blue-300' },
      tramite:       { label: 'Tramitação',  cls: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' },
      tramitacao:    { label: 'Tramitação',  cls: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' },
      analise:       { label: 'Em análise',  cls: 'bg-amber-100 text-amber-700 border-amber-300' },
      deferimento:   { label: 'Deferido',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      indeferimento: { label: 'Indeferido',  cls: 'bg-red-100 text-red-700 border-red-300' },
      conclusao:     { label: 'Concluído',   cls: 'bg-violet-100 text-violet-700 border-violet-300' },
      devolucao:     { label: 'Devolvido',   cls: 'bg-orange-100 text-orange-700 border-orange-300' },
      arquivamento:  { label: 'Arquivado',   cls: 'bg-slate-100 text-slate-600 border-slate-300' },
    }
    const map = mc ? light : dark
    const b = map[tipo] || (mc ? { label: tipo, cls: 'bg-slate-100 text-slate-600 border-slate-300' } : { label: tipo, cls: 'bg-white/10 text-white/60 border-white/15' })
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${b.cls}`}>{b.label}</span>
  }

  const dotColor = (tipo) => ({
    abertura:      'bg-blue-400 shadow-blue-400/50',
    tramite:       'bg-fuchsia-400 shadow-fuchsia-400/50',
    tramitacao:    'bg-fuchsia-400 shadow-fuchsia-400/50',
    devolucao:     'bg-orange-400 shadow-orange-400/50',
    conclusao:     'bg-violet-400 shadow-violet-400/50',
    deferimento:   'bg-emerald-400 shadow-emerald-400/50',
    indeferimento: 'bg-red-400 shadow-red-400/50',
    arquivamento:  'bg-slate-400 shadow-slate-400/50',
  }[tipo] || (mc ? 'bg-slate-400' : 'bg-white/30'))

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
      {/* Overlay adaptável ao tema */}
      <div className={`absolute inset-0 ${overlayClass} pointer-events-none transition-colors duration-300`} />

      {/* ── HEADER ── */}
      <header
        className={`relative z-20 flex-shrink-0 backdrop-blur-xl border-b ${bdPg} transition-colors duration-300`}
        style={{ background: hdrBg }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to={`/${subdomain}/login`}>
            <img src="/logo_jprocesso.png" alt="jProcesso" className="h-8 w-auto object-contain" />
          </Link>

          <nav className={`hidden md:flex items-center gap-7 text-[11px] font-semibold tracking-widest uppercase`}>
            <Link to={`/${subdomain}/login`} className={`${txtNav} transition-colors`}>Início</Link>
            <a href="#" className={`${txtNav} transition-colors`}>Perguntas Frequentes</a>
            <a href="#" className={`${txtNav} transition-colors`}>Legislações</a>
            <Link
              to={`/${subdomain}/login`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:bg-violet-600/30 transition-all text-[11px]"
            >
              <LogIn className="h-3.5 w-3.5" />
              Acesso Restrito
            </Link>

            {/* Toggle modo claro/escuro */}
            <button
              onClick={() => setModoClaro(v => !v)}
              title={mc ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                mc
                  ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                  : 'bg-white/8 border-white/20 text-white/60 hover:bg-white/15 hover:text-white/90'
              }`}
            >
              {mc ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {mc ? 'Escuro' : 'Claro'}
            </button>
          </nav>

          {/* Mobile: botões */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setModoClaro(v => !v)}
              className={`p-2 rounded-lg border transition-all ${
                mc ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-white/8 border-white/20 text-white/60'
              }`}
            >
              {mc ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <Link
              to={`/${subdomain}/login`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs font-semibold"
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* ── CONTEÚDO ── */}
      {searched && processo && !isLoading ? (

        /* ═══ RESULTADO ═══ */
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

          {/* Toolbar de busca */}
          <div
            className={`flex-shrink-0 backdrop-blur-xl border-b ${bdPg} transition-colors duration-300`}
            style={{ background: tbrBg }}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => { setSearched(false); setProcesso(null); setNumeroProcesso('') }}
                  className={`flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium transition-colors ${mc ? 'text-violet-700 hover:text-violet-900' : 'text-violet-400 hover:text-violet-300'}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </button>

                <form onSubmit={handleConsulta} className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={numeroProcesso}
                      onChange={(e) => setNumeroProcesso(e.target.value)}
                      className={`w-full h-10 rounded-xl border pl-9 pr-3 text-sm placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${searchInputBg}`}
                      placeholder="Número do processo..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex-shrink-0 h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    Buscar
                  </button>
                </form>

                <div className="flex-shrink-0 flex items-center gap-2">
                  <button onClick={handleCompartilhar} title="Compartilhar" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={handleImprimir} title="Imprimir" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo rolável */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-10">

              {/* ── CARD DADOS DO PROCESSO ── */}
              <div
                className={`rounded-2xl border ${bdCard} overflow-hidden transition-colors duration-300`}
                style={{ background: bgCard, backdropFilter: 'blur(20px)' }}
              >
                {/* Cabeçalho do card */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-b ${bdHdr}`}
                  style={{ background: bgCardHdr }}>
                  <div className="flex items-center gap-2">
                    <Building className={`h-4 w-4 ${txtV}`} />
                    <span className={`text-xs font-bold ${txtV} uppercase tracking-widest`}>Dados do Processo</span>
                  </div>
                  <span className={`text-[11px] ${txt3}`}>
                    Consulta: {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="px-5 py-5 space-y-5">
                  {/* NUP + assunto */}
                  <div>
                    <h2 className={`text-xl font-bold ${txt1} tracking-tight leading-tight`}>
                      NUP {processo.numero}
                    </h2>
                    <p className={`mt-1 text-sm ${txt3}`}>
                      Assunto: <span className={txt2}>{processo.assunto}</span>
                    </p>
                  </div>

                  {/* Grid de campos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-0.5">
                      <p className={`text-[11px] font-semibold ${txt3} uppercase tracking-wider`}>Órgão</p>
                      <p className={`text-sm font-medium ${txt1}`}>
                        {processo.setorAtual?.secretaria?.nome || processo.setorAtual?.nome || 'Não identificado'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-[11px] font-semibold ${txt3} uppercase tracking-wider`}>Unidade</p>
                      <p className={`text-sm font-medium ${txt1}`}>
                        {processo.setorAtual?.nome || 'Não identificado'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-[11px] font-semibold ${txt3} uppercase tracking-wider`}>Interessado</p>
                      <p className={`text-sm font-medium ${txt1}`}>
                        {processo.interessado_nome || 'Não informado'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-[11px] font-semibold ${txt3} uppercase tracking-wider`}>Data de Abertura</p>
                      <p className={`text-sm font-medium ${txt1}`}>
                        {new Date(processo.data_abertura || processo.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[11px] font-semibold ${txt3} uppercase tracking-wider`}>Nível de Acesso</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        Restrito
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[11px] font-semibold ${txt3} uppercase tracking-wider`}>Prioridade</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                        processo.prioridade === 'urgente'
                          ? 'bg-red-500/15 text-red-600 border-red-500/25'
                          : mc ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                      }`}>
                        {processo.prioridade === 'urgente' ? 'Urgente' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do card */}
                  {processo.tramitacoes && processo.tramitacoes.length > 0 && (
                    <div className={`pt-3 border-t ${bdHdr} flex flex-wrap gap-4 text-xs ${txt3}`}>
                      <span>
                        <span className={`font-semibold ${mc ? 'text-slate-600' : 'text-slate-400'}`}>Tramitações:</span>{' '}
                        {processo.tramitacoes.length}
                      </span>
                      <span>
                        <span className={`font-semibold ${mc ? 'text-slate-600' : 'text-slate-400'}`}>Tempo total:</span>{' '}
                        {calcularPermanencia(processo.data_abertura || processo.created_at, processo.data_conclusao)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── HISTÓRICO DE TRAMITAÇÕES ── */}
              <div
                className={`rounded-2xl border ${bdCard} overflow-hidden transition-colors duration-300`}
                style={{ background: bgCard, backdropFilter: 'blur(20px)' }}
              >
                {/* Cabeçalho */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-b ${bdHdr}`}
                  style={{ background: bgCardHdr }}>
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${txtV}`} />
                    <span className={`text-xs font-bold ${txtV} uppercase tracking-widest`}>
                      Histórico de Tramitações
                    </span>
                  </div>
                  {processo.tramitacoes && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[10px] font-bold">
                      {processo.tramitacoes.length}
                    </span>
                  )}
                </div>

                <div className="px-5 py-5">
                  {processo.tramitacoes && processo.tramitacoes.length > 0 ? (
                    <div className="space-y-0">
                      {processo.tramitacoes
                        .sort((a, b) => new Date(b.data_hora || b.created_at) - new Date(a.data_hora || a.created_at))
                        .map((tramitacao, index, arr) => (
                          <div key={tramitacao.id || index} className="relative flex gap-4">
                            {/* Timeline vertical */}
                            <div className="flex flex-col items-center flex-shrink-0 w-6">
                              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 shadow-[0_0_8px] ${dotColor(tramitacao.tipo_acao)}`} />
                              {index < arr.length - 1 && (
                                <div className={`w-px flex-1 mt-1 mb-0 ${mc ? 'bg-slate-200' : 'bg-slate-700/60'}`} style={{ minHeight: '2rem' }} />
                              )}
                            </div>

                            {/* Conteúdo */}
                            <div className={`flex-1 min-w-0 ${index < arr.length - 1 ? 'pb-6' : 'pb-1'}`}>
                              {/* Data/hora + situação */}
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`text-sm font-bold ${txt1}`}>
                                  {new Date(tramitacao.data_hora || tramitacao.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                  })}
                                  {' — '}
                                  {new Date(tramitacao.data_hora || tramitacao.created_at).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                                {badgeSituacao(tramitacao.tipo_acao)}
                              </div>

                              {/* Permanência */}
                              <p className={`text-[11px] ${txt3} flex items-center gap-1 mb-2`}>
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

                              {/* Órgão/Unidade + badge ATUAL */}
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold uppercase tracking-wide ${txt3}`}>Orgão/Unidade:</span>
                                <span className={`text-sm ${txt2}`}>
                                  {tramitacao.destinoSetor
                                    ? `${tramitacao.destinoSetor.sigla ? tramitacao.destinoSetor.sigla + ' — ' : ''}${tramitacao.destinoSetor.nome}`
                                    : tramitacao.origemSetor
                                    ? `${tramitacao.origemSetor.sigla ? tramitacao.origemSetor.sigla + ' — ' : ''}${tramitacao.origemSetor.nome}`
                                    : 'Sistema'
                                  }
                                </span>
                                {index === 0 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/35">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                    ATUAL
                                  </span>
                                )}
                              </div>

                              {/* Despacho */}
                              {tramitacao.despacho && (
                                <div className={`rounded-xl border px-4 py-3 ${bgDesp}`}>
                                  <p className={`text-[11px] font-semibold ${txt3} uppercase tracking-wider mb-1.5`}>Despacho</p>
                                  <p className={`text-sm ${txt2} leading-relaxed`}>{tramitacao.despacho}</p>
                                </div>
                              )}

                              {/* Justificativa devolução */}
                              {tramitacao.justificativa_devolucao && (
                                <div className={`mt-2 rounded-xl border px-4 py-3 ${bgDev}`}>
                                  <p className={`text-[11px] font-semibold ${txtDevT} uppercase tracking-wider mb-1.5`}>
                                    Justificativa da Devolução
                                  </p>
                                  <p className={`text-sm ${txtDevB} leading-relaxed`}>{tramitacao.justificativa_devolucao}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${txt3} text-center py-8`}>
                      Nenhuma tramitação registrada para este processo.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* ═══ BUSCA INICIAL / SEM RESULTADO ═══ */
        <div className="relative z-10 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

            {/* Card de busca */}
            <div
              className={`rounded-2xl border ${bdCard} p-6 mb-5 shadow-[0_0_40px_rgba(139,92,246,0.12)] transition-colors duration-300`}
              style={{ background: bgCard, backdropFilter: 'blur(20px)' }}
            >
              <h1 className={`text-lg font-bold ${txt1} mb-1`}>Consultar processos</h1>
              <p className={`text-sm ${txt3} mb-5`}>Pesquise processos sem precisar de login</p>

              {/* Form */}
              <form onSubmit={handleConsulta} className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    className={`w-full h-12 rounded-xl border pl-11 pr-4 text-sm placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${searchInputBg}`}
                    placeholder="Digite o número do processo (Ex: Proc.2026.0000001 - SEMAD)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFiltros(v => !v)}
                  title="Filtros avançados"
                  className={`inline-flex items-center gap-1.5 h-12 px-4 rounded-xl border text-sm font-medium transition-all flex-shrink-0 ${
                    showFiltros || filtrosAtivos.length > 0
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {filtrosAtivos.length > 0 && (
                    <span className="bg-violet-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
                      {filtrosAtivos.length}
                    </span>
                  )}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-lg shadow-violet-600/25 flex-shrink-0"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </form>

              {/* Painel filtros */}
              {showFiltros && (
                <div className={`mt-3 p-4 rounded-xl border border-violet-500/20 space-y-3 ${mc ? 'bg-violet-50' : 'bg-violet-500/5'}`}>
                  <p className={`text-xs font-bold ${txtV} uppercase tracking-widest`}>Filtros avançados</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium ${txt3} mb-1.5`}>Secretaria</label>
                      <select
                        value={filtroSecretaria}
                        onChange={e => setFiltroSecretaria(e.target.value)}
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                      >
                        <option value="">Todas as secretarias</option>
                        {secretariasList.map(s => (
                          <option key={s.id} value={s.nome}>{s.sigla ? `${s.sigla} – ` : ''}{s.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${txt3} mb-1.5`}>Credor / Interessado</label>
                      <input
                        type="text"
                        value={filtroCredor}
                        onChange={e => setFiltroCredor(e.target.value)}
                        placeholder="Nome, CPF ou CNPJ..."
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${txt3} mb-1.5`}>Número DID</label>
                      <input
                        type="text"
                        value={filtroNumeroDid}
                        onChange={e => setFiltroNumeroDid(e.target.value)}
                        placeholder="Ex: DID-2026/0001..."
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${txt3} mb-1.5`}>Descrição / Assunto</label>
                      <input
                        type="text"
                        value={filtroDescricao}
                        onChange={e => setFiltroDescricao(e.target.value)}
                        placeholder="Palavra-chave no assunto..."
                        className="w-full h-10 rounded-xl border border-white/20 bg-white/95 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500"
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
                      className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-500/15 text-violet-300 text-xs font-medium rounded-full border border-violet-500/25"
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
            {!searched && !isLoading && (
              <div className="text-center py-8">
                <FileSearch className={`h-10 w-10 ${mc ? 'text-slate-300' : 'text-slate-600'} mx-auto mb-3`} />
                <p className={`${mc ? 'text-slate-500' : 'text-slate-400'} text-sm mb-1`}>Pesquise pelo número do protocolo ou use os filtros avançados.</p>
                <p className={`${mc ? 'text-slate-400' : 'text-slate-600'} text-xs mb-6`}>Você pode combinar secretaria, credor, número e descrição ao mesmo tempo.</p>
                <Link
                  to={`/${subdomain}/login`}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${mc ? 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/25'}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Acesso Restrito (Login)
                </Link>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="text-center py-14">
                <div className={`inline-block animate-spin rounded-full h-9 w-9 border-2 ${mc ? 'border-slate-200 border-t-violet-600' : 'border-slate-700 border-t-violet-500'}`} />
                <p className={`mt-4 ${txt3} text-sm`}>Buscando processo...</p>
              </div>
            )}

            {/* Múltiplos resultados */}
            {searched && !processo && !isLoading && showSugestoes && processosSugestoes.length > 0 && (
              <div className="space-y-2">
                <p className={`text-sm ${mc ? 'text-slate-600' : 'text-slate-400'} font-medium mb-3`}>
                  {processosSugestoes.length} resultado(s) encontrado(s). Selecione para ver os detalhes:
                </p>
                {processosSugestoes.map(proc => (
                  <button
                    key={proc.id}
                    onClick={() => handleSelecionarProcesso(proc)}
                    className={`w-full text-left rounded-xl px-4 py-3.5 border ${bdSugest} hover:border-violet-500/40 hover:bg-violet-500/5 transition-all`}
                    style={{ background: bgSugest }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${txt1} text-sm truncate`}>{proc.numero}</p>
                        <p className={`text-xs ${txt3} truncate mt-0.5`}>{proc.assunto}</p>
                        {proc.interessado_nome && <p className={`text-xs ${mc ? 'text-slate-400' : 'text-slate-600'} truncate`}>{proc.interessado_nome}</p>}
                      </div>
                      <div className={`flex-shrink-0 text-xs ${txt3} text-right`}>
                        <p className="font-medium">{proc.setorAtual?.secretaria?.sigla || proc.setorAtual?.sigla || ''}</p>
                        <p>{new Date(proc.data_abertura || proc.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Não encontrado */}
            {searched && !processo && !isLoading && !showSugestoes && (
              <div
                className={`rounded-2xl border ${bdCard} p-12 text-center transition-colors duration-300`}
                style={{ background: bgCard }}
              >
                <AlertCircle className={`h-12 w-12 ${mc ? 'text-slate-300' : 'text-slate-600'} mx-auto mb-4`} />
                <h3 className={`text-lg font-semibold ${txt1} mb-2`}>Nenhum resultado encontrado</h3>
                <p className={`${txt3} text-sm mb-5`}>Verifique o número digitado ou tente os filtros avançados.</p>
                <button
                  onClick={() => { setSearched(false); setNumeroProcesso(''); setShowSugestoes(false); setProcessosSugestoes([]) }}
                  className={`${mc ? 'text-violet-700 hover:text-violet-900' : 'text-violet-400 hover:text-violet-300'} font-medium text-sm transition-colors`}
                >
                  Fazer nova busca
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer
        className={`relative z-20 flex-shrink-0 backdrop-blur-xl border-t ${bdPg} transition-colors duration-300`}
        style={{ background: ftrBg }}
      >
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center">
          <p className={`text-[11px] font-medium tracking-[0.16em] ${mc ? 'text-slate-400' : 'text-slate-600'} uppercase`}>
            © 2026{' '}
            <a href="https://jeossistemas.com" target="_blank" rel="noopener noreferrer" className="hover:text-violet-500 transition-colors">
              JEOS SISTEMAS E ASSESSORIA LTDA
            </a>
            <span className="mx-2 text-violet-500/50">•</span>
            V1.0.0
          </p>
        </div>
      </footer>
    </div>
  )
}
