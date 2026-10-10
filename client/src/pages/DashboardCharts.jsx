import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const STATUS_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981']
const STATUS_NAMES  = ['Em Andamento', 'Urgentes', 'Pendentes 48h', 'Concluídos']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-surface border border-ink-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-ink-700">{name}</p>
      <p className="text-ink-500 mt-0.5">{value} processo{value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function DashboardCharts({ stats, urgentCount }) {
  const raw = [
    stats.minhaCaixa  || 0,
    urgentCount        || 0,
    stats.pendentes48h || 0,
    stats.concluidos   || 0,
  ]

  const data = STATUS_NAMES
    .map((name, i) => ({ name, value: raw[i], color: STATUS_COLORS[i] }))
    .filter(d => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 gap-2 text-ink-400">
        <span className="text-4xl">📭</span>
        <p className="text-sm">Nenhum processo registrado ainda</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-2xl font-bold text-ink-900 tabular-nums leading-none">{total}</span>
          <span className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wide">processos</span>
        </div>
      </div>

      {/* Legenda com barras */}
      <div className="flex flex-col gap-3.5 flex-1 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-ink-600 truncate">{d.name}</span>
                <span className="text-xs font-bold text-ink-900 tabular-nums">{d.value}</span>
              </div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
