export const fmt = (n) =>
  parseFloat(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

export const fmtMoney = (n) =>
  parseFloat(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const today = () => new Date().toISOString().split('T')[0]

/** Todos os status do fluxo digital + legado (para compatibilidade com registros antigos) */
export const STATUS_REQ = {
  // ── Novo fluxo digital ──────────────────────────────────────────────────
  RASCUNHO:              { label: 'Rascunho',             color: 'bg-ink-100 text-ink-600',    step: 0 },
  PENDENTE_AUTORIZACAO:  { label: 'Aguardando Autorização', color: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300', step: 1 },
  AUTORIZADA:            { label: 'Autorizada',           color: 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-300',  step: 2 },
  EM_SEPARACAO:          { label: 'Em Separação',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', step: 3 },
  AGUARDANDO_RETIRADA:   { label: 'Aguardando Retirada',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', step: 4 },
  ENTREGUE:              { label: 'Entregue',             color: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300', step: 5 },
  CANCELADA:             { label: 'Cancelada',            color: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',     step: -1 },
  // ── Legado ──────────────────────────────────────────────────────────────
  PENDENTE:              { label: 'Pendente (legado)',     color: 'bg-warning-100 text-warning-700', step: 1 },
  APROVADA:              { label: 'Aprovada (legado)',     color: 'bg-info-100 text-brand-700',     step: 2 },
  PARCIAL:               { label: 'Parcial (legado)',      color: 'bg-orange-100 text-orange-700', step: 3 },
  ATENDIDA:              { label: 'Entregue (legado)',     color: 'bg-success-100 text-success-700',   step: 4 },
}

export const PRIORIDADE = {
  NORMAL:  { label: 'Normal',  color: 'bg-ink-100 text-ink-600' },
  URGENTE: { label: 'Urgente', color: 'bg-orange-100 text-orange-700' },
  CRITICA: { label: 'Crítica', color: 'bg-danger-100 text-danger-700' },
}

export const UNIDADES_ITEM = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PC', 'RL', 'M', 'M²', 'M³', 'PAR', 'DZ', 'RS']

export const TIPO_ITEM = {
  CONSUMO:  { label: 'Consumo',  color: 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-300' },
  CAPITAL:  { label: 'Capital',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
}

export const STATUS_INVENTARIO = {
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' },
  CONCLUIDO:    { label: 'Concluído',    color: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' },
  CANCELADO:    { label: 'Cancelado',    color: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300' },
}
