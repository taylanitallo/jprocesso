import { useQuery } from 'react-query'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import {
  Plus, ArrowRight, RefreshCw, LayoutDashboard,
  Inbox, FilePlus2, Clock, CheckCircle2,
  AlertTriangle, Info, Building2, MapPin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PageHeader, StatCard, SectionTitle, EmptyState } from '../components/ui'

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

  const statusLabel = { aberto: 'Aberto', em_analise: 'Em Análise', pendente: 'Pendente', devolvido: 'Devolvido', concluido: 'Concluído', tramitacao: 'Em Tramitação', arquivado: 'Arquivado' }
  const statusCls   = { aberto: 'status-aberto', em_analise: 'status-em_analise', pendente: 'status-pendente', devolvido: 'status-devolvido', concluido: 'status-concluido', tramitacao: 'status-aberto', arquivado: 'status-arquivado' }
  const prioCls     = { urgente: 'bg-red-500', alta: 'bg-orange-500', normal: 'bg-blue-400', baixa: 'bg-gray-300 dark:bg-slate-600' }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        icon={LayoutDashboard}
        title={`${greeting()}, ${user?.nomeReduzido || user?.nome?.split(' ')[0]}`}
        subtitle={
          <span className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>{user?.secretaria?.nome || 'Secretaria'}</span>
            <span className="text-gray-300 dark:text-slate-600">·</span>
            <span>{user?.setor?.nome || 'Setor'}</span>
          </span>
        }
        actions={
          <>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link to={`/${subdomain}/processos/novo`} className="btn-primary">
              <Plus className="h-4 w-4" />
              Novo Processo
            </Link>
          </>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Inbox}
          label="Minha Caixa"
          value={isLoading ? '—' : (stats.minhaCaixa ?? 0)}
          hint="Sob sua responsabilidade"
          tone="blue"
        />
        <StatCard
          icon={FilePlus2}
          label="Novos Hoje"
          value={isLoading ? '—' : (stats.novosHoje ?? 0)}
          hint="Protocolados nas últimas 24h"
          tone="green"
        />
        <StatCard
          icon={Clock}
          label="Alerta 48h"
          value={isLoading ? '—' : (stats.pendentes48h ?? 0)}
          hint="Aguardando há mais de 2 dias"
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Concluídos"
          value={isLoading ? '—' : (stats.concluidos ?? 0)}
          hint="Finalizados"
          tone="green"
        />
      </div>

      {/* Faixa de erro */}
      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Erro ao carregar dados do dashboard.</span>
          <button onClick={() => refetch()} className="underline ml-1 font-medium hover:no-underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minha Caixa de Entrada */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
            <div className="-mb-4">
              <SectionTitle
                icon={Inbox}
                title="Minha Caixa de Entrada"
                action={
                  <Link
                    to={`/${subdomain}/processos`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                  >
                    Ver todos <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            </div>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(n => <div key={n} className="h-14 bg-gray-100 dark:bg-slate-900 rounded-xl animate-pulse" />)}
              </div>
            ) : minhaCaixaLista.length > 0 ? (
              <div className="space-y-2">
                {minhaCaixaLista.map((p) => (
                  <Link
                    key={p.id}
                    to={`/${subdomain}/processos/${p.id}`}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                  >
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${prioCls[p.prioridade] || 'bg-gray-300 dark:bg-slate-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{p.numero}</span>
                        <span className={`badge ${statusCls[p.status] || ''}`}>{statusLabel[p.status] || p.status}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">{p.assunto}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Caixa vazia"
                description="Você está em dia com tudo"
              />
            )}
          </div>
        </div>

        {/* Processos Urgentes */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
            <div className="-mb-4">
              <SectionTitle
                icon={AlertTriangle}
                title="Processos Urgentes"
                action={
                  <Link
                    to={`/${subdomain}/processos?prioridade=urgente`}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium flex items-center gap-1"
                  >
                    Ver todos <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            </div>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(n => <div key={n} className="h-14 bg-gray-100 dark:bg-slate-900 rounded-xl animate-pulse" />)}
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
                        <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{p.numero}</span>
                        <span className="badge bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">URGENTE</span>
                        <span className={`badge ${statusCls[p.status] || ''}`}>{statusLabel[p.status] || p.status}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">{p.assunto}</p>
                      {p.setorAtual && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {p.setorAtual.sigla || p.setorAtual.nome}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-red-300 group-hover:text-red-500 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Nenhum urgente"
                description="Tudo sob controle"
              />
            )}
          </div>
        </div>
      </div>

      {/* Tip banner */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/60 dark:bg-blue-900/10">
        <div className="bg-blue-100 dark:bg-blue-900/40 p-2.5 rounded-xl flex-shrink-0">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-0.5">Dica do sistema</p>
          <p className="text-sm text-blue-700 dark:text-blue-300/80">
            Use a barra de busca no topo para encontrar processos pelo número ou nome do interessado rapidamente.
          </p>
        </div>
      </div>
    </div>
  )
}

