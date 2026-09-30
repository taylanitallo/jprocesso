// ── Protocolo digital — vocabulário compartilhado ────────────────────────────
// Os mesmos valores são validados no servidor (processoController.sanitizarProtocoloDoc).

export const ORIGENS_PROTOCOLO = [
  { value: 'externo', label: 'Externo — público em geral', ajuda: 'Cidadão, empresa ou outro órgão' },
  { value: 'interno', label: 'Interno — servidor',          ajuda: 'Servidor ou unidade da própria Prefeitura' },
]

export const NATUREZAS_PROTOCOLO = [
  { value: 'atendimento',       label: 'Protocolo de atendimento' },
  { value: 'fluxo_despesa',     label: 'Fluxo de despesa' },
  { value: 'emissao_documento', label: 'Emissão de documento' },
  { value: 'outros',            label: 'Outras áreas da administração' },
]

const porValor = (lista) => Object.fromEntries(lista.map(i => [i.value, i.label]))

export const ORIGEM_PROTOCOLO_LABEL   = porValor(ORIGENS_PROTOCOLO)
export const NATUREZA_PROTOCOLO_LABEL = porValor(NATUREZAS_PROTOCOLO)
