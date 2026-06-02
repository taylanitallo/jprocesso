import { useParams, useNavigate } from 'react-router-dom'
import { Component } from 'react'
import { Package, BarChart2, List, ArrowDownCircle, ArrowUpCircle, ClipboardList, Shield, ClipboardCheck, CalendarRange, AlertTriangle } from 'lucide-react'

class TabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="font-semibold text-red-600 dark:text-red-400">Erro ao carregar esta aba</p>
        <pre className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded p-3 max-w-2xl overflow-auto whitespace-pre-wrap">{String(this.state.error)}</pre>
        <button onClick={() => this.setState({ error: null })} className="text-xs text-blue-500 underline">Tentar novamente</button>
      </div>
    )
    return this.props.children
  }
}
import AlmoxPainel from '../almoxarifado/AlmoxPainel'
import AlmoxItens from '../almoxarifado/AlmoxItens'
import AlmoxLotes from '../almoxarifado/AlmoxLotes'
import { AlmoxSaidas } from '../almoxarifado/AlmoxMovimentacoes'
import AlmoxRequisicoes from '../almoxarifado/AlmoxRequisicoes'
import AlmoxAuditLog from '../almoxarifado/AlmoxAuditLog'
import AlmoxInventario from '../almoxarifado/AlmoxInventario'
import AlmoxCotas from '../almoxarifado/AlmoxCotas'
import { PageHeader } from '../components/ui'

const TABS = [
  { id: 'painel',      label: 'Painel',        icon: BarChart2       },
  { id: 'itens',       label: 'Itens',          icon: List            },
  { id: 'lotes',       label: 'Entradas',       icon: ArrowDownCircle },
  { id: 'saidas',      label: 'Saídas',         icon: ArrowUpCircle   },
  { id: 'requisicoes', label: 'Requisições',    icon: ClipboardList   },
  { id: 'cotas',       label: 'Cotas',          icon: CalendarRange   },
  { id: 'inventario',  label: 'Inventário',     icon: ClipboardCheck  },
  { id: 'auditoria',   label: 'Auditoria',      icon: Shield          },
]

export default function Almoxarifado() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const VALID_TABS = TABS.map(t => t.id)
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'painel'
  const setActiveTab = (key) => navigate(`/${subdomain}/almoxarifado/${key}`)

  const renderTab = () => {
    switch (activeTab) {
      case 'painel':      return <AlmoxPainel />
      case 'itens':       return <AlmoxItens />
      case 'lotes':       return <AlmoxLotes />
      case 'saidas':      return <AlmoxSaidas />
      case 'requisicoes': return <AlmoxRequisicoes />
      case 'cotas':       return <AlmoxCotas />
      case 'inventario':  return <AlmoxInventario />
      case 'auditoria':   return <AlmoxAuditLog />
      default:            return null
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        icon={Package}
        eyebrow="Módulo"
        title="Almoxarifado"
        subtitle="Controle de estoque e materiais"
      />

      <div className="border-b border-gray-200 dark:border-slate-700/50">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="pb-4"><TabErrorBoundary key={activeTab}>{renderTab()}</TabErrorBoundary></div>
    </div>
  )
}
