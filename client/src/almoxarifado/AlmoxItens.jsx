import { useState, useEffect, useCallback } from 'react'
import { Search, Edit2, RefreshCw, Package, MapPin, AlertTriangle, Building2 } from 'lucide-react'
import api from '../services/api'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, TIPO_ITEM } from './almoxConstants'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'
import ActionBar from '../components/ui/ActionBar'

// ─── Modal: Editar localização e config do item em estoque ───────────────────
function ItemModal({ item, onClose, onSave, saving, erro }) {
  const [form, setForm] = useState({
    estoque_minimo: '',
    estoque_maximo: '',
    valor_unitario: '',
    localizacao: '',
    corredor: '',
    prateleira: '',
    gaveta: '',
    secretaria: '',
    tipo_item: 'CONSUMO',
    ponto_ressuprimento: '',
    ...item,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <AlmoxModal title="Editar Item do Estoque" onClose={onClose}>
      <div className="space-y-4">
        {/* Dados do item (somente leitura) */}
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Item</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-gray-400">Código</span>
              <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{item.codigo || '—'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-gray-400">Nome</span>
              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{item.nome || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Unidade</span>
              <p className="text-gray-700 dark:text-gray-300">{item.unidade || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Estoque Atual</span>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{fmt(item.estoque_atual)}</p>
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-2 text-sm">
            {erro}
          </div>
        )}

        {/* Localização */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Localização no Almoxarifado
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Corredor</label>
            <input
              value={form.corredor ?? ''}
              onChange={e => set('corredor', e.target.value)}
              placeholder="A"
              maxLength={20}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prateleira</label>
            <input
              value={form.prateleira ?? ''}
              onChange={e => set('prateleira', e.target.value)}
              placeholder="3"
              maxLength={20}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gaveta</label>
            <input
              value={form.gaveta ?? ''}
              onChange={e => set('gaveta', e.target.value)}
              placeholder="G1"
              maxLength={20}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Secretaria */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
          <Building2 className="h-3 w-3" /> Secretaria / Departamento
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secretaria</label>
          <input
            value={form.secretaria ?? ''}
            onChange={e => set('secretaria', e.target.value)}
            placeholder="Ex: Secretaria de Saúde"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Config de estoque */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Configuração de Estoque</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Est. Mínimo</label>
            <input
              type="number" step="0.001" min="0"
              value={form.estoque_minimo}
              onChange={e => set('estoque_minimo', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Est. Máximo</label>
            <input
              type="number" step="0.001" min="0"
              value={form.estoque_maximo ?? ''}
              onChange={e => set('estoque_maximo', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Unit. (R$)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.valor_unitario}
              onChange={e => set('valor_unitario', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Item</label>
            <select
              value={form.tipo_item || 'CONSUMO'}
              onChange={e => set('tipo_item', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            >
              {Object.entries(TIPO_ITEM).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ponto de Ressuprimento</label>
            <input
              type="number" step="0.001" min="0"
              value={form.ponto_ressuprimento ?? ''}
              onChange={e => set('ponto_ressuprimento', e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Tab: Estoque ─────────────────────────────────────────────────────────────
// Mostra apenas itens que possuem entradas registradas (estoque_atual > 0)
export default function AlmoxItens() {
  const [todosItens,  setTodosItens]  = useState([])
  const [busca,       setBusca]       = useState('')
  const [editando,    setEditando]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [erro,        setErro]        = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 15

  const itensFiltrados = busca
    ? todosItens.filter(item =>
        item.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        String(item.codigo || '').toLowerCase().includes(busca.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(busca.toLowerCase()) ||
        item.secretaria?.toLowerCase().includes(busca.toLowerCase())
      )
    : todosItens

  const totalPaginas = Math.ceil(itensFiltrados.length / itensPorPagina)
  const inicio       = (paginaAtual - 1) * itensPorPagina
  const itens        = itensFiltrados.slice(inicio, inicio + itensPorPagina)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/almoxarifado/estoque')
      setTodosItens(Array.isArray(data) ? data : [])
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true); setErro('')
    try {
      await api.put(`/almoxarifado/itens/${form.id}`, {
        nome:               form.nome,
        unidade:            form.unidade || 'UN',
        categoria:          form.categoria,
        estoque_minimo:     form.estoque_minimo,
        estoque_maximo:     form.estoque_maximo,
        valor_unitario:     form.valor_unitario,
        localizacao:        form.localizacao,
        corredor:           form.corredor,
        prateleira:         form.prateleira,
        gaveta:             form.gaveta,
        secretaria:         form.secretaria,
        tipo_item:          form.tipo_item || 'CONSUMO',
        ponto_ressuprimento: form.ponto_ressuprimento || null,
      })
      setEditando(null)
      load()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const estoqueStatus = (item) => {
    const atual = parseFloat(item.estoque_atual)
    const min   = parseFloat(item.estoque_minimo)
    if (min > 0 && atual <= min)       return 'critico'
    if (min > 0 && atual <= min * 1.5) return 'atencao'
    return 'ok'
  }

  return (
    <div>
      <PageHeader
        icon={Package}
        eyebrow="Almoxarifado"
        title="Estoque"
        subtitle="Itens com entradas registradas — quantidade, localização e secretaria"
        actions={
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />

      <FilterBar>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setPaginaAtual(1) }}
            placeholder="Buscar por nome, código, categoria ou secretaria..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </FilterBar>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : todosItens.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum item em estoque"
          description="Registre entradas na aba Entradas para os itens aparecerem aqui."
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle
              icon={Package}
              title="Itens em Estoque"
              subtitle={`${itensFiltrados.length} de ${todosItens.length} item(ns)`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['Código', 'Item', 'Tipo', 'Unid.', 'Qtd. em Estoque', 'Valor Unit.', 'Localização', 'Secretaria', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-0">
                      <EmptyState
                        icon={Search}
                        title="Nenhum item encontrado"
                        description={`Nenhum resultado para "${busca}"`}
                      />
                    </td>
                  </tr>
                )}
                {itens.map(item => {
                  const st = estoqueStatus(item)
                  const localizacao = [item.corredor, item.prateleira, item.gaveta].filter(Boolean).join('-') || item.localizacao || '—'
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.codigo}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{item.nome}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {TIPO_ITEM[item.tipo_item] ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_ITEM[item.tipo_item].color}`}>
                            {TIPO_ITEM[item.tipo_item].label}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.unidade}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${
                          st === 'critico' ? 'text-red-600 dark:text-red-400' :
                          st === 'atencao' ? 'text-yellow-600 dark:text-yellow-400' :
                                             'text-gray-900 dark:text-gray-100'
                        }`}>
                          {fmt(item.estoque_atual)}
                          {st !== 'ok' && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtMoney(item.valor_unitario)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {localizacao !== '—' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <MapPin className="h-3 w-3 text-amber-500" />
                            {localizacao}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.secretaria ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Building2 className="h-3 w-3 text-blue-500" />
                            {item.secretaria}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBar align="left">
                          <button
                            onClick={() => setEditando(item)}
                            className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600"
                            title="Editar localização e configurações"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </ActionBar>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Mostrando{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">
              {inicio + 1}–{Math.min(inicio + itensPorPagina, itensFiltrados.length)}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">{itensFiltrados.length}</span> itens
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            {(() => {
              const pages = []
              for (let i = 1; i <= totalPaginas; i++) {
                if (i === 1 || i === totalPaginas || (i >= paginaAtual - 1 && i <= paginaAtual + 1)) {
                  pages.push(i)
                } else if (pages[pages.length - 1] !== '...') {
                  pages.push('...')
                }
              }
              return pages.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="px-1.5 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPaginaAtual(p)}
                    className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      paginaAtual === p
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )
            })()}
            <button
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {editando !== null && (
        <ItemModal
          item={editando}
          onClose={() => { setEditando(null); setErro('') }}
          onSave={handleSave}
          saving={saving}
          erro={erro}
        />
      )}
    </div>
  )
}
