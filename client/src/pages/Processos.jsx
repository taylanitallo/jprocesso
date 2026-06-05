import { useQuery } from 'react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useState, useCallback } from 'react'
import api from '../services/api'
import {
  Plus, ChevronLeft, ChevronRight, ArrowRight,
  Inbox, Send, ClipboardList, Search, FileText,
  User, MapPin, Building2, Layers, SlidersHorizontal,
  X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { PageHeader, EmptyState } from '../components/ui'

// ── Constantes de badge / cor ─────────────────────────────────────────────────
const TIPO_CLS = {
  Did:        'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 ring-purple-200 dark:ring-purple-800/40',
  Despacho:   'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800/40',
  Pauta:      'bg-teal-50   dark:bg-teal-900/30   text-teal-600   dark:text-teal-300   ring-teal-200   dark:ring-teal-800/40',
  Requisição: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 ring-orange-200 dark:ring-orange-800/40',
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
  const { subdomain } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const aba = searchParams.get('aba') || 'entrada'
  const setAba = (v) => setSearchParams(v === 'entrada' ? {} : { aba: v }, { replace: true })

  // ── Filtros Caixa de Entrada ─────────────────────────────────────────────
  const [page,           setPage]           = useState(1)
  const [search,         setSearch]         = useState('')
  const [status,         setStatus]         = useState('')
  const [prioridade,     setPrioridade]     = useState('')
  const [tipo,           setTipo]           = useState('')
  const [secretariaId,   setSecretariaId]   = useState('')
  const [setorId,        setSetorId]        = useState('')
  const [usuarioId,      setUsuarioId]      = useState('')
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
    ['processos', page, search, status, prioridade, tipo, secretariaId, setorId, usuarioId],
    async () => {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search)       params.append('search',       search)
      if (status)       params.append('status',       status)
      if (prioridade)   params.append('prioridade',   prioridade)
      if (tipo)         params.append('tipo',         tipo)
      if (secretariaId) params.append('secretariaId', secretariaId)
      if (setorId)      params.append('setorId',      setorId)
      if (usuarioId)    params.append('usuarioId',    usuarioId)
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

  // ── Limpar filtros ────────────────────────────────────────────────────────
  const limparFiltros = () => {
    setStatus(''); setPrioridade(''); setTipo('')
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
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <PageHeader
        icon={ClipboardList}
        title="Processos"
        subtitle="Gerencie os processos do seu setor"
        actions={
          <Link to={`/${subdomain}/processos/novo`} className="btn-primary">
            <Plus className="h-4 w-4" />
            Novo Processo
          </Link>
        }
      />

      {/* ── Abas ── */}
      <div className="flex border-b border-gray-200 dark:border-slate-700/50">
        {[
          { id: 'entrada',  label: 'Caixa de Entrada', icon: Inbox },
          { id: 'enviados', label: 'Enviados',          icon: Send  },
        ].map(({ id, icon: TabIcon, label }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <TabIcon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══ ABA: Caixa de Entrada ══ */}
      {aba === 'entrada' && (
        <>
          {/* ── Painel de Filtros ── */}
          <div className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700/70 rounded-2xl overflow-hidden">

            {/* Linha principal: busca + status + botão filtros */}
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por número, assunto ou interessado..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); reset() }}
                  className="input-field pl-9 text-sm"
                />
              </div>

              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); reset() }}
                className="input-field sm:w-44 text-sm"
              >
                <option value="">Todos os Status</option>
                <option value="aberto">Aberto</option>
                <option value="em_analise">Em Análise</option>
                <option value="pendente">Pendente</option>
                <option value="devolvido">Devolvido</option>
                <option value="concluido">Concluído</option>
              </select>

              <button
                onClick={() => setMostrarFiltros(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                  mostrarFiltros || filtrosAtivos > 0
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {filtrosAtivos > 0 && (
                  <span className="ml-1 bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {filtrosAtivos}
                  </span>
                )}
                {mostrarFiltros ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Filtros avançados (expansível) */}
            {mostrarFiltros && (
              <div className="border-t border-gray-100 dark:border-slate-700/50 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tipo</label>
                    <select value={tipo} onChange={(e) => { setTipo(e.target.value); reset() }} className="input-field text-sm w-full">
                      <option value="">Todos os Tipos</option>
                      <option value="Did">Did</option>
                      <option value="Despacho">Despacho</option>
                      <option value="Pauta">Pauta</option>
                      <option value="Requisição">Requisição</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Prioridade</label>
                    <select value={prioridade} onChange={(e) => { setPrioridade(e.target.value); reset() }} className="input-field text-sm w-full">
                      <option value="">Todas</option>
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="normal">Normal</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Secretaria</label>
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
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Setor</label>
                    <select value={setorId} onChange={(e) => { setSetorId(e.target.value); reset() }} className="input-field text-sm w-full">
                      <option value="">Todos</option>
                      {setorOpts.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Responsável</label>
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
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 dark:text-slate-500 text-sm">Carregando processos...</p>
            </div>
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

              <Paginacao
                page={parseInt(data.pagination.page)}
                totalPages={data.pagination.totalPages}
                total={data.pagination.total}
                limit={data.pagination.limit}
                onPrev={() => setPage(p => p - 1)}
                onNext={() => setPage(p => p + 1)}
              />
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
                <Link to={`/${subdomain}/processos/novo`} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  Novo Processo
                </Link>
              )}
            />
          )}
        </>
      )}

      {/* ══ ABA: Enviados ══ */}
      {aba === 'enviados' && (
        <>
          {/* ── Painel de Filtros Enviados ── */}
          <div className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700/70 rounded-2xl overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                <option value="concluido">Concluído</option>
              </select>

              <button
                onClick={() => setMostrarFiltrosEnv(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                  mostrarFiltrosEnv || filtrosAtivosEnv > 0
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {filtrosAtivosEnv > 0 && (
                  <span className="ml-1 bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {filtrosAtivosEnv}
                  </span>
                )}
                {mostrarFiltrosEnv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {mostrarFiltrosEnv && (
              <div className="border-t border-gray-100 dark:border-slate-700/50 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tipo</label>
                    <select value={tipoEnv} onChange={(e) => setTipoEnv(e.target.value)} className="input-field text-sm w-full">
                      <option value="">Todos os Tipos</option>
                      <option value="Did">Did</option>
                      <option value="Despacho">Despacho</option>
                      <option value="Pauta">Pauta</option>
                      <option value="Requisição">Requisição</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Prioridade</label>
                    <select value={prioridadeEnv} onChange={(e) => setPrioridadeEnv(e.target.value)} className="input-field text-sm w-full">
                      <option value="">Todas</option>
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="normal">Normal</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Secretaria</label>
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
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Setor</label>
                    <select value={setorIdEnv} onChange={(e) => setSetorIdEnv(e.target.value)} className="input-field text-sm w-full">
                      <option value="">Todos</option>
                      {setorOptsEnv.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Responsável</label>
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
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 dark:text-slate-500 text-sm">Carregando processos enviados...</p>
            </div>
          )}

          {!loadEnv && processosEnv.length > 0 && (
            <div className="space-y-2">
              {processosEnv.map((processo) => {
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
                    className={`group flex items-stretch gap-4 px-4 py-3.5 bg-white dark:bg-slate-900/75 border border-gray-100 dark:border-slate-700/50 border-l-4 border-l-indigo-400 rounded-xl hover:shadow-sm dark:hover:shadow-slate-900/40 hover:border-gray-200 dark:hover:border-slate-600/60 transition-all`}
                  >
                    {/* Conteúdo principal */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Assunto */}
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate leading-snug">
                        {processo.assunto}
                      </p>

                      {/* Número + tipo + tramitação + prioridade */}
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500">{processo.numero}</span>
                        {processo.tipoTramitacao && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ring-inset bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800/40">
                            {tramLabel}
                          </span>
                        )}
                        {(isUrgente || isAlta) && (
                          <span className={p.cls}>{p.label}</span>
                        )}
                      </div>

                      {/* Destinatário */}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
                        {processo.destinatario && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {processo.destinatario}
                          </span>
                        )}
                        {processo.destinatarioSetor && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
                            <Layers className="h-3 w-3 flex-shrink-0" />
                            {processo.destinatarioSetor}
                          </span>
                        )}
                        {processo.destinatarioUsuario && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
                            <User className="h-3 w-3 flex-shrink-0" />
                            {processo.destinatarioUsuario}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direita: status + data + seta */}
                    <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2 min-w-[90px]">
                      <div className="flex flex-col items-end gap-1">
                        <span className={s.cls}>{s.label}</span>
                        <span className="text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">
                          {new Date(dataEnvio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                )
              })}
            </div>
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
    <div className={`group bg-white dark:bg-slate-900/75 border border-gray-100 dark:border-slate-700/50 border-l-4 ${s.border} rounded-xl hover:shadow-sm dark:hover:shadow-slate-900/40 hover:border-gray-200 dark:hover:border-slate-600/60 transition-all`}>
      <Link
        to={`/${subdomain}/processos/${processo.id}`}
        className="flex items-stretch gap-4 px-4 py-3.5"
      >
        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Assunto — texto principal */}
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate leading-snug">
            {processo.assunto}
          </p>

          {/* Número + tipo + prioridade (metadados discretos) */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500">{processo.numero}</span>
            {processo.tipo_processo && (
              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ring-inset ${TIPO_CLS[processo.tipo_processo] || 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 ring-gray-200 dark:ring-slate-600/50'}`}>
                {processo.tipo_processo}
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
                className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={`Filtrar por ${secretaria.nome}`}
              >
                <Building2 className="h-3 w-3 flex-shrink-0" />
                {secretaria.sigla || secretaria.nome}
              </button>
            ) : (
              <span className="text-[11px] text-gray-300 dark:text-slate-700 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> —
              </span>
            )}

            {setor ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClickSetor(setor.id) }}
                className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={`Filtrar por ${setor.nome}`}
              >
                <Layers className="h-3 w-3 flex-shrink-0" />
                {setor.nome}
              </button>
            ) : (
              <span className="text-[11px] text-gray-300 dark:text-slate-700 flex items-center gap-1">
                <Layers className="h-3 w-3" /> —
              </span>
            )}

            {responsavel ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClickUsuario(responsavel.id) }}
                className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title={`Filtrar por ${responsavel.nome}`}
              >
                <User className="h-3 w-3 flex-shrink-0" />
                {responsavel.nome}
              </button>
            ) : (
              <span className="text-[11px] text-gray-300 dark:text-slate-700 flex items-center gap-1">
                <User className="h-3 w-3" /> —
              </span>
            )}
          </div>
        </div>

        {/* Direita: status + data + seta */}
        <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2 min-w-[90px]">
          <div className="flex flex-col items-end gap-1">
            <span className={s.cls}>{s.label}</span>
            <span className="text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">
              {new Date(dataRef).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
            <span className="text-[11px] text-gray-300 dark:text-slate-600 tabular-nums">
              {new Date(dataRef).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Link>
    </div>
  )
}

// ── Sub-componente: Paginação ─────────────────────────────────────────────────
function Paginacao({ page, totalPages, total, limit, onPrev, onNext }) {
  const inicio = total > 0 ? Math.min((page - 1) * limit + 1, total) : 0
  const fim    = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between py-1">
      <p className="text-xs text-gray-400 dark:text-slate-500">
        {total > 0 ? `${inicio}–${fim} de ${total} processos` : '0 processos'}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </button>

        <span className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300">
          {page} / {totalPages || 1}
        </span>

        <button
          onClick={onNext}
          disabled={page >= (totalPages || 1)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Próxima <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
