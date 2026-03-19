import { useState, useRef, useEffect } from 'react'
import {
  FileText, ShoppingBag, User, PackageOpen, Search, X, Plus, Edit3,
  Trash2, Eye, BarChart2, List, Check, AlertTriangle, Printer, ChevronUp, ChevronDown,
  Loader2, CheckCircle2, XCircle
} from 'lucide-react'
import { JAIButton } from '../components/JAI'
import api from '../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'itens',     label: 'Itens',     icon: ShoppingBag, emoji: '📦' },
  { key: 'credor',    label: 'Credor',    icon: User,        emoji: '🏢' },
  { key: 'contratos', label: 'Contratos', icon: FileText,    emoji: '📋' },
]

const UNIDADES      = ['UNIDADE','MÊS','SERVIÇO','SERVIÇOS','CONJUNTO','KG','LITRO','METRO','HORA','DIA','PACOTE','RESMA','CAIXA','PAR','AMPOLA','COMPRIMIDO','FRASCO']
const CATEGORIAS    = ['COMPRAS','SERVIÇOS']
const STATUS_ITEM   = ['ATIVO','INATIVO']
const ESTADOS_BR    = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const MODALIDADES   = ['Pregão Eletrônico','Pregão Presencial','Concorrência','Tomada de Preços','Convite','Dispensa','Inexigibilidade','RDC','Concurso','Leilão']

// ── Helpers ───────────────────────────────────────────────────────────────────
function proximoCodigo(itens) {
  if (!itens || itens.length === 0) return '00001'
  const max = itens.reduce((m, item) => {
    const n = parseInt(item.codigo) || 0
    return n > m ? n : m
  }, 0)
  return String(max + 1).padStart(5, '0')
}

function FieldRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 min-h-[34px]">
      <span className="w-36 shrink-0 text-sm text-right text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-1.5 -mx-6 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide border-y border-gray-200 dark:border-gray-600">
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE ITEM (Incluir / Alterar / Visualizar)
// ══════════════════════════════════════════════════════════════════════════════
function ItemModal({ modo, item, codigoProximo, onSave, onClose }) {
  const readonly = modo === 'visualizar'
  const [form, setForm] = useState(() => ({
    codigo:           item?.codigo           || codigoProximo || '00001',
    descricao:        item?.descricao        || '',
    categoria:        item?.categoria        || '',
    unidade_medida:   item?.unidade_medida   || '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Barra de título */}
        <div className="flex items-center justify-between bg-blue-700 px-4 py-2.5 rounded-t shrink-0">
          <span className="text-sm font-semibold text-white">Cadastro de itens — {titulo}</span>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-blue-600 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Informações principais ── */}
          <div className="px-6 pt-4 pb-4 space-y-3">
            <SectionTitle>Informações principais</SectionTitle>

            {/* Código — somente leitura, gerado automaticamente */}
            <FieldRow label="Código do item">
              <input
                value={form.codigo}
                readOnly
                className="input-field text-sm w-28 bg-gray-100 dark:bg-gray-700 cursor-default font-mono tracking-widest"
              />
            </FieldRow>

            {/* Descrição */}
            <FieldRow label="Descrição do item">
              <input
                value={form.descricao}
                onChange={e => set('descricao', e.target.value.toUpperCase())}
                disabled={readonly}
                className="input-field text-sm uppercase w-full"
                placeholder="Nomenclatura do item..."
                autoFocus={!readonly}
              />
            </FieldRow>

            {/* Categoria */}
            <FieldRow label="Categoria">
              <div className="flex gap-1">
                <select
                  value={form.categoria}
                  onChange={e => set('categoria', e.target.value)}
                  disabled={readonly}
                  className="input-field text-sm flex-1"
                >
                  <option value="">Selecione...</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {!readonly && (
                  <button onClick={() => set('categoria', '')} title="Limpar"
                    className="px-2 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </FieldRow>

            {/* Unidade de Medida */}
            <FieldRow label="Unid. Medida">
              <div className="flex gap-1">
                <select
                  value={form.unidade_medida}
                  onChange={e => set('unidade_medida', e.target.value)}
                  disabled={readonly}
                  className="input-field text-sm flex-1"
                >
                  <option value="">Selecione...</option>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {!readonly && (
                  <button onClick={() => set('unidade_medida', '')} title="Limpar"
                    className="px-2 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </FieldRow>

            {!readonly && (
              <div className="flex justify-center pt-1">
                <JAIButton
                  campo="descricao_item"
                  valorAtual={form.descricao}
                  onSugestao={s => set('descricao', s)}
                  label="Ayla — Sugerir descrição"
                />
              </div>
            )}
          </div>

          {/* ── Informações PNCP ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Informações PNCP</SectionTitle>

            {/* Catálogo */}
            <FieldRow label="Catálogo">
              <div className="flex gap-1 items-center flex-wrap">
                <input
                  value={form.catalogo}
                  onChange={e => set('catalogo', e.target.value)}
                  disabled={readonly}
                  className="input-field text-sm w-32"
                  placeholder="Código"
                />
                {!readonly && (
                  <button onClick={() => set('catalogo', '')} title="Limpar"
                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-1">CNBS (CATÁLOGO NACIONAL DE BENS E SERVIÇOS)</span>
              </div>
            </FieldRow>

            {/* Classificação */}
            <FieldRow label="Classificação">
              <div className="flex gap-1">
                <input
                  value={form.classificacao}
                  onChange={e => set('classificacao', e.target.value)}
                  disabled={readonly}
                  className="input-field text-sm w-56"
                  placeholder="Classificação"
                />
                {!readonly && (
                  <button onClick={() => set('classificacao', '')} title="Limpar"
                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </FieldRow>

            {/* Subclassificação */}
            <FieldRow label="Subclassificação">
              <div className="flex gap-1">
                <input
                  value={form.subclassificacao}
                  onChange={e => set('subclassificacao', e.target.value)}
                  disabled={readonly}
                  className="input-field text-sm w-56"
                  placeholder="Subclassificação"
                />
                {!readonly && (
                  <button onClick={() => set('subclassificacao', '')} title="Limpar"
                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </FieldRow>
          </div>

          {/* ── Especificação ── */}
          <div className="px-6 pb-4 space-y-2">
            <SectionTitle>Especificação do item</SectionTitle>
            <textarea
              value={form.especificacao}
              onChange={e => set('especificacao', e.target.value)}
              disabled={readonly}
              rows={4}
              className="input-field text-sm w-full resize-none mt-2"
              placeholder="Especificação técnica detalhada do item..."
            />
          </div>

          {/* ── Palavras-chave ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Informações para busca e ajustes de palavras</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
              <FieldRow label="Palavra 1">
                <div className="flex gap-1 items-center">
                  <input value={form.palavra1} onChange={e => set('palavra1', e.target.value)} disabled={readonly} className="input-field text-sm flex-1" />
                  {!readonly && <JAIButton campo="palavra1" valorAtual={form.palavra1} onSugestao={s => set('palavra1', s)} label="Ayla" />}
                </div>
              </FieldRow>
              <FieldRow label="Palavra 3">
                <div className="flex gap-1 items-center">
                  <input value={form.palavra3} onChange={e => set('palavra3', e.target.value)} disabled={readonly} className="input-field text-sm flex-1" />
                  {!readonly && <JAIButton campo="palavra3" valorAtual={form.palavra3} onSugestao={s => set('palavra3', s)} label="Ayla" />}
                </div>
              </FieldRow>
              <FieldRow label="Palavra 2">
                <div className="flex gap-1 items-center">
                  <input value={form.palavra2} onChange={e => set('palavra2', e.target.value)} disabled={readonly} className="input-field text-sm flex-1" />
                  {!readonly && <JAIButton campo="palavra2" valorAtual={form.palavra2} onSugestao={s => set('palavra2', s)} label="Ayla" />}
                </div>
              </FieldRow>
              <FieldRow label="Palavra 4">
                <div className="flex gap-1 items-center">
                  <input value={form.palavra4} onChange={e => set('palavra4', e.target.value)} disabled={readonly} className="input-field text-sm flex-1" />
                  {!readonly && <JAIButton campo="palavra4" valorAtual={form.palavra4} onSugestao={s => set('palavra4', s)} label="Ayla" />}
                </div>
              </FieldRow>
            </div>
          </div>

        </div>

        {/* ── Aviso + Rodapé ── */}
        <div className="border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 px-4 py-2 flex items-center justify-between gap-4">
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              ⚠️ Obs: Atenção! No campo descrição do item, informar a nomenclatura do item e não a especificação!
            </p>
            {!readonly && (
              <JAIButton
                campo="especificacao"
                valorAtual={form.especificacao}
                onSugestao={s => set('especificacao', s)}
                label="Ayla — Especificação"
                className="shrink-0"
              />
            )}
          </div>
          <div className="px-5 py-3 flex items-center gap-2">
            {!readonly && (
              <button onClick={salvar}
                className="flex items-center gap-1.5 px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors shadow-sm">
                <Check className="w-4 h-4" /> Salvar
              </button>
            )}
            <button onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-semibold transition-colors">
              {readonly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readonly && (
              <button onClick={onClose}
                className="flex items-center gap-1.5 px-5 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded text-sm font-semibold transition-colors">
                Sair
              </button>
            )}
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">📊 Relatório do Item</h2>
            <p className="text-xs text-gray-500 mt-0.5">Todos os contratos e processos onde o item é utilizado</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Item selecionado</p>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm mt-0.5">{item.descricao}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>Código: <strong className="text-gray-700 dark:text-gray-300">{item.codigo || '—'}</strong></span>
            <span>Unidade: <strong className="text-gray-700 dark:text-gray-300">{item.unidade_medida}</strong></span>
            <span>Categoria: <strong className="text-gray-700 dark:text-gray-300">{item.categoria}</strong></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {usos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum uso encontrado</p>
              <p className="text-sm mt-1">Este item ainda não foi utilizado em nenhum contrato ou processo.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Contrato / Processo</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Secretaria</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Qtd</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Valor Unit.</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {usos.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
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

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">📋 Listagem</h2>
            <p className="text-xs text-gray-500 mt-0.5">Contratos e secretarias que possuem este item</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Item</p>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm mt-0.5">{item.descricao}</p>
          <p className="text-xs text-gray-500 mt-0.5">Código: {item.codigo || '—'} · {item.unidade_medida} · {item.categoria}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {registros.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">Este item não está presente em nenhum contrato ou secretaria.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">N° Contrato</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Credor</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Secretaria</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Vigência</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {registros.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
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

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Excluir Item</h3>
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

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE CREDOR (Incluir / Alterar / Visualizar)
// ══════════════════════════════════════════════════════════════════════════════
// ── Máscaras ──────────────────────────────────────────────────────────────────
function maskCNPJ(v) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d.replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{2}\.\d{3})(\d)/, '$1.$2')
          .replace(/(\.\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
}
function maskCPF(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3}\.\d{3})(\d)/, '$1.$2')
          .replace(/(\.\d{3})(\d)/, '$1-$2')
}
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})(\d)/, '$1.$2-$3')
}
function maskCEP(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d)/, '$1-$2')
}

// ── Validadores algorítmicos ──────────────────────────────────────────────────
function validarCNPJ(cnpj) {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (s, n) => {
    let sum = 0, pos = s.length - 7
    for (let i = s.length; i >= 1; i--) {
      sum += parseInt(s.charAt(s.length - i)) * pos--
      if (pos < 2) pos = 9
    }
    const r = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return r === parseInt(n)
  }
  return calc(d.slice(0, 12), d[12]) && calc(d.slice(0, 13), d[13])
}
function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const calc = (slice, len) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return (r === 10 || r === 11 ? 0 : r) === parseInt(d[len])
  }
  return calc(d, 9) && calc(d, 10)
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE CREDOR (Incluir / Alterar / Visualizar)
// ══════════════════════════════════════════════════════════════════════════════
function CredorModal({ modo, credor, onSave, onClose }) {
  const readonly = modo === 'visualizar'
  const [form, setForm] = useState(() => ({
    tipo:         credor?.tipo         || 'Jurídica',
    razao_social: credor?.razao_social || '',
    nome_fantasia:credor?.nome_fantasia|| '',
    cnpj_cpf:     credor?.cnpj_cpf     || '',
    email:        credor?.email        || '',
    telefone:     credor?.telefone     || '',
    celular:      credor?.celular      || '',
    cep:          credor?.cep          || '',
    logradouro:   credor?.logradouro   || '',
    numero:       credor?.numero       || '',
    complemento:  credor?.complemento  || '',
    bairro:       credor?.bairro       || '',
    cidade:       credor?.cidade       || '',
    uf:           credor?.uf           || '',
    status:       credor?.status       || 'ATIVO',
  }))
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const titulo = { novo: 'Inclusão', editar: 'Edição', visualizar: 'Visualização' }[modo]
  const isPJ = form.tipo === 'Jurídica'

  // ── Estado da consulta CNPJ/CPF ──────────────────────────────────────────
  const [docStatus, setDocStatus] = useState('idle') // 'idle'|'loading'|'ok'|'error'
  const [docMsg, setDocMsg]       = useState('')
  const debounceRef               = useRef(null)

  const onDocChange = (raw) => {
    const digits = raw.replace(/\D/g, '')
    const masked = isPJ ? maskCNPJ(raw) : maskCPF(raw)
    set('cnpj_cpf', masked)
    setDocStatus('idle')
    setDocMsg('')
    clearTimeout(debounceRef.current)

    const completo = isPJ ? digits.length === 14 : digits.length === 11
    if (!completo) return

    // Validação algorítmica imediata
    const valido = isPJ ? validarCNPJ(digits) : validarCPF(digits)
    if (!valido) { setDocStatus('error'); setDocMsg(isPJ ? 'CNPJ inválido' : 'CPF inválido'); return }

    if (isPJ) {
      // Consulta BrasilAPI — só para CNPJ
      setDocStatus('loading')
      debounceRef.current = setTimeout(async () => {
        try {
          const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
          if (!res.ok) throw new Error('não encontrado')
          const data = await res.json()
          setForm(p => ({
            ...p,
            razao_social:  (data.razao_social  || '').toUpperCase(),
            nome_fantasia: (data.nome_fantasia || '').toUpperCase(),
          }))
          setDocStatus('ok')
          setDocMsg('CNPJ encontrado na Receita Federal')
        } catch {
          setDocStatus('ok') // CNPJ algoritmicamente válido, só não encontrado na API
          setDocMsg('CNPJ válido — preencha os dados manualmente')
        }
      }, 400)
    } else {
      setDocStatus('ok')
      setDocMsg('CPF válido')
    }
  }

  const onTipoChange = (t) => {
    if (readonly) return
    set('tipo', t)
    set('cnpj_cpf', '')
    setDocStatus('idle')
    setDocMsg('')
  }

  const salvar = () => {
    if (!form.cnpj_cpf.trim())    { alert(isPJ ? 'Informe o CNPJ.' : 'Informe o CPF.'); return }
    if (!form.razao_social.trim()) { alert(isPJ ? 'Informe a Razão Social.' : 'Informe o Nome.'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Barra de título */}
        <div className="flex items-center justify-between bg-blue-700 px-4 py-2.5 rounded-t shrink-0">
          <span className="text-sm font-semibold text-white">Cadastro de Credores — {titulo}</span>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-blue-600 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Dados Principais ── */}
          <div className="px-6 pt-4 pb-4 space-y-3">
            <SectionTitle>Dados principais</SectionTitle>

            {/* Tipo de Pessoa */}
            <FieldRow label="Tipo de Pessoa">
              <div className="flex gap-4">
                {['Jurídica', 'Física'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                    <input type="radio" name="tipo_credor" value={t} checked={form.tipo === t}
                      onChange={() => onTipoChange(t)} disabled={readonly}
                      className="w-4 h-4 text-blue-600" />
                    {t}
                  </label>
                ))}
              </div>
            </FieldRow>

            {/* CNPJ / CPF — primeiro campo de dados */}
            <FieldRow label={isPJ ? 'CNPJ *' : 'CPF *'}>
              <div className="flex items-center gap-2">
                <input
                  value={form.cnpj_cpf}
                  onChange={e => onDocChange(e.target.value)}
                  disabled={readonly}
                  className={`input-field text-sm w-52 font-mono ${
                    docStatus === 'error' ? 'border-red-400 focus:ring-red-300' :
                    docStatus === 'ok'    ? 'border-green-400 focus:ring-green-300' : ''
                  }`}
                  placeholder={isPJ ? '00.000.000/0000-00' : '000.000.000-00'}
                  maxLength={isPJ ? 18 : 14}
                  autoFocus={!readonly}
                />
                {docStatus === 'loading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
                {docStatus === 'ok'      && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                {docStatus === 'error'   && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                {docMsg && (
                  <span className={`text-xs ${
                    docStatus === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'
                  }`}>{docMsg}</span>
                )}
              </div>
            </FieldRow>

            {/* Razão Social / Nome */}
            <FieldRow label={isPJ ? 'Razão Social *' : 'Nome *'}>
              <input value={form.razao_social} onChange={e => set('razao_social', e.target.value.toUpperCase())}
                disabled={readonly} className="input-field text-sm uppercase w-full"
                placeholder={isPJ ? 'Razão social...' : 'Nome completo...'} />
            </FieldRow>

            {isPJ && (
              <FieldRow label="Nome Fantasia">
                <input value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value.toUpperCase())}
                  disabled={readonly} className="input-field text-sm uppercase w-full"
                  placeholder="Nome fantasia..." />
              </FieldRow>
            )}

            <FieldRow label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)}
                disabled={readonly} className="input-field text-sm w-36">
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </FieldRow>
          </div>

          {/* ── Contato ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Contato</SectionTitle>

            <FieldRow label="E-mail">
              <input value={form.email} onChange={e => set('email', e.target.value)}
                disabled={readonly} type="email" className="input-field text-sm w-full"
                placeholder="email@empresa.com.br" />
            </FieldRow>
            <FieldRow label="Telefone">
              <input
                value={form.telefone}
                onChange={e => set('telefone', maskPhone(e.target.value))}
                disabled={readonly}
                className="input-field text-sm w-44 font-mono"
                placeholder="(88) 0000-0000"
                maxLength={15}
              />
            </FieldRow>
            <FieldRow label="Celular">
              <input
                value={form.celular}
                onChange={e => set('celular', maskPhone(e.target.value))}
                disabled={readonly}
                className="input-field text-sm w-44 font-mono"
                placeholder="(88) 9.9999-9999"
                maxLength={16}
              />
            </FieldRow>
          </div>

          {/* ── Endereço ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Endereço</SectionTitle>

            <FieldRow label="CEP">
              <input
                value={form.cep}
                onChange={e => set('cep', maskCEP(e.target.value))}
                disabled={readonly}
                className="input-field text-sm w-28 font-mono"
                placeholder="00000-000"
                maxLength={9}
              />
            </FieldRow>
            <FieldRow label="Logradouro">
              <input value={form.logradouro} onChange={e => set('logradouro', e.target.value.toUpperCase())}
                disabled={readonly} className="input-field text-sm uppercase w-full"
                placeholder="Rua, Av., Travessa..." />
            </FieldRow>
            <FieldRow label="Número / Compl.">
              <div className="flex gap-2">
                <input value={form.numero} onChange={e => set('numero', e.target.value)}
                  disabled={readonly} className="input-field text-sm w-24" placeholder="Nº" />
                <input value={form.complemento} onChange={e => set('complemento', e.target.value.toUpperCase())}
                  disabled={readonly} className="input-field text-sm uppercase flex-1" placeholder="Complemento" />
              </div>
            </FieldRow>
            <FieldRow label="Bairro">
              <input value={form.bairro} onChange={e => set('bairro', e.target.value.toUpperCase())}
                disabled={readonly} className="input-field text-sm uppercase w-full" placeholder="Bairro" />
            </FieldRow>
            <FieldRow label="Cidade / UF">
              <div className="flex gap-2">
                <input value={form.cidade} onChange={e => set('cidade', e.target.value.toUpperCase())}
                  disabled={readonly} className="input-field text-sm uppercase flex-1" placeholder="Cidade" />
                <select value={form.uf} onChange={e => set('uf', e.target.value)}
                  disabled={readonly} className="input-field text-sm w-20">
                  <option value="">UF</option>
                  {ESTADOS_BR.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </FieldRow>
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center gap-2 shrink-0">
          {!readonly && (
            <button onClick={salvar}
              className="flex items-center gap-1.5 px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors shadow-sm">
              <Check className="w-4 h-4" /> Salvar
            </button>
          )}
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-semibold transition-colors">
            {readonly ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONFIRMAR EXCLUSÃO DE CREDOR
// ══════════════════════════════════════════════════════════════════════════════
function ConfirmModalCredor({ credor, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Excluir Credor</h3>
              <p className="text-sm text-gray-500">Esta ação marcará o credor como inativo.</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-5">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{credor.razao_social}</p>
            <p className="text-xs text-red-500 mt-1">{credor.cnpj_cpf}</p>
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

// ══════════════════════════════════════════════════════════════════════════════
//  TAB ITENS
// ══════════════════════════════════════════════════════════════════════════════
function TabItens() {
  const [itens, setItens] = useState([])
  const FILTROS_VAZIOS = { descricao: '', codigo: '', catalogo: '', categoria: '', status: '', validado: '', mostrarExcluido: false }
  const [filtros, setFiltros]           = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]   = useState(null)
  const [modal, setModal]               = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'|'relatorio'|'listagem'
  const [ordenar, setOrdenar]           = useState({ col: 'descricao', asc: true })

  useEffect(() => {
    api.get('/contratos/itens').then(r => setItens(r.data)).catch(() => {})
  }, [])

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))

  const pesquisar = () => setFiltrosAtivos({ ...filtros })

  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS)
    setFiltrosAtivos(FILTROS_VAZIOS)
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  const f = filtrosAtivos
  const itensFiltrados = itens
    .filter(item => {
      if (!f.mostrarExcluido && item.status === 'EXCLUÍDO') return false
      if (f.descricao && !item.descricao.toLowerCase().includes(f.descricao.toLowerCase())) return false
      if (f.codigo && !String(item.codigo || '').includes(f.codigo)) return false
      if (f.catalogo && !String(item.catalogo || '').toLowerCase().includes(f.catalogo.toLowerCase())) return false
      if (f.categoria && item.categoria !== f.categoria) return false
      if (f.status && item.status !== f.status) return false
      if (f.validado === 'SIM' && !item.validado) return false
      if (f.validado === 'NÃO' && item.validado) return false
      return true
    })
    .sort((a, b) => {
      const av = String(a[ordenar.col] || '')
      const bv = String(b[ordenar.col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

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

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções para filtro</p>

        {/* Linha 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={filtros.descricao} onChange={e => setF('descricao', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar pela descrição" className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Catálogo</label>
            <input value={filtros.catalogo} onChange={e => setF('catalogo', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar catálogo" className="input-field text-sm" />
          </div>
        </div>

        {/* Linha 2 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código</label>
            <input value={filtros.codigo} onChange={e => setF('codigo', e.target.value)}
              placeholder="Código" className="input-field text-sm" />
          </div>
          <div className="flex items-center pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filtros.mostrarExcluido} onChange={e => setF('mostrarExcluido', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Mostrar excluído</span>
            </label>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoria</label>
            <select value={filtros.categoria} onChange={e => setF('categoria', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              {STATUS_ITEM.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Validado</label>
            <select value={filtros.validado} onChange={e => setF('validado', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="SIM">Sim</option>
              <option value="NÃO">Não</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button onClick={limparFiltros}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
              <tr className="bg-blue-700 text-white text-xs select-none">
                {[
                  { col: 'codigo',        label: 'Código',            cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-24' },
                  { col: 'descricao',     label: 'Descrição',         cls: 'text-left px-3 py-2.5 font-semibold min-w-[260px]' },
                  { col: 'unidade_medida',label: 'Unid. de medida',   cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'categoria',     label: 'Categoria',         cls: 'text-left px-3 py-2.5 font-semibold' },
                  { col: 'catmat_serv',   label: 'CatMat\\Serv',      cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'status',        label: 'Status',            cls: 'text-center px-3 py-2.5 font-semibold' },
                  { col: 'validado',      label: 'Validado',          cls: 'text-center px-3 py-2.5 font-semibold' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)}
                    style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 dark:text-gray-500">
                    <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum item encontrado
                  </td>
                </tr>
              )}
              {itensFiltrados.map(item => {
                const sel = item.id === selecionado
                return (
                  <tr key={item.id}
                    onClick={() => setSelecionado(sel ? null : item.id)}
                    onDoubleClick={() => { setSelecionado(item.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300'
                    } ${item.status === 'EXCLUÍDO' ? 'opacity-50 line-through' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">{item.codigo}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">{item.descricao}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.unidade_medida}</td>
                    <td className="px-3 py-2">{item.categoria}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.catmat_serv || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        item.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : item.status === 'EXCLUÍDO'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.validado
                        ? <Check className="w-3.5 h-3.5 text-green-600 mx-auto" />
                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Detalhe do item selecionado */}
        {itemSelecionado?.detalhes && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            <span className="font-semibold text-amber-700 dark:text-amber-400 mr-1">Detalhes:</span>
            {itemSelecionado.detalhes}
          </div>
        )}

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {itemSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium">✓ {itemSelecionado.descricao}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-gray-500">
            Foram encontrados <strong>{itensFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

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
        <ItemModal modo="novo" item={null} codigoProximo={proxCod()} onSave={incluir} onClose={() => setModal(null)} />
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

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONTRATOS DO CREDOR
// ══════════════════════════════════════════════════════════════════════════════
function CredorContratosModal({ credor, onClose }) {
  const [contratos, setContratos] = useState([])
  useEffect(() => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
  }, [])

  const vinculados = contratos.filter(c => c.credor_id === credor.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">📋 Contratos vinculados</h2>
            <p className="text-xs text-gray-500 mt-0.5">Todos os contratos e atas ligados a este credor</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info do credor */}
        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Credor</p>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm mt-0.5">{credor.razao_social}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>{credor.tipo === 'Jurídica' ? 'CNPJ' : 'CPF'}: <strong className="text-gray-700 dark:text-gray-300 font-mono">{credor.cnpj_cpf}</strong></span>
            {credor.cidade && <span>Cidade: <strong className="text-gray-700 dark:text-gray-300">{credor.cidade}{credor.uf ? '/' + credor.uf : ''}</strong></span>}
          </div>
        </div>

        {/* Tabela de contratos */}
        <div className="flex-1 overflow-y-auto">
          {vinculados.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum contrato vinculado</p>
              <p className="text-sm mt-1">Este credor ainda não possui contratos cadastrados.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-blue-700 text-white text-xs">
                  <th className="text-left px-4 py-2.5 font-semibold">N° Contrato</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Objeto</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Modalidade</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Valor</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Vigência</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {vinculados.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 text-xs text-gray-700 dark:text-gray-300">
                    <td className="px-4 py-2 font-mono font-medium text-blue-600">{c.numero_contrato || '—'}</td>
                    <td className="px-4 py-2 max-w-xs truncate">{c.objeto || '—'}</td>
                    <td className="px-4 py-2">{c.modalidade || '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold">{c.valor ? Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{c.vigencia_inicio ? `${c.vigencia_inicio} a ${c.vigencia_fim || '...'}` : '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        c.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : c.status === 'ENCERRADO'
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>{c.status || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400">{vinculados.length} contrato(s) encontrado(s)</span>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB CREDOR
// ══════════════════════════════════════════════════════════════════════════════
function TabCredor() {
  const [credores, setCredores] = useState([])

  const FILTROS_VAZIOS = { razao_social: '', cnpj_cpf: '', tipo: '', status: '' }
  const [filtros, setFiltros]             = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]     = useState(null)
  const [modal, setModal]                 = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'
  const [ordenar, setOrdenar]             = useState({ col: 'razao_social', asc: true })

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const pesquisar = () => setFiltrosAtivos({ ...filtros })
  const limparFiltros = () => { setFiltros(FILTROS_VAZIOS); setFiltrosAtivos(FILTROS_VAZIOS) }

  useEffect(() => {
    api.get('/contratos/credores').then(r => setCredores(r.data)).catch(() => {})
  }, [])

  const f = filtrosAtivos
  const credoresFiltrados = credores
    .filter(c => {
      if (f.razao_social && !c.razao_social.toLowerCase().includes(f.razao_social.toLowerCase())) return false
      if (f.cnpj_cpf && !String(c.cnpj_cpf || '').includes(f.cnpj_cpf)) return false
      if (f.tipo && c.tipo !== f.tipo) return false
      if (f.status && c.status !== f.status) return false
      return true
    })
    .sort((a, b) => {
      const av = String(a[ordenar.col] || '')
      const bv = String(b[ordenar.col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const credorSelecionado = credores.find(c => c.id === selecionado)
  const podeAgir = !!credorSelecionado

  const toggleSort = (col) => setOrdenar(p => ({ col, asc: p.col === col ? !p.asc : true }))
  const SortIcon = ({ col }) => {
    if (ordenar.col !== col) return null
    return ordenar.asc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  const proxCod = () => proximoCodigo(credores)

  const incluir = async (data) => {
    try {
      const { data: novo } = await api.post('/contratos/credores', data)
      setCredores(prev => [...prev, novo])
      setModal(null)
    } catch (err) {
      if (err.response?.status === 409) { alert('CNPJ/CPF já cadastrado.'); return }
      alert('Erro ao salvar credor.')
    }
  }
  const alterar = async (data) => {
    try {
      const { data: atualizado } = await api.put(`/contratos/credores/${selecionado}`, data)
      setCredores(prev => prev.map(c => c.id === selecionado ? atualizado : c))
      setModal(null)
    } catch { alert('Erro ao salvar credor.') }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/credores/${selecionado}`)
      setCredores(prev => prev.map(c => c.id === selecionado ? { ...c, status: 'EXCLUÍDO' } : c))
      setSelecionado(null)
      setModal(null)
    } catch { alert('Erro ao excluir credor.') }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções para filtro</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Razão Social / Nome</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={filtros.razao_social} onChange={e => setF('razao_social', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar por nome ou razão social" className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CNPJ / CPF</label>
            <input value={filtros.cnpj_cpf} onChange={e => setF('cnpj_cpf', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar CNPJ ou CPF" className="input-field text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
            <select value={filtros.tipo} onChange={e => setF('tipo', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="Jurídica">Jurídica</option>
              <option value="Física">Física</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button onClick={limparFiltros}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
              <tr className="bg-blue-700 text-white text-xs select-none">
                {[
                  { col: 'tipo',         label: 'Tipo',           cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-20' },
                  { col: 'razao_social', label: 'Razão Social / Nome', cls: 'text-left px-3 py-2.5 font-semibold min-w-[240px]' },
                  { col: 'cnpj_cpf',    label: 'CNPJ / CPF',     cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'cidade',       label: 'Cidade/UF',      cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'telefone',     label: 'Telefone',       cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'status',       label: 'Status',         cls: 'text-center px-3 py-2.5 font-semibold w-20' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {credoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 dark:text-gray-500">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum credor encontrado
                  </td>
                </tr>
              )}
              {credoresFiltrados.map(c => {
                const sel = c.id === selecionado
                return (
                  <tr key={c.id}
                    onClick={() => setSelecionado(sel ? null : c.id)}
                    onDoubleClick={() => { setSelecionado(c.id); setModal('contratos_credor') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{c.tipo === 'Jurídica' ? 'PJ' : 'PF'}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">
                      {c.razao_social}
                      {c.nome_fantasia && <span className="ml-1 text-gray-400 font-normal">({c.nome_fantasia})</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">{c.cnpj_cpf}</td>
                    <td className="px-3 py-2">{c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—'}</td>
                    <td className="px-3 py-2">{c.telefone || c.celular || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        c.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {credorSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium">✓ {credorSelecionado.razao_social}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-gray-500">
            Foram encontrados <strong>{credoresFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Incluir
        </button>
        <button onClick={() => podeAgir && setModal('editar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Edit3 className="w-4 h-4" /> Alterar
        </button>
        <button onClick={() => podeAgir && setModal('excluir')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
        <button onClick={() => podeAgir && setModal('contratos_credor')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <FileText className="w-4 h-4" /> Ver Contratos
        </button>
      </div>

      {/* ── Modais ── */}
      {modal === 'novo' && (
        <CredorModal modo="novo" credor={null} onSave={incluir} onClose={() => setModal(null)} />
      )}
      {modal === 'editar' && credorSelecionado && (
        <CredorModal modo="editar" credor={credorSelecionado} onSave={alterar} onClose={() => setModal(null)} />
      )}
      {modal === 'contratos_credor' && credorSelecionado && (
        <CredorContratosModal credor={credorSelecionado} onClose={() => setModal(null)} />
      )}
      {modal === 'excluir' && credorSelecionado && (
        <ConfirmModalCredor credor={credorSelecionado} onConfirm={excluir} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: BUSCA DE ITEM DO CATÁLOGO
// ══════════════════════════════════════════════════════════════════════════════
function BuscarItemModal({ catalogoItens, onSelect, onClose }) {
  const [busca, setBusca] = useState('')
  const todos = catalogoItens.filter(i => i.status !== 'INATIVO')
  const filtrados = busca.trim()
    ? todos.filter(i =>
        (i.descricao || '').toLowerCase().includes(busca.trim().toLowerCase()) ||
        (i.codigo    || '').toLowerCase().includes(busca.trim().toLowerCase()) ||
        (i.categoria || '').toLowerCase().includes(busca.trim().toLowerCase())
      )
    : todos

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-indigo-700 px-4 py-3 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-white/80" />
            <span className="text-sm font-semibold text-white">Buscar Item do Catálogo</span>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-indigo-600 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campo de busca */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por código, descrição ou categoria..."
              className="input-field pl-9 text-sm w-full"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{filtrados.length} item(ns) encontrado(s)</p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <PackageOpen className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">{busca ? 'Nenhum item encontrado para a busca.' : 'Nenhum item cadastrado no sistema.'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs w-24">Código</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">Descrição</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs w-28">Unidade</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs w-28">Categoria</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtrados.map(item => (
                  <tr key={item.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer"
                    onClick={() => { onSelect(item); onClose() }}>
                    <td className="px-4 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{item.codigo}</td>
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{item.descricao}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{item.unidade_medida}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{item.categoria}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded font-medium">Selecionar</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 shrink-0">
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-medium transition-colors">
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
    numero_licitacao: contrato?.numero_licitacao || '',
    credor_id:        contrato?.credor_id        || '',
    valor:            contrato?.valor            || '',
    vigencia_inicio:  contrato?.vigencia_inicio  || '',
    vigencia_fim:     contrato?.vigencia_fim     || '',
    data_assinatura:  contrato?.data_assinatura  || '',
    secretaria:       contrato?.secretaria       || '',
    fiscal:           contrato?.fiscal           || '',
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
  // Linha de item sendo editada inline
  const [itemBusca, setItemBusca] = useState({})   // { [idx]: string }
  const [itemDrop,  setItemDrop]  = useState(null)  // idx com dropdown aberto
  const [itemModalIdx, setItemModalIdx] = useState(null) // idx para modal de busca

  // Credor
  const [credorSel, setCredorSel] = useState(credorInicial)
  const [buscaCredor, setBuscaCredor] = useState(credorInicial?.razao_social || '')
  const [dropdownCredor, setDropdownCredor] = useState(false)

  // Secretaria (via API)
  const [secretarias, setSecretarias] = useState([])
  const [secSel, setSecSel] = useState(null)
  const [buscaSec, setBuscaSec] = useState(contrato?.secretaria || '')
  const [dropdownSec, setDropdownSec] = useState(false)

  useEffect(() => {
    api.get('/organizacao/secretarias')
      .then(r => {
        const lista = r.data.secretarias || []
        setSecretarias(lista)
        // Se editando, re-selecionar secretaria salva
        if (contrato?.secretaria) {
          const encontrada = lista.find(s =>
            s.sigla === contrato.secretaria || s.nome === contrato.secretaria
          )
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

  // ── Fiscais disponíveis na secretaria selecionada, classificados por vigência ─
  const fiscaisClassificados = (() => {
    if (!secSel) return []
    const d = form.vigencia_inicio || form.data_assinatura || ''
    const ref = d ? new Date(d + 'T00:00:00') : new Date()
    return (secSel.responsaveis || []).map(r => {
      const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null
      const fim = r.data_fim    ? new Date(r.data_fim    + 'T00:00:00') : null
      return { ...r, vigente: !!ini && ref >= ini && (!fim || ref <= fim) }
    })
  })()

  // Limpa o fiscal se a data de vigência mudar e ele sair do período de nomeação
  useEffect(() => {
    if (!secSel || !form.fiscal) return
    const d = form.vigencia_inicio || form.data_assinatura || ''
    const ref = d ? new Date(d + 'T00:00:00') : new Date()
    const ainda = (secSel.responsaveis || []).some(r => {
      const label = r.nome
      if (label !== form.fiscal) return false
      const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null
      const fim = r.data_fim    ? new Date(r.data_fim    + 'T00:00:00') : null
      return !!ini && ref >= ini && (!fim || ref <= fim)
    })
    if (!ainda) set('fiscal', '')
  }, [form.vigencia_inicio, form.data_assinatura, secSel])

  const selecionarSecretaria = (s) => {
    setSecSel(s)
    setBuscaSec(s.sigla || s.nome)
    set('secretaria', s.sigla || s.nome)
    setDropdownSec(false)
    // auto-seleciona o primeiro fiscal dentro do período de vigência
    const d = form.vigencia_inicio || form.data_assinatura || ''
    const ref = d ? new Date(d + 'T00:00:00') : new Date()
    const vigentes = (s.responsaveis || []).filter(r => {
      if (!r.data_inicio) return false
      const ini = new Date(r.data_inicio + 'T00:00:00')
      const fim = r.data_fim ? new Date(r.data_fim + 'T00:00:00') : null
      return ref >= ini && (!fim || ref <= fim)
    })
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
    vencido: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300',
    proximo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300',
    vigente: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300',
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
    if (!q) return catalogoItens.filter(i => i.status !== 'INATIVO').slice(0, 10)
    return catalogoItens.filter(i =>
      i.status !== 'INATIVO' && (
        (i.descricao || '').toLowerCase().includes(q) ||
        (i.codigo    || '').toLowerCase().includes(q)
      )
    ).slice(0, 10)
  }

  const novoItemRow = () => ({
    _id: Date.now() + Math.random(),
    lote: '',
    item_id: '',
    descricao: '',
    unidade: '',
    quantidade: '',
    valor_unitario: '',
    valor_total: '',
  })

  const adicionarItem = () => setItensContrato(p => [...p, novoItemRow()])

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
        descricao: item.descricao,
        unidade:   item.unidade_medida || '',
      }
      return arr
    })
    setItemBusca(p => ({ ...p, [idx]: item.descricao }))
    setItemDrop(null)
  }

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
    const valorFinal = itensContrato.length > 0 ? fmtBRL(valorTotalItens) : form.valor
    const fontesLimpas = fontesRecurso.map(s => s.trim()).filter(Boolean)
    const dotacoesLimpas = dotacoes.map(s => s.trim()).filter(Boolean)
    onSave({ ...form, valor: valorFinal, itens: itensContrato, fontes_recurso: fontesLimpas, dotacoes: dotacoesLimpas })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '94vh' }}>

        {/* Título */}
        <div className="flex items-center justify-between bg-blue-700 px-4 py-2.5 rounded-t shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">Cadastro de Contratos — {titulo}</span>
            {alertaVencimento && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${alertaCor[alertaVencimento.tipo]}`}>
                {alertaVencimento.tipo === 'vencido' ? '🔴' : alertaVencimento.tipo === 'proximo' ? '🟡' : '🟢'} {alertaVencimento.texto}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-blue-600 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Identificação ── */}
          <div className="px-6 pt-4 pb-4 space-y-3">
            <SectionTitle>Identificação</SectionTitle>

            <FieldRow label="Tipo *">
              <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)}
                disabled={readonly} className="input-field text-sm w-72">
                {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="N° Contrato *">
              <input value={form.numero_contrato} onChange={e => set('numero_contrato', e.target.value.toUpperCase())}
                disabled={readonly} className="input-field text-sm w-52 uppercase"
                placeholder="Ex: 001/2026" autoFocus={!readonly} />
            </FieldRow>

            <FieldRow label="Data Assinatura">
              <input value={form.data_assinatura} onChange={e => set('data_assinatura', e.target.value)}
                disabled={readonly} type="date" className="input-field text-sm w-44" />
            </FieldRow>

            <FieldRow label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)}
                disabled={readonly} className="input-field text-sm w-44">
                {STATUS_CONTRATO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FieldRow>
          </div>

          {/* ── Objeto e Licitação ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Objeto e Licitação</SectionTitle>

            <FieldRow label="Objeto *">
              <textarea value={form.objeto} onChange={e => set('objeto', e.target.value.toUpperCase())}
                disabled={readonly} rows={3} className="input-field text-sm w-full resize-none uppercase"
                placeholder="Descrição do objeto do contrato..." />
            </FieldRow>

            <FieldRow label="Modalidade">
              <select value={form.modalidade} onChange={e => set('modalidade', e.target.value)}
                disabled={readonly} className="input-field text-sm w-56">
                <option value="">Selecione...</option>
                {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="N° Licitação">
              <input value={form.numero_licitacao} onChange={e => set('numero_licitacao', e.target.value.toUpperCase())}
                disabled={readonly} className="input-field text-sm w-52 uppercase"
                placeholder="Ex: PE 012/2026" />
            </FieldRow>
          </div>

          {/* ── Credor ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Credor</SectionTitle>

            <FieldRow label="Credor *">
              {readonly ? (
                <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {credorSel ? credorSel.razao_social : '—'}
                </div>
              ) : (
                <div className="relative w-full">
                  {credorSel ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 input-field text-sm bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="truncate">{credorSel.razao_social}</span>
                        <span className="text-gray-400 font-mono text-xs ml-1 shrink-0">{credorSel.cnpj_cpf}</span>
                      </div>
                      <button type="button" onClick={limparCredor} className="p-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        value={buscaCredor}
                        onChange={e => { setBuscaCredor(e.target.value); setDropdownCredor(true) }}
                        onFocus={() => setDropdownCredor(true)}
                        onBlur={() => setTimeout(() => setDropdownCredor(false), 150)}
                        className="input-field text-sm pl-8 w-full"
                        placeholder="Buscar credor por nome ou CNPJ..."
                      />
                      {dropdownCredor && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                          {credoresFiltradosModal.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-gray-400">
                              {buscaCredor.trim() ? 'Nenhum credor encontrado.' : 'Nenhum credor cadastrado.'}
                            </p>
                          ) : (
                            credoresFiltradosModal.map(c => (
                              <button key={c.id} type="button" onMouseDown={() => selecionarCredor(c)}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{c.razao_social}</p>
                                  <p className="text-xs text-gray-400 font-mono mt-0.5">{c.cnpj_cpf} · {c.tipo}</p>
                                </div>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                  c.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>{c.status}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </FieldRow>
          </div>

          {/* ── Vigência e Alertas ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Vigência e Alertas</SectionTitle>

            <FieldRow label="Vigência Início">
              <input value={form.vigencia_inicio} onChange={e => set('vigencia_inicio', e.target.value)}
                disabled={readonly} type="date" className="input-field text-sm w-44" />
            </FieldRow>

            <FieldRow label="Vigência Fim">
              <input value={form.vigencia_fim} onChange={e => set('vigencia_fim', e.target.value)}
                disabled={readonly} type="date" className="input-field text-sm w-44" />
            </FieldRow>

            <FieldRow label="Alertar antes de (dias)">
              <div className="flex items-center gap-3">
                <input value={form.dias_alerta}
                  onChange={e => set('dias_alerta', Math.max(1, parseInt(e.target.value) || 30))}
                  disabled={readonly} type="number" min={1} max={365}
                  className="input-field text-sm w-24 font-mono" />
                <span className="text-xs text-gray-500">dias antes do vencimento</span>
                {alertaVencimento && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${alertaCor[alertaVencimento.tipo]}`}>
                    {alertaVencimento.tipo === 'vencido' ? '🔴 Vencido' : alertaVencimento.tipo === 'proximo' ? '🟡 Próximo do vencimento' : '🟢 Vigente'} — {alertaVencimento.texto}
                  </span>
                )}
              </div>
            </FieldRow>
          </div>

          {/* ── Itens do Contrato ── */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Itens do Contrato</SectionTitle>
              {!readonly && (
                <button type="button" onClick={adicionarItem}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Item
                </button>
              )}
            </div>

            {itensContrato.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">
                {readonly ? 'Nenhum item registrado.' : 'Clique em "Adicionar Item" para incluir itens do contrato.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 w-16">Lote<br/><span className="font-normal text-gray-400">(opcional)</span></th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 min-w-[220px]">Descrição do Item</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 w-28">Unidade</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-500 w-24">Qtd.</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-500 w-32">Vlr. Unit.</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-500 w-32">Vlr. Total</th>
                      {!readonly && <th className="w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {itensContrato.map((it, idx) => {
                      const busca = itemBusca[idx] ?? it.descricao ?? ''
                      const catalogFiltrado = itemCatalogFiltrado(busca)
                      return (
                        <tr key={it._id ?? idx} className="bg-white dark:bg-gray-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                          {/* Lote */}
                          <td className="px-2 py-1.5">
                            <input value={it.lote} onChange={e => setItem(idx, 'lote', e.target.value)}
                              readOnly={readonly} className="input-field text-xs w-12 text-center font-mono" />
                          </td>

                          {/* Descrição com busca */}
                          <td className="px-2 py-1.5 relative">
                            {readonly ? (
                              <span className="text-gray-800 dark:text-gray-200">{it.descricao || '—'}</span>
                            ) : (
                              <div className="relative">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    title="Buscar item no catálogo"
                                    onClick={() => setItemModalIdx(idx)}
                                    className="p-0.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shrink-0"
                                  >
                                    <Search className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    value={busca}
                                    onChange={e => {
                                      setItemBusca(p => ({ ...p, [idx]: e.target.value }))
                                      setItem(idx, 'descricao', e.target.value.toUpperCase())
                                      setItemDrop(idx)
                                    }}
                                    onFocus={() => setItemDrop(idx)}
                                    onBlur={() => setTimeout(() => setItemDrop(p => p === idx ? null : p), 150)}
                                    className="input-field text-xs flex-1 uppercase"
                                    placeholder="Código ou descrição..."
                                  />
                                </div>
                                {itemDrop === idx && catalogFiltrado.length > 0 && (
                                  <div className="absolute z-30 top-full left-0 w-80 mt-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-2xl max-h-44 overflow-y-auto">
                                    {catalogFiltrado.map(ci => (
                                      <button key={ci.id} type="button"
                                        onMouseDown={() => selecionarItemCatalogo(idx, ci)}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <span className="font-mono text-blue-600 dark:text-blue-400 text-xs mr-2">{ci.codigo}</span>
                                        <span className="text-gray-800 dark:text-gray-200 text-xs">{ci.descricao}</span>
                                        <span className="ml-2 text-gray-400 text-xs">({ci.unidade_medida})</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Unidade */}
                          <td className="px-2 py-1.5">
                            {readonly ? (
                              <span>{it.unidade || '—'}</span>
                            ) : (
                              <select value={it.unidade} onChange={e => setItem(idx, 'unidade', e.target.value)}
                                className="input-field text-xs w-full">
                                <option value="">—</option>
                                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            )}
                          </td>

                          {/* Quantidade */}
                          <td className="px-2 py-1.5">
                            <input value={it.quantidade} onChange={e => setItem(idx, 'quantidade', e.target.value)}
                              readOnly={readonly} type="number" min={0} step="any"
                              className="input-field text-xs w-full text-right" placeholder="0" />
                          </td>

                          {/* Valor Unitário */}
                          <td className="px-2 py-1.5">
                            <input value={it.valor_unitario} onChange={e => setItem(idx, 'valor_unitario', e.target.value)}
                              readOnly={readonly} type="number" min={0} step="0.01"
                              className="input-field text-xs w-full text-right font-mono" placeholder="0,00" />
                          </td>

                          {/* Valor Total */}
                          <td className="px-2 py-1.5 text-right font-semibold text-gray-700 dark:text-gray-300 font-mono">
                            {it.valor_total
                              ? parseFloat(it.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              : '—'}
                          </td>

                          {!readonly && (
                            <td className="px-1 py-1.5 text-center">
                              <button type="button" onClick={() => removerItem(idx)}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  {itensContrato.length > 0 && (
                    <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
                      <tr>
                        <td colSpan={readonly ? 5 : 5} className="px-2 py-2 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                          Total do Contrato:
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-blue-700 dark:text-blue-400 font-mono whitespace-nowrap">
                          {fmtBRL(valorTotalItens) || '—'}
                        </td>
                        {!readonly && <td />}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* ── Valores ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Valor do Contrato</SectionTitle>
            <FieldRow label="Valor Total">
              <div className="flex items-center gap-3">
                <input value={valorExibido}
                  onChange={e => { if (itensContrato.length === 0) set('valor', e.target.value) }}
                  readOnly={readonly || itensContrato.length > 0}
                  className={`input-field text-sm w-52 font-mono ${itensContrato.length > 0 ? 'bg-gray-50 dark:bg-gray-700 cursor-default font-bold text-blue-700 dark:text-blue-400' : ''}`}
                  placeholder="R$ 0,00" />
                {itensContrato.length > 0 && (
                  <span className="text-xs text-gray-500">Calculado automaticamente com base nos itens</span>
                )}
              </div>
            </FieldRow>
          </div>

          {/* ── Responsáveis ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Responsáveis</SectionTitle>

            <FieldRow label="Secretaria">
              {readonly ? (
                <span className="text-sm text-gray-800 dark:text-gray-200">{form.secretaria || '—'}</span>
              ) : (
                <div className="relative w-full">
                  {secSel ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 input-field text-sm bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="truncate font-medium">{secSel.nome}</span>
                        {secSel.sigla && <span className="text-gray-400 text-xs ml-1 shrink-0">({secSel.sigla})</span>}
                      </div>
                      <button type="button" onClick={limparSecretaria}
                        className="p-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        value={buscaSec}
                        onChange={e => { setBuscaSec(e.target.value); set('secretaria', e.target.value.toUpperCase()); setDropdownSec(true) }}
                        onFocus={() => setDropdownSec(true)}
                        onBlur={() => setTimeout(() => setDropdownSec(false), 150)}
                        className="input-field text-sm pl-8 w-full uppercase"
                        placeholder="Buscar ou digitar secretaria..."
                      />
                      {dropdownSec && secretarias.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                          {secFiltradas.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-gray-400">Nenhuma secretaria encontrada.</p>
                          ) : (
                            secFiltradas.map(s => (
                              <button key={s.id} type="button" onMouseDown={() => selecionarSecretaria(s)}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{s.nome}</p>
                                  {s.sigla && <p className="text-xs text-gray-400 mt-0.5 font-mono">{s.sigla}</p>}
                                </div>
                                {(s.responsaveis || []).length > 0 && (
                                  <span className="text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {(s.responsaveis || []).length} resp.
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </FieldRow>

            <FieldRow label="Fiscal">
              {readonly ? (
                <span className="text-sm text-gray-800 dark:text-gray-200">{form.fiscal || '—'}</span>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <select
                    value={form.fiscal}
                    onChange={e => set('fiscal', e.target.value)}
                    disabled={!secSel}
                    className={`input-field text-sm flex-1 ${
                      !secSel ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">
                      {!secSel
                        ? 'Selecione a secretaria primeiro'
                        : fiscaisClassificados.length === 0
                          ? 'Nenhum responsável cadastrado nesta secretaria'
                          : 'Selecione o fiscal...'}
                    </option>
                    {fiscaisClassificados.map((r, idx) => {
                      const label = r.nome
                      const per = r.data_inicio
                        ? `${r.data_inicio}${r.data_fim ? ' a ' + r.data_fim : ' em diante'}`
                        : ''
                      return (
                        <option key={idx} value={label} disabled={!r.vigente}>
                          {r.vigente
                            ? label
                            : `⛔ ${label}${per ? ' — ' + per : ''} (fora do período)`}
                        </option>
                      )
                    })}
                  </select>
                  {form.fiscal && (
                    <button type="button" onClick={() => set('fiscal', '')}
                      title="Limpar fiscal"
                      className="p-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </FieldRow>
          </div>

          {/* ── Fonte de Recurso ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Fonte de Recurso</SectionTitle>
            <div className="space-y-2">
              {fontesRecurso.map((val, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={val}
                    onChange={e => setFontesRecurso(p => { const a = [...p]; a[i] = e.target.value.toUpperCase(); return a })}
                    readOnly={readonly}
                    className="input-field text-sm flex-1 uppercase"
                    placeholder="Ex: PRÓPRIO, FEDERAL, CONVÊNIO..."
                  />
                  {!readonly && fontesRecurso.length > 1 && (
                    <button type="button" onClick={() => setFontesRecurso(p => p.filter((_, j) => j !== i))}
                      className="p-1.5 rounded border border-gray-300 dark:border-gray-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {!readonly && (
                <button type="button"
                  onClick={() => setFontesRecurso(p => [...p, ''])}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">
                  <Plus className="w-3 h-3" /> Adicionar fonte de recurso
                </button>
              )}
            </div>
          </div>

          {/* ── Dotação Orçamentária ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Dotação Orçamentária</SectionTitle>
            <div className="space-y-2">
              {dotacoes.map((val, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={val}
                    onChange={e => setDotacoes(p => { const a = [...p]; a[i] = e.target.value; return a })}
                    readOnly={readonly}
                    className="input-field text-sm flex-1 font-mono"
                    placeholder="Ex: 3.3.90.39.00"
                  />
                  {!readonly && dotacoes.length > 1 && (
                    <button type="button" onClick={() => setDotacoes(p => p.filter((_, j) => j !== i))}
                      className="p-1.5 rounded border border-gray-300 dark:border-gray-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {!readonly && (
                <button type="button"
                  onClick={() => setDotacoes(p => [...p, ''])}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">
                  <Plus className="w-3 h-3" /> Adicionar dotação
                </button>
              )}
            </div>
          </div>

          {/* ── Observações ── */}
          <div className="px-6 pb-4 space-y-3">
            <SectionTitle>Observações</SectionTitle>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              disabled={readonly} rows={3} className="input-field text-sm w-full resize-none mt-2"
              placeholder="Observações adicionais..." />
          </div>
        </div>

        {/* Modal de busca de item */}
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

        {/* Rodapé */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center gap-2 shrink-0">
          {!readonly && (
            <button onClick={salvar}
              className="flex items-center gap-1.5 px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors shadow-sm">
              <Check className="w-4 h-4" /> Salvar
            </button>
          )}
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-semibold transition-colors">
            {readonly ? 'Fechar' : 'Cancelar'}
          </button>
          {itensContrato.length > 0 && (
            <span className="ml-auto text-xs text-gray-500">
              {itensContrato.length} item(ns) · Total: <strong className="text-blue-700 dark:text-blue-400">{fmtBRL(valorTotalItens)}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfirmModalContrato({ contrato, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Excluir Contrato</h3>
              <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-5">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{contrato.numero_contrato}</p>
            <p className="text-xs text-red-500 mt-1 truncate">{contrato.objeto}</p>
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

// ══════════════════════════════════════════════════════════════════════════════
//  TAB CONTRATOS
// ══════════════════════════════════════════════════════════════════════════════
function TabContratos() {
  const [contratos, setContratos] = useState([])
  const [credores, setCredores] = useState([])

  useEffect(() => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
    api.get('/contratos/credores').then(r => setCredores(r.data)).catch(() => {})
  }, [])

  const FILTROS_VAZIOS = { numero: '', objeto: '', credor: '', modalidade: '', status: '' }
  const [filtros, setFiltros]               = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos]   = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]       = useState(null)
  const [modal, setModal]                   = useState(null)
  const [ordenar, setOrdenar]               = useState({ col: 'numero_contrato', asc: true })

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const pesquisar  = () => setFiltrosAtivos({ ...filtros })
  const limpar     = () => { setFiltros(FILTROS_VAZIOS); setFiltrosAtivos(FILTROS_VAZIOS) }

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

  const contratoSelecionado = contratos.find(c => c.id === selecionado)
  const podeAgir = !!contratoSelecionado

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
    } catch { alert('Erro ao salvar contrato.') }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/${selecionado}`)
      setContratos(prev => prev.filter(c => c.id !== selecionado))
      setSelecionado(null)
      setModal(null)
    } catch { alert('Erro ao excluir contrato.') }
  }

  const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtValor = (v) => {
    if (!v) return '—'
    const n = parseFloat(String(v).replace(/[^\d,]/g, '').replace(',', '.'))
    return isNaN(n) ? v : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const statusCor = (s) => {
    if (s === 'ATIVO')      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (s === 'ENCERRADO')  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    if (s === 'SUSPENSO')   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    if (s === 'RESCINDIDO') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções para filtro</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">N° Contrato</label>
            <input value={filtros.numero} onChange={e => setF('numero', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Ex: 001/2026" className="input-field text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Objeto</label>
            <input value={filtros.objeto} onChange={e => setF('objeto', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar pelo objeto" className="input-field text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Credor</label>
            <input value={filtros.credor} onChange={e => setF('credor', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Nome do credor..." className="input-field text-sm" />
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Modalidade</label>
            <select value={filtros.modalidade} onChange={e => setF('modalidade', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              {STATUS_CONTRATO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5 ml-auto">
            <button onClick={limpar}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
              <tr className="bg-blue-700 text-white text-xs select-none">
                {[
                  { col: 'tipo_contrato',   label: 'Tipo',        cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-24' },
                  { col: 'numero_contrato', label: 'N° Contrato', cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap w-32' },
                  { col: 'credor_id',       label: 'Credor',      cls: 'text-left px-3 py-2.5 font-semibold min-w-[200px]' },
                  { col: 'objeto',          label: 'Objeto',      cls: 'text-left px-3 py-2.5 font-semibold min-w-[200px]' },
                  { col: 'modalidade',      label: 'Modalidade',  cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'valor',           label: 'Valor',       cls: 'text-right px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'vigencia_fim',    label: 'Vigência até',cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
                  { col: 'status',          label: 'Status',      cls: 'text-center px-3 py-2.5 font-semibold w-24' },
                ].map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {contratosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400 dark:text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum contrato encontrado
                  </td>
                </tr>
              )}
              {contratosFiltrados.map(c => {
                const sel = c.id === selecionado
                return (
                  <tr key={c.id}
                    onClick={() => setSelecionado(sel ? null : c.id)}
                    onDoubleClick={() => { setSelecionado(c.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500">{c.tipo_contrato || '—'}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">{c.numero_contrato}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate font-medium">{nomeCredor(c.credor_id)}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{c.objeto || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.modalidade || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmtValor(c.valor)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtData(c.vigencia_fim)}</td>
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

        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {contratoSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium">✓ {contratoSelecionado.numero_contrato}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-gray-500">
            Foram encontrados <strong>{contratosFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Incluir
        </button>
        <button onClick={() => podeAgir && setModal('editar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Edit3 className="w-4 h-4" /> Alterar
        </button>
        <button onClick={() => podeAgir && setModal('excluir')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
        <button onClick={() => podeAgir && setModal('visualizar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Eye className="w-4 h-4" /> Visualizar
        </button>
      </div>

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
//  PÁGINA CONTRATOS
// ══════════════════════════════════════════════════════════════════════════════
export default function Contratos() {
  const [tab, setTab] = useState('itens')

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">📝 Contratos</h1>
        <p className="page-subtitle">Gestão de itens, credores e contratos</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1">
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  active
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Conteúdo */}
      {tab === 'itens'     && <TabItens />}
      {tab === 'credor'    && <TabCredor />}
      {tab === 'contratos' && <TabContratos />}
    </div>
  )
}
