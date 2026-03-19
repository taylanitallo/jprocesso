import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { ArrowRight } from 'lucide-react'
import api from '../services/api'

const STATUS_INFO = {
  aberto:     { label: 'Aberto',     cls: 'status-aberto',     emoji: '🔵' },
  em_analise: { label: 'Em Análise', cls: 'status-em_analise', emoji: '🟡' },
  concluido:  { label: 'Concluído',  cls: 'status-concluido',  emoji: '🟢' },
  devolvido:  { label: 'Devolvido',  cls: 'status-devolvido',  emoji: '🔴' },
  arquivado:  { label: 'Arquivado',  cls: 'status-arquivado',  emoji: '⚫' },
}

export default function Enviados() {
  const { subdomain } = useParams()
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery(['processos-enviados', statusFilter], async () => {
    const params = statusFilter ? `?status=${statusFilter}` : ''
    const { data } = await api.get(`/processos/enviados${params}`)
    return data
  })

  const processos = data?.processos || []

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">📤 Processos Enviados</h1>
        <p className="page-subtitle">Processos que você tramitou para outros setores</p>
      </div>

      {/* Filter */}
      <div className="card p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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

      {/* Loading */}
      {isLoading && (
        <div className="card p-12 text-center">
          <div className="text-4xl animate-pulse-soft mb-3">⏳</div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Carregando processos enviados...</p>
        </div>
      )}

      {/* List */}
      {!isLoading && processos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {processos.map((processo) => {
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

      {/* Empty */}
      {!isLoading && processos.length === 0 && (
        <div className="card p-14 text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-semibold text-gray-500 dark:text-gray-400">Nenhum processo enviado</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Você ainda não tramitou nenhum processo</p>
        </div>
      )}
    </div>
  )
}


