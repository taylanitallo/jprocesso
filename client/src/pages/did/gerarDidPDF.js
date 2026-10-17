import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { salvarDocumentoGerado } from '../../utils/salvarDocumentoGerado'
// DIDs usam sempre o timbrado do município (superadmin), não o da secretaria
import { applyTimbradoMunicipio } from '../../utils/timbradoStore'
import { getMargens } from '../../utils/margensStore'
import { setPDFLoading } from '../../utils/pdfLoadingStore'

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmt     = v => (v && String(v).trim()) ? String(v).trim() : '—'
const fmtData = v => {
  if (!v) return '—'
  const [a, m, d] = String(v).split('-')
  return d && m && a ? `${d}/${m}/${a}` : v
}
const fmtMoeda = v => {
  const n = parseFloat(v)
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
const fmtCNPJ = v => {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}
const simNao = v => v === 'sim' ? 'SIM' : v === 'nao' ? 'NÃO' : '—'

// Simula negrito para texto que precisa de tipografia mais pesada em fontes embutidas
const bold = (doc, size, color) => { doc.setFontSize(size); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color) }
const norm = (doc, size, color) => { doc.setFontSize(size); doc.setFont('helvetica', 'normal'); doc.setTextColor(...color) }

// ─── Paleta Ultra-Compacta / ERP ─────────────────────────────────────────────
const C = {
  // Acentos por seção (usados só na barra lateral fina — sem fundos vibrantes)
  blue:      [41,  82, 196],
  teal:      [14, 145, 133],
  purple:    [111, 43, 216],
  amber:     [175, 82,   8],
  green:     [22, 127,  59],
  navy:      [10,  28,  82],
  // Texto
  ink:       [22,  28,  36],   // quase preto — dados principais
  sub:       [90, 100, 115],   // cinza médio — fonte, modalidade
  muted:     [155,163, 175],   // cinza claro — rótulos
  // UI monocromático
  headerBg:  [18,  26,  48],
  white:     [255,255, 255],
  rule:      [220,225, 233],   // linha divisória
  ruleMid:   [195,202, 212],   // linha de seção
  bg1:       [249,250, 252],   // fundo alternado levíssimo
  bg2:       [243,245, 248],   // fundo card meta
  dot:       [130,140, 155],   // checkbox unchecked
  pendente:  [175, 82,   8],
}

// Margens dinâmicas (atualizadas antes de cada geração)
let M       = 12
let UW      = 186
let mTop    = 20
let mBottom = 20

function refreshM() {
  const mg = getMargens()
  M       = mg.left
  UW      = 210 - mg.left - mg.right
  mTop    = mg.top
  mBottom = mg.bottom
}

// ─── Divisor de Seção — barra fina + rótulo inline ───────────────────────────
// Retorna y após o divisor (compacto: só 6mm de altura total)
function divSecao(doc, y, numero, titulo, acent, pageH) {
  if (y > pageH - 20) { doc.addPage(); applyTimbradoMunicipio(doc); y = mTop + 4 }
  // Linha tênue acima (separa do bloco anterior)
  doc.setDrawColor(...C.rule)
  doc.setLineWidth(0.15)
  doc.line(M, y, M + UW, y)
  y += 0.5
  // Pastilha colorida do número
  doc.setFillColor(...acent)
  doc.roundedRect(M, y + 0.3, 6, 4.8, 0.8, 0.8, 'F')
  bold(doc, 6, C.white)
  doc.text(numero, M + 3, y + 3.9, { align: 'center' })
  // Título da seção — grafite, compacto
  bold(doc, 7, C.sub)
  doc.text(titulo.toUpperCase(), M + 8.5, y + 3.9)
  // Linha colorida abaixo da pastilha
  doc.setDrawColor(...acent)
  doc.setLineWidth(0.5)
  doc.line(M, y + 5.5, M + UW, y + 5.5)
  return y + 8   // altura total do divisor: ~8mm
}

// ─── Grid de campos N colunas ─────────────────────────────────────────────────
// cols: array de { label, value, width? } onde width é fração de UW
// Retorna novo y
function gridRow(doc, y, cols, pageH) {
  if (y > pageH - 14) { doc.addPage(); applyTimbradoMunicipio(doc); y = mTop + 4 }
  let x = M
  // Calcula larguras
  const total = cols.reduce((s, c) => s + (c.w || 1), 0)
  const unitW = UW / total
  cols.forEach(col => {
    const cw = (col.w || 1) * unitW
    if (col.label) {
      norm(doc, 5.5, C.muted)
      doc.text(col.label.toUpperCase(), x + 1, y + 1.5)
    }
    bold(doc, 8, C.ink)
    const val = fmt(col.value)
    const lines = doc.splitTextToSize(val, cw - 2)
    doc.text(lines[0], x + 1, y + 5.8)   // só primeira linha (compacto)
    x += cw
  })
  // Linha separadora fina
  doc.setDrawColor(...C.rule)
  doc.setLineWidth(0.15)
  doc.line(M, y + 8, M + UW, y + 8)
  return y + 10   // cada linha de grid = 10mm
}

// ─── Campo objeto — texto completo com wrap ───────────────────────────────────
function campoObjeto(doc, y, valor, pageH, label = 'OBJETO') {
  if (y > pageH - 16) { doc.addPage(); applyTimbradoMunicipio(doc); y = mTop + 4 }
  norm(doc, 5.5, C.muted)
  doc.text(label.toUpperCase(), M + 1, y + 1.5)
  bold(doc, 7.5, C.ink)
  const linhas = doc.splitTextToSize(fmt(valor), UW - 2)
  doc.text(linhas, M + 1, y + 5.8)
  const h = 6 + linhas.length * 4
  doc.setDrawColor(...C.rule)
  doc.setLineWidth(0.15)
  doc.line(M, y + h, M + UW, y + h)
  return y + h + 2
}

// ─── Linha de Checkboxes compacta ─────────────────────────────────────────────
function checkRow(doc, y, label, itens, pageH) {
  if (y > pageH - 10) { doc.addPage(); applyTimbradoMunicipio(doc); y = mTop + 4 }
  norm(doc, 5.5, C.muted)
  doc.text(label.toUpperCase() + ':', M + 1, y + 3.5)
  let x = M + doc.getTextWidth(label.toUpperCase() + ':') + 4
  itens.forEach(({ label: lb, value }) => {
    if (x > M + UW - 20) { x = M + 30; y += 5 }
    // Quadrado minúsculo
    doc.setFillColor(...(value ? C.blue : C.white))
    doc.setDrawColor(...(value ? C.blue : C.dot))
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y + 0.5, 3.5, 3.5, 0.5, 0.5, value ? 'FD' : 'D')
    if (value) {
      norm(doc, 5, C.white)
      doc.text('✓', x + 0.5, y + 3.3)
    }
    const fc = value ? C.ink : C.sub
    norm(doc, 6.5, fc)
    if (value) doc.setFont('helvetica', 'bold')
    doc.text(lb, x + 5, y + 3.8)
    x += doc.getTextWidth(lb) + 10
  })
  return y + 6
}

// ─── Carrega imagem base64 com cache em memória ───────────────────────────────
const _imgCache = new Map()
async function carregarImagem(url) {
  if (_imgCache.has(url)) return _imgCache.get(url)
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload  = () => { _imgCache.set(url, reader.result); resolve(reader.result) }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// ─── Ordem das seções sem o resumo de etapas (fluxo padrão) ──────────────────
const ROMANOS_PDF = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
const PADRAO_PDF = {
  fixas: [['abertura', 'Secretaria Geral'], ['controle_interno', 'Controle Interno'], ['financas_autorizacao', 'Secretaria de Finanças'],
    ['contab_empenho_liquidacao', 'Contabilidade'], ['financas_pagamento', 'Secretaria de Finanças'], ['tesouraria', 'Tesouraria'],
    ['fechamento', 'Contabilidade Fechamento']],
  variaveis: [['abertura', 'Secretaria Geral'], ['controle_interno', 'Controle Interno'], ['financas_autorizacao', 'Secretaria de Finanças'],
    ['compras_solicitacao', 'Setor de Compras (Solicitação de Empenho)'], ['contab_empenho', 'Contabilidade (Empenho)'],
    ['compras_ordem', 'Setor de Compras (Ordem de Compra)'], ['almox_recebimento', 'Almoxarifado (Recebimento)'],
    ['compras_ateste', 'Setor de Compras (Ateste de NF)'], ['contab_liquidacao', 'Contabilidade (Liquidação)'],
    ['financas_pagamento', 'Secretaria de Finanças (Cronograma de Pagamento)'], ['tesouraria', 'Tesouraria'],
    ['fechamento', 'Contabilidade Fechamento']],
}
const ordemPadrao = (tipo) => PADRAO_PDF[tipo === 'variaveis' ? 'variaveis' : 'fixas'].map(([bloco, nome]) => ({ id: bloco, bloco, nome }))
// DID impresso fora da tela do DID (ex.: Financeiro): usa a foto do fluxo gravada no próprio DID
const etapasDaFoto = (did) => (did?.fluxo?.etapas?.length
  ? did.fluxo.etapas.map(e => ({
      id: e.id, bloco: e.bloco, nome: e.nome, registro: did.etapas?.[e.id] || null,
      campos: (e.personalizada?.campos || []).map(c => ({ campo: c.id, rotulo: c.rotulo, personalizado: c.tipo, itens: c.itens })),
    }))
  : null)

// ─── Geração Principal ────────────────────────────────────────────────────────
export async function gerarDidPDF({ form, itensDid, vliq, tenant, tipoDid, processoId, etapas }) {
  setPDFLoading(true)
  try {
  refreshM()
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297 - mBottom
  applyTimbradoMunicipio(doc)

  const nomeMunicipio = tenant?.nome_municipio || 'Prefeitura Municipal'
  const cnpjPref      = fmtCNPJ(tenant?.cnpj || '')
  const logoUrl       = tenant?.configuracoes?.logo
  let   logoBase64    = null
  if (logoUrl) logoBase64 = await carregarImagem(logoUrl)

  // ══════════════════════════════════════════════════════════════════════════
  //  CABEÇALHO COMPACTO — 22mm de altura
  // ══════════════════════════════════════════════════════════════════════════
  const textX = logoBase64 ? 38 : M
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', M, mTop, 18, 18) } catch {}
  }

  const tipoLabel    = tipoDid === 'variaveis' ? 'CONTAS VARIÁVEIS' : 'CONTAS FIXAS'
  const tipoAcent    = tipoDid === 'variaveis' ? C.teal : C.blue

  bold(doc, 10.5, C.ink)
  doc.text(nomeMunicipio.toUpperCase(), textX, mTop + 6)
  norm(doc, 6, C.sub)
  doc.text(`CNPJ: ${cnpjPref}  ·  DOCUMENTO DE INSTRUÇÃO DE DESPESAS`, textX, mTop + 12)

  bold(doc, 13, C.ink)
  doc.text(`DID Nº ${fmt(form.numero_did)}`, pageW - M, mTop + 8, { align: 'right' })
  norm(doc, 5.5, C.muted)
  doc.text(fmt(form.secretaria_sec1), pageW - M, mTop + 14, { align: 'right' })

  // Badge tipo — pill colorida no header (canto esquerdo inferior)
  const tpw = doc.getTextWidth(tipoLabel) + 8
  doc.setFontSize(6); doc.setFont('helvetica', 'bold')
  doc.setFillColor(...tipoAcent)
  doc.roundedRect(textX, mTop + 16, tpw, 3.5, 1, 1, 'F')
  doc.setTextColor(...C.white)
  doc.text(tipoLabel, textX + 4, mTop + 18.7)

  let y = mTop + 24

  // ══════════════════════════════════════════════════════════════════════════
  //  FAIXA META (credor + valor + badge) — 20mm — linha única compacta
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...C.bg2)
  doc.setDrawColor(...C.rule)
  doc.setLineWidth(0.2)
  doc.rect(M, y, UW, 18, 'FD')
  // Barra de acento esquerda
  doc.setFillColor(...C.blue)
  doc.rect(M, y, 2.5, 18, 'F')

  // Credor
  norm(doc, 5.5, C.muted)
  doc.text('CREDOR', M + 5, y + 5)
  bold(doc, 9.5, C.ink)
  doc.text(doc.splitTextToSize(fmt(form.credor_sec1), 78)[0], M + 5, y + 10.5)
  norm(doc, 6, C.sub)
  doc.text(`CNPJ/CPF: ${fmtCNPJ(form.cnpj_cpf_credor_sec1)}`, M + 5, y + 15.5)

  // Divisor vertical
  doc.setDrawColor(...C.rule)
  doc.setLineWidth(0.2)
  doc.line(M + 90, y + 3, M + 90, y + 15)

  // Valor Bruto
  norm(doc, 5.5, C.muted)
  doc.text('VALOR BRUTO', M + 93, y + 5)
  bold(doc, 11, C.navy)
  doc.text(fmtMoeda(form.valor_bruto), M + 93, y + 12)

  // Badge pago/pendente — pill inline
  const isPago   = form.pago === 'sim'
  const pillBg   = isPago ? [218,250,230] : [254,249,230]
  const pillBord = isPago ? C.green       : C.amber
  const pillTxt  = isPago ? 'PAGO' : 'PENDENTE'
  norm(doc, 6, pillBord)
  doc.setFont('helvetica', 'bold')
  const pw = doc.getTextWidth(pillTxt) + 6
  doc.setFillColor(...pillBg)
  doc.setDrawColor(...pillBord)
  doc.setLineWidth(0.3)
  doc.roundedRect(M + 92, y + 13, pw, 4, 1.5, 1.5, 'FD')
  doc.text(pillTxt, M + 95, y + 16.2)

  y += 22

  // ══════════════════════════════════════════════════════════════════════════
  //  SEÇÃO I — Secretaria Geral
  // ══════════════════════════════════════════════════════════════════════════
  const nomeSecI = etapas?.[0]?.nome || 'Secretaria Geral'
  const tituloSecI = `${nomeSecI} · ${tipoDid === 'variaveis' ? 'Contas Variáveis' : 'Contas Fixas'}`
  y = divSecao(doc, y, 'I', tituloSecI, C.blue, pageH)

  // Linha 1 — Contrato | Data | Mês de Referência | Nº NF
  y = gridRow(doc, y, [
    { label: 'Contrato / Referência', value: form.contrato_ref,      w: 2.2 },
    { label: 'Data do DID',           value: fmtData(form.data_did), w: 1   },
    { label: 'Mês de Referência',     value: form.mes_referencia,    w: 1.1 },
    { label: 'Nº da NF',              value: form.nf_sec1,           w: 1   },
  ], pageH)
  // Linha 2 — Secretaria | Secretário
  y = gridRow(doc, y, [
    { label: 'Secretaria',   value: form.secretaria_sec1,  w: 2.5 },
    { label: 'Secretário(a)', value: form.secretario_nome, w: 2   },
  ], pageH)
  // Linha 3 — Credor | CNPJ
  y = gridRow(doc, y, [
    { label: 'Credor',       value: form.credor_sec1,                   w: 2.5 },
    { label: 'CNPJ/CPF',     value: fmtCNPJ(form.cnpj_cpf_credor_sec1), w: 2   },
  ], pageH)
  // Linha 3b — Dados bancários do credor
  y = gridRow(doc, y, [
    { label: 'Banco', value: form.banco_fornecedor, w: 2   },
    { label: 'Ag.',   value: form.ag_fornecedor,    w: 1   },
    { label: 'C/C',   value: form.cc_fornecedor,    w: 1.5 },
  ], pageH)
  // Linha 4 — Licitação | Modalidade | Fonte | Valor DID
  y = gridRow(doc, y, [
    { label: 'Nº Licitação',     value: form.nro_licitacao_sec1,  w: 1.5 },
    { label: 'Modalidade',       value: form.tipo_licitacao_sec1, w: 1.5 },
    { label: 'Fonte de Recurso', value: form.fonte_recurso,       w: 1.5 },
    { label: 'Valor do DID',     value: fmtMoeda(form.valor_did), w: 1.5 },
  ], pageH)

  y = campoObjeto(doc, y, form.objeto, pageH)
  y = checkRow(doc, y, 'Certidões', [
    { label: 'Municipal',        value: form.cert_sec1_municipal },
    { label: 'Trabalhista',      value: form.cert_sec1_trabalhista },
    { label: 'FGTS',             value: form.cert_sec1_fgts },
    { label: 'Estadual',         value: form.cert_sec1_estadual },
    { label: 'Federal',          value: form.cert_sec1_federal },
    { label: 'Simples Nacional', value: form.cert_sec1_simples_nac },
  ], pageH)
  y += 3

  // ── Tabela de Itens — ultra-compacta ─────────────────────────────────────
  const itensFiltrados = (itensDid || []).filter(it => it.descricao)
  if (itensFiltrados.length > 0) {
    if (y > pageH - 28) { doc.addPage(); applyTimbradoMunicipio(doc); y = mTop + 4 }
    norm(doc, 5.5, C.muted)
    doc.text('ITENS / SERVIÇOS', M + 1, y)
    y += 2
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Unid.', 'Qtd.', 'Vl. Unit.', 'Total']],
      body: itensFiltrados.map(it => [
        it.descricao, it.unidade || '—', it.quantidade,
        fmtMoeda(it.valor_unitario), fmtMoeda(it.valor_total),
      ]),
      theme: 'plain',
      headStyles: {
        textColor: C.muted, fontSize: 6, fontStyle: 'normal', fillColor: C.bg1,
        lineColor: C.rule,
        lineWidth: { bottom: 0.25, top: 0, left: 0, right: 0 },
        cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 7.5, textColor: C.ink, fillColor: false,
        lineColor: C.rule,
        lineWidth: { bottom: 0.15, top: 0, left: 0, right: 0 },
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      },
      alternateRowStyles: { fillColor: C.bg1 },
      columnStyles: {
        0: { cellWidth: 78, fontStyle: 'bold' },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 38, halign: 'right' },
        4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: M, right: M },
      willDrawPage: (data) => { if (data.pageNumber > 1) applyTimbradoMunicipio(doc) },
    })
    y = doc.lastAutoTable.finalY + 4
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SEÇÕES II EM DIANTE — na ordem do fluxo deste DID (Configurações ›
  //  Fluxos de Processo). Cada bloco tem o seu desenho; a numeração vem da
  //  posição. Abaixo de cada seção: quem concluiu e o código da assinatura.
  // ══════════════════════════════════════════════════════════════════════════
  const demonstrativo = () => {
    if (y > pageH - 50) { doc.addPage(); applyTimbradoMunicipio(doc); y = mTop + 4 }
    norm(doc, 5.5, C.muted)
    doc.text('DEMONSTRATIVO DE DESCONTOS', M + 1, y)
    y += 2
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Valor (R$)']],
      body: [
        ['Valor Bruto',      fmtMoeda(form.valor_bruto)],
        ['Desconto INSS',    fmtMoeda(form.desconto_inss)],
        ['Desconto ISS',     fmtMoeda(form.desconto_iss)],
        ['Desconto IRRF',    fmtMoeda(form.desconto_irrf)],
        ['Outros Descontos', fmtMoeda(form.desconto_outros)],
      ],
      theme: 'plain',
      headStyles: {
        textColor: C.muted, fontSize: 6, fontStyle: 'normal', fillColor: C.bg1,
        lineColor: C.rule,
        lineWidth: { bottom: 0.25, top: 0, left: 0, right: 0 },
        cellPadding: { top: 1.5, bottom: 1.5, left: 5, right: 5 },
      },
      bodyStyles: {
        fontSize: 7.5, textColor: C.ink, fillColor: false,
        lineColor: C.rule,
        lineWidth: { bottom: 0.15, top: 0, left: 0, right: 0 },
        cellPadding: { top: 2, bottom: 2, left: 5, right: 5 },
      },
      alternateRowStyles: { fillColor: C.bg1 },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 56, halign: 'right' },
      },
      margin: { left: M, right: M },
      willDrawPage: (data) => { if (data.pageNumber > 1) applyTimbradoMunicipio(doc) },
    })
    y = doc.lastAutoTable.finalY + 1.5

    // Valor Líquido
    doc.setDrawColor(...C.ruleMid); doc.setLineWidth(0.2); doc.line(M, y, M + UW, y); y += 1.5
    doc.setFillColor(...C.bg2); doc.setDrawColor(...C.rule); doc.setLineWidth(0.2)
    doc.rect(M, y, UW, 10, 'FD')
    doc.setFillColor(...C.navy); doc.rect(M, y, 2.5, 10, 'F')
    norm(doc, 6, C.muted); doc.text('VALOR LÍQUIDO A PAGAR', M + 5, y + 6.2)
    bold(doc, 12, C.navy); doc.text(fmtMoeda(vliq), M + UW - 1, y + 7, { align: 'right' })
    y += 14
  }

  const etapasFluxo = etapas?.length ? etapas : etapasDaFoto(form) || ordemPadrao(tipoDid)
  const blocosDoFluxo = new Set(etapasFluxo.map(e => e.bloco))

  const BLOCOS_PDF = {
    controle_interno: { cor: C.amber, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em', value: fmtData(form.ci_recebido_em), w: 1.5 },
        { label: 'Responsável', value: form.ci_responsavel,          w: 3   },
      ], pageH)
      y = campoObjeto(doc, y, form.despacho_ci, pageH, 'Despacho via C.I.')
    } },
    financas_autorizacao: { cor: C.teal, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em', value: fmtData(form.financas_recebido_em), w: 1.5 },
        { label: 'Responsável', value: form.financas_responsavel,          w: 3   },
      ], pageH)
    } },
    compras_solicitacao: { cor: C.amber, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em',            value: fmtData(form.compras2_recebido_em),    w: 1.5 },
        { label: 'Responsável',            value: form.compras2_responsavel,             w: 2   },
        { label: 'Nº Solicitação Empenho', value: form.compras2_nro_empenho_solicitacao, w: 1.5 },
      ], pageH)
    } },
    contab_empenho: { cor: C.purple, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em',     value: fmtData(form.contabil_recebido_em), w: 1.3 },
        { label: 'Responsável',     value: form.contabil_responsavel,          w: 2   },
        { label: 'Auditor',         value: form.contabil_auditor,              w: 1.7 },
        { label: 'Está empenhado?', value: simNao(form.contabil_empenhado),    w: 1.3 },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Empenho Nº',   value: form.empenho_numero,        w: 1.5 },
        { label: 'Tipo',         value: form.tipo_empenho,          w: 1.5 },
        { label: 'Data Empenho', value: fmtData(form.data_empenho), w: 1.5 },
      ], pageH)
    } },
    contab_empenho_liquidacao: { cor: C.purple, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em', value: fmtData(form.contabil_recebido_em), w: 1.3 },
        { label: 'Responsável', value: form.contabil_responsavel,          w: 2   },
        { label: 'Auditor',     value: form.contabil_auditor,              w: 1.7 },
        { label: 'Doc. Caixa',  value: form.doc_caixa,                     w: 1   },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Está empenhado?', value: simNao(form.contabil_empenhado), w: 1.5 },
        { label: 'Empenho Nº',      value: form.empenho_numero,             w: 1.2 },
        { label: 'Tipo',            value: form.tipo_empenho,               w: 1.5 },
        { label: 'Data Empenho',    value: fmtData(form.data_empenho),      w: 1.3 },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Está liquidado?', value: simNao(form.contabil_liquidado), w: 1.5 },
        { label: 'Liquidação Nº',   value: form.liquidacao_numero,          w: 1.2 },
        { label: 'Data Liquidação', value: fmtData(form.data_liquidacao),   w: 1.3 },
      ], pageH)
    } },
    compras_ordem: { cor: C.amber, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em',     value: fmtData(form.compras_recebido_em), w: 1.5 },
        { label: 'Responsável',     value: form.compras_responsavel,          w: 2   },
        { label: 'Nº Ordem Compra', value: form.nro_empenho_solicitacao,      w: 1.5 },
        { label: 'Local Entrega',   value: form.local_entrega,                w: 1.5 },
      ], pageH)
    } },
    almox_recebimento: { cor: C.navy, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Ordem Recebida?', value: simNao(form.receb_ordem_recebida), w: 1.3 },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Data Recebimento',      value: fmtData(form.receb_data),               w: 1.5 },
        { label: 'Data NF',               value: fmtData(form.receb_nf_data),            w: 1.5 },
        { label: 'Enviado NF p/ Compras', value: fmtData(form.receb_nf_enviado_compras), w: 1.5 },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Fiscal / Responsável', value: form.receb_responsavel, w: 3 },
        { label: 'Cargo / Matrícula',    value: form.receb_cargo,       w: 2 },
      ], pageH)
      y = checkRow(doc, y, 'Conferência', [
        { label: 'NF conferida',      value: form.receb_nf_conferida },
        { label: 'Qtd. conferida',    value: form.receb_qtd_conferida },
        { label: 'Especificações ok', value: form.receb_esp_conforme },
      ], pageH)
      if (form.receb_obs) y = campoObjeto(doc, y, form.receb_obs, pageH, 'Observações do Recebimento')
    } },
    compras_ateste: { cor: C.amber, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em',              value: fmtData(form.compras3_recebido_em),   w: 1.5 },
        { label: 'Responsável',              value: form.compras3_responsavel,            w: 2   },
        { label: 'Data envio p/ liquidação', value: fmtData(form.compras3_local_entrega), w: 2   },
      ], pageH)
    } },
    contab_liquidacao: { cor: C.purple, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em',     value: fmtData(form.contabil_pc_recebido_em), w: 1.3 },
        { label: 'Responsável',     value: form.contabil_pc_responsavel,          w: 2   },
        { label: 'Auditor',         value: form.contabil_pc_auditor,              w: 1.7 },
        { label: 'Está liquidado?', value: simNao(form.contabil_pc_liquidado),    w: 1.3 },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Liquidação Nº',   value: form.contabil_pc_liquidacao_numero,        w: 2 },
        { label: 'Data Liquidação', value: fmtData(form.contabil_pc_data_liquidacao), w: 2 },
      ], pageH)
    } },
    financas_pagamento: { cor: C.teal, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em',               value: fmtData(form.financas2_recebido_em),       w: 1.5 },
        { label: 'Responsável',               value: form.financas2_responsavel,                w: 2   },
        { label: 'Enviado para Pagamento em', value: fmtData(form.financas2_enviado_pagamento), w: 2   },
      ], pageH)
    } },
    tesouraria: { cor: C.green, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Recebido em', value: fmtData(form.tesouraria_recebido_em), w: 1.5 },
        { label: 'Responsável', value: form.tesouraria_responsavel,          w: 2   },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Banco (pagador)', value: form.banco_pagador, w: 2   },
        { label: 'Ag.',             value: form.ag_pagador,    w: 1   },
        { label: 'C/C',             value: form.cc_pagador,    w: 1.5 },
      ], pageH)
      y = gridRow(doc, y, [
        { label: 'Banco (credor)', value: form.banco_fornecedor, w: 2   },
        { label: 'Ag.',            value: form.ag_fornecedor,    w: 1   },
        { label: 'C/C',            value: form.cc_fornecedor,    w: 1.5 },
      ], pageH)
      y = checkRow(doc, y, 'Certidões', tipoDid === 'variaveis' ? [
        { label: 'Unificada',   value: form.cert_teso_cnd },
        { label: 'FGTS',        value: form.cert_teso_fgts },
        { label: 'Estadual',    value: form.cert_teso_estadual },
        { label: 'Trabalhista', value: form.cert_teso_trabalhista },
        { label: 'Municipal',   value: form.cert_teso_municipal },
      ] : [
        { label: 'Municipal',        value: form.cert_teso_municipal },
        { label: 'Trabalhista',      value: form.cert_teso_trabalhista },
        { label: 'FGTS',             value: form.cert_teso_fgts },
        { label: 'Estadual',         value: form.cert_teso_estadual },
        { label: 'Federal',          value: form.cert_teso_federal },
        { label: 'Simples Nacional', value: form.cert_teso_simples_nac },
      ], pageH)
      y += 3
      demonstrativo()
      // Doc. Caixa sai na Contabilidade quando o fluxo tem "Empenho e Liquidação"
      if (form.doc_caixa && !blocosDoFluxo.has('contab_empenho_liquidacao')) {
        y = gridRow(doc, y, [{ label: 'Doc. Caixa', value: form.doc_caixa, w: 1 }], pageH)
      }
    } },
    fechamento: { cor: C.purple, desenhar: () => {
      y = gridRow(doc, y, [
        { label: 'Processo Finalizado',  value: simNao(form.contab_fech_finalizado), w: 2 },
        { label: 'Enviado para TCE/SIM', value: simNao(form.contab_fech_tce),        w: 2 },
      ], pageH)
    } },
  }

  // Etapa personalizada: campos conforme a configuração do município
  const desenharPersonalizada = (etapa) => {
    const dados = form.etapas_dados?.[etapa.id] || {}
    const curtos = []
    const soltarCurtos = () => {
      for (let i = 0; i < curtos.length; i += 3) y = gridRow(doc, y, curtos.slice(i, i + 3), pageH)
      curtos.length = 0
    }
    ;(etapa.campos || []).forEach((c) => {
      const v = dados[c.campo]
      if (c.personalizado === 'texto') {
        soltarCurtos()
        y = campoObjeto(doc, y, v, pageH, c.rotulo)
      } else if (c.personalizado === 'checklist') {
        soltarCurtos()
        y = checkRow(doc, y, c.rotulo, (c.itens || []).map((item, i) => ({ label: item, value: v?.[i] === true })), pageH)
      } else {
        const valor = c.personalizado === 'data' ? fmtData(v) : c.personalizado === 'simnao' ? simNao(v) : v
        curtos.push({ label: c.rotulo, value: valor, w: 2 })
      }
    })
    soltarCurtos()
  }

  // Quem concluiu a etapa e o código da assinatura eletrônica
  const assinaturaEtapa = (registro) => {
    if (!registro || registro.status !== 'concluida' || registro.legado) return
    if (y > pageH - 8) { doc.addPage(); applyTimbradoMunicipio(doc); y = mTop + 4 }
    const quando = registro.concluida_em ? new Date(registro.concluida_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''
    const quem = [registro.nome, registro.cargo, registro.secretaria].filter(Boolean).join(' · ')
    const ass = registro.assinatura ? ` · Assinado eletronicamente · código ${registro.assinatura.codigo_verificador} · CRC ${registro.assinatura.codigo_crc}` : ''
    norm(doc, 5.8, C.muted)
    const linhas = doc.splitTextToSize(`Concluída por ${quem}${quando ? ` em ${quando}` : ''}${ass}`, UW - 2)
    doc.text(linhas, M + 1, y + 2.5)
    y += 1.5 + linhas.length * 2.8
  }

  assinaturaEtapa(etapasFluxo[0]?.registro)
  etapasFluxo.forEach((etapa, i) => {
    if (i === 0) return // Seção I (Abertura) já desenhada acima
    const numero = ROMANOS_PDF[i] || String(i + 1)
    if (etapa.bloco === 'personalizada') {
      y = divSecao(doc, y, numero, etapa.nome, C.teal, pageH)
      desenharPersonalizada(etapa)
    } else {
      const b = BLOCOS_PDF[etapa.bloco]
      if (!b) return
      y = divSecao(doc, y, numero, etapa.nome, b.cor, pageH)
      b.desenhar()
    }
    assinaturaEtapa(etapa.registro)
    y += 1
  })

  // ══════════════════════════════════════════════════════════════════════════
  //  RODAPÉ EM TODAS AS PÁGINAS
  // ══════════════════════════════════════════════════════════════════════════
  const total   = doc.getNumberOfPages()
  const emissao = new Date().toLocaleString('pt-BR')
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    norm(doc, 6, C.muted)
    doc.text(nomeMunicipio, M, pageH - 2.5)
    doc.text(`Emissão: ${emissao}`, pageW / 2, pageH - 2.5, { align: 'center' })
    doc.text(`Pág. ${i} / ${total}`, pageW - M, pageH - 2.5, { align: 'right' })
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  const nomeArq = `DID_${form.numero_did || 'rascunho'}_${(form.contrato_ref || 'sem-contrato').replace(/[\/\\]/g, '-')}.pdf`
  const blobDid = doc.output('blob')
  if (processoId && processoId !== 'novo') {
    salvarDocumentoGerado(blobDid, { nome: nomeArq, processoId, tipoOrigem: 'did' })
  }
  const urlDid = URL.createObjectURL(blobDid)
  const aDid = document.createElement('a')
  aDid.href = urlDid; aDid.download = nomeArq; aDid.click()
  setTimeout(() => URL.revokeObjectURL(urlDid), 10000)
  } finally { setPDFLoading(false) }
}

