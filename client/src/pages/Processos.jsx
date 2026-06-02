import { useQuery } from 'react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import api from '../services/api'
import {
  Plus, ChevronLeft, ChevronRight, ArrowRight,
  Inbox, Send, ClipboardList, Search, FileText,
  User, MapPin,
} from 'lucide-react'
import { PageHeader, EmptyState } from '../components/ui'

const TIPO_BADGE = {
  Did:        'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  Despacho:   'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  Pauta:      'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  Requisição: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
}

const STATUS_INFO = {
  aberto:     { label: 'Aberto',      cls: 'status-aberto'     },
  em_analise: { label: 'Em Análise',  cls: 'status-em_analise' },
  pendente:   { label: 'Pendente',    cls: 'status-pendente'   },
  devolvido:  { label: 'Devolvido',   cls: 'status-devolvido'  },
  concluido:  { label: 'Concluído',   cls: 'status-concluido'  },
  arquivado:  { label: 'Arquivado',   cls: 'status-arquivado'  },
}

const PRIO_INFO = {
  urgente: { label: 'Urgente', cls: 'prio-urgente' },
  alta:    { label: 'Alta',    cls: 'prio-alta'    },
  normal:  { label: 'Normal',  cls: 'prio-normal'  },
  baixa:   { label: 'Baixa',   cls: 'prio-baixa'   },
}

export default function Processos() {
  const { subdomain } = useParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [statusEnv, setStatusEnv] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const aba = searchParams.get('aba') || 'entrada'
  const setAba = (v) => setSearchParams(v === 'entrada' ? {} : { aba: v }, { replace: true })

  const { data: dataEnviados, isLoading: loadEnv } = useQuery(
    ['processos-enviados', statusEnv],
    async () => {
      const params = statusEnv ? `?status=${statusEnv}` : ''
      const { data } = await api.get(`/processos/enviados${params}`)
      return data
    }
  )
  const processosEnv = dataEnviados?.processos || []

  const { data, isLoading } = useQuery(
    ['processos', page, search, status],
    async () => {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search) params.append('search', search)
      if (status) params.append('status', status)
      const { data } = await api.get(`/processos?${params}`)
      return data
    }
  )

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
          {/* Filtros */}
          <div className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700/70 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, assunto ou interessado..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="input-field pl-9 text-sm"
              />
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="input-field sm:w-48 text-sm"
            >
              <option value="">Todos os Status</option>
              <option value="aberto">Aberto</option>
              <option value="em_analise">Em Análise</option>
              <option value="pendente">Pendente</option>
              <option value="devolvido">Devolvido</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 dark:text-slate-500 text-sm">Carregando processos...</p>
            </div>
          ) : data?.processos && data.processos.length > 0 ? (
            <>
              <div className="space-y-2">
                {data.processos.map((processo) => {
                  const s = STATUS_INFO[processo.status]     || STATUS_INFO.aberto
                  const p = PRIO_INFO[processo.prioridade]   || PRIO_INFO.normal
                  return (
                    <Link
                      key={processo.id}
                      to={`/${subdomain}/processos/${processo.id}`}
                      className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-900/75 border border-gray-200 dark:border-slate-700/70 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all"
                    >
                      {/* Ícone */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" strokeWidth={1.75} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{processo.numero}</span>
                          <span className={s.cls}>{s.label}</span>
                          {processo.tipo_processo && (
                            <span className={`badge ${TIPO_BADGE[processo.tipo_processo] || 'bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-slate-400'}`}>
                              {processo.tipo_processo}
                            </span>
                          )}
                          <span className={p.cls}>{p.label}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-slate-300 truncate">{processo.assunto}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {processo.interessado_nome && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                              <User className="h-3 w-3 flex-shrink-0" />
                              {processo.interessado_nome}
                            </span>
                          )}
                          {processo.setorAtual && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {processo.setorAtual.sigla}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Data + chevron */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                          {new Date(processo.created_at || processo.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {new Date(processo.created_at || processo.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1 ml-auto" />
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Paginação */}
              <div className="flex items-center justify-between py-1">
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Página {data.pagination.page} de {data.pagination.totalPages} · {data.pagination.total} processos
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.pagination.totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Próxima <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title="Nenhum processo encontrado"
              description={search ? 'Tente ajustar os filtros de busca' : 'A caixa de entrada está vazia'}
              action={!search && (
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
          {/* Filtro */}
          <div className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700/70 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <select
              value={statusEnv}
              onChange={(e) => setStatusEnv(e.target.value)}
              className="input-field sm:w-56 text-sm"
            >
              <option value="">Todos os Status</option>
              <option value="aberto">Aberto</option>
              <option value="em_analise">Em Análise</option>
              <option value="concluido">Concluído</option>
              <option value="devolvido">Devolvido</option>
              <option value="arquivado">Arquivado</option>
            </select>
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
                const s = STATUS_INFO[processo.status] || STATUS_INFO.aberto
                const p = PRIO_INFO[processo.prioridade]  || PRIO_INFO.normal
                return (
                  <Link
                    key={processo.id}
                    to={`/${subdomain}/processos/${processo.id}`}
                    className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-900/75 border border-gray-200 dark:border-slate-700/70 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center">
                      <Send className="h-5 w-5 text-indigo-500 dark:text-indigo-400" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{processo.numero}</span>
                        <span className={s.cls}>{s.label}</span>
                        {processo.tipoTramitacao && (
                          <span className="badge bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                            {processo.tipoTramitacao === 'tramite' ? 'Tramitado' : 'Devolvido'}
                          </span>
                        )}
                        <span className={p.cls}>{p.label}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-slate-300 truncate">{processo.assunto}</p>
                      <div className="flex flex-wrap gap-3 mt-0.5">
                        {processo.destinatario && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {processo.destinatario}
                          </span>
                        )}
                        {processo.destinatarioSetor && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {processo.destinatarioSetor}
                          </span>
                        )}
                        {processo.destinatarioUsuario && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                            <User className="h-3 w-3 flex-shrink-0" />
                            {processo.destinatarioUsuario}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {new Date(processo.dataEnvio || processo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                      <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1 ml-auto" />
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
