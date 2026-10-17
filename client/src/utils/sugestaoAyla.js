// Sugestões de texto da Ayla para campos que abrem em branco (despachos, motivos,
// observações…). O servidor (/api/ayla/sugerir) escreve a partir do contexto da
// tela e do estilo dos últimos textos que o usuário enviou naquele mesmo campo.
// Usado pelo componente components/ui/CampoSugerido.jsx.
import api from '../services/api'

// Pede uma sugestão; sem IA (ou erro) devolve '' e o campo segue em branco
export async function pedirSugestao({ campo, rotulo, contexto, anterior, extenso }) {
  try {
    const { data } = await api.post('/ayla/sugerir', { campo, rotulo, contexto, anterior, extenso: !!extenso }, { _silent: true, timeout: 30000 })
    return String(data?.texto || '').trim()
  } catch {
    return ''
  }
}

// Contexto padrão de um processo para as sugestões (o que a tela já tem carregado)
export function contextoProcesso(processo) {
  if (!processo) return {}
  const trams = Array.isArray(processo.tramitacoes) ? processo.tramitacoes : []
  const ultimoDespacho = [...trams]
    .sort((a, b) => new Date(b?.data_hora || 0) - new Date(a?.data_hora || 0))
    .find(t => t?.despacho)?.despacho
  return {
    numero: processo.numero,
    tipo: processo.tipo_processo,
    assunto: processo.assunto,
    descricao: processo.descricao,
    interessado: processo.interessado_nome,
    prioridade: processo.prioridade,
    status: processo.status,
    setor_atual: processo.setorAtual?.nome,
    secretaria_atual: processo.setorAtual?.secretaria?.nome,
    observacoes: processo.observacoes,
    ultimo_despacho: ultimoDespacho,
  }
}

// Contexto de um formulário (DID, etc.): só os campos simples e curtos já preenchidos
const CHAVE_IGNORADA = /(^id$|_id$|^id_|assinatura|base64|timbrado|imagem|anexo|token|senha|cpf)/i
export function contextoFormulario(form, extra = {}) {
  const out = {}
  for (const [k, v] of Object.entries(form || {})) {
    if (CHAVE_IGNORADA.test(k)) continue
    if (typeof v !== 'string' && typeof v !== 'number') continue
    const t = String(v).trim()
    if (!t || t.length > 300) continue
    out[k] = t
    if (Object.keys(out).length >= 24) break
  }
  return { ...extra, ...out }
}

// Textos mais usados pelo usuário num campo ("seus textos mais usados"), em cache por campo
const cacheFrequentes = new Map()
export function buscarFrequentes(campo) {
  if (!campo) return Promise.resolve([])
  if (!cacheFrequentes.has(campo)) {
    cacheFrequentes.set(campo, api.get('/ayla/textos-frequentes', { params: { campo }, _silent: true })
      .then(r => (Array.isArray(r.data?.textos) ? r.data.textos : []))
      .catch(() => { cacheFrequentes.delete(campo); return [] }))
  }
  return cacheFrequentes.get(campo)
}

// Registra o texto que o usuário de fato enviou — as próximas sugestões aprendem com ele
export function registrarTextoUsado(campo, texto, contexto) {
  const t = String(texto || '').trim()
  if (!campo || t.length < 5) return
  cacheFrequentes.delete(campo)
  api.post('/ayla/texto-usado', { campo, texto: t, contexto }, { _silent: true }).catch(() => {})
}
