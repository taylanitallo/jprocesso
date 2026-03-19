import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { BarChart3, Download, TrendingUp, FileText, Building2, Clock, CheckCircle } from 'lucide-react'
import api from '../services/api'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

export default function Relatorios() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [tipoRelatorio, setTipoRelatorio] = useState('todos')
  const { tenant, user } = useAuth()

  // Buscar processos da API
  const { data: processos = [], isLoading } = useQuery(
    'todos-processos',
    async () => {
      const { data } = await api.get('/processos?limit=1000')
      return Array.isArray(data) ? data : (data.processos || [])
    }
  )

  // Buscar secretarias
  const { data: secretariasData } = useQuery(
    'secretarias-relatorio',
    async () => {
      const { data } = await api.get('/organizacao/secretarias')
      return data?.secretarias || []
    }
  )

  // Buscar setores
  const { data: setoresData } = useQuery(
    'setores-relatorio',
    async () => {
      const { data } = await api.get('/organizacao/setores')
      return data?.setores || []
    }
  )

  // Calcular estatísticas
  const calcularEstatisticas = () => {
    let processosFiltrados = processos

    // Aplicar filtros de data
    if (dataInicio) {
      processosFiltrados = processosFiltrados.filter(p => 
        new Date(p.created_at) >= new Date(dataInicio)
      )
    }
    if (dataFim) {
      processosFiltrados = processosFiltrados.filter(p => 
        new Date(p.created_at) <= new Date(dataFim)
      )
    }

    const totalProcessos = processosFiltrados.length
    const processosConcluidos = processosFiltrados.filter(p => p.status === 'concluido').length
    const processosAbertos = processosFiltrados.filter(p => p.status === 'aberto').length
    const processosEmAnalise = processosFiltrados.filter(p => p.status === 'em_analise').length

    // Processos atrasados (mais de 5 dias sem movimentação)
    const cincodiasAtras = new Date()
    cincodiasAtras.setDate(cincodiasAtras.getDate() - 5)
    const processosAtrasados = processosFiltrados.filter(p => 
      p.status !== 'concluido' && new Date(p.updated_at) < cincodiasAtras
    ).length

    // Processos por secretaria (usando setorAtual)
    const processosPorSetor = {}
    processosFiltrados.forEach(p => {
      if (p.setorAtual?.nome) {
        const setorNome = p.setorAtual.nome
        processosPorSetor[setorNome] = (processosPorSetor[setorNome] || 0) + 1
      }
    })

    const processosPorSecretaria = Object.entries(processosPorSetor).map(([nome, total]) => ({
      nome,
      total
    }))

    // Calcular tempo médio (simplificado)
    const processosConcluido = processosFiltrados.filter(p => p.status === 'concluido')
    let tempoMedio = 0
    if (processosConcluido.length > 0) {
      const tempoTotal = processosConcluido.reduce((acc, p) => {
        const inicio = new Date(p.created_at)
        const fim = new Date(p.updated_at)
        const diff = Math.floor((fim - inicio) / (1000 * 60 * 60 * 24))
        return acc + diff
      }, 0)
      tempoMedio = Math.floor(tempoTotal / processosConcluido.length)
    }

    return {
      totalProcessos,
      processosConcluidos,
      processosAbertos,
      processosEmAnalise,
      processosAtrasados,
      tempoMedioConclusao: `${tempoMedio} dias`,
      processosPorSecretaria,
      processosFiltrados
    }
  }

  const estatisticas = calcularEstatisticas()

  const exportarPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    let currentPage = 1

    // Função para adicionar cabeçalho institucional
    const addHeader = () => {
      // Fundo azul do cabeçalho
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      // Linha de detalhe
      doc.setFillColor(29, 78, 216)
      doc.rect(0, 35, pageWidth, 2, 'F')
      
      // Título do sistema
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('jProcesso - Sistema de Tramitação', pageWidth / 2, 15, { align: 'center' })
      
      // Nome do município/instituição
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      const nomeMunicipio = tenant?.nome_municipio || tenant?.nome || 'Prefeitura Municipal'
      doc.text(nomeMunicipio.toUpperCase(), pageWidth / 2, 25, { align: 'center' })
      
      // Cidade/Estado
      if (tenant?.cidade && tenant?.estado) {
        doc.setFontSize(9)
        doc.text(`${tenant.cidade} - ${tenant.estado}`, pageWidth / 2, 31, { align: 'center' })
      }
      
      // Resetar cor do texto
      doc.setTextColor(0, 0, 0)
    }

    // Função para adicionar rodapé
    const addFooter = (pageNum) => {
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      
      // Linha superior do rodapé
      doc.setDrawColor(200, 200, 200)
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
      
      // Informações do rodapé
      const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm')
      doc.text(`Gerado em: ${dataGeracao}`, 14, pageHeight - 10)
      doc.text(`Usuário: ${user?.nome || 'Sistema'}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      doc.text(`Página ${pageNum}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
      
      doc.setTextColor(0, 0, 0)
    }

    // ========== PÁGINA 1: CAPA E RESUMO ==========
    addHeader()
    
    // Título do relatório
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('RELATÓRIO DE PROCESSOS', pageWidth / 2, 50, { align: 'center' })
    
    // Subtítulo com período
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    if (dataInicio && dataFim) {
      doc.text(
        `Período: ${format(new Date(dataInicio), 'dd/MM/yyyy')} a ${format(new Date(dataFim), 'dd/MM/yyyy')}`,
        pageWidth / 2,
        58,
        { align: 'center' }
      )
    } else {
      doc.text('Relatório Geral - Todos os Períodos', pageWidth / 2, 58, { align: 'center' })
    }
    
    doc.setTextColor(0, 0, 0)

    // Box de informações gerais
    doc.setFillColor(240, 249, 255)
    doc.roundedRect(14, 70, pageWidth - 28, 35, 3, 3, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMAÇÕES DO RELATÓRIO', 20, 78)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Sistema: jProcesso - Gestão de Processos Administrativos`, 20, 85)
    doc.text(`Instituição: ${tenant?.nome_municipio || 'Não informado'}`, 20, 91)
    doc.text(`Gerado por: ${user?.nome || 'Sistema'} (${user?.tipo || 'usuário'})`, 20, 97)
    
    // Estatísticas principais em cards
    const cardY = 115
    const cardWidth = (pageWidth - 38) / 4
    const cardHeight = 30
    const cardSpacing = 2
    
    const cards = [
      { label: 'Total', value: estatisticas.totalProcessos, color: [59, 130, 246] },
      { label: 'Concluídos', value: estatisticas.processosConcluidos, color: [34, 197, 94] },
      { label: 'Em Andamento', value: estatisticas.processosAbertos + estatisticas.processosEmAnalise, color: [234, 179, 8] },
      { label: 'Atrasados', value: estatisticas.processosAtrasados, color: [239, 68, 68] }
    ]
    
    cards.forEach((card, index) => {
      const x = 14 + (index * (cardWidth + cardSpacing))
      
      // Fundo do card
      doc.setFillColor(...card.color)
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F')
      
      // Valor
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(card.value.toString(), x + cardWidth / 2, cardY + 15, { align: 'center' })
      
      // Label
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(card.label, x + cardWidth / 2, cardY + 23, { align: 'center' })
    })
    
    doc.setTextColor(0, 0, 0)

    // Tabela de resumo detalhado
    const resumo = [
      ['Total de Processos', estatisticas.totalProcessos.toString()],
      ['Processos Concluídos', estatisticas.processosConcluidos.toString()],
      ['Processos Abertos', estatisticas.processosAbertos.toString()],
      ['Processos em Análise', estatisticas.processosEmAnalise.toString()],
      ['Processos Atrasados (>5 dias)', estatisticas.processosAtrasados.toString()],
      ['Tempo Médio de Conclusão', estatisticas.tempoMedioConclusao]
    ]
    
    autoTable(doc, {
      startY: cardY + cardHeight + 15,
      head: [['Indicador', 'Valor']],
      body: resumo,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { halign: 'center', cellWidth: 60 }
      }
    })

    addFooter(currentPage)

    // ========== PÁGINA 2: PROCESSOS POR SETOR ==========
    if (estatisticas.processosPorSecretaria.length > 0) {
      doc.addPage()
      currentPage++
      addHeader()
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text('DISTRIBUIÇÃO POR SETOR', 14, 50)
      doc.setTextColor(0, 0, 0)
      
      const dadosSetor = estatisticas.processosPorSecretaria
        .sort((a, b) => b.total - a.total)
        .map((s, index) => [
          (index + 1).toString(),
          s.nome,
          s.total.toString(),
          `${((s.total / estatisticas.totalProcessos) * 100).toFixed(1)}%`
        ])
      
      autoTable(doc, {
        startY: 60,
        head: [['#', 'Setor', 'Quantidade', '% do Total']],
        body: dadosSetor,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 100 },
          2: { halign: 'center', cellWidth: 35 },
          3: { halign: 'center', cellWidth: 35 }
        }
      })
      
      addFooter(currentPage)
    }

    // ========== PÁGINA 3: LISTA DE PROCESSOS ==========
    if (estatisticas.processosFiltrados.length > 0 && estatisticas.processosFiltrados.length <= 100) {
      doc.addPage()
      currentPage++
      addHeader()
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text('LISTA DETALHADA DE PROCESSOS', 14, 50)
      doc.setTextColor(0, 0, 0)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 100)
      doc.text(`Total de ${estatisticas.processosFiltrados.length} processo(s)`, 14, 56)
      doc.setTextColor(0, 0, 0)
      
      const dadosProcessos = estatisticas.processosFiltrados.map((p, index) => [
        (index + 1).toString(),
        p.numero || 'S/N',
        p.assunto?.substring(0, 35) || 'Sem assunto',
        p.interessado_nome?.substring(0, 25) || 'N/A',
        p.status || 'Indefinido',
        p.setorAtual?.nome?.substring(0, 20) || 'N/A',
        format(new Date(p.created_at), 'dd/MM/yy')
      ])
      
      autoTable(doc, {
        startY: 62,
        head: [['#', 'Número', 'Assunto', 'Interessado', 'Status', 'Setor', 'Data']],
        body: dadosProcessos,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 25 },
          2: { cellWidth: 45 },
          3: { cellWidth: 32 },
          4: { halign: 'center', cellWidth: 20 },
          5: { cellWidth: 28 },
          6: { halign: 'center', cellWidth: 18 }
        },
        didDrawPage: function (data) {
          if (data.pageNumber > 1) {
            addHeader()
            addFooter(currentPage + data.pageNumber - 1)
          }
        }
      })
      
      addFooter(currentPage)
    }

    // Salvar o PDF
    const nomeArquivo = `relatorio-processos-${tenant?.subdominio || 'sistema'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
    doc.save(nomeArquivo)
  }

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new()
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm')
    const nomeInstituicao = tenant?.nome_municipio || 'Instituição'
    const cidade = tenant?.cidade || ''
    const estado = tenant?.estado || ''
    const localizacao = cidade && estado ? `${cidade} - ${estado}` : ''
    const nomeUsuario = user?.nome || 'Usuário'
    
    // Aba 1: Resumo com Dados Institucionais
    const resumoData = [
      ['RELATÓRIO DE PROCESSOS - JPROCESSO'],
      [],
      ['Instituição:', nomeInstituicao],
      ['Localização:', localizacao],
      ['Gerado por:', nomeUsuario],
      ['Data de Geração:', timestamp],
      [],
      ['=== ESTATÍSTICAS GERAIS ==='],
      [],
      ['Indicador', 'Valor', 'Percentual'],
      ['Total de Processos', estatisticas.totalProcessos, '100%'],
      ['Processos Concluídos', estatisticas.processosConcluidos, estatisticas.totalProcessos > 0 ? `${Math.round((estatisticas.processosConcluidos / estatisticas.totalProcessos) * 100)}%` : '0%'],
      ['Processos em Andamento', estatisticas.processosAbertos + estatisticas.processosEmAnalise, estatisticas.totalProcessos > 0 ? `${Math.round(((estatisticas.processosAbertos + estatisticas.processosEmAnalise) / estatisticas.totalProcessos) * 100)}%` : '0%'],
      ['Processos Atrasados', estatisticas.processosAtrasados, estatisticas.totalProcessos > 0 ? `${Math.round((estatisticas.processosAtrasados / estatisticas.totalProcessos) * 100)}%` : '0%'],
      [],
      ['Tempo Médio de Conclusão', estatisticas.tempoMedioConclusao, ''],
      [],
      ['=== PERÍODO DO RELATÓRIO ==='],
      ['Data Inicial:', dataInicio || 'Não definida'],
      ['Data Final:', dataFim || 'Não definida']
    ]
    
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
    
    // Estilo para o cabeçalho (primeira linha)
    if (!wsResumo['!cols']) wsResumo['!cols'] = []
    wsResumo['!cols'][0] = { wch: 30 }
    wsResumo['!cols'][1] = { wch: 20 }
    wsResumo['!cols'][2] = { wch: 15 }
    
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

    // Aba 2: Distribuição Por Setor
    if (estatisticas.processosPorSecretaria.length > 0) {
      const setorData = [
        ['DISTRIBUIÇÃO POR SETOR/SECRETARIA'],
        [],
        ['Instituição:', nomeInstituicao],
        ['Gerado em:', timestamp],
        [],
        ['Setor/Secretaria', 'Quantidade de Processos', 'Percentual do Total'],
        ...estatisticas.processosPorSecretaria
          .sort((a, b) => b.total - a.total)
          .map(s => [
            s.nome, 
            s.total,
            estatisticas.totalProcessos > 0 ? `${Math.round((s.total / estatisticas.totalProcessos) * 100)}%` : '0%'
          ]),
        [],
        ['TOTAL GERAL', estatisticas.totalProcessos, '100%']
      ]
      const wsSetor = XLSX.utils.aoa_to_sheet(setorData)
      
      if (!wsSetor['!cols']) wsSetor['!cols'] = []
      wsSetor['!cols'][0] = { wch: 40 }
      wsSetor['!cols'][1] = { wch: 25 }
      wsSetor['!cols'][2] = { wch: 20 }
      
      XLSX.utils.book_append_sheet(wb, wsSetor, 'Por Setor')
    }

    // Aba 3: Lista Completa de Processos
    if (estatisticas.processosFiltrados.length > 0) {
      const processosData = [
        ['LISTA COMPLETA DE PROCESSOS'],
        [],
        ['Instituição:', nomeInstituicao, '', '', '', '', ''],
        ['Gerado em:', timestamp, '', '', '', '', ''],
        ['Total de Processos:', estatisticas.processosFiltrados.length, '', '', '', '', ''],
        [],
        ['Número do Processo', 'Assunto', 'Interessado', 'Status', 'Prioridade', 'Setor Atual', 'Data de Abertura'],
        ...estatisticas.processosFiltrados.map(p => [
          p.numero || 'S/N',
          p.assunto || 'Sem assunto',
          p.interessado_nome || 'N/A',
          p.status || 'Indefinido',
          p.prioridade === 'urgente' ? 'URGENTE' : p.prioridade === 'alta' ? 'ALTA' : p.prioridade === 'normal' ? 'NORMAL' : 'BAIXA',
          p.setorAtual?.nome || 'N/A',
          format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')
        ])
      ]
      const wsProcessos = XLSX.utils.aoa_to_sheet(processosData)
      
      if (!wsProcessos['!cols']) wsProcessos['!cols'] = []
      wsProcessos['!cols'][0] = { wch: 20 }
      wsProcessos['!cols'][1] = { wch: 35 }
      wsProcessos['!cols'][2] = { wch: 25 }
      wsProcessos['!cols'][3] = { wch: 15 }
      wsProcessos['!cols'][4] = { wch: 12 }
      wsProcessos['!cols'][5] = { wch: 30 }
      wsProcessos['!cols'][6] = { wch: 18 }
      
      XLSX.utils.book_append_sheet(wb, wsProcessos, 'Processos')
    }

    // Aba 4: Processos por Status (nova aba com análise detalhada)
    const statusData = [
      ['ANÁLISE POR STATUS'],
      [],
      ['Instituição:', nomeInstituicao],
      ['Gerado em:', timestamp],
      [],
      ['Status', 'Quantidade', 'Percentual'],
      ['Abertos', estatisticas.processosAbertos, estatisticas.totalProcessos > 0 ? `${Math.round((estatisticas.processosAbertos / estatisticas.totalProcessos) * 100)}%` : '0%'],
      ['Em Análise', estatisticas.processosEmAnalise, estatisticas.totalProcessos > 0 ? `${Math.round((estatisticas.processosEmAnalise / estatisticas.totalProcessos) * 100)}%` : '0%'],
      ['Concluídos', estatisticas.processosConcluidos, estatisticas.totalProcessos > 0 ? `${Math.round((estatisticas.processosConcluidos / estatisticas.totalProcessos) * 100)}%` : '0%'],
      ['Atrasados', estatisticas.processosAtrasados, estatisticas.totalProcessos > 0 ? `${Math.round((estatisticas.processosAtrasados / estatisticas.totalProcessos) * 100)}%` : '0%'],
      [],
      ['TOTAL', estatisticas.totalProcessos, '100%']
    ]
    
    const wsStatus = XLSX.utils.aoa_to_sheet(statusData)
    
    if (!wsStatus['!cols']) wsStatus['!cols'] = []
    wsStatus['!cols'][0] = { wch: 20 }
    wsStatus['!cols'][1] = { wch: 15 }
    wsStatus['!cols'][2] = { wch: 15 }
    
    XLSX.utils.book_append_sheet(wb, wsStatus, 'Por Status')

    // Salvar arquivo com nome institucional
    const nomeArquivo = `relatorio-processos-${tenant?.subdominio || 'sistema'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`
    XLSX.writeFile(wb, nomeArquivo)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="page-title">📊 Relatórios e Estatísticas</h1>
          <p className="page-subtitle">Visualize e exporte relatórios sobre a tramitação de processos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-6">
        <h2 className="section-header">📋 Gerar Relatório</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📅 Data Inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📅 Data Final
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🗂️ Tipo de Relatório
            </label>
            <select 
              value={tipoRelatorio}
              onChange={(e) => setTipoRelatorio(e.target.value)}
              className="input-field"
            >
              <option value="todos">Todos os Processos</option>
              <option value="concluidos">Processos Concluídos</option>
              <option value="andamento">Processos em Andamento</option>
              <option value="atrasados">Processos Atrasados</option>
              <option value="por_setor">Por Setor</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportarPDF}
            disabled={isLoading || estatisticas.totalProcessos === 0}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>📄 Exportar PDF</span>
          </button>
          <button
            onClick={exportarExcel}
            disabled={isLoading || estatisticas.totalProcessos === 0}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>📊 Exportar Excel</span>
          </button>
          {(dataInicio || dataFim) && (
            <button
              onClick={() => {
                setDataInicio('')
                setDataFim('')
              }}
              className="btn-secondary"
            >
              🗑️ Limpar Filtros
            </button>
          )}
        </div>
        {isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">⏳ Carregando dados...</p>
        )}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 hover:shadow-md transition-shadow animate-bounce-in">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Processos</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.totalProcessos}</p>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow animate-bounce-in" style={{animationDelay: '75ms'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Concluídos</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.processosConcluidos}</p>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow animate-bounce-in" style={{animationDelay: '150ms'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-2xl">🔄</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Em Andamento</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.processosAbertos + estatisticas.processosEmAnalise}</p>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow animate-bounce-in" style={{animationDelay: '225ms'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-2xl">⏰</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Atrasados</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.processosAtrasados}</p>
        </div>
      </div>

      {/* Processos por Setor */}
      <div className="card p-6">
        <h2 className="section-header">🏛️ Processos por Setor</h2>
        {estatisticas.processosPorSecretaria.length > 0 ? (
          <div className="space-y-4">
            {estatisticas.processosPorSecretaria
              .sort((a, b) => b.total - a.total)
              .slice(0, 10)
              .map((setor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{setor.nome}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-48 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min((setor.total / estatisticas.totalProcessos) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">
                      {setor.total}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">📭 Nenhum dado disponível para exibir</p>
        )}
      </div>

      {/* Tempo Médio */}
      <div className="card p-6">
        <h2 className="section-header">⏱️ Tempo Médio de Conclusão</h2>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl">
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.tempoMedioConclusao}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tempo médio para concluir processos</p>
          </div>
        </div>
      </div>
    </div>
  )
}
 
