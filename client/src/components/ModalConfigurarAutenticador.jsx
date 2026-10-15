import { useEffect, useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import api from '../services/api'

/**
 * Configuração do app autenticador de outro usuário, feita junto com ele:
 * o QR code aparece aqui, o usuário escaneia no próprio celular e informa
 * o código de 6 dígitos que o app mostrar.
 */
export default function ModalConfigurarAutenticador({ usuario, onFechar, onConcluido }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api.post(`/assinaturas/totp/iniciar-para/${usuario.id}`)
      .then(r => setDados(r.data))
      .catch(err => setErro(err.response?.data?.error || 'Não foi possível iniciar a configuração.'))
  }, [usuario.id])

  const ativar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      await api.post(`/assinaturas/totp/ativar-para/${usuario.id}`, { codigo: codigo.replace(/\D/g, '') })
      onConcluido?.()
    } catch (err) {
      setErro(err.response?.data?.error || 'Código inválido. Confira o horário do celular e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-base font-semibold text-ink-900">Configurar autenticador</h2>
              <p className="text-xs text-ink-500">{usuario.nome}</p>
            </div>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={ativar} className="space-y-3 p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
            <li>No celular <strong>do próprio usuário</strong>, abra o Google Authenticator ou o Microsoft Authenticator.</li>
            <li>Toque em adicionar conta e escaneie o QR code abaixo.</li>
            <li>Digite aqui o código de 6 dígitos que aparecer no app.</li>
          </ol>

          <div className="flex justify-center rounded-lg border border-ink-200 bg-white p-3">
            {dados?.qrcode
              ? <img src={dados.qrcode} alt="QR code do autenticador" className="h-48 w-48" />
              : <div className="flex h-48 w-48 items-center justify-center text-xs text-ink-400">{erro ? '—' : 'Gerando QR code...'}</div>}
          </div>
          {dados?.segredo && (
            <p className="text-center text-[11px] text-ink-500">
              Sem câmera? Digite a chave no app: <span className="font-mono text-ink-700 break-all">{dados.segredo}</span>
            </p>
          )}

          <input value={codigo} onChange={e => setCodigo(e.target.value)} inputMode="numeric" maxLength={7}
            placeholder="000000" className="input-field text-center font-mono text-lg tracking-[0.4em]" disabled={!dados} autoFocus />
          {erro && <p className="text-sm text-danger-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onFechar} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={!dados || codigo.replace(/\D/g, '').length !== 6 || enviando} className="btn-primary">
              {enviando ? 'Ativando...' : 'Ativar autenticador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
