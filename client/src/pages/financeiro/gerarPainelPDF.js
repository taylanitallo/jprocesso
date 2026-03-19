import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Constantes de layout ─────────────────────────────────────────────────────
const M  = 12          // margem esquerda/direita
const UW = 186         // largura util: 210 - 2*12

// ─── Helpers de formatação ────────────────────────────────────────────────────
const safe = v => {
  if (v === null || v === undefined) return '-'
  // Remove caracteres fora do Latin-1 (emojis, tracos especiais, etc.)
  return String(v)
    .replace(/[^\x00-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || '-'
}
const fmt = v => safe(v)
const fmtData = v => {
  if (!v) return '-'
  const s = String(v).split('T')[0]
  const [a, m, d] = s.split('-')
  return (d && m && a) ? `${d}/${m}/${a}` : safe(v)
}
const fmtMoeda = v => {
  const n = parseFloat(v)
  if (isNaN(n)) return 'R$ 0,00'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
const fmtTipo = v => v === 'variaveis' ? 'Variaveis' : 'Fixas'

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  // Fundos estruturais
  headerBg:  [10, 18, 42],
  secBg:     [28, 48, 108],
  cardBg:    [245, 247, 252],
  altRow:    [248, 249, 253],
  // Acentos
  blue:      [41,  82, 196],
  teal:      [14, 145, 133],
  green:     [22, 127,  59],
  amber:     [175, 82,   8],
  purple:    [111, 43, 216],
  red:       [185, 28,  28],
  // Texto
  ink:       [18,  24,  42],
  sub:       [80,  90, 110],
  muted:     [140, 150, 168],
  // Linhas
  rule:      [215, 220, 232],
  ruleMid:   [190, 198, 215],
  // Contraste
  white:     [255, 255, 255],
}

// ─── Utilitários de fonte ─────────────────────────────────────────────────────
const bold = (doc, size, color) => {
  doc.setFontSize(size)
  doc.setFont('helvetica', 'bold')
  if (color) doc.setTextColor(...color)
}
const norm = (doc, size, color) => {
  doc.setFontSize(size)
  doc.setFont('helvetica', 'normal')
  if (color) doc.setTextColor(...color)
}

// ─── Verificacao de quebra de pagina ─────────────────────────────────────────
const checkPage = (doc, y, pageH, needed = 25) => {
  if (y + needed > pageH - 14) {
    doc.addPage()
    return 16
  }
  return y
}

// ─── Cabecalho principal ──────────────────────────────────────────────────────
function drawHeader(doc, ano, orgNome, descFiltros, pageW, pageH) {
  const H = 36

  // Bloco principal escuro
  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, pageW, H, 'F')

  // Faixa esquerda colorida
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, 4, H, 'F')

  // Linha decorativa inferior
  doc.setFillColor(...C.teal)
  doc.rect(4, H - 1.5, pageW - 4, 1.5, 'F')

  // Titulo principal
  bold(doc, 15, C.white)
  doc.text('PAINEL FINANCEIRO', M + 3, 11)

  // Subtitulo
  norm(doc, 8.5, [170, 185, 220])
  doc.text('Resumo de Documentos de Instrucao de Despesas (DID)', M + 3, 18)

  // Linha de metadados
  norm(doc, 7, [130, 148, 185])
  const metaLeft = `Ano de referencia: ${ano}` + (orgNome ? '  |  ' + safe(orgNome) : '')
  doc.text(metaLeft, M + 3, 25)

  // Data/hora geracao (direita)
  const agora = new Date().toLocaleString('pt-BR')
  norm(doc, 6.5, [110, 128, 168])
  doc.text(`Gerado em: ${agora}`, pageW - M, 25, { align: 'right' })

  // Filtros ativos
  const filtrosTxt = descFiltros.length > 0
    ? safe('Filtros: ' + descFiltros.join('  |  '))
    : 'Filtros: Todos os registros do periodo'
  const filtroLines = doc.splitTextToSize(filtrosTxt, pageW - M * 2 - 6)
  norm(doc, 6, [100, 118, 162])
  doc.text(filtroLines[0], M + 3, 32)

  return H + 8
}

// ─── Rodape em todas as paginas ───────────────────────────────────────────────
function drawFooters(doc, ano, orgNome, pageH, pageW) {
  const total = doc.internal.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFillColor(...C.headerBg)
    doc.rect(0, pageH - 10, pageW, 10, 'F')
    doc.setFillColor(...C.blue)
    doc.rect(0, pageH - 10, 3, 10, 'F')
    norm(doc, 6.5, [140, 158, 200])
    doc.text(
      safe((orgNome || 'Modulo Financeiro') + '  -  Painel DIDs ' + ano),
      M + 2,
      pageH - 3.5
    )
    doc.text(`Pagina ${p} / ${total}`, pageW - M, pageH - 3.5, { align: 'right' })
  }
}

// ─── Cabecalho de secao ───────────────────────────────────────────────────────
function secHeader(doc, titulo, acent, y, pageH) {
  y = checkPage(doc, y, pageH, 16)
  doc.setFillColor(...C.secBg)
  doc.rect(M, y, UW, 8, 'F')
  doc.setFillColor(...(acent || C.teal))
  doc.rect(M, y, 3, 8, 'F')
  bold(doc, 7.5, C.white)
  doc.text(safe(titulo).toUpperCase(), M + 6, y + 5.5)
  return y + 12
}

// ─── Cards de metricas (fileira horizontal) ──────────────────────────────────
function drawMetricsRow(doc, cards, y, pageH) {
  y = checkPage(doc, y, pageH, 30)
  const gap   = 4
  const count = cards.length
  const cw    = (UW - gap * (count - 1)) / count
  const ch    = 22

  cards.forEach((card, i) => {
    const x   = M + i * (cw + gap)
    const acc = card.accent || C.blue

    // Fundo do card
    doc.setFillColor(246, 248, 254)
    doc.roundedRect(x, y, cw, ch, 2, 2, 'F')

    // Borda esquerda colorida
    doc.setFillColor(...acc)
    doc.rect(x, y, 3, ch, 'F')

    // Borda superior fina
    doc.setDrawColor(...acc)
    doc.setLineWidth(0.4)
    doc.line(x, y, x + cw, y)

    // Label
    norm(doc, 6, C.muted)
    doc.text(safe(card.label), x + 5, y + 8)

    // Valor principal
    bold(doc, card.bigFont ? 9 : 10, acc)
    const valStr = doc.splitTextToSize(safe(card.value), cw - 7)
    doc.text(valStr[0], x + 5, y + 17)

    // Sub-valor opcional
    if (card.sub) {
      norm(doc, 5.5, C.muted)
      doc.text(safe(card.sub), x + 5, y + 21)
    }
  })

  doc.setDrawColor(...C.rule)
  doc.setLineWidth(0.15)
  return y + ch + 7
}

// ─── Grafico de barras por mes ────────────────────────────────────────────────
function drawBarChart(doc, dados, y, pageH) {
  const labelW   = 12
  const valueW   = 38
  const barAreaW = UW - labelW - valueW - 7
  const barH     = 7
  const rowGap   = 3
  const bx       = M + labelW + 2

  y = checkPage(doc, y, pageH, dados.length * (barH + rowGap) + 22)
  y = secHeader(doc, 'VALOR BRUTO POR MES', C.blue, y, pageH)

  const maxVal = Math.max(...dados.map(d => d.v), 1)

  dados.forEach((d, i) => {
    const by   = y + i * (barH + rowGap)
    if (by + barH > pageH - 14) return
    const fillW = maxVal > 0 ? Math.max((d.v / maxVal) * barAreaW, 0) : 0

    // Rotulo do mes
    norm(doc, 6.5, C.sub)
    doc.text(safe(d.l), M + labelW, by + barH / 2 + 1.5, { align: 'right' })

    // Trilho (fundo cinza)
    doc.setFillColor(225, 228, 240)
    doc.roundedRect(bx, by, barAreaW, barH, 1, 1, 'F')

    // Barra colorida
    if (fillW > 0) {
      doc.setFillColor(...C.blue)
      doc.roundedRect(bx, by, fillW, barH, 1, 1, 'F')
    }

    // Valor numerico
    bold(doc, 6.5, d.v > 0 ? C.blue : C.muted)
    doc.text(fmtMoeda(d.v), bx + barAreaW + 3, by + barH / 2 + 1.5)
  })

  // Eixo vertical de referencia
  doc.setDrawColor(...C.ruleMid)
  doc.setLineWidth(0.3)
  const chartBottom = y + dados.length * (barH + rowGap)
  doc.line(bx, y - 2, bx, chartBottom)

  return chartBottom + 6
}

// ─── Distribuicao por secretaria — barras planas ─────────────────────────────
function drawSecretariaChart(doc, dados, totalGeral, y, pageH) {
  const labelW   = 68
  const valueW   = 50
  const barAreaW = UW - labelW - valueW - 4
  const barH     = 7
  const rowGap   = 5
  const bx       = M + labelW
  const cores    = [C.blue, C.purple, C.teal, [41,120,80], C.amber, [160,30,100], [30,100,180]]
  const total    = totalGeral || 1

  y = checkPage(doc, y, pageH, Math.min(dados.length, 5) * (barH + rowGap) + 22)
  y = secHeader(doc, 'DISTRIBUICAO POR SECRETARIA', C.purple, y, pageH)

  dados.forEach((c, i) => {
    y = checkPage(doc, y, pageH, barH + rowGap + 6)
    const fillW = Math.max((parseFloat(c.total) / total) * barAreaW, 0)
    const pct   = Math.round((parseFloat(c.total) / total) * 100)
    const cor   = cores[i % cores.length]

    // Nome da secretaria
    norm(doc, 7, C.ink)
    const secLines = doc.splitTextToSize(safe(c.secretaria), labelW - 2)
    doc.text(secLines[0], M, y + barH / 2 + 1.5)

    // Trilho
    doc.setFillColor(225, 228, 240)
    doc.roundedRect(bx, y, barAreaW, barH, 1, 1, 'F')

    // Barra
    if (fillW > 0) {
      doc.setFillColor(...cor)
      doc.roundedRect(bx, y, fillW, barH, 1, 1, 'F')
    }

    // Valor + qtd + percentual
    norm(doc, 6.5, C.sub)
    const qtdN = Number(c.qtd)
    const infoStr = safe(fmtMoeda(c.total) + '  (' + c.qtd + ' DID' + (qtdN !== 1 ? 's' : '') + ')  ' + pct + '%')
    doc.text(infoStr, bx + barAreaW + 3, y + barH / 2 + 1.5)

    y += barH + rowGap
  })
  return y + 4
}

// ─── Distribuicao visual em duas colunas (barras divididas) ─────────────────
function drawDistribuicao(doc, left, right, y, pageH) {
  const colW = (UW - 6) / 2
  const barH = 12
  y = checkPage(doc, y, pageH, 70)
  y = secHeader(doc, 'DISTRIBUICAO DOS DIDs', C.blue, y, pageH)

  const drawSplit = (ox, title, segA, segB) => {
    // titulo da coluna
    bold(doc, 7, C.ink)
    doc.text(safe(title), ox, y + 4)

    // barra dividida
    const bx = ox
    const bw = colW
    const by = y + 7
    const wA = Math.max(segA.pct / 100 * bw, segA.pct > 0 ? 2 : 0)
    const wB = bw - wA

    // face A
    doc.setFillColor(...segA.color)
    doc.roundedRect(bx, by, wA, barH, 1, 1, 'F')
    if (wA > 12) {
      bold(doc, 7, C.white)
      doc.text(segA.pct + '%', bx + wA / 2, by + barH / 2 + 1, { align: 'center' })
    }

    // face B
    if (wB > 0) {
      doc.setFillColor(...segB.color)
      doc.roundedRect(bx + wA, by, wB, barH, 1, 1, 'F')
      if (wB > 12) {
        bold(doc, 7, C.white)
        doc.text(segB.pct + '%', bx + wA + wB / 2, by + barH / 2 + 1, { align: 'center' })
      }
    }

    // legenda
    const ly = by + barH + 5
    doc.setFillColor(...segA.color)
    doc.rect(bx, ly, 4, 3.5, 'F')
    norm(doc, 6.5, C.sub)
    doc.text(safe(segA.label + ': ' + segA.qtd + ' (' + segA.pct + '%)  ' + segA.valor), bx + 5.5, ly + 2.8)

    doc.setFillColor(...segB.color)
    doc.rect(bx, ly + 5, 4, 3.5, 'F')
    doc.text(safe(segB.label + ': ' + segB.qtd + ' (' + segB.pct + '%)  ' + segB.valor), bx + 5.5, ly + 7.8)
  }

  drawSplit(M, left.title, left.segA, left.segB)
  drawSplit(M + colW + 6, right.title, right.segA, right.segB)

  return y + barH + 26
}

// ─── Tabela generica via autoTable ────────────────────────────────────────────
function drawTable(doc, { head, body, colStyles, headColor, altColor, y, pageH }) {
  y = checkPage(doc, y, pageH, 40)
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, top: 14, bottom: 14 },
    head: [head],
    body,
    theme: 'plain',
    headStyles: {
      fillColor: headColor || C.secBg,
      textColor: C.white,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: C.ink,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
      lineColor: C.rule,
      lineWidth: { bottom: 0.15 },
    },
    alternateRowStyles: {
      fillColor: altColor || C.altRow,
    },
    columnStyles: colStyles || {},
    tableLineWidth: 0,
  })
  return doc.lastAutoTable.finalY + 8
}

// ─── Funcao principal exportada ───────────────────────────────────────────────
export function gerarPainelPDF({ painel, filtros, ano, orgNome }) {
  if (!painel) return

  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // ── Descricao dos filtros ativos ─────────────────────────────────────────
  const descFiltros = []
  if (filtros.tipos?.length)
    descFiltros.push(`Tipo: ${filtros.tipos.map(fmtTipo).join(', ')}`)
  if (filtros.status?.length)
    descFiltros.push(`Status: ${filtros.status.map(s => s === 'pago' ? 'Pago' : 'Pendente').join(', ')}`)
  if (filtros.secretarias?.length)
    descFiltros.push(`Secretaria: ${filtros.secretarias.map(safe).join(', ')}`)
  if (filtros.credores?.length)
    descFiltros.push(`Credor: ${filtros.credores.map(safe).join(', ')}`)
  if (filtros.fontes?.length)
    descFiltros.push(`Fonte: ${filtros.fontes.map(safe).join(', ')}`)
  if (filtros.meses_ref?.length)
    descFiltros.push(`Ref.: ${filtros.meses_ref.map(safe).join(', ')}`)
  if (filtros.data_inicio)
    descFiltros.push(`De: ${fmtData(filtros.data_inicio)}`)
  if (filtros.data_fim)
    descFiltros.push(`Ate: ${fmtData(filtros.data_fim)}`)

  // ── Cabecalho ────────────────────────────────────────────────────────────
  let y = drawHeader(doc, ano, orgNome, descFiltros, pageW, pageH)

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 1 — Cards financeiros
  // ════════════════════════════════════════════════════════════════════════
  if (painel.dids) {
    const d = painel.dids
    y = drawMetricsRow(doc, [
      { label: 'Valor Bruto Total',  value: fmtMoeda(d.valorBrutoTotal), accent: C.teal,  bigFont: true },
      { label: 'Total Pago',        value: fmtMoeda(d.valorPago),       accent: C.green, bigFont: true },
      { label: 'Total Pendente',    value: fmtMoeda(d.valorPendente),   accent: C.amber, bigFont: true },
    ], y, pageH)
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 2 — KPIs: Total DIDs + Taxa de Inadimplencia
  // ════════════════════════════════════════════════════════════════════════
  if (painel.dids) {
    const d = painel.dids
    const total   = (d.totalFixas || 0) + (d.totalVariaveis || 0)
    const pendQtd = d.pendentes?.length || 0
    const taxaInad = total > 0 ? Math.round((pendQtd / total) * 100) : 0
    const inadColor = taxaInad > 20 ? C.red : taxaInad > 10 ? C.amber : C.green
    y = drawMetricsRow(doc, [
      { label: 'Total DIDs Emitidos',    value: String(total),         accent: C.blue },
      { label: 'Taxa de Inadimplencia',  value: taxaInad + '%',        accent: inadColor,
        sub: pendQtd + ' DID' + (pendQtd !== 1 ? 's' : '') + ' pendente' + (pendQtd !== 1 ? 's' : '') },
    ], y, pageH)
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 3 — Distribuicao por Tipo e Status de Pagamento
  // ════════════════════════════════════════════════════════════════════════
  if (painel.dids) {
    const d = painel.dids
    const total   = (d.totalFixas || 0) + (d.totalVariaveis || 0)
    const pendQtd = d.pendentes?.length || 0
    const pagosQtd = total - pendQtd
    const pctFixas    = total > 0 ? Math.round((d.totalFixas    / total) * 100) : 50
    const pctVariaveis = 100 - pctFixas
    const pctPago     = total > 0 ? Math.round((pagosQtd / total) * 100) : 0
    const pctPendente = 100 - pctPago
    if (total > 0) {
      y = drawDistribuicao(doc,
        {
          title: 'Tipo de DID',
          segA: { pct: pctFixas,    qtd: d.totalFixas,    label: 'Contas Fixas',    valor: '',                color: C.blue   },
          segB: { pct: pctVariaveis, qtd: d.totalVariaveis, label: 'Contas Variaveis', valor: '',               color: C.purple },
        },
        {
          title: 'Status de Pagamento',
          segA: { pct: pctPago,     qtd: pagosQtd,  label: 'Pagos',     valor: fmtMoeda(d.valorPago),     color: C.green },
          segB: { pct: pctPendente, qtd: pendQtd,   label: 'Pendentes', valor: fmtMoeda(d.valorPendente), color: C.amber },
        },
        y, pageH
      )
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 4 — Grafico por mes
  // ════════════════════════════════════════════════════════════════════════
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  if (painel.dids?.porMes?.length > 0) {
    const arr = Array(12).fill(0)
    painel.dids.porMes.forEach(item => {
      const idx = new Date(item.mes).getMonth()
      arr[idx] = parseFloat(item.total) || 0
    })
    if (arr.some(v => v > 0)) {
      const dados = MESES.map((l, i) => ({ l, v: arr[i] }))
      y = drawBarChart(doc, dados, y, pageH)
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 5 — Por Secretaria
  // ════════════════════════════════════════════════════════════════════════
  if (painel.dids?.porSecretaria?.length > 0) {
    const totalGeral = parseFloat(painel.dids.valorBrutoTotal) || 1
    y = drawSecretariaChart(doc, painel.dids.porSecretaria, totalGeral, y, pageH)
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 6 — Top Credores
  // ════════════════════════════════════════════════════════════════════════
  if (painel.dids?.porCredor?.length > 0) {
    y = checkPage(doc, y, pageH, 50)
    y = secHeader(doc, 'TOP CREDORES POR VALOR', C.teal, y, pageH)
    y = drawTable(doc, {
      head: ['#', 'Credor / Fornecedor', 'DIDs', 'Total (R$)'],
      body: painel.dids.porCredor.map((c, i) => [
        `${i + 1}.`,
        fmt(c.credor),
        String(c.qtd),
        fmtMoeda(c.total),
      ]),
      colStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: C.sub },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: C.blue },
      },
      headColor: [20, 110, 100],
      altColor: [240, 252, 250],
      y,
      pageH,
    })
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 7 — DIDs Pendentes
  // ════════════════════════════════════════════════════════════════════════
  if (painel.dids?.pendentes?.length > 0) {
    y = checkPage(doc, y, pageH, 50)
    y = secHeader(doc, 'DIDs PENDENTES DE PAGAMENTO', C.amber, y, pageH)
    y = drawTable(doc, {
      head: ['No. DID', 'Tipo', 'Credor', 'Secretaria', 'Referencia', 'Data', 'Valor Bruto'],
      body: painel.dids.pendentes.map(d => [
        `DID-${String(d.numero_did).padStart(3, '0')}`,
        fmtTipo(d.tipo_did),
        fmt(d.credor_sec1),
        fmt(d.secretaria_sec1),
        fmt(d.mes_referencia),
        fmtData(d.data_did),
        fmtMoeda(d.valor_bruto),
      ]),
      colStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', textColor: C.amber },
        1: { cellWidth: 20 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      headColor: [140, 70, 0],
      altColor: [255, 251, 235],
      y,
      pageH,
    })
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 8 — Ultimos DIDs registrados
  // ════════════════════════════════════════════════════════════════════════
  if (painel.dids?.ultimos?.length > 0) {
    y = checkPage(doc, y, pageH, 50)
    y = secHeader(doc, 'ULTIMOS DIDs REGISTRADOS', C.blue, y, pageH)
    y = checkPage(doc, y, pageH, 40)

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: 14, bottom: 14 },
      head: [['No. DID', 'Tipo', 'Credor', 'Secretaria', 'Data', 'Valor Bruto', 'Status']],
      body: painel.dids.ultimos.map(d => [
        `DID-${String(d.numero_did).padStart(3, '0')}`,
        fmtTipo(d.tipo_did),
        fmt(d.credor_sec1),
        fmt(d.secretaria_sec1),
        fmtData(d.data_did),
        fmtMoeda(d.valor_bruto),
        d.pago === 'sim' ? 'PAGO' : 'PENDENTE',
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: C.secBg,
        textColor: C.white,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: C.ink,
        cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
        lineColor: C.rule,
        lineWidth: { bottom: 0.15 },
      },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', textColor: C.blue },
        1: { cellWidth: 20 },
        4: { cellWidth: 22 },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      },
      didDrawCell(data) {
        if (data.section !== 'body') return
        if (data.column.index === 6) {
          data.cell.styles.textColor = data.row.raw[6] === 'PAGO' ? C.green : C.amber
        }
        if (data.column.index === 1) {
          data.cell.styles.textColor = data.row.raw[1] === 'Variaveis' ? C.purple : C.blue
        }
      },
      tableLineWidth: 0,
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Rodapes em todas as paginas ──────────────────────────────────────────
  drawFooters(doc, ano, orgNome, pageH, pageW)

  // ── Download ─────────────────────────────────────────────────────────────
  doc.save(`painel-financeiro-${ano}.pdf`)
}
