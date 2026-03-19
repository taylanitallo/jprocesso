import { useState, useEffect, useCallback } from 'react'
import { Search, Edit2, Trash2, AlertTriangle, RefreshCw, Package, Info, MapPin } from 'lucide-react'
import api from '../services/api'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, TIPO_ITEM } from './almoxConstants'

// ─── Modal de Estoque do Item ─────────────────────────────────────────────────
// Exibe campos do catálogo como somente-leitura e permite editar apenas dados de estoque
function ItemModal({ item, onClose, onSave, saving, erro }) {
  const [form, setForm] = useState({
    estoque_minimo: '',
    estoque_maximo: '',
    valor_unitario: '',
    localizacao: '',
    corredor: '',
    prateleira: '',
    gaveta: '',
    tipo_item: 'CONSUMO',
    ponto_ressuprimento: '',
    ...item,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <AlmoxModal title="Configurar Estoque do Item" onClose={onClose}>
      <div className="space-y-4">
        {/* Dados do catálogo (somente leitura) */}
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Item do Catálogo</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-gray-400">Código</span>
              <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{item.codigo || '—'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-gray-400">Descrição</span>
              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{item.nome || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Unidade</span>
              <p className="text-gray-700 dark:text-gray-300">{item.unidade || '—'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-gray-400">Categoria</span>
              <p className="text-gray-700 dark:text-gray-300">{item.categoria || '—'}</p>
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-2 text-sm">
            {erro}
          </div>
        )}

        {/* Dados de estoque (editáveis) */}
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
        {/* Tipo e Ponto de Ressuprimento */}
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

        {/* Endereçamento logístico */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Endereçamento Logístico
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localização (legado)</label>
          <input
            value={form.localizacao}
            onChange={e => set('localizacao', e.target.value)}
            placeholder="Ex: Prateleira A3"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Tab: Itens ───────────────────────────────────────────────────────────────
// Os itens são lidos do catálogo de Contratos (localStorage 'contratos_itens')
// e combinados com dados de estoque do banco (almoxarifado_itens) pelo código
export default function AlmoxItens() {
  const [todosItens, setTodosItens] = useState([])
  const [busca,      setBusca]      = useState('')
  const [editando,   setEditando]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [erro,       setErro]       = useState('')

  // Filtragem client-side sobre o catálogo já carregado
  const itens = busca
    ? todosItens.filter(item =>
        item.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        String(item.codigo || '').toLowerCase().includes(busca.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(busca.toLowerCase())
      )
    : todosItens

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Catálogo vem da API de contratos
      let catalogo = []
      try {
        const { data } = await api.get('/contratos/itens')
        catalogo = Array.isArray(data) ? data : []
      } catch { catalogo = [] }

      // 2. Dados de estoque vêm do banco
      let stockData = []
      try {
        const { data } = await api.get('/almoxarifado/itens')
        stockData = Array.isArray(data) ? data : []
      } catch { stockData = [] }

      // 3. Combina: para cada item do catálogo, busca o registro de estoque pelo código
      const merged = catalogo
        .filter(item => item.status !== 'EXCLUÍDO')
        .map(item => {
          const stock = stockData.find(s => String(s.codigo) === String(item.codigo)) || {}
          return {
            _catalogId: item.id,
            codigo:       item.codigo,
            nome:         item.descricao,       // Contratos usa 'descricao'
            unidade:      item.unidade_medida || 'UN',
            categoria:    item.categoria || '',
            // campos de estoque (do banco)
            id:                  stock.id    || null,
            estoque_atual:       stock.estoque_atual  ?? 0,
            estoque_minimo:      stock.estoque_minimo ?? 0,
            estoque_maximo:      stock.estoque_maximo ?? null,
            valor_unitario:      stock.valor_unitario ?? 0,
            localizacao:         stock.localizacao   || '',
            corredor:            stock.corredor      || '',
            prateleira:          stock.prateleira    || '',
            gaveta:              stock.gaveta        || '',
            tipo_item:           stock.tipo_item     || 'CONSUMO',
            ponto_ressuprimento: stock.ponto_ressuprimento ?? '',
          }
        })

      setTodosItens(merged)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true); setErro('')
    try {
      const payload = {
        codigo:               form.codigo,
        nome:                 form.nome,
        unidade:              form.unidade || 'UN',
        categoria:            form.categoria,
        estoque_minimo:       form.estoque_minimo,
        estoque_maximo:       form.estoque_maximo,
        valor_unitario:       form.valor_unitario,
        localizacao:          form.localizacao,
        corredor:             form.corredor,
        prateleira:           form.prateleira,
        gaveta:               form.gaveta,
        tipo_item:            form.tipo_item || 'CONSUMO',
        ponto_ressuprimento:  form.ponto_ressuprimento || null,
      }
      if (form.id) {
        await api.put(`/almoxarifado/itens/${form.id}`, payload)
      } else {
        await api.post('/almoxarifado/itens', payload)
      }
      setEditando(null)
      load()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao salvar configuração')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!id) return
    if (!window.confirm('Remover dados de estoque deste item do almoxarifado?')) return
    try {
      await api.delete(`/almoxarifado/itens/${id}`)
      load()
    } catch { }
  }

  const estoqueStatus = (item) => {
    const atual = parseFloat(item.estoque_atual)
    const min   = parseFloat(item.estoque_minimo)
    if (min > 0 && atual <= min)         return 'critico'
    if (min > 0 && atual <= min * 1.5)   return 'atencao'
    return 'ok'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, código ou categoria..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          title="Atualizar lista"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Aviso sobre origem dos itens */}
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-400">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Os itens são carregados do catálogo do módulo <strong>Contratos → Itens</strong>.
          Clique no ícone de edição para configurar estoque mínimo, valor e localização de cada item.
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : todosItens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <Package className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Nenhum item no catálogo</p>
          <p className="text-sm mt-1">Acesse <strong>Contratos → Itens</strong> para cadastrar itens no catálogo.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Código', 'Item', 'Tipo', 'Unid.', 'Estoque Atual', 'Pt.Ressup.', 'Valor Unit.', 'Endereço', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {itens.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nenhum item encontrado com "{busca}"
                  </td>
                </tr>
              )}
              {itens.map(item => {
                const st = estoqueStatus(item)
                return (
                  <tr key={item._catalogId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{item.codigo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-3">
                      {TIPO_ITEM[item.tipo_item] ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_ITEM[item.tipo_item].color}`}>
                          {TIPO_ITEM[item.tipo_item].label}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.unidade}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        st === 'critico' ? 'text-red-600' :
                        st === 'atencao' ? 'text-yellow-600' :
                                           'text-gray-900 dark:text-gray-100'
                      }`}>
                        {fmt(item.estoque_atual)}
                        {st !== 'ok' && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.ponto_ressuprimento ? fmt(item.ponto_ressuprimento) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtMoney(item.valor_unitario)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {[item.corredor, item.prateleira, item.gaveta].filter(Boolean).join('-') || item.localizacao || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditando(item)}
                          className="p-1.5 rounded hover:bg-amber-50 text-amber-600"
                          title="Configurar estoque"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {item.id && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            title="Remover dados de estoque"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editando !== null && (
        <ItemModal
          item={editando}
          onClose={() => setEditando(null)}
          onSave={handleSave}
          saving={saving}
          erro={erro}
        />
      )}
    </div>
  )
}
