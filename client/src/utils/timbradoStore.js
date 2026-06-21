import { getMargens } from './margensStore'

let _timbrado = null
let _timbradoFaded = null  // versão pré-processada a 75% de opacidade via canvas

export function setTimbrado(val) {
  _timbrado = val || null
  _timbradoFaded = null
  if (!_timbrado) return

  // Bake 75% opacity no próprio pixel data — nenhum GState necessário no PDF
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
        ctx.globalAlpha = 0.75
        ctx.drawImage(img, 0, 0)
        _timbradoFaded = canvas.toDataURL('image/jpeg', 0.88)
      } catch { /* fallback silencioso */ }
    }
    img.src = _timbrado
  } catch { /* fallback silencioso */ }
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
      opacity:0.75;z-index:-1;pointer-events:none;
      -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}`
}
