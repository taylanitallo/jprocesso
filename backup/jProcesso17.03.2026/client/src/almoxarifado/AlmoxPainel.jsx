import { useState, useEffect, useCallback } from 'react'
import {
  Package, DollarSign, AlertTriangle, ClipboardList,
  ArrowDownCircle, ArrowUpCircle, BarChart2, RefreshCw,
  ShoppingCart, Clock, TrendingUp
} from 'lucide-react'
import api from '../services/api'
import { fmt, fmtMoney } from './almoxConstants'

export default function AlmoxPainel() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/almoxarifado/dashboard')
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

  const cards = [
    { label: 'Total de Itens',    value: dados.totalItens,                    icon: Package,       color: 'blue' },
    { label: 'Valor do Estoque',  value: fmtMoney(dados.valorTotalEstoque),   icon: DollarSign,    color: 'green' },
    { label: 'Itens Críticos',    value: dados.itensCriticos?.length || 0,    icon: AlertTriangle, color: 'red' },
    { label: 'Req. Pendentes',    value: dados.requisicoesPendentes,          icon: ClipboardList, color: 'yellow' },
    { label: 'Ressuprimento',     value: dados.itensRessuprimento || 0,       icon: ShoppingCart,  color: 'orange' },
    { label: 'Lotes Vencendo',    value: dados.lotesVencendo || 0,            icon: Clock,         color: 'pink' },
  ]

  const colorMap = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    pink:   'bg-pink-50 text-pink-700 border-pink-100',
  }

  return (
    <div className="space-y-6">
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
        {/* Itens críticos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> ⚠️ Estoque Crítico
          </h3>
          {dados.itensCriticos?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhum item com estoque crítico
            </p>
          ) : (
            <div className="space-y-2">
              {dados.itensCriticos?.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.codigo}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-600">{fmt(item.estoque_atual)}</span>
                    <p className="text-xs text-gray-400">mín: {fmt(item.estoque_minimo)} {item.unidade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas movimentações */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-500" /> 📊 Últimas Movimentações
          </h3>
          {dados.ultimasMovimentacoes?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Sem movimentações</p>
          ) : (
            <div className="space-y-2">
              {dados.ultimasMovimentacoes?.map(mov => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {mov.tipo === 'ENTRADA'
                      ? <ArrowDownCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      : <ArrowUpCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{mov.item?.nome}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{mov.data_movimentacao}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${mov.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                    {mov.tipo === 'ENTRADA' ? '+' : '-'}{fmt(mov.quantidade)} {mov.item?.unidade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ressuprimento */}
      {dados.itensRessuprimento > 0 && dados.itensRessuprimentoList?.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-700 p-5">
          <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Sugestão de Compra — Ponto de Ressuprimento Atingido
          </h3>
          <div className="space-y-1">
            {dados.itensRessuprimentoList.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-orange-100 dark:border-orange-800 last:border-0 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.nome}</span>
                  <span className="text-xs text-gray-400 ml-2">{item.codigo}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-orange-700 dark:text-orange-300">{fmt(item.estoque_atual)} {item.unidade}</span>
                  <span className="text-xs text-gray-400 ml-1">/ pt.ressup {fmt(item.ponto_ressuprimento)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lotes vencendo */}
      {dados.lotesVencendo > 0 && dados.lotesVencendoList?.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-700 p-5">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Lotes com Validade Próxima ou Vencida
          </h3>
          <div className="space-y-1">
            {dados.lotesVencendoList.map(lote => {
              const dias = Math.ceil((new Date(lote.data_validade) - new Date()) / 86400000)
              return (
                <div key={lote.id} className="flex items-center justify-between py-1.5 border-b border-red-100 dark:border-red-800 last:border-0 text-sm">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{lote.item?.nome || '—'}</span>
                    {lote.numero_empenho && <span className="text-xs text-gray-400 ml-2">Emp. {lote.numero_empenho}</span>}
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${dias < 0 ? 'text-red-600' : 'text-orange-500'}`}>
                      {dias < 0 ? `Vencido há ${Math.abs(dias)}d` : `Vence em ${dias}d`}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">saldo {fmt(lote.quantidade_atual)} {lote.item?.unidade}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Predição de demanda */}
      {dados.predicaoConsumoMensal && Object.keys(dados.predicaoConsumoMensal).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" /> Predição de Demanda — Média Mensal (últimos 3 meses)
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 text-left font-semibold">Item</th>
                <th className="pb-2 text-right font-semibold">Consumo médio mensal</th>
                <th className="pb-2 text-right font-semibold">Estoque atual</th>
                <th className="pb-2 text-right font-semibold">Meses restantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {Object.entries(dados.predicaoConsumoMensal).map(([itemId, pred]) => {
                const meses = pred.media > 0 ? (pred.estoqueAtual / pred.media).toFixed(1) : null
                return (
                  <tr key={itemId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="py-2 text-gray-800 dark:text-gray-200">
                      <span className="font-medium">{pred.nome}</span>
                      <span className="text-xs text-gray-400 ml-2">{pred.codigo}</span>
                    </td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">{fmt(pred.media)} {pred.unidade}/mês</td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">{fmt(pred.estoqueAtual)}</td>
                    <td className={`py-2 text-right font-semibold ${
                      meses === null ? 'text-gray-400' :
                      parseFloat(meses) < 1 ? 'text-red-600' :
                      parseFloat(meses) < 2 ? 'text-orange-500' : 'text-green-600'
                    }`}>{meses !== null ? `${meses} mês(es)` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
