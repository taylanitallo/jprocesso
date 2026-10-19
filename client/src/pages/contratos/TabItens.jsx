import { useState, useEffect, useRef } from 'react'
import { usePode } from '../../utils/permissions'
import {
  PackageOpen, Tag, FileText, Search, X, Plus, Edit3, Trash2, Eye,
  BarChart2, List, Check, AlertTriangle, Printer, ChevronUp, ChevronDown,
  CheckCircle2, ShoppingBag, Download, XOctagon
} from 'lucide-react'
import api from '../../services/api'
import BotaoExcluidos from '../../components/lixeira/BotaoExcluidos'
import { Paginacao, usePorPagina } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { gerarDnaItemPDF } from '../../utils/gerarDocumentoPDF'
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
    // Ver / Incluir / Alterar item: tela cheia (toda a área disponível)
    <div className="fixed inset-0 z-50 flex bg-black/60 p-2 sm:p-3 animate-in fade-in duration-150">
      <div className="bg-ink-50 rounded-3xl shadow-2xl w-full h-full flex flex-col overflow-hidden">

        {/* ── Header Premium ── */}
        <div className="bg-surface border-b border-ink-100 px-4 py-3 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
                <PackageOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-900 dark:text-white">
                  {readonly ? 'Detalhes do Item' : `Item — ${titulo}`}
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  {readonly ? 'Informações completas do item cadastrado' : 'Preencha as informações do item do catálogo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status automático: ATIVO só com categoria e especificação (servidor: calcStatusItem).
                  Item INATIVO não pode ser vinculado a contrato. */}
              {(() => {
                const ativo = String(form.categoria || '').trim() && String(form.especificacao || '').trim()
                return (
                  <span title="Fica ATIVO com categoria e especificação preenchidas. Item inativo não pode ser vinculado a contrato."
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    ativo
                      ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                      : 'bg-ink-100 text-ink-600'
                  }`}>{ativo ? 'ATIVO' : 'INATIVO — falta ' + (!String(form.especificacao || '').trim() ? 'especificação' : 'categoria')}</span>
                )
              })()}
              {form.validado && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-400">
                  ✓ Validado
                </span>
              )}
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-ink-200 text-ink-400 hover:text-ink-600 hover:bg-ink-100 transition-all">
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
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5">Código</label>
                    {modo === 'novo'
                      ? <p className="h-11 flex items-center px-3.5 rounded-xl border border-dashed border-ink-300 text-xs text-ink-400 italic">Auto</p>
                      : <p className="font-mono font-bold text-lg text-ink-800">{item?.codigo || '—'}</p>
                    }
                  </div>

                  {/* Categoria */}
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5">Categoria *</label>
                    {readonly
                      ? <p className="text-sm font-medium text-ink-800">{form.categoria || '—'}</p>
                      : <PremiumSelect value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                          <option value="">Selecione...</option>
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </PremiumSelect>
                    }
                  </div>

                  {/* Unidade */}
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5">Unidade de Medida *</label>
                    {readonly
                      ? <p className="text-sm font-medium text-ink-800">{form.unidade_medida || '—'}</p>
                      : <PremiumSelect value={form.unidade_medida} onChange={e => set('unidade_medida', e.target.value)}>
                          <option value="">Selecione...</option>
                          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </PremiumSelect>
                    }
                  </div>

                  {/* Descrição */}
                  <div className="col-span-12">
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5">
                      Descrição do Item (Nomenclatura) *
                    </label>
                    {readonly
                      ? <p className="text-sm font-semibold text-ink-900 uppercase">{form.descricao}</p>
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
                  ? <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{form.especificacao || '—'}</p>
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
                      <label className="block text-xs font-semibold text-ink-500 mb-1.5">Palavra {n}</label>
                      {readonly
                        ? <p className="text-sm text-ink-700">{form[`palavra${n}`] || '—'}</p>
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
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5">Catálogo CNBS</label>
                    {readonly
                      ? <p className="text-sm font-mono text-ink-700">{form.catalogo || '—'}</p>
                      : <PremiumInput value={form.catalogo} onChange={e => set('catalogo', e.target.value)} placeholder="Código CNBS..." className="font-mono" />
                    }
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5">Classificação</label>
                    {readonly
                      ? <p className="text-sm text-ink-700">{form.classificacao || '—'}</p>
                      : <PremiumInput value={form.classificacao} onChange={e => set('classificacao', e.target.value)} placeholder="Classificação..." />
                    }
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-500 mb-1.5">Subclassificação</label>
                    {readonly
                      ? <p className="text-sm text-ink-700">{form.subclassificacao || '—'}</p>
                      : <PremiumInput value={form.subclassificacao} onChange={e => set('subclassificacao', e.target.value)} placeholder="Subclassificação..." />
                    }
                  </div>
                </div>
              </SectionCard>


            </div>
          </div>
        </div>

        {/* ── Aviso + Footer ── */}
        <div className="bg-surface border-t border-ink-100 shrink-0">
          <div className="bg-amber-50 dark:bg-amber-900/15 border-b border-amber-100 dark:border-amber-800/30 px-5 py-2.5 flex items-center justify-between gap-4">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              No campo descrição, informar a <strong>nomenclatura</strong> do item — não a especificação!
            </p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-ink-400">
              {item?.id && <span>ID: <span className="font-mono">{item.id}</span></span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50 font-medium transition-all">
                {readonly ? 'Fechar' : 'Cancelar'}
              </button>
              {!readonly && (
                <button onClick={salvar}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
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
  const [loading, setLoading] = useState(true)
  const [dna, setDna] = useState(null)
  const [erro, setErro] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePDF = async (imprimir) => {
    if (!dna) return
    setPdfLoading(true)
    try { await gerarDnaItemPDF(item, dna, imprimir) } finally { setPdfLoading(false) }
  }

  useEffect(() => {
    api.get(`/contratos/itens/${item.id}/dna`)
      .then(r => { setDna(r.data); setLoading(false) })
      .catch((err) => { setErro(err.response?.data?.error || err.message || 'Erro ao carregar dados do item.'); setLoading(false) })
  }, [item.id])

  const fmt = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
  const fmtQtd = (v) => v != null ? Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : '—'

  const totalContratos = dna?.vinculosContrato?.length ?? 0
  const totalOrdens = dna?.vinculosOrdem?.length ?? 0
  const valorTotalContratos = dna?.vinculosContrato?.reduce((s, v) => s + Number(v.valor_total || 0), 0) ?? 0
  const valorTotalOrdens = dna?.vinculosOrdem?.reduce((s, v) => s + Number(v.valor_total || 0), 0) ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between bg-ink-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><BarChart2 className="w-4 h-4" /> DNA do Item</h2>
            <p className="text-xs text-ink-400 mt-0.5">Contratos, secretarias e ordens vinculadas a este item</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded-sm hover:bg-ink-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-ink-50 border-b border-ink-200 shrink-0">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wide">Item</p>
          <p className="font-semibold text-ink-800 text-sm mt-0.5">{item.descricao}</p>
          <div className="flex flex-wrap gap-4 mt-1 text-xs text-ink-500">
            <span>Código: <strong className="text-ink-700">{item.codigo || '—'}</strong></span>
            <span>Unidade: <strong className="text-ink-700">{item.unidade_medida || '—'}</strong></span>
            <span>Categoria: <strong className="text-ink-700">{item.categoria || '—'}</strong></span>
            <span>Status: <strong className={(item.status || '').toUpperCase() === 'ATIVO' ? 'text-success-600' : 'text-ink-500'}>{item.status}</strong></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="flex items-center gap-3 py-8 justify-center text-ink-400">
              <span className="w-5 h-5 border-2 border-ink-300 border-t-blue-500 rounded-full animate-spin" />
              Carregando dados do item...
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-danger-700 dark:text-danger-300 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
            </div>
          )}

          {dna && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Contratos', value: totalContratos, color: 'text-brand-600 dark:text-info-400' },
                  { label: 'Ordens', value: totalOrdens, color: 'text-purple-600 dark:text-purple-400' },
                  { label: 'Valor em Contratos', value: fmt(valorTotalContratos), color: 'text-success-600 dark:text-success-400', small: true },
                  { label: 'Valor em Ordens', value: fmt(valorTotalOrdens), color: 'text-teal-600 dark:text-teal-400', small: true },
                ].map((k, i) => (
                  <div key={i} className="bg-ink-50 rounded-xl p-3 border border-ink-100">
                    <p className="text-xs text-ink-500">{k.label}</p>
                    <p className={`font-bold mt-0.5 ${k.small ? 'text-sm' : 'text-xl'} ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Seção: Contratos */}
              <div>
                <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Contratos ({totalContratos})
                </h3>
                {totalContratos === 0 ? (
                  <p className="text-sm text-ink-400 italic">Este item não está vinculado a nenhum contrato.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-ink-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-ink-100 text-ink-600 uppercase tracking-wider">
                          <th className="text-left px-3 py-2 font-semibold">Nº Contrato</th>
                          <th className="text-left px-3 py-2 font-semibold">Credor</th>
                          <th className="text-left px-3 py-2 font-semibold">Secretaria</th>
                          <th className="text-center px-3 py-2 font-semibold">Status</th>
                          <th className="text-right px-3 py-2 font-semibold">Qtd</th>
                          <th className="text-right px-3 py-2 font-semibold">Vl. Unit.</th>
                          <th className="text-right px-3 py-2 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200">
                        {dna.vinculosContrato.map((v, i) => (
                          <tr key={i} className="hover:bg-ink-50">
                            <td className="px-3 py-2 font-semibold text-brand-600 dark:text-info-400 whitespace-nowrap">{v.contrato?.numero_contrato || '—'}</td>
                            <td className="px-3 py-2 text-ink-700 max-w-[160px] truncate">{v.contrato?.credor?.nome_fantasia || v.contrato?.credor?.razao_social || '—'}</td>
                            <td className="px-3 py-2 text-ink-600 max-w-[160px] truncate">{v.contrato?.secretaria || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(v.contrato?.status || '').toUpperCase() === 'ATIVO' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : 'bg-ink-100 text-ink-500'}`}>
                                {v.contrato?.status || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtQtd(v.quantidade)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(v.valor_unitario)}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-success-700 dark:text-success-400">{fmt(v.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Seção: Ordens */}
              <div>
                <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <PackageOpen className="w-3.5 h-3.5" /> Ordens de Compra / Serviço ({totalOrdens})
                </h3>
                {totalOrdens === 0 ? (
                  <p className="text-sm text-ink-400 italic">Este item não aparece em nenhuma ordem.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-ink-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-ink-100 text-ink-600 uppercase tracking-wider">
                          <th className="text-left px-3 py-2 font-semibold">Nº Ordem</th>
                          <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                          <th className="text-left px-3 py-2 font-semibold">Contrato</th>
                          <th className="text-left px-3 py-2 font-semibold">Secretaria</th>
                          <th className="text-left px-3 py-2 font-semibold">Emissão</th>
                          <th className="text-center px-3 py-2 font-semibold">Status</th>
                          <th className="text-right px-3 py-2 font-semibold">Qtd</th>
                          <th className="text-right px-3 py-2 font-semibold">Vl. Unit.</th>
                          <th className="text-right px-3 py-2 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200">
                        {dna.vinculosOrdem.map((v, i) => {
                          const ordem = v.ordemPai
                          return (
                            <tr key={i} className="hover:bg-ink-50">
                              <td className="px-3 py-2 font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">{ordem?.numero || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ordem?.tipo === 'COMPRA' ? 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-400' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'}`}>
                                  {ordem?.tipo || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-brand-600 dark:text-info-400 font-medium whitespace-nowrap">{ordem?.contrato?.numero_contrato || '—'}</td>
                              <td className="px-3 py-2 text-ink-600 max-w-[140px] truncate">{ordem?.contrato?.secretaria || ordem?.secretaria || '—'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-ink-500">{ordem?.data_emissao ? new Date(ordem.data_emissao).toLocaleDateString('pt-BR') : '—'}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ordem?.status === 'ATENDIDA' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : ordem?.status === 'CANCELADA' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'}`}>
                                  {ordem?.status || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmtQtd(v.quantidade)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmt(v.valor_unitario)}</td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums text-teal-700 dark:text-teal-400">{fmt(v.valor_total)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-ink-200 flex justify-between items-center shrink-0 gap-3">
          <span className="text-xs text-ink-400">{totalContratos} contrato(s) · {totalOrdens} ordem(ns)</span>
          <div className="flex items-center gap-2">
            {dna && (
              <>
                <button
                  onClick={() => handlePDF(false)}
                  disabled={pdfLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {pdfLoading ? 'Gerando...' : 'Ver PDF'}
                </button>
                <button
                  onClick={() => handlePDF(true)}
                  disabled={pdfLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-ink-700 hover:bg-ink-800 text-white disabled:opacity-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {pdfLoading ? 'Gerando...' : 'Imprimir'}
                </button>
              </>
            )}
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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between bg-ink-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><List className="w-4 h-4" /> Listagem</h2>
            <p className="text-xs text-ink-400 mt-0.5">Contratos e secretarias que possuem este item</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded-sm hover:bg-ink-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do item */}
        <div className="px-6 py-3 bg-ink-50 border-b border-ink-200">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wide">Item</p>
          <p className="font-semibold text-ink-800 text-sm mt-0.5">{item.descricao}</p>
          <p className="text-xs text-ink-500 mt-0.5">Código: {item.codigo || '—'} · {item.unidade_medida} · {item.categoria}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {registros.length === 0 ? (
            <div className="text-center py-12 text-ink-400">
              <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">Este item não está presente em nenhum contrato ou secretaria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-100 text-ink-600 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 font-semibold">N° Contrato</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Credor</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Secretaria</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Vigência</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {registros.map((r, i) => (
                  <tr key={i} className="hover:bg-ink-50">
                    <td className="px-3 py-2 font-medium text-brand-600">{r.contrato}</td>
                    <td className="px-3 py-2 text-ink-600">{r.credor}</td>
                    <td className="px-3 py-2 text-ink-600">{r.secretaria}</td>
                    <td className="px-3 py-2 text-ink-500 text-xs">{r.vigencia}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-ink-200 flex justify-between items-center">
          <span className="text-xs text-ink-400">{registros.length} registro(s)</span>
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
  const [loading, setLoading] = useState(true)
  const [vinculosContrato, setVinculosContrato] = useState([])
  const [vinculosOrdem, setVinculosOrdem] = useState([])
  const [erro, setErro] = useState(null)

  useEffect(() => {
    api.get(`/contratos/itens/${item.id}/dna`)
      .then(r => {
        // Só considera vínculos com contratos/ordens ainda ativos — contrato já
        // excluído ou ordem cancelada/excluída não bloqueia a exclusão do item.
        setVinculosContrato((r.data.vinculosContrato || []).filter(v => v.contrato?.status !== 'EXCLUÍDO'))
        setVinculosOrdem((r.data.vinculosOrdem || []).filter(v => !['CANCELADA', 'EXCLUÍDA'].includes(v.ordemPai?.status)))
      })
      .catch(() => setErro('Não foi possível verificar os vínculos deste item.'))
      .finally(() => setLoading(false))
  }, [item.id])

  const temVinculo = vinculosContrato.length > 0 || vinculosOrdem.length > 0

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
                {loading ? 'Excluir Item' : temVinculo ? 'Item Vinculado — Não é possível excluir' : 'Excluir Item'}
              </h3>
              <p className="text-sm text-ink-500">
                {loading ? 'Verificando vínculos...' : temVinculo ? 'Remova os vínculos abaixo antes de excluir.' : 'Esta ação marcará o item como excluído.'}
              </p>
            </div>
          </div>

          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded-lg p-3 mb-4">
            <p className="text-sm text-danger-700 dark:text-danger-300 font-medium">{item.descricao}</p>
            <p className="text-xs text-danger-500 mt-1">Código: {item.codigo || '—'}</p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-400 py-2 mb-2">
              <span className="w-4 h-4 border-2 border-ink-300 border-t-blue-500 rounded-full animate-spin" />
              Verificando contratos e ordens vinculados...
            </div>
          ) : erro ? (
            <p className="text-sm text-danger-500 mb-2">{erro}</p>
          ) : temVinculo && (
            <div className="space-y-3 mb-4 max-h-56 overflow-y-auto">
              {vinculosContrato.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">
                    Contratos ({vinculosContrato.length})
                  </p>
                  <div className="space-y-1">
                    {vinculosContrato.map((v, i) => (
                      <div key={i} className="text-xs bg-ink-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <span className="font-semibold text-brand-600 dark:text-info-400">{v.contrato?.numero_contrato || '—'}</span>
                        <span className="text-ink-500 truncate">
                          {v.contrato?.credor?.nome_fantasia || v.contrato?.credor?.razao_social || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {vinculosOrdem.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">
                    Ordens de Compra/Serviço ({vinculosOrdem.length})
                  </p>
                  <div className="space-y-1">
                    {vinculosOrdem.map((v, i) => (
                      <div key={i} className="text-xs bg-ink-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">{v.ordemPai?.numero || '—'}</span>
                        <span className="text-ink-500 truncate">
                          {v.ordemPai?.contrato?.numero_contrato || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
//  MODAL: IMPORTAR VIA URL
// ══════════════════════════════════════════════════════════════════════════════
function ImportarUrlModal({ urlConfigurada, onClose, onSucesso }) {
  // step: 'idle' | 'verificando' | 'preview' | 'importando' | 'done' | 'erro'
  const [step, setStep] = useState('idle')
  const [preview, setPreview] = useState(null)   // { total, novos, ja_existem }
  const [progresso, setProgresso] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const progressoRef = useRef(null)

  const verificar = async () => {
    setStep('verificando')
    setErro(null)
    try {
      const { data } = await api.post('/contratos/itens/verificar-url', { url: urlConfigurada })
      setPreview(data)
      setStep('preview')
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao verificar itens.')
      setStep('erro')
    }
  }

  const importar = async () => {
    setStep('importando')
    setProgresso(0)

    // Simula progresso até 90%
    let p = 0
    progressoRef.current = setInterval(() => {
      p = Math.min(p + Math.random() * 3, 90)
      setProgresso(Math.round(p))
    }, 300)

    try {
      const { data } = await api.post('/contratos/itens/importar-url', { url: urlConfigurada })
      clearInterval(progressoRef.current)
      setProgresso(100)
      setResultado(data)
      setStep('done')
      onSucesso()
    } catch (err) {
      clearInterval(progressoRef.current)
      setErro(err.response?.data?.error || 'Erro ao importar itens.')
      setStep('erro')
    }
  }

  useEffect(() => () => clearInterval(progressoRef.current), [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info-100 dark:bg-info-900/30 rounded-full flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-ink-800">Importar Itens via URL</h3>
              <p className="text-xs text-ink-500 mt-0.5">Busca e importa itens da fonte configurada</p>
            </div>
          </div>

          {!urlConfigurada ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Nenhuma URL configurada. Acesse <strong>Configurações → Import/Export</strong> e configure a URL da API de itens.
            </div>
          ) : (step === 'idle' || step === 'verificando') ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-ink-500 mb-1">URL configurada</p>
                <code className="block text-xs text-ink-700 bg-ink-100 px-3 py-2 rounded-lg break-all">{urlConfigurada}</code>
              </div>
              <p className="text-xs text-ink-400">Clique em Verificar para consultar quantos itens estão disponíveis para importação.</p>
            </div>
          ) : step === 'preview' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-info-50 dark:bg-info-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-brand-600 dark:text-info-400">{preview.total}</p>
                  <p className="text-xs text-info-500 dark:text-info-400 mt-0.5">encontrados</p>
                </div>
                <div className="bg-success-50 dark:bg-success-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-success-600 dark:text-success-400">{preview.novos}</p>
                  <p className="text-xs text-success-500 dark:text-success-400 mt-0.5">novos</p>
                </div>
                <div className="bg-ink-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-ink-500">{preview.ja_existem}</p>
                  <p className="text-xs text-ink-400 mt-0.5">já existem</p>
                </div>
              </div>
              {preview.novos === 0 ? (
                <p className="text-sm text-ink-500 text-center">Nenhum item novo para importar — todos já estão no catálogo.</p>
              ) : (
                <p className="text-sm text-ink-600 text-center"><strong>{preview.novos}</strong> item(s) serão adicionados ao catálogo.</p>
              )}
            </div>
          ) : step === 'importando' ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-600 text-center">Importando {preview?.novos} item(s)...</p>
              <div className="w-full bg-ink-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-info-500 rounded-full transition-all duration-300"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <p className="text-xs text-ink-400 text-center">{progresso}%</p>
            </div>
          ) : step === 'done' ? (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm border bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-700 text-success-800 dark:text-success-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Importação concluída: <strong>{resultado.importados}</strong> item(s) importado(s), <strong>{resultado.ignorados}</strong> ignorado(s) de um total de {resultado.total}.</span>
            </div>
          ) : step === 'erro' ? (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm border bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-700 text-danger-800 dark:text-danger-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50 font-medium transition-all">
              {step === 'done' ? 'Fechar' : 'Cancelar'}
            </button>

            {urlConfigurada && step === 'idle' && (
              <button onClick={verificar}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                <Download className="w-4 h-4" /> Verificar
              </button>
            )}
            {step === 'verificando' && (
              <button disabled className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold opacity-60">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verificando...
              </button>
            )}
            {step === 'preview' && preview?.novos > 0 && (
              <button onClick={importar}
                className="flex items-center gap-2 px-5 py-2 bg-success-600 hover:bg-success-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                <Download className="w-4 h-4" /> Importar {preview.novos} item(s)
              </button>
            )}
            {step === 'erro' && (
              <button onClick={() => setStep('idle')}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONFIRMAR EXCLUSÃO DE INATIVOS
// ══════════════════════════════════════════════════════════════════════════════
function ExcluirInativosModal({ qtdInativos, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)

  const confirmar = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center shrink-0">
              <XOctagon className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <h3 className="font-bold text-ink-800">Excluir Itens Inativos</h3>
              <p className="text-xs text-ink-500 mt-0.5">Ação restrita a administradores</p>
            </div>
          </div>

          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded-lg p-4">
            <p className="text-sm text-danger-800 dark:text-danger-300 font-medium">
              {qtdInativos > 0
                ? <><strong>{qtdInativos}</strong> item(s) com status <strong>INATIVO</strong> serão excluídos do catálogo.</>
                : 'Nenhum item inativo encontrado no catálogo.'
              }
            </p>
            {qtdInativos > 0 && (
              <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">Esta ação não pode ser desfeita.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50 font-medium transition-all">
              Cancelar
            </button>
            {qtdInativos > 0 && (
              <button onClick={confirmar} disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Excluindo...</>
                  : <><Trash2 className="w-4 h-4" /> Confirmar Exclusão</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONFIRMAR EXCLUSÃO DE ITENS SEM VÍNCULO
// ══════════════════════════════════════════════════════════════════════════════
function ExcluirSemVinculoModal({ onClose, onSucesso }) {
  const [step, setStep] = useState('carregando') // carregando | preview | excluindo | done | erro
  const [total, setTotal] = useState(0)
  const [excluidos, setExcluidos] = useState(0)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    api.get('/contratos/itens/sem-vinculo/count')
      .then(r => { setTotal(r.data.total); setStep('preview') })
      .catch(() => { setErro('Erro ao consultar itens.'); setStep('erro') })
  }, [])

  const confirmar = async () => {
    setStep('excluindo')
    try {
      const { data } = await api.delete('/contratos/itens/sem-vinculo')
      setExcluidos(data.excluidos)
      setStep('done')
      onSucesso()
    } catch {
      setErro('Erro ao excluir itens.')
      setStep('erro')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center shrink-0">
              <XOctagon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-ink-800">Excluir Itens Sem Vínculo</h3>
              <p className="text-xs text-ink-500 mt-0.5">Remove itens que não estão em nenhum contrato</p>
            </div>
          </div>

          {step === 'carregando' && (
            <div className="flex items-center gap-3 py-2 text-sm text-ink-500">
              <span className="w-4 h-4 border-2 border-ink-300 border-t-blue-500 rounded-full animate-spin" />
              Verificando itens sem vínculo...
            </div>
          )}

          {step === 'preview' && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 space-y-1">
              <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                {total > 0
                  ? <><strong>{total.toLocaleString('pt-BR')}</strong> item(s) sem vínculo com contratos serão removidos do catálogo.</>
                  : 'Nenhum item sem vínculo encontrado. Todos os itens estão vinculados a contratos.'
                }
              </p>
              {total > 0 && <p className="text-xs text-orange-600 dark:text-orange-400">Itens vinculados a contratos não serão afetados. Esta ação não pode ser desfeita.</p>}
            </div>
          )}

          {step === 'excluindo' && (
            <div className="flex items-center gap-3 py-2 text-sm text-ink-500">
              <span className="w-4 h-4 border-2 border-ink-300 border-t-orange-500 rounded-full animate-spin" />
              Excluindo {total.toLocaleString('pt-BR')} item(s)...
            </div>
          )}

          {step === 'done' && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm border bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-700 text-success-800 dark:text-success-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>{excluidos.toLocaleString('pt-BR')}</strong> item(s) removidos do catálogo com sucesso.</span>
            </div>
          )}

          {step === 'erro' && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm border bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-700 text-danger-800 dark:text-danger-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50 font-medium transition-all">
              {step === 'done' ? 'Fechar' : 'Cancelar'}
            </button>
            {step === 'preview' && total > 0 && (
              <button onClick={confirmar}
                className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                <Trash2 className="w-4 h-4" /> Excluir {total.toLocaleString('pt-BR')} item(s)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TabItens() {
  // Ações conforme o editor de permissões. Só "Ver" = sem botões de ação.
  const pode = usePode('contratos', 'itens')
  const { user, tenant } = useAuth()
  const isAdmin = user?.tipo === 'admin' || user?.tipo === 'jeos'
  const urlImportacao = tenant?.configuracoes?.url_importacao_itens || ''

  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [progressoCarga, setProgressoCarga] = useState(0)
  const FILTROS_VAZIOS = { descricao: '', codigo: '', categoria: '', status: '' }
  const [filtros, setFiltros]           = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]   = useState(null)
  const [modal, setModal]               = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'|'relatorio'|'listagem'|'importar-url'|'excluir-inativos'
  const [ordenar, setOrdenar]           = useState({ col: 'descricao', asc: true })
  const [pagina, setPagina]             = useState(1)
  const [PER_PAGE_ITEM, setPorPaginaItem] = usePorPagina('contratos-itens', 20)
  const cargaTimerRef = useRef(null)

  const recarregarItens = () => {
    setCarregando(true)
    setProgressoCarga(0)
    let p = 0
    cargaTimerRef.current = setInterval(() => {
      p = Math.min(p + Math.random() * 8, 85)
      setProgressoCarga(Math.round(p))
    }, 150)
    api.get('/contratos/itens')
      .then(r => {
        clearInterval(cargaTimerRef.current)
        setProgressoCarga(100)
        setItens(r.data)
        setTimeout(() => setCarregando(false), 300)
      })
      .catch(() => {
        clearInterval(cargaTimerRef.current)
        setCarregando(false)
      })
  }

  useEffect(() => {
    recarregarItens()
    return () => clearInterval(cargaTimerRef.current)
  }, [])

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))

  const pesquisar = () => { setFiltrosAtivos({ ...filtros }); setPagina(1) }
  // Busca enquanto digita (o botão continua funcionando)
  useEffect(() => { const t = setTimeout(pesquisar, 250); return () => clearTimeout(t) }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps


  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS)
    setFiltrosAtivos(FILTROS_VAZIOS)
    setPagina(1)
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  const f = filtrosAtivos
  const itensNaoExcluidos = itens.filter(i => (i.status || '').toUpperCase() !== 'EXCLUÍDO')
  const itensFiltrados = itens
    .filter(item => {
      const st = (item.status || '').toUpperCase()
      if (st === 'EXCLUÍDO') return false
      if (f.descricao && !item.descricao.toLowerCase().includes(f.descricao.toLowerCase())) return false
      if (f.codigo && !String(item.codigo || '').includes(f.codigo)) return false

      if (f.categoria && item.categoria !== f.categoria) return false
      if (f.status && st !== f.status.toUpperCase()) return false
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
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir item.')
    }
  }

  // Item ATIVO: só administradores alteram (enquanto o banco de itens é preenchido;
  // o servidor confere de novo em contratosController › updateItem)
  const ativoTravado = !!itemSelecionado && itemSelecionado.status === 'ATIVO' && !isAdmin
  const abrirEditar = () => { if (itemSelecionado && !ativoTravado) setModal('editar') }
  const abrirExcluir = () => { if (itemSelecionado) setModal('excluir') }
  const abrirVisualizar = () => { if (itemSelecionado) setModal('visualizar') }
  const abrirRelatorio = () => { if (itemSelecionado) setModal('relatorio') }
  const abrirListagem = () => { if (itemSelecionado) setModal('listagem') }

  const excluirInativos = async () => {
    try {
      await api.delete('/contratos/itens/inativos')
      setModal(null)
      recarregarItens()
    } catch { alert('Erro ao excluir itens inativos.') }
  }

  const qtdInativos = itens.filter(i => (i.status || '').toUpperCase() === 'INATIVO').length

  const podeAgir = !!itemSelecionado

  return (
    <div className="flex flex-col gap-3">

      {/* ── Mini KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Itens',  value: itensNaoExcluidos.length,                                              icon: PackageOpen,  color: 'from-info-500 to-indigo-600'  },
          { label: 'Ativos',       value: itensNaoExcluidos.filter(i => (i.status || '').toUpperCase() === 'ATIVO').length,            icon: CheckCircle2, color: 'from-success-500 to-emerald-600' },
          { label: 'Filtrados',    value: itensFiltrados.length,                                     icon: Search,       color: 'from-purple-500 to-violet-600' },
          { label: 'Categorias',   value: new Set(itensNaoExcluidos.map(i => i.categoria).filter(Boolean)).size, icon: Tag,          color: 'from-teal-500 to-cyan-600'    },
        ].map((k, i) => (
          <div key={i} className="bg-surface border border-ink-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tabular-nums text-ink-900 dark:text-white leading-tight">{k.value}</p>
              <p className="text-xs text-ink-500 truncate">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Opções para filtro</p>

        {/* Linha 1 */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Descrição</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input value={filtros.descricao} onChange={e => setF('descricao', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar pela descrição" className="input-field pl-8 text-sm" />
            </div>
          </div>
        </div>

        {/* Linha 2 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-32">
            <label className="block text-xs font-medium text-ink-500 mb-1">Código</label>
            <input value={filtros.codigo} onChange={e => setF('codigo', e.target.value)}
              placeholder="Código" className="input-field text-sm" />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-ink-500 mb-1">Categoria</label>
            <select value={filtros.categoria} onChange={e => setF('categoria', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button onClick={limparFiltros}
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
          <button onClick={abrirEditar} disabled={!podeAgir || ativoTravado}
            title={ativoTravado ? 'Item ativo: só administradores podem alterar' : undefined}
            className="flex items-center gap-1.5 h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Edit3 className="w-3.5 h-3.5" /> Alterar
          </button>
        )}
        {pode('excluir') && (
          <button onClick={abrirExcluir} disabled={!podeAgir}
            className="flex items-center gap-1.5 h-7 px-3 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        )}
        <button onClick={abrirVisualizar} disabled={!podeAgir}
          className="flex items-center gap-1.5 h-7 px-3 bg-ink-600 hover:bg-ink-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Eye className="w-3.5 h-3.5" /> Visualizar
        </button>
        <BotaoExcluidos entidade="itens" onAlterado={recarregarItens} />

        {isAdmin && (
          <>
            {pode('criar') && (
              <button onClick={() => setModal('importar-url')}
                className="flex items-center gap-1.5 h-7 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                <Download className="w-3.5 h-3.5" /> Importar Itens
              </button>
            )}
            {pode('excluir') && (
              <button onClick={() => setModal('excluir-inativos')}
                className="flex items-center gap-1.5 h-7 px-3 bg-danger-700 hover:bg-danger-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                <XOctagon className="w-3.5 h-3.5" /> Excluir Inativos
              </button>
            )}
            {pode('excluir') && (
              <button onClick={() => setModal('excluir-sem-vinculo')}
                className="flex items-center gap-1.5 h-7 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                <XOctagon className="w-3.5 h-3.5" /> Excluir Sem Vínculo
              </button>
            )}
          </>
        )}

        <div className="flex-1" />

        <button onClick={abrirRelatorio} disabled={!podeAgir}
          className="flex items-center gap-1.5 h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <BarChart2 className="w-3.5 h-3.5" /> Relatório do item
        </button>
        <button onClick={abrirListagem} disabled={!podeAgir}
          className="flex items-center gap-1.5 h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <List className="w-3.5 h-3.5" /> Listagem
        </button>
      </div>

      {/* ── Tabela ── */}
      {carregando && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-brand-600 dark:text-info-400 font-medium">
              <span className="w-4 h-4 border-2 border-info-400/40 border-t-blue-500 rounded-full animate-spin" />
              Carregando itens...
            </span>
            <span className="text-ink-400 text-xs tabular-nums">{progressoCarga}%</span>
          </div>
          <div className="w-full bg-ink-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-info-500 rounded-full transition-all duration-200"
              style={{ width: `${progressoCarga}%` }}
            />
          </div>
          {itens.length > 0 && (
            <p className="text-xs text-ink-400">{itens.length.toLocaleString('pt-BR')} itens carregados até agora...</p>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ink-100 text-ink-600 text-xs select-none uppercase tracking-wider">
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
            <tbody className="divide-y divide-ink-200">
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-ink-400">
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
                        ? 'bg-info-100 dark:bg-info-900/30 text-info-900 dark:text-info-100'
                        : 'hover:bg-ink-50 text-ink-700'
                    } ${(item.status || '').toUpperCase() === 'EXCLUÍDO' ? 'opacity-50 line-through' : ''}`}
                  >
                    <td className="px-3 py-2 font-medium">{item.codigo || '—'}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">{item.descricao}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.unidade_medida}</td>
                    <td className="px-3 py-2">{item.categoria}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        (item.status || '').toUpperCase() === 'ATIVO'
                          ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                          : (item.status || '').toUpperCase() === 'EXCLUÍDO'
                          ? 'bg-danger-100 text-danger-700'
                          : 'bg-ink-100 text-ink-600'
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
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800 text-xs text-ink-600 leading-relaxed">
            <span className="font-semibold text-amber-700 dark:text-amber-400 mr-1">Detalhes:</span>
            {itemSelecionado.detalhes}
          </div>
        )}

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-ink-50 border-t border-ink-200 flex items-center justify-between">
          <span className="text-xs text-ink-500">
            {itemSelecionado
              ? <span className="text-brand-600 dark:text-info-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {itemSelecionado.descricao}</span>
              : <span className="text-ink-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <span className="text-xs text-ink-500">
            Foram encontrados <strong>{itensFiltrados.length}</strong> registro(s)
          </span>
        </div>
      </div>

      {/* ── Paginação ── */}
      <Paginacao total={itensFiltrados.length} pagina={pagina} setPagina={setPagina}
        porPagina={PER_PAGE_ITEM} setPorPagina={(n) => { setPorPaginaItem(n); setPagina(1) }} rotulo="item" rotuloPlural="itens" />

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
      {modal === 'importar-url' && (
        <ImportarUrlModal
          urlConfigurada={urlImportacao}
          onClose={() => setModal(null)}
          onSucesso={recarregarItens}
        />
      )}
      {modal === 'excluir-inativos' && (
        <ExcluirInativosModal
          qtdInativos={qtdInativos}
          onConfirm={excluirInativos}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'excluir-sem-vinculo' && (
        <ExcluirSemVinculoModal
          onClose={() => setModal(null)}
          onSucesso={recarregarItens}
        />
      )}
    </div>
  )
}


export default TabItens
