import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Landmark, BarChart2, List, Plus, ArrowLeftRight,
  PackageX, ClipboardList, Settings
} from 'lucide-react'
import PatDashboard from '../almoxarifado/PatDashboard'
import PatBens from '../almoxarifado/PatBens'
import PatEntrada from '../almoxarifado/PatEntrada'
import PatTransferencia from '../almoxarifado/PatTransferencia'
import PatBaixa from '../almoxarifado/PatBaixa'
import PatInventario from '../almoxarifado/PatInventario'
import PatGrupos from '../almoxarifado/PatGrupos'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'painel',       label: 'Painel',        icon: BarChart2    },
  { id: 'bens',         label: 'Bens',           icon: List         },
  { id: 'tombamento',   label: 'Tombamento',     icon: Plus         },
  { id: 'transferencia',label: 'Transferência',  icon: ArrowLeftRight },
  { id: 'baixa',        label: 'Baixa',          icon: PackageX     },
  { id: 'inventario',   label: 'Inventário',     icon: ClipboardList },
  { id: 'grupos',       label: 'Grupos',         icon: Settings     },
]

export default function Patrimonio() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRole = user?.cargo || user?.role || 'usuario'

  const VALID_TABS = TABS.map(t => t.id)
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'painel'
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
        return <PatInventario userRole={userRole} />
      case 'grupos':
        return <PatGrupos />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex space-x-1 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { setBemSelecionado(null); setActiveTab(tab.id) }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
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
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
            <p className="text-yellow-700 dark:text-yellow-300 font-medium">
              Selecione um bem na aba <strong>Bens</strong> para realizar esta operação.
            </p>
            <button onClick={() => setActiveTab('bens')}
              className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700">
              Ir para Bens
            </button>
          </div>
        ) : renderTab()}
      </div>
    </div>
  )
}
