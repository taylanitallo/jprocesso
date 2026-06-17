import api from '../services/api'

/**
 * Salva um PDF gerado pelo jsPDF no servidor (Supabase Storage + banco).
 * Fire-and-forget: não lança exceção — erros são logados silenciosamente.
 *
 * @param {import('jspdf').jsPDF} doc         Instância jsPDF já finalizada
 * @param {object}                opts
 * @param {string}                opts.nome        Nome do arquivo (com .pdf)
 * @param {string}               [opts.processoId] UUID do processo (opcional)
 * @param {string}               [opts.tipoOrigem] Categoria: did | despacho | oficio | pauta | requisicao | ordem
 */
// Aceita Blob pré-gerado ou instância jsPDF (evita double-render quando o caller já tem o blob)
export function salvarDocumentoGerado(docOrBlob, { nome, processoId, tipoOrigem = 'gerado' }) {
  try {
    const blob = docOrBlob instanceof Blob ? docOrBlob : docOrBlob.output('blob')
    const file = new File([blob], nome, { type: 'application/pdf' })
    const form = new FormData()
    form.append('file', file)
    form.append('nomeExibicao', nome)
    form.append('tipoOrigem', tipoOrigem)
    if (processoId) form.append('processoId', processoId)

    // Upload em background — não bloqueia download/impressão
    api.post('/documentos/salvar-gerado', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).catch(err => {
      console.warn('[salvarDocumentoGerado] Falha ao salvar no servidor:', err?.response?.data?.error || err?.message)
    })
  } catch (err) {
    console.warn('[salvarDocumentoGerado] Erro ao preparar upload:', err?.message)
  }
}
