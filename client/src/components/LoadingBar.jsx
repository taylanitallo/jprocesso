import { useState, useEffect } from 'react'
import { progressBus } from '../services/progressBus'

// Barra de progresso inline — substitui spinners locais
// Uso: {isLoading && <LoadingBar />}
export default function LoadingBar({ label = 'Carregando...' }) {
  const [state, setState] = useState({ progress: 0, visible: false })

  useEffect(() => progressBus.subscribe(setState), [])

  const pct = Math.round(state.progress)

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 w-full">
      <div className="w-full max-w-xs">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-ink-500">{label}</span>
          <span className="text-xs font-semibold tabular-nums text-info-500">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              transition: pct === 0 ? 'none' : 'width 0.2s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  )
}
