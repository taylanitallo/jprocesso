// Configurações › Fluxo do DID — para cada etapa, quais setores preenchem.
// Sem configuração vale a sugestão automática pelo nome do setor (servidor:
// server/config/didEtapas.js). Só administradores salvam.
import { useEffect, useMemo, useState } from 'react'
import { Save, RotateCcw, Search, Loader2, Workflow, Check, Sparkles } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const TIPOS = [
  { id: 'fixas', label: 'Contas Fixas' },
  { id: 'variaveis', label: 'Contas Variáveis' },
]
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function SeletorSetores({ setores, valor, onChange, onFechar }) {
  const [busca, setBusca] = useState('')
  const grupos = useMemo(() => {
    const q = norm(busca)
    const filtrados = setores.filter(s => !q || norm(`${s.nome} ${s.sigla || ''} ${s.secretaria?.nome || ''} ${s.secretaria?.sigla || ''}`).includes(q))
    const mapa = new Map()
    filtrados.forEach(s => {
      const k = s.secretaria?.sigla || s.secretaria?.nome || 'Sem secretaria'
      if (!mapa.has(k)) mapa.set(k, { nome: s.secretaria?.nome || k, itens: [] })
      mapa.get(k).itens.push(s)
    })
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [setores, busca])
  const marcado = new Set(valor)
  const alternar = (id) => onChange(marcado.has(id) ? valor.filter(x => x !== id) : [...valor, id])

  return (
    <div className="mt-2 rounded-xl border border-ink-200 bg-surface p-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
        <input value={busca} onChange={e => setBusca(e.target.value)} autoFocus aria-label="Buscar setor"
          className="input-field text-sm pl-8" placeholder="Buscar setor ou secretaria..." />
      </div>
      <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
        {grupos.map(([sigla, g]) => (
          <fieldset key={sigla}>
            <legend className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-1">{sigla} — {g.nome}</legend>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {g.itens.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                  <input type="checkbox" checked={marcado.has(s.id)} onChange={() => alternar(s.id)} className="accent-brand-600" />
                  <span className="truncate">{s.nome}{s.sigla ? <span className="text-ink-400"> ({s.sigla})</span> : null}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {grupos.length === 0 && <p className="text-sm text-ink-500">Nenhum setor encontrado.</p>}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onFechar} className="btn-secondary text-xs px-3 py-1.5">Concluir seleção</button>
      </div>
    </div>
  )
}

export default function FluxoDidConfig() {
  const { tenant, updateTenantConfig } = useAuth()
  const [tipo, setTipo] = useState('fixas')
  const [etapas, setEtapas] = useState({})      // { fixas: [...], variaveis: [...] } (do servidor)
  const [setores, setSetores] = useState([])
  const [sel, setSel] = useState({ fixas: {}, variaveis: {} }) // { tipo: { n: ids[] } } — ausente = sugestão
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/did/processo/novo/etapas', { params: { tipo: 'fixas' } }),
      api.get('/did/processo/novo/etapas', { params: { tipo: 'variaveis' } }),
      api.get('/organizacao/setores'),
    ]).then(([f, v, s]) => {
      setEtapas({ fixas: f.data.etapas, variaveis: v.data.etapas })
      setSetores(s.data.setores || [])
      const conf = tenant?.configuracoes?.did_etapas || {}
      const inicial = { fixas: {}, variaveis: {} }
      for (const t of ['fixas', 'variaveis']) {
        Object.entries(conf[t] || {}).forEach(([n, c]) => { if (c?.setores?.length) inicial[t][n] = c.setores })
      }
      setSel(inicial)
    }).catch(() => setMsg({ erro: true, texto: 'Não foi possível carregar o fluxo do DID.' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const nomeSetor = (id) => {
    const s = setores.find(x => x.id === id)
    return s ? `${s.sigla || s.nome}${s.secretaria?.sigla ? ` · ${s.secretaria.sigla}` : ''}` : null
  }

  const salvar = async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const did_etapas = {}
      for (const t of ['fixas', 'variaveis']) {
        did_etapas[t] = {}
        Object.entries(sel[t]).forEach(([n, ids]) => { if (ids?.length) did_etapas[t][n] = { setores: ids } })
      }
      await updateTenantConfig({ did_etapas })
      setMsg({ texto: 'Fluxo do DID salvo. Vale para todos os DIDs a partir de agora.' })
    } catch (e) {
      setMsg({ erro: true, texto: e.response?.data?.error || 'Erro ao salvar.' })
    } finally {
      setSalvando(false)
    }
  }

  const lista = etapas[tipo] || []

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2"><Workflow className="h-4 w-4" aria-hidden="true" /> Fluxo do DID</h3>
        <p className="text-sm text-ink-500 mt-1">
          Defina quais setores preenchem cada etapa. Só quem é de um desses setores — com o processo
          tramitado e recebido no setor — consegue preencher e assinar a etapa. Sem configuração, vale a
          sugestão automática pelo nome do setor.
        </p>
      </div>

      <div role="tablist" aria-label="Tipo de DID" className="inline-flex rounded-lg border border-ink-200 bg-surface p-0.5 text-sm">
        {TIPOS.map(t => (
          <button key={t.id} role="tab" aria-selected={tipo === t.id} onClick={() => { setTipo(t.id); setEditando(null) }}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tipo === t.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {!lista.length ? (
        <div className="flex items-center gap-2 text-sm text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
      ) : (
        <ol className="space-y-2">
          {lista.map(e => {
            const escolhidos = sel[tipo][e.numero]
            const configurado = !!escolhidos?.length
            const ids = configurado ? escolhidos : e.setores_ids
            const aberto = editando === `${tipo}-${e.numero}`
            return (
              <li key={e.numero} className="rounded-xl border border-ink-200 p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="shrink-0 w-9 h-9 rounded-full bg-brand-50 dark:bg-info-900/30 text-brand-700 dark:text-info-300 font-bold text-sm flex items-center justify-center">{e.numero}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{e.titulo}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {!configurado && e.setores?.[0]?.todos ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">Qualquer secretaria</span>
                      ) : ids.length ? ids.map(id => nomeSetor(id) && (
                        <span key={id} className="text-xs px-2 py-0.5 rounded-full bg-info-50 text-brand-700 dark:bg-info-900/30 dark:text-info-300">{nomeSetor(id)}</span>
                      )) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-danger-50 text-danger-700">Nenhum setor encontrado — configure</span>
                      )}
                      {configurado
                        ? <span className="text-[11px] text-success-700 dark:text-success-400 inline-flex items-center gap-0.5"><Check className="h-3 w-3" /> configurado</span>
                        : <span className="text-[11px] text-ink-400 inline-flex items-center gap-0.5"><Sparkles className="h-3 w-3" /> sugestão automática</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {configurado && (
                      <button type="button" onClick={() => setSel(p => { const t = { ...p[tipo] }; delete t[e.numero]; return { ...p, [tipo]: t } })}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1" title="Voltar para a sugestão automática">
                        <RotateCcw className="h-3 w-3" /> Sugestão
                      </button>
                    )}
                    <button type="button" onClick={() => {
                      if (!aberto && !configurado) setSel(p => ({ ...p, [tipo]: { ...p[tipo], [e.numero]: e.setores?.[0]?.todos ? [] : [...e.setores_ids] } }))
                      setEditando(aberto ? null : `${tipo}-${e.numero}`)
                    }} aria-expanded={aberto}
                      className="btn-secondary text-xs px-2.5 py-1.5">
                      {aberto ? 'Fechar' : 'Escolher setores'}
                    </button>
                  </div>
                </div>
                {aberto && (
                  <SeletorSetores setores={setores} valor={sel[tipo][e.numero] || []}
                    onChange={(v) => setSel(p => ({ ...p, [tipo]: { ...p[tipo], [e.numero]: v } }))}
                    onFechar={() => setEditando(null)} />
                )}
              </li>
            )
          })}
        </ol>
      )}

      {msg && (
        <p role="status" className={`text-sm ${msg.erro ? 'text-danger-600' : 'text-success-700 dark:text-success-400'}`}>{msg.texto}</p>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={salvar} disabled={salvando || !lista.length}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar fluxo do DID
        </button>
      </div>
    </div>
  )
}
