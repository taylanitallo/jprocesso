import { useState, useEffect, useCallback } from 'react'
import { Search, Edit2, RefreshCw, Package, MapPin, AlertTriangle, Building2, Trash2 } from 'lucide-react'
import api from '../services/api'
import { Paginacao, usePorPagina } from '../components/ui'
import BotaoExcluidos from '../components/lixeira/BotaoExcluidos'
import { useAuth } from '../context/AuthContext'
import LoadingBar from '../components/LoadingBar'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, TIPO_ITEM } from './almoxConstants'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import SectionTitle from '../components/ui/SectionTitle'
import EmptyState from '../components/ui/EmptyState'
import ActionBar from '../components/ui/ActionBar'
import ConfirmModal from '../components/ui/ConfirmModal'

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
        <div className="bg-ink-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Item</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-ink-400">Código</span>
              <p className="font-mono font-medium text-ink-800">{item.codigo || '—'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-ink-400">Nome</span>
              <p className="font-medium text-ink-800 truncate">{item.nome || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-ink-400">Unidade</span>
              <p className="text-ink-700">{item.unidade || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-ink-400">Estoque Atual</span>
              <p className="font-semibold text-ink-800">{fmt(item.estoque_atual)}</p>
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-danger-700 dark:text-danger-400 rounded-lg px-4 py-2 text-sm">
            {erro}
          </div>
        )}

        {/* Localização */}
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Localização no Almoxarifado
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Corredor</label>
            <input
              value={form.corredor ?? ''}
              onChange={e => set('corredor', e.target.value)}
              placeholder="A"
              maxLength={20}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Prateleira</label>
            <input
              value={form.prateleira ?? ''}
              onChange={e => set('prateleira', e.target.value)}
              placeholder="3"
              maxLength={20}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Gaveta</label>
            <input
              value={form.gaveta ?? ''}
              onChange={e => set('gaveta', e.target.value)}
              placeholder="G1"
              maxLength={20}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Secretaria */}
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex items-center gap-1">
          <Building2 className="h-3 w-3" /> Secretaria / Departamento
        </p>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Secretaria</label>
          <input
            value={form.secretaria ?? ''}
            onChange={e => set('secretaria', e.target.value)}
            placeholder="Ex: Secretaria de Saúde"
            className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Config de estoque */}
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Configuração de Estoque</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Est. Mínimo</label>
            <input
              type="number" step="0.001" min="0"
              value={form.estoque_minimo}
              onChange={e => set('estoque_minimo', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Est. Máximo</label>
            <input
              type="number" step="0.001" min="0"
              value={form.estoque_maximo ?? ''}
              onChange={e => set('estoque_maximo', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Valor Unit. (R$)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.valor_unitario}
              onChange={e => set('valor_unitario', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Tipo de Item</label>
            <select
              value={form.tipo_item || 'CONSUMO'}
              onChange={e => set('tipo_item', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            >
              {Object.entries(TIPO_ITEM).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Ponto de Ressuprimento</label>
            <input
              type="number" step="0.001" min="0"
              value={form.ponto_ressuprimento ?? ''}
              onChange={e => set('ponto_ressuprimento', e.target.value)}
              placeholder="0"
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
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
  const { user } = useAuth()
  const isAdmin = user?.tipo === 'admin' || user?.tipo === 'jeos'
  const [secMap, setSecMap] = useState({})
  useEffect(() => {
    api.get('/organizacao/secretarias')
      .then(({ data }) => {
        const list = data.secretarias || data || []
        const m = {}
        list.forEach(s => { if (s.nome && s.sigla) m[s.nome.trim().toLowerCase()] = s.sigla })
        setSecMap(m)
      })
      .catch(() => {})
  }, [])
  const secSigla = (nome) => {
    if (!nome) return '—'
    return secMap[nome.trim().toLowerCase()] || nome
  }
  const [todosItens,  setTodosItens]  = useState([])
  const [fCodigo,     setFCodigo]     = useState('')
  const [fDescricao,  setFDescricao]  = useState('')
  const [fSecretaria, setFSecretaria] = useState('')
  const [fTipo,       setFTipo]       = useState('')
  const [editando,    setEditando]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [erro,        setErro]        = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = usePorPagina('almox-estoque', 15)

  const temFiltro = fCodigo || fDescricao || fSecretaria || fTipo

  const limparFiltros = () => {
    setFCodigo(''); setFDescricao(''); setFSecretaria(''); setFTipo('')
    setPaginaAtual(1)
  }

  const estoqueStatus = (item) => {
    const atual = parseFloat(item.estoque_atual)
    const min   = parseFloat(item.estoque_minimo)
    if (min > 0 && atual <= min)       return 'critico'
    if (min > 0 && atual <= min * 1.5) return 'atencao'
    return 'ok'
  }

  // Secretarias presentes no estoque carregado (alimenta o filtro)
  const secretariasDisponiveis = [...new Set(
    todosItens.map(i => i.secretaria).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))

  const codigoLower    = fCodigo.toLowerCase()
  const descricaoLower = fDescricao.toLowerCase()
  const itensFiltrados = todosItens.filter(item => {
    if (fCodigo && !String(item.codigo || '').toLowerCase().includes(codigoLower)) return false
    if (fDescricao && !(
      item.nome?.toLowerCase().includes(descricaoLower) ||
      item.categoria?.toLowerCase().includes(descricaoLower)
    )) return false
    if (fSecretaria && item.secretaria !== fSecretaria) return false
    if (fTipo && item.tipo_item !== fTipo) return false
    return true
  })

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

  const [confirmarExcluir, setConfirmarExcluir] = useState(null)

  const handleDelete = async (item) => {
    try {
      await api.delete(`/almoxarifado/itens/${item.id}`)
      setConfirmarExcluir(null)
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir item')
    }
  }

  return (
    <div>
      <PageHeader
        icon={Package}
        eyebrow="Almoxarifado"
        title="Estoque"
        subtitle="Itens com entradas registradas — quantidade, localização e secretaria"
        actions={
          <div className="flex items-center gap-2">
            <BotaoExcluidos entidade="almox_itens" rotulo="Itens excluídos" onAlterado={load} />
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 border border-ink-300 text-ink-600 rounded-lg text-sm hover:bg-ink-50"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <FilterBar
        actions={
          temFiltro ? (
            <button
              onClick={limparFiltros}
              className="text-sm text-ink-500 hover:text-ink-700 underline"
            >
              Limpar filtros
            </button>
          ) : null
        }
      >
        <div className="flex flex-col gap-1 w-full sm:w-40">
          <label className="text-xs font-medium text-ink-500">Código</label>
          <input
            value={fCodigo}
            onChange={e => { setFCodigo(e.target.value); setPaginaAtual(1) }}
            placeholder="Código do item"
            className="w-full px-3 py-2 border border-ink-300 rounded-lg text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <label className="text-xs font-medium text-ink-500">Descrição</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              value={fDescricao}
              onChange={e => { setFDescricao(e.target.value); setPaginaAtual(1) }}
              placeholder="Nome ou categoria"
              className="w-full pl-9 pr-4 py-2 border border-ink-300 rounded-lg text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-52">
          <label className="text-xs font-medium text-ink-500">Secretaria</label>
          <select
            value={fSecretaria}
            onChange={e => { setFSecretaria(e.target.value); setPaginaAtual(1) }}
            className="w-full py-2 px-3 border border-ink-300 rounded-lg text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            {secretariasDisponiveis.map(s => <option key={s} value={s}>{secSigla(s)}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-40">
          <label className="text-xs font-medium text-ink-500">Tipo</label>
          <select
            value={fTipo}
            onChange={e => { setFTipo(e.target.value); setPaginaAtual(1) }}
            className="w-full py-2 px-3 border border-ink-300 rounded-lg text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {Object.entries(TIPO_ITEM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </FilterBar>

      {loading ? (
        <LoadingBar label="Carregando itens..." />
      ) : todosItens.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum item em estoque"
          description="Registre entradas na aba Entradas para os itens aparecerem aqui."
        />
      ) : (
        <div className="bg-surface rounded-xl border border-ink-200 overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle
              icon={Package}
              title="Itens em Estoque"
              subtitle={`${itensFiltrados.length} de ${todosItens.length} item(ns)`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 border-b border-ink-200">
                <tr>
                  {['Código', 'Item', 'Tipo', 'Unid.', 'Qtd. em Estoque', 'Valor Unit.', 'Localização', 'Secretaria', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-0">
                      <EmptyState
                        icon={Search}
                        title="Nenhum item encontrado"
                        description="Nenhum item corresponde aos filtros aplicados"
                      />
                    </td>
                  </tr>
                )}
                {itens.map(item => {
                  const st = estoqueStatus(item)
                  const localizacao = [item.corredor, item.prateleira, item.gaveta].filter(Boolean).join('-') || item.localizacao || '—'
                  return (
                    <tr key={item.id} className="hover:bg-ink-50">
                      <td className="px-4 py-3 font-mono text-xs text-ink-600 whitespace-nowrap">{item.codigo}</td>
                      <td className="px-4 py-3 font-medium text-ink-900 dark:text-white max-w-xs truncate">{item.nome}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {TIPO_ITEM[item.tipo_item] ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_ITEM[item.tipo_item].color}`}>
                            {TIPO_ITEM[item.tipo_item].label}
                          </span>
                        ) : <span className="text-ink-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{item.unidade}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${
                          st === 'critico' ? 'text-danger-600 dark:text-danger-400' :
                          st === 'atencao' ? 'text-warning-600 dark:text-warning-400' :
                                             'text-ink-900'
                        }`}>
                          {fmt(item.estoque_atual)}
                          {st !== 'ok' && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{fmtMoney(item.valor_unitario)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {localizacao !== '—' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-600">
                            <MapPin className="h-3 w-3 text-amber-500" />
                            {localizacao}
                          </span>
                        ) : (
                          <span className="text-ink-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {item.secretaria ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-ink-600 truncate"
                            title={item.secretaria}
                          >
                            <Building2 className="h-3 w-3 text-info-500 shrink-0" />
                            <span className="truncate">{secSigla(item.secretaria)}</span>
                          </span>
                        ) : (
                          <span className="text-ink-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBar align="left">
                          <button
                            onClick={() => setEditando(item)}
                            className="p-1.5 rounded-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600"
                            title="Editar localização e configurações"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setConfirmarExcluir(item)}
                              className="p-1.5 rounded-sm hover:bg-danger-50 dark:hover:bg-danger-900/20 text-danger-500"
                              title="Excluir item do estoque"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
      <Paginacao total={itensFiltrados.length} pagina={paginaAtual} setPagina={setPaginaAtual}
        porPagina={itensPorPagina} setPorPagina={(n) => { setItensPorPagina(n); setPaginaAtual(1) }}
        rotulo="item" rotuloPlural="itens" className="mt-4" />

      {editando !== null && (
        <ItemModal
          item={editando}
          onClose={() => { setEditando(null); setErro('') }}
          onSave={handleSave}
          saving={saving}
          erro={erro}
        />
      )}

      {confirmarExcluir && (
        <ConfirmModal
          title={`Excluir "${confirmarExcluir.nome}"?`}
          message="O item sai do estoque e vai para os Itens excluídos, de onde pode ser restaurado."
          confirmLabel="Excluir"
          onConfirm={() => handleDelete(confirmarExcluir)}
          onClose={() => setConfirmarExcluir(null)}
        />
      )}
    </div>
  )
}
