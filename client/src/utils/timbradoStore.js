import { getMargens } from './margensStore'

let _timbrado = null

export function setTimbrado(val) {
  _timbrado = val || null
}

export function getTimbrado() {
  return _timbrado
}

export function applyTimbradoToPage(doc) {
  if (!_timbrado) return
  try {
    const gs = doc.GState({ opacity: 0.75, 'stroke-opacity': 0.75 })
    doc.setGState(gs)
    doc.addImage(_timbrado, 'PNG', 0, 0, 210, 297)
    doc.setGState(doc.GState({ opacity: 1, 'stroke-opacity': 1 }))
  } catch {
    try { doc.addImage(_timbrado, 'PNG', 0, 0, 210, 297) } catch {}
  }
}

// Retorna bloco CSS completo para prints HTML:
// @page com margin:0 (remove cabeçalho/rodapé do browser),
// body com padding configurado, timbrado cobrindo 100% da folha.
export function timbradoPrintCSS() {
  const { top, bottom, left, right } = getMargens()
  const page = `body{padding:${top}mm ${right}mm ${bottom}mm ${left}mm;margin:0}`
  if (!_timbrado) return page
  return `${page}
    body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;
      background-image:url("${_timbrado}");background-size:100% 100%;
      background-repeat:no-repeat;opacity:0.75;z-index:-1;
      -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}`
}
