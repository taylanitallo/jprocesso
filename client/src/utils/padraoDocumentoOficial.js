// Padrão visual dos documentos oficiais (todo PDF gerado pelo sistema: ordens de
// compra/serviço, despachos, ofícios, relatórios, DIDs, exportações).
// Carregado uma vez em main.jsx; vale para todo `new jsPDF()`:
//  - fonte Calibri (Carlito embutida) no lugar de Helvetica/Arial/Times;
//  - texto e linhas sempre pretos;
//  - fundos coloridos viram cinza claro (o branco continua branco);
//  - molduras (retângulos com contorno) com cantos arredondados;
//  - tabelas com cabeçalho: grade preta, cabeçalho cinza claro, moldura com cantos
//    arredondados, alinhamento do cabeçalho igual ao da coluna e coluna nunca mais
//    estreita que a maior palavra do cabeçalho (nada de "Nº I te m").
// Tabelas sem cabeçalho (usadas só para alinhar texto) mantêm o desenho delas.
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'
import * as Calibri from './fonteCalibri.js'

export const ESPESSURA_LINHA = 0.2 // mm
export const RAIO = 1.3            // mm — cantos arredondados
export const CINZA_CABECALHO = 228 // cinza claro do cabeçalho das tabelas
export const FONTE = 'calibri'     // Calibri (fonte padrão dos documentos)
const FONTES_TROCADAS = /^(helvetica|arial|sans-serif|times|times new roman|serif)$/i

// Registra a Calibri (Carlito) em todo documento novo
jsPDF.API.events.push(['addFonts', function registrarCalibri() {
  for (const [estilo, arquivo] of [['normal', 'Regular'], ['bold', 'Bold'], ['italic', 'Italic'], ['bolditalic', 'BoldItalic']]) {
    this.addFileToVFS(`Calibri-${arquivo}.ttf`, Calibri[arquivo])
    this.addFont(`Calibri-${arquivo}.ttf`, FONTE, estilo)
  }
}])

// ── Cores ────────────────────────────────────────────────────────────────────
function luminancia(args) {
  let [a, b, c] = args
  if (Array.isArray(a)) [a, b, c] = a
  if (typeof a === 'string') {
    const h = a.trim().replace('#', '')
    if (/^[0-9a-f]{6}$/i.test(h)) return luminancia([parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)])
    if (/^[0-9a-f]{3}$/i.test(h)) return luminancia([...h].map(x => parseInt(x + x, 16)))
    return null
  }
  if (typeof a !== 'number') return null
  if (b === undefined) return a // tom de cinza (0–255)
  return 0.299 * a + 0.587 * (b ?? 0) + 0.114 * (c ?? 0)
}

// Fundo: branco continua branco; cinzas claros ficam como estão (ex.: linhas zebradas);
// qualquer outra cor vira cinza claro (mais escura → cinza um pouco mais forte)
function fundoCinza(args) {
  const l = luminancia(args)
  if (l === null) return args
  if (l >= 250) return [255]
  if (l >= 235) return [Math.round(l)]
  return [Math.round(212 + (l / 235) * 18)]
}

// ── Documento ────────────────────────────────────────────────────────────────
jsPDF.API.events.push(['initialized', function aplicarPadrao() {
  const doc = this
  if (doc.__padraoOficial) return
  doc.__padraoOficial = true

  const setTextColor = doc.setTextColor
  const setDrawColor = doc.setDrawColor
  const setFillColor = doc.setFillColor
  const rect = doc.rect
  const setFont = doc.setFont

  // Helvetica/Arial/Times (padrão do jsPDF e do autotable) → Calibri
  doc.setFont = function (nome, ...resto) { return setFont.call(doc, FONTES_TROCADAS.test(String(nome || '')) ? FONTE : nome, ...resto) }
  doc.setTextColor = function () { return setTextColor.call(doc, 0) }
  doc.setDrawColor = function () { return setDrawColor.call(doc, 0) }
  doc.setFillColor = function (...args) { return setFillColor.apply(doc, fundoCinza(args)) }

  // Moldura (retângulo com contorno) → cantos arredondados. Fundos (só 'F') e as
  // células das tabelas continuam retos.
  doc.rect = function (x, y, w, h, estilo) {
    const comContorno = estilo === undefined || estilo === null || /[SD]/i.test(String(estilo))
    if (!doc.__desenhandoTabela && comContorno && w > 4 && h > 4) {
      const r = Math.min(RAIO, w / 4, h / 4)
      return doc.roundedRect(x, y, w, h, r, r, estilo || 'S')
    }
    return rect.call(doc, x, y, w, h, estilo)
  }

  setTextColor.call(doc, 0)
  setDrawColor.call(doc, 0)
  setFont.call(doc, FONTE, 'normal')
}])

// ── Tabelas (jspdf-autotable) ────────────────────────────────────────────────
applyPlugin(jsPDF)

const temCabecalho = (table) => (table.head?.length || 0) > 0 && table.settings?.showHead !== 'never'

jsPDF.autoTableSetDefaults({
  styles: { textColor: 0, lineColor: 0, overflow: 'linebreak' },
  headStyles: { textColor: 0, fontStyle: 'bold' },
  footStyles: { textColor: 0, fontStyle: 'bold' },

  // Cabeçalho: mesmo alinhamento da coluna e largura mínima = maior palavra
  didParseCell: (d) => {
    if (d.section !== 'head') return
    const colEstilo = d.table.styles?.columnStyles?.[d.column.dataKey] || d.table.styles?.columnStyles?.[d.column.index]
    // ...a menos que o documento tenha definido o alinhamento do cabeçalho (headStyles.halign)
    if (colEstilo?.halign && !d.cell.raw?.styles?.halign && !d.table.styles?.headStyles?.halign) d.cell.styles.halign = colEstilo.halign
    const texto = Array.isArray(d.cell.text) ? d.cell.text.join(' ') : String(d.cell.text || '')
    const maiorPalavra = texto.split(/\s+/).filter(Boolean)
      .reduce((m, p) => Math.max(m, d.doc.getStringUnitWidth(p) * (d.cell.styles.fontSize || 10) / d.doc.internal.scaleFactor), 0)
    const pad = d.cell.padding ? d.cell.padding('horizontal') : 4
    const minimo = maiorPalavra + pad + 0.5
    d.cell.styles.minCellWidth = Math.max(d.cell.styles.minCellWidth || 0, minimo)
    // Largura fixa menor que a palavra (ex.: 8 mm para "Item") quebrava letra por letra
    // (a largura da coluna vem do columnStyles; a do cabeçalho maior prevalece)
    const fixo = typeof d.cell.styles.cellWidth === 'number' ? d.cell.styles.cellWidth : colEstilo?.cellWidth
    if (typeof fixo === 'number' && fixo < minimo) d.cell.styles.cellWidth = minimo
  },

  willDrawPage: (d) => { d.doc.__desenhandoTabela = true },

  // Tabelas com cabeçalho: a grade é desenhada aqui (linhas internas) + moldura arredondada
  willDrawCell: (d) => {
    if (!temCabecalho(d.table)) return
    d.cell.styles.lineWidth = 0
    // Cabeçalho sem cor definida (tema "plain") também fica cinza claro
    if (d.section === 'head' && (d.cell.styles.fillColor == null || d.cell.styles.fillColor === false)) {
      d.cell.styles.fillColor = CINZA_CABECALHO
    }
  },
  didDrawCell: (d) => {
    if (!temCabecalho(d.table)) return
    const doc = d.doc
    const { x, y, width, height } = d.cell
    const pg = doc.internal.getCurrentPageInfo().pageNumber
    const m = (doc.__molduraTabela && doc.__molduraTabela.pg === pg) ? doc.__molduraTabela : (doc.__molduraTabela = { pg, x1: x, y1: y, x2: x + width, y2: y + height })
    m.x1 = Math.min(m.x1, x); m.y1 = Math.min(m.y1, y)
    m.x2 = Math.max(m.x2, x + width); m.y2 = Math.max(m.y2, y + height)
    doc.setLineWidth(ESPESSURA_LINHA)
    doc.setDrawColor(0)
    if (d.column.index > 0) doc.line(x, y, x, y + height)          // divisória à esquerda
    if (y > m.y1 + 0.01) doc.line(x, y, x + width, y)               // divisória acima
  },

  didDrawPage: (d) => {
    const doc = d.doc
    doc.__desenhandoTabela = false
    const m = doc.__molduraTabela
    if (m && temCabecalho(d.table)) {
      doc.setLineWidth(ESPESSURA_LINHA)
      doc.setDrawColor(0)
      doc.roundedRect(m.x1, m.y1, m.x2 - m.x1, m.y2 - m.y1, RAIO, RAIO, 'S')
    }
    doc.__molduraTabela = null
  },
})
