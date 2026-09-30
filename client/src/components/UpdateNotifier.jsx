import { useEffect, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

// ── Aviso de nova versão ──────────────────────────────────────────────────────
// Detecta quando um novo deploy do frontend está disponível (o Vite troca o hash
// do script de entrada a cada build). Em vez de recarregar sozinho — o que faria
// o usuário perder o que está fazendo — mostra um banner não-bloqueante pedindo
// que ele salve e atualize quando quiser.
const CHECK_EVERY_MS = 3 * 60 * 1000  // verifica a cada 3 min e ao focar a aba

function extrairEntry(html) {
  const m =
    html.match(/<script[^>]+type="module"[^>]+src="([^"]+\/assets\/[^"]+\.js)"/i) ||
    html.match(/src="([^"]+\/assets\/[^"]+\.js)"/i)
  return m ? m[1] : null
}

export default function UpdateNotifier() {
  const [updateReady, setUpdateReady] = useState(false)
  const currentEntryRef = useRef(null)

  useEffect(() => {
    // Script de entrada atualmente em execução nesta página
    const el = document.querySelector('script[type="module"][src*="/assets/"]')
    currentEntryRef.current = el?.getAttribute('src') || null

    let stopped = false

    const check = async () => {
      if (stopped || updateReady) return
      try {
        const res = await fetch('/index.html', { cache: 'no-store' })
        if (!res.ok) return
        const html = await res.text()
        const latest = extrairEntry(html)
        if (latest && currentEntryRef.current && latest !== currentEntryRef.current) {
          setUpdateReady(true)
        }
      } catch { /* rede offline — ignora, tenta de novo depois */ }
    }

    const interval = setInterval(check, CHECK_EVERY_MS)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)

    // Falha ao carregar um chunk lazy = os assets mudaram no servidor (deploy novo)
    const onChunkError = (ev) => {
      const msg = String(ev?.reason?.message || ev?.message || '')
      if (/dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch/i.test(msg)) {
        setUpdateReady(true)
      }
    }
    window.addEventListener('error', onChunkError)
    window.addEventListener('unhandledrejection', onChunkError)

    return () => {
      stopped = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('error', onChunkError)
      window.removeEventListener('unhandledrejection', onChunkError)
    }
  }, [updateReady])

  if (!updateReady) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[10001] flex justify-center px-4 pt-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-brand-600 text-white rounded-xl shadow-2xl px-4 py-3 max-w-2xl w-full">
        <RefreshCw className="w-5 h-5 shrink-0" />
        <div className="flex-1 text-sm">
          <strong className="font-semibold">Nova versão disponível.</strong>{' '}
          Salve o que estiver fazendo e clique em Atualizar para carregar a versão mais recente.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-surface text-brand-700 text-sm font-semibold hover:bg-info-50 transition-colors"
        >
          Atualizar agora
        </button>
        <button
          onClick={() => setUpdateReady(false)}
          title="Agora não"
          className="shrink-0 p-1 rounded-lg hover:bg-surface/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
