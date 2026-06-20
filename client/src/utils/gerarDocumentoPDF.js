import { jsPDF } from 'jspdf'
import { salvarDocumentoGerado } from './salvarDocumentoGerado'
import { applyTimbradoToPage } from './timbradoStore'
import { getMargens } from './margensStore'
import { setPDFLoading } from './pdfLoadingStore'

function _download(blob, nome) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ─── Margens dinâmicas (atualizado antes de cada geração) ─────────────────────
let M       = 14
let UW      = 182
let mTop    = 20
let mBottom = 20

function refreshM() {
  const mg = getMargens()
  M       = mg.left
  UW      = 210 - mg.left - mg.right
  mTop    = mg.top
  mBottom = mg.bottom
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmt = v => (v && String(v).trim()) ? String(v).trim() : '—'
const fmtData = v => {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return String(v)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Paginação automática
function checkPage(doc, y, needed = 20) {
  if (y + needed > 297 - mBottom) { doc.addPage(); applyTimbradoToPage(doc); return mTop + 6 }
  return y
}

// Cabeçalho padrão — retorna y após o cabeçalho
function cabecalho(doc, titulo, numero, secretaria) {
  applyTimbradoToPage(doc)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(18, 26, 48)
  doc.text(titulo, M, mTop)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 70, 90)
  doc.text(`Nº ${fmt(numero)}${secretaria ? '  |  ' + secretaria : ''}`, M, mTop + 7)

  // Data de geração
  doc.setFontSize(8)
  doc.setTextColor(130, 140, 155)
  const dataGer = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  doc.text(`Gerado em: ${dataGer}`, 210 - M, mTop + 7, { align: 'right' })

  // Linha separadora
  doc.setFillColor(220, 225, 233)
  doc.rect(M, mTop + 11, UW, 0.4, 'F')

  doc.setTextColor(22, 28, 36)
  return Math.max(32, mTop + 16)
}

// Linha de campo: rótulo + valor
function campo(doc, y, rotulo, valor, xOffset = 0, largura = UW) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 110, 125)
  doc.text(rotulo.toUpperCase(), M + xOffset, y)
  y += 4.5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 28, 36)
  const lines = doc.splitTextToSize(fmt(valor), largura - xOffset - 2)
  doc.text(lines, M + xOffset, y)
  return y + lines.length * 5.5
}

// Divisor de seção
function secao(doc, y, titulo) {
  y = checkPage(doc, y, 14)
  doc.setFillColor(220, 225, 233)
  doc.rect(M, y, UW, 0.4, 'F')
  y += 3
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(41, 82, 196)
  doc.text(titulo.toUpperCase(), M, y + 3)
  return y + 8
}

// ─── DESPACHO ─────────────────────────────────────────────────────────────────
const TIPO_LABELS = {
  oficio: 'Ofício', determinacao_institucional: 'Determinação Institucional',
  comunicado: 'Comunicado', portaria: 'Portaria', decreto: 'Decreto',
  encaminhamento: 'Encaminhamento', outros: 'Outros',
}

export async function gerarDespachoPDF(processo, imprimir = false) {
  setPDFLoading(true)
  try {
  refreshM()
  // Suporta tanto o formato antigo (_despacho_*) quanto o novo (_despacho_doc_form)
  const f = processo._despacho_doc_form || processo.despacho_doc || {}
  const despachoPara    = f.para           || ''
  const despachoCargo   = f.cargo_emissor  || ''
  const despachoData    = f.data_despacho  || ''
  const despachoTexto   = f.texto          || processo.descricao || ''
  const despachoTipo    = f.tipo_despacho  || ''
  const despachoNumero  = f.numero         || ''
  const despachoEmenta  = f.ementa         || ''
  const despachoRef     = f.referencia     || ''
  const despachoTitulo  = f.titulo_outro   || ''
  const tipoLabel       = TIPO_LABELS[despachoTipo] || 'Despacho'
  const tituloDoc       = despachoNumero ? `${tipoLabel} Nº ${despachoNumero}` : tipoLabel

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = cabecalho(doc, tituloDoc.toUpperCase(), processo.numero, processo.secretaria?.sigla || processo.secretariaSigla)

  // ─ Cabeçalho formal: Para / Data
  const temCabecalho = despachoPara || despachoData
  if (temCabecalho) {
    doc.setFillColor(240, 248, 255)
    doc.setDrawColor(186, 220, 254)
    doc.roundedRect(M, y, UW, 14, 2, 2, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 64, 175)
    if (despachoPara) doc.text(`Para: ${despachoPara}`, M + 3, y + 5.5)
    if (despachoData) {
      const dtFmt = new Date(despachoData + 'T12:00:00').toLocaleDateString('pt-BR')
      doc.text(`Data: ${dtFmt}`, 210 - M - 3, y + 5.5, { align: 'right' })
    }
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 28, 36)
    y += 18
  }

  // Ementa (Portaria / Decreto)
  if (despachoEmenta) {
    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(253, 211, 77)
    doc.roundedRect(M, y, UW, 16, 2, 2, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(92, 60, 0)
    const ementaLines = doc.splitTextToSize(fmt(despachoEmenta), UW - 6)
    doc.text(ementaLines, M + 3, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 28, 36)
    y += 20
  }

  // Referência (Encaminhamento)
  if (despachoRef) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(75, 85, 99)
    doc.text(`Referência: ${despachoRef}`, M, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 28, 36)
    y += 10
  }

  // Título livre (Outros)
  if (despachoTitulo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(75, 85, 99)
    doc.text(`Tipo: ${despachoTitulo}`, M, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 28, 36)
    y += 10
  }

  // Fundo verde-claro para assunto
  doc.setFillColor(240, 253, 244)
  doc.setDrawColor(187, 247, 208)
  doc.roundedRect(M, y, UW, 18, 2, 2, 'FD')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 28, 36)
  const assuntoLines = doc.splitTextToSize(fmt(processo.assunto), UW - 6)
  doc.text(assuntoLines, M + 3, y + 7)
  y += 22

  // ─ Dados do processo
  y = secao(doc, y, 'Identificação do Processo')
  const col = UW / 2 - 2
  y = campo(doc, y, 'Número do Processo', processo.numero, 0, col)
  y = campo(doc, y - (5.5 * 1 + 4.5 + 5.5) + 0, 'Tipo do Despacho', tipoLabel, col + 4, col)

  y = checkPage(doc, y)
  y = campo(doc, y + 2, 'Data de Abertura', fmtData(processo.data_abertura || processo.created_at))
  y = campo(doc, y + 2, 'Secretaria', processo.secretaria?.nome || processo.secretariaNome)
  y = campo(doc, y + 2, 'Setor Atual', processo.setorAtual?.nome)

  // ─ Interessado
  y = secao(doc, y + 4, 'Interessado')
  y = campo(doc, y, 'Nome', processo.interessado_nome || processo.interessadoNome)
  y = campo(doc, y + 2, 'CPF / CNPJ', processo.interessado_cpf_cnpj || processo.interessadoCpfCnpj)
  if (processo.interessado_email || processo.interessadoEmail)
    y = campo(doc, y + 2, 'E-mail', processo.interessado_email || processo.interessadoEmail)
  if (processo.interessado_telefone || processo.interessadoTelefone)
    y = campo(doc, y + 2, 'Telefone', processo.interessado_telefone || processo.interessadoTelefone)

  // ─ Texto do Despacho
  const secaoTextoLabel = (despachoTipo === 'portaria' || despachoTipo === 'decreto')
    ? 'Considerandos e Dispositivo'
    : 'Texto do Despacho'
  y = secao(doc, y + 4, secaoTextoLabel)
  doc.setFillColor(249, 250, 252)
  doc.setDrawColor(220, 225, 233)
  const linhasDesc = doc.splitTextToSize(fmt(despachoTexto), UW - 6)
  const boxH = Math.max(20, linhasDesc.length * 5.5 + 8)
  y = checkPage(doc, y, boxH + 4)
  doc.roundedRect(M, y, UW, boxH, 2, 2, 'FD')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(22, 28, 36)
  doc.text(linhasDesc, M + 3, y + 7)
  y += boxH + 6

  // ─ Linha do Tempo (tramitações)
  if (processo.tramitacoes?.length) {
    y = secao(doc, y + 2, 'Linha do Tempo')
    processo.tramitacoes.forEach((t) => {
      y = checkPage(doc, y, 16)
      doc.setFillColor(243, 245, 248)
      doc.roundedRect(M, y, UW, 13, 1.5, 1.5, 'F')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 28, 36)
      const acao = { abertura: 'Abertura', tramite: 'Tramitação', devolucao: 'Devolução', conclusao: 'Conclusão' }[t.tipo_acao] || t.tipo_acao
      doc.text(acao, M + 3, y + 5.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(90, 100, 115)
      const data = t.data_hora ? new Date(t.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
      doc.text(data, 210 - M - 3, y + 5.5, { align: 'right' })
      if (t.despacho || t.observacao) {
        const obs = doc.splitTextToSize(fmt(t.despacho || t.observacao), UW - 12)
        doc.text(obs, M + 3, y + 10)
      }
      y += 16
    })
  }

  // ─ Assinaturas
  y = checkPage(doc, y + 10, 45)
  doc.setFillColor(220, 225, 233)
  doc.rect(M, y, UW, 0.4, 'F')
  y += 8
  const cw = UW / 2
  // Bloco 1
  doc.setFillColor(243, 245, 248)
  doc.roundedRect(M, y, cw - 4, 30, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90, 100, 115)
  doc.text('Responsável pela emissão', M + 3, y + 7)
  if (despachoCargo) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 28, 36)
    const cargoLines = doc.splitTextToSize(despachoCargo, cw - 10)
    doc.text(cargoLines, M + 3, y + 12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 100, 115)
  }
  doc.setFillColor(100, 110, 125)
  doc.rect(M + 6, y + 22, cw - 18, 0.3, 'F')
  doc.setFontSize(7.5)
  doc.text('Assinatura / Carimbo', M + cw / 2 - 8, y + 27)
  // Bloco 2
  doc.setFillColor(243, 245, 248)
  doc.roundedRect(M + cw + 2, y, cw - 4, 30, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90, 100, 115)
  doc.text('Visto / Autorização', M + cw + 5, y + 7)
  doc.setFillColor(100, 110, 125)
  doc.rect(M + cw + 8, y + 22, cw - 18, 0.3, 'F')
  doc.text('Assinatura / Carimbo', M + cw + cw / 2 - 6, y + 27)

  const nomeArq = `Despacho_${processo.numero || 'processo'}.pdf`
  const blob = doc.output('blob')
  salvarDocumentoGerado(blob, { nome: nomeArq, processoId: processo.id, tipoOrigem: 'despacho' })
  if (imprimir) {
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) win.addEventListener('load', () => { win.print(); URL.revokeObjectURL(url) })
  } else {
    _download(blob, nomeArq)
  }
  } finally { setPDFLoading(false) }
}

// ─── OFÍCIO ───────────────────────────────────────────────────────────────────
export async function gerarOficioPDF({ processo, form, tenant, imprimir = false }) {
  setPDFLoading(true)
  try {
  refreshM()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  applyTimbradoToPage(doc)
  const PG  = 210   // largura da página
  const MO  = M     // margem esquerda configurada
  const UWO = UW    // largura útil já calculada em refreshM() com left+right corretos

  const f   = form || {}
  const dtFmt = f.data_despacho
    ? new Date(f.data_despacho + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  // ── Cabeçalho institucional ──────────────────────────────────────────────────
  const nomePrefeitura = tenant?.nome
    ? `Prefeitura Municipal — ${tenant.nome}`
    : 'Prefeitura Municipal'
  const siglaSecretaria  = processo?.secretaria?.sigla  || tenant?.sigla  || ''
  const nomeSecretaria   = f.secretaria_emissora || processo?.secretaria?.nome || ''

  // Nome da prefeitura — começa em mTop
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(18, 26, 48)
  doc.text(nomePrefeitura.toUpperCase(), PG / 2, mTop, { align: 'center' })

  // Secretaria
  if (nomeSecretaria) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 70, 90)
    doc.text(nomeSecretaria, PG / 2, mTop + 6, { align: 'center' })
  }

  // Setor
  if (f.setor_emissor) {
    doc.setFontSize(8.5)
    doc.setTextColor(90, 100, 115)
    doc.text(f.setor_emissor, PG / 2, nomeSecretaria ? mTop + 12 : mTop + 6, { align: 'center' })
  }

  // Linha separadora
  const yLinha = mTop + (nomeSecretaria ? (f.setor_emissor ? 16 : 12) : 8)
  doc.setFillColor(18, 26, 48)
  doc.rect(MO, yLinha, UWO, 0.5, 'F')

  let y = yLinha + 8

  // ── Identificação do Ofício ──────────────────────────────────────────────────
  // Número à esquerda / Data à direita
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(18, 26, 48)
  const numOficio = f.numero ? `OFÍCIO Nº ${f.numero}` : 'OFÍCIO'
  doc.text(numOficio, MO, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 70, 90)
  doc.text(dtFmt, PG - MO, y, { align: 'right' })
  y += 8

  // Processo de referência (pequeno)
  doc.setFontSize(7.5)
  doc.setTextColor(120, 130, 145)
  doc.text(`Ref.: Processo nº ${processo?.numero || ''}`, MO, y)
  y += 8

  // ── Destinatário ─────────────────────────────────────────────────────────────
  if (f.para) {
    doc.setFillColor(243, 245, 248)
    doc.roundedRect(MO, y, UWO, 14, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(41, 82, 196)
    doc.text('A(O):', MO + 3, y + 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 28, 36)
    doc.setFontSize(10)
    doc.text(fmt(f.para), MO + 16, y + 5.5)
    y += 18
  }

  // ── Assunto ──────────────────────────────────────────────────────────────────
  if (f.assunto) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 70, 90)
    doc.text('ASSUNTO:', MO, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 28, 36)
    doc.setFontSize(9.5)
    const assuntoLines = doc.splitTextToSize(fmt(f.assunto), UWO - 30)
    doc.text(assuntoLines, MO + 28, y + 4)
    y += assuntoLines.length * 5 + 8
  }

  // ── Linha separadora fina ────────────────────────────────────────────────────
  doc.setFillColor(210, 215, 225)
  doc.rect(MO, y, UWO, 0.3, 'F')
  y += 8

  // ── Corpo / Texto do Ofício ───────────────────────────────────────────────────
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(22, 28, 36)

  const texto = fmt(f.texto)
  const linhasTexto = doc.splitTextToSize(texto, UWO)
  for (let i = 0; i < linhasTexto.length; i++) {
    if (y + 7 > 297 - mBottom) {
      doc.addPage()
      applyTimbradoToPage(doc)
      y = mTop + 6
    }
    doc.text(linhasTexto[i], MO, y)
    y += 6.5
  }

  // ── Assinatura ───────────────────────────────────────────────────────────────
  y += 12
  if (y + 35 > 297 - mBottom) { doc.addPage(); applyTimbradoToPage(doc); y = mTop + 6 }

  // Bloco de assinatura centralizado
  const bw = 90
  const bx = (PG - bw) / 2

  // Linha de assinatura
  doc.setFillColor(60, 70, 90)
  doc.rect(bx, y, bw, 0.4, 'F')
  y += 5

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 28, 36)
  if (f.nome_assinante) {
    const nomeLines = doc.splitTextToSize(fmt(f.nome_assinante), bw)
    doc.text(nomeLines, PG / 2, y, { align: 'center' })
    y += nomeLines.length * 5.5
  }

  if (f.cargo_emissor) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 70, 90)
    const cargoLines = doc.splitTextToSize(fmt(f.cargo_emissor), bw)
    doc.text(cargoLines, PG / 2, y, { align: 'center' })
    y += cargoLines.length * 5 + 2
  }

  if (f.portaria_nomeacao) {
    doc.setFontSize(8)
    doc.setTextColor(100, 110, 125)
    doc.text(fmt(f.portaria_nomeacao), PG / 2, y, { align: 'center' })
    y += 5
  }

  if (f.setor_emissor) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 110, 125)
    doc.text(fmt(f.setor_emissor), PG / 2, y, { align: 'center' })
    y += 5
  }

  if (f.secretaria_emissora) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 110, 125)
    doc.text(fmt(f.secretaria_emissora), PG / 2, y, { align: 'center' })
  }

  // ── Rodapé — número de página discreto, sem barra colorida
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 160, 175)
    const yRodape = 297 - mBottom + 4
    doc.text(nomePrefeitura, MO, yRodape)
    doc.text(`Pág. ${p}/${totalPages}`, PG - MO, yRodape, { align: 'right' })
  }

  const nomeArq = `Oficio_${f.numero || processo?.numero || 'doc'}.pdf`
  const blob = doc.output('blob')
  salvarDocumentoGerado(blob, { nome: nomeArq, processoId: processo?.id, tipoOrigem: 'oficio' })
  if (imprimir) {
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) win.addEventListener('load', () => { win.print(); URL.revokeObjectURL(url) })
  } else {
    _download(blob, nomeArq)
  }
  } finally { setPDFLoading(false) }
}

// ─── PAUTA ────────────────────────────────────────────────────────────────────
export async function gerarPautaPDF(processo) {
  setPDFLoading(true)
  try {
  refreshM()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = cabecalho(doc, 'PAUTA DE PROCESSO', processo.numero, processo.secretaria?.sigla || processo.secretariaSigla)

  // Destaque do assunto
  doc.setFillColor(240, 249, 255)
  doc.setDrawColor(186, 230, 253)
  doc.roundedRect(M, y, UW, 18, 2, 2, 'FD')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 28, 36)
  const assuntoLines = doc.splitTextToSize(fmt(processo.assunto), UW - 6)
  doc.text(assuntoLines, M + 3, y + 7)
  y += 22

  // ─ Identificação
  y = secao(doc, y, 'Identificação do Processo')
  y = campo(doc, y, 'Número do Processo', processo.numero)
  y = campo(doc, y + 2, 'Tipo', processo.tipo_processo)
  y = campo(doc, y + 2, 'Data de Abertura', fmtData(processo.data_abertura || processo.created_at))
  y = campo(doc, y + 2, 'Secretaria', processo.secretaria?.nome || processo.secretariaNome)
  y = campo(doc, y + 2, 'Setor Atual', processo.setorAtual?.nome)
  y = campo(doc, y + 2, 'Status', processo.status)

  // ─ Interessado
  y = secao(doc, y + 4, 'Requerente / Interessado')
  y = campo(doc, y, 'Nome', processo.interessado_nome || processo.interessadoNome)
  y = campo(doc, y + 2, 'CPF / CNPJ', processo.interessado_cpf_cnpj || processo.interessadoCpfCnpj)
  if (processo.interessado_email || processo.interessadoEmail)
    y = campo(doc, y + 2, 'E-mail', processo.interessado_email || processo.interessadoEmail)
  if (processo.interessado_telefone || processo.interessadoTelefone)
    y = campo(doc, y + 2, 'Telefone', processo.interessado_telefone || processo.interessadoTelefone)

  // ─ Objeto / Descrição
  y = secao(doc, y + 4, 'Objeto da Contratação / Descrição')
  doc.setFillColor(240, 249, 255)
  doc.setDrawColor(186, 230, 253)
  const linhasDesc = doc.splitTextToSize(fmt(processo.descricao), UW - 6)
  const boxH = Math.max(22, linhasDesc.length * 5.5 + 8)
  y = checkPage(doc, y, boxH + 4)
  doc.roundedRect(M, y, UW, boxH, 2, 2, 'FD')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(22, 28, 36)
  doc.text(linhasDesc, M + 3, y + 7)
  y += boxH + 6

  // ─ Tramitações
  if (processo.tramitacoes?.length) {
    y = secao(doc, y + 2, 'Histórico de Tramitações')
    processo.tramitacoes.forEach((t) => {
      y = checkPage(doc, y, 16)
      doc.setFillColor(240, 249, 255)
      doc.roundedRect(M, y, UW, 13, 1.5, 1.5, 'F')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 28, 36)
      const acao = { abertura: 'Abertura', tramite: 'Tramitação', devolucao: 'Devolução', conclusao: 'Conclusão' }[t.tipo_acao] || t.tipo_acao
      doc.text(acao, M + 3, y + 5.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(90, 100, 115)
      const data = t.data_hora ? new Date(t.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
      doc.text(data, 210 - M - 3, y + 5.5, { align: 'right' })
      if (t.despacho || t.observacao) {
        const obs = doc.splitTextToSize(fmt(t.despacho || t.observacao), UW - 12)
        doc.text(obs, M + 3, y + 10)
      }
      y += 16
    })
  }

  // ─ Assinaturas
  y = checkPage(doc, y + 10, 40)
  doc.setFillColor(220, 225, 233)
  doc.rect(M, y, UW, 0.4, 'F')
  y += 8
  const cw = UW / 3
  const blocos = ['Servidor Responsável', 'Gestor do Setor', 'Secretário(a)']
  blocos.forEach((label, i) => {
    const bx = M + i * (cw + 3)
    doc.setFillColor(243, 245, 248)
    doc.roundedRect(bx, y, cw, 28, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 100, 115)
    doc.text(label, bx + 3, y + 10)
    doc.setFillColor(100, 110, 125)
    doc.rect(bx + 4, y + 20, cw - 10, 0.3, 'F')
    doc.setFontSize(7.5)
    doc.text('Assinatura', bx + cw / 2 - 6, y + 24)
  })

  const nomeArqPauta = `Pauta_${processo.numero || 'processo'}.pdf`
  const blobPauta = doc.output('blob')
  salvarDocumentoGerado(blobPauta, { nome: nomeArqPauta, processoId: processo.id, tipoOrigem: 'pauta' })
  _download(blobPauta, nomeArqPauta)
  } finally { setPDFLoading(false) }
}

// ─── REQUISIÇÃO DE ALMOXARIFADO ───────────────────────────────────────────────
// mode: 'preview' → retorna blob URL (para iframe); 'download' → baixa; 'print' → abre e imprime
export async function gerarRequisicaoAlmoxPDF({ req, tenantNome, mode = 'download' }) {
  setPDFLoading(true)
  try {
  refreshM()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = cabecalho(doc, 'REQUISIÇÃO DE MATERIAL', req.numero, req.secretaria?.nome || tenantNome || '')

  const fmtQtd  = v => (v != null && v !== '') ? Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '—'
  const fmtDt   = v => v ? new Date(String(v).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtDtHr = v => v ? new Date(v).toLocaleString('pt-BR') : '—'

  // ─ Informações gerais em duas colunas
  // campo() calcula largura do texto como: largura - xOffset - 2
  // Col A (x=M, xOffset=0):      passa half+2  → texto = half+2 - 0 - 2 = half
  // Col B (x=M+half+6, xOffset=half+6): passa UW → texto = UW - (half+6) - 2 ≈ half-8
  y = secao(doc, y, 'Identificação da Requisição')
  const half = UW / 2 - 3
  let r1a = campo(doc, y, 'Secretaria',          req.secretaria?.nome,          0,        half + 2)
  let r1b = campo(doc, y, 'Setor Solicitante',   req.setor?.nome,               half + 6, UW)
  y = Math.max(r1a, r1b) + 2
  let r2a = campo(doc, y, 'Data da Solicitação', fmtDt(req.data_solicitacao),   0,        half + 2)
  let r2b = campo(doc, y, 'Prioridade',          req.prioridade || 'NORMAL',    half + 6, UW)
  y = Math.max(r2a, r2b) + 2
  if (req.observacao) y = campo(doc, y, 'Observação', req.observacao)

  // ─ Itens
  y = secao(doc, y + 4, 'Itens Solicitados')
  y = checkPage(doc, y, 12)

  // Larguras absolutas das colunas (somam UW)
  const CW = { num: 8, nome: UW - 8 - 22 - 28 - 28, unid: 22, qtdS: 28, qtdE: 28 }
  const CX = {
    num:  M,
    nome: M + CW.num,
    unid: M + CW.num + CW.nome,
    qtdS: M + CW.num + CW.nome + CW.unid,
    qtdE: M + CW.num + CW.nome + CW.unid + CW.qtdS,
  }

  doc.setFillColor(18, 26, 48)
  doc.rect(M, y, UW, 8, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('#',             CX.num  + 1,  y + 5.5)
  doc.text('Item',          CX.nome + 1,  y + 5.5)
  doc.text('Unidade',       CX.unid + 1,  y + 5.5)
  doc.text('Qtd. Sol.',     CX.qtdS + 1,  y + 5.5)
  doc.text('Qtd. Entregue', CX.qtdE + 1,  y + 5.5)
  y += 8

  ;(req.itens || []).forEach((ri, i) => {
    const nomeItem  = ri.item?.nome || '—'
    const nomeLines = doc.splitTextToSize(nomeItem, CW.nome - 3)
    const rowH      = Math.max(7, nomeLines.length * 5 + 4)
    y = checkPage(doc, y, rowH)
    doc.setFillColor(i % 2 === 0 ? 249 : 243, i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 252 : 248)
    doc.rect(M, y, UW, rowH, 'F')
    doc.setDrawColor(220, 225, 233); doc.rect(M, y, UW, rowH, 'S')
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(22, 28, 36)
    doc.text(String(i + 1),                  CX.num  + 1, y + 5)
    doc.text(nomeLines,                       CX.nome + 1, y + 5)
    doc.text(ri.item?.unidade || 'UN',        CX.unid + 1, y + 5)
    doc.text(fmtQtd(ri.quantidade_solicitada),CX.qtdS + 1, y + 5)
    doc.text(fmtQtd(ri.quantidade_entregue),  CX.qtdE + 1, y + 5)
    if (ri.item?.codigo) {
      doc.setFontSize(7); doc.setTextColor(130, 140, 155)
      doc.text(`(${ri.item.codigo})`, CX.nome + 1, y + rowH - 1.5)
      doc.setFontSize(9); doc.setTextColor(22, 28, 36)
    }
    y += rowH
  })
  y += 4

  // ─ Assinaturas eletrônicas
  const sigs = [
    { label: 'Solicitante', nome: req.solicitante?.nome, data: fmtDt(req.data_solicitacao),   hash: req.hash_solicitante },
    { label: 'Autorizador', nome: req.autorizador?.nome, data: fmtDtHr(req.data_autorizacao), hash: req.hash_assinatura  },
    { label: 'Entregador',  nome: req.atendente?.nome,   data: fmtDtHr(req.data_entrega),     hash: req.hash_entrega     },
  ]
  const sw = UW / 3 - 2

  // Calcula altura máxima do bloco considerando o hash completo em múltiplas linhas
  doc.setFontSize(6)
  let maxBlockH = 30
  sigs.forEach(s => {
    const nomeLineCount = doc.splitTextToSize(s.nome || '—', sw - 6).length
    const afterNomeOffset = 13 + nomeLineCount * 5
    if (s.hash) {
      const hashLineCount = doc.splitTextToSize(s.hash, sw - 6).length
      maxBlockH = Math.max(maxBlockH, afterNomeOffset + 7 + hashLineCount * 4.5 + 4)
    } else {
      maxBlockH = Math.max(maxBlockH, afterNomeOffset + 10)
    }
  })

  y = checkPage(doc, y + 8, maxBlockH + 12)
  doc.setFillColor(220, 225, 233)
  doc.rect(M, y, UW, 0.4, 'F')
  y += 8

  sigs.forEach((s, i) => {
    const bx = M + i * (sw + 3)
    doc.setFillColor(243, 245, 248)
    doc.roundedRect(bx, y, sw, maxBlockH, 2, 2, 'F')
    // Rótulo
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(41, 82, 196)
    doc.text(s.label, bx + sw / 2, y + 6, { align: 'center' })
    // Nome
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 28, 36)
    const nomeLines = doc.splitTextToSize(s.nome || '—', sw - 6)
    doc.text(nomeLines, bx + sw / 2, y + 13, { align: 'center' })
    const afterNome = y + 13 + nomeLines.length * 5
    // Data
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 100, 115)
    doc.text(s.data, bx + sw / 2, afterNome + 1, { align: 'center' })
    // Hash completo (sem truncar)
    if (s.hash) {
      doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 130, 145)
      const hashLines = doc.splitTextToSize(s.hash, sw - 6)
      doc.text(hashLines, bx + sw / 2, afterNome + 7, { align: 'center' })
    }
    // Sem linha de assinatura — assinatura é eletrônica
  })

  const nomeArq = `Requisicao_Almox_${req.numero || 'doc'}.pdf`
  const blob    = doc.output('blob')
  if (mode === 'preview') {
    return URL.createObjectURL(blob)
  } else if (mode === 'print') {
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) win.addEventListener('load', () => { win.print(); URL.revokeObjectURL(url) })
  } else {
    _download(blob, nomeArq)
  }
  } finally { setPDFLoading(false) }
}

// ─── REQUISIÇÃO ───────────────────────────────────────────────────────────────
export async function gerarRequisicaoPDF(processo) {
  setPDFLoading(true)
  try {
  refreshM()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = cabecalho(doc, 'REQUISIÇÃO DE MATERIAL', processo.numero, processo.secretaria?.sigla || processo.secretariaSigla)

  // Destaque laranja
  doc.setFillColor(255, 247, 237)
  doc.setDrawColor(254, 215, 170)
  doc.roundedRect(M, y, UW, 18, 2, 2, 'FD')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 28, 36)
  const assuntoLines = doc.splitTextToSize(fmt(processo.assunto), UW - 6)
  doc.text(assuntoLines, M + 3, y + 7)
  y += 22

  // ─ Identificação
  y = secao(doc, y, 'Identificação da Requisição')
  y = campo(doc, y, 'Número do Processo', processo.numero)
  y = campo(doc, y + 2, 'Data', fmtData(processo.data_abertura || processo.created_at))
  y = campo(doc, y + 2, 'Secretaria / Órgão Solicitante', processo.secretaria?.nome || processo.secretariaNome)
  y = campo(doc, y + 2, 'Setor Solicitante', processo.setorAtual?.nome)

  // ─ Solicitante
  y = secao(doc, y + 4, 'Solicitante')
  y = campo(doc, y, 'Nome', processo.interessado_nome || processo.interessadoNome)
  y = campo(doc, y + 2, 'CPF / Matrícula', processo.interessado_cpf_cnpj || processo.interessadoCpfCnpj)
  if (processo.interessado_email || processo.interessadoEmail)
    y = campo(doc, y + 2, 'E-mail', processo.interessado_email || processo.interessadoEmail)
  if (processo.interessado_telefone || processo.interessadoTelefone)
    y = campo(doc, y + 2, 'Telefone', processo.interessado_telefone || processo.interessadoTelefone)

  // ─ Descrição / Justificativa
  y = secao(doc, y + 4, 'Descrição / Justificativa da Solicitação')
  doc.setFillColor(255, 247, 237)
  doc.setDrawColor(254, 215, 170)
  const linhasDesc = doc.splitTextToSize(fmt(processo.descricao), UW - 6)
  const boxH = Math.max(22, linhasDesc.length * 5.5 + 8)
  y = checkPage(doc, y, boxH + 4)
  doc.roundedRect(M, y, UW, boxH, 2, 2, 'FD')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(22, 28, 36)
  doc.text(linhasDesc, M + 3, y + 7)
  y += boxH + 6

  // ─ Tabela de itens (se disponível via tramitações como referência ao almoxarifado)
  y = secao(doc, y + 2, 'Itens Solicitados')
  y = checkPage(doc, y, 30)
  // Cabeçalho da tabela
  doc.setFillColor(18, 26, 48)
  doc.rect(M, y, UW, 8, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  const cols = [['Item', 20], ['Descrição', 90], ['Unid.', 20], ['Qtd.', 20], ['Obs.', 32]]
  let cx = M + 2
  cols.forEach(([label, w]) => { doc.text(label, cx, y + 5.5); cx += w })
  y += 8
  // Linhas em branco para preenchimento manual
  for (let i = 0; i < 8; i++) {
    y = checkPage(doc, y, 8)
    doc.setFillColor(i % 2 === 0 ? 249 : 243, i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 252 : 248)
    doc.rect(M, y, UW, 7, 'F')
    doc.setDrawColor(220, 225, 233)
    doc.rect(M, y, UW, 7, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 28, 36)
    doc.text(String(i + 1), M + 2, y + 5)
    y += 7
  }

  // ─ Tramitações
  if (processo.tramitacoes?.length) {
    y = secao(doc, y + 4, 'Histórico')
    processo.tramitacoes.forEach((t) => {
      y = checkPage(doc, y, 14)
      doc.setFillColor(255, 247, 237)
      doc.roundedRect(M, y, UW, 11, 1.5, 1.5, 'F')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 28, 36)
      const acao = { abertura: 'Abertura', tramite: 'Tramitação', devolucao: 'Devolução', conclusao: 'Conclusão' }[t.tipo_acao] || t.tipo_acao
      doc.text(acao, M + 3, y + 4.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(90, 100, 115)
      const data = t.data_hora ? new Date(t.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
      doc.text(data, 210 - M - 3, y + 4.5, { align: 'right' })
      y += 13
    })
  }

  // ─ Assinaturas
  y = checkPage(doc, y + 10, 40)
  doc.setFillColor(220, 225, 233)
  doc.rect(M, y, UW, 0.4, 'F')
  y += 8
  const cw = UW / 2
  const blocos = [['Servidor Solicitante', 'Assinatura / Matrícula'], ['Almoxarife Responsável', 'Assinatura / Carimbo']]
  blocos.forEach(([label, sub], i) => {
    const bx = i === 0 ? M : M + cw + 4
    doc.setFillColor(255, 247, 237)
    doc.roundedRect(bx, y, cw - 4, 28, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 100, 115)
    doc.text(label, bx + 3, y + 10)
    doc.setFillColor(100, 110, 125)
    doc.rect(bx + 6, y + 20, cw - 18, 0.3, 'F')
    doc.setFontSize(7.5)
    doc.text(sub, bx + (cw - 4) / 2 - 10, y + 24)
  })

  const nomeArqReq = `Requisicao_${processo.numero || 'processo'}.pdf`
  const blobReq = doc.output('blob')
  salvarDocumentoGerado(blobReq, { nome: nomeArqReq, processoId: processo.id, tipoOrigem: 'requisicao' })
  _download(blobReq, nomeArqReq)
  } finally { setPDFLoading(false) }
}
