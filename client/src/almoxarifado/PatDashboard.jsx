import { useState, useEffect, useCallback } from 'react'
import {
  Landmark, DollarSign, ArrowLeftRight, PackageX,
  RefreshCw, ClipboardCheck, TrendingDown, BarChart2
} from 'lucide-react'
import api from '../services/api'
import LoadingBar from '../components/LoadingBar'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'

const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function PatDashboard() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/patrimonio/dashboard')
      setDados(data)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <LoadingBar label="Carregando painel patrimonial..." />
  }
  if (!dados) return (
    <EmptyState
      icon={Landmark}
      title="Sem dados disponíveis"
      description="Não foi possível carregar os dados do painel patrimonial."
      action={<button onClick={load} className="btn-primary text-sm">Tentar novamente</button>}
    />
  )

  const { kpis, porGrupo, ultimosTombamentos, transferencias30dias } = dados

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Landmark}
        eyebrow="Patrimônio"
        title="Painel"
        subtitle="Visão geral do acervo patrimonial, indicadores e últimos tombamentos"
        actions={
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-ink-300 text-ink-600 rounded-lg text-sm hover:bg-ink-50">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        }
      />
      {/* Mesmo padrão do painel do Almoxarifado: 6 indicadores em 2 linhas de 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Landmark}      label="Bens Ativos"         value={kpis.ativos ?? 0}              tone="blue" />
        <StatCard icon={DollarSign}    label="Valor Patrimonial"   value={fmtMoney(kpis.valorTotal)}     tone="green" />
        <StatCard icon={ArrowLeftRight} label="Transferências (30 dias)" value={transferencias30dias ?? 0} tone="amber" />
        <StatCard icon={PackageX}      label="Baixados"            value={kpis.baixados ?? 0}            tone="red" />
        <StatCard icon={ClipboardCheck} label="Cedidos"            value={kpis.cedidos ?? 0}             tone="violet" />
        <StatCard icon={TrendingDown}  label="Extraviados"         value={kpis.extraviados ?? 0}         tone="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por grupo */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <SectionTitle icon={BarChart2} title="Distribuição por Grupo" />
          {(!porGrupo || porGrupo.length === 0) ? (
            <EmptyState icon={Landmark} title="Nenhum bem cadastrado" />
          ) : (
            <div className="space-y-2">
              {porGrupo.map(g => (
                <div key={g.grupo_id || 'sem-grupo'} className="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 dark:text-white break-words">
                      {g.grupo?.nome || 'Sem grupo'}
                    </p>
                    {/* A API devolve total/valor no próprio objeto (JSON), não em dataValues */}
                    <p className="text-xs text-ink-500">{Number(g.total ?? g.dataValues?.total ?? 0)} bens</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink-700 tabular-nums">
                    {fmtMoney(g.valor ?? g.dataValues?.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos tombamentos */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <SectionTitle icon={Landmark} title="Últimos Tombamentos" />
          {(!ultimosTombamentos || ultimosTombamentos.length === 0) ? (
            <EmptyState icon={Landmark} title="Nenhum tombamento registrado" />
          ) : (
            <div className="space-y-2">
              {ultimosTombamentos.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 dark:text-white font-mono">
                      {b.numero_tombamento}
                    </p>
                    {/* Descrição completa (quebra linha em vez de cortar) */}
                    <p className="text-xs text-ink-500 break-words">{b.descricao}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-500 whitespace-nowrap">
                    {b.secretaria?.sigla || '–'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
