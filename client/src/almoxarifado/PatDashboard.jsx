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
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        eyebrow="Patrimônio"
        title="Painel"
        subtitle="Visão geral do acervo patrimonial, indicadores e últimos tombamentos"
        actions={
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Landmark}      label="Bens Ativos"         value={kpis.ativos ?? 0}              tone="blue" />
        <StatCard icon={DollarSign}    label="Valor Patrimonial"   value={fmtMoney(kpis.valorTotal)}     tone="green" />
        <StatCard icon={ArrowLeftRight} label="Transf. (30d)"      value={transferencias30dias ?? 0}     tone="amber" />
        <StatCard icon={PackageX}      label="Baixados"            value={kpis.baixados ?? 0}            tone="red" />
        <StatCard icon={ClipboardCheck} label="Cedidos"            value={kpis.cedidos ?? 0}             tone="violet" />
        <StatCard icon={TrendingDown}  label="Extraviados"         value={kpis.extraviados ?? 0}         tone="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por grupo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <SectionTitle icon={BarChart2} title="Distribuição por Grupo" />
          {(!porGrupo || porGrupo.length === 0) ? (
            <EmptyState icon={Landmark} title="Nenhum bem cadastrado" />
          ) : (
            <div className="space-y-2">
              {porGrupo.map(g => (
                <div key={g.grupo_id || 'sem-grupo'} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {g.grupo?.nome || 'Sem grupo'}
                    </p>
                    <p className="text-xs text-gray-500">{g.dataValues?.total || 0} bens</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {fmtMoney(g.dataValues?.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos tombamentos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <SectionTitle icon={Landmark} title="Últimos Tombamentos" />
          {(!ultimosTombamentos || ultimosTombamentos.length === 0) ? (
            <EmptyState icon={Landmark} title="Nenhum tombamento registrado" />
          ) : (
            <div className="space-y-2">
              {ultimosTombamentos.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                      {b.numero_tombamento}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{b.descricao}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
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
