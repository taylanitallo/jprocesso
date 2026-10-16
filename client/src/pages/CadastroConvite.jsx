// Página pública do link de cadastro (/:subdomain/cadastro/:token): o colaborador
// cria o próprio usuário com o tipo, a secretaria e a validade que o gestor definiu.
// Ele mesmo escolhe a senha, então não precisa trocá-la no primeiro acesso.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { UserPlus, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import api from '../services/api'
import LayoutPublico, { CardPublico, usePaletaPublica } from '../components/LayoutPublico'

const SENHA_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
const TIPO_LABEL = { operacional: 'Operacional', gestor: 'Gestor' }
const soDigitos = (v) => String(v || '').replace(/\D/g, '')
const mascaraCpf = (v) => soDigitos(v).slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')

export default function CadastroConvite() {
  const { subdomain, token } = useParams()
  const p = usePaletaPublica()
  const [convite, setConvite] = useState(null)
  const [erroConvite, setErroConvite] = useState('')
  const [form, setForm] = useState({ nome: '', nomeReduzido: '', cpf: '', email: '', telefone: '', setorId: '', senha: '', confirma: '' })
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState('')

  useEffect(() => {
    api.get(`/auth/convite/${token}`)
      .then(({ data }) => setConvite(data.convite))
      .catch(err => setErroConvite(err.response?.data?.error || 'Link de cadastro inválido.'))
  }, [token])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (soDigitos(form.cpf).length !== 11) return setErro('CPF deve ter 11 dígitos.')
    if (!convite.setor && !form.setorId) return setErro('Escolha o seu setor.')
    if (!SENHA_RE.test(form.senha)) return setErro('A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número.')
    if (form.senha !== form.confirma) return setErro('A confirmação não confere com a senha.')
    setEnviando(true)
    try {
      const { data } = await api.post(`/auth/convite/${token}/cadastro`, {
        nome: form.nome, nomeReduzido: form.nomeReduzido, cpf: soDigitos(form.cpf), email: form.email,
        telefone: soDigitos(form.telefone), setorId: form.setorId || undefined, senha: form.senha,
      })
      setPronto(data.message || 'Usuário criado!')
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível criar o usuário.')
    } finally {
      setEnviando(false)
    }
  }

  const rotulo = `block text-xs font-semibold mb-1 ${p.txt2}`

  return (
    <LayoutPublico subdomain={subdomain}>
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 sm:py-10">
          <CardPublico icon={UserPlus} titulo="Cadastro de usuário">
            <div className="p-5 sm:p-6">
              {erroConvite ? (
                <div className="text-center space-y-3 py-4">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                  <p className={`text-sm ${p.txt1}`}>{erroConvite}</p>
                </div>
              ) : !convite ? (
                <p className={`text-sm ${p.txt3}`}>Abrindo o link...</p>
              ) : pronto ? (
                <div className="text-center space-y-4 py-4">
                  <CheckCircle className="h-12 w-12 text-success-500 mx-auto" />
                  <p className={`text-sm font-medium ${p.txt1}`}>{pronto}</p>
                  <Link to={`/${subdomain}/login`} className="btn-primary inline-flex">Ir para o login</Link>
                </div>
              ) : (
                <form onSubmit={enviar} className="space-y-3.5">
                  <div className={`text-sm ${p.txt2} rounded-xl border ${p.bdCard} px-4 py-3 space-y-0.5`}>
                    <p><strong className={p.txt1}>{convite.municipio}</strong></p>
                    <p>{convite.secretaria?.sigla ? `${convite.secretaria.sigla} — ` : ''}{convite.secretaria?.nome}</p>
                    {convite.setor && <p>Setor: {convite.setor.nome}</p>}
                    <p>Tipo de usuário: <strong className={p.txt1}>{TIPO_LABEL[convite.tipo] || convite.tipo}</strong></p>
                    <p className="text-xs">Link válido até {new Date(convite.expiraEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>

                  <div>
                    <label className={rotulo}>Nome completo *</label>
                    <input value={form.nome} onChange={set('nome')} required className="input-field" autoComplete="name" />
                  </div>
                  <div>
                    <label className={rotulo}>Nome reduzido</label>
                    <input value={form.nomeReduzido} onChange={set('nomeReduzido')} maxLength={60} className="input-field" placeholder="Como quer ser chamado" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={rotulo}>CPF *</label>
                      <input value={mascaraCpf(form.cpf)} onChange={e => setForm(f => ({ ...f, cpf: soDigitos(e.target.value).slice(0, 11) }))}
                        required inputMode="numeric" className="input-field" placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <label className={rotulo}>Telefone</label>
                      <input value={form.telefone} onChange={set('telefone')} inputMode="tel" className="input-field" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div>
                    <label className={rotulo}>E-mail *</label>
                    <input type="email" value={form.email} onChange={set('email')} required className="input-field" autoComplete="email" />
                  </div>
                  {!convite.setor && (
                    <div>
                      <label className={rotulo}>Setor *</label>
                      <select value={form.setorId} onChange={set('setorId')} required className="input-field">
                        <option value="">Selecione...</option>
                        {(convite.setores || []).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={rotulo}>Senha *</label>
                      <input type={verSenha ? 'text' : 'password'} value={form.senha} onChange={set('senha')} required className="input-field" autoComplete="new-password" />
                    </div>
                    <div>
                      <label className={rotulo}>Confirme a senha *</label>
                      <input type={verSenha ? 'text' : 'password'} value={form.confirma} onChange={set('confirma')} required className="input-field" autoComplete="new-password" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs ${p.txt3}`}>Mínimo de 8 caracteres, com letra e número.</p>
                    <button type="button" onClick={() => setVerSenha(v => !v)} className={`text-xs flex items-center gap-1 ${p.txtV}`}>
                      {verSenha ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {verSenha ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>

                  {erro && <p className="text-sm text-danger-700 dark:text-danger-300 bg-danger-50 dark:bg-danger-900/20 rounded-lg px-3 py-2">{erro}</p>}

                  <button type="submit" disabled={enviando} className="btn-primary w-full justify-center disabled:opacity-60">
                    {enviando ? 'Criando usuário...' : 'Criar meu usuário'}
                  </button>
                </form>
              )}
            </div>
          </CardPublico>
        </div>
      </main>
    </LayoutPublico>
  )
}
