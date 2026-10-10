// Página pública: normas que regulamentam o uso do sistema no município
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Loader2, Scale, ShieldCheck } from 'lucide-react'
import api, { apiUrl } from '../services/api'
import CabecalhoPublico from '../components/assinatura/CabecalhoPublico'

const fmtData = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('/') : null

export default function Legislacao() {
  const { subdomain } = useParams()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get(`/tenants/${subdomain}/legislacoes`)
      .then(({ data }) => setDados(data))
      .catch(e => setErro(e.response?.data?.error || 'Não foi possível carregar a legislação.'))
  }, [subdomain])

  return (
    <div className="min-h-screen bg-ink-50">
      <CabecalhoPublico subdomain={subdomain} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">
          Legislação{dados?.municipio ? ` — ${dados.municipio}` : ''}
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Normas que regulamentam o processo eletrônico e o uso de assinaturas eletrônicas no município.
        </p>

        <div className="mt-6">
          {!dados && !erro && (
            <div className="flex items-center gap-2 text-sm text-ink-500 py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          )}
          {erro && <p className="text-sm text-danger-600 py-6">{erro}</p>}
          {dados && dados.legislacoes.length === 0 && (
            <div className="text-center py-14 text-ink-500">
              <Scale className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Nenhuma norma publicada até o momento.
            </div>
          )}

          <ul className="divide-y divide-ink-200">
            {dados?.legislacoes.map(l => (
              <li key={l.id} className="py-5">
                <h2 className="text-base font-bold text-ink-800 dark:text-white">{l.titulo}</h2>
                {(fmtData(l.data_publicacao) || l.regulamenta_assinatura) && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {fmtData(l.data_publicacao) && <span className="text-xs text-ink-500">Publicada em {fmtData(l.data_publicacao)}</span>}
                    {l.regulamenta_assinatura && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">
                        <ShieldCheck className="w-3 h-3" /> Regulamenta a assinatura eletrônica
                      </span>
                    )}
                  </div>
                )}
                {l.descricao && <p className="text-sm text-ink-700 mt-2 leading-relaxed whitespace-pre-line">{l.descricao}</p>}
                {l.tem_arquivo && (
                  <a href={apiUrl(`/tenants/${subdomain}/legislacoes/${l.id}/arquivo`)} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-success-700 dark:text-success-400 hover:underline">
                    <Eye className="w-4 h-4" /> Visualizar
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <Link to={`/${subdomain}/login`} className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-brand-600">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </Link>
      </main>
    </div>
  )
}
