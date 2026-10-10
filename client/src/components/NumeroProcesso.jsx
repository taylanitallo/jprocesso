// Número do processo com menu de contexto (botão direito → "Copiar número do processo").
// Uso: <NumeroProcesso numero={processo.numero} className="..." />
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Check, Link2 } from 'lucide-react'

const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Fallback (navegadores/contextos sem Clipboard API)
    const ta = document.createElement('textarea')
    ta.value = texto
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

export default function NumeroProcesso({ numero, linkConsulta, className = '' }) {
  const [menu, setMenu] = useState(null)       // { x, y }
  const [copiado, setCopiado] = useState(null) // 'numero' | 'link'
  const ref = useRef(null)

  useEffect(() => {
    if (!menu) return
    const fechar = (e) => { if (!ref.current?.contains(e.target)) setMenu(null) }
    const tecla = (e) => { if (e.key === 'Escape') setMenu(null) }
    const rolar = () => setMenu(null)
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', rolar, true)
    window.addEventListener('resize', rolar)
    return () => {
      document.removeEventListener('mousedown', fechar)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', rolar, true)
      window.removeEventListener('resize', rolar)
    }
  }, [menu])

  if (!numero) return null

  const abrir = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // mantém o menu dentro da tela
    const x = Math.min(e.clientX, window.innerWidth - 250)
    const y = Math.min(e.clientY, window.innerHeight - 110)
    setMenu({ x, y })
    setCopiado(null)
  }

  const copiar = async (tipo, texto) => {
    if (await copiarTexto(texto)) {
      setCopiado(tipo)
      setTimeout(() => setMenu(null), 700)
    }
  }

  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-ink-700 hover:bg-ink-100 rounded-lg transition-colors'

  return (
    <>
      <span onContextMenu={abrir} title="Clique com o botão direito para copiar" className={className}>
        {numero}
      </span>
      {menu && createPortal(
        <div
          ref={ref}
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-[9999] min-w-[230px] p-1.5 rounded-xl border border-ink-200 bg-surface shadow-xl animate-fade-in"
          onContextMenu={(e) => e.preventDefault()}
        >
          <button role="menuitem" className={item} onClick={() => copiar('numero', numero)}>
            {copiado === 'numero' ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4 text-ink-500" />}
            {copiado === 'numero' ? 'Número copiado!' : 'Copiar número do processo'}
          </button>
          {linkConsulta && (
            <button role="menuitem" className={item} onClick={() => copiar('link', linkConsulta)}>
              {copiado === 'link' ? <Check className="w-4 h-4 text-success-600" /> : <Link2 className="w-4 h-4 text-ink-500" />}
              {copiado === 'link' ? 'Link copiado!' : 'Copiar link de consulta pública'}
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
