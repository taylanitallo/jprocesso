import { getMargens } from './margensStore'

// Dois timbrados:
//  - município  (superadmin / Configurações › Gerais) — usado nos DIDs e quando a
//    secretaria não tem timbrado próprio;
//  - secretaria (Configurações › Layout, pelo gestor) — usado em todos os demais PDFs
//    e impressões gerados pelos usuários da secretaria.
// Cada um guarda a imagem e uma versão com a opacidade já aplicada (canvas), para o PDF.

function clampOpacity(v) {
  const n = Number(v)
  if (isNaN(n)) return 0.75
  return Math.min(1, Math.max(0, n))
}

const novaFonte = () => ({ img: null, faded: null, opacity: 0.75 })
const fontes = { municipio: novaFonte(), secretaria: novaFonte() }

function definir(fonte, val, opacityPct) {
  const f = fontes[fonte]
  f.img = val || null
  if (opacityPct !== undefined && opacityPct !== null) f.opacity = clampOpacity(Number(opacityPct) / 100)
  f.faded = null
  if (!f.img) return
  // Aplica a opacidade no próprio pixel data — nenhum GState necessário no PDF
  try {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalAlpha = f.opacity
        ctx.drawImage(img, 0, 0)
        if (f.img === val) f.faded = canvas.toDataURL('image/jpeg', 0.88)
      } catch { /* fallback silencioso */ }
    }
    img.src = f.img
  } catch { /* fallback silencioso */ }
}

/** Timbrado do município (superadmin / Configurações › Gerais) */
export function setTimbrado(val, opacityPct) { definir('municipio', val, opacityPct) }
/** Timbrado da secretaria do usuário (Configurações › Layout) */
export function setTimbradoSecretaria(val, opacityPct) { definir('secretaria', val, opacityPct) }

// Permite atualizar apenas a opacidade do município (reprocessa o canvas)
export function setTimbradoOpacity(opacityPct) { definir('municipio', fontes.municipio.img, opacityPct) }

/** Fonte que vale nos documentos comuns: a da secretaria, senão a do município */
const fonteGeral = () => (fontes.secretaria.img ? fontes.secretaria : fontes.municipio)

export function getTimbrado() { return fonteGeral().img }

function desenhar(doc, f) {
  const src = f.faded || f.img
  if (!src) return
  // Detecta o formato real do data URL para não passar 'JPEG' num PNG (alias corromperia)
  const fmt = src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
  // Sem alias fixo: jsPDF deduplica por hash do conteúdo — sem risco de entrada corrompida
  try {
    doc.addImage(src, fmt, 0, 0, 210, 297, undefined, 'FAST')
  } catch {
    try { doc.addImage(src, fmt, 0, 0, 210, 297) } catch { /* ignora */ }
  }
}

/** Relatórios, ordens, despachos, ofícios, exportações: timbrado da secretaria (ou do município) */
export function applyTimbradoToPage(doc) { desenhar(doc, fonteGeral()) }

/** DIDs (contas fixas e variáveis): sempre o timbrado do município (superadmin) */
export function applyTimbradoMunicipio(doc) { desenhar(doc, fontes.municipio) }

/** Só o fundo (body::before) para impressões HTML que montam o próprio @page */
export function timbradoFundoCSS() {
  const f = fonteGeral()
  if (!f.img) return ''
  return `body::before{content:'';position:fixed;top:0;left:0;width:210mm;height:297mm;background-image:url("${f.img}");background-size:210mm 297mm;background-repeat:no-repeat;background-position:top left;opacity:${f.opacity};z-index:-1;pointer-events:none;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}`
}

// Retorna bloco CSS completo para prints HTML (timbrado da secretaria, senão do município)
export function timbradoPrintCSS() {
  const { top, bottom, left, right } = getMargens()
  const f = fonteGeral()
  // @page define tamanho A4 sem margem própria; padding no body cria as margens
  const page = `@page{size:A4 portrait;margin:0}body{padding:${top}mm ${right}mm ${bottom}mm ${left}mm;margin:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}`
  if (!f.img) return page
  // Usa dimensões absolutas A4 (210×297mm) para evitar corte em browsers mobile
  return `${page}
    body::before{content:'';display:block;position:fixed;top:0;left:0;
      width:210mm;height:297mm;min-width:210mm;min-height:297mm;
      background-image:url("${f.img}");
      background-size:210mm 297mm;background-repeat:no-repeat;background-position:top left;
      opacity:${f.opacity};z-index:-1;pointer-events:none;
      -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}`
}
