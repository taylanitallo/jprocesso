import { useState, useEffect, useCallback } from 'react'
import {
  Package, DollarSign, AlertTriangle, ClipboardList,
  ArrowDownCircle, ArrowUpCircle, BarChart2, RefreshCw,
  ShoppingCart, Clock, TrendingUp
} from 'lucide-react'
import api from '../services/api'
import LoadingBar from '../components/LoadingBar'
import { fmt, fmtMoney } from './almoxConstants'
import StatCard from '../components/ui/StatCard'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'

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
    return <LoadingBar label="Carregando painel..." />
  }
  if (!dados) return (
    <EmptyState
      icon={Package}
      title="Sem dados disponíveis"
      description="Não foi possível carregar os dados do painel."
      action={<button onClick={load} className="btn-primary text-sm">Tentar novamente</button>}
    />
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5
                     border border-ink-200
                     text-ink-500 rounded-lg text-xs
                     hover:bg-ink-50
                     hover:text-ink-700
                     transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Package}       label="Total de Itens"   value={dados.totalItens ?? 0}              tone="blue" />
        <StatCard icon={DollarSign}    label="Valor do Estoque" value={fmtMoney(dados.valorTotalEstoque)}  tone="green" />
        <StatCard icon={AlertTriangle} label="Itens Críticos"   value={dados.itensCriticos?.length || 0}  tone="red" />
        <StatCard icon={ClipboardList} label="Req. Pendentes"   value={dados.requisicoesPendentes ?? 0}   tone="amber" />
        <StatCard icon={ShoppingCart}  label="Ressuprimento"    value={dados.itensRessuprimento || 0}      tone="violet" />
        <StatCard icon={Clock}         label="Lotes Vencendo"   value={dados.lotesVencendo || 0}           tone="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Itens críticos */}
        <div className="bg-surface rounded-2xl border border-ink-200 p-5">
          <SectionTitle icon={AlertTriangle} title="Estoque Crítico" />
          {dados.itensCriticos?.length === 0 ? (
            <EmptyState icon={Package} title="Nenhum item crítico" description="Todos os itens estão acima do estoque mínimo." />
          ) : (
            <div className="space-y-2">
              {dados.itensCriticos?.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-ink-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-900">{item.nome}</p>
                    <p className="text-xs text-ink-500">{item.codigo}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-danger-600">{fmt(item.estoque_atual)}</span>
                    <p className="text-xs text-ink-400">mín: {fmt(item.estoque_minimo)} {item.unidade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas movimentações */}
        <div className="bg-surface rounded-2xl border border-ink-200 p-5">
          <SectionTitle icon={BarChart2} title="Últimas Movimentações" />
          {dados.ultimasMovimentacoes?.length === 0 ? (
            <EmptyState icon={ArrowDownCircle} title="Sem movimentações" description="Nenhuma movimentação registrada recentemente." />
          ) : (
            <div className="space-y-2">
              {dados.ultimasMovimentacoes?.map(mov => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between py-2 border-b border-ink-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {mov.tipo === 'ENTRADA'
                      ? <ArrowDownCircle className="h-4 w-4 text-success-500 shrink-0" />
                      : <ArrowUpCircle className="h-4 w-4 text-danger-500 shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-medium text-ink-900">{mov.item?.nome}</p>
                      <p className="text-xs text-ink-400">{mov.data_movimentacao}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${mov.tipo === 'ENTRADA' ? 'text-success-600' : 'text-danger-600'}`}>
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
          <SectionTitle icon={ShoppingCart} title="Sugestão de Compra — Ponto de Ressuprimento Atingido" />
          <div className="space-y-1">
            {dados.itensRessuprimentoList.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-orange-100 dark:border-orange-800 last:border-0 text-sm">
                <div>
                  <span className="font-medium text-ink-900">{item.nome}</span>
                  <span className="text-xs text-ink-400 ml-2">{item.codigo}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-orange-700 dark:text-orange-300">{fmt(item.estoque_atual)} {item.unidade}</span>
                  <span className="text-xs text-ink-400 ml-1">/ pt.ressup {fmt(item.ponto_ressuprimento)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lotes vencendo */}
      {dados.lotesVencendo > 0 && dados.lotesVencendoList?.length > 0 && (
        <div className="bg-danger-50 dark:bg-danger-900/10 rounded-xl border border-danger-200 dark:border-danger-700 p-5">
          <SectionTitle icon={Clock} title="Lotes com Validade Próxima ou Vencida" />
          <div className="space-y-1">
            {dados.lotesVencendoList.map(lote => {
              const dias = Math.ceil((new Date(lote.data_validade) - new Date()) / 86400000)
              return (
                <div key={lote.id} className="flex items-center justify-between py-1.5 border-b border-danger-100 dark:border-danger-800 last:border-0 text-sm">
                  <div>
                    <span className="font-medium text-ink-900">{lote.item?.nome || '—'}</span>
                    {lote.numero_empenho && <span className="text-xs text-ink-400 ml-2">Emp. {lote.numero_empenho}</span>}
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${dias < 0 ? 'text-danger-600' : 'text-orange-500'}`}>
                      {dias < 0 ? `Vencido há ${Math.abs(dias)}d` : `Vence em ${dias}d`}
                    </span>
                    <span className="text-xs text-ink-400 ml-2">saldo {fmt(lote.quantidade_atual)} {lote.item?.unidade}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Predição de demanda */}
      {dados.predicaoConsumoMensal && Object.keys(dados.predicaoConsumoMensal).length > 0 && (
        <div className="bg-surface rounded-2xl border border-ink-200 p-5">
          <SectionTitle icon={TrendingUp} title="Predição de Demanda" subtitle="Média mensal dos últimos 3 meses" />
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-500 border-b border-ink-100">
                <th className="pb-2 text-left font-semibold">Item</th>
                <th className="pb-2 text-right font-semibold">Consumo médio mensal</th>
                <th className="pb-2 text-right font-semibold">Estoque atual</th>
                <th className="pb-2 text-right font-semibold">Meses restantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {Object.entries(dados.predicaoConsumoMensal).map(([itemId, pred]) => {
                const meses = pred.media > 0 ? (pred.estoqueAtual / pred.media).toFixed(1) : null
                return (
                  <tr key={itemId} className="hover:bg-ink-50">
                    <td className="py-2 text-ink-800">
                      <span className="font-medium">{pred.nome}</span>
                      <span className="text-xs text-ink-400 ml-2">{pred.codigo}</span>
                    </td>
                    <td className="py-2 text-right text-ink-600">{fmt(pred.media)} {pred.unidade}/mês</td>
                    <td className="py-2 text-right text-ink-600">{fmt(pred.estoqueAtual)}</td>
                    <td className={`py-2 text-right font-semibold ${
                      meses === null ? 'text-ink-400' :
                      parseFloat(meses) < 1 ? 'text-danger-600' :
                      parseFloat(meses) < 2 ? 'text-orange-500' : 'text-success-600'
                    }`}>{meses !== null ? `${meses} mês(es)` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
