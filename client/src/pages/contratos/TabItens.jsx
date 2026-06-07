import { useState, useEffect } from 'react'
import {
  PackageOpen, Tag, FileText, Search, X, Plus, Edit3, Trash2, Eye,
  BarChart2, List, Check, AlertTriangle, Printer, ChevronUp, ChevronDown,
  CheckCircle2, ShoppingBag
} from 'lucide-react'
import api from '../../services/api'
import {
  CATEGORIAS, UNIDADES, STATUS_ITEM, proximoCodigo,
  SectionCard, PremiumInput, PremiumSelect, PremiumTextarea
} from './ContratosShared'

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE ITEM (Incluir / Alterar / Visualizar) — PREMIUM
// ══════════════════════════════════════════════════════════════════════════════
function ItemModal({ modo, item, onSave, onClose }) {
  const readonly = modo === 'visualizar'
  const [form, setForm] = useState(() => ({
    descricao:        item?.descricao        || '',
    categoria:        item?.categoria        || '',
    unidade_medida:   item?.unidade_medida   || '',
    codigo_item:      item?.codigo_item      || '',
    lote:             item?.lote             || '',
    catalogo:         item?.catalogo         || '',
    classificacao:    item?.classificacao    || '',
    subclassificacao: item?.subclassificacao || '',
    especificacao:    item?.especificacao    || item?.detalhes || '',
    palavra1:         item?.palavra1         || '',
    palavra2:         item?.palavra2         || '',
    palavra3:         item?.palavra3         || '',
    palavra4:         item?.palavra4         || '',
    catmat_serv:      item?.catmat_serv      || '',
    status:           item?.status           || 'ATIVO',
    validado:         item?.validado         || false,
  }))
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const titulo = { novo: 'Inclusão', editar: 'Edição', visualizar: 'Visualização' }[modo]

  const salvar = () => {
    if (!form.descricao.trim()) { alert('Informe a descrição do item.'); return }
    if (!form.categoria)        { alert('Selecione a categoria.'); return }
    if (!form.unidade_medida)   { alert('Selecione a unidade de medida.'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-gray-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '680px' }}>

        {/* ── Header Premium ── */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/60 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
                <PackageOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {readonly ? 'Detalhes do Item' : `Item — ${titulo}`}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {readonly ? 'Informações completas do item cadastrado' : 'Preencha as informações do item do catálogo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {form.status && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  form.status === 'ATIVO'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>{form.status}</span>
              )}
              {form.validado && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  ✓ Validado
                </span>
              )}
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-4">

              {/* Identificação */}
              <SectionCard icon={Tag} title="Identificação" subtitle="Código, descrição e classificação do item">
                <div className="grid grid-cols-12 gap-4">
                  {/* Código sequencial */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Código</label>
                    {modo === 'novo'
                      ? <p className="h-11 flex items-center px-3.5 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-xs text-gray-400 dark:text-slate-500 italic">Auto</p>
                      : <p className="font-mono font-bold text-lg text-gray-800 dark:text-slate-200">{item?.codigo || '—'}</p>
                    }
                  </div>

                  {/* Categoria */}
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Categoria *</label>
                    {readonly
                      ? <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{form.categoria || '—'}</p>
                      : <PremiumSelect value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                          <option value="">Selecione...</option>
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </PremiumSelect>
                    }
                  </div>

                  {/* Unidade */}
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Unidade de Medida *</label>
                    {readonly
                      ? <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{form.unidade_medida || '—'}</p>
                      : <PremiumSelect value={form.unidade_medida} onChange={e => set('unidade_medida', e.target.value)}>
                          <option value="">Selecione...</option>
                          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </PremiumSelect>
                    }
                  </div>

                  {/* Descrição */}
                  <div className="col-span-12">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                      Descrição do Item (Nomenclatura) *
                    </label>
                    {readonly
                      ? <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 uppercase">{form.descricao}</p>
                      : <PremiumInput
                          value={form.descricao}
                          onChange={e => set('descricao', e.target.value.toUpperCase())}
                          placeholder="NOMENCLATURA DO ITEM..."
                          className="uppercase font-medium"
                          autoFocus
                        />
                    }
                  </div>
                </div>
              </SectionCard>

              {/* Especificação */}
              <SectionCard icon={FileText} title="Especificação" subtitle="Detalhamento técnico completo do item">
                {readonly
                  ? <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{form.especificacao || '—'}</p>
                  : <PremiumTextarea
                      value={form.especificacao}
                      onChange={e => set('especificacao', e.target.value)}
                      rows={4}
                      placeholder="Especificação técnica detalhada do item..."
                    />
                }
              </SectionCard>

              {/* Palavras-chave */}
              <SectionCard icon={Search} title="Palavras-chave para busca" subtitle="Termos que facilitam a localização do item">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n}>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Palavra {n}</label>
                      {readonly
                        ? <p className="text-sm text-gray-700 dark:text-slate-300">{form[`palavra${n}`] || '—'}</p>
                        : <PremiumInput value={form[`palavra${n}`]} onChange={e => set(`palavra${n}`, e.target.value)} placeholder={`Palavra ${n}...`} />
                      }
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* PNCP */}
              <SectionCard icon={FileText} title="Informações PNCP" subtitle="Portal Nacional de Contratações Públicas">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Catálogo CNBS</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.catalogo || '—'}</p>
                      : <PremiumInput value={form.catalogo} onChange={e => set('catalogo', e.target.value)} placeholder="Código CNBS..." className="font-mono" />
                    }
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Classificação</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.classificacao || '—'}</p>
                      : <PremiumInput value={form.classificacao} onChange={e => set('classificacao', e.target.value)} placeholder="Classificação..." />
                    }
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Subclassificação</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.subclassificacao || '—'}</p>
                      : <PremiumInput value={form.subclassificacao} onChange={e => set('subclassificacao', e.target.value)} placeholder="Subclassificação..." />
                    }
                  </div>
                </div>
              </SectionCard>


            </div>
          </div>
        </div>

        {/* ── Aviso + Footer ── */}
        <div className="bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/60 shrink-0">
          <div className="bg-amber-50 dark:bg-amber-900/15 border-b border-amber-100 dark:border-amber-800/30 px-5 py-2.5 flex items-center justify-between gap-4">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              No campo descrição, informar a <strong>nomenclatura</strong> do item — não a especificação!
            </p>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {item?.id && <span>ID: <span className="font-mono">{item.id}</span></span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all">
                {readonly ? 'Fechar' : 'Cancelar'}
              </button>
              {!readonly && (
                <button onClick={salvar}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
                  <Check className="w-4 h-4" /> Salvar Item
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: RELATÓRIO DO ITEM
// ══════════════════════════════════════════════════════════════════════════════
function RelatorioModal({ item, onClose }) {
  // Estrutura pronta — dados virão da API quando o backend for conectado
  const usos = []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Relatório do Item</h2>
            <p className="text-xs text-gray-500 mt-0.5">Todos os contratos e processos onde o item é utilizado</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Item selecionado</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm mt-0.5">{item.descricao}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>Código: <strong className="text-gray-700 dark:text-slate-300">{item.codigo || '—'}</strong></span>
            <span>Unidade: <strong className="text-gray-700 dark:text-slate-300">{item.unidade_medida}</strong></span>
            <span>Categoria: <strong className="text-gray-700 dark:text-slate-300">{item.categoria}</strong></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {usos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum uso encontrado</p>
              <p className="text-sm mt-1">Este item ainda não foi utilizado em nenhum contrato ou processo.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 font-semibold">Contrato / Processo</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Secretaria</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Qtd</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Valor Unit.</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {usos.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-medium text-blue-600">{u.contrato}</td>
                    <td className="px-3 py-2 text-gray-600">{u.secretaria}</td>
                    <td className="px-3 py-2 text-right">{u.quantidade}</td>
                    <td className="px-3 py-2 text-right">{u.valor_unit}</td>
                    <td className="px-3 py-2 text-right font-semibold">{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700/50 flex justify-between items-center">
          <span className="text-xs text-gray-400">{usos.length} registro(s) encontrado(s)</span>
          <div className="flex gap-3">
            <button className="btn-secondary text-sm flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: LISTAGEM
// ══════════════════════════════════════════════════════════════════════════════
function ListagemModal({ item, onClose }) {
  // Contratos e secretarias que possuem este item — dados virão da API
  const registros = []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><List className="w-4 h-4" /> Listagem</h2>
            <p className="text-xs text-slate-400 mt-0.5">Contratos e secretarias que possuem este item</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Item</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm mt-0.5">{item.descricao}</p>
          <p className="text-xs text-gray-500 mt-0.5">Código: {item.codigo || '—'} · {item.unidade_medida} · {item.categoria}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {registros.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">Este item não está presente em nenhum contrato ou secretaria.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 font-semibold">N° Contrato</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Credor</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Secretaria</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Vigência</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {registros.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-medium text-blue-600">{r.contrato}</td>
                    <td className="px-3 py-2 text-gray-600">{r.credor}</td>
                    <td className="px-3 py-2 text-gray-600">{r.secretaria}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{r.vigencia}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700/50 flex justify-between items-center">
          <span className="text-xs text-gray-400">{registros.length} registro(s)</span>
          <div className="flex gap-3">
            <button className="btn-secondary text-sm flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONFIRMAR EXCLUSÃO
// ══════════════════════════════════════════════════════════════════════════════
function ConfirmModal({ item, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Excluir Item</h3>
              <p className="text-sm text-gray-500">Esta ação marcará o item como excluído.</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-5">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{item.descricao}</p>
            <p className="text-xs text-red-500 mt-1">Código: {item.codigo || '—'}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function TabItens() {
  const [itens, setItens] = useState([])
  const FILTROS_VAZIOS = { descricao: '', codigo: '', categoria: '', status: '' }
  const [filtros, setFiltros]           = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]   = useState(null)
  const [modal, setModal]               = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'|'relatorio'|'listagem'
  const [ordenar, setOrdenar]           = useState({ col: 'descricao', asc: true })
  const [pagina, setPagina]             = useState(1)
  const PER_PAGE_ITEM = 20

  const recarregarItens = () =>
    api.get('/contratos/itens').then(r => setItens(r.data)).catch(() => {})

  useEffect(() => { recarregarItens() }, [])

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))

  const pesquisar = () => { setFiltrosAtivos({ ...filtros }); setPagina(1) }

  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS)
    setFiltrosAtivos(FILTROS_VAZIOS)
    setPagina(1)
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  const f = filtrosAtivos
  const itensFiltrados = itens
    .filter(item => {
      if (item.status === 'EXCLUÍDO') return false
      if (f.descricao && !item.descricao.toLowerCase().includes(f.descricao.toLowerCase())) return false
      if (f.codigo && !String(item.codigo || '').includes(f.codigo)) return false

      if (f.categoria && item.categoria !== f.categoria) return false
      if (f.status && item.status !== f.status) return false
      return true
    })
    .sort((a, b) => {
      const av = String(a[ordenar.col] || '')
      const bv = String(b[ordenar.col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const totalPagsItem = Math.max(1, Math.ceil(itensFiltrados.length / PER_PAGE_ITEM))
  const itensPaginados = itensFiltrados.slice((pagina - 1) * PER_PAGE_ITEM, pagina * PER_PAGE_ITEM)

  const itemSelecionado = itens.find(i => i.id === selecionado)

  const toggleSort = (col) => setOrdenar(p => ({ col, asc: p.col === col ? !p.asc : true }))
  const SortIcon = ({ col }) => {
    if (ordenar.col !== col) return null
    return ordenar.asc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  // ── Próximo código sequencial ────────────────────────────────────────────
  const proxCod = () => proximoCodigo(itens)

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const incluir = async (data) => {
    try {
      const { data: novo } = await api.post('/contratos/itens', data)
      setItens(prev => [...prev, novo])
      setModal(null)
    } catch { alert('Erro ao salvar item.') }
  }
  const alterar = async (data) => {
    try {
      const { data: atualizado } = await api.put(`/contratos/itens/${selecionado}`, data)
      setItens(prev => prev.map(i => i.id === selecionado ? atualizado : i))
      setModal(null)
    } catch { alert('Erro ao salvar item.') }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/itens/${selecionado}`)
      setItens(prev => prev.map(i => i.id === selecionado ? { ...i, status: 'EXCLUÍDO' } : i))
      setSelecionado(null)
      setModal(null)
    } catch { alert('Erro ao excluir item.') }
  }

  const abrirEditar = () => { if (itemSelecionado) setModal('editar') }
  const abrirExcluir = () => { if (itemSelecionado) setModal('excluir') }
  const abrirVisualizar = () => { if (itemSelecionado) setModal('visualizar') }
  const abrirRelatorio = () => { if (itemSelecionado) setModal('relatorio') }
  const abrirListagem = () => { if (itemSelecionado) setModal('listagem') }

  const podeAgir = !!itemSelecionado

  return (
    <div className="flex flex-col gap-3">

      {/* ── Mini KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Itens',  value: itens.length,                                              icon: PackageOpen,  color: 'from-blue-500 to-indigo-600'  },
          { label: 'Ativos',       value: itens.filter(i => i.status === 'ATIVO').length,            icon: CheckCircle2, color: 'from-green-500 to-emerald-600' },
          { label: 'Filtrados',    value: itensFiltrados.length,                                     icon: Search,       color: 'from-purple-500 to-violet-600' },
          { label: 'Categorias',   value: new Set(itens.map(i => i.categoria).filter(Boolean)).size, icon: Tag,          color: 'from-teal-500 to-cyan-600'    },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white leading-tight">{k.value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções para filtro</p>

        {/* Linha 1 */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Descrição</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={filtros.descricao} onChange={e => setF('descricao', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar pela descrição" className="input-field pl-8 text-sm" />
            </div>
          </div>
        </div>

        {/* Linha 2 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Código</label>
            <input value={filtros.codigo} onChange={e => setF('codigo', e.target.value)}
              placeholder="Código" className="input-field text-sm" />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Categoria</label>
            <select value={filtros.categoria} onChange={e => setF('categoria', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button onClick={limparFiltros}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              Limpar
            </button>
            <button onClick={pesquisar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors">
              <Search className="w-3.5 h-3.5" /> Pesquisar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs select-none uppercase tracking-wider">
                {[
                  { col: 'codigo',        label: 'Código',            cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-24' },
                  { col: 'descricao',     label: 'Descrição',         cls: 'text-left px-3 py-2.5 font-semibold min-w-[260px]' },
                  { col: 'unidade_medida',label: 'Unid. de medida',   cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'categoria',     label: 'Categoria',         cls: 'text-left px-3 py-2.5 font-semibold' },
                  { col: 'status',        label: 'Status',            cls: 'text-center px-3 py-2.5 font-semibold' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)}
                    style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-gray-400 dark:text-slate-500">
                    <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum item encontrado
                  </td>
                </tr>
              )}
              {itensPaginados.map(item => {
                const sel = item.id === selecionado
                return (
                  <tr key={item.id}
                    onClick={() => setSelecionado(sel ? null : item.id)}
                    onDoubleClick={() => { setSelecionado(item.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-300'
                    } ${item.status === 'EXCLUÍDO' ? 'opacity-50 line-through' : ''}`}
                  >
                    <td className="px-3 py-2 font-medium">{item.codigo || '—'}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">{item.descricao}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.unidade_medida}</td>
                    <td className="px-3 py-2">{item.categoria}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        item.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : item.status === 'EXCLUÍDO'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>{item.status}</span>
                    </td>


                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Detalhe do item selecionado */}
        {itemSelecionado?.detalhes && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-amber-700 dark:text-amber-400 mr-1">Detalhes:</span>
            {itemSelecionado.detalhes}
          </div>
        )}

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {itemSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {itemSelecionado.descricao}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-gray-500">
            Foram encontrados <strong>{itensFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

      {/* ── Paginação ── */}
      {totalPagsItem > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Mostrando{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">
              {(pagina - 1) * PER_PAGE_ITEM + 1}–{Math.min(pagina * PER_PAGE_ITEM, itensFiltrados.length)}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300">
              {itensFiltrados.length}
            </span>{' '}
            itens
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >← Anterior</button>
            {(() => {
              const pages = []
              for (let i = 1; i <= totalPagsItem; i++) {
                if (i === 1 || i === totalPagsItem || (i >= pagina - 1 && i <= pagina + 1)) {
                  pages.push(i)
                } else if (pages[pages.length - 1] !== '...') {
                  pages.push('...')
                }
              }
              return pages.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="px-1.5 text-xs text-gray-400 dark:text-slate-500">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      pagina === p
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >{p}</button>
                )
              )
            })()}
            <button
              onClick={() => setPagina(p => Math.min(totalPagsItem, p + 1))}
              disabled={pagina === totalPagsItem}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >Próximo →</button>
          </div>
        </div>
      )}

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Incluir
        </button>
        <button onClick={abrirEditar} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Edit3 className="w-4 h-4" /> Alterar
        </button>
        <button onClick={abrirExcluir} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
        <button onClick={abrirVisualizar} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Eye className="w-4 h-4" /> Visualizar
        </button>

        <div className="flex-1" />

        <button onClick={abrirRelatorio} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <BarChart2 className="w-4 h-4" /> Relatório do item
        </button>
        <button onClick={abrirListagem} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <List className="w-4 h-4" /> Listagem
        </button>
      </div>

      {/* ── Modais ── */}
      {modal === 'novo' && (
        <ItemModal modo="novo" item={null} onSave={incluir} onClose={() => setModal(null)} />
      )}
      {modal === 'editar' && itemSelecionado && (
        <ItemModal modo="editar" item={itemSelecionado} onSave={alterar} onClose={() => setModal(null)} />
      )}
      {modal === 'visualizar' && itemSelecionado && (
        <ItemModal modo="visualizar" item={itemSelecionado} onSave={null} onClose={() => setModal(null)} />
      )}
      {modal === 'excluir' && itemSelecionado && (
        <ConfirmModal item={itemSelecionado} onConfirm={excluir} onClose={() => setModal(null)} />
      )}
      {modal === 'relatorio' && itemSelecionado && (
        <RelatorioModal item={itemSelecionado} onClose={() => setModal(null)} />
      )}
      {modal === 'listagem' && itemSelecionado && (
        <ListagemModal item={itemSelecionado} onClose={() => setModal(null)} />
      )}
    </div>
  )
}


export default TabItens
