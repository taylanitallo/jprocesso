import { useParams, useNavigate } from 'react-router-dom'
import { Component } from 'react'
import { Package, BarChart2, List, ArrowDownCircle, ArrowUpCircle, ClipboardList, Shield, ClipboardCheck, Inbox, AlertTriangle } from 'lucide-react'
import { hasPerm } from '../utils/permissions'
import { conferirAbasDoModulo } from '../utils/permissoesSchema'

class TabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle className="h-10 w-10 text-danger-400" />
        <p className="font-semibold text-danger-600 dark:text-danger-400">Erro ao carregar esta aba</p>
        <pre className="text-xs text-ink-500 bg-ink-100 rounded-sm p-3 max-w-2xl overflow-auto whitespace-pre-wrap">{String(this.state.error)}</pre>
        <button onClick={() => this.setState({ error: null })} className="text-xs text-info-500 underline">Tentar novamente</button>
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
import AlmoxSolicitacoes from '../almoxarifado/AlmoxSolicitacoes'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'painel',      label: 'Painel',        icon: BarChart2,       permPath: ['almoxarifado', 'painel',      'ver'] },
  { id: 'itens',       label: 'Estoque',        icon: List,            permPath: ['almoxarifado', 'estoque',     'ver'] },
  { id: 'lotes',       label: 'Entradas',       icon: ArrowDownCircle, permPath: ['almoxarifado', 'entradas',    'ver'] },
  { id: 'saidas',      label: 'Saídas',         icon: ArrowUpCircle,   permPath: ['almoxarifado', 'saidas',      'ver'] },
  { id: 'requisicoes', label: 'Requisições',    icon: ClipboardList,   permPath: ['almoxarifado', 'requisicoes', 'ver'] },
  { id: 'solicitacoes', label: 'Solicitações',   icon: Inbox,           permPath: ['almoxarifado', 'cotas',       'ver'] },
  { id: 'inventario',  label: 'Inventário',     icon: ClipboardCheck,  permPath: ['almoxarifado', 'inventario',  'ver'] },
  { id: 'auditoria',   label: 'Auditoria',      icon: Shield,          permPath: ['almoxarifado', 'auditoria',   'ver'] },
]

export default function Almoxarifado() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  conferirAbasDoModulo('almoxarifado', TABS.map(t => t.permPath[1]))
  const visibleTabs = TABS.filter(t => hasPerm(user, ...t.permPath))
  const VALID_TABS = visibleTabs.map(t => t.id)
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : (visibleTabs[0]?.id || 'painel')
  const setActiveTab = (key) => navigate(`/${subdomain}/almoxarifado/${key}`)

  const renderTab = () => {
    switch (activeTab) {
      case 'painel':      return <AlmoxPainel />
      case 'itens':       return <AlmoxItens />
      case 'lotes':       return <AlmoxLotes />
      case 'saidas':      return <AlmoxSaidas />
      case 'requisicoes': return <AlmoxRequisicoes />
      case 'solicitacoes': return <AlmoxSolicitacoes />
      case 'inventario':  return <AlmoxInventario />
      case 'auditoria':   return <AlmoxAuditLog />
      default:            return null
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        icon={Package}
        title="Almoxarifado"
        subtitle="Controle de estoque e materiais"
      />

      <div
        className="border-b border-ink-200 overflow-x-auto overflow-y-hidden scrollbar-none touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
      >
        <nav className="flex space-x-1 min-w-max">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-300'
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
