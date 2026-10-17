// Configurações › Fluxos de Processo — sequência do DID de cada município.
// Etapas = blocos prontos (server/config/didBlocos.js) + etapas personalizadas.
// As regras (validação, travados, padrão) moram no servidor; esta tela monta o
// rascunho, pede a validação ao vivo (somenteValidar) e grava uma nova versão.
// DIDs já abertos seguem o fluxo com que começaram (foto em dids.fluxo).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Save, RotateCcw, Search, Loader2, Workflow, ChevronUp, ChevronDown, GripVertical, Trash2, Plus,
  Lock, AlertTriangle, XCircle, CheckCircle2, History, Pencil, ClipboardList, Info,
} from 'lucide-react'
import api from '../../services/api'
import { ConfirmModal } from '../../components/ui'
import { useAvisoSairSemSalvar } from '../../utils/alteracoesPendentes'

const TIPOS = [
  { id: 'fixas', label: 'DID Contas Fixas' },
  { id: 'variaveis', label: 'DID Contas Variáveis' },
]
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
const romano = (i) => ROMANOS[i] || String(i + 1)
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const fmtDataHora = (iso) => (iso ? `${new Date(iso).toLocaleDateString('pt-BR')} às ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '')
const copia = (x) => JSON.parse(JSON.stringify(x))
let seqLocal = 0
const idLocal = (pre) => `${pre}_${Date.now().toString(16).slice(-6)}${(seqLocal++).toString(16)}`.slice(0, 13)

function SeletorSetores({ setores, valor, onChange }) {
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
    <div className="rounded-xl border border-ink-200 bg-surface p-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
        <input value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar setor"
          className="input-field text-sm pl-8" placeholder="Buscar setor ou secretaria..." />
      </div>
      <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
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
    </div>
  )
}

/** Campos de uma etapa personalizada */
function EditorCampos({ campos, tiposCampo, onChange }) {
  const mudar = (i, patch) => onChange(campos.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  return (
    <div className="space-y-2">
      {campos.map((c, i) => (
        <div key={c.id} className="rounded-lg border border-ink-200 p-2.5 space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[180px]">
              <span className="block text-[11px] font-medium text-ink-500 mb-0.5">Rótulo / pergunta</span>
              <input value={c.rotulo} onChange={e => mudar(i, { rotulo: e.target.value })} maxLength={160}
                className="input-field text-sm" placeholder="Ex.: Parecer jurídico" />
            </label>
            <label>
              <span className="block text-[11px] font-medium text-ink-500 mb-0.5">Tipo</span>
              <select value={c.tipo} onChange={e => mudar(i, { tipo: e.target.value, ...(e.target.value === 'checklist' && !c.itens ? { itens: [] } : {}) })}
                className="input-field text-sm">
                {Object.entries(tiposCampo).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink-700 pb-2">
              <input type="checkbox" checked={c.obrigatorio !== false} onChange={e => mudar(i, { obrigatorio: e.target.checked })} className="accent-brand-600" />
              Obrigatório
            </label>
            <div className="flex gap-1 pb-1">
              <button type="button" disabled={i === 0} onClick={() => { const a = [...campos];[a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a) }}
                className="p-1.5 rounded-md hover:bg-ink-100 disabled:opacity-30" aria-label={`Subir o campo ${c.rotulo || i + 1}`}><ChevronUp className="h-4 w-4" /></button>
              <button type="button" disabled={i === campos.length - 1} onClick={() => { const a = [...campos];[a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(a) }}
                className="p-1.5 rounded-md hover:bg-ink-100 disabled:opacity-30" aria-label={`Descer o campo ${c.rotulo || i + 1}`}><ChevronDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => onChange(campos.filter((_, j) => j !== i))}
                className="p-1.5 rounded-md text-danger-600 hover:bg-danger-50" aria-label={`Remover o campo ${c.rotulo || i + 1}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          {c.tipo === 'checklist' && (
            <label className="block">
              <span className="block text-[11px] font-medium text-ink-500 mb-0.5">Itens do checklist (um por linha)</span>
              <textarea rows={3} value={(c.itens || []).join('\n')} onChange={e => mudar(i, { itens: e.target.value.split('\n') })}
                className="input-field text-sm resize-y" placeholder={'Contrato assinado\nNota de empenho'} />
            </label>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...campos, { id: idLocal('c'), tipo: 'texto', rotulo: '', obrigatorio: true }])}
        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar campo</button>
    </div>
  )
}

export default function FluxosProcesso() {
  const [dados, setDados] = useState(null)        // resposta de GET /did/fluxos
  const [setores, setSetores] = useState([])
  const [tipo, setTipo] = useState('fixas')
  const [rascunho, setRascunho] = useState({})    // { fixas: etapas[], variaveis: etapas[] }
  const [alterado, setAlterado] = useState({})    // { fixas: bool, variaveis: bool }
  const [aberta, setAberta] = useState(null)      // índice da etapa expandida
  // Rascunho não salvo em algum dos tipos: avisa antes de sair da tela
  const temAlteracao = Object.values(alterado).some(Boolean)
  useAvisoSairSemSalvar(temAlteracao, 'Há alterações não salvas nos fluxos do DID. Deseja sair sem salvar?')
  const [adicionando, setAdicionando] = useState(false)
  const [validacao, setValidacao] = useState({ erros: [], avisos: [], carregando: false })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmarPadrao, setConfirmarPadrao] = useState(false)
  const [verHistorico, setVerHistorico] = useState(false)
  const arrastando = useRef(null)

  const catalogo = useMemo(() => Object.fromEntries((dados?.catalogo || []).map(b => [b.key, b])), [dados])
  // Secretarias (para a tramitação) a partir dos setores carregados
  const secretarias = useMemo(() => {
    const m = new Map()
    setores.forEach(s => { const sec = s.secretaria; if (sec?.id && !m.has(sec.id)) m.set(sec.id, sec) })
    return [...m.values()].sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
  }, [setores])
  const siglaSecretaria = (id) => { const sec = secretarias.find(x => x.id === id); return sec ? (sec.sigla || sec.nome) : null }

  /** Etapa do servidor → rascunho editável (setores da sugestão viram explícitos) */
  const paraRascunho = (etapas, sugestoes) => copia(etapas).map(e => {
    if (e.bloco !== 'personalizada' && e.setores == null) {
      const sug = sugestoes?.[e.bloco]
      if (sug === 'todas') { e.todos = true; e.setores = [] } else { e.setores = sug || []; e.todos = false }
    }
    return {
      ...e, setores: e.setores || [], obrigatorios: e.obrigatorios || {},
      // Para onde o processo pode ser tramitado ao sair desta etapa (sem configuração = todas)
      tramitacao: { todas: e.tramitacao?.todas !== false, secretarias: e.tramitacao?.secretarias || [] },
    }
  })

  const carregar = async () => {
    const [f, s] = await Promise.all([api.get('/did/fluxos'), api.get('/organizacao/setores')])
    setDados(f.data)
    setSetores(s.data.setores || [])
    setRascunho({
      fixas: paraRascunho(f.data.fluxos.fixas.etapas, f.data.sugestoes),
      variaveis: paraRascunho(f.data.fluxos.variaveis.etapas, f.data.sugestoes),
    })
    setAlterado({})
  }
  useEffect(() => {
    carregar().catch(() => setMsg({ erro: true, texto: 'Não foi possível carregar os fluxos.' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const etapas = rascunho[tipo] || []
  const setEtapas = (fn) => {
    setRascunho(p => ({ ...p, [tipo]: typeof fn === 'function' ? fn(p[tipo] || []) : fn }))
    setAlterado(p => ({ ...p, [tipo]: true }))
    setMsg(null)
  }
  const mudarEtapa = (i, patch) => setEtapas(l => l.map((e, j) => (j === i ? { ...e, ...patch } : e)))

  // Validação ao vivo pelo servidor (mesmas regras do salvamento)
  useEffect(() => {
    if (!dados || !etapas.length) return
    let vivo = true
    setValidacao(v => ({ ...v, carregando: true }))
    const t = setTimeout(() => {
      api.put(`/did/fluxos/${tipo}`, { etapas, somenteValidar: true })
        .then(({ data }) => { if (vivo) setValidacao({ erros: data.erros || [], avisos: data.avisos || [], carregando: false }) })
        .catch((e) => { if (vivo) setValidacao({ erros: e.response?.data?.erros || [], avisos: e.response?.data?.avisos || [], carregando: false }) })
    }, 400)
    return () => { vivo = false; clearTimeout(t) }
  }, [etapas, tipo, dados]) // eslint-disable-line react-hooks/exhaustive-deps

  const mover = (de, para) => {
    if (para < 1 || para >= etapas.length || de < 1) return // a Abertura fica em primeiro
    setEtapas(l => { const a = [...l]; const [x] = a.splice(de, 1); a.splice(para, 0, x); return a })
    setAberta(a => (a === de ? para : a))
  }

  const remover = (i) => { setEtapas(l => l.filter((_, j) => j !== i)); setAberta(null) }

  // Novas etapas entram antes do Fechamento (que precisa ser a última)
  const posInsercao = () => (etapas[etapas.length - 1]?.bloco === 'fechamento' ? etapas.length - 1 : etapas.length)
  const adicionarBloco = (key) => {
    const b = catalogo[key]
    const sug = dados.sugestoes?.[key]
    const nova = { id: key, bloco: key, nome: b.nome, todos: sug === 'todas', setores: Array.isArray(sug) ? sug : [], obrigatorios: {} }
    const pos = b.ultimo ? etapas.length : posInsercao()
    setEtapas(l => { const a = [...l]; a.splice(pos, 0, nova); return a })
    setAdicionando(false)
    setAberta(pos)
  }
  const adicionarPersonalizada = () => {
    const nova = {
      id: idLocal('novo'), bloco: 'personalizada', nome: 'Nova etapa', todos: false, setores: [], obrigatorios: {},
      personalizada: { campos: [{ id: idLocal('c'), tipo: 'texto', rotulo: 'Parecer / despacho', obrigatorio: true }] },
    }
    const pos = posInsercao()
    setEtapas(l => { const a = [...l]; a.splice(pos, 0, nova); return a })
    setAdicionando(false)
    setAberta(pos)
  }

  const usados = new Set(etapas.map(e => e.bloco))
  const disponiveis = (dados?.catalogo || []).filter(b => !b.fixo && b.tipos.includes(tipo) && !usados.has(b.key))

  const nomeSetor = (id) => {
    const s = setores.find(x => x.id === id)
    return s ? `${s.sigla || s.nome}${s.secretaria?.sigla ? ` · ${s.secretaria.sigla}` : ''}` : null
  }
  const camposBloco = (e) => catalogo[e.bloco]?.campos?.[tipo] || []
  const obrigatorioDe = (e, c) => c.travado || (e.obrigatorios?.[c.campo] ?? !c.opcionalPadrao)
  const totalObrigatorios = (e) => (e.bloco === 'personalizada'
    ? (e.personalizada?.campos || []).filter(c => c.obrigatorio !== false).length
    : camposBloco(e).filter(c => obrigatorioDe(e, c)).length)

  const salvar = async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const limpo = etapas.map(e => (e.bloco === 'personalizada'
        ? { ...e, personalizada: { campos: e.personalizada.campos.map(c => ({ ...c, itens: c.tipo === 'checklist' ? (c.itens || []).map(x => x.trim()).filter(Boolean) : undefined })) } }
        : e))
      const { data } = await api.put(`/did/fluxos/${tipo}`, { etapas: limpo })
      await carregar()
      setMsg({ texto: `Fluxo salvo (versão ${data.fluxo.versao}). Vale para os DIDs abertos a partir de agora; os que já estão em andamento terminam no fluxo com que começaram.` })
    } catch (e) {
      const d = e.response?.data
      setMsg({ erro: true, texto: d?.error || 'Erro ao salvar o fluxo.' })
      if (d?.erros) setValidacao({ erros: d.erros, avisos: d.avisos || [], carregando: false })
    } finally {
      setSalvando(false)
    }
  }

  const restaurarPadrao = async () => {
    setConfirmarPadrao(false)
    setSalvando(true)
    try {
      await api.put(`/did/fluxos/${tipo}`, { restaurarPadrao: true })
      await carregar()
      setAberta(null)
      setMsg({ texto: 'Fluxo padrão restaurado. Vale para os DIDs abertos a partir de agora.' })
    } catch (e) {
      setMsg({ erro: true, texto: e.response?.data?.error || 'Erro ao restaurar o padrão.' })
    } finally {
      setSalvando(false)
    }
  }

  if (!dados) {
    return msg
      ? <p role="alert" className="text-sm text-danger-600">{msg.texto}</p>
      : <div className="flex items-center gap-2 text-sm text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando fluxos...</div>
  }

  const atualServidor = dados.fluxos[tipo]
  const historico = dados.historico?.[tipo] || []
  const temErros = validacao.erros.length > 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2"><Workflow className="h-4 w-4" aria-hidden="true" /> Fluxos de Processo</h3>
        <p className="text-sm text-ink-500 mt-1">
          Monte a sequência do DID deste município: ordem das etapas, quem preenche cada uma e quais campos são obrigatórios.
          Só quem é de um dos setores da etapa — com o processo recebido no setor — consegue preenchê-la e assiná-la.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Tipo de DID" className="inline-flex rounded-lg border border-ink-200 bg-surface p-0.5 text-sm">
          {TIPOS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tipo === t.id}
              onClick={() => { setTipo(t.id); setAberta(null); setAdicionando(false); setMsg(null) }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tipo === t.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
              {t.label}{alterado[t.id] ? ' •' : ''}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-500">
          {atualServidor.configurado
            ? <>Versão {atualServidor.versao} · alterada por <strong>{atualServidor.atualizado_por?.nome || '—'}</strong> em {fmtDataHora(atualServidor.atualizado_em)}</>
            : 'Usando o fluxo padrão do sistema'}
        </p>
      </div>

      {/* Pré-visualização da sequência */}
      <div className="rounded-xl bg-ink-50 border border-ink-200 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-1.5">Sequência</p>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {etapas.map((e, i) => (
            <li key={e.id + i} className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full ${e.bloco === 'personalizada' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200' : 'bg-surface border border-ink-200 text-ink-700'}`}>
                <strong>{romano(i)}</strong> {e.nome || '(sem nome)'}
              </span>
              {i < etapas.length - 1 && <span className="text-ink-400" aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
      </div>

      <ol className="space-y-2" aria-label="Etapas do fluxo">
        {etapas.map((e, i) => {
          const fixa = e.bloco === 'abertura'
          const expandida = aberta === i
          const bloco = catalogo[e.bloco]
          return (
            <li key={e.id + i}
              draggable={!fixa}
              onDragStart={() => { arrastando.current = i }}
              onDragOver={(ev) => { if (!fixa && arrastando.current != null) ev.preventDefault() }}
              onDrop={() => { if (arrastando.current != null) mover(arrastando.current, i); arrastando.current = null }}
              onDragEnd={() => { arrastando.current = null }}
              className={`rounded-xl border p-3 bg-surface ${expandida ? 'border-brand-300 dark:border-info-700 shadow-sm' : 'border-ink-200'}`}>
              <div className="flex flex-wrap items-start gap-3">
                <span className={`shrink-0 mt-1 ${fixa ? 'text-ink-200' : 'text-ink-400 cursor-grab'}`} aria-hidden="true"><GripVertical className="h-4 w-4" /></span>
                <span className="shrink-0 w-9 h-9 rounded-full bg-brand-50 dark:bg-info-900/30 text-brand-700 dark:text-info-300 font-bold text-xs flex items-center justify-center">{romano(i)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">Seção {romano(i)} — {e.nome || <span className="text-danger-600">sem nome</span>}</p>
                  <p className="text-[11px] text-ink-500">
                    {e.bloco === 'personalizada' ? 'Etapa personalizada' : `Bloco: ${bloco?.nome || e.bloco}`}
                    {' · '}{totalObrigatorios(e)} campo(s) obrigatório(s)
                    {fixa && ' · sempre a primeira'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {e.todos ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">Qualquer secretaria</span>
                    ) : e.setores.filter(nomeSetor).length ? e.setores.filter(nomeSetor).map(id => (
                      <span key={id} className="text-xs px-2 py-0.5 rounded-full bg-info-50 text-brand-700 dark:bg-info-900/30 dark:text-info-300">{nomeSetor(id)}</span>
                    )) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-danger-50 text-danger-700">Nenhum setor — escolha ao menos um</span>
                    )}
                    <span className="text-[11px] text-ink-400 ml-1">Tramita para:</span>
                    {e.tramitacao?.todas !== false ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">Todas as secretarias</span>
                    ) : (e.tramitacao.secretarias || []).filter(siglaSecretaria).length ? e.tramitacao.secretarias.filter(siglaSecretaria).map(id => (
                      <span key={id} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{siglaSecretaria(id)}</span>
                    )) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-danger-50 text-danger-700">Nenhuma secretaria — escolha ao menos uma</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!fixa && (
                    <>
                      <button type="button" onClick={() => mover(i, i - 1)} disabled={i <= 1}
                        className="p-1.5 rounded-md hover:bg-ink-100 disabled:opacity-30" aria-label={`Subir ${e.nome}`}><ChevronUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => mover(i, i + 1)} disabled={i >= etapas.length - 1}
                        className="p-1.5 rounded-md hover:bg-ink-100 disabled:opacity-30" aria-label={`Descer ${e.nome}`}><ChevronDown className="h-4 w-4" /></button>
                    </>
                  )}
                  {expandida && (
                    <button type="button" onClick={salvar} disabled={salvando || temErros || validacao.carregando || !alterado[tipo]}
                      title={!alterado[tipo] ? 'Nenhuma alteração para salvar' : temErros ? 'Corrija os erros indicados no fim da página' : 'Salvar o fluxo'}
                      className="btn-primary text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40">
                      {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar
                    </button>
                  )}
                  <button type="button" onClick={() => setAberta(expandida ? null : i)} aria-expanded={expandida}
                    className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> {expandida ? 'Fechar' : 'Editar'}
                  </button>
                  {!fixa && (
                    <button type="button" onClick={() => remover(i)}
                      className="p-1.5 rounded-md text-danger-600 hover:bg-danger-50" aria-label={`Remover ${e.nome}`}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>

              {expandida && (
                <div className="mt-3 pl-0 sm:pl-14 space-y-4">
                  <label className="block max-w-md">
                    <span className="block text-xs font-medium text-ink-600 mb-1">Nome exibido</span>
                    <input value={e.nome} onChange={ev => mudarEtapa(i, { nome: ev.target.value })} maxLength={120} className="input-field text-sm" />
                  </label>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-ink-600">Quem preenche</p>
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                      <input type="checkbox" checked={!!e.todos} onChange={ev => mudarEtapa(i, { todos: ev.target.checked })} className="accent-brand-600" />
                      Qualquer secretaria (setor onde o processo estiver)
                    </label>
                    {!e.todos && <SeletorSetores setores={setores} valor={e.setores} onChange={v => mudarEtapa(i, { setores: v })} />}
                  </div>

                  {/* Para onde pode tramitar ao sair desta etapa (vale também para os DIDs em andamento) */}
                  {(() => {
                    const tram = e.tramitacao || { todas: true, secretarias: [] }
                    const setTram = (t) => mudarEtapa(i, { tramitacao: { ...tram, ...t } })
                    const marcadas = new Set(tram.secretarias || [])
                    return (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-ink-600">Tramitação — para onde o processo pode ser enviado ao sair desta etapa</p>
                        <p className="text-[11px] text-ink-400">Dentro da própria secretaria de quem tramita é sempre permitido (análises e conferências antes de seguir).</p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1">
                          <label className="flex items-center gap-2 text-sm text-ink-700">
                            <input type="radio" name={`tram-${e.id}`} checked={tram.todas !== false} onChange={() => setTram({ todas: true })} className="accent-brand-600" />
                            Todas as secretarias
                          </label>
                          <label className="flex items-center gap-2 text-sm text-ink-700">
                            <input type="radio" name={`tram-${e.id}`} checked={tram.todas === false} onChange={() => setTram({ todas: false })} className="accent-brand-600" />
                            Somente as secretarias selecionadas (uma ou mais)
                          </label>
                        </div>
                        {tram.todas === false && (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 rounded-lg border border-ink-200 p-3 max-h-56 overflow-y-auto">
                            {secretarias.map(sec => (
                              <label key={sec.id} className="flex items-center gap-2 text-sm text-ink-700">
                                <input type="checkbox" checked={marcadas.has(sec.id)} className="accent-brand-600"
                                  onChange={ev => {
                                    const n = new Set(marcadas)
                                    ev.target.checked ? n.add(sec.id) : n.delete(sec.id)
                                    setTram({ secretarias: [...n] })
                                  }} />
                                <span className="truncate">{sec.sigla ? `${sec.sigla} — ${sec.nome}` : sec.nome}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {e.bloco === 'personalizada' ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-ink-600">Campos da etapa</p>
                      <EditorCampos campos={e.personalizada?.campos || []} tiposCampo={dados.tiposCampo}
                        onChange={campos => mudarEtapa(i, { personalizada: { campos } })} />
                    </div>
                  ) : (
                    <fieldset className="space-y-1.5">
                      <legend className="text-xs font-medium text-ink-600 mb-1">Campos obrigatórios para concluir a etapa</legend>
                      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                        {camposBloco(e).map(c => (
                          <label key={c.campo} className={`flex items-center gap-2 text-sm ${c.travado ? 'text-ink-500' : 'text-ink-700 cursor-pointer'}`}
                            title={c.travado ? 'Obrigatório: outras partes do sistema dependem deste campo (caixa, extrato, almoxarifado ou painel financeiro).' : undefined}>
                            <input type="checkbox" checked={obrigatorioDe(e, c)} disabled={c.travado} className="accent-brand-600"
                              onChange={ev => mudarEtapa(i, { obrigatorios: { ...e.obrigatorios, [c.campo]: ev.target.checked } })} />
                            <span className="truncate">{c.rotulo}</span>
                            {c.travado && <Lock className="h-3 w-3 shrink-0 text-ink-400" aria-label="travado" />}
                          </label>
                        ))}
                      </div>
                      {camposBloco(e).some(c => c.travado) && (
                        <p className="text-[11px] text-ink-500 flex items-center gap-1"><Lock className="h-3 w-3" /> Campos com cadeado são sempre obrigatórios: outras partes do sistema dependem deles.</p>
                      )}
                    </fieldset>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* Adicionar etapa */}
      {adicionando ? (
        <div className="rounded-xl border border-dashed border-brand-300 dark:border-info-700 p-3 space-y-2">
          <p className="text-sm font-semibold text-ink-800">Adicionar etapa</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {disponiveis.map(b => {
              const conflito = b.conflita.find(c => usados.has(c))
              return (
                <button key={b.key} type="button" disabled={!!conflito} onClick={() => adicionarBloco(b.key)}
                  title={conflito ? `Não pode ficar junto com "${catalogo[conflito]?.nome}" (usam os mesmos campos)` : undefined}
                  className="text-left rounded-lg border border-ink-200 px-3 py-2 text-sm hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="font-medium text-ink-800">{b.nome}</span>
                  {conflito && <span className="block text-[11px] text-ink-500">Conflita com {catalogo[conflito]?.nome}</span>}
                </button>
              )
            })}
            <button type="button" onClick={adicionarPersonalizada}
              className="text-left rounded-lg border border-teal-300 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-800 px-3 py-2 text-sm hover:bg-teal-100">
              <span className="font-medium text-teal-800 dark:text-teal-200 flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Etapa personalizada</span>
              <span className="block text-[11px] text-teal-700 dark:text-teal-300">Nome livre, setores e campos simples (parecer, data, sim/não, nº de documento, checklist)</span>
            </button>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setAdicionando(false)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdicionando(true)} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar etapa
        </button>
      )}

      {/* Validação ao vivo */}
      <div aria-live="polite" className="space-y-2">
        {validacao.erros.length > 0 && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 dark:bg-danger-900/20 dark:border-danger-800 px-3 py-2">
            <p className="text-sm font-semibold text-danger-700 dark:text-danger-300 flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Corrija antes de salvar</p>
            <ul className="mt-1 text-sm text-danger-700 dark:text-danger-300 list-disc pl-5">{validacao.erros.map(x => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        {validacao.avisos.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-3 py-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Atenção (pode salvar assim)</p>
            <ul className="mt-1 text-sm text-amber-800 dark:text-amber-300 list-disc pl-5">{validacao.avisos.map(x => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        {!validacao.carregando && !temErros && !validacao.avisos.length && (
          <p className="text-sm text-success-700 dark:text-success-400 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Fluxo válido.</p>
        )}
      </div>

      {msg && (
        <p role="status" className={`text-sm ${msg.erro ? 'text-danger-600' : 'text-success-700 dark:text-success-400'}`}>{msg.texto}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-200 pt-4">
        <button type="button" onClick={() => setConfirmarPadrao(true)} disabled={salvando || !atualServidor.configurado}
          className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-40" title="Voltar à sequência padrão do sistema">
          <RotateCcw className="h-4 w-4" /> Restaurar padrão
        </button>
        {alterado[tipo] && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-[min(680px,calc(100vw-2rem))] rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/40 shadow-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-900 dark:text-amber-200 flex-1 min-w-[180px]">
              Alterações não salvas em <strong>{TIPOS.find(t => t.id === tipo)?.label}</strong>
            </span>
            <button type="button" onClick={() => { if (window.confirm('Descartar as alterações não salvas?')) carregar() }}
              className="btn-secondary text-xs px-3 py-1.5">Descartar</button>
            <button type="button" onClick={salvar} disabled={salvando || temErros || validacao.carregando}
              title={temErros ? 'Corrija os erros indicados no fim da página' : undefined}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-40">
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar fluxo
            </button>
          </div>
        )}
        {historico.length > 0 && (
          <button type="button" onClick={() => setVerHistorico(v => !v)} aria-expanded={verHistorico}
            className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5">
            <History className="h-4 w-4" /> Histórico ({historico.length})
          </button>
        )}
        <span className="ml-auto text-xs text-ink-500 flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Vale para DIDs abertos a partir de agora</span>
        <button type="button" onClick={salvar} disabled={salvando || temErros || validacao.carregando || !alterado[tipo]}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar fluxo
        </button>
      </div>

      {verHistorico && (
        <ol className="space-y-2">
          {historico.map((h, k) => (
            <li key={k} className="rounded-lg border border-ink-200 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink-800">
                  <strong>Versão {h.versao}</strong> · criada por {h.atualizado_por?.nome || '—'} em {fmtDataHora(h.atualizado_em)}
                  <span className="text-ink-500"> · substituída por {h.substituida_por?.nome || '—'} em {fmtDataHora(h.substituida_em)}</span>
                </p>
                <button type="button" className="btn-secondary text-xs px-2.5 py-1"
                  onClick={() => { setEtapas(paraRascunho(h.etapas, dados.sugestoes)); setAberta(null); setVerHistorico(false) }}>
                  Carregar esta versão
                </button>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">{h.etapas.map((e, i) => `${romano(i)} ${e.nome}`).join(' → ')}</p>
            </li>
          ))}
        </ol>
      )}

      {confirmarPadrao && (
        <ConfirmModal
          title="Restaurar o fluxo padrão?"
          message={`O fluxo de ${TIPOS.find(t => t.id === tipo).label} volta à sequência padrão do sistema. A versão atual fica no histórico. DIDs em andamento não mudam.`}
          confirmLabel="Restaurar padrão"
          onConfirm={restaurarPadrao}
          onClose={() => setConfirmarPadrao(false)}
        />
      )}
    </div>
  )
}
