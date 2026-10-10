import { ShieldCheck, ExternalLink } from 'lucide-react'

/** URL pública de conferência de uma assinatura (usada na tarja e em documentos). */
export const urlVerificacao = (subdomain, codigo, crc) =>
  `${window.location.origin}/${subdomain}/verificar?codigo=${encodeURIComponent(codigo)}&crc=${encodeURIComponent(crc)}`

/** Texto da tarja, no padrão de assinatura eletrônica (modelo Suite/CE). */
export const textoTarja = (a, subdomain) => {
  const em = new Date(a.assinado_em)
  const data = em.toLocaleDateString('pt-BR')
  const hora = em.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const quem = [a.signatario_nome, a.signatario_cargo].filter(Boolean).join(', ')
  const base = a.fundamento || 'Lei Federal nº 14.063/2020'
  return `Documento assinado eletronicamente por ${quem}, em ${data}, às ${hora}, conforme ${base}. ` +
    `A autenticidade pode ser conferida em ${window.location.origin}/${subdomain}/verificar, ` +
    `informando o código verificador ${a.codigo_verificador} e o código CRC ${a.codigo_crc}.`
}

export default function TarjaAssinatura({ assinatura, subdomain }) {
  if (!assinatura) return null
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-success-200 dark:border-success-800/50 bg-success-50/60 dark:bg-success-900/15 px-3 py-2">
      <ShieldCheck className="w-4 h-4 mt-0.5 text-success-600 dark:text-success-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-relaxed text-ink-600">{textoTarja(assinatura, subdomain)}</p>
        <a
          href={urlVerificacao(subdomain, assinatura.codigo_verificador, assinatura.codigo_crc)}
          target="_blank" rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-success-700 dark:text-success-400 hover:underline"
        >
          Verificar autenticidade <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
