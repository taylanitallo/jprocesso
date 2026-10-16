import { useState, useEffect, useRef } from 'react'
import { usePode } from '../../utils/permissions'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText, ShoppingBag, User, Search, X, Plus, Edit3, Trash2, Eye,
  BarChart2, Check, AlertTriangle, ChevronUp, ChevronDown, Loader2,
  CheckCircle2, XCircle, Download, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, DollarSign, Building2, Award, Tag, Activity,
  List, PackageOpen, Landmark
} from 'lucide-react'
import api from '../../services/api'
import BotaoExcluidos from '../../components/lixeira/BotaoExcluidos'
import { Paginacao, usePorPagina } from '../../components/ui'
import { retanguloEmCss } from '../../utils/escalaTela'
import {
  MODALIDADES, TIPOS_OBJETO,
  VigenciaProgress, SectionCard, ModalStepper, PremiumInput,
  PremiumSelect, PremiumTextarea, ViewField, PortalDropdown, descricaoComEspecificacao
} from './ContratosShared'


// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: BUSCA DE ITEM DO CATÁLOGO
// ══════════════════════════════════════════════════════════════════════════════
function BuscarItemModal({ catalogoItens, onSelect, onClose }) {
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [unidFiltro, setUnidFiltro] = useState('')
  const [expId, setExpId] = useState(null)

  const todos = catalogoItens.filter(i => i.status === 'ATIVO')
  const categorias = [...new Set(todos.map(i => (i.categoria || '').toUpperCase()).filter(Boolean))].sort()
  const unidades = [...new Set(todos.map(i => (i.unidade_medida || '').toUpperCase()).filter(Boolean))].sort()

  const filtrados = todos.filter(i => {
    const q = busca.trim().toLowerCase()
    const matchBusca = !q ||
      (i.descricao     || '').toLowerCase().includes(q) ||
      (i.codigo        || '').toLowerCase().includes(q) ||
      (i.especificacao || '').toLowerCase().includes(q) ||
      (i.palavra1      || '').toLowerCase().includes(q) ||
      (i.palavra2      || '').toLowerCase().includes(q) ||
      (i.palavra3      || '').toLowerCase().includes(q) ||
      (i.palavra4      || '').toLowerCase().includes(q) ||
      (i.catalogo      || '').toLowerCase().includes(q) ||
      (i.catmat_serv   || '').toLowerCase().includes(q)
    const matchCat  = !catFiltro  || (i.categoria     || '').toUpperCase() === catFiltro
    const matchUnid = !unidFiltro || (i.unidade_medida || '').toUpperCase() === unidFiltro
    return matchBusca && matchCat && matchUnid
  })

  return (
    // Tela cheia (toda a área disponível)
    <div className="fixed inset-0 z-[60] flex bg-black/60 p-2 sm:p-3">
      <div className="bg-surface rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-ink-900 px-5 py-3.5 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Selecionar Item do Catálogo</span>
              <p className="text-xs text-ink-400 mt-0.5">Pesquise e selecione o item para adicionar ao contrato</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface/10 text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-5 pt-4 pb-3.5 border-b border-ink-200 shrink-0 space-y-3 bg-ink-50">
          {/* Busca principal */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por código, descrição, especificação, palavras-chave ou código CNBS..."
              className="w-full h-11 pl-10 pr-9 text-sm rounded-xl border border-ink-200 bg-surface focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden text-ink-900 dark:text-white shadow-sm"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros secundários */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Categoria */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">Categoria:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {['', ...categorias].map(cat => (
                  <button key={cat} type="button" onClick={() => setCatFiltro(cat)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${
                      catFiltro === cat
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'border-ink-300 text-ink-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-surface'
                    }`}>
                    {cat || 'Todas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Unidade */}
            {unidades.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">Unidade:</span>
                <select value={unidFiltro} onChange={e => setUnidFiltro(e.target.value)}
                  className="text-xs border border-ink-300 rounded-lg px-2.5 py-1.5 bg-surface text-ink-700 focus:ring-1 focus:ring-indigo-500 outline-hidden">
                  <option value="">Todas</option>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}

            {/* Contador */}
            <span className="text-xs text-ink-400 ml-auto font-medium">
              {filtrados.length} item(ns) encontrado(s)
            </span>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-ink-400">
              <PackageOpen className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium text-sm">{busca || catFiltro || unidFiltro ? 'Nenhum item encontrado para os filtros aplicados.' : 'Nenhum item cadastrado no sistema.'}</p>
              {(busca || catFiltro || unidFiltro) && (
                <button type="button" onClick={() => { setBusca(''); setCatFiltro(''); setUnidFiltro('') }}
                  className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-100 sticky top-0 z-10 border-b border-ink-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink-500 text-xs w-24 uppercase tracking-wider">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-500 text-xs uppercase tracking-wider">Descrição / Especificação</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-500 text-xs w-32 uppercase tracking-wider">Unidade</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-500 text-xs w-32 uppercase tracking-wider">Categoria</th>
                  <th className="w-28 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {filtrados.map(item => (
                  <tr key={item.id}
                    className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors"
                    onClick={() => onSelect(item)}>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold align-top">{item.codigo || '—'}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-ink-800 font-medium leading-snug">{item.descricao}</p>
                      {item.especificacao && (
                        <>
                          <p className={`text-xs text-ink-400 mt-0.5 leading-snug ${expId === item.id ? '' : 'line-clamp-2'}`}>
                            {item.especificacao}
                          </p>
                          {item.especificacao.length > 100 && (
                            <button type="button"
                              onClick={e => { e.stopPropagation(); setExpId(p => p === item.id ? null : item.id) }}
                              className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 mt-0.5 font-medium">
                              {expId === item.id ? 'ver menos ▲' : 'ver mais ▼'}
                            </button>
                          )}
                        </>
                      )}
                      {(item.palavra1 || item.palavra2 || item.palavra3 || item.palavra4) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[item.palavra1, item.palavra2, item.palavra3, item.palavra4].filter(Boolean).map((p, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-ink-100 text-ink-500 rounded-sm border border-ink-200">{p}</span>
                          ))}
                        </div>
                      )}
                      {item.catalogo && (
                        <p className="text-[10px] text-ink-400 mt-0.5 font-mono">CNBS: {item.catalogo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600 text-xs align-top whitespace-nowrap font-semibold">{item.unidade_medida || '—'}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        (item.categoria || '').toUpperCase() === 'COMPRAS'
                          ? 'bg-info-100 dark:bg-info-900/30 text-brand-700 dark:text-info-300'
                          : (item.categoria || '').toUpperCase() === 'SERVIÇOS'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-ink-100 text-ink-600'
                      }`}>{item.categoria || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                        <Check className="w-3 h-3" /> Selecionar
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-ink-200 px-5 py-3 shrink-0 flex items-center justify-between bg-ink-50">
          <p className="text-xs text-ink-400">Clique em um item para selecioná-lo e preencher os detalhes do contrato</p>
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 bg-ink-200 hover:bg-ink-300 text-ink-700 rounded-lg text-sm font-medium transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE CONTRATO (Incluir / Alterar / Visualizar)
// ══════════════════════════════════════════════════════════════════════════════
const STATUS_CONTRATO  = ['ATIVO','ENCERRADO','SUSPENSO','RESCINDIDO']
const TIPOS_CONTRATO   = ['CONTRATO','ATA DE REGISTRO DE PREÇO','TERMO ADITIVO','CONVÊNIO','ACORDO','OUTRO']

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: ITEM DO CONTRATO
// ══════════════════════════════════════════════════════════════════════════════
// Compara nomes de secretaria sem maiúscula/acento ("Secretaria de Educação" = "SECRETARIA DE EDUCAÇÃO")
const chaveTexto = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// Nomeação do responsável (data_inicio..data_fim) cobre algum dia da vigência do contrato.
// Sem vigência informada, vale a data de assinatura ou hoje.
const nomeacaoCobreVigencia = (r, f) => {
  if (!r?.data_inicio) return false
  const dia = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00') : null)
  const ini = dia(r.data_inicio), fim = dia(r.data_fim)
  const vIni = dia(f.vigencia_inicio || f.data_assinatura) || new Date(new Date().toDateString())
  const vFim = dia(f.vigencia_fim) || vIni
  return ini <= vFim && (!fim || fim >= vIni)
}

// Item distribuído por setor/local (ex.: locação de 4 impressoras — 3 na Secretaria e 1
// na Biblioteca — por 12 meses): Quantidade = meses (a unidade do contrato), "Valor de
// cada" = preço de uma impressora/mês. Média mensal = valor de cada × total distribuído
// e vira o V. Unitário do contrato; V. Total = quantidade × média mensal. Assim o saldo
// das ordens continua contado na unidade do contrato (mês).
const numBR = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0
const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const totalDistribuido = (dist) => (Array.isArray(dist) ? dist : []).reduce((s, d) => s + numBR(d.quantidade), 0)
const calcularItem = (f) => {
  const qtd = numBR(f.quantidade)
  if (f.distribuido) {
    const media = numBR(f.valor_unitario_base) * totalDistribuido(f.distribuicao)
    return { valor_unitario: media ? media.toFixed(2) : '', valor_total: qtd && media ? (qtd * media).toFixed(2) : '' }
  }
  const vun = numBR(f.valor_unitario)
  return { valor_unitario: f.valor_unitario, valor_total: qtd && vun ? (qtd * vun).toFixed(2) : '' }
}

function ItemContratoModal({ item, catalogoItens, onSave, onClose }) {
  const jaDistribuido = Array.isArray(item?.distribuicao) && item.distribuicao.length > 0
  const [form, setForm] = useState({
    lote:           item?.lote           || '',
    codigo_item:    item?.codigo_item    || '',
    item_id:        item?.item_id        || '',
    descricao:      item?.descricao      || '',
    unidade:        item?.unidade        || '',
    quantidade:     item?.quantidade     || '',
    valor_unitario: item?.valor_unitario || '',
    valor_total:    item?.valor_total    || '',
    distribuido:    jaDistribuido,
    distribuicao:   jaDistribuido ? item.distribuicao.map(d => ({ ...d })) : [{ local: '', quantidade: '' }],
    valor_unitario_base: item?.valor_unitario_base || '',
  })
  const [busca, setBusca] = useState(item?.descricao || '')
  const [drop, setDrop] = useState(false)
  const [dropRef, setDropRef] = useState(null)
  // Sugestões de local: setores cadastrados (o campo aceita texto livre, ex.: "BIBLI.")
  const [setoresSug, setSetoresSug] = useState([])
  useEffect(() => {
    api.get('/organizacao/setores').then(r => setSetoresSug((r.data?.setores || r.data || []).map(s => s.nome).filter(Boolean))).catch(() => {})
  }, [])
  const atualizar = (fn) => setForm(p => { const next = fn(p); return { ...next, ...calcularItem(next) } })
  const set = (k, v) => atualizar(p => ({ ...p, [k]: v }))
  const setDist = (i, k, v) => atualizar(p => ({ ...p, distribuicao: p.distribuicao.map((d, j) => j === i ? { ...d, [k]: v } : d) }))
  const addDist = () => atualizar(p => ({ ...p, distribuicao: [...p.distribuicao, { local: '', quantidade: '' }] }))
  const delDist = (i) => atualizar(p => ({ ...p, distribuicao: p.distribuicao.filter((_, j) => j !== i) }))
  const qtdDistribuida = totalDistribuido(form.distribuicao)

  const itensFiltrados = catalogoItens.filter(i => {
    if (i.status !== 'ATIVO') return false
    const q = busca.trim().toLowerCase()
    return !q || i.descricao.toLowerCase().includes(q) || (i.codigo || '').toLowerCase().includes(q)
  }).slice(0, 10)

  const selecionarCatalogo = (i) => {
    // Descrição + especificação do catálogo num campo só (segue para ordens e DID)
    const desc = descricaoComEspecificacao(i)
    setForm(p => ({ ...p, item_id: i.id, descricao: desc, unidade: i.unidade_medida || '' }))
    setBusca(desc)
    setDrop(false)
  }

  const salvar = () => {
    if (!form.descricao.trim()) { alert('Informe a descrição do item.'); return }
    const { distribuido, ...resto } = form
    if (distribuido) {
      const linhas = form.distribuicao.filter(d => String(d.local || '').trim() && numBR(d.quantidade) > 0)
      if (!linhas.length) { alert('Informe ao menos um setor/local com a quantidade.'); return }
      if (!numBR(form.valor_unitario_base)) { alert('Informe o valor de cada unidade.'); return }
      onSave({ ...resto, distribuicao: linhas.map(d => ({ local: d.local.trim(), quantidade: numBR(d.quantidade) })), _id: item?._id || (Date.now() + Math.random()) })
      return
    }
    onSave({ ...resto, distribuicao: null, valor_unitario_base: null, _id: item?._id || (Date.now() + Math.random()) })
  }

  return (
    // Tela cheia (toda a área disponível); o conteúdo rola se não couber
    <div className="fixed inset-0 z-[60] flex bg-black/60 p-2 sm:p-3">
      <div className="bg-surface rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-ink-900 px-5 py-3.5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-4 h-4 text-white/80" />
            <span className="text-sm font-semibold text-white">
              {item?.descricao ? 'Editar Item' : 'Novo Item'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-surface/10 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Lote + Nº Item */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-500 mb-1.5">Lote</label>
              <PremiumInput value={form.lote} onChange={e => set('lote', e.target.value)} placeholder="Ex: 01, A..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-500 mb-1.5">Nº do Item</label>
              <PremiumInput value={form.codigo_item} onChange={e => set('codigo_item', e.target.value)} placeholder="Ex: 1, A-01..." />
            </div>
          </div>

          {/* Descrição com busca no catálogo */}
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Descrição *</label>
            <div className="relative">
              <input
                value={busca}
                onChange={e => { setBusca(e.target.value); set('descricao', e.target.value); setDrop(true) }}
                onFocus={e => { setDrop(true); setDropRef(e.currentTarget.closest('.relative')) }}
                onBlur={() => setTimeout(() => { setDrop(false); setDropRef(null) }, 150)}
                placeholder="Buscar no catálogo ou digitar livremente..."
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-ink-200 bg-surface focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-hidden text-ink-900 dark:text-white"
              />
              {drop && dropRef && createPortal(
                <div style={{ position: 'fixed', zIndex: 10001, top: retanguloEmCss(dropRef).bottom + 4, left: retanguloEmCss(dropRef).left, width: retanguloEmCss(dropRef).width }}
                  className="bg-surface border border-ink-200 rounded-xl shadow-2xl max-h-44 overflow-y-auto">
                  {itensFiltrados.length === 0
                    ? <p className="px-3 py-2 text-xs text-ink-400">Nenhum item do catálogo — descrição livre</p>
                    : itensFiltrados.map(i => (
                      <button key={i.id} type="button" onMouseDown={() => selecionarCatalogo(i)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-info-50 dark:hover:bg-info-900/20 border-b border-ink-100 last:border-0">
                        <p className="font-medium text-ink-800 truncate">{i.descricao}</p>
                        <p className="text-ink-400 mt-0.5 font-mono text-[10px]">{i.codigo} · {i.unidade_medida} · {i.categoria}</p>
                      </button>
                    ))
                  }
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Distribuído por setor/local */}
          <label className="flex items-start gap-2 text-sm text-ink-700 cursor-pointer select-none">
            <input type="checkbox" checked={form.distribuido} onChange={e => set('distribuido', e.target.checked)} className="mt-0.5 accent-brand-600" />
            <span>
              <span className="font-semibold">Distribuído por setor/local</span>
              <span className="block text-xs text-ink-400">Ex.: locação de 4 impressoras — 3 na Secretaria e 1 na Biblioteca. A quantidade continua sendo a do contrato (ex.: 12 meses).</span>
            </span>
          </label>

          {/* Unidade + Qtd + V. Unit (ou Valor de cada) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-500 mb-1.5">Unidade</label>
              <PremiumInput value={form.unidade} onChange={e => set('unidade', e.target.value)} placeholder={form.distribuido ? 'MÊS' : 'UNID, KG...'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-500 mb-1.5">Quantidade *</label>
              <PremiumInput type="number" min={0} value={form.quantidade} onChange={e => set('quantidade', e.target.value)} placeholder="0" className="text-right font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-500 mb-1.5">{form.distribuido ? 'Valor de cada *' : 'V. Unitário *'}</label>
              {form.distribuido
                ? <PremiumInput type="number" min={0} step="0.01" value={form.valor_unitario_base} onChange={e => set('valor_unitario_base', e.target.value)} placeholder="0,00" className="text-right font-mono" />
                : <PremiumInput type="number" min={0} step="0.01" value={form.valor_unitario} onChange={e => set('valor_unitario', e.target.value)} placeholder="0,00" className="text-right font-mono" />}
            </div>
          </div>

          {form.distribuido && (
            <div className="rounded-xl border border-ink-200 p-3 space-y-2">
              <div className="grid grid-cols-[1fr_96px_28px] gap-2 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">
                <span>Setor / local</span><span className="text-right">Quantidade</span><span />
              </div>
              {form.distribuicao.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_96px_28px] gap-2 items-center">
                  <input list="sugestoes-local-item" value={d.local} onChange={e => setDist(i, 'local', e.target.value)}
                    placeholder="Ex.: SECRETARIA, BIBLIOTECA" className="input-field text-sm h-9" />
                  <input type="number" min={0} value={d.quantidade} onChange={e => setDist(i, 'quantidade', e.target.value)}
                    placeholder="0" className="input-field text-sm h-9 text-right font-mono" />
                  <button type="button" onClick={() => delDist(i)} disabled={form.distribuicao.length === 1}
                    className="p-1 rounded-sm text-danger-400 hover:text-danger-600 disabled:opacity-30" title="Remover">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <datalist id="sugestoes-local-item">{setoresSug.map(n => <option key={n} value={n} />)}</datalist>
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={addDist} className="text-xs font-semibold text-brand-600 dark:text-info-400 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Adicionar setor/local
                </button>
                <span className="text-xs text-ink-500">Total: <strong className="text-ink-800 font-mono">{qtdDistribuida}</strong></span>
              </div>
            </div>
          )}

          {/* Média mensal (distribuído) + V. Total */}
          {form.distribuido && form.valor_unitario && (
            <div className="flex items-center justify-end gap-2 text-sm font-semibold text-ink-700">
              <span className="text-xs font-medium text-ink-500">
                Média ({form.unidade || 'unidade'}): {brl(numBR(form.valor_unitario_base))} × {qtdDistribuida} =
              </span>
              {brl(numBR(form.valor_unitario))}
            </div>
          )}
          {form.valor_total && (
            <div className="flex items-center justify-end gap-2 text-sm font-bold text-brand-700 dark:text-info-400">
              <span className="text-xs font-medium text-ink-500">Valor total:</span>
              R$ {parseFloat(form.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between gap-3 shrink-0 border-t border-ink-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors">
            <Check className="w-4 h-4" /> Confirmar Item
          </button>
        </div>
      </div>
    </div>
  )
}

function ContratoModal({ modo, contrato, credores, onSave, onClose }) {
  const readonly = modo === 'visualizar'

  // Catálogo de itens do sistema
  const [catalogoItens, setCatalogoItens] = useState([])
  useEffect(() => {
    api.get('/contratos/itens').then(r => setCatalogoItens(r.data)).catch(() => {})
  }, [])

  const credorInicial = contrato?.credor_id
    ? credores.find(c => c.id === contrato.credor_id) || null
    : null

  const [form, setForm] = useState(() => ({
    tipo_contrato:    contrato?.tipo_contrato    || 'CONTRATO',
    numero_contrato:  contrato?.numero_contrato  || '',
    objeto:           contrato?.objeto           || '',
    modalidade:       contrato?.modalidade       || '',
    tipo_objeto:      contrato?.tipo_objeto      || '',
    numero_licitacao: contrato?.numero_licitacao || '',
    credor_id:        contrato?.credor_id        || '',
    valor:            contrato?.valor            || '',
    vigencia_inicio:  contrato?.vigencia_inicio  || '',
    vigencia_fim:     contrato?.vigencia_fim     || '',
    data_assinatura:  contrato?.data_assinatura  || '',
    secretaria:       contrato?.secretaria       || '',
    fiscal:           contrato?.fiscal           || '',
    banco:            contrato?.banco            || '',
    agencia:          contrato?.agencia          || '',
    conta:            contrato?.conta            || '',
    observacoes:      contrato?.observacoes      || '',
    status:           contrato?.status           || 'ATIVO',
    dias_alerta:      contrato?.dias_alerta      ?? 30,
  }))

  // Fontes de recurso (multi-valor)
  const [fontesRecurso, setFontesRecurso] = useState(() =>
    contrato?.fontes_recurso?.length ? [...contrato.fontes_recurso] : ['']
  )
  // Dotações orçamentárias (multi-valor)
  const [dotacoes, setDotacoes] = useState(() =>
    contrato?.dotacoes?.length ? [...contrato.dotacoes] : ['']
  )

  // Itens do contrato
  const [itensContrato, setItensContrato] = useState(() =>
    contrato?.itens ? [...contrato.itens] : []
  )
  const [itemContratoModal, setItemContratoModal] = useState(null) // null | { idx: number|null, data: object }
  // estado legado necessário para o modal BuscarItemModal
  const [itemBusca, setItemBusca] = useState({})
  const [itemDrop,  setItemDrop]  = useState(null)
  const [itemDropEl, setItemDropEl] = useState(null)
  const [itemModalIdx, setItemModalIdx] = useState(null)
  const [showAddPicker, setShowAddPicker] = useState(false)

  // Credor
  const [credorSel, setCredorSel] = useState(credorInicial)
  const [buscaCredor, setBuscaCredor] = useState(credorInicial?.razao_social || '')
  const [dropdownCredor, setDropdownCredor] = useState(false)
  const credorAnchorRef = useRef(null)

  // Secretaria (via API)
  const [secretarias, setSecretarias] = useState([])
  const [secSel, setSecSel] = useState(null)
  const [buscaSec, setBuscaSec] = useState(contrato?.secretaria || '')
  const [dropdownSec, setDropdownSec] = useState(false)
  const secAnchorRef = useRef(null)

  useEffect(() => {
    api.get('/organizacao/secretarias')
      .then(r => {
        const lista = r.data.secretarias || []
        setSecretarias(lista)
        // Se editando, re-selecionar secretaria salva
        if (contrato?.secretaria) {
          // Contratos importados gravam "Secretaria de…"; o cadastro, "SECRETARIA DE…"
          const alvo = chaveTexto(contrato.secretaria)
          const encontrada = lista.find(s => chaveTexto(s.sigla) === alvo || chaveTexto(s.nome) === alvo)
          if (encontrada) setSecSel(encontrada)
        }
      })
      .catch(() => {})
  }, [])

  const secFiltradas = (() => {
    const q = buscaSec.trim().toLowerCase()
    if (!q) return secretarias.filter(s => s.ativo !== false).slice(0, 12)
    return secretarias.filter(s =>
      s.ativo !== false && (
        s.nome.toLowerCase().includes(q) ||
        (s.sigla || '').toLowerCase().includes(q)
      )
    ).slice(0, 12)
  })()

  // ── Fiscais da secretaria (aba Organização › Responsáveis) ──────────────────
  // Quem tem cargo de fiscal vem primeiro (se houver, só eles). Vale o fiscal cuja
  // nomeação cobre algum dia da vigência do contrato (pode ter sido nomeado depois
  // do início). Responsável sem nome não entra.
  const fiscaisClassificados = (() => {
    if (!secSel) return []
    const comNome = (secSel.responsaveis || []).filter(r => String(r.nome || '').trim())
    const fiscais = comNome.filter(r => /fiscal/i.test(r.cargo || ''))
    return (fiscais.length ? fiscais : comNome).map(r => ({ ...r, vigente: nomeacaoCobreVigencia(r, form) }))
  })()

  // Limpa o fiscal se a vigência mudar e a nomeação dele não cobrir mais o período
  useEffect(() => {
    if (!secSel || !form.fiscal) return
    const ainda = (secSel.responsaveis || []).some(r => r.nome === form.fiscal && nomeacaoCobreVigencia(r, form))
    if (!ainda) set('fiscal', '')
  }, [form.vigencia_inicio, form.vigencia_fim, form.data_assinatura, secSel])

  const selecionarSecretaria = (s) => {
    setSecSel(s)
    setBuscaSec(s.nome)
    set('secretaria', s.nome)
    setDropdownSec(false)
    // auto-seleciona o primeiro fiscal (cargo de fiscal) cuja nomeação cobre a vigência
    const comNome = (s.responsaveis || []).filter(r => String(r.nome || '').trim())
    const fiscais = comNome.filter(r => /fiscal/i.test(r.cargo || ''))
    const vigentes = (fiscais.length ? fiscais : comNome).filter(r => nomeacaoCobreVigencia(r, form))
    set('fiscal', vigentes.length >= 1 ? vigentes[0].nome : '')
  }

  const limparSecretaria = () => {
    setSecSel(null)
    setBuscaSec('')
    set('secretaria', '')
    set('fiscal', '')
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const titulo = { novo: 'Inclusão', editar: 'Edição', visualizar: 'Visualização' }[modo]

  // ── Alerta de vencimento ──────────────────────────────────────────────────
  const alertaVencimento = (() => {
    if (!form.vigencia_fim) return null
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const fim  = new Date(form.vigencia_fim + 'T00:00:00')
    const diff = Math.floor((fim - hoje) / 86400000)
    if (diff < 0)                              return { tipo: 'vencido',   texto: `Vencido há ${Math.abs(diff)} dia(s)` }
    if (diff <= (Number(form.dias_alerta)||30)) return { tipo: 'proximo',  texto: `Vence em ${diff} dia(s)` }
    return { tipo: 'vigente', texto: `Vigente · ${diff} dia(s) restante(s)` }
  })()

  const alertaCor = {
    vencido: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400 border border-danger-300',
    proximo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300',
    vigente: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 border border-success-300',
  }

  // ── Credor search ─────────────────────────────────────────────────────────
  const credoresFiltradosModal = (() => {
    const q = buscaCredor.trim().toLowerCase()
    if (!q) return credores.filter(c => c.status !== 'INATIVO').slice(0, 12)
    return credores.filter(c =>
      c.razao_social.toLowerCase().includes(q) ||
      (c.cnpj_cpf || '').includes(q)
    ).slice(0, 12)
  })()

  const selecionarCredor = (c) => {
    setCredorSel(c)
    setBuscaCredor(c.razao_social)
    set('credor_id', c.id)
    setDropdownCredor(false)
  }

  const limparCredor = () => { setCredorSel(null); setBuscaCredor(''); set('credor_id', '') }

  // ── Itens do contrato ─────────────────────────────────────────────────────
  const itemCatalogFiltrado = (busca) => {
    const q = (busca || '').trim().toLowerCase()
    if (!q) return catalogoItens.filter(i => i.status === 'ATIVO').slice(0, 10)
    return catalogoItens.filter(i =>
      i.status === 'ATIVO' && (
        (i.descricao || '').toLowerCase().includes(q) ||
        (i.codigo    || '').toLowerCase().includes(q)
      )
    ).slice(0, 10)
  }

  const novoItemRow = () => ({
    _id: Date.now() + Math.random(),
    lote: '',
    codigo_item: '',
    item_id: '',
    descricao: '',
    unidade: '',
    quantidade: '',
    valor_unitario: '',
    valor_total: '',
  })

  const adicionarItem = () => setShowAddPicker(true)

  const selecionarItemParaAdicionar = (item) => {
    setShowAddPicker(false)
    setItemContratoModal({
      idx: null,
      data: {
        item_id:        item.id,
        descricao:      descricaoComEspecificacao(item),
        unidade:        item.unidade_medida || '',
        lote:           '',
        codigo_item:    '',
        quantidade:     '',
        valor_unitario: '',
        valor_total:    '',
      }
    })
  }

  const removerItem = (idx) => {
    setItensContrato(p => p.filter((_, i) => i !== idx))
    setItemBusca(p => { const n = { ...p }; delete n[idx]; return n })
  }

  const setItem = (idx, k, v) => {
    setItensContrato(p => {
      const arr = [...p]
      arr[idx] = { ...arr[idx], [k]: v }
      // Auto-calcular valor_total
      if (k === 'quantidade' || k === 'valor_unitario') {
        const qtd = parseFloat(String(k === 'quantidade' ? v : arr[idx].quantidade).replace(',', '.')) || 0
        const vun = parseFloat(String(k === 'valor_unitario' ? v : arr[idx].valor_unitario).replace(',', '.')) || 0
        arr[idx].valor_total = qtd && vun ? (qtd * vun).toFixed(2) : ''
      }
      return arr
    })
  }

  const selecionarItemCatalogo = (idx, item) => {
    setItensContrato(p => {
      const arr = [...p]
      arr[idx] = {
        ...arr[idx],
        item_id:   item.id,
        descricao: descricaoComEspecificacao(item),
        unidade:   item.unidade_medida || '',
      }
      return arr
    })
    setItemBusca(p => ({ ...p, [idx]: descricaoComEspecificacao(item) }))
    setItemDrop(null)
  }

  // Algum item distribuído por setor: a tabela ganha a coluna V. Mensal
  const temDistribuido = itensContrato.some(it => Array.isArray(it.distribuicao) && it.distribuicao.length > 0)

  // ── Valor total automático ────────────────────────────────────────────────
  const valorTotalItens = itensContrato.reduce((acc, it) => {
    const v = parseFloat(String(it.valor_total || '0').replace(',', '.')) || 0
    return acc + v
  }, 0)

  const fmtBRL = (n) =>
    n > 0 ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''

  // Sincroniza valor do form com total dos itens
  const valorExibido = itensContrato.length > 0
    ? fmtBRL(valorTotalItens)
    : form.valor

  // ── Salvar ────────────────────────────────────────────────────────────────
  const salvar = () => {
    if (!form.numero_contrato.trim()) { alert('Informe o número do contrato.'); return }
    if (!form.objeto.trim())          { alert('Informe o objeto.'); return }
    if (!form.credor_id)              { alert('Selecione o credor.'); return }
    // Envia sempre valor numérico puro (nunca string formatada em BRL)
    const valorFinal = itensContrato.length > 0
      ? valorTotalItens
      : (form.valor ? parseFloat(String(form.valor).replace(/[^\d,.]/g, '').replace(',', '.')) || null : null)
    const fontesLimpas = fontesRecurso.map(s => s.trim()).filter(Boolean)
    const dotacoesLimpas = dotacoes.map(s => s.trim()).filter(Boolean)
    onSave({ ...form, valor: valorFinal, itens: itensContrato, fontes_recurso: fontesLimpas, dotacoes: dotacoesLimpas })
  }

  const alertaIcone = alertaVencimento?.tipo === 'vencido'
    ? <XCircle className="w-3.5 h-3.5" />
    : alertaVencimento?.tipo === 'proximo'
      ? <AlertTriangle className="w-3.5 h-3.5" />
      : <CheckCircle2 className="w-3.5 h-3.5" />

  const alertaBadgeCls = {
    vencido: 'bg-danger-100 text-danger-700 border-danger-200',
    proximo: 'bg-amber-100 text-amber-700 border-amber-200',
    vigente: 'bg-success-100 text-success-700 border-success-200',
  }

  return (
    // Incluir / Alterar / Ver contrato: tela cheia (toda a área disponível)
    <div className="fixed inset-0 z-50 flex bg-black/50 p-2 sm:p-3">
      <div className="bg-ink-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full h-full">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="bg-surface border-b border-ink-200 px-4 py-3 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-info-600 flex items-center justify-center shadow-lg shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-ink-900 dark:text-white truncate">
              {form.numero_contrato ? form.numero_contrato : 'Novo Contrato'}
              {form.tipo_contrato && form.tipo_contrato !== 'CONTRATO' && (
                <span className="ml-2 text-sm font-normal text-ink-500">· {form.tipo_contrato}</span>
              )}
            </h2>
            <p className="text-sm text-ink-500 truncate">
              {form.objeto ? form.objeto.substring(0, 80) + (form.objeto.length > 80 ? '…' : '') : 'Contrato — ' + titulo}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {form.status && (
              <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold border ${
                form.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                form.status === 'ENCERRADO' ? 'bg-ink-100 text-ink-600 border-ink-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>{form.status}</span>
            )}
            {alertaVencimento && (
              <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold border ${alertaBadgeCls[alertaVencimento.tipo]}`}>
                {alertaIcone} {alertaVencimento.texto}
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-ink-400 hover:text-ink-600 hover:bg-ink-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Barra de Progresso de Vigência ─────────────────────────── */}
        {(form.vigencia_inicio || form.vigencia_fim) && (
          <VigenciaProgress inicio={form.vigencia_inicio} fim={form.vigencia_fim} assinatura={form.data_assinatura} />
        )}

        {/* ── Corpo ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-4">

              {/* SectionCard — Identificação */}
              <SectionCard icon={FileText} title="Identificação" subtitle="Tipo, número e data de assinatura">
                {readonly ? (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4"><ViewField label="Tipo" value={form.tipo_contrato} /></div>
                    <div className="col-span-4"><ViewField label="Nº Contrato" value={form.numero_contrato} mono /></div>
                    <div className="col-span-4"><ViewField label="Data Assinatura" value={form.data_assinatura ? new Date(form.data_assinatura + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Tipo *</label>
                      <PremiumSelect value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)}>
                        {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
                      </PremiumSelect>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Nº Contrato *</label>
                      <PremiumInput value={form.numero_contrato} onChange={e => set('numero_contrato', e.target.value.toUpperCase())}
                        className="uppercase" placeholder="Ex: 001/2026" autoFocus />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Data Assinatura</label>
                      <PremiumInput type="date" value={form.data_assinatura} onChange={e => set('data_assinatura', e.target.value)} />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Objeto e Licitação */}
              <SectionCard icon={Award} title="Objeto e Licitação" subtitle="Descrição, modalidade e processo licitatório">
                {readonly ? (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12"><ViewField label="Objeto" value={form.objeto} /></div>
                    <div className="col-span-4"><ViewField label="Tipo de Objeto" value={form.tipo_objeto || '—'} /></div>
                    <div className="col-span-4"><ViewField label="Modalidade" value={form.modalidade || '—'} /></div>
                    <div className="col-span-4"><ViewField label="Nº Licitação" value={form.numero_licitacao || '—'} mono /></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Objeto *</label>
                      <PremiumTextarea value={form.objeto} onChange={e => set('objeto', e.target.value.toUpperCase())}
                        rows={3} className="uppercase resize-none" placeholder="Descrição do objeto do contrato..." />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-ink-500 mb-1.5">Tipo de Objeto *</label>
                        <PremiumSelect value={form.tipo_objeto} onChange={e => set('tipo_objeto', e.target.value)}>
                          <option value="">Selecione...</option>
                          {TIPOS_OBJETO.map(t => <option key={t} value={t}>{t}</option>)}
                        </PremiumSelect>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-500 mb-1.5">Modalidade</label>
                        <PremiumSelect value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>
                          <option value="">Selecione...</option>
                          {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                        </PremiumSelect>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-500 mb-1.5">Nº Licitação</label>
                        <PremiumInput value={form.numero_licitacao} onChange={e => set('numero_licitacao', e.target.value.toUpperCase())}
                          className="uppercase" placeholder="Ex: PE 012/2026" />
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Credor */}
              <SectionCard icon={User} title="Credor" subtitle="Empresa ou pessoa física contratada">
                {readonly ? (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12">
                      <ViewField label="Credor" value={credorSel ? `${credorSel.razao_social} · ${credorSel.cnpj_cpf}` : form.credor_id ? `ID: ${form.credor_id}` : '—'} />
                    </div>
                    <div className="col-span-4"><ViewField label="Banco" value={form.banco || '—'} /></div>
                    <div className="col-span-4"><ViewField label="Agência" value={form.agencia || '—'} mono /></div>
                    <div className="col-span-4"><ViewField label="Conta" value={form.conta || '—'} mono /></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative w-full">
                      {credorSel ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-11 px-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-medium text-ink-800 truncate">{credorSel.razao_social}</span>
                            <span className="text-ink-400 font-mono text-xs shrink-0">{credorSel.cnpj_cpf}</span>
                          </div>
                          <button type="button" onClick={limparCredor} className="p-2 rounded-xl border border-ink-200 text-ink-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative" ref={credorAnchorRef}>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                          <PremiumInput
                            value={buscaCredor}
                            onChange={e => { setBuscaCredor(e.target.value); setDropdownCredor(true) }}
                            onFocus={() => setDropdownCredor(true)}
                            onBlur={() => setTimeout(() => setDropdownCredor(false), 150)}
                            className="pl-10" placeholder="Buscar credor por nome ou CNPJ/CPF..."
                          />
                          <PortalDropdown anchorRef={credorAnchorRef} open={dropdownCredor}>
                            {credoresFiltradosModal.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-ink-400">Nenhum credor encontrado.</p>
                            ) : credoresFiltradosModal.map(c => (
                              <button key={c.id} type="button" onMouseDown={() => selecionarCredor(c)}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-info-50 dark:hover:bg-info-900/20 flex items-center gap-3 border-b border-ink-100 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-ink-800 truncate">{c.razao_social}</p>
                                  <p className="text-xs text-ink-400 mt-0.5 font-mono">{c.cnpj_cpf}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'}`}>{c.status}</span>
                              </button>
                            ))}
                          </PortalDropdown>
                        </div>
                      )}
                    </div>

                    {/* Dados bancários do credor (para pagamento deste contrato) */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1.5">
                        <Landmark className="w-3.5 h-3.5" /> Dados Bancários <span className="font-normal text-ink-400">(opcional)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <PremiumInput value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Banco" />
                        <PremiumInput value={form.agencia} onChange={e => set('agencia', e.target.value)} placeholder="Agência" />
                        <PremiumInput value={form.conta} onChange={e => set('conta', e.target.value)} placeholder="Conta" />
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Vigência */}
              <SectionCard icon={Activity} title="Vigência" subtitle="Datas de início, fim e alerta de vencimento">
                {readonly ? (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4"><ViewField label="Início" value={form.vigencia_inicio ? new Date(form.vigencia_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} /></div>
                    <div className="col-span-4"><ViewField label="Fim" value={form.vigencia_fim ? new Date(form.vigencia_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} /></div>
                    <div className="col-span-4"><ViewField label="Alerta (dias)" value={form.dias_alerta} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Início</label>
                      <PremiumInput type="date" value={form.vigencia_inicio} onChange={e => set('vigencia_inicio', e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Fim</label>
                      <PremiumInput type="date" value={form.vigencia_fim} onChange={e => set('vigencia_fim', e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Alerta (dias)</label>
                      <PremiumInput type="number" min={0} value={form.dias_alerta}
                        onChange={e => set('dias_alerta', Number(e.target.value))} placeholder="30" />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Responsáveis */}
              <SectionCard icon={Building2} title="Responsáveis" subtitle="Secretaria e fiscal do contrato">
                {readonly ? (
                  <div className="grid grid-cols-2 gap-4">
                    <ViewField label="Secretaria" value={form.secretaria || '—'} />
                    <ViewField label="Fiscal" value={form.fiscal || '—'} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Secretaria</label>
                      {secSel ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 flex items-center gap-2 text-sm overflow-hidden">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-medium text-ink-800 truncate">{secSel.nome}</span>
                            {secSel.sigla && <span className="text-ink-400 text-xs shrink-0 whitespace-nowrap">({secSel.sigla})</span>}
                          </div>
                          <button type="button" onClick={limparSecretaria} className="shrink-0 p-2 rounded-xl border border-ink-200 text-ink-400 hover:text-danger-500 hover:bg-danger-50 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative" ref={secAnchorRef}>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                          <PremiumInput
                            value={buscaSec}
                            onChange={e => { setBuscaSec(e.target.value); set('secretaria', e.target.value.toUpperCase()); setDropdownSec(true) }}
                            onFocus={() => setDropdownSec(true)}
                            onBlur={() => setTimeout(() => setDropdownSec(false), 150)}
                            className="pl-10 uppercase" placeholder="Buscar secretaria..."
                          />
                          <PortalDropdown anchorRef={secAnchorRef} open={dropdownSec && secretarias.length > 0}>
                            {secFiltradas.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-ink-400">Nenhuma encontrada.</p>
                            ) : secFiltradas.map(s => (
                              <button key={s.id} type="button" onMouseDown={() => selecionarSecretaria(s)}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-info-50 dark:hover:bg-info-900/20 flex items-center gap-3 border-b border-ink-100 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-ink-800 truncate">{s.nome}</p>
                                  {s.sigla && <p className="text-xs text-ink-400 font-mono mt-0.5">{s.sigla}</p>}
                                </div>
                              </button>
                            ))}
                          </PortalDropdown>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">Fiscal</label>
                      <div className="flex items-center gap-2 min-w-0">
                        <PremiumSelect value={form.fiscal} onChange={e => set('fiscal', e.target.value)} disabled={!secSel}
                          className={!secSel ? 'opacity-50 cursor-not-allowed' : ''}>
                          <option value="">{!secSel ? 'Selecione a secretaria primeiro' : fiscaisClassificados.length === 0 ? 'Nenhum fiscal em Organização › Responsáveis' : 'Selecione o fiscal...'}</option>
                          {fiscaisClassificados.map((r, idx) => (
                            <option key={idx} value={r.nome} disabled={!r.vigente}>
                              {r.vigente ? r.nome : `${r.nome} (nomeação fora da vigência)`}
                            </option>
                          ))}
                        </PremiumSelect>
                        {form.fiscal && (
                          <button type="button" onClick={() => set('fiscal', '')}
                            className="p-2 rounded-xl border border-ink-200 text-ink-400 hover:text-danger-500 hover:bg-danger-50 transition-colors shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* SectionCard — Itens do Contrato */}
              <SectionCard icon={ShoppingBag} title="Itens do Contrato" subtitle="Produtos e serviços contratados">
                {itensContrato.length === 0 ? (
                  <div className="text-center py-6 text-ink-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum item adicionado</p>
                    {!readonly && (
                      <button type="button" onClick={() => setShowAddPicker(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Adicionar Item
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-ink-200">
                      <table className="w-full text-xs">
                        <thead className="bg-ink-100 text-ink-600 uppercase tracking-wide">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                            <th className="px-3 py-2 text-left font-semibold">Lote</th>
                            <th className="px-3 py-2 text-left font-semibold">Nº Item</th>
                            <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                            <th className="px-3 py-2 text-left font-semibold">Unid.</th>
                            <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                            <th className="px-3 py-2 text-right font-semibold">V. Unit.</th>
                            {temDistribuido && <th className="px-3 py-2 text-right font-semibold" title="Itens distribuídos por setor: valor de cada × total distribuído">V. Mensal</th>}
                            <th className="px-3 py-2 text-right font-semibold">V. Total</th>
                            <th className="px-3 py-2 w-20" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                          {itensContrato.map((it, idx) => (
                            <tr key={it._id || idx} className="bg-surface hover:bg-info-50/30 dark:hover:bg-info-900/10 transition-colors group">
                              <td className="px-3 py-2 text-ink-400 font-mono">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono text-ink-500">{it.lote || '—'}</td>
                              <td className="px-3 py-2 font-mono text-ink-500">{it.codigo_item || '—'}</td>
                              <td className="px-3 py-2 max-w-xs">
                                <p className="truncate text-ink-800 font-medium">{it.descricao || '—'}</p>
                                {Array.isArray(it.distribuicao) && it.distribuicao.length > 0 && (
                                  <p className="text-[11px] text-ink-500 mt-0.5">
                                    {it.distribuicao.map(d => `: `).join(' · ')} <span className="text-ink-400">(total {totalDistribuido(it.distribuicao)})</span>
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2 text-ink-500">{it.unidade || '—'}</td>
                              <td className="px-3 py-2 text-right font-mono">{it.quantidade || '—'}</td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(() => {
                                  // Distribuído: V. Unit. = valor de cada; o do contrato (média) vai em V. Mensal
                                  const v = it.distribuicao?.length ? it.valor_unitario_base : it.valor_unitario
                                  return v ? `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
                                })()}
                              </td>
                              {temDistribuido && (
                                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                                  {it.distribuicao?.length && it.valor_unitario ? `R$ ${parseFloat(it.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                              )}
                              <td className="px-3 py-2 text-right font-mono font-semibold text-brand-700 dark:text-info-400 whitespace-nowrap">
                                {it.valor_total ? `R$ ${parseFloat(it.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!readonly && (
                                    <>
                                      <button type="button" title="Editar item"
                                        onClick={() => setItemContratoModal({ idx, data: { ...it } })}
                                        className="p-1.5 rounded-lg text-info-500 hover:text-brand-700 hover:bg-info-50 dark:hover:bg-info-900/20 transition-colors">
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" title="Remover item"
                                        onClick={() => removerItem(idx)}
                                        className="p-1.5 rounded-lg text-danger-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {readonly && (
                                    <button type="button" title="Ver item"
                                      onClick={() => setItemContratoModal({ idx, data: { ...it }, readonly: true })}
                                      className="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-ink-50 transition-colors">
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-ink-100 border-t-2 border-ink-200">
                          <tr>
                            <td colSpan={temDistribuido ? 8 : 7} className="px-3 py-2 text-right text-xs font-bold text-ink-600 uppercase tracking-wide">Total do Contrato:</td>
                            <td className="px-3 py-2 text-right font-bold text-brand-700 dark:text-info-400 font-mono whitespace-nowrap">{fmtBRL(valorTotalItens) || '—'}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {!readonly && (
                      <button type="button" onClick={() => setShowAddPicker(true)}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Adicionar Item
                      </button>
                    )}
                  </>
                )}
              </SectionCard>

              {itemContratoModal && !itemContratoModal.readonly && (
                <ItemContratoModal
                  item={itemContratoModal.data}
                  catalogoItens={catalogoItens}
                  onSave={saved => {
                    const { idx } = itemContratoModal
                    if (idx === null) {
                      setItensContrato(p => [...p, { ...saved, _id: saved._id || (Date.now() + Math.random()) }])
                    } else {
                      setItensContrato(p => p.map((it, i) => i === idx ? { ...it, ...saved } : it))
                    }
                    setItemContratoModal(null)
                  }}
                  onClose={() => setItemContratoModal(null)}
                />
              )}
              {itemContratoModal?.readonly && (
                // Ver item do contrato: tela cheia (toda a área disponível)
                <div className="fixed inset-0 z-[60] flex bg-black/60 p-2 sm:p-3">
                  <div className="bg-surface rounded-2xl shadow-2xl w-full h-full p-6 space-y-3 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-ink-900 dark:text-white">Detalhes do Item</h3>
                      <button onClick={() => setItemContratoModal(null)} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400"><X className="w-4 h-4" /></button>
                    </div>
                    {[
                      ['Lote', itemContratoModal.data.lote],
                      ['Nº Item', itemContratoModal.data.codigo_item],
                      ['Descrição', itemContratoModal.data.descricao],
                      ['Unidade', itemContratoModal.data.unidade],
                      ['Quantidade', itemContratoModal.data.quantidade],
                      ['Distribuição', itemContratoModal.data.distribuicao?.length ? itemContratoModal.data.distribuicao.map(d => `: `).join(' · ') : null],
                      ['Valor de cada', itemContratoModal.data.distribuicao?.length && itemContratoModal.data.valor_unitario_base ? `R$ ${parseFloat(itemContratoModal.data.valor_unitario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
                      [itemContratoModal.data.distribuicao?.length ? 'Média mensal' : 'Valor Unitário', itemContratoModal.data.valor_unitario ? `R$ ${parseFloat(itemContratoModal.data.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
                      ['Valor Total', itemContratoModal.data.valor_total ? `R$ ${parseFloat(itemContratoModal.data.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
                    ].map(([label, val]) => val ? (
                      <div key={label} className="flex justify-between text-sm border-b border-ink-100 pb-2">
                        <span className="text-ink-500">{label}</span>
                        <span className="font-medium text-ink-800">{val}</span>
                      </div>
                    ) : null)}
                    <div className="flex justify-end pt-1">
                      <button onClick={() => setItemContratoModal(null)} className="px-4 py-2 text-sm rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50">Fechar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* SectionCard — Recursos */}
              <SectionCard icon={DollarSign} title="Recursos" subtitle="Valor, fontes de recurso e dotações orçamentárias">
                <div className="space-y-4">
                  {/* Valor */}
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">Valor Total</label>
                    {readonly ? (
                      <ViewField label="" value={valorExibido || '—'} mono />
                    ) : (
                      <div className="flex items-center gap-3">
                        <PremiumInput value={valorExibido}
                          onChange={e => { if (itensContrato.length === 0) set('valor', e.target.value) }}
                          readOnly={itensContrato.length > 0}
                          className={`w-52 font-mono ${itensContrato.length > 0 ? 'bg-ink-100 cursor-default font-bold text-brand-700 dark:text-info-400' : ''}`}
                          placeholder="R$ 0,00" />
                        {itensContrato.length > 0 && (
                          <span className="text-xs text-ink-500">Calculado pelos itens</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fontes de Recurso */}
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">Fontes de Recurso</label>
                    {readonly ? (
                      <div className="flex flex-wrap gap-2">
                        {fontesRecurso.filter(Boolean).length === 0
                          ? <span className="text-sm text-ink-400">—</span>
                          : fontesRecurso.filter(Boolean).map((f, i) => (
                            <span key={i} className="px-3 py-1 bg-info-100 dark:bg-info-900/30 text-brand-700 dark:text-info-400 rounded-full text-xs font-medium">{f}</span>
                          ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fontesRecurso.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <PremiumInput value={val}
                              onChange={e => setFontesRecurso(p => { const a = [...p]; a[i] = e.target.value.toUpperCase(); return a })}
                              className="flex-1 uppercase" placeholder="Ex: PRÓPRIO, FEDERAL, CONVÊNIO..." />
                            {fontesRecurso.length > 1 && (
                              <button type="button" onClick={() => setFontesRecurso(p => p.filter((_, j) => j !== i))}
                                className="p-2 rounded-xl border border-ink-200 text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setFontesRecurso(p => [...p, ''])}
                          className="flex items-center gap-1 text-xs text-brand-600 dark:text-info-400 hover:underline">
                          <Plus className="w-3 h-3" /> Adicionar fonte
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dotações */}
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">Dotações Orçamentárias</label>
                    {readonly ? (
                      <div className="flex flex-wrap gap-2">
                        {dotacoes.filter(Boolean).length === 0
                          ? <span className="text-sm text-ink-400">—</span>
                          : dotacoes.filter(Boolean).map((d, i) => (
                            <span key={i} className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-xs font-mono">{d}</span>
                          ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dotacoes.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <PremiumInput value={val}
                              onChange={e => setDotacoes(p => { const a = [...p]; a[i] = e.target.value; return a })}
                              className="flex-1 font-mono" placeholder="Ex: 3.3.90.39.00" />
                            {dotacoes.length > 1 && (
                              <button type="button" onClick={() => setDotacoes(p => p.filter((_, j) => j !== i))}
                                className="p-2 rounded-xl border border-ink-200 text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setDotacoes(p => [...p, ''])}
                          className="flex items-center gap-1 text-xs text-brand-600 dark:text-info-400 hover:underline">
                          <Plus className="w-3 h-3" /> Adicionar dotação
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* SectionCard — Observações */}
              <SectionCard icon={List} title="Observações" subtitle="Notas e informações adicionais">
                {readonly ? (
                  <ViewField label="" value={form.observacoes || '—'} />
                ) : (
                  <PremiumTextarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                    rows={3} className="resize-none" placeholder="Observações adicionais..." />
                )}
              </SectionCard>
            </div>
          </div>
        </div>

        {/* Modal de busca de item (inline) */}
        {itemModalIdx !== null && (
          <BuscarItemModal
            catalogoItens={catalogoItens}
            onSelect={item => {
              selecionarItemCatalogo(itemModalIdx, item)
              setItemModalIdx(null)
            }}
            onClose={() => setItemModalIdx(null)}
          />
        )}

        {/* Modal de seleção de item ao clicar "+ Adicionar Item" */}
        {showAddPicker && (
          <BuscarItemModal
            catalogoItens={catalogoItens}
            onSelect={selecionarItemParaAdicionar}
            onClose={() => setShowAddPicker(false)}
          />
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="bg-surface border-t border-ink-200 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            {contrato?.id && (
              <span className="text-xs text-ink-400 font-mono">ID #{contrato.id}</span>
            )}
            {itensContrato.length > 0 && (
              <span className="text-xs text-ink-500 ml-3">
                {itensContrato.length} item(ns) · <strong className="text-brand-700 dark:text-info-400">{fmtBRL(valorTotalItens)}</strong>
              </span>
            )}
          </div>
          {!readonly && (
            <button onClick={salvar}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
              <Check className="w-4 h-4" /> Salvar Contrato
            </button>
          )}
          <button onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl text-sm font-semibold transition-all">
            {readonly ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModalContrato({ contrato, onConfirm, onClose }) {
  const [loading, setLoading] = useState(true)
  const [ordens, setOrdens] = useState([])
  const [erro, setErro] = useState(null)

  useEffect(() => {
    api.get('/contratos/ordens', { params: { contrato_id: contrato.id } })
      .then(r => setOrdens((r.data || []).filter(o => o.status !== 'CANCELADA')))
      .catch(() => setErro('Não foi possível verificar as ordens vinculadas.'))
      .finally(() => setLoading(false))
  }, [contrato.id])

  const temVinculo = ordens.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${temVinculo ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-danger-100 dark:bg-danger-900/30'}`}>
              <AlertTriangle className={`w-5 h-5 ${temVinculo ? 'text-amber-600' : 'text-danger-600'}`} />
            </div>
            <div>
              <h3 className="font-bold text-ink-800">
                {loading ? 'Excluir Contrato' : temVinculo ? 'Contrato Vinculado — Não é possível excluir' : 'Excluir Contrato'}
              </h3>
              <p className="text-sm text-ink-500">
                {loading ? 'Verificando vínculos...' : temVinculo ? 'Exclua as ordens abaixo antes de excluir o contrato.' : 'Esta ação não pode ser desfeita.'}
              </p>
            </div>
          </div>

          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded-lg p-3 mb-4">
            <p className="text-sm text-danger-700 dark:text-danger-300 font-medium">{contrato.numero_contrato}</p>
            <p className="text-xs text-danger-500 mt-1 truncate">{contrato.objeto}</p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-400 py-2 mb-2">
              <span className="w-4 h-4 border-2 border-ink-300 border-t-blue-500 rounded-full animate-spin" />
              Verificando ordens vinculadas...
            </div>
          ) : erro ? (
            <p className="text-sm text-danger-500 mb-2">{erro}</p>
          ) : temVinculo && (
            <div className="mb-4 max-h-56 overflow-y-auto">
              <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">
                Ordens de Compra/Serviço ({ordens.length})
              </p>
              <div className="space-y-1">
                {ordens.map((o, i) => (
                  <div key={i} className="text-xs bg-ink-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{o.numero}</span>
                    <span className="text-ink-500 truncate">{o.tipo === 'COMPRA' ? 'Compra' : 'Serviço'}</span>
                    <span className="text-ink-400 shrink-0">{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">
              {temVinculo ? 'Fechar' : 'Cancelar'}
            </button>
            {!loading && !temVinculo && (
              <button onClick={onConfirm}
                className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-sm font-semibold transition-colors">
                Sim, Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB CONTRATOS
// ══════════════════════════════════════════════════════════════════════════════
function TabContratos() {
  // Ações conforme o editor de permissões. Só "Ver" = sem botões de ação.
  const pode = usePode('contratos', 'contratos')
  const { subdomain } = useParams()
  const navigate = useNavigate()
  const [contratos, setContratos] = useState([])
  const [credores, setCredores] = useState([])

  const recarregarContratos = () => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
    api.get('/contratos/credores').then(r => setCredores(r.data)).catch(() => {})
  }

  useEffect(() => {
    recarregarContratos()
  }, [])

  const FILTROS_VAZIOS = { numero: '', objeto: '', credor: '', modalidade: '', status: '' }
  const [filtros, setFiltros]               = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos]   = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]       = useState(null)
  const [modal, setModal]                   = useState(null)
  const [ordenar, setOrdenar]               = useState({ col: 'numero_contrato', asc: true })
  const [paginaCtr, setPaginaCtr]           = useState(1)
  const [PER_PAGE_CTR, setPorPaginaCtr] = usePorPagina('contratos', 15)

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const pesquisar  = () => { setFiltrosAtivos({ ...filtros }); setPaginaCtr(1) }
  // Busca enquanto digita (o botão continua funcionando)
  useEffect(() => { const t = setTimeout(pesquisar, 250); return () => clearTimeout(t) }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps

  const limpar     = () => { setFiltros(FILTROS_VAZIOS); setFiltrosAtivos(FILTROS_VAZIOS); setPaginaCtr(1) }

  const nomeCredor = (id) => credores.find(c => c.id === id)?.razao_social || '—'

  const f = filtrosAtivos
  const contratosFiltrados = contratos
    .filter(c => {
      if (f.numero  && !String(c.numero_contrato || '').toLowerCase().includes(f.numero.toLowerCase())) return false
      if (f.objeto  && !String(c.objeto || '').toLowerCase().includes(f.objeto.toLowerCase())) return false
      if (f.credor  && !nomeCredor(c.credor_id).toLowerCase().includes(f.credor.toLowerCase())) return false
      if (f.modalidade && c.modalidade !== f.modalidade) return false
      if (f.status  && c.status !== f.status) return false
      return true
    })
    .sort((a, b) => {
      const av = String(a[ordenar.col] || '')
      const bv = String(b[ordenar.col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const totalPagsCtr = Math.max(1, Math.ceil(contratosFiltrados.length / PER_PAGE_CTR))
  const contratosPaginados = contratosFiltrados.slice((paginaCtr - 1) * PER_PAGE_CTR, paginaCtr * PER_PAGE_CTR)

  const contratoSelecionado = contratos.find(c => c.id === selecionado)
  const podeAgir = !!contratoSelecionado

  const diasAteVencer = (d) => {
    if (!d) return null
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const fim  = new Date(d + 'T00:00:00'); fim.setHours(0, 0, 0, 0)
    return Math.ceil((fim - hoje) / 86400000)
  }

  const toggleSort = (col) => setOrdenar(p => ({ col, asc: p.col === col ? !p.asc : true }))
  const SortIcon = ({ col }) => {
    if (ordenar.col !== col) return null
    return ordenar.asc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  const incluir = async (data) => {
    try {
      const { data: novo } = await api.post('/contratos', data)
      setContratos(prev => [...prev, novo])
      setModal(null)
    } catch (err) {
      if (err.response?.status === 409) { alert('Número de contrato já cadastrado.'); return }
      alert('Erro ao salvar contrato.')
    }
  }
  const alterar = async (data) => {
    try {
      const { data: atualizado } = await api.put(`/contratos/${selecionado}`, data)
      setContratos(prev => prev.map(c => c.id === selecionado ? atualizado : c))
      setModal(null)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro desconhecido'
      alert(`Erro ao salvar contrato: ${msg}`)
    }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/${selecionado}`)
      setContratos(prev => prev.filter(c => c.id !== selecionado))
      setSelecionado(null)
      setModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir contrato.')
    }
  }

  const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtValor = (v) => {
    if (v == null || v === '') return '—'
    const n = parseFloat(v)
    return isNaN(n) || n === 0 ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const statusCor = (s) => {
    if (s === 'ATIVO')      return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
    if (s === 'ENCERRADO')  return 'bg-ink-100 text-ink-600'
    if (s === 'SUSPENSO')   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    if (s === 'RESCINDIDO') return 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
    return 'bg-ink-100 text-ink-600'
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Opções para filtro</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">N° Contrato</label>
            <input value={filtros.numero} onChange={e => setF('numero', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Ex: 001/2026" className="input-field text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-ink-500 mb-1">Objeto</label>
            <input value={filtros.objeto} onChange={e => setF('objeto', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar pelo objeto" className="input-field text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-ink-500 mb-1">Credor</label>
            <input value={filtros.credor} onChange={e => setF('credor', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Nome do credor..." className="input-field text-sm" />
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-ink-500 mb-1">Modalidade</label>
            <select value={filtros.modalidade} onChange={e => setF('modalidade', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              {STATUS_CONTRATO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5 ml-auto">
            <button onClick={limpar}
              className="px-3 py-1.5 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-100 transition-colors">
              Limpar
            </button>
            <button onClick={pesquisar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors">
              <Search className="w-3.5 h-3.5" /> Pesquisar
            </button>
          </div>
        </div>
      </div>

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {pode('criar') && (
          <button onClick={() => setModal('novo')}
            className="flex items-center gap-1.5 h-7 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Incluir
          </button>
        )}
        {pode('editar') && (
          <button onClick={() => podeAgir && setModal('editar')} disabled={!podeAgir}
            className="flex items-center gap-1.5 h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Edit3 className="w-3.5 h-3.5" /> Alterar
          </button>
        )}
        {pode('excluir') && (
          <button onClick={() => podeAgir && setModal('excluir')} disabled={!podeAgir}
            className="flex items-center gap-1.5 h-7 px-3 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        )}
        <button onClick={() => podeAgir && setModal('visualizar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 h-7 px-3 bg-ink-600 hover:bg-ink-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Eye className="w-3.5 h-3.5" /> Visualizar
        </button>
        <BotaoExcluidos entidade="contratos" onAlterado={recarregarContratos} />
      </div>

      {/* ── Tabela ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ink-100 text-ink-600 text-xs select-none uppercase tracking-wider">
                {[
                  { col: 'tipo_contrato',   label: 'Tipo',        cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-24' },
                  { col: 'numero_contrato', label: 'N° Contrato', cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-32' },
                  { col: 'credor_id',       label: 'Credor',      cls: 'text-left px-3 py-2.5 font-semibold min-w-[200px]' },
                  { col: 'objeto',          label: 'Objeto',      cls: 'text-left px-3 py-2.5 font-semibold min-w-[200px]' },
                  { col: 'modalidade',      label: 'Modalidade',  cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'valor',           label: 'Valor',       cls: 'text-right px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'vigencia_fim',    label: 'Vigência até',cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap hidden sm:table-cell' },
                  { col: '_dias',           label: 'Dias',        cls: 'text-center px-3 py-2.5 font-semibold whitespace-nowrap w-20 hidden sm:table-cell' },
                  { col: 'status',          label: 'Status',      cls: 'text-center px-3 py-2.5 font-semibold w-24' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {contratosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-ink-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum contrato encontrado
                  </td>
                </tr>
              )}
              {contratosPaginados.map(c => {
                const sel = c.id === selecionado
                const dv  = diasAteVencer(c.vigencia_fim)
                return (
                  <tr key={c.id}
                    onClick={() => setSelecionado(sel ? null : c.id)}
                    onDoubleClick={() => { setSelecionado(c.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-info-100 dark:bg-info-900/30 text-info-900 dark:text-info-100'
                        : 'hover:bg-ink-50 text-ink-700'
                    }`}
                  >
                    <td className="px-3 py-2 text-ink-500">{c.tipo_contrato || '—'}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-brand-600 dark:text-info-400">{c.numero_contrato}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate font-medium">{nomeCredor(c.credor_id)}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{c.objeto || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.modalidade || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmtValor(c.valor)}</td>
                    <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">{fmtData(c.vigencia_fim)}</td>
                    <td className="px-3 py-2 text-center hidden sm:table-cell">
                      {dv === null ? <span className="text-ink-400">—</span>
                        : dv < 0   ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400">{Math.abs(dv)}d exp.</span>
                        : dv === 0 ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-100 text-danger-600">Hoje</span>
                        : dv <= 30 ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">{dv}d</span>
                        :            <span className="text-xs text-ink-400">{dv}d</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${statusCor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-ink-50 border-t border-ink-200 flex items-center justify-between">
          <span className="text-xs text-ink-500">
            {contratoSelecionado
              ? <span className="text-brand-600 dark:text-info-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {contratoSelecionado.numero_contrato}</span>
              : <span className="text-ink-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-ink-500">
            Foram encontrados <strong>{contratosFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

      {/* ── Paginação ── */}
      <Paginacao total={contratosFiltrados.length} pagina={paginaCtr} setPagina={setPaginaCtr}
        porPagina={PER_PAGE_CTR} setPorPagina={(n) => { setPorPaginaCtr(n); setPaginaCtr(1) }} rotulo="contrato" />

      {/* ── Modais ── */}
      {modal === 'novo' && (
        <ContratoModal modo="novo" contrato={null} credores={credores} onSave={incluir} onClose={() => setModal(null)} />
      )}
      {modal === 'editar' && contratoSelecionado && (
        <ContratoModal modo="editar" contrato={contratoSelecionado} credores={credores} onSave={alterar} onClose={() => setModal(null)} />
      )}
      {modal === 'visualizar' && contratoSelecionado && (
        <ContratoModal modo="visualizar" contrato={contratoSelecionado} credores={credores} onSave={null} onClose={() => setModal(null)} />
      )}
      {modal === 'excluir' && contratoSelecionado && (
        <ConfirmModalContrato contrato={contratoSelecionado} onConfirm={excluir} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ORDENS DE COMPRA/SERVIÇO
// ══════════════════════════════════════════════════════════════════════════════

export default TabContratos
