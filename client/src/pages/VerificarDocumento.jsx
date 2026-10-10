// Página pública: conferência de autenticidade de atos assinados eletronicamente
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Search, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import api from '../services/api'
import CabecalhoPublico from '../components/assinatura/CabecalhoPublico'

const CHECKS = [
  ['assinatura_valida', 'Assinatura criptográfica confere com a chave do sistema'],
  ['conteudo_integro',  'Conteúdo assinado não foi alterado'],
  ['registro_confere',  'Registro no processo corresponde ao que foi assinado'],
  ['encadeamento_ok',   'Sequência de atos do processo está íntegra'],
  ['crc_confere',       'Código CRC confere'],
]

const fmtDataHora = (iso) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

export default function VerificarDocumento() {
  const { subdomain } = useParams()
  const [params, setParams] = useSearchParams()
  const [codigo, setCodigo] = useState(params.get('codigo') || '')
  const [crc, setCrc] = useState(params.get('crc') || '')
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  const verificar = async (cod = codigo, c = crc) => {
    setErro(''); setResultado(null)
    if (!cod.trim() || !c.trim()) { setErro('Informe o código verificador e o código CRC.'); return }
    setCarregando(true)
    setParams({ codigo: cod.trim(), crc: c.trim().toUpperCase() }, { replace: true })
    try {
      const { data } = await api.get('/assinaturas/verificar', { params: { codigo: cod.trim(), crc: c.trim() } })
      setResultado(data)
    } catch (e) {
      setErro(e.response?.data?.error || 'Não foi possível verificar agora. Tente novamente.')
    } finally { setCarregando(false) }
  }

  // Link da tarja (QR/URL) já traz os códigos → verifica direto
  useEffect(() => {
    if (params.get('codigo') && params.get('crc')) verificar(params.get('codigo'), params.get('crc'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const a = resultado?.assinatura

  return (
    <div className="min-h-screen bg-ink-50">
      <CabecalhoPublico subdomain={subdomain} />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Verificar documento</h1>
          <p className="text-sm text-ink-600 mt-1">
            Confira a autenticidade de um ato assinado eletronicamente informando o código verificador e o código CRC
            presentes na tarja de assinatura.
          </p>
        </div>

        <form onSubmit={e => { e.preventDefault(); verificar() }}
          className="card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Código verificador</label>
            <input value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 12))}
              inputMode="numeric" placeholder="Ex.: 51138820" className="input-field font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Código CRC</label>
            <input value={crc} onChange={e => setCrc(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 8).toUpperCase())}
              placeholder="Ex.: AD71E1B3" className="input-field font-mono uppercase" />
          </div>
          <button type="submit" disabled={carregando}
            className="h-10 inline-flex items-center justify-center gap-2 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-60">
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Verificar
          </button>
        </form>

        {erro && (
          <div role="alert" className="card p-4 flex items-start gap-3 border-danger-200 dark:border-danger-700">
            <ShieldAlert className="w-5 h-5 text-danger-600 shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700 dark:text-danger-300">{erro}</p>
          </div>
        )}

        {resultado && a && (
          <section className="card overflow-hidden">
            <div className={`px-5 py-4 flex items-center gap-3 ${resultado.valida
              ? 'bg-success-50 dark:bg-success-900/20 border-b border-success-200 dark:border-success-800'
              : 'bg-danger-50 dark:bg-danger-900/20 border-b border-danger-200 dark:border-danger-800'}`}>
              {resultado.valida
                ? <ShieldCheck className="w-7 h-7 text-success-600 shrink-0" />
                : <ShieldAlert className="w-7 h-7 text-danger-600 shrink-0" />}
              <div>
                <p className={`font-bold ${resultado.valida ? 'text-success-800 dark:text-success-300' : 'text-danger-800 dark:text-danger-300'}`}>
                  {resultado.valida ? 'Assinatura válida' : 'Assinatura NÃO confere'}
                </p>
                <p className="text-xs text-ink-600">
                  {resultado.valida
                    ? 'O ato foi assinado pela pessoa indicada e não sofreu alteração desde a assinatura.'
                    : 'Foi detectada divergência entre o ato registrado e o que foi assinado. Não considere este documento autêntico.'}
                </p>
              </div>
            </div>

            <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Ato', a.ato_descricao],
                ['Processo', a.processo_numero],
                ['Assunto', a.processo_assunto],
                ['Município', a.municipio],
                ['Assinado por', a.signatario_nome],
                ['CPF', a.signatario_cpf],
                ['Cargo', a.signatario_cargo],
                ['Data e hora', fmtDataHora(a.assinado_em)],
                ['Tipo de assinatura', 'Eletrônica avançada — senha + código de verificação (app autenticador)'],
                ['Fundamento legal', a.fundamento],
                ['Código verificador', a.codigo_verificador],
                ['Código CRC', a.codigo_crc],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{k}</dt>
                  <dd className="text-ink-900 dark:text-white font-medium break-words">{v}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Resumo criptográfico (SHA-256)</dt>
                <dd className="font-mono text-xs text-ink-700 break-all">{a.hash_conteudo}</dd>
              </div>
            </dl>

            <div className="px-5 pb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-2">Conferências realizadas</p>
              <ul className="space-y-1.5">
                {CHECKS.map(([k, label]) => (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    {resultado.checks[k]
                      ? <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
                      : <XCircle className="w-4 h-4 text-danger-600 shrink-0" />}
                    <span className={resultado.checks[k] ? 'text-ink-700' : 'text-danger-700 dark:text-danger-300 font-medium'}>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <Link to={`/${subdomain}/login`} className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-brand-600">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </Link>
      </main>
    </div>
  )
}
