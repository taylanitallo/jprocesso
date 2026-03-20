import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Package, BarChart2, List, ArrowDownCircle, ArrowUpCircle, ClipboardList, Shield, ClipboardCheck, CalendarRange } from 'lucide-react'
import AlmoxPainel from '../almoxarifado/AlmoxPainel'
import AlmoxItens from '../almoxarifado/AlmoxItens'
import AlmoxLotes from '../almoxarifado/AlmoxLotes'
import { AlmoxSaidas } from '../almoxarifado/AlmoxMovimentacoes'
import AlmoxRequisicoes from '../almoxarifado/AlmoxRequisicoes'
import AlmoxAuditLog from '../almoxarifado/AlmoxAuditLog'
import AlmoxInventario from '../almoxarifado/AlmoxInventario'
import AlmoxCotas from '../almoxarifado/AlmoxCotas'

const TABS = [
  { id: 'painel',      label: 'Painel',        icon: BarChart2       },
  { id: 'itens',       label: 'Itens',          icon: List            },
  { id: 'lotes',       label: 'Entradas',       icon: ArrowDownCircle },
  { id: 'saidas',      label: 'Saidas',         icon: ArrowUpCircle   },
  { id: 'requisicoes', label: 'Requisicoes',    icon: ClipboardList   },
  { id: 'cotas',       label: 'Cotas',          icon: CalendarRange   },
  { id: 'inventario',  label: 'Inventario',     icon: ClipboardCheck  },
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2.5 rounded-xl">
          <Package className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="page-title">📦 Almoxarifado</h1>
          <p className="page-subtitle">Controle de estoque e materiais</p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
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

      <div>{renderTab()}</div>
    </div>
  )
}
