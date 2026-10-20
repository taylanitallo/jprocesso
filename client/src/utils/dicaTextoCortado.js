// Texto cortado (CSS truncate / line-clamp / text-ellipsis) em qualquer tela:
// ao parar o mouse em cima aparece uma caixinha com o texto completo.
// Um único ouvinte no documento — vale para todas as telas, inclusive as futuras.
// Carregado uma vez em main.jsx.

const ATRASO_MS = 250
const LARGURA_MAX = 420

let caixa = null
let alvo = null
let timer = null

function criarCaixa() {
  const el = document.createElement('div')
  el.setAttribute('role', 'tooltip')
  Object.assign(el.style, {
    position: 'fixed', zIndex: '100000', pointerEvents: 'none', display: 'none',
    maxWidth: `${LARGURA_MAX}px`, padding: '6px 10px', borderRadius: '8px',
    background: 'var(--color-ink-900, #0f172a)', color: 'var(--color-surface, #fff)',
    fontSize: '12px', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    boxShadow: '0 6px 20px rgba(0,0,0,.25)',
  })
  document.body.appendChild(el)
  return el
}

// O elemento (ou um pai próximo) corta o texto e o texto não cabe?
function elementoCortado(inicio) {
  let el = inicio
  for (let i = 0; el && el !== document.body && i < 4; i++, el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el.hasAttribute('title')) continue
    const cs = getComputedStyle(el)
    const corta = cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')
    if (!corta) continue
    const naoCabe = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
    return naoCabe ? el : null
  }
  return null
}

function esconder() {
  clearTimeout(timer)
  alvo = null
  if (caixa) caixa.style.display = 'none'
}

function mostrar(el, x, y) {
  const texto = (el.innerText || el.textContent || '').trim()
  if (!texto) return
  caixa = caixa || criarCaixa()
  caixa.textContent = texto
  caixa.style.display = 'block'
  const { width, height } = caixa.getBoundingClientRect()
  const left = Math.max(8, Math.min(x + 12, window.innerWidth - width - 8))
  const top = y + 18 + height > window.innerHeight - 8 ? Math.max(8, y - height - 10) : y + 18
  caixa.style.left = `${left}px`
  caixa.style.top = `${top}px`
}

if (typeof document !== 'undefined' && !window.__dicaTextoCortado) {
  window.__dicaTextoCortado = true

  document.addEventListener('mouseover', (e) => {
    const el = elementoCortado(e.target)
    if (el === alvo) return
    esconder()
    if (!el) return
    alvo = el
    const { clientX, clientY } = e
    timer = setTimeout(() => { if (alvo === el && el.isConnected) mostrar(el, clientX, clientY) }, ATRASO_MS)
  }, true)

  document.addEventListener('mouseout', (e) => {
    if (alvo && !alvo.contains(e.relatedTarget)) esconder()
  }, true)

  window.addEventListener('scroll', esconder, true)
  document.addEventListener('mousedown', esconder, true)
  document.addEventListener('keydown', esconder, true)
}
