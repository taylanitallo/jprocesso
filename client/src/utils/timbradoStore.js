import { getMargens } from './margensStore'

let _timbrado = null
let _timbradoFaded = null  // versão pré-processada com a opacidade configurada via canvas
let _opacity = 0.75        // 0..1 — opacidade da marca d'água (padrão 75%)

function clampOpacity(v) {
  const n = Number(v)
  if (isNaN(n)) return 0.75
  return Math.min(1, Math.max(0, n))
}

export function setTimbrado(val, opacityPct) {
  _timbrado = val || null
  if (opacityPct !== undefined && opacityPct !== null) {
    _opacity = clampOpacity(Number(opacityPct) / 100)
  }
  _timbradoFaded = null
  if (!_timbrado) return

  // Bake a opacidade configurada no próprio pixel data — nenhum GState necessário no PDF
  try {
    const img = new Image()
    img.onload = () => {
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.globalAlpha = _opacity
        ctx.drawImage(img, 0, 0)
        _timbradoFaded = canvas.toDataURL('image/jpeg', 0.88)
      } catch { /* fallback silencioso */ }
    }
    img.src = _timbrado
  } catch { /* fallback silencioso */ }
}

// Permite atualizar apenas a opacidade (reprocessa o canvas se já houver timbrado)
export function setTimbradoOpacity(opacityPct) {
  setTimbrado(_timbrado, opacityPct)
}

export function getTimbrado() {
  return _timbrado
}

export function applyTimbradoToPage(doc) {
  const src = _timbradoFaded || _timbrado
  if (!src) return
  // Detecta o formato real do data URL para não passar 'JPEG' num PNG (alias corromperia)
  const fmt = src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
  // Sem alias fixo: jsPDF deduplica por hash do conteúdo — sem risco de entrada corrompida
  try {
    doc.addImage(src, fmt, 0, 0, 210, 297, undefined, 'FAST')
  } catch {
    try { doc.addImage(src, fmt, 0, 0, 210, 297) } catch {}
  }
}

// Retorna bloco CSS completo para prints HTML
export function timbradoPrintCSS() {
  const { top, bottom, left, right } = getMargens()
  // @page define tamanho A4 sem margem própria; padding no body cria as margens
  const page = `@page{size:A4 portrait;margin:0}body{padding:${top}mm ${right}mm ${bottom}mm ${left}mm;margin:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}`
  if (!_timbrado) return page
  // Usa dimensões absolutas A4 (210×297mm) para evitar corte em browsers mobile
  return `${page}
    body::before{content:'';display:block;position:fixed;top:0;left:0;
      width:210mm;height:297mm;min-width:210mm;min-height:297mm;
      background-image:url("${_timbrado}");
      background-size:210mm 297mm;background-repeat:no-repeat;background-position:top left;
      opacity:${_opacity};z-index:-1;pointer-events:none;
      -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}`
}
