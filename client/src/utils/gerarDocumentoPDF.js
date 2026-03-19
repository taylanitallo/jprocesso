import { jsPDF } from 'jspdf'

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmt = v => (v && String(v).trim()) ? String(v).trim() : '—'
const fmtData = v => {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return String(v)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const M = 14        // margem
const UW = 182      // largura útil (210 - 2*14)

// Paginação automática
function checkPage(doc, y, needed = 20) {
  if (y + needed > 277) { doc.addPage(); return M + 6 }
  return y
}

// Cabeçalho padrão — retorna y após o cabeçalho
function cabecalho(doc, titulo, numero, secretaria) {
  // Fundo cinza escuro
  doc.setFillColor(18, 26, 48)
  doc.rect(0, 0, 210, 24, 'F')
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(titulo, M, 10)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 190, 210)
  doc.text(`Nº ${fmt(numero)}${secretaria ? '  |  ' + secretaria : ''}`, M, 17)

  // Data de geração
  doc.setFontSize(8)
  doc.setTextColor(130, 140, 155)
  const dataGer = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  doc.text(`Gerado em: ${dataGer}`, 210 - M, 17, { align: 'right' })

  doc.setTextColor(22, 28, 36)
  return 32
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
export function gerarDespachoPDF(processo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = cabecalho(doc, 'DESPACHO', processo.numero, processo.secretaria?.sigla || processo.secretariaSigla)

  // Fundo verde-claro suave para destaque do assunto
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
  y = campo(doc, y - (5.5 * 1 + 4.5 + 5.5) + 0, 'Tipo', processo.tipo_processo, col + 4, col)

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

  // ─ Descrição / Despacho
  y = secao(doc, y + 4, 'Memorando / Descrição')
  doc.setFillColor(249, 250, 252)
  doc.setDrawColor(220, 225, 233)
  const linhasDesc = doc.splitTextToSize(fmt(processo.descricao), UW - 6)
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
  y = checkPage(doc, y + 10, 40)
  doc.setFillColor(220, 225, 233)
  doc.rect(M, y, UW, 0.4, 'F')
  y += 8
  const cw = UW / 2
  // Bloco 1
  doc.setFillColor(243, 245, 248)
  doc.roundedRect(M, y, cw - 4, 28, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90, 100, 115)
  doc.text('Responsável pela emissão', M + 3, y + 10)
  doc.setFillColor(100, 110, 125)
  doc.rect(M + 6, y + 20, cw - 18, 0.3, 'F')
  doc.setFontSize(7.5)
  doc.text('Assinatura / Carimbo', M + cw / 2 - 8, y + 24)
  // Bloco 2
  doc.setFillColor(243, 245, 248)
  doc.roundedRect(M + cw + 2, y, cw - 4, 28, 2, 2, 'F')
  doc.text('Visto / Autorização', M + cw + 5, y + 10)
  doc.setFillColor(100, 110, 125)
  doc.rect(M + cw + 8, y + 20, cw - 18, 0.3, 'F')
  doc.text('Assinatura / Carimbo', M + cw + cw / 2 - 6, y + 24)

  doc.save(`Despacho_${processo.numero || 'processo'}.pdf`)
}

// ─── PAUTA ────────────────────────────────────────────────────────────────────
export function gerarPautaPDF(processo) {
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

  doc.save(`Pauta_${processo.numero || 'processo'}.pdf`)
}

// ─── REQUISIÇÃO ───────────────────────────────────────────────────────────────
export function gerarRequisicaoPDF(processo) {
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

  doc.save(`Requisicao_${processo.numero || 'processo'}.pdf`)
}
