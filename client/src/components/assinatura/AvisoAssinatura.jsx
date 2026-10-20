// Aviso aos servidores: a tramitação passou a exigir assinatura eletrônica
// (senha + código do app autenticador). Aparece só para quem ainda não
// cadastrou o app e some depois do cadastro. "Lembrar depois" oculta por 24 h.
import { useEffect, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useAssinatura } from './AssinaturaProvider'

const CHAVE_ADIAR = 'aviso-assinatura-adiado-ate'

export default function AvisoAssinatura() {
  const { configurarAutenticador } = useAssinatura()
  const { user } = useAuth()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    if (user?.tipo === 'jeos') return // Administrador Jeos assina sem o app autenticador
    let adiadoAte = 0
    try { adiadoAte = Number(localStorage.getItem(CHAVE_ADIAR)) || 0 } catch { /* sem armazenamento */ }
    if (Date.now() < adiadoAte) return
    api.get('/assinaturas/totp', { _silent: true })
      .then(({ data }) => setVisivel(!data.configurado))
      .catch(() => {})
  }, [user?.tipo])

  if (!visivel) return null

  const adiar = () => {
    try { localStorage.setItem(CHAVE_ADIAR, String(Date.now() + 24 * 60 * 60 * 1000)) } catch { /* ok */ }
    setVisivel(false)
  }
  const configurar = async () => {
    const ok = await configurarAutenticador().catch(() => false)
    if (ok) setVisivel(false)
  }

  return (
    <div role="status" className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-success-200 dark:border-success-800/60 bg-success-50 dark:bg-success-900/20 px-4 py-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-success-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">Novidade: assinatura eletrônica nos processos</p>
          <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">
            Abrir, tramitar, devolver, receber e concluir processos agora exige assinatura eletrônica:
            sua senha + um código de 6 dígitos do aplicativo autenticador no celular
            (Google Authenticator ou Microsoft Authenticator). Configure agora — leva menos de 1 minuto.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 sm:ml-2">
        <button onClick={configurar}
          className="px-4 py-2 rounded-lg bg-success-600 hover:bg-success-700 text-white text-sm font-semibold">
          Configurar agora
        </button>
        <button onClick={adiar} title="Lembrar depois (24 h)"
          className="p-2 rounded-lg text-ink-500 hover:text-ink-800 hover:bg-ink-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
