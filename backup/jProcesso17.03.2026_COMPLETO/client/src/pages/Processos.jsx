import { useQuery } from 'react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import api from '../services/api'
import { Plus, ChevronLeft, ChevronRight, ArrowRight, Inbox, Send } from 'lucide-react'

const TIPO_EMOJI = { Requisição: '📋', Did: '📂', Pauta: '📅', Despacho: '📨' }

const TIPO_BADGE = {
  Did:        'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  Despacho:   'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  Pauta:      'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  Requisição: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
}

const STATUS_INFO = {
  aberto:     { label: 'Aberto',      cls: 'status-aberto',     emoji: '🔵' },
  em_analise: { label: 'Em Análise',  cls: 'status-em_analise', emoji: '🟡' },
  pendente:   { label: 'Pendente',    cls: 'status-pendente',   emoji: '🟠' },
  devolvido:  { label: 'Devolvido',   cls: 'status-devolvido',  emoji: '🔴' },
  concluido:  { label: 'Concluído',   cls: 'status-concluido',  emoji: '🟢' },
  arquivado:  { label: 'Arquivado',   cls: 'status-arquivado',  emoji: '⚫' },
}

const PRIO_INFO = {
  urgente: { label: '🔴 Urgente', cls: 'prio-urgente' },
  alta:    { label: '🟠 Alta',    cls: 'prio-alta' },
  normal:  { label: '🔵 Normal',  cls: 'prio-normal' },
  baixa:   { label: '⚫ Baixa',   cls: 'prio-baixa' },
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

      {/* Cabeçalho + botão novo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">📋 Processos</h1>
          <p className="page-subtitle">Gerencie os processos do seu setor</p>
        </div>
        <Link
          to={`/${subdomain}/processos/novo`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all active:scale-95 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>📄 Novo Processo</span>
        </Link>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'entrada', emoji: '📥', label: 'Caixa de Entrada', icon: Inbox },
          { id: 'enviados', emoji: '📤', label: 'Enviados', icon: Send },
        ].map(({ id, emoji, label }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span>{emoji}</span>{label}
          </button>
        ))}
      </div>

      {/* ── ABA: Caixa de Entrada ── */}
      {aba === 'entrada' && (
        <>
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
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
                <option value="">🗂️ Todos os Status</option>
                <option value="aberto">🔵 Aberto</option>
                <option value="em_analise">🟡 Em Análise</option>
                <option value="pendente">🟠 Pendente</option>
                <option value="devolvido">🔴 Devolvido</option>
                <option value="concluido">🟢 Concluído</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="text-4xl animate-pulse-soft mb-3">⏳</div>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Carregando processos...</p>
              </div>
            ) : data?.processos && data.processos.length > 0 ? (
              <>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.processos.map((processo) => {
                    const s = STATUS_INFO[processo.status] || STATUS_INFO.aberto
                    const p = PRIO_INFO[processo.prioridade] || PRIO_INFO.normal
                    const tipoEmoji = TIPO_EMOJI[processo.tipo_processo] || '📄'
                    return (
                      <Link
                        key={processo.id}
                        to={`/${subdomain}/processos/${processo.id}`}
                        className="group flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-all"
                      >
                        <div className="flex-shrink-0 text-2xl">{tipoEmoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{processo.numero}</span>
                            <span className={s.cls}>{s.emoji} {s.label}</span>
                            {processo.tipo_processo && (
                              <span className={`badge ${TIPO_BADGE[processo.tipo_processo] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                {TIPO_EMOJI[processo.tipo_processo] || '📄'} {processo.tipo_processo}
                              </span>
                            )}
                            <span className={p.cls}>{p.label}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{processo.assunto}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            👤 {processo.interessado_nome}
                            {processo.setorAtual && <span className="ml-2">📍 {processo.setorAtual.sigla}</span>}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {new Date(processo.created_at || processo.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(processo.created_at || processo.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1 ml-auto" />
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {/* Pagination */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Página {data.pagination.page} de {data.pagination.totalPages} · {data.pagination.total} processos
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= data.pagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Próxima <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-14 text-center">
                <div className="text-5xl mb-4">📭</div>
                <p className="font-semibold text-gray-500 dark:text-gray-400">Nenhum processo encontrado</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {search ? 'Tente ajustar os filtros de busca' : 'A caixa de entrada está vazia'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ABA: Enviados ── */}
      {aba === 'enviados' && (
        <>
          {/* Filter */}
          <div className="card p-4">
            <select
              value={statusEnv}
              onChange={(e) => setStatusEnv(e.target.value)}
              className="input-field sm:w-56 text-sm"
            >
              <option value="">🗂️ Todos os Status</option>
              <option value="aberto">🔵 Aberto</option>
              <option value="em_analise">🟡 Em Análise</option>
              <option value="concluido">🟢 Concluído</option>
              <option value="devolvido">🔴 Devolvido</option>
              <option value="arquivado">⚫ Arquivado</option>
            </select>
          </div>

          {loadEnv && (
            <div className="card p-12 text-center">
              <div className="text-4xl animate-pulse-soft mb-3">⏳</div>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Carregando processos enviados...</p>
            </div>
          )}

          {!loadEnv && processosEnv.length > 0 && (
            <div className="card overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {processosEnv.map((processo) => {
                  const s = STATUS_INFO[processo.status] || STATUS_INFO.aberto
                  return (
                    <Link
                      key={processo.id}
                      to={`/${subdomain}/processos/${processo.id}`}
                      className="group flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-all"
                    >
                      <div className="flex-shrink-0 text-2xl">📤</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{processo.numero}</span>
                          <span className={s.cls}>{s.emoji} {s.label}</span>
                          {processo.tipoTramitacao && (
                            <span className="badge bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                              {processo.tipoTramitacao === 'tramite' ? '🔀 Tramitado' : '↩️ Devolvido'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{processo.assunto}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {processo.destinatario && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">🏛️ {processo.destinatario}</span>
                          )}
                          {processo.destinatarioSetor && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">📍 {processo.destinatarioSetor}</span>
                          )}
                          {processo.destinatarioUsuario && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">👤 {processo.destinatarioUsuario}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(processo.dataEnvio || processo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                        <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1 ml-auto" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {!loadEnv && processosEnv.length === 0 && (
            <div className="card p-14 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Nenhum processo enviado</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Você ainda não tramitou nenhum processo</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

