import { useEffect, useRef, useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api, { setAccessToken } from '../services/api'

// ── Timeout por INATIVIDADE ───────────────────────────────────────────────────
// O usuário só é deslogado após 30 min SEM nenhuma interação. Enquanto estiver
// mexendo no sistema (mouse, teclado, clique, scroll, toque) a sessão é mantida.
// A atividade é compartilhada entre abas via localStorage, então usar o sistema
// em qualquer aba mantém todas conectadas.
const IDLE_LIMIT_MS  = 30 * 60 * 1000   // 30 min de inatividade → logout
const WARN_BEFORE_MS = 60 * 1000        // avisa 60s antes de expirar
const CHECK_EVERY_MS = 5 * 1000         // frequência da checagem base
const ACTIVITY_KEY   = 'jp_last_activity'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click']

export default function SessionActivityGuard() {
  const { user, logout } = useAuth()
  const [showWarn, setShowWarn] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(WARN_BEFORE_MS / 1000))
  const lastActivityRef = useRef(Date.now())
  const loggingOutRef = useRef(false)

  // Registra eventos de atividade e o loop base de verificação (só quando logado)
  useEffect(() => {
    if (!user) return

    loggingOutRef.current = false
    lastActivityRef.current = Date.now()
    try { localStorage.setItem(ACTIVITY_KEY, String(lastActivityRef.current)) } catch { /* ignore */ }

    let lastWrite = 0
    const onActivity = () => {
      const now = Date.now()
      lastActivityRef.current = now
      // Grava no localStorage no máximo 1x a cada 2s (evita I/O em mousemove)
      if (now - lastWrite > 2000) {
        lastWrite = now
        try { localStorage.setItem(ACTIVITY_KEY, String(now)) } catch { /* ignore */ }
      }
    }

    // Atividade em outra aba mantém esta viva
    const onStorage = (ev) => {
      if (ev.key === ACTIVITY_KEY && ev.newValue) {
        const v = parseInt(ev.newValue, 10) || 0
        if (v > lastActivityRef.current) lastActivityRef.current = v
      }
    }

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    window.addEventListener('storage', onStorage)

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current
      if (idle >= IDLE_LIMIT_MS) {
        if (!loggingOutRef.current) {
          loggingOutRef.current = true
          setShowWarn(false)
          logout()
        }
      } else if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        setShowWarn(true)
      } else {
        setShowWarn(prev => (prev ? false : prev))
      }
    }, CHECK_EVERY_MS)

    return () => {
      clearInterval(interval)
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      window.removeEventListener('storage', onStorage)
    }
  }, [user, logout])

  // Enquanto o aviso está visível, atualiza a contagem regressiva a cada 1s
  useEffect(() => {
    if (!showWarn) return
    const tick = () => {
      const idle = Date.now() - lastActivityRef.current
      setSecondsLeft(Math.max(0, Math.ceil((IDLE_LIMIT_MS - idle) / 1000)))
      if (idle >= IDLE_LIMIT_MS && !loggingOutRef.current) {
        loggingOutRef.current = true
        logout()
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [showWarn, logout])

  // "Continuar conectado": marca atividade e renova o token proativamente
  const continuar = useCallback(async () => {
    const now = Date.now()
    lastActivityRef.current = now
    try { localStorage.setItem(ACTIVITY_KEY, String(now)) } catch { /* ignore */ }
    setShowWarn(false)
    try {
      const { data } = await api.post('/auth/refresh')
      if (data?.token) setAccessToken(data.token)
    } catch { /* se falhar, a próxima requisição trata o 401 */ }
  }, [])

  if (!user || !showWarn) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-ink-900 dark:text-white">Sua sessão vai expirar</h2>
        <p className="text-sm text-ink-600 mt-2">
          Você está inativo há um tempo. Por segurança, sua sessão será encerrada em{' '}
          <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{secondsLeft}s</strong>.
        </p>
        <p className="text-xs text-ink-500 mt-1">
          Salve o que estiver fazendo ou continue conectado.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={logout}
            className="flex-1 px-4 py-2.5 rounded-xl border border-ink-300 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Sair agora
          </button>
          <button
            onClick={continuar}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-sm font-semibold text-white transition-colors"
          >
            Continuar conectado
          </button>
        </div>
      </div>
    </div>
  )
}
