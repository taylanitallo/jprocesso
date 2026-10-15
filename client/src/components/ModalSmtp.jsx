import { useEffect, useState } from 'react'
import { Mail, Send, X, CheckCircle, AlertTriangle } from 'lucide-react'
import api from '../services/api'

/**
 * Servidor de e-mail (SMTP) do sistema — um só para todos os municípios.
 * Usado para enviar o código de assinatura por e-mail (alternativa ao app).
 */
export default function ModalSmtp({ onClose }) {
  const [form, setForm] = useState({ host: '', porta: 587, seguranca: 'starttls', usuario: '', senha: '', remetente_nome: 'jProcesso', remetente_email: '' })
  const [info, setInfo] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testePara, setTestePara] = useState('')
  const [testando, setTestando] = useState(false)
  const [msg, setMsg] = useState(null) // { tipo: 'ok' | 'erro', texto }

  useEffect(() => {
    api.get('/superadmin/smtp').then(({ data }) => {
      setInfo(data)
      if (data?.host) {
        setForm(f => ({ ...f, host: data.host, porta: data.porta || 587, seguranca: data.seguranca || 'starttls', usuario: data.usuario || '',
          remetente_nome: data.remetente_nome || 'jProcesso', remetente_email: data.remetente_email || '' }))
      }
    }).catch(() => setMsg({ tipo: 'erro', texto: 'Não foi possível carregar a configuração.' }))
      .finally(() => setCarregando(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true); setMsg(null)
    try {
      const { data } = await api.put('/superadmin/smtp', form)
      setInfo(data); set('senha', '')
      setMsg({ tipo: 'ok', texto: 'Configuração salva. Envie um e-mail de teste para conferir.' })
    } catch (err) {
      setMsg({ tipo: 'erro', texto: err.response?.data?.error || 'Erro ao salvar.' })
    } finally { setSalvando(false) }
  }
  const testar = async () => {
    setTestando(true); setMsg(null)
    try {
      await api.post('/superadmin/smtp/testar', { para: testePara })
      setMsg({ tipo: 'ok', texto: `E-mail de teste enviado para ${testePara}. Confira a caixa de entrada (e o spam).` })
    } catch (err) {
      setMsg({ tipo: 'erro', texto: err.response?.data?.error || 'Falha no envio de teste.' })
    } finally { setTestando(false) }
  }

  const campo = 'w-full px-3 py-2 border border-ink-300 rounded-lg text-sm bg-surface text-ink-900'
  const rotulo = 'block text-xs font-semibold text-ink-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600"><Mail className="h-5 w-5 text-white" /></span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Servidor de e-mail (SMTP)</h2>
              <p className="text-xs text-ink-500">Um só para todos os municípios · envia o código de assinatura para quem está sem o celular</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>

        {carregando ? (
          <p className="p-6 text-sm text-ink-500">Carregando...</p>
        ) : (
          <form onSubmit={salvar} className="space-y-4 p-5">
            <div className={`rounded-lg px-3 py-2 text-xs ${info?.configurado ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
              {info?.configurado
                ? <>Configurado{info.atualizado_em ? ` · atualizado em ${new Date(info.atualizado_em).toLocaleString('pt-BR')}` : ''}{info.atualizado_por ? ` por ${info.atualizado_por}` : ''}. A opção "receber código por e-mail" já aparece na assinatura de quem usa o aplicativo.</>
                : 'Ainda não configurado: a assinatura só funciona com o aplicativo autenticador.'}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className={rotulo}>Servidor (host) *</label>
                <input className={campo} value={form.host} onChange={e => set('host', e.target.value)} placeholder="smtp.gmail.com" required />
              </div>
              <div className="sm:col-span-1">
                <label className={rotulo}>Porta *</label>
                <input className={campo} type="number" value={form.porta} onChange={e => {
                  const p = Number(e.target.value)
                  setForm(f => ({ ...f, porta: p, seguranca: p === 465 ? 'ssl' : p === 587 ? 'starttls' : f.seguranca }))
                }} required />
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Segurança</label>
                <select className={campo} value={form.seguranca} onChange={e => set('seguranca', e.target.value)}>
                  <option value="starttls">STARTTLS (porta 587)</option>
                  <option value="ssl">SSL/TLS (porta 465)</option>
                  <option value="nenhuma">Nenhuma</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className={rotulo}>Usuário</label>
                <input className={campo} value={form.usuario} onChange={e => set('usuario', e.target.value)} placeholder="nao-responda@seudominio.com.br" autoComplete="off" />
              </div>
              <div className="sm:col-span-3">
                <label className={rotulo}>Senha {info?.senha_definida && <span className="font-normal text-ink-400">(em branco = manter a atual)</span>}</label>
                <input className={campo} type="password" value={form.senha} onChange={e => set('senha', e.target.value)} autoComplete="new-password"
                  placeholder={info?.senha_definida ? '••••••••' : 'Senha ou senha de aplicativo'} />
              </div>
              <div className="sm:col-span-3">
                <label className={rotulo}>Nome do remetente</label>
                <input className={campo} value={form.remetente_nome} onChange={e => set('remetente_nome', e.target.value)} placeholder="jProcesso" />
              </div>
              <div className="sm:col-span-3">
                <label className={rotulo}>E-mail do remetente *</label>
                <input className={campo} type="email" value={form.remetente_email} onChange={e => set('remetente_email', e.target.value)} placeholder="nao-responda@seudominio.com.br" required />
              </div>
            </div>
            <p className="text-[11px] text-ink-500">A senha fica guardada cifrada e nunca é mostrada de volta. No Gmail/Google Workspace e no Microsoft 365, use uma <strong>senha de aplicativo</strong>.</p>

            {msg && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${msg.tipo === 'ok' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                {msg.tipo === 'ok' ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{msg.texto}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Fechar</button>
              <button type="submit" disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>

            <div className="border-t border-ink-200 pt-4">
              <label className={rotulo}>Enviar e-mail de teste</label>
              <div className="flex gap-2">
                <input className={campo} type="email" value={testePara} onChange={e => setTestePara(e.target.value)} placeholder="seu-email@exemplo.com" />
                <button type="button" onClick={testar} disabled={testando || !info?.configurado || !testePara}
                  className="btn-secondary shrink-0 flex items-center gap-1.5">
                  <Send className="h-4 w-4" /> {testando ? 'Enviando...' : 'Enviar teste'}
                </button>
              </div>
              {!info?.configurado && <p className="mt-1 text-[11px] text-ink-400">Salve a configuração antes de testar.</p>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
