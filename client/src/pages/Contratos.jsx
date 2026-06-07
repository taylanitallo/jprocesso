import { useParams, useNavigate } from 'react-router-dom'
import { FileText, BarChart3 } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { TABS } from './contratos/ContratosShared'
import TabItens from './contratos/TabItens'
import TabCredor from './contratos/TabCredor'
import TabContratos from './contratos/TabContratos'
import TabOrdens from './contratos/TabOrdens'
import TabRelatorios from './contratos/TabRelatorios'

export default function Contratos() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const VALID_TABS_CTR = TABS.map(t => t.key)
  const tab = VALID_TABS_CTR.includes(tabParam) ? tabParam : 'contratos'
  const setTab = (key) => navigate(`/${subdomain}/contratos/${key}`)

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        icon={FileText}
        title="Gestão Contratual"
        subtitle="Monitoramento de contratos, vigências, credores e execução financeira"
        actions={
          <button
            onClick={() => navigate(`/${subdomain}/contratos/dashboard`)}
            className="h-9 inline-flex items-center gap-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all"
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>
        }
      />

      <div
        className="border-b border-gray-200 dark:border-slate-700/50 overflow-x-auto overflow-y-hidden scrollbar-none touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
      >
        <nav className="flex gap-1 min-w-max">
          {TABS.map(t => {
            const active = tab === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300'}`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'contratos'  && <TabContratos />}
      {tab === 'credor'     && <TabCredor />}
      {tab === 'itens'      && <TabItens />}
      {tab === 'ordens'     && <TabOrdens />}
      {tab === 'relatorios' && <TabRelatorios />}
    </div>
  )
}