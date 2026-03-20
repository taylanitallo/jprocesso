import { useState, useEffect, useCallback } from 'react'
import {
  Landmark, DollarSign, ArrowLeftRight, PackageX,
  RefreshCw, ClipboardCheck, TrendingDown
} from 'lucide-react'
import api from '../services/api'

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
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }
  if (!dados) return null

  const { kpis, porGrupo, ultimosTombamentos, transferencias30dias } = dados

  const cards = [
    { label: 'Bens Ativos',          value: kpis.ativos,                     icon: Landmark,      color: 'blue' },
    { label: 'Valor Patrimonial',     value: fmtMoney(kpis.valorTotal),       icon: DollarSign,    color: 'green' },
    { label: 'Transferências (30d)',  value: transferencias30dias,            icon: ArrowLeftRight, color: 'yellow' },
    { label: 'Baixados',             value: kpis.baixados,                   icon: PackageX,       color: 'red' },
    { label: 'Cedidos',              value: kpis.cedidos,                    icon: ClipboardCheck, color: 'purple' },
    { label: 'Extraviados',          value: kpis.extraviados,                icon: TrendingDown,   color: 'orange' },
  ]

  const colorMap = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${colorMap[c.color]}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-80">{c.label}</span>
              <c.icon className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-2xl font-bold">{c.value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por grupo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📊 Distribuição por Grupo</h3>
          {(!porGrupo || porGrupo.length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum bem cadastrado</p>
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
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🏷️ Últimos Tombamentos</h3>
          {(!ultimosTombamentos || ultimosTombamentos.length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum tombamento registrado</p>
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
