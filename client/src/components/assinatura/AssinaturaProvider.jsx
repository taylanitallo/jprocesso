// ══════════════════════════════════════════════════════════════════════════════
//  Assinatura eletrônica avançada (Lei 14.063/2020) — senha + código do app
//
//  Uso:  const { assinar } = useAssinatura()
//        const resultado = await assinar({
//          titulo: 'Tramitar processo',
//          resumo: <p>…</p>,                       // o que está sendo assinado
//          executar: (cred) => api.post(url, { ...dados, ...cred }),
//        })
//        // resultado = resposta do executar, ou null se o usuário cancelou.
//
//  Se o usuário ainda não tiver o app autenticador, o cadastro (QR code) é
//  feito ali mesmo. Erros de senha/código mantêm o modal aberto para corrigir;
//  qualquer outro erro é repassado a quem chamou.
// ══════════════════════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ShieldCheck, Smartphone, X, Loader2, AlertTriangle, KeyRound } from 'lucide-react'
import api from '../../services/api'

const AssinaturaContext = createContext({ assinar: async () => null, configurarAutenticador: async () => false })
export const useAssinatura = () => useContext(AssinaturaContext)

// Erros que o próprio modal resolve (o usuário corrige e tenta de novo)
const ERROS_DE_CREDENCIAL = ['SENHA_OBRIGATORIA', 'SENHA_INVALIDA', 'CODIGO_OBRIGATORIO', 'TOTP_INVALIDO', 'TOTP_REUTILIZADO']

export default function AssinaturaProvider({ children }) {
  const [pedido, setPedido] = useState(null) // { titulo, resumo, executar }
  const promessa = useRef(null)

  const assinar = useCallback((opcoes) => new Promise((resolve, reject) => {
    promessa.current = { resolve, reject }
    setPedido(opcoes)
  }), [])

  // Só cadastra o app autenticador (sem assinar nada). Resolve true se concluiu.
  const configurarAutenticador = useCallback(() => new Promise((resolve, reject) => {
    promessa.current = { resolve, reject }
    setPedido({ modo: 'cadastro', titulo: 'Preparar sua assinatura eletrônica' })
  }), [])

  const finalizar = (tipo, valor) => {
    const p = promessa.current
    promessa.current = null
    setPedido(null)
    if (p) p[tipo](valor)
  }

  return (
    <AssinaturaContext.Provider value={{ assinar, configurarAutenticador }}>
      {children}
      {pedido && (
        <ModalAssinatura
          pedido={pedido}
          onSucesso={(r) => finalizar('resolve', r)}
          onCancelar={() => finalizar('resolve', null)}
          onErro={(e) => finalizar('reject', e)}
        />
      )}
    </AssinaturaContext.Provider>
  )
}

function ModalAssinatura({ pedido, onSucesso, onCancelar, onErro }) {
  const soCadastro = pedido.modo === 'cadastro'
  const [etapa, setEtapa] = useState(soCadastro ? 'cadastro' : 'assinar') // 'assinar' | 'cadastro'
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cadastro, setCadastro] = useState(null) // { qrcode, segredo }

  const iniciarCadastro = async () => {
    setEtapa('cadastro'); setErro(''); setCodigo('')
    try {
      const { data } = await api.post('/assinaturas/totp/iniciar')
      setCadastro(data)
    } catch (e) {
      if (soCadastro && e.response?.data?.codigo === 'TOTP_JA_CONFIGURADO') return onSucesso(true)
      setErro(e.response?.data?.error || 'Não foi possível iniciar o cadastro do aplicativo.')
    }
  }

  // Modo "só cadastro" (aviso do sistema): já abre gerando o QR code
  useEffect(() => { if (soCadastro) iniciarCadastro() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const confirmarCadastro = async (e) => {
    e.preventDefault()
    setErro(''); setEnviando(true)
    try {
      await api.post('/assinaturas/totp/ativar', { codigo })
      if (soCadastro) return onSucesso(true)
      setCadastro(null); setCodigo(''); setEtapa('assinar')
    } catch (er) {
      setErro(er.response?.data?.error || 'Código inválido.')
    } finally { setEnviando(false) }
  }

  const enviarAssinatura = async (e) => {
    e.preventDefault()
    setErro('')
    if (!senha) return setErro('Informe sua senha.')
    if (!/^\d{6}$/.test(codigo)) return setErro('Informe os 6 dígitos do aplicativo autenticador.')
    setEnviando(true)
    try {
      const resultado = await pedido.executar({ senhaConfirmacao: senha, codigoTotp: codigo })
      onSucesso(resultado)
    } catch (er) {
      const cod = er.response?.data?.codigo
      if (cod === 'TOTP_NAO_CONFIGURADO') { setEnviando(false); return iniciarCadastro() }
      if (ERROS_DE_CREDENCIAL.includes(cod)) {
        setErro(er.response.data.error)
        setCodigo('')
        if (cod === 'SENHA_INVALIDA') setSenha('')
        setEnviando(false)
        return
      }
      onErro(er)
    }
  }

  const campoCodigo = (
    <input
      inputMode="numeric" autoComplete="one-time-code" maxLength={6}
      value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      className="input-field text-center text-2xl font-mono tracking-[0.5em]"
    />
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-ink-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900 dark:text-white">
                {etapa === 'cadastro' ? 'Configurar aplicativo autenticador' : 'Assinatura eletrônica'}
              </h2>
              <p className="text-xs text-ink-500">{pedido.titulo}</p>
            </div>
          </div>
          <button onClick={onCancelar} disabled={enviando}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-ink-100 disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        {erro && (
          <div role="alert" className="mx-5 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-sm text-danger-700 dark:text-danger-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{erro}</span>
          </div>
        )}

        {etapa === 'assinar' ? (
          <form onSubmit={enviarAssinatura} className="p-5 space-y-4">
            {pedido.resumo && (
              <div className="rounded-xl bg-ink-50 border border-ink-100 p-3 text-sm text-ink-700 space-y-1">{pedido.resumo}</div>
            )}
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Senha</label>
              <input type="password" autoFocus value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" className="input-field" autoComplete="current-password" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Código do aplicativo autenticador
              </label>
              {campoCodigo}
            </div>
            <p className="text-[11px] leading-relaxed text-ink-500">
              Assinatura eletrônica avançada (Lei Federal nº 14.063/2020, art. 4º, II), de uso pessoal e intransferível.
              O ato receberá código verificador para conferência de autenticidade.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onCancelar} disabled={enviando} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={enviando}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-success-600 hover:bg-success-700 text-white text-sm font-semibold disabled:opacity-50">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {enviando ? 'Assinando...' : 'Assinar'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={confirmarCadastro} className="p-5 space-y-4">
            <p className="text-sm text-ink-700">
              Para assinar eletronicamente, use um aplicativo autenticador no seu celular
              (Google Authenticator, Microsoft Authenticator ou similar). Isto é feito uma única vez.
            </p>
            <ol className="text-sm text-ink-600 list-decimal pl-5 space-y-1">
              <li>Abra o aplicativo e toque em adicionar conta (<strong>+</strong>).</li>
              <li>Escaneie o QR code abaixo.</li>
              <li>Digite o código de 6 dígitos que aparecer.</li>
            </ol>
            <div className="flex flex-col items-center gap-2">
              {cadastro?.qrcode
                ? <img src={cadastro.qrcode} alt="QR code do aplicativo autenticador" className="w-48 h-48 rounded-lg border border-ink-200 bg-white p-1" />
                : <div className="w-48 h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-ink-400" /></div>}
              {cadastro?.segredo && (
                <p className="text-[11px] text-ink-500 text-center">
                  Sem câmera? Digite a chave no app:<br />
                  <code className="font-mono text-xs text-ink-700 break-all select-all">{cadastro.segredo.match(/.{1,4}/g).join(' ')}</code>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Código exibido no aplicativo</label>
              {campoCodigo}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancelar} disabled={enviando} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={enviando || codigo.length !== 6 || !cadastro}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50">
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
