import { Suspense, lazy, useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import NumeroProcesso from '../components/NumeroProcesso'
import { useAuth } from '../context/AuthContext'
import {
  Inbox, FilePlus2, Clock, CheckCircle2, AlertTriangle,
  RefreshCw, Plus, ArrowRight, Zap, Package, ClipboardList,
  TrendingUp, FileText, Activity, Building2, LayoutDashboard,
  Bell, BarChart3, CircleDot, MapPin,
} from 'lucide-react'
import { PageHeader, StatCard, SectionTitle, EmptyState } from '../components/ui'
import { hasPerm, moduloHabilitado } from '../utils/permissions'

const REFRESH_INTERVAL = 60000 // 60s

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
const PRIO_CLS     = { urgente: 'bg-danger-500', alta: 'bg-orange-400', normal: 'bg-info-400', baixa: 'bg-ink-300' }

// ── Sub-components ────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`bg-ink-100 rounded-xl animate-pulse ${className}`} />
}

function AlertItem({ icon: Icon, title, desc, tone, link }) {
  const cls = {
    red:    'bg-danger-50 dark:bg-danger-900/15 border-danger-200 dark:border-danger-800/40 text-danger-700 dark:text-danger-300',
    amber:  'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
    blue:   'bg-info-50 dark:bg-info-900/15 border-info-200 dark:border-info-800/40 text-brand-700 dark:text-info-300',
    orange: 'bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300',
  }[tone] || ''

  const iconCls = {
    red: 'text-danger-500', amber: 'text-amber-500',
    blue: 'text-info-500', orange: 'text-orange-500',
  }[tone] || 'text-ink-400'

  const inner = (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${cls}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconCls}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="text-xs text-ink-500 mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  )

  return link ? <Link to={link}>{inner}</Link> : inner
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, tenant } = useAuth()
  const { subdomain } = useParams()
  const queryClient = useQueryClient()
  const [lastUpdated, setLastUpdated] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  // O dashboard mostra só o que o usuário pode ver: módulo contratado + permissão
  const podeModulo = (modulo, ...perm) => moduloHabilitado(tenant, modulo) && hasPerm(user, ...perm)
  const podeProcessos    = podeModulo('processos', 'processos', 'ver')
  const podeNovoProcesso = podeProcessos && hasPerm(user, 'processos', 'criar')
  const podeAlmox        = podeModulo('almoxarifado', 'almoxarifado', 'acessar')
  const podeEstoque      = podeAlmox && hasPerm(user, 'almoxarifado', 'estoque', 'ver')
  const podeRequisicoes  = podeAlmox && hasPerm(user, 'almoxarifado', 'requisicoes', 'ver')
  const podeFinanceiro   = podeModulo('financeiro', 'financeiro', 'acessar') && hasPerm(user, 'financeiro', 'painel', 'ver')
  const podeContratos    = podeModulo('contratos', 'contratos', 'acessar')

  const { data: procData, isLoading: procLoading, isError } = useQuery(
    'dashboard-stats',
    () => api.get('/processos/dashboard').then(r => r.data),
    { enabled: podeProcessos, refetchInterval: REFRESH_INTERVAL, staleTime: 30000, onSuccess: () => setLastUpdated(Date.now()) }
  )
  const isLoading = podeProcessos && procLoading

  const { data: almoxData, isLoading: almoxLoading } = useQuery(
    'dashboard-almox',
    () => api.get('/almoxarifado/dashboard').then(r => r.data),
    { enabled: podeAlmox, refetchInterval: REFRESH_INTERVAL, staleTime: 30000, retry: 1 }
  )

  const { data: finData, isLoading: finLoading } = useQuery(
    'dashboard-fin',
    () => api.get('/financeiro/dashboard').then(r => r.data),
    { enabled: podeFinanceiro, refetchInterval: REFRESH_INTERVAL, staleTime: 30000, retry: 1 }
  )

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries('dashboard-stats')
    queryClient.invalidateQueries('dashboard-almox')
    queryClient.invalidateQueries('dashboard-fin')
    setLastUpdated(Date.now())
  }, [queryClient])

  // Contador de "atualizado há Xs"
  useEffect(() => {
    if (!lastUpdated) return
    const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000)), 5000)
    setSecondsAgo(0)
    return () => clearInterval(id)
  }, [lastUpdated])

  const lastUpdatedLabel = lastUpdated
    ? secondsAgo < 10 ? 'agora mesmo'
    : secondsAgo < 60 ? `há ${secondsAgo}s`
    : `há ${Math.floor(secondsAgo / 60)}min`
    : null

  // Os flags também filtram aqui: o cache do react-query pode guardar dados de outro login
  const stats           = (podeProcessos && procData?.stats)           || {}
  const minhaCaixaLista = (podeProcessos && procData?.minhaCaixaLista) || []
  const urgentesLista   = (podeProcessos && procData?.urgentesLista)   || []

  const itensCriticos = (podeEstoque && almoxData?.itensCriticos) || []
  const reqPendentes  = podeRequisicoes ? (almoxData?.requisicoesPendentes ?? null) : null

  // Saída real das contas no ano (líquido dos DIDs + retenções recolhidas) — mesma fonte do extrato
  const valorPago = podeFinanceiro && finData?.tesouraria?.valorPago != null ? parseFloat(finData.tesouraria.valorPago) : null

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
      // "item" + "ns" gerava "itemns"; o plural troca a palavra inteira.
      title: `${itensCriticos.length} ${itensCriticos.length > 1 ? 'itens' : 'item'} em estoque crítico`,
      desc: itensCriticos[0]?.nome || 'Abaixo do mínimo definido',
      link: `/${subdomain}/almoxarifado/itens`,
    },
    (reqPendentes > 0) && {
      icon: ClipboardList, tone: 'blue',
      // "requisição" + "ões" gerava "requisiçãoões"; o plural substitui o "ção" por "ções".
      title: `${reqPendentes} ${reqPendentes > 1 ? 'requisições pendentes' : 'requisição pendente'}`,
      desc: 'Aguardando autorização ou atendimento',
      link: `/${subdomain}/almoxarifado/requisicoes`,
    },
  ].filter(Boolean)

  // ── Ações rápidas ─────────────────────────────────────────────────────────
  const acoes = [
    podeNovoProcesso && { to: `/${subdomain}/processos/novo`,           icon: FilePlus2,   label: 'Novo Processo',   color: 'text-brand-600 dark:text-info-400 bg-info-50 dark:bg-info-900/20 hover:bg-info-100 dark:hover:bg-info-900/40 border-info-100 dark:border-info-900/30' },
    podeContratos    && { to: `/${subdomain}/contratos`,                icon: FileText,    label: 'Contratos',        color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border-violet-100 dark:border-violet-900/30' },
    podeModulo('financeiro', 'financeiro', 'acessar') && { to: `/${subdomain}/financeiro`, icon: TrendingUp, label: 'Financeiro', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-100 dark:border-emerald-900/30' },
    podeRequisicoes  && { to: `/${subdomain}/almoxarifado/requisicoes`, icon: ClipboardList, label: 'Requisição',    color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-100 dark:border-orange-900/30' },
  ].filter(Boolean)

  // Linha "Operações": cada cartão só com a permissão do seu módulo
  const cardsOperacoes = [
    podeFinanceiro && (
      <StatCard key="pago" icon={TrendingUp} label="Valor Pago"
        value={finLoading && valorPago === null ? '—' : valorPago !== null ? fmtMoney(valorPago) : '—'}
        hint={`Empenhos pagos em ${new Date().getFullYear()}`} tone="violet" />
    ),
    podeEstoque && (
      <StatCard key="critico" icon={Package} label="Estoque Crítico"
        value={almoxLoading && !almoxData ? '—' : itensCriticos.length}
        hint="Itens abaixo do mínimo" tone="red" />
    ),
    podeRequisicoes && (
      <StatCard key="req" icon={ClipboardList} label="Req. Pendentes"
        value={almoxLoading && !almoxData ? '—' : (reqPendentes ?? 0)}
        hint="Aguardando autorização" tone="cyan" />
    ),
    podeProcessos && (
      <StatCard key="concluidos" icon={CheckCircle2} label="Concluídos"
        value={isLoading ? '—' : (stats.concluidos ?? 0)}
        hint="Processos finalizados" tone="green" />
    ),
  ].filter(Boolean)

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        icon={LayoutDashboard}
        title={`${greeting()}, ${user?.nomeReduzido || user?.nome?.split(' ')[0]}`}
        subtitle={
          <span className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-3.5 w-3.5 text-ink-400 shrink-0" />
            <span>{user?.secretaria?.nome || 'Secretaria'}</span>
            <span className="text-ink-400">·</span>
            <span>{user?.setor?.nome || 'Setor'}</span>
          </span>
        }
        actions={
          <>
            <div className="flex items-center gap-2">
              {lastUpdatedLabel && (
                <span className="text-xs text-ink-400 hidden sm:inline">
                  Atualizado {lastUpdatedLabel}
                </span>
              )}
            </div>
            {podeNovoProcesso && (
              <Link to={`/${subdomain}/processos/novo`} className="btn-primary">
                <Plus className="h-4 w-4" />
                Novo Processo
              </Link>
            )}
          </>
        }
      />

      {/* ── Faixa de erro ──────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Erro ao carregar dados do dashboard.</span>
          <button onClick={refetchAll} className="underline ml-1 font-medium hover:no-underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── KPI Row 1 — Processos ───────────────────────────────────────── */}
      {podeProcessos && <div>
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-3 px-0.5">
          Processos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
      </div>}

      {/* ── KPI Row 2 — Operações ───────────────────────────────────────── */}
      {cardsOperacoes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-3 px-0.5">
            Operações
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cardsOperacoes}
          </div>
        </div>
      )}

      {/* ── Main Grid ──────────────────────────────────────────────────── */}
      {/* Sem Processos, a coluna lateral se espalha pela grade (contents) */}
      <div className={`grid grid-cols-1 gap-6 ${podeProcessos ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>

        {/* ── Col 1-2 ─────────────────────────────────────────────────── */}
        {podeProcessos && <div className="lg:col-span-2 space-y-4">

          {/* Gráfico de status */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100">
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
            <div className="px-5 py-4 border-b border-ink-100">
              <div className="-mb-4">
                <SectionTitle
                  icon={Inbox}
                  title="Minha Caixa de Entrada"
                  action={
                    <Link to={`/${subdomain}/processos`} className="text-xs text-brand-600 dark:text-info-400 hover:underline font-medium flex items-center gap-1">
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
                      className="group flex items-center gap-3 p-3 rounded-xl border border-ink-100 hover:border-info-300 dark:hover:border-brand-600 hover:bg-info-50/50 dark:hover:bg-info-900/10 transition-all"
                    >
                      <div className={`w-1 self-stretch rounded-full shrink-0 ${PRIO_CLS[p.prioridade] || 'bg-ink-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <NumeroProcesso numero={p.numero} className="font-semibold text-ink-900 text-sm" />
                          <span className={`badge ${STATUS_CLS[p.status] || ''}`}>{STATUS_LABEL[p.status] || p.status}</span>
                        </div>
                        <p className="text-sm text-ink-500 break-words mt-0.5">{p.assunto}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-info-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Caixa vazia" description="Você está em dia com tudo" />
              )}
            </div>
          </div>

        </div>}

        {/* ── Col 3 — Alertas + Urgentes + Ações ──────────────────────── */}
        <div className={podeProcessos ? 'space-y-4' : 'contents'}>

          {/* Alertas executivos */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100">
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
              <div className="px-5 py-4 border-b border-ink-100">
                <div className="-mb-4">
                  <SectionTitle
                    icon={Zap}
                    title="Processos Urgentes"
                    action={
                      <Link to={`/${subdomain}/processos?prioridade=urgente`} className="text-xs text-danger-600 dark:text-danger-400 hover:underline font-medium flex items-center gap-1">
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
                    className="group flex items-center gap-3 p-3 rounded-xl border border-danger-100 dark:border-danger-900/30 bg-danger-50/50 dark:bg-danger-900/10 hover:border-danger-300 dark:hover:border-danger-600 hover:shadow-sm transition-all"
                  >
                    <div className="w-1 self-stretch bg-danger-500 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                      <NumeroProcesso numero={p.numero} className="font-semibold text-ink-900 text-sm" />
                      <p className="text-xs text-ink-500 break-words mt-0.5">{p.assunto}</p>
                      {p.setorAtual && (
                        <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {p.setorAtual.sigla || p.setorAtual.nome}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-danger-300 group-hover:text-danger-500 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Ações rápidas */}
          {acoes.length > 0 && <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100">
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
          </div>}

        </div>
      </div>

      {/* ── Atividades Recentes (timeline) ─────────────────────────────── */}
      {!isLoading && minhaCaixaLista.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <SectionTitle icon={CircleDot} title="Atividades Recentes" />
          </div>
          <div className="p-5">
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-ink-100" />
              <div className="space-y-4">
                {minhaCaixaLista.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex gap-4 pl-10 relative">
                    <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-info-500 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/${subdomain}/processos/${p.id}`}
                        className="group flex items-start gap-3 hover:bg-ink-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <NumeroProcesso numero={p.numero} className="text-sm font-semibold text-ink-900 group-hover:text-brand-600 dark:group-hover:text-info-400 transition-colors" />
                            <span className={`badge ${STATUS_CLS[p.status] || ''}`}>{STATUS_LABEL[p.status] || p.status}</span>
                            {p.prioridade === 'urgente' && (
                              <span className="badge bg-danger-100 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300">Urgente</span>
                            )}
                          </div>
                          <p className="text-sm text-ink-500 break-words mt-0.5">{p.assunto}</p>
                          {p.setorAtual && (
                            <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {p.setorAtual.nome}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-info-500 mt-1 shrink-0" />
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
