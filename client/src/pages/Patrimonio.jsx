import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Landmark, BarChart2, List, Plus, ArrowLeftRight,
  PackageX, ClipboardList, Settings
} from 'lucide-react'
import { hasPerm } from '../utils/permissions'
import { conferirAbasDoModulo } from '../utils/permissoesSchema'
import PatDashboard from '../almoxarifado/PatDashboard'
import PatBens from '../almoxarifado/PatBens'
import PatEntrada from '../almoxarifado/PatEntrada'
import PatTransferencia from '../almoxarifado/PatTransferencia'
import PatBaixa from '../almoxarifado/PatBaixa'
import PatInventario from '../almoxarifado/PatInventario'
import PatGrupos from '../almoxarifado/PatGrupos'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'painel',        label: 'Painel',        icon: BarChart2,     permPath: ['patrimonio', 'painel',        'ver'] },
  { id: 'bens',          label: 'Bens',           icon: List,          permPath: ['patrimonio', 'bens',          'ver'] },
  { id: 'tombamento',    label: 'Tombamento',     icon: Plus,          permPath: ['patrimonio', 'tombamento',    'ver'] },
  { id: 'transferencia', label: 'Transferência',  icon: ArrowLeftRight, permPath: ['patrimonio', 'transferencia', 'ver'] },
  { id: 'baixa',         label: 'Baixa',          icon: PackageX,      permPath: ['patrimonio', 'baixa',         'ver'] },
  { id: 'inventario',    label: 'Inventário',     icon: ClipboardList, permPath: ['patrimonio', 'inventario',    'ver'] },
  { id: 'grupos',        label: 'Grupos',         icon: Settings,      permPath: ['patrimonio', 'grupos',        'ver'] },
]

export default function Patrimonio() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  conferirAbasDoModulo('patrimonio', TABS.map(t => t.permPath[1]))
  const visibleTabs = TABS.filter(t => hasPerm(user, ...t.permPath))
  const VALID_TABS = visibleTabs.map(t => t.id)
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : (visibleTabs[0]?.id || 'painel')
  const setActiveTab = (key) => navigate(`/${subdomain}/patrimonio/${key}`)

  // Bem selecionado para transferência ou baixa (vindo da tela de bens)
  const [bemSelecionado, setBemSelecionado] = useState(null)

  const handleTransferir = (bem) => {
    setBemSelecionado(bem)
    setActiveTab('transferencia')
  }

  const handleBaixar = (bem) => {
    setBemSelecionado(bem)
    setActiveTab('baixa')
  }

  const handleSuccess = () => {
    setBemSelecionado(null)
    setActiveTab('bens')
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'painel':
        return <PatDashboard />
      case 'bens':
        return (
          <PatBens
            onEntrada={() => setActiveTab('tombamento')}
            onTransferir={handleTransferir}
            onBaixar={handleBaixar}
          />
        )
      case 'tombamento':
        return (
          <PatEntrada
            onSuccess={handleSuccess}
            onCancel={() => setActiveTab('bens')}
          />
        )
      case 'transferencia':
        return (
          <PatTransferencia
            bem={bemSelecionado}
            onSuccess={handleSuccess}
            onCancel={() => setActiveTab('bens')}
          />
        )
      case 'baixa':
        return (
          <PatBaixa
            bem={bemSelecionado}
            onSuccess={handleSuccess}
            onCancel={() => setActiveTab('bens')}
          />
        )
      case 'inventario':
        return <PatInventario userRole={user?.tipo} />
      case 'grupos':
        return <PatGrupos />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2.5 rounded-xl">
          <Landmark className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="page-title">🏛️ Controle Patrimonial</h1>
          <p className="page-subtitle">Bens permanentes — Conformidade TCE-Ceará</p>
        </div>
      </div>

      {/* Tabs */}
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
                onClick={() => { setBemSelecionado(null); setActiveTab(tab.id) }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
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

      {/* Conteúdo */}
      <div>
        {(activeTab === 'transferencia' || activeTab === 'baixa') && !bemSelecionado ? (
          <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-6 text-center">
            <p className="text-warning-700 dark:text-warning-300 font-medium">
              Selecione um bem na aba <strong>Bens</strong> para realizar esta operação.
            </p>
            <button onClick={() => setActiveTab('bens')}
              className="mt-3 px-4 py-2 bg-warning-600 dark:bg-warning-700 text-white rounded-lg text-sm hover:bg-warning-700 dark:hover:bg-warning-800">
              Ir para Bens
            </button>
          </div>
        ) : renderTab()}
      </div>
    </div>
  )
}
