import { ClipboardList } from 'lucide-react'

function TabOrdens() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ordem de Compra / Serviço</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Módulo em desenvolvimento. Em breve disponível.</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  RELATÓRIOS
// ══════════════════════════════════════════════════════════════════════════════

export default TabOrdens
