import { useState, useEffect } from 'react'
import { progressBus } from '../services/progressBus'

export default function GlobalProgressBar() {
  const [state, setState] = useState({ progress: 0, visible: false })

  useEffect(() => progressBus.subscribe(setState), [])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none"
      style={{ height: 3 }}
    >
      <div
        style={{
          height: '100%',
          width: `${state.progress}%`,
          opacity: state.visible ? 1 : 0,
          transition: state.progress === 0
            ? 'none'
            : state.progress === 100
              ? 'width 0.15s ease-out, opacity 0.3s ease 0.1s'
              : 'width 0.2s ease-out',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          boxShadow: '0 0 8px #3b82f6aa',
        }}
      />
    </div>
  )
}
