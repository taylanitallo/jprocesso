import { useQuery, useQueryClient } from 'react-query'
import { usePode } from '../utils/permissions'
import BotaoExcluidos from '../components/lixeira/BotaoExcluidos'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useState, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import NumeroProcesso from '../components/NumeroProcesso'
import {
  Plus, ChevronLeft, ChevronRight, ArrowRight,
  Inbox, Send, ClipboardList, Search, FileText,
  User, MapPin, Building2, Layers, SlidersHorizontal,
  X, ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react'
import { PageHeader, EmptyState, Paginacao as PaginacaoPadrao, usePaginacao, usePorPagina } from '../components/ui'
import LoadingBar from '../components/LoadingBar'

// ── Constantes de badge / cor ─────────────────────────────────────────────────
const TIPO_CLS = {
  Did:        'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 ring-purple-200 dark:ring-purple-800/40',
  Despacho:   'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800/40',
  Pauta:      'bg-teal-50   dark:bg-teal-900/30   text-teal-600   dark:text-teal-300   ring-teal-200   dark:ring-teal-800/40',
  Requisição: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 ring-orange-200 dark:ring-orange-800/40',
  Protocolo:  'bg-amber-50  dark:bg-amber-900/30  text-amber-600  dark:text-amber-300  ring-amber-200  dark:ring-amber-800/40',
}

const STATUS_INFO = {
  aberto:     { label: 'Aberto',      cls: 'status-aberto',     border: 'border-l-blue-500'    },
  em_analise: { label: 'Em Análise',  cls: 'status-em_analise', border: 'border-l-amber-400'   },
  pendente:   { label: 'Pendente',    cls: 'status-pendente',   border: 'border-l-orange-500'  },
  devolvido:  { label: 'Devolvido',   cls: 'status-devolvido',  border: 'border-l-red-500'     },
  concluido:  { label: 'Concluído',   cls: 'status-concluido',  border: 'border-l-emerald-500' },
  arquivado:  { label: 'Arquivado',   cls: 'status-arquivado',  border: 'border-l-gray-400'    },
}

const PRIO_INFO = {
  urgente: { label: 'Urgente', cls: 'prio-urgente' },
  alta:    { label: 'Alta',    cls: 'prio-alta'    },
  normal:  { label: 'Normal',  cls: 'prio-normal'  },
  baixa:   { label: 'Baixa',   cls: 'prio-baixa'   },
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Processos() {
  // Ações conforme o editor de permissões. Só "Ver" = sem botões de ação.
  const pode = usePode('processos')
  const { user } = useAuth()
  // Admin/gestor escolhem ver todos da área; o Administrador Jeos vê sempre todos (servidor)
  const podeVerTodos = ['admin', 'gestor'].includes(user?.tipo)
  const { subdomain } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const aba = searchParams.get('aba') || 'entrada'
  const setAba = (v) => { setSearchParams(v === 'entrada' ? {} : { aba: v }, { replace: true }); setStatus(''); setPage(1) }
  // Concluídos usa a mesma lista da Caixa de Entrada, só com os encerrados
  const abaLista = aba === 'concluidos' ? 'concluidos' : 'entrada'

  // ── Filtros Caixa de Entrada ─────────────────────────────────────────────
  const [page,           setPage]           = useState(1)
  const [porPagina,      setPorPagina]      = usePorPagina('processos-caixa', 10)
  const [search,         setSearch]         = useState('')
  const [status,         setStatus]         = useState('')
  // Filtros iniciais podem vir da URL (cartões do Dashboard: ?prioridade=urgente, ?periodo=hoje, ?parados=48h, ?todos=1)
  const [prioridade,     setPrioridade]     = useState(() => searchParams.get('prioridade') || '')
  const [periodo,        setPeriodo]        = useState(() => searchParams.get('periodo') === 'hoje' ? 'hoje' : '')
  const [parados,        setParados]        = useState(() => searchParams.get('parados') === '48h' ? '48h' : '')
  const [tipo,           setTipo]           = useState('')
  const [secretariaId,   setSecretariaId]   = useState('')
  const [setorId,        setSetorId]        = useState('')
  const [usuarioId,      setUsuarioId]      = useState('')
  // Caixa de entrada mostra só o que está com o usuário; admin/gestor podem ver todos da sua área
  const [verTodos,       setVerTodos]       = useState(() => searchParams.get('todos') === '1')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // ── Filtros Aba Enviados ─────────────────────────────────────────────────
  const [statusEnv,      setStatusEnv]      = useState('')
  const [searchEnv,      setSearchEnv]      = useState('')
  const [tipoEnv,        setTipoEnv]        = useState('')
  const [prioridadeEnv,  setPrioridadeEnv]  = useState('')
  const [secretariaIdEnv,setSecretariaIdEnv]= useState('')
  const [setorIdEnv,     setSetorIdEnv]     = useState('')
  const [usuarioIdEnv,   setUsuarioIdEnv]   = useState('')
  const [mostrarFiltrosEnv, setMostrarFiltrosEnv] = useState(false)

  const reset = useCallback(() => setPage(1), [])
  const queryClient = useQueryClient()

  // ── Helpers de filtro (chips clicáveis no card) ──────────────────────────
  const filtrarPorSecretaria = useCallback((id) => {
    setSecretariaId(id); setSetorId(''); setMostrarFiltros(true); reset()
  }, [reset])

  const filtrarPorSetor = useCallback((id) => {
    setSetorId(id); setMostrarFiltros(true); reset()
  }, [reset])

  const filtrarPorUsuario = useCallback((id) => {
    setUsuarioId(id); setMostrarFiltros(true); reset()
  }, [reset])

  // ── Contagem de filtros ativos ───────────────────────────────────────────
  const filtrosAtivos = [status, prioridade, tipo, secretariaId, setorId, usuarioId].filter(Boolean).length

  // ── Queries de opções para combos ───────────────────────────────────────
  const { data: dataSecretarias } = useQuery(
    ['secretarias-lista'],
    async () => {
      const { data } = await api.get('/organizacao/secretarias')
      return data?.secretarias || []
    },
    { staleTime: 5 * 60 * 1000 }
  )

  const { data: dataSetores } = useQuery(
    ['setores-lista', secretariaId],
    async () => {
      const url = secretariaId
        ? `/organizacao/secretarias/${secretariaId}/setores`
        : '/organizacao/setores'
      const { data } = await api.get(url)
      return data?.setores || []
    },
    { staleTime: 60 * 1000, keepPreviousData: true }
  )

  const { data: dataSetoresEnv } = useQuery(
    ['setores-lista-env', secretariaIdEnv],
    async () => {
      const url = secretariaIdEnv
        ? `/organizacao/secretarias/${secretariaIdEnv}/setores`
        : '/organizacao/setores'
      const { data } = await api.get(url)
      return data?.setores || []
    },
    { staleTime: 60 * 1000, keepPreviousData: true }
  )

  const { data: dataUsuarios } = useQuery(
    ['usuarios-lista'],
    async () => {
      const { data } = await api.get('/auth/usuarios')
      return data?.usuarios || []
    },
    { staleTime: 5 * 60 * 1000 }
  )

  // ── Query principal: Caixa de Entrada ────────────────────────────────────
  const { data, isLoading } = useQuery(
    ['processos', abaLista, page, porPagina, search, status, prioridade, tipo, secretariaId, setorId, usuarioId, verTodos, periodo, parados],
    async () => {
      const params = new URLSearchParams({ page, limit: porPagina })
      if (search)       params.append('search',       search)
      if (status)       params.append('status',       status)
      if (prioridade)   params.append('prioridade',   prioridade)
      if (tipo)         params.append('tipo',         tipo)
      if (secretariaId) params.append('secretariaId', secretariaId)
      if (setorId)      params.append('setorId',      setorId)
      if (usuarioId)    params.append('usuarioId',    usuarioId)
      if (verTodos)     params.append('todos',        '1')
      if (abaLista === 'concluidos') params.append('concluidos', '1')
      if (periodo)      params.append('periodo',      periodo)
      if (parados)      params.append('parados',      parados)
      const { data } = await api.get(`/processos?${params}`)
      return data
    }
  )

  // ── Query: Enviados ───────────────────────────────────────────────────────
  const { data: dataEnviados, isLoading: loadEnv } = useQuery(
    ['processos-enviados', statusEnv, searchEnv, tipoEnv, prioridadeEnv, secretariaIdEnv, setorIdEnv, usuarioIdEnv],
    async () => {
      const params = new URLSearchParams()
      if (statusEnv)        params.append('status',       statusEnv)
      if (searchEnv)        params.append('search',       searchEnv)
      if (tipoEnv)          params.append('tipo',         tipoEnv)
      if (prioridadeEnv)    params.append('prioridade',   prioridadeEnv)
      if (secretariaIdEnv)  params.append('secretariaId', secretariaIdEnv)
      if (setorIdEnv)       params.append('setorId',      setorIdEnv)
      if (usuarioIdEnv)     params.append('usuarioId',    usuarioIdEnv)
      const q = params.toString()
      const { data } = await api.get(`/processos/enviados${q ? `?${q}` : ''}`)
      return data
    }
  )
  const processosEnv = dataEnviados?.processos || []
  const pgEnv = usePaginacao('processos-enviados', processosEnv.length)

  // ── Limpar filtros ────────────────────────────────────────────────────────
  const limparFiltros = () => {
    setStatus(''); setPrioridade(''); setTipo(''); setPeriodo(''); setParados('')
    setSecretariaId(''); setSetorId(''); setUsuarioId('')
    setSearch(''); setPage(1)
  }

  const filtrosAtivosEnv = [statusEnv, tipoEnv, prioridadeEnv, secretariaIdEnv, setorIdEnv, usuarioIdEnv].filter(Boolean).length

  const limparFiltrosEnv = () => {
    setStatusEnv(''); setTipoEnv(''); setPrioridadeEnv('')
    setSecretariaIdEnv(''); setSetorIdEnv(''); setUsuarioIdEnv('')
    setSearchEnv('')
  }

  const secretariaOpts = dataSecretarias || []
  const setorOpts      = dataSetores || []
  const setorOptsEnv   = dataSetoresEnv || []
  const usuarioOpts    = dataUsuarios || []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ── */}
      <PageHeader
        icon={ClipboardList}
        title="Processos"
        subtitle="Gerencie os processos do seu setor"
        actions={
          <div className="flex items-center gap-2">
            <BotaoExcluidos entidade="processos" onAlterado={() => queryClient.invalidateQueries('processos')} />
            {pode('criar') && (
              <Link to={`/${subdomain}/processos/novo`} className="btn-primary">
                <Plus className="h-3.5 w-3.5" />
                Novo Processo
              </Link>
            )}
          </div>
        }
      />

      {/* ── Abas ── */}
      <div className="flex border-b border-ink-200">
        {[
          { id: 'entrada',    label: 'Caixa de Entrada', icon: Inbox },
          { id: 'enviados',   label: 'Enviados',          icon: Send  },
          { id: 'concluidos', label: 'Concluídos',        icon: CheckCircle2 },
        ].map(({ id, icon: TabIcon, label }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === id
                ? 'border-brand-600 text-brand-600 dark:text-info-400 dark:border-info-400'
                : 'border-transparent text-ink-500 hover:text-ink-700'
            }`}
          >
            <TabIcon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══ ABA: Caixa de Entrada ══ */}
      {(aba === 'entrada' || aba === 'concluidos') && (periodo || parados || prioridade === 'urgente') && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink-500">Filtro do Dashboard:</span>
          {[
            periodo === 'hoje'      && { rotulo: 'Abertos hoje',                 limpar: () => setPeriodo('') },
            parados === '48h'       && { rotulo: 'Abertos há mais de 48h',       limpar: () => setParados('') },
            prioridade === 'urgente' && { rotulo: 'Urgentes',                    limpar: () => setPrioridade('') },
          ].filter(Boolean).map(f => (
            <button key={f.rotulo} type="button" onClick={() => { f.limpar(); reset() }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-info-50 dark:bg-info-900/30 text-brand-700 dark:text-info-300 border border-info-200 dark:border-info-800/40 font-medium"
              title="Remover filtro">
              {f.rotulo} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {(aba === 'entrada' || aba === 'concluidos') && (
        <>
          {/* ── Painel de Filtros ── */}
          <div className="bg-surface border border-ink-200 rounded-2xl overflow-hidden">

            {/* Linha principal: busca + status + botão filtros */}
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por número, assunto ou interessado..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); reset() }}
                  className="input-field pl-9 text-sm"
                />
              </div>

              {podeVerTodos && (
                <label className="flex items-center gap-2 text-xs text-ink-600 whitespace-nowrap cursor-pointer select-none"
                  title="Sem marcar, a caixa mostra só os processos que estão com você ou no seu setor sem responsável">
                  <input type="checkbox" checked={verTodos} onChange={e => { setVerTodos(e.target.checked); reset() }} className="accent-brand-600" />
                  Ver todos da minha área
                </label>
              )}
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); reset() }}
                className="input-field sm:w-44 text-sm"
              >
                <option value="">Todos os Status</option>
                {abaLista === 'concluidos' ? (
                  <>
                    <option value="concluido">Concluído</option>
                    <option value="arquivado">Arquivado</option>
                  </>
                ) : (
                  <>
                    <option value="aberto">Aberto</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="pendente">Pendente</option>
                    <option value="devolvido">Devolvido</option>
                  </>
                )}
              </select>

              <button
                onClick={() => setMostrarFiltros(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                  mostrarFiltros || filtrosAtivos > 0
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {filtrosAtivos > 0 && (
                  <span className="ml-1 bg-surface text-brand-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {filtrosAtivos}
                  </span>
                )}
                {mostrarFiltros ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Filtros avançados (expansível) */}
            {mostrarFiltros && (
              <div className="border-t border-ink-100 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Tipo</label>
                    <select value={tipo} onChange={(e) => { setTipo(e.target.value); reset() }} className="input-field text-sm w-full">
                      <option value="">Todos os Tipos</option>
                      <option value="Did">Did</option>
                      <option value="Despacho">Despacho</option>
                      <option value="Pauta">Pauta</option>
                      <option value="Protocolo">Protocolo</option>
                      <option value="Requisição">Requisição</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Prioridade</label>
                    <select value={prioridade} onChange={(e) => { setPrioridade(e.target.value); reset() }} className="input-field text-sm w-full">
                      <option value="">Todas</option>
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="normal">Normal</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Secretaria</label>
                    <select
                      value={secretariaId}
                      onChange={(e) => { setSecretariaId(e.target.value); setSetorId(''); reset() }}
                      className="input-field text-sm w-full"
                    >
                      <option value="">Todas</option>
                      {secretariaOpts.map(s => (
                        <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} — ` : ''}{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Setor</label>
                    <select value={setorId} onChange={(e) => { setSetorId(e.target.value); reset() }} className="input-field text-sm w-full">
                      <option value="">Todos</option>
                      {setorOpts.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Responsável</label>
                    <select value={usuarioId} onChange={(e) => { setUsuarioId(e.target.value); reset() }} className="input-field text-sm w-full">
                      <option value="">Todos</option>
                      {usuarioOpts.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {filtrosAtivos > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={limparFiltros}
                      className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-danger-500 dark:hover:text-danger-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Lista ── */}
          {isLoading ? (
            <LoadingBar label="Carregando processos..." />
          ) : data?.processos && data.processos.length > 0 ? (
            <>
              <div className="space-y-2">
                {data.processos.map((processo) => (
                  <ProcessoCard
                    key={processo.id}
                    processo={processo}
                    subdomain={subdomain}
                    onClickSecretaria={filtrarPorSecretaria}
                    onClickSetor={filtrarPorSetor}
                    onClickUsuario={filtrarPorUsuario}
                  />
                ))}
              </div>

              <PaginacaoPadrao embutido total={data.pagination.total} pagina={parseInt(data.pagination.page)} setPagina={setPage}
                porPagina={porPagina} setPorPagina={(n) => { setPorPagina(n); setPage(1) }} rotulo="processo" />
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title="Nenhum processo encontrado"
              description={
                filtrosAtivos > 0 || search
                  ? 'Tente ajustar os filtros de busca'
                  : 'A caixa de entrada está vazia'
              }
              action={!search && filtrosAtivos === 0 && (
                pode('criar') && (
                  <Link to={`/${subdomain}/processos/novo`} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Novo Processo
                  </Link>
                )
              )}
            />
          )}
        </>
      )}

      {/* ══ ABA: Enviados ══ */}
      {aba === 'enviados' && (
        <>
          {/* ── Painel de Filtros Enviados ── */}
          <div className="bg-surface border border-ink-200 rounded-2xl overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por número, assunto ou interessado..."
                  value={searchEnv}
                  onChange={(e) => setSearchEnv(e.target.value)}
                  className="input-field pl-9 text-sm"
                />
              </div>

              <select
                value={statusEnv}
                onChange={(e) => setStatusEnv(e.target.value)}
                className="input-field sm:w-44 text-sm"
              >
                <option value="">Todos os Status</option>
                <option value="aberto">Aberto</option>
                <option value="em_analise">Em Análise</option>
                <option value="pendente">Pendente</option>
                <option value="devolvido">Devolvido</option>
              </select>

              <button
                onClick={() => setMostrarFiltrosEnv(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                  mostrarFiltrosEnv || filtrosAtivosEnv > 0
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {filtrosAtivosEnv > 0 && (
                  <span className="ml-1 bg-surface text-brand-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {filtrosAtivosEnv}
                  </span>
                )}
                {mostrarFiltrosEnv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {mostrarFiltrosEnv && (
              <div className="border-t border-ink-100 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Tipo</label>
                    <select value={tipoEnv} onChange={(e) => setTipoEnv(e.target.value)} className="input-field text-sm w-full">
                      <option value="">Todos os Tipos</option>
                      <option value="Did">Did</option>
                      <option value="Despacho">Despacho</option>
                      <option value="Pauta">Pauta</option>
                      <option value="Protocolo">Protocolo</option>
                      <option value="Requisição">Requisição</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Prioridade</label>
                    <select value={prioridadeEnv} onChange={(e) => setPrioridadeEnv(e.target.value)} className="input-field text-sm w-full">
                      <option value="">Todas</option>
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="normal">Normal</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Secretaria</label>
                    <select
                      value={secretariaIdEnv}
                      onChange={(e) => { setSecretariaIdEnv(e.target.value); setSetorIdEnv('') }}
                      className="input-field text-sm w-full"
                    >
                      <option value="">Todas</option>
                      {secretariaOpts.map(s => (
                        <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} — ` : ''}{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Setor</label>
                    <select value={setorIdEnv} onChange={(e) => setSetorIdEnv(e.target.value)} className="input-field text-sm w-full">
                      <option value="">Todos</option>
                      {setorOptsEnv.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Responsável</label>
                    <select value={usuarioIdEnv} onChange={(e) => setUsuarioIdEnv(e.target.value)} className="input-field text-sm w-full">
                      <option value="">Todos</option>
                      {usuarioOpts.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {(filtrosAtivosEnv > 0 || searchEnv) && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={limparFiltrosEnv}
                      className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-danger-500 dark:hover:text-danger-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {loadEnv && (
            <LoadingBar label="Carregando processos enviados..." />
          )}

          {!loadEnv && processosEnv.length > 0 && (
            <div className="space-y-2">
              {pgEnv.fatia(processosEnv).map((processo) => {
                const s         = STATUS_INFO[processo.status]   || STATUS_INFO.aberto
                const p         = PRIO_INFO[processo.prioridade] || PRIO_INFO.normal
                const dataEnvio = processo.dataEnvio || processo.created_at
                const tramLabel = processo.tipoTramitacao === 'tramite' ? 'Tramitado' : 'Devolvido'
                const isUrgente = processo.prioridade === 'urgente'
                const isAlta    = processo.prioridade === 'alta'

                return (
                  <Link
                    key={processo.id}
                    to={`/${subdomain}/processos/${processo.id}`}
                    className={`group flex items-center gap-4 px-4 py-2 bg-surface border border-ink-100 border-l-4 border-l-indigo-400 rounded-xl hover:shadow-sm dark:hover:shadow-slate-900/40 hover:border-ink-200 transition-all`}
                  >
                    {/* Conteúdo principal */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Assunto */}
                      <p className="text-sm font-semibold text-ink-900 truncate leading-snug">
                        {processo.assunto}
                      </p>

                      {/* Número + tipo + tramitação + prioridade */}
                      <div className="flex items-center flex-wrap gap-1.5">
                        <NumeroProcesso numero={processo.numero} className="text-[11px] font-mono text-ink-400" />
                        {processo.tipoTramitacao && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm ring-1 ring-inset bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800/40">
                            {tramLabel}
                          </span>
                        )}
                        {(isUrgente || isAlta) && (
                          <span className={p.cls}>{p.label}</span>
                        )}
                        {processo.aguardandoRecebimento && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ring-1 ring-inset bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40">
                            Aguardando recebimento
                          </span>
                        )}
                      </div>

                      {/* Onde está agora */}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
                        {processo.destinatario && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {processo.destinatario}
                          </span>
                        )}
                        {processo.destinatarioSetor && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-400">
                            <Layers className="h-3 w-3 shrink-0" />
                            {processo.destinatarioSetor}
                          </span>
                        )}
                        {processo.destinatarioUsuario && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-400">
                            <User className="h-3 w-3 shrink-0" />
                            {processo.destinatarioUsuario}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direita: status + data + seta */}
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-[11px] text-ink-400 tabular-nums">
                        {new Date(dataEnvio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className={s.cls}>{s.label}</span>
                      <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-info-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          {!loadEnv && processosEnv.length > 0 && (
            <PaginacaoPadrao embutido {...pgEnv} total={processosEnv.length} rotulo="processo" />
          )}

          {!loadEnv && processosEnv.length === 0 && (
            <EmptyState
              icon={Send}
              title="Nenhum processo enviado"
              description="Você ainda não tramitou nenhum processo"
            />
          )}
        </>
      )}

    </div>
  )
}

// ── Sub-componente: Card de Processo ─────────────────────────────────────────
function ProcessoCard({ processo, subdomain, onClickSecretaria, onClickSetor, onClickUsuario }) {
  const s = STATUS_INFO[processo.status]   || STATUS_INFO.aberto
  const p = PRIO_INFO[processo.prioridade] || PRIO_INFO.normal

  const secretaria  = processo.secretariaAtual
  const setor       = processo.setorAtual
  const responsavel = processo.responsavelAtual
  const dataRef     = processo.updated_at || processo.updatedAt || processo.created_at || processo.createdAt
  const isUrgente   = processo.prioridade === 'urgente'
  const isAlta      = processo.prioridade === 'alta'

  return (
    <div className={`group bg-surface border border-ink-100 border-l-4 ${s.border} rounded-xl hover:shadow-sm dark:hover:shadow-slate-900/40 hover:border-ink-200 transition-all`}>
      <Link
        to={`/${subdomain}/processos/${processo.id}`}
        className="flex items-center gap-4 px-4 py-2"
      >
        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Assunto — texto principal */}
          <p className="text-sm font-semibold text-ink-900 truncate leading-snug">
            {processo.assunto}
          </p>

          {/* Número + tipo + prioridade (metadados discretos) */}
          <div className="flex items-center flex-wrap gap-1.5">
            <NumeroProcesso numero={processo.numero} className="text-[11px] font-mono text-ink-400" />
            {processo.tipo_processo && (
              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm ring-1 ring-inset ${TIPO_CLS[processo.tipo_processo] || 'bg-ink-50 text-ink-500 ring-ink-200'}`}>
                {processo.tipo_processo}
              </span>
            )}
            {/* Tramitado/devolvido e ainda não recebido: abrir e clicar "Receber processo" */}
            {processo.status !== 'concluido' && ['tramite', 'devolucao'].includes(processo.ultimaTramitacao?.tipo) && (
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ring-1 ring-inset bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40">
                Aguardando receber
              </span>
            )}
            {(isUrgente || isAlta) && (
              <span className={p.cls}>{p.label}</span>
            )}
          </div>

          {/* Contexto: secretaria · setor · responsável (links de texto) */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
            {secretaria ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClickSecretaria(secretaria.id) }}
                className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-brand-600 dark:hover:text-info-400 transition-colors"
                title={`Filtrar por ${secretaria.nome}`}
              >
                <Building2 className="h-3 w-3 shrink-0" />
                {secretaria.sigla || secretaria.nome}
              </button>
            ) : (
              <span className="text-[11px] text-ink-400 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> —
              </span>
            )}

            {setor ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClickSetor(setor.id) }}
                className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-brand-600 dark:hover:text-info-400 transition-colors"
                title={`Filtrar por ${setor.nome}`}
              >
                <Layers className="h-3 w-3 shrink-0" />
                {setor.nome}
              </button>
            ) : (
              <span className="text-[11px] text-ink-400 flex items-center gap-1">
                <Layers className="h-3 w-3" /> —
              </span>
            )}

            {responsavel ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClickUsuario(responsavel.id) }}
                className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title={`Filtrar por ${responsavel.nome}`}
              >
                <User className="h-3 w-3 shrink-0" />
                {responsavel.nome}
              </button>
            ) : (
              <span className="text-[11px] text-ink-400 flex items-center gap-1">
                <User className="h-3 w-3" /> —
              </span>
            )}
          </div>
        </div>

        {/* Direita: status + data + seta */}
        <div className="shrink-0 flex items-center gap-3">
          <span className="text-[11px] text-ink-400 tabular-nums text-right leading-tight">
            {new Date(dataRef).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            <br />
            {new Date(dataRef).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={s.cls}>{s.label}</span>
          <ChevronRight className="h-4 w-4 text-ink-400 group-hover:text-info-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Link>
    </div>
  )
}


