import { useRef, useLayoutEffect, useState } from 'react'

/**
 * AutoFitValue
 *
 * Renderiza um valor (número, moeda, texto) que reduz a própria fonte até caber
 * na largura do container, em uma única linha. Resolve o overflow de valores
 * grandes (ex.: "R$ 5.043.673") em cards estreitos, mantendo os pequenos no
 * tamanho máximo. Reage a redimensionamentos via ResizeObserver.
 *
 * Props:
 *   max       – tamanho de fonte máximo em px (padrão 30 ≈ text-3xl)
 *   min       – tamanho de fonte mínimo em px (padrão 15)
 *   className – classes aplicadas ao elemento (cor, peso, etc.)
 */
export default function AutoFitValue({ children, max = 30, min = 15, className = '', title }) {
  const ref = useRef(null)
  const [fontSize, setFontSize] = useState(max)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const ajustar = () => {
      const parent = el.parentElement
      if (!parent) return
      const disponivel = parent.clientWidth
      if (!disponivel) return

      let s = max
      el.style.fontSize = `${s}px`
      // Reduz 1px por vez enquanto o texto (em linha única) exceder o container
      while (el.scrollWidth > disponivel && s > min) {
        s -= 1
        el.style.fontSize = `${s}px`
      }
      setFontSize(s)
    }

    ajustar()

    const ro = new ResizeObserver(ajustar)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [children, max, min])

  return (
    <p
      ref={ref}
      title={title}
      style={{ fontSize }}
      className={`whitespace-nowrap tabular-nums ${className}`}
    >
      {children}
    </p>
  )
}
