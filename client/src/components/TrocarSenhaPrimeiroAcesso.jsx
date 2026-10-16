// Primeiro acesso: quem foi cadastrado (ou teve a senha redefinida) por outra pessoa
// precisa trocar a senha antes de usar o sistema — assim só ele sabe a senha.
// O servidor bloqueia as demais rotas enquanto a troca não é feita (codigo TROCAR_SENHA).
import { useState } from 'react'
import { KeyRound, Eye, EyeOff, LogOut } from 'lucide-react'
import api, { setAccessToken } from '../services/api'
import { useAuth } from '../context/AuthContext'

const SENHA_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

function CampoSenha({ label, value, onChange, autoFocus, autoComplete }) {
  const [ver, setVer] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1">{label}</label>
      <div className="relative">
        <input type={ver ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          autoFocus={autoFocus} autoComplete={autoComplete} required className="input-field pr-10" />
        <button type="button" onClick={() => setVer(v => !v)} tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-600"
          title={ver ? 'Ocultar' : 'Mostrar'}>
          {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export default function TrocarSenhaPrimeiroAcesso() {
  const { user, refreshUser, logout } = useAuth()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!SENHA_RE.test(nova)) return setErro('A nova senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número.')
    if (nova !== confirma) return setErro('A confirmação não confere com a nova senha.')
    if (nova === atual) return setErro('A nova senha precisa ser diferente da atual.')
    setSalvando(true)
    try {
      const { data } = await api.post('/auth/primeiro-acesso/senha', { senhaAtual: atual, novaSenha: nova })
      setAccessToken(data.token)
      await refreshUser()
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível trocar a senha.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <form onSubmit={enviar} className="card w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-info-900/30 flex items-center justify-center shrink-0">
            <KeyRound className="h-5 w-5 text-brand-600 dark:text-info-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink-900">Crie a sua senha</h1>
            <p className="text-sm text-ink-500 mt-0.5">
              Olá, {user?.nomeReduzido || user?.nome?.split(' ')[0]}. Este é o seu primeiro acesso: troque a senha
              que você recebeu por uma que só você saiba.
            </p>
          </div>
        </div>

        <CampoSenha label="Senha atual (a que você recebeu)" value={atual} onChange={setAtual} autoFocus autoComplete="current-password" />
        <CampoSenha label="Nova senha" value={nova} onChange={setNova} autoComplete="new-password" />
        <CampoSenha label="Confirme a nova senha" value={confirma} onChange={setConfirma} autoComplete="new-password" />
        <p className="text-xs text-ink-400">Mínimo de 8 caracteres, com pelo menos uma letra e um número.</p>

        {erro && <p className="text-sm text-danger-700 dark:text-danger-300 bg-danger-50 dark:bg-danger-900/20 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={logout} className="btn-secondary flex items-center gap-1.5">
            <LogOut className="h-4 w-4" /> Sair
          </button>
          <button type="submit" disabled={salvando} className="btn-primary disabled:opacity-60">
            {salvando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>
      </form>
    </div>
  )
}
