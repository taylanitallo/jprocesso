import { useQuery } from 'react-query'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { Plus, ArrowRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const { subdomain } = useParams()

  const { data, isLoading, isError, refetch } = useQuery(
    'dashboard-stats',
    async () => {
      const { data } = await api.get('/processos/dashboard')
      return data
    },
    { refetchInterval: 60000, staleTime: 30000 }
  )

  const stats            = data?.stats            || {}
  const minhaCaixaLista  = data?.minhaCaixaLista  || []
  const urgentesLista    = data?.urgentesLista    || []

  const statCards = [
    { label: 'Minha Caixa',  value: stats.minhaCaixa   ?? 0, emoji: '📥', textColor: 'text-blue-600 dark:text-blue-400',    bgColor: 'bg-blue-50 dark:bg-blue-900/20',      description: 'Sob sua responsabilidade' },
    { label: 'Novos Hoje',   value: stats.novosHoje     ?? 0, emoji: '🆕', textColor: 'text-green-600 dark:text-green-400',  bgColor: 'bg-green-50 dark:bg-green-900/20',    description: 'Protocolados nas últimas 24h' },
    { label: 'Alerta 48h',   value: stats.pendentes48h  ?? 0, emoji: '⚠️', textColor: 'text-amber-600 dark:text-amber-400',  bgColor: 'bg-amber-50 dark:bg-amber-900/20',    description: 'Aguardando há mais de 2 dias' },
    { label: 'Concluídos',   value: stats.concluidos    ?? 0, emoji: '✅', textColor: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', description: 'Finalizados' },
  ]

  const statusLabel = { aberto: 'Aberto', em_analise: 'Em Análise', pendente: 'Pendente', devolvido: 'Devolvido', concluido: 'Concluído', tramitacao: 'Em Tramitação', arquivado: 'Arquivado' }
  const statusCls   = { aberto: 'status-aberto', em_analise: 'status-em_analise', pendente: 'status-pendente', devolvido: 'status-devolvido', concluido: 'status-concluido', tramitacao: 'status-aberto', arquivado: 'status-arquivado' }
  const prioCls     = { urgente: 'bg-red-500', alta: 'bg-orange-500', normal: 'bg-blue-400', baixa: 'bg-gray-300' }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return '🌅 Bom dia'
    if (h < 18) return '☀️ Boa tarde'
    return '🌙 Boa noite'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting()}, {user?.nomeReduzido || user?.nome?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            🏛️ {user?.secretaria?.nome || 'Secretaria'} · 🗂️ {user?.setor?.nome || 'Setor'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-all"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to={`/${subdomain}/processos/novo`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all active:scale-95 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>📄 Novo Processo</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all animate-bounce-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`${stat.bgColor} w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm`}>
                {stat.emoji}
              </div>
              {isLoading
                ? <div className="h-8 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                : <span className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</span>
              }
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{stat.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stat.description}</p>
          </div>
        ))}
      </div>

      {isError && (
        <div className="card p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          ⚠️ Erro ao carregar dados do dashboard.
          <button onClick={() => refetch()} className="underline ml-1">Tentar novamente</button>
        </div>
      )}

      {/* Duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minha Caixa de Entrada */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📥 Minha Caixa de Entrada
            </h2>
            <Link
              to={`/${subdomain}/processos`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(n => <div key={n} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : minhaCaixaLista.length > 0 ? (
              <div className="space-y-2">
                {minhaCaixaLista.map((p) => (
                  <Link
                    key={p.id}
                    to={`/${subdomain}/processos/${p.id}`}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                  >
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${prioCls[p.prioridade] || 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{p.numero}</span>
                        <span className={`badge ${statusCls[p.status] || 'badge'}`}>{statusLabel[p.status] || p.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">{p.assunto}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-medium text-gray-600 dark:text-gray-400">Caixa vazia!</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Você está em dia com tudo</p>
              </div>
            )}
          </div>
        </div>

        {/* Processos Urgentes */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🚨 Processos Urgentes
            </h2>
            <Link
              to={`/${subdomain}/processos?prioridade=urgente`}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(n => <div key={n} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : urgentesLista.length > 0 ? (
              <div className="space-y-2">
                {urgentesLista.map((p) => (
                  <Link
                    key={p.id}
                    to={`/${subdomain}/processos/${p.id}`}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 hover:border-red-300 dark:hover:border-red-600 hover:shadow-sm transition-all"
                  >
                    <div className="w-1 self-stretch bg-red-500 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{p.numero}</span>
                        <span className="badge bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs">🔴 URGENTE</span>
                        <span className={`badge ${statusCls[p.status] || ''}`}>{statusLabel[p.status] || p.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">{p.assunto}</p>
                      {p.setorAtual && (
                        <p className="text-xs text-gray-400 mt-0.5">📍 {p.setorAtual.sigla || p.setorAtual.nome}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-red-300 group-hover:text-red-500 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-medium text-gray-600 dark:text-gray-400">Nenhum urgente</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tudo sob controle</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tip banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-xl p-5 text-white shadow-glow-blue">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold mb-1">💡 Dica do Sistema</p>
            <p className="text-sm text-blue-100">
              Use a barra de busca no topo para encontrar processos pelo número ou nome do interessado rapidamente.
            </p>
          </div>
          <div className="text-4xl hidden sm:block opacity-70">🔍</div>
        </div>
      </div>
    </div>
  )
}

