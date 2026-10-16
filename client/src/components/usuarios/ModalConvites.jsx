// Links de cadastro (Organização › Usuários): o gestor escolhe o tipo de usuário e a
// validade, gera o link + QR Code e manda ao grupo dos colaboradores. Cada um cria o
// próprio usuário pela página /:subdomain/cadastro/:token.
// Gestor: só operacionais da própria secretaria. Administrador: gestor ou operacional.
// Regras conferidas no servidor (authController › criarConvite).
import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Link2, X, Copy, Check, Download, Ban, QrCode, MessageCircle } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const VALIDADES = [
  { valor: '1',  rotulo: '1 dia' },
  { valor: '3',  rotulo: '3 dias' },
  { valor: '7',  rotulo: '7 dias' },
  { valor: '15', rotulo: '15 dias' },
  { valor: '30', rotulo: '30 dias' },
  { valor: 'data', rotulo: 'Escolher data e hora…' },
]
const TIPO_LABEL = { operacional: 'Operacional', gestor: 'Gestor' }
const fmt = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
// valor de <input type="datetime-local"> no fuso local
const paraInputLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export default function ModalConvites({ secretarias = [], setores = [], onClose }) {
  const { user, tenant } = useAuth()
  const ehGestor = user?.tipo === 'gestor'
  const minhaSec = user?.secretaria?.id || user?.secretariaId || ''
  const subdomain = tenant?.subdominio || window.location.pathname.split('/')[1]

  const [tipo, setTipo] = useState('operacional')
  const [secretariaId, setSecretariaId] = useState(ehGestor ? minhaSec : '')
  const [setorId, setSetorId] = useState('')
  const [validade, setValidade] = useState('7')
  const [dataFim, setDataFim] = useState(paraInputLocal(new Date(Date.now() + 7 * 86400000)))
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [atual, setAtual] = useState(null)     // convite recém-gerado ou escolhido na lista
  const [lista, setLista] = useState([])
  const [copiado, setCopiado] = useState(false)
  const qrRef = useRef(null)

  const linkDe = (c) => `${window.location.origin}/${subdomain}/cadastro/${c.token}`
  const carregar = () => api.get('/auth/convites').then(({ data }) => setLista(data.convites || [])).catch(() => {})
  useEffect(() => { carregar() }, [])

  const setoresDaSec = setores.filter(s => String(s.secretaria_id || s.secretariaId) === String(secretariaId))
  const secretariasOpcoes = ehGestor ? secretarias.filter(s => String(s.id) === String(minhaSec)) : secretarias

  const gerar = async () => {
    setErro('')
    if (!secretariaId) return setErro('Escolha a secretaria.')
    const expiraEm = validade === 'data'
      ? new Date(dataFim)
      : new Date(Date.now() + Number(validade) * 86400000)
    if (Number.isNaN(expiraEm.getTime()) || expiraEm <= new Date()) return setErro('Escolha uma validade no futuro.')
    setGerando(true)
    try {
      const { data } = await api.post('/auth/convites', { tipo, secretariaId, setorId: setorId || null, expiraEm: expiraEm.toISOString() })
      const sec = secretarias.find(s => String(s.id) === String(secretariaId))
      setAtual({ ...data.convite, secretaria_sigla: sec?.sigla, secretaria_nome: sec?.nome,
        setor_nome: setores.find(s => String(s.id) === String(setorId))?.nome })
      carregar()
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível gerar o link.')
    } finally {
      setGerando(false)
    }
  }

  const copiar = async (c) => {
    try { await navigator.clipboard.writeText(linkDe(c)); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sem clipboard */ }
  }

  const mensagem = (c) => `Faça o seu cadastro no jProcesso (${c.secretaria_sigla || c.secretaria_nome || ''}) pelo link abaixo. Válido até ${fmt(c.expira_em)}.\n${linkDe(c)}`

  // QR Code em PNG para postar no grupo
  const baixarQr = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const tam = 600, borda = 40
      const canvas = document.createElement('canvas')
      canvas.width = tam + borda * 2; canvas.height = tam + borda * 2
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, borda, borda, tam, tam)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'qrcode-cadastro.png'
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
  }

  const desativar = async (c) => {
    if (!confirm('Desativar este link? Quem ainda não se cadastrou não vai conseguir usar.')) return
    await api.delete(`/auth/convites/${c.id}`).catch(err => alert(err.response?.data?.error || 'Erro ao desativar'))
    if (atual?.id === c.id) setAtual(null)
    carregar()
  }

  const situacao = (c) => !c.ativo ? 'Desativado' : new Date(c.expira_em) <= new Date() ? 'Expirado' : 'Ativo'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl max-w-3xl w-full shadow-xl max-h-[92vh] flex flex-col">
        <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-brand-600" /> Link de cadastro
          </h2>
          <button onClick={onClose} className="p-1.5 text-ink-400 hover:text-ink-600 rounded-lg"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <p className="text-sm text-ink-500">
            Gere um link (e QR Code) para mandar ao grupo dos seus colaboradores. Cada um cria o próprio usuário,
            já com o tipo e a secretaria escolhidos aqui. O link para de funcionar na data de validade.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Formulário */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Tipo de usuário</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="input-field" disabled={ehGestor}>
                  <option value="operacional">Operacional</option>
                  {!ehGestor && <option value="gestor">Gestor</option>}
                </select>
                {ehGestor && <p className="text-xs text-ink-400 mt-1">Gestores convidam só operacionais.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Secretaria</label>
                <select value={secretariaId} onChange={e => { setSecretariaId(e.target.value); setSetorId('') }} className="input-field" disabled={ehGestor}>
                  <option value="">Selecione...</option>
                  {secretariasOpcoes.map(s => <option key={s.id} value={s.id}>{s.sigla} - {s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Setor</label>
                <select value={setorId} onChange={e => setSetorId(e.target.value)} className="input-field" disabled={!secretariaId}>
                  <option value="">Cada um escolhe o seu</option>
                  {setoresDaSec.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Validade do link</label>
                <select value={validade} onChange={e => setValidade(e.target.value)} className="input-field">
                  {VALIDADES.map(v => <option key={v.valor} value={v.valor}>{v.rotulo}</option>)}
                </select>
                {validade === 'data' && (
                  <input type="datetime-local" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    min={paraInputLocal(new Date())} className="input-field mt-2" />
                )}
              </div>
              {erro && <p className="text-sm text-danger-700 dark:text-danger-300">{erro}</p>}
              <button type="button" onClick={gerar} disabled={gerando} className="btn-primary w-full justify-center disabled:opacity-60">
                <QrCode className="h-4 w-4" /> {gerando ? 'Gerando...' : 'Gerar link e QR Code'}
              </button>
            </div>

            {/* Link gerado */}
            <div className="rounded-xl border border-ink-200 p-4 flex flex-col items-center justify-center text-center min-h-[280px]">
              {atual ? (
                <>
                  <div ref={qrRef} className="bg-white p-3 rounded-lg">
                    <QRCode value={linkDe(atual)} size={176} />
                  </div>
                  <p className="text-xs text-ink-500 mt-2">
                    {TIPO_LABEL[atual.tipo]} · {atual.secretaria_sigla || atual.secretaria_nome}{atual.setor_nome ? ` · ${atual.setor_nome}` : ''}
                  </p>
                  <p className="text-xs text-ink-500">Válido até {fmt(atual.expira_em)}</p>
                  <p className="text-[11px] font-mono text-ink-600 break-all mt-2 bg-ink-50 rounded px-2 py-1 w-full">{linkDe(atual)}</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    <button type="button" onClick={() => copiar(atual)} className="btn-secondary text-xs h-8 px-3 flex items-center gap-1.5">
                      {copiado ? <Check className="h-3.5 w-3.5 text-success-600" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? 'Copiado' : 'Copiar link'}
                    </button>
                    <button type="button" onClick={baixarQr} className="btn-secondary text-xs h-8 px-3 flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Baixar QR Code
                    </button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(mensagem(atual))}`} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-xs h-8 px-3 flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-400">O link e o QR Code aparecem aqui.</p>
              )}
            </div>
          </div>

          {/* Links já gerados */}
          <div>
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">{ehGestor ? 'Seus links' : 'Links gerados'}</p>
            {lista.length === 0 ? (
              <p className="text-sm text-ink-400">Nenhum link gerado ainda.</p>
            ) : (
              <div className="divide-y divide-ink-100 border border-ink-200 rounded-lg">
                {lista.map(c => {
                  const sit = situacao(c)
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-ink-800 truncate">
                          {TIPO_LABEL[c.tipo] || c.tipo} · {c.secretaria_sigla || c.secretaria_nome}{c.setor_nome ? ` · ${c.setor_nome}` : ''}
                        </p>
                        <p className="text-xs text-ink-400">
                          até {fmt(c.expira_em)} · {c.usos} cadastro{c.usos === 1 ? '' : 's'}{!ehGestor && c.criado_por_nome ? ` · por ${c.criado_por_nome}` : ''}
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        sit === 'Ativo' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' : 'bg-ink-100 text-ink-500'}`}>{sit}</span>
                      {sit === 'Ativo' && (
                        <>
                          <button type="button" onClick={() => setAtual(c)} title="Ver QR Code e link" className="text-brand-600 hover:text-brand-800"><QrCode className="h-4 w-4" /></button>
                          <button type="button" onClick={() => desativar(c)} title="Desativar link" className="text-danger-600 hover:text-danger-800"><Ban className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
