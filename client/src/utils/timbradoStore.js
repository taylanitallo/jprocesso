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
    const gs = doc.GState({ opacity: 0.12, 'stroke-opacity': 0.12 })
    doc.setGState(gs)
    doc.addImage(_timbrado, 'PNG', 0, 0, 210, 297)
    doc.setGState(doc.GState({ opacity: 1, 'stroke-opacity': 1 }))
  } catch {
    try { doc.addImage(_timbrado, 'PNG', 0, 0, 210, 297) } catch {}
  }
}

export function timbradoPrintCSS() {
  if (!_timbrado) return ''
  return `
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image: url("${_timbrado}");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      opacity: 0.12;
      z-index: -1;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  `
}
