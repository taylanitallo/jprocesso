// Configurações › Layout › Timbrado da secretaria.
// O gestor (e administrador/Jeos) define o timbrado da própria secretaria, com a
// opacidade. Ele vai em todos os PDFs e impressões gerados pelos usuários da
// secretaria — relatórios, ordens de compra/serviço, despachos, ofícios,
// exportações —, exceto os DIDs, que seguem o timbrado do município (superadmin).
// Servidor: GET/PUT /organizacao/secretarias/:id/timbrado.
import { useEffect, useRef, useState } from 'react'
import { Upload, X, Save, Loader2, Image as ImageIcon, Info } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { hasPerm } from '../../utils/permissions'
import { useAvisoSairSemSalvar } from '../../utils/alteracoesPendentes'
import SectionTitle from '../../components/ui/SectionTitle'

const TAMANHO_MAX = 4 * 1024 * 1024 // 4 MB

export default function TimbradoSecretaria() {
  const { user } = useAuth()
  const secretariaId = user?.secretaria?.id || user?.secretariaId || null
  const nomeSecretaria = user?.secretaria?.sigla || user?.secretaria?.nome || 'sua secretaria'
  const podeAlterar = ['gestor', 'admin', 'jeos'].includes(user?.tipo) && hasPerm(user, 'configuracoes', 'tema', 'editar')

  const [salvo, setSalvo] = useState({ timbrado: null, opacity: 75 })
  const [timbrado, setTimbrado] = useState(null)
  const [opacity, setOpacity] = useState(75)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!secretariaId) { setCarregando(false); return }
    api.get(`/organizacao/secretarias/${secretariaId}/timbrado`)
      .then(({ data }) => {
        const s = { timbrado: data?.timbrado || null, opacity: data?.opacity ?? 75 }
        setSalvo(s); setTimbrado(s.timbrado); setOpacity(s.opacity)
      })
      .catch(() => setMsg({ erro: true, texto: 'Não foi possível carregar o timbrado da secretaria.' }))
      .finally(() => setCarregando(false))
  }, [secretariaId])

  const alterado = timbrado !== salvo.timbrado || Number(opacity) !== Number(salvo.opacity)
  useAvisoSairSemSalvar(podeAlterar && alterado, 'Há alterações não salvas no timbrado da secretaria. Deseja sair sem salvar?')

  const escolher = (e) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setMsg({ erro: true, texto: 'Use uma imagem PNG, JPG ou WEBP.' }); return }
    if (file.size > TAMANHO_MAX) { setMsg({ erro: true, texto: 'A imagem deve ter no máximo 4 MB.' }); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setTimbrado(ev.target.result); setMsg(null) }
    reader.readAsDataURL(file)
  }

  const salvar = async () => {
    setSalvando(true); setMsg(null)
    try {
      const { data } = await api.put(`/organizacao/secretarias/${secretariaId}/timbrado`, { timbrado: timbrado || null, opacity: Number(opacity) })
      const s = { timbrado: data?.timbrado || null, opacity: data?.opacity ?? 75 }
      setSalvo(s); setTimbrado(s.timbrado); setOpacity(s.opacity)
      window.dispatchEvent(new Event('timbrado-secretaria')) // PDFs passam a usar o novo na hora
      setMsg({ texto: s.timbrado ? 'Timbrado salvo. Os próximos documentos já saem com ele.' : 'Timbrado removido. Os documentos voltam a usar o timbrado do município.' })
    } catch (err) {
      setMsg({ erro: true, texto: err.response?.data?.error || 'Não foi possível salvar o timbrado.' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <SectionTitle title="Timbrado da secretaria" />
      <p className="text-xs text-ink-500 -mt-2">
        Fundo usado em todos os documentos gerados pelos usuários de <strong>{nomeSecretaria}</strong>: relatórios, ordens de compra/serviço,
        despachos, ofícios, determinações e exportações em PDF. <strong>Os DIDs (contas fixas e variáveis) usam sempre o timbrado do município.</strong>
        {' '}Sem timbrado próprio, vale o do município.
      </p>

      {!secretariaId ? (
        <p className="text-sm text-ink-500 flex items-center gap-2"><Info className="h-4 w-4" /> Seu usuário não está vinculado a uma secretaria.</p>
      ) : carregando ? (
        <p className="text-sm text-ink-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</p>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-4 max-w-xs">
            {podeAlterar ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-info-50 dark:bg-info-900/30 text-brand-700 dark:text-info-300 text-xs font-medium rounded-lg border border-info-200 dark:border-info-700 hover:bg-info-100">
                  <Upload className="h-3.5 w-3.5" /> {timbrado ? 'Trocar imagem' : 'Escolher imagem'}
                </button>
                {timbrado && (
                  <button type="button" onClick={() => setTimbrado(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 text-xs font-medium rounded-lg border border-danger-200 dark:border-danger-700 hover:bg-danger-100">
                    <X className="h-3.5 w-3.5" /> Remover
                  </button>
                )}
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={escolher} />
              </div>
            ) : (
              <p className="text-xs text-ink-500 flex items-start gap-1.5"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> Só o gestor da secretaria altera o timbrado.</p>
            )}
            <p className="text-[11px] text-ink-400">PNG, JPG ou WEBP, na proporção A4 (210 × 297 mm). PNG com fundo transparente fica melhor.</p>

            {timbrado && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-ink-600">Opacidade (transparência)</label>
                  <span className="text-xs font-mono text-ink-700">{opacity}%</span>
                </div>
                <input type="range" min={0} max={100} step={1} value={opacity} disabled={!podeAlterar}
                  onChange={e => setOpacity(Number(e.target.value))}
                  className="w-full accent-info-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed" />
                <p className="text-[11px] text-ink-400 mt-1">0% = invisível · 100% = imagem sem transparência.</p>
              </div>
            )}

            {msg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${msg.erro ? 'text-danger-700 dark:text-danger-300 bg-danger-50 dark:bg-danger-900/20' : 'text-success-700 dark:text-success-300 bg-success-50 dark:bg-success-900/20'}`}>{msg.texto}</p>
            )}

            {podeAlterar && (
              <div className="flex gap-2">
                <button type="button" onClick={salvar} disabled={!alterado || salvando}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar timbrado
                </button>
                {alterado && (
                  <button type="button" onClick={() => { setTimbrado(salvo.timbrado); setOpacity(salvo.opacity); setMsg(null) }}
                    className="btn-secondary text-sm px-3 py-2">Desfazer</button>
                )}
              </div>
            )}
          </div>

          {/* Prévia A4 */}
          <div className="flex-1">
            <p className="text-xs font-medium text-ink-600 mb-2">Pré-visualização (A4 · 210 × 297 mm)</p>
            <div className="relative rounded-sm border border-ink-300 overflow-hidden bg-white shadow-md" style={{ width: '100%', maxWidth: 320, aspectRatio: '210 / 297' }}>
              <div className="absolute inset-0 p-[8%] space-y-[3%]">
                {[60, 80, 70, 90, 65, 75].map((w, k) => <div key={k} className="h-[2%] rounded-sm bg-slate-200" style={{ width: `${w}%` }} />)}
              </div>
              {timbrado ? (
                <img src={timbrado} alt="timbrado" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'fill', opacity: opacity / 100 }} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                  <ImageIcon className="h-6 w-6" /> Sem timbrado próprio (usa o do município)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
