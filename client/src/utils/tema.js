/**
 * Temas do sistema por município.
 *
 * Um tema troca a paleta do produto inteiro redefinindo os tokens de cor do
 * index.css (brand-*, info-*, canvas, surface e os do menu lateral) para o
 * claro e para o escuro. O botão claro/escuro continua sendo de cada usuário:
 * o tema só decide as cores das duas versões.
 *
 * Os temas prontos e o "Personalizado" usam o mesmo gerador: a escala 50–950
 * sai da cor de destaque, e o tom -600 (botões, links) é escurecido até dar
 * contraste de 4,5:1 com branco — cor clara demais nunca deixa texto ilegível.
 */

export const TEMA_PADRAO = 'institucional'

// menu: 'claro' = menu branco com destaque na cor; 'colorido' = menu num tom
// escuro da cor, com texto branco
export const TEMAS = [
  { id: 'institucional', nome: 'Institucional', cor: '#2547eb', menu: 'claro' },
  { id: 'ceu',           nome: 'Céu',           cor: '#0067c0', menu: 'claro' },
  { id: 'noite',         nome: 'Noite',         cor: '#3b82f6', menu: 'colorido', menuCor: '#0f1e3d' },
  { id: 'esmeralda',     nome: 'Esmeralda',     cor: '#008c46', menu: 'colorido' },
  { id: 'floresta',      nome: 'Floresta',      cor: '#2f7d32', menu: 'claro' },
  { id: 'oceano',        nome: 'Oceano',        cor: '#0e7490', menu: 'claro' },
  { id: 'turquesa',      nome: 'Turquesa',      cor: '#0d9488', menu: 'colorido' },
  { id: 'aurora',        nome: 'Aurora',        cor: '#7c3aed', menu: 'colorido' },
  { id: 'orquidea',      nome: 'Orquídea',      cor: '#c026d3', menu: 'claro' },
  { id: 'carmim',        nome: 'Carmim',        cor: '#c8102e', menu: 'colorido' },
  { id: 'sol',           nome: 'Sol',           cor: '#ea580c', menu: 'claro' },
  { id: 'terra',         nome: 'Terra',         cor: '#a0522d', menu: 'colorido' },
  { id: 'grafite',       nome: 'Grafite',       cor: '#475569', menu: 'colorido' },
]

// ── cores ─────────────────────────────────────────────────────────────────────
const BRANCO = '#ffffff'
const PRETO = '#000000'
const hexValido = (h) => /^#[0-9a-f]{6}$/i.test(String(h || '').trim())
const paraRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const paraHex = (rgb) => '#' + rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
// mistura a com b: t=0 → a, t=1 → b
const misturar = (a, b, t) => { const x = paraRgb(a), y = paraRgb(b); return paraHex(x.map((v, i) => v + (y[i] - v) * t)) }
const luminancia = (h) => {
  const [r, g, b] = paraRgb(h).map(v => v / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

/** Escala 50–950 a partir da cor de destaque, com o -600 legível sob texto branco. */
export function gerarEscala(corBase) {
  let c = hexValido(corBase) ? corBase.toLowerCase() : '#2547eb'
  for (let i = 0; i < 20 && contraste(c, BRANCO) < 4.5; i++) c = misturar(c, PRETO, 0.06)
  return {
    50: misturar(c, BRANCO, 0.93), 100: misturar(c, BRANCO, 0.86), 200: misturar(c, BRANCO, 0.72),
    300: misturar(c, BRANCO, 0.55), 400: misturar(c, BRANCO, 0.35), 500: misturar(c, BRANCO, 0.15),
    600: c, 700: misturar(c, PRETO, 0.15), 800: misturar(c, PRETO, 0.3), 900: misturar(c, PRETO, 0.45),
    950: misturar(c, PRETO, 0.62),
  }
}

/** Tema efetivo do município: { id, nome, cor, menu, menuCor? }. Aceita o antigo cor_primaria. */
export function temaDaConfiguracao(conf = {}) {
  if (conf?.tema === 'personalizado' && hexValido(conf.tema_cor)) {
    return { id: 'personalizado', nome: 'Personalizado', cor: conf.tema_cor.toLowerCase(), menu: conf.tema_menu === 'colorido' ? 'colorido' : 'claro' }
  }
  const pronto = TEMAS.find(t => t.id === conf?.tema)
  if (pronto) return pronto
  // Legado: "Cor do Menu Lateral". As cores que o cadastro gravava sozinho valem o padrão.
  const antiga = String(conf?.cor_primaria || '').trim().toLowerCase()
  if (hexValido(antiga) && !['#1e3a5f', '#0066cc'].includes(antiga)) {
    return TEMAS.find(t => t.cor === antiga) || { id: 'personalizado', nome: 'Personalizado', cor: antiga, menu: 'colorido' }
  }
  return TEMAS[0]
}

const RGBA = (a) => `rgb(255 255 255 / ${a})`

/** Variáveis CSS do tema para o claro e o escuro. */
export function variaveisDoTema(tema) {
  const e = gerarEscala(tema.cor)
  const escala = (prefixo) => Object.fromEntries(Object.entries(e).map(([k, v]) => [`--color-${prefixo}-${k}`, v]))
  const colorido = tema.menu === 'colorido'
  const menuBase = tema.menuCor || misturar(e[600], PRETO, 0.35)

  const claro = {
    ...escala('brand'), ...escala('info'),
    '--color-canvas': misturar('#f6f8fb', e[600], 0.035),
    ...(colorido ? {
      '--color-sidebar': menuBase,
      '--color-sidebar-texto': RGBA(0.86), '--color-sidebar-fraco': RGBA(0.55),
      '--color-sidebar-hover': RGBA(0.1), '--color-sidebar-ativo': RGBA(0.2),
      '--color-sidebar-ativo-texto': BRANCO, '--color-sidebar-borda': 'transparent',
      '--color-sidebar-logo': BRANCO,
    } : {}),
  }
  const escuro = {
    ...escala('brand'), ...escala('info'),
    // "-50" é fundo suave: no escuro precisa ser um tom escuro do matiz
    '--color-brand-50': misturar('#0b1020', e[500], 0.16), '--color-info-50': misturar('#0b1020', e[500], 0.16),
    '--color-canvas': misturar('#050816', e[600], 0.05),
    '--color-surface': misturar('#0b1020', e[600], 0.05),
    '--color-sidebar': colorido ? misturar('#050816', menuBase, 0.55) : misturar('#0b1020', e[600], 0.05),
    ...(colorido ? {
      '--color-sidebar-texto': RGBA(0.86), '--color-sidebar-fraco': RGBA(0.5),
      '--color-sidebar-hover': RGBA(0.08), '--color-sidebar-ativo': RGBA(0.16),
      '--color-sidebar-ativo-texto': BRANCO, '--color-sidebar-borda': 'transparent',
      '--color-sidebar-logo': misturar('#0b1020', e[600], 0.05),
    } : {}),
  }
  return { claro, escuro }
}

const bloco = (seletor, vars) => `${seletor}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`

/** CSS completo do tema (usado na página e nas miniaturas do seletor). */
export function cssDoTema(tema, seletor = 'html[data-tema]') {
  const { claro, escuro } = variaveisDoTema(tema)
  return bloco(seletor, claro) + bloco(`${seletor}.dark`, escuro)
}

const ID_ESTILO = 'tema-municipio'
const chaveCache = (sub) => `tema:${sub}`

function injetar(css, id) {
  const html = document.documentElement
  let el = document.getElementById(ID_ESTILO)
  if (!css) {
    el?.remove()
    html.removeAttribute('data-tema')
    return
  }
  if (!el) { el = document.createElement('style'); el.id = ID_ESTILO; document.head.appendChild(el) }
  el.textContent = css
  html.setAttribute('data-tema', id)
}

/** Aplica o tema do município na página (e guarda para o próximo carregamento). */
export function aplicarTema(configuracoes, subdominio) {
  const tema = temaDaConfiguracao(configuracoes || {})
  const css = tema.id === TEMA_PADRAO ? '' : cssDoTema(tema)
  injetar(css, tema.id)
  try {
    if (subdominio) {
      if (css) localStorage.setItem(chaveCache(subdominio), JSON.stringify({ id: tema.id, css }))
      else localStorage.removeItem(chaveCache(subdominio))
    }
  } catch { /* sem localStorage: só não guarda */ }
}

/** Volta ao tema padrão (superadmin, telas sem município). */
export const limparTema = () => injetar('', '')

/** Antes do React montar: aplica o último tema conhecido do município da URL, sem "piscar". */
export function aplicarTemaGuardado(subdominio) {
  if (!subdominio) return
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveCache(subdominio)) || 'null')
    if (salvo?.css) injetar(salvo.css, salvo.id)
  } catch { /* ignora cache inválido */ }
}
