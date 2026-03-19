export const fmt = (n) =>
  parseFloat(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

export const fmtMoney = (n) =>
  parseFloat(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const today = () => new Date().toISOString().split('T')[0]

/** Todos os status do fluxo digital + legado (para compatibilidade com registros antigos) */
export const STATUS_REQ = {
  // ── Novo fluxo digital ──────────────────────────────────────────────────
  RASCUNHO:              { label: 'Rascunho',             color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',    step: 0 },
  PENDENTE_AUTORIZACAO:  { label: 'Aguardando Autorização', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', step: 1 },
  AUTORIZADA:            { label: 'Autorizada',           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',  step: 2 },
  EM_SEPARACAO:          { label: 'Em Separação',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', step: 3 },
  ENTREGUE:              { label: 'Entregue',             color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', step: 4 },
  CANCELADA:             { label: 'Cancelada',            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',     step: -1 },
  // ── Legado ──────────────────────────────────────────────────────────────
  PENDENTE:              { label: 'Pendente (legado)',     color: 'bg-yellow-100 text-yellow-700', step: 1 },
  APROVADA:              { label: 'Aprovada (legado)',     color: 'bg-blue-100 text-blue-700',     step: 2 },
  PARCIAL:               { label: 'Parcial (legado)',      color: 'bg-orange-100 text-orange-700', step: 3 },
  ATENDIDA:              { label: 'Entregue (legado)',     color: 'bg-green-100 text-green-700',   step: 4 },
}

export const PRIORIDADE = {
  NORMAL:  { label: 'Normal',  color: 'bg-gray-100 text-gray-600' },
  URGENTE: { label: 'Urgente', color: 'bg-orange-100 text-orange-700' },
  CRITICA: { label: 'Crítica', color: 'bg-red-100 text-red-700' },
}

export const UNIDADES_ITEM = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PC', 'RL', 'M', 'M²', 'M³', 'PAR', 'DZ', 'RS']

export const TIPO_ITEM = {
  CONSUMO:  { label: 'Consumo',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  CAPITAL:  { label: 'Capital',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
}

export const STATUS_INVENTARIO = {
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  CONCLUIDO:    { label: 'Concluído',    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  CANCELADO:    { label: 'Cancelado',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}
