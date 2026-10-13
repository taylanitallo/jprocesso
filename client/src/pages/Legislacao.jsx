// Página pública: normas que regulamentam o uso do sistema no município
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Scale, ShieldCheck } from 'lucide-react'
import api, { apiUrl } from '../services/api'
import LayoutPublico, { CardPublico, usePaletaPublica } from '../components/LayoutPublico'

const fmtData = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('/') : null

export default function Legislacao() {
  const { subdomain } = useParams()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const p = usePaletaPublica()

  useEffect(() => {
    api.get(`/tenants/${subdomain}/legislacoes`)
      .then(({ data }) => setDados(data))
      .catch(e => setErro(e.response?.data?.error || 'Não foi possível carregar a legislação.'))
  }, [subdomain])

  const lista = dados?.legislacoes || []

  return (
    <LayoutPublico subdomain={subdomain}>
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          <CardPublico className="p-6 shadow-[0_0_40px_rgba(139,92,246,0.12)]">
            <h1 className={`text-lg font-bold ${p.txt1} mb-1`}>
              Legislação{dados?.municipio ? ` — ${dados.municipio}` : ''}
            </h1>
            <p className={`text-sm ${p.txt3}`}>
              Normas que regulamentam o processo eletrônico e o uso de assinaturas eletrônicas no município.
            </p>
          </CardPublico>

          <CardPublico
            icon={Scale}
            titulo="Normas publicadas"
            extra={dados && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                {lista.length}
              </span>
            )}
          >
            {!dados && !erro && (
              <div className="text-center py-14">
                <div className={`inline-block animate-spin rounded-full h-9 w-9 border-2 border-ink-200 ${p.mc ? 'border-t-violet-600' : 'border-t-violet-500'}`} />
                <p className={`mt-4 ${p.txt3} text-sm`}>Carregando...</p>
              </div>
            )}

            {erro && <p className="text-sm text-danger-600 text-center px-5 py-10">{erro}</p>}

            {dados && lista.length === 0 && (
              <div className="text-center py-14 px-5">
                <Scale className={`h-10 w-10 mx-auto mb-3 ${p.mc ? 'text-ink-400' : 'text-ink-500'}`} />
                <p className={`text-sm ${p.txt3}`}>Nenhuma norma publicada até o momento.</p>
              </div>
            )}

            {lista.length > 0 && (
              <ul className={`divide-y ${p.mc ? 'divide-ink-200' : 'divide-ink-200/50'}`}>
                {lista.map(l => (
                  <li key={l.id} className="px-5 py-5">
                    <h2 className={`text-base font-bold ${p.txt1}`}>{l.titulo}</h2>
                    {(fmtData(l.data_publicacao) || l.regulamenta_assinatura) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {fmtData(l.data_publicacao) && <span className={`text-xs ${p.txt3}`}>Publicada em {fmtData(l.data_publicacao)}</span>}
                        {l.regulamenta_assinatura && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            <ShieldCheck className="w-3 h-3" /> Regulamenta a assinatura eletrônica
                          </span>
                        )}
                      </div>
                    )}
                    {l.descricao && <p className={`text-sm ${p.txt2} mt-2 leading-relaxed whitespace-pre-line`}>{l.descricao}</p>}
                    {l.tem_arquivo && (
                      <a href={apiUrl(`/tenants/${subdomain}/legislacoes/${l.id}/arquivo`)} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                        <Eye className="w-4 h-4" /> Visualizar
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardPublico>

          <Link
            to={`/${subdomain}/login`}
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${p.mc ? 'text-violet-700 hover:text-violet-900' : 'text-violet-400 hover:text-violet-300'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao login
          </Link>
        </div>
      </div>
    </LayoutPublico>
  )
}
