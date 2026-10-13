// Tela cheia com os registros excluídos de uma tela: quem excluiu, quando e filtros.
// Administradores podem apagar de vez (selecionados, resultado do filtro ou tudo).
import { useEffect, useMemo, useState } from 'react'
import { Archive, X, Search, Loader2, Trash2, AlertTriangle, CheckCircle2, User, CalendarDays, RotateCcw } from 'lucide-react'
import api from '../../services/api'
import { ConfirmModal } from '../ui'

const SEM_AUTOR = '__sem_autor__'

const fmtDataHora = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
const fmtValor = (v, tipo) => {
  if (v === null || v === undefined || v === '') return '—'
  if (tipo === 'data') return String(v).slice(0, 10).split('-').reverse().join('/')
  if (tipo === 'moeda') return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return String(v)
}
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const diaLocal = (iso) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ModalExcluidos({ entidade, onClose }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [autor, setAutor] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [confirmar, setConfirmar] = useState(null) // { modo, ids, total }
  const [apagando, setApagando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const carregar = () => {
    setErro('')
    api.get(`/lixeira/${entidade}`)
      .then(({ data }) => setDados(data))
      .catch(e => setErro(e.response?.data?.error || 'Não foi possível carregar os excluídos.'))
  }
  useEffect(carregar, [entidade]) // eslint-disable-line react-hooks/exhaustive-deps

  // Esc fecha (se não houver confirmação aberta) e trava o scroll da página por trás
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !confirmar) onClose() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [confirmar, onClose])

  const registros = dados?.registros || []
  const colunas = dados?.colunas || []

  const autores = useMemo(() => {
    const m = new Map()
    registros.forEach(r => { if (r.excluido_por_nome) m.set(r.excluido_por_nome, true) })
    return [...m.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [registros])
  const temSemAutor = registros.some(r => !r.excluido_por_nome)

  const filtrados = useMemo(() => {
    const termo = norm(busca.trim())
    return registros.filter(r => {
      if (autor === SEM_AUTOR ? !!r.excluido_por_nome : autor && r.excluido_por_nome !== autor) return false
      if ((de || ate) && !r.excluido_em) return false
      if (de && diaLocal(r.excluido_em) < de) return false
      if (ate && diaLocal(r.excluido_em) > ate) return false
      if (termo) {
        const texto = colunas.map(c => fmtValor(r.valores[c.campo], c.tipo)).join(' ') + ' ' + (r.excluido_por_nome || '')
        if (!norm(texto).includes(termo)) return false
      }
      return true
    })
  }, [registros, colunas, busca, autor, de, ate])

  const temFiltro = !!(busca.trim() || autor || de || ate)
  const limpar = () => { setBusca(''); setAutor(''); setDe(''); setAte('') }

  const idsFiltrados = filtrados.map(r => r.id)
  const todosFiltradosMarcados = filtrados.length > 0 && filtrados.every(r => selecionados.has(r.id))
  const alternarTodos = () => setSelecionados(prev => {
    const n = new Set(prev)
    if (todosFiltradosMarcados) idsFiltrados.forEach(id => n.delete(id))
    else idsFiltrados.forEach(id => n.add(id))
    return n
  })
  const alternar = (id) => setSelecionados(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const apagar = async () => {
    if (!confirmar) return
    setApagando(true)
    try {
      const corpo = confirmar.modo === 'todos' ? { todos: true } : { ids: confirmar.ids }
      const { data } = await api.post(`/lixeira/${entidade}/apagar`, corpo)
      setResultado(data)
      setSelecionados(new Set())
      setConfirmar(null)
      carregar()
    } catch (e) {
      setConfirmar(null)
      setResultado({ apagados: [], falhas: [], erro: e.response?.data?.error || 'Erro ao apagar.' })
    } finally {
      setApagando(false)
    }
  }

  const titulo = dados?.titulo || 'Excluídos'

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink-50 animate-fade-in" role="dialog" aria-modal="true" aria-label={`Excluídos — ${titulo}`}>
      {/* Cabeçalho */}
      <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 bg-surface border-b border-ink-200">
        <div className="w-9 h-9 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center shrink-0">
          <Archive className="w-4.5 h-4.5 text-danger-600 dark:text-danger-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-ink-900 truncate">Excluídos — {titulo}</h2>
          <p className="text-xs text-ink-500 truncate">
            Registros excluídos desta tela, com data, hora e usuário. Visível só para administradores.
          </p>
        </div>
        <button onClick={onClose} title="Fechar (Esc)"
          className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filtros */}
      <div className="shrink-0 px-4 sm:px-6 py-3 bg-surface border-b border-ink-200">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-ink-500 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} autoFocus
                placeholder="Qualquer informação do registro excluído" className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div className="w-full sm:w-56">
            <label className="block text-xs font-medium text-ink-500 mb-1">Excluído por</label>
            <select value={autor} onChange={e => setAutor(e.target.value)} className="input-field text-sm">
              <option value="">Todos os usuários</option>
              {autores.map(a => <option key={a} value={a}>{a}</option>)}
              {temSemAutor && <option value={SEM_AUTOR}>Não registrado</option>}
            </select>
          </div>
          <div className="w-[calc(50%-6px)] sm:w-40">
            <label className="block text-xs font-medium text-ink-500 mb-1">Excluído de</label>
            <input type="date" value={de} onChange={e => setDe(e.target.value)} className="input-field text-sm" />
          </div>
          <div className="w-[calc(50%-6px)] sm:w-40">
            <label className="block text-xs font-medium text-ink-500 mb-1">até</label>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)} className="input-field text-sm" />
          </div>
          <button onClick={limpar} disabled={!temFiltro}
            className="h-10 inline-flex items-center gap-1.5 px-3 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-100 disabled:opacity-40 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Limpar
          </button>
        </div>
      </div>

      {/* Resultado da última ação */}
      {resultado && (
        <div className="shrink-0 px-4 sm:px-6 pt-3">
          <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
            resultado.erro || resultado.falhas.length
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300'
              : 'bg-success-50 border-success-200 text-success-700 dark:bg-success-900/20 dark:border-success-700 dark:text-success-400'}`}>
            {resultado.erro || resultado.falhas.length
              ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              {resultado.erro
                ? <p>{resultado.erro}</p>
                : <p><strong>{resultado.apagados.length}</strong> registro(s) apagado(s) definitivamente.</p>}
              {resultado.falhas.length > 0 && (
                <>
                  <p className="mt-1">{resultado.falhas.length} não puderam ser apagado(s):</p>
                  <ul className="mt-1 list-disc pl-5 text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {resultado.falhas.map(f => <li key={f.id}><strong>{f.descricao}</strong> — {f.motivo}</li>)}
                  </ul>
                </>
              )}
            </div>
            <button onClick={() => setResultado(null)} className="p-0.5 rounded-sm opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 py-3">
        <div className="card h-full overflow-auto">
          {!dados && !erro && (
            <div className="h-full flex items-center justify-center gap-2 text-sm text-ink-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          )}
          {erro && <p className="p-10 text-center text-sm text-danger-600">{erro}</p>}
          {dados && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-ink-100 text-ink-600 text-xs uppercase tracking-wider select-none">
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" checked={todosFiltradosMarcados} onChange={alternarTodos}
                      disabled={filtrados.length === 0} aria-label="Selecionar todos os listados" className="accent-danger-600" />
                  </th>
                  {colunas.map(c => (
                    <th key={c.campo} className={`text-left px-3 py-2.5 font-semibold whitespace-nowrap ${c.largo ? 'min-w-[240px]' : ''}`}>{c.rotulo}</th>
                  ))}
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Excluído em</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Excluído por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={colunas.length + 3} className="text-center py-16 text-ink-400">
                      <Archive className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      {registros.length === 0 ? 'Nenhum registro excluído nesta tela.' : 'Nenhum excluído corresponde aos filtros.'}
                    </td>
                  </tr>
                )}
                {filtrados.map(r => {
                  const sel = selecionados.has(r.id)
                  return (
                    <tr key={r.id} onClick={() => alternar(r.id)}
                      className={`cursor-pointer text-xs transition-colors ${sel ? 'bg-danger-50 dark:bg-danger-900/20' : 'hover:bg-ink-50 text-ink-700'}`}>
                      <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={sel} onChange={() => alternar(r.id)} aria-label="Selecionar" className="accent-danger-600" />
                      </td>
                      {colunas.map(c => (
                        <td key={c.campo} className={`px-3 py-2 ${c.largo ? 'max-w-md truncate' : 'whitespace-nowrap'} ${c.tipo === 'moeda' ? 'tabular-nums' : ''}`}
                          title={c.largo ? String(r.valores[c.campo] ?? '') : undefined}>
                          {fmtValor(r.valores[c.campo], c.tipo)}
                        </td>
                      ))}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.excluido_em
                          ? <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3 text-ink-400" />{fmtDataHora(r.excluido_em)}</span>
                          : <span className="text-ink-400 italic">Não registrado</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.excluido_por_nome
                          ? <span className="inline-flex items-center gap-1"><User className="w-3 h-3 text-ink-400" />{r.excluido_por_nome}</span>
                          : <span className="text-ink-400 italic">Não registrado</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Rodapé: contagem + apagar definitivamente */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 bg-surface border-t border-ink-200">
        <span className="text-xs text-ink-500 mr-auto">
          {temFiltro
            ? <><strong>{filtrados.length}</strong> de {registros.length} excluído(s)</>
            : <><strong>{registros.length}</strong> excluído(s)</>}
          {selecionados.size > 0 && <> · <strong>{selecionados.size}</strong> selecionado(s)</>}
        </span>
        <button disabled={selecionados.size === 0}
          onClick={() => setConfirmar({ modo: 'selecionados', ids: [...selecionados], total: selecionados.size })}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-danger-600 hover:bg-danger-700 text-white font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Apagar selecionados
        </button>
        <button disabled={!temFiltro || filtrados.length === 0}
          onClick={() => setConfirmar({ modo: 'filtrados', ids: idsFiltrados, total: filtrados.length })}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-danger-700 hover:bg-danger-800 text-white font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Apagar filtrados
        </button>
        <button disabled={registros.length === 0}
          onClick={() => setConfirmar({ modo: 'todos', total: registros.length })}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-danger-800 hover:bg-danger-900 text-white font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Apagar tudo
        </button>
      </div>

      {confirmar && (
        <ConfirmModal
          title="Apagar definitivamente?"
          message={`${confirmar.total} registro(s) ${
            confirmar.modo === 'todos' ? `— todos os excluídos de ${titulo} —` : confirmar.modo === 'filtrados' ? 'do resultado do filtro' : 'selecionado(s)'
          } serão apagados do sistema de forma permanente. Esta ação não pode ser desfeita.`}
          confirmLabel="Apagar definitivamente"
          loading={apagando}
          onConfirm={apagar}
          onClose={() => !apagando && setConfirmar(null)}
        />
      )}
    </div>
  )
}
