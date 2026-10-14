// Escala padrão da interface no computador (index.css: html { zoom: 0.8 }).
// Coordenadas de tela (getBoundingClientRect, clientX) vêm já em escala; um
// elemento posicionado com elas (position: fixed) precisa dividir pela escala.
export const escalaTela = () => {
  const z = parseFloat(getComputedStyle(document.documentElement).zoom)
  return z > 0 ? z : 1
}

/** Retângulo do elemento em px de CSS da página (já descontada a escala) */
export const retanguloEmCss = (el) => {
  const r = el.getBoundingClientRect()
  const z = escalaTela()
  return { top: r.top / z, bottom: r.bottom / z, left: r.left / z, right: r.right / z, width: r.width / z, height: r.height / z }
}
