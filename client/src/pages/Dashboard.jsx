import { Suspense, lazy } from 'react'
import { useQuery } from 'react-query'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Inbox, FilePlus2, Clock, CheckCircle2, AlertTriangle,
  RefreshCw, Plus, ArrowRight, Zap, Package, ClipboardList,
  TrendingUp, FileText, Activity, Building2, LayoutDashboard,
  Bell, BarChart3, CircleDot, MapPin,
} from 'lucide-react'
import { PageHeader, StatCard, SectionTitle, EmptyState } from '../components/ui'

const DashboardCharts = lazy(() => import('./DashboardCharts'))

// ── Helpers ───────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0)

const STATUS_LABEL = { aberto: 'Aberto', em_analise: 'Em Análise', pendente: 'Pendente', devolvido: 'Devolvido', concluido: 'Concluído', arquivado: 'Arquivado' }
const STATUS_CLS   = { aberto: 'status-aberto', em_analise: 'status-em_analise', pendente: 'status-pendente', devolvido: 'status-devolvido', concluido: 'status-concluido', arquivado: 'status-arquivado' }
const PRIO_CLS     = { urgente: 'bg-red-500', alta: 'bg-orange-400', normal: 'bg-blue-400', baixa: 'bg-gray-300 dark:bg-slate-600' }

// ── Sub-components ────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse ${className}`} />
}

function AlertItem({ icon: Icon, title, desc, tone, link }) {
  const cls = {
    red:    'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300',
    amber:  'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
    blue:   'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300',
    orange: 'bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300',
  }[tone] || ''

  const iconCls = {
    red: 'text-red-500', amber: 'text-amber-500',
    blue: 'text-blue-500', orange: 'text-orange-500',
  }[tone] || 'text-gray-400'

  const inner = (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${cls}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconCls}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  )

  return link ? <Link to={link}>{inner}</Link> : inner
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const { subdomain } = useParams()

  const { data: procData, isLoading, isError, refetch } = useQuery(
    'dashboard-stats',
    () => api.get('/processos/dashboard').then(r => r.data),
    { refetchInterval: 60000, staleTime: 30000 }
  )

  const { data: almoxData, isLoading: almoxLoading } = useQuery(
    'dashboard-almox',
    () => api.get('/almoxarifado/dashboard').then(r => r.data),
    { staleTime: 120000, retry: 1 }
  )

  const { data: finData, isLoading: finLoading } = useQuery(
    'dashboard-fin',
    () => api.get('/financeiro/dashboard').then(r => r.data),
    { staleTime: 120000, retry: 1 }
  )

  const stats           = procData?.stats           || {}
  const minhaCaixaLista = procData?.minhaCaixaLista || []
  const urgentesLista   = procData?.urgentesLista   || []

  const itensCriticos = almoxData?.itensCriticos       || []
  const reqPendentes  = almoxData?.requisicoesPendentes ?? null

  const valorPago     = finData?.somaPago ?? null

  // ── Alertas executivos ────────────────────────────────────────────────────
  const alertas = [
    urgentesLista.length > 0 && {
      icon: Zap, tone: 'red',
      title: `${urgentesLista.length} processo${urgentesLista.length > 1 ? 's urgentes' : ' urgente'}`,
      desc: urgentesLista[0]?.assunto || 'Requer atenção imediata',
      link: `/${subdomain}/processos?prioridade=urgente`,
    },
    (stats.pendentes48h > 0) && {
      icon: Clock, tone: 'amber',
      title: `${stats.pendentes48h} pendente${stats.pendentes48h > 1 ? 's' : ''} há +48h`,
      desc: 'Processos sem movimentação recente',
      link: `/${subdomain}/processos`,
    },
    itensCriticos.length > 0 && {
      icon: Package, tone: 'orange',
      title: `${itensCriticos.length} item${itensCriticos.length > 1 ? 'ns' : ''} em estoque crítico`,
      desc: itensCriticos[0]?.nome || 'Abaixo do mínimo definido',
      link: `/${subdomain}/almoxarifado/itens`,
    },
    (reqPendentes > 0) && {
      icon: ClipboardList, tone: 'blue',
      title: `${reqPendentes} requisição${reqPendentes > 1 ? 'ões' : ''} pendente${reqPendentes > 1 ? 's' : ''}`,
      desc: 'Aguardando autorização ou atendimento',
      link: `/${subdomain}/almoxarifado/requisicoes`,
    },
  ].filter(Boolean)

  // ── Ações rápidas ─────────────────────────────────────────────────────────
  const acoes = [
    { to: `/${subdomain}/processos/novo`,             icon: FilePlus2,   label: 'Novo Processo',   color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/30' },
    { to: `/${subdomain}/contratos`,                  icon: FileText,    label: 'Contratos',        color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border-violet-100 dark:border-violet-900/30' },
    { to: `/${subdomain}/financeiro`,                 icon: TrendingUp,  label: 'Financeiro',       color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-100 dark:border-emerald-900/30' },
    { to: `/${subdomain}/almoxarifado/requisicoes`,   icon: ClipboardList, label: 'Requisição',    color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-100 dark:border-orange-900/30' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        icon={LayoutDashboard}
        title={`${greeting()}, ${user?.nomeReduzido || user?.nome?.split(' ')[0]}`}
        subtitle={
          <span className="flex items-center gap-2 flex-wrap">
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
              title="Atualizar dashboard"
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

      {/* ── Faixa de erro ──────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Erro ao carregar dados do dashboard.</span>
          <button onClick={() => refetch()} className="underline ml-1 font-medium hover:no-underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── KPI Row 1 — Processos ───────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-0.5">
          Processos
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Inbox}
            label="Minha Caixa"
            value={isLoading ? '—' : (stats.minhaCaixa ?? 0)}
            hint="Sob sua responsabilidade"
            tone="blue"
          />
          <StatCard
            icon={Zap}
            label="Urgentes"
            value={isLoading ? '—' : urgentesLista.length}
            hint="Alta prioridade em andamento"
            tone="red"
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
            hint="Sem movimentação há +2 dias"
            tone="amber"
          />
        </div>
      </div>

      {/* ── KPI Row 2 — Operações ───────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-0.5">
          Operações
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Valor Pago"
            value={finLoading && valorPago === null ? '—' : valorPago !== null ? fmtMoney(valorPago) : '—'}
            hint={`Empenhos pagos em ${new Date().getFullYear()}`}
            tone="violet"
          />
          <StatCard
            icon={Package}
            label="Estoque Crítico"
            value={almoxLoading && !almoxData ? '—' : itensCriticos.length}
            hint="Itens abaixo do mínimo"
            tone="red"
          />
          <StatCard
            icon={ClipboardList}
            label="Req. Pendentes"
            value={almoxLoading && !almoxData ? '—' : (reqPendentes ?? 0)}
            hint="Aguardando autorização"
            tone="cyan"
          />
          <StatCard
            icon={CheckCircle2}
            label="Concluídos"
            value={isLoading ? '—' : (stats.concluidos ?? 0)}
            hint="Processos finalizados"
            tone="green"
          />
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Col 1-2 ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Gráfico de status */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
              <SectionTitle icon={BarChart3} title="Visão Geral — Processos" />
            </div>
            <div className="p-5">
              {isLoading ? (
                <Skeleton className="h-52" />
              ) : (
                <Suspense fallback={<Skeleton className="h-52" />}>
                  <DashboardCharts stats={stats} urgentCount={urgentesLista.length} />
                </Suspense>
              )}
            </div>
          </div>

          {/* Minha Caixa */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
              <div className="-mb-4">
                <SectionTitle
                  icon={Inbox}
                  title="Minha Caixa de Entrada"
                  action={
                    <Link to={`/${subdomain}/processos`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1">
                      Ver todos <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  }
                />
              </div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(n => <Skeleton key={n} className="h-14" />)}
                </div>
              ) : minhaCaixaLista.length > 0 ? (
                <div className="space-y-2">
                  {minhaCaixaLista.map(p => (
                    <Link
                      key={p.id}
                      to={`/${subdomain}/processos/${p.id}`}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                    >
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${PRIO_CLS[p.prioridade] || 'bg-gray-300 dark:bg-slate-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{p.numero}</span>
                          <span className={`badge ${STATUS_CLS[p.status] || ''}`}>{STATUS_LABEL[p.status] || p.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">{p.assunto}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Caixa vazia" description="Você está em dia com tudo" />
              )}
            </div>
          </div>

        </div>

        {/* ── Col 3 — Alertas + Urgentes + Ações ──────────────────────── */}
        <div className="space-y-6">

          {/* Alertas executivos */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
              <SectionTitle icon={Bell} title="Alertas Executivos" />
            </div>
            <div className="p-4">
              {(isLoading || (almoxLoading && !almoxData)) ? (
                <div className="space-y-2">
                  {[1,2].map(n => <Skeleton key={n} className="h-14" />)}
                </div>
              ) : alertas.length > 0 ? (
                <div className="space-y-2">
                  {alertas.map((a, i) => <AlertItem key={i} {...a} />)}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Tudo em dia" description="Nenhum alerta no momento" />
              )}
            </div>
          </div>

          {/* Processos urgentes */}
          {!isLoading && urgentesLista.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
                <div className="-mb-4">
                  <SectionTitle
                    icon={Zap}
                    title="Processos Urgentes"
                    action={
                      <Link to={`/${subdomain}/processos?prioridade=urgente`} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium flex items-center gap-1">
                        Ver todos <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    }
                  />
                </div>
              </div>
              <div className="p-4 space-y-2">
                {urgentesLista.slice(0, 3).map(p => (
                  <Link
                    key={p.id}
                    to={`/${subdomain}/processos/${p.id}`}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 hover:border-red-300 dark:hover:border-red-600 hover:shadow-sm transition-all"
                  >
                    <div className="w-1 self-stretch bg-red-500 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{p.numero}</span>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{p.assunto}</p>
                      {p.setorAtual && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {p.setorAtual.sigla || p.setorAtual.nome}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-red-300 group-hover:text-red-500 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Ações rápidas */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
              <SectionTitle icon={Activity} title="Ações Rápidas" />
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {acoes.map(({ to, icon: Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-center font-medium transition-all hover:shadow-sm ${color}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs leading-snug">{label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Atividades Recentes (timeline) ─────────────────────────────── */}
      {!isLoading && minhaCaixaLista.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50">
            <SectionTitle icon={CircleDot} title="Atividades Recentes" />
          </div>
          <div className="p-5">
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100 dark:bg-slate-700/60" />
              <div className="space-y-5">
                {minhaCaixaLista.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex gap-4 pl-10 relative">
                    <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 bg-blue-500 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/${subdomain}/processos/${p.id}`}
                        className="group flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/20 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {p.numero}
                            </span>
                            <span className={`badge ${STATUS_CLS[p.status] || ''}`}>{STATUS_LABEL[p.status] || p.status}</span>
                            {p.prioridade === 'urgente' && (
                              <span className="badge bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">Urgente</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">{p.assunto}</p>
                          {p.setorAtual && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {p.setorAtual.nome}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 mt-1 flex-shrink-0" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
