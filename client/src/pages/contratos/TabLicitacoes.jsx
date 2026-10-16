import { useState, useEffect } from 'react'
import {
  Gavel, Calendar, DollarSign, Check, X, AlertTriangle, FileText, Search, Edit3, Trash2, Plus, Eye,
  ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, CheckCircle2, Clock, ExternalLink
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { hasPerm } from '../../utils/permissions'
import { MODALIDADES, TIPOS_OBJETO, SectionCard, PremiumInput, PremiumSelect, PremiumTextarea, ViewField } from './ContratosShared'
import BotaoExcluidos from '../../components/lixeira/BotaoExcluidos'
import { Paginacao, usePorPagina } from '../../components/ui'

// ── Constantes ────────────────────────────────────────────────────────────────
export const STATUS_LICITACAO = ['EM ANDAMENTO', 'PUBLICADA', 'SUSPENSA', 'HOMOLOGADA', 'DESERTA', 'FRACASSADA', 'REVOGADA', 'ANULADA']
const CRITERIOS_JULGAMENTO = ['Menor Preço', 'Maior Desconto', 'Melhor Técnica ou Conteúdo Artístico', 'Técnica e Preço', 'Maior Lance', 'Maior Retorno Econômico']

const STATUS_CLS = {
  'EM ANDAMENTO': 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-400',
  'PUBLICADA':    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'SUSPENSA':     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'HOMOLOGADA':   'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  'DESERTA':      'bg-ink-100 text-ink-600',
  'FRACASSADA':   'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  'REVOGADA':     'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  'ANULADA':      'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
}

const fmtBRL  = (v) => (v === null || v === undefined || v === '') ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—'

function StatusBadge({ status }) {
  return (
    <span className={`inline-block font-bold px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${STATUS_CLS[status] || 'bg-ink-100 text-ink-600'}`}>
      {status || '—'}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: FORMULÁRIO DE LICITAÇÃO (Incluir / Alterar / Visualizar)
// ══════════════════════════════════════════════════════════════════════════════
function LicitacaoModal({ modo, licitacao, onSave, onClose }) {
  const readonly = modo === 'visualizar'
  const [form, setForm] = useState(() => ({
    numero_licitacao:    licitacao?.numero_licitacao    || '',
    numero_processo:     licitacao?.numero_processo     || '',
    modalidade:          licitacao?.modalidade          || '',
    tipo_objeto:         licitacao?.tipo_objeto         || '',
    criterio_julgamento: licitacao?.criterio_julgamento || '',
    registro_preco:      licitacao?.registro_preco      || false,
    objeto:              licitacao?.objeto              || '',
    secretaria:          licitacao?.secretaria          || '',
    agente_contratacao:  licitacao?.agente_contratacao  || '',
    valor_estimado:      licitacao?.valor_estimado      ?? '',
    valor_homologado:    licitacao?.valor_homologado    ?? '',
    data_publicacao:     licitacao?.data_publicacao     || '',
    data_abertura:       licitacao?.data_abertura       || '',
    data_homologacao:    licitacao?.data_homologacao    || '',
    link_pncp:           licitacao?.link_pncp           || '',
    observacoes:         licitacao?.observacoes         || '',
    status:              licitacao?.status              || 'EM ANDAMENTO',
  }))
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const titulo = { novo: 'Inclusão', editar: 'Edição', visualizar: 'Visualização' }[modo]

  const [secretarias, setSecretarias] = useState([])
  useEffect(() => {
    if (readonly) return
    api.get('/organizacao/secretarias')
      .then(r => setSecretarias((r.data.secretarias || []).filter(s => s.ativo !== false)))
      .catch(() => {})
  }, [readonly])

  const salvar = () => {
    if (!form.numero_licitacao.trim()) { alert('Informe o número da licitação.'); return }
    if (!form.objeto.trim())           { alert('Informe o objeto da licitação.'); return }
    onSave(form)
  }

  const label = (txt) => <label className="block text-xs font-semibold text-ink-500 mb-1.5">{txt}</label>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-ink-50 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '880px' }}>

        {/* ── Header ── */}
        <div className="bg-surface border-b border-ink-100 px-4 py-3 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-violet-500 to-indigo-600">
                <Gavel className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-900 dark:text-white">
                  {readonly ? `Licitação ${form.numero_licitacao}` : `Licitação — ${titulo}`}
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  {readonly ? (form.modalidade || 'Detalhes do processo licitatório') : 'Dados do processo licitatório ou contratação direta'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={form.status} />
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-ink-200 text-ink-400 hover:text-ink-600 hover:bg-ink-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">

            <SectionCard icon={Gavel} title="Identificação" subtitle="Número, modalidade e critério de julgamento">
              {readonly ? (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4"><ViewField label="Nº Licitação" value={form.numero_licitacao} mono /></div>
                  <div className="col-span-4"><ViewField label="Nº Processo Administrativo" value={form.numero_processo || '—'} mono /></div>
                  <div className="col-span-4"><ViewField label="Status" badge={<div><StatusBadge status={form.status} /></div>} /></div>
                  <div className="col-span-4"><ViewField label="Modalidade" value={form.modalidade || '—'} /></div>
                  <div className="col-span-4"><ViewField label="Tipo de Objeto" value={form.tipo_objeto || '—'} /></div>
                  <div className="col-span-4"><ViewField label="Critério de Julgamento" value={form.criterio_julgamento || '—'} /></div>
                  <div className="col-span-4"><ViewField label="Registro de Preços" value={form.registro_preco ? 'Sim (SRP)' : 'Não'} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-4">
                    {label('Nº Licitação *')}
                    <PremiumInput value={form.numero_licitacao} onChange={e => set('numero_licitacao', e.target.value.toUpperCase())}
                      placeholder="Ex.: PE 001/2026" className="font-mono uppercase" autoFocus />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {label('Nº Processo Administrativo')}
                    <PremiumInput value={form.numero_processo} onChange={e => set('numero_processo', e.target.value.toUpperCase())}
                      placeholder="Ex.: 2026.01.15.001" className="font-mono uppercase" />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {label('Status')}
                    <PremiumSelect value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUS_LICITACAO.map(s => <option key={s} value={s}>{s}</option>)}
                    </PremiumSelect>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {label('Modalidade')}
                    <PremiumSelect value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>
                      <option value="">Selecione...</option>
                      {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                    </PremiumSelect>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {label('Tipo de Objeto')}
                    <PremiumSelect value={form.tipo_objeto} onChange={e => set('tipo_objeto', e.target.value)}>
                      <option value="">Selecione...</option>
                      {TIPOS_OBJETO.map(t => <option key={t} value={t}>{t}</option>)}
                    </PremiumSelect>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {label('Critério de Julgamento')}
                    <PremiumSelect value={form.criterio_julgamento} onChange={e => set('criterio_julgamento', e.target.value)}>
                      <option value="">Selecione...</option>
                      {CRITERIOS_JULGAMENTO.map(c => <option key={c} value={c}>{c}</option>)}
                    </PremiumSelect>
                  </div>
                  <div className="col-span-12">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={!!form.registro_preco} onChange={e => set('registro_preco', e.target.checked)}
                        className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                      <span className="text-sm text-ink-700">Sistema de Registro de Preços (gera Ata de Registro de Preços)</span>
                    </label>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard icon={FileText} title="Objeto" subtitle="Descrição e unidade demandante">
              {readonly ? (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12"><ViewField label="Objeto" value={form.objeto} /></div>
                  <div className="col-span-6"><ViewField label="Secretaria" value={form.secretaria || '—'} /></div>
                  <div className="col-span-6"><ViewField label="Agente de Contratação / Pregoeiro" value={form.agente_contratacao || '—'} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    {label('Objeto *')}
                    <PremiumTextarea value={form.objeto} onChange={e => set('objeto', e.target.value.toUpperCase())}
                      rows={3} placeholder="Descrição do objeto da licitação..." className="uppercase" />
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    {label('Secretaria')}
                    <PremiumSelect value={form.secretaria} onChange={e => set('secretaria', e.target.value)}>
                      <option value="">Selecione...</option>
                      {form.secretaria && !secretarias.some(s => s.nome === form.secretaria) && (
                        <option value={form.secretaria}>{form.secretaria}</option>
                      )}
                      {secretarias.map(s => <option key={s.id} value={s.nome}>{s.sigla ? `${s.sigla} — ${s.nome}` : s.nome}</option>)}
                    </PremiumSelect>
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    {label('Agente de Contratação / Pregoeiro')}
                    <PremiumInput value={form.agente_contratacao} onChange={e => set('agente_contratacao', e.target.value.toUpperCase())}
                      placeholder="Nome do responsável" className="uppercase" />
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard icon={Calendar} title="Datas e Valores" subtitle="Cronograma do certame e valores estimado/homologado">
              {readonly ? (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4"><ViewField label="Publicação" value={fmtData(form.data_publicacao)} /></div>
                  <div className="col-span-4"><ViewField label="Abertura / Sessão" value={fmtData(form.data_abertura)} /></div>
                  <div className="col-span-4"><ViewField label="Homologação" value={fmtData(form.data_homologacao)} /></div>
                  <div className="col-span-6"><ViewField label="Valor Estimado" value={fmtBRL(form.valor_estimado)} /></div>
                  <div className="col-span-6"><ViewField label="Valor Homologado" value={fmtBRL(form.valor_homologado)} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-4">
                    {label('Data de Publicação')}
                    <PremiumInput type="date" value={form.data_publicacao} onChange={e => set('data_publicacao', e.target.value)} />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {label('Data de Abertura / Sessão')}
                    <PremiumInput type="date" value={form.data_abertura} onChange={e => set('data_abertura', e.target.value)} />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {label('Data de Homologação')}
                    <PremiumInput type="date" value={form.data_homologacao} onChange={e => set('data_homologacao', e.target.value)} />
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    {label('Valor Estimado (R$)')}
                    <PremiumInput type="number" min="0" step="0.01" value={form.valor_estimado}
                      onChange={e => set('valor_estimado', e.target.value)} placeholder="0,00" className="tabular-nums" />
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    {label('Valor Homologado (R$)')}
                    <PremiumInput type="number" min="0" step="0.01" value={form.valor_homologado}
                      onChange={e => set('valor_homologado', e.target.value)} placeholder="0,00" className="tabular-nums" />
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard icon={ExternalLink} title="Publicidade e Observações" subtitle="Link no PNCP e anotações internas">
              {readonly ? (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <ViewField label="Link PNCP" value={form.link_pncp
                      ? <a href={form.link_pncp} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">{form.link_pncp}</a>
                      : '—'} />
                  </div>
                  <div className="col-span-12"><ViewField label="Observações" value={form.observacoes || '—'} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    {label('Link PNCP')}
                    <PremiumInput type="url" value={form.link_pncp} onChange={e => set('link_pncp', e.target.value)}
                      placeholder="https://pncp.gov.br/app/editais/..." />
                  </div>
                  <div className="col-span-12">
                    {label('Observações')}
                    <PremiumTextarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                      rows={3} placeholder="Anotações sobre o certame..." />
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-surface border-t border-ink-100 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="text-xs text-ink-400">
            {licitacao?.id && <span>ID: <span className="font-mono">{licitacao.id}</span></span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50 font-medium transition-all">
              {readonly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readonly && (
              <button onClick={salvar}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
                <Check className="w-4 h-4" /> Salvar Licitação
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONFIRMAR EXCLUSÃO
// ══════════════════════════════════════════════════════════════════════════════
function ConfirmModalLicitacao({ licitacao, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <h3 className="font-bold text-ink-800">Excluir Licitação</h3>
              <p className="text-sm text-ink-500">A licitação deixará de aparecer na listagem.</p>
            </div>
          </div>
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded-lg p-3 mb-5">
            <p className="text-sm text-danger-700 dark:text-danger-300 font-medium font-mono">{licitacao.numero_licitacao}</p>
            <p className="text-xs text-danger-500 mt-1 line-clamp-2">{licitacao.objeto}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={onConfirm}
              className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: CONTRATOS DA LICITAÇÃO
// ══════════════════════════════════════════════════════════════════════════════
function LicitacaoContratosModal({ licitacao, onClose }) {
  const [contratos, setContratos] = useState([])
  useEffect(() => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
  }, [])

  const chave = String(licitacao.numero_licitacao || '').trim().toUpperCase()
  const vinculados = contratos.filter(c => String(c.numero_licitacao || '').trim().toUpperCase() === chave)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between bg-ink-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4" /> Contratos da licitação</h2>
            <p className="text-xs text-ink-400 mt-0.5">Contratos e atas que informam este número de licitação</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded-sm hover:bg-ink-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 bg-ink-50 border-b border-ink-200">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wide">Licitação</p>
          <p className="font-semibold text-ink-800 text-sm mt-0.5 font-mono">{licitacao.numero_licitacao}</p>
          <p className="text-xs text-ink-500 mt-1 line-clamp-2">{licitacao.objeto}</p>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {vinculados.length === 0 ? (
            <div className="text-center py-10 text-ink-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum contrato vinculado</p>
              <p className="text-sm mt-1">Informe o nº desta licitação no cadastro do contrato para vinculá-lo.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-ink-100 text-ink-600 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-semibold">N° Contrato</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Credor</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Objeto</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Valor</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {vinculados.map(c => (
                  <tr key={c.id} className="hover:bg-ink-50 text-xs text-ink-700">
                    <td className="px-4 py-2 font-mono font-medium text-brand-600">{c.numero_contrato || '—'}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate">{c.credor?.razao_social || '—'}</td>
                    <td className="px-4 py-2 max-w-xs truncate">{c.objeto || '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtBRL(c.valor)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        c.status === 'ATIVO'
                          ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                          : 'bg-ink-100 text-ink-600'
                      }`}>{c.status || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-ink-200 flex items-center justify-between bg-ink-50">
          <span className="text-xs text-ink-400">{vinculados.length} contrato(s) encontrado(s)</span>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-ink-200 hover:bg-ink-300 text-ink-700 rounded-sm text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB LICITAÇÃO
// ══════════════════════════════════════════════════════════════════════════════
function TabLicitacoes() {
  const { user } = useAuth()
  const podeCriar   = hasPerm(user, 'contratos', 'licitacoes', 'criar')
  const podeEditar  = hasPerm(user, 'contratos', 'licitacoes', 'editar')
  const podeExcluir = hasPerm(user, 'contratos', 'licitacoes', 'excluir')

  const [licitacoes, setLicitacoes] = useState([])
  const FILTROS_VAZIOS = { texto: '', modalidade: '', status: '', ano: '' }
  const [filtros, setFiltros]             = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]     = useState(null)
  const [modal, setModal]                 = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'|'contratos'
  const [ordenar, setOrdenar]             = useState({ col: 'data_abertura', asc: false })
  const [pagina, setPagina]               = useState(1)
  const [PER_PAGE, setPorPagina] = usePorPagina('contratos-licitacoes', 15)

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const pesquisar = () => { setFiltrosAtivos({ ...filtros }); setPagina(1) }
  // Busca enquanto digita (o botão continua funcionando)
  useEffect(() => { const t = setTimeout(pesquisar, 250); return () => clearTimeout(t) }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps

  const limparFiltros = () => { setFiltros(FILTROS_VAZIOS); setFiltrosAtivos(FILTROS_VAZIOS); setPagina(1) }

  useEffect(() => {
    api.get('/contratos/licitacoes').then(r => setLicitacoes(r.data)).catch(() => {})
  }, [])

  const anos = [...new Set(licitacoes.map(l => (l.data_abertura || l.data_publicacao || '').slice(0, 4)).filter(Boolean))].sort().reverse()

  const f = filtrosAtivos
  const filtradas = licitacoes
    .filter(l => {
      if (f.texto) {
        const q = f.texto.toLowerCase()
        const alvo = `${l.numero_licitacao} ${l.numero_processo || ''} ${l.objeto || ''}`.toLowerCase()
        if (!alvo.includes(q)) return false
      }
      if (f.modalidade && l.modalidade !== f.modalidade) return false
      if (f.status && l.status !== f.status) return false
      if (f.ano && !(l.data_abertura || l.data_publicacao || '').startsWith(f.ano)) return false
      return true
    })
    .sort((a, b) => {
      const col = ordenar.col
      if (col === 'valor_estimado' || col === 'total_contratos') {
        const d = Number(a[col] || 0) - Number(b[col] || 0)
        return ordenar.asc ? d : -d
      }
      const av = String(a[col] || '')
      const bv = String(b[col] || '')
      return ordenar.asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const totalPags = Math.max(1, Math.ceil(filtradas.length / PER_PAGE))
  const paginadas = filtradas.slice((pagina - 1) * PER_PAGE, pagina * PER_PAGE)

  const licSelecionada = licitacoes.find(l => l.id === selecionado)
  const podeAgir = !!licSelecionada

  const toggleSort = (col) => setOrdenar(p => ({ col, asc: p.col === col ? !p.asc : true }))
  const SortIcon = ({ col }) => {
    if (ordenar.col !== col) return null
    return ordenar.asc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  const incluir = async (data) => {
    try {
      const { data: nova } = await api.post('/contratos/licitacoes', data)
      setLicitacoes(prev => [nova, ...prev])
      setSelecionado(nova.id)
      setModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar licitação.')
    }
  }
  const alterar = async (data) => {
    try {
      const { data: atualizada } = await api.put(`/contratos/licitacoes/${selecionado}`, data)
      setLicitacoes(prev => prev.map(l => l.id === selecionado ? { ...l, ...atualizada } : l))
      setModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar licitação.')
    }
  }
  const excluir = async () => {
    try {
      await api.delete(`/contratos/licitacoes/${selecionado}`)
      setLicitacoes(prev => prev.filter(l => l.id !== selecionado))
      setSelecionado(null)
      setModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir licitação.')
      setModal(null)
    }
  }

  const emAndamento = licitacoes.filter(l => ['EM ANDAMENTO', 'PUBLICADA', 'SUSPENSA'].includes(l.status)).length
  const homologadas = licitacoes.filter(l => l.status === 'HOMOLOGADA')
  const totalHomologado = homologadas.reduce((s, l) => s + Number(l.valor_homologado || 0), 0)

  const colunas = [
    { col: 'numero_licitacao', label: 'Nº Licitação',  cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
    { col: 'modalidade',       label: 'Modalidade',    cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
    { col: 'objeto',           label: 'Objeto',        cls: 'text-left px-3 py-2.5 font-semibold min-w-[260px]' },
    { col: 'data_abertura',    label: 'Abertura',      cls: 'text-left px-3 py-2.5 font-semibold whitespace-nowrap' },
    { col: 'valor_estimado',   label: 'Valor Estimado', cls: 'text-right px-3 py-2.5 font-semibold whitespace-nowrap' },
    { col: 'total_contratos',  label: 'Contratos',     cls: 'text-center px-3 py-2.5 font-semibold whitespace-nowrap' },
    { col: 'status',           label: 'Status',        cls: 'text-center px-3 py-2.5 font-semibold w-28' },
  ]

  return (
    <div className="flex flex-col gap-3">

      {/* ── Mini KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Licitações',  value: licitacoes.length,      icon: Gavel,        color: 'from-violet-500 to-indigo-600' },
          { label: 'Em Andamento',      value: emAndamento,            icon: Clock,        color: 'from-info-500 to-indigo-600' },
          { label: 'Homologadas',       value: homologadas.length,     icon: CheckCircle2, color: 'from-success-500 to-emerald-600' },
          { label: 'Valor Homologado',  value: fmtBRL(totalHomologado), icon: DollarSign,  color: 'from-amber-500 to-orange-600' },
        ].map((k, i) => (
          <div key={i} className="bg-surface border border-ink-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tabular-nums text-ink-900 dark:text-white leading-tight truncate">{k.value}</p>
              <p className="text-xs text-ink-500 truncate">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Opções para filtro</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-ink-500 mb-1">Nº Licitação / Processo / Objeto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input value={filtros.texto} onChange={e => setF('texto', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar licitação" className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-ink-500 mb-1">Modalidade</label>
            <select value={filtros.modalidade} onChange={e => setF('modalidade', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              {STATUS_LICITACAO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-ink-500 mb-1">Ano</label>
            <select value={filtros.ano} onChange={e => setF('ano', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
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
        {podeCriar && (
          <button onClick={() => setModal('novo')}
            className="flex items-center gap-1.5 h-7 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Incluir
          </button>
        )}
        {podeEditar && (
          <button onClick={() => podeAgir && setModal('editar')} disabled={!podeAgir}
            className="flex items-center gap-1.5 h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Edit3 className="w-3.5 h-3.5" /> Alterar
          </button>
        )}
        {podeExcluir && (
          <button onClick={() => podeAgir && setModal('excluir')} disabled={!podeAgir}
            className="flex items-center gap-1.5 h-7 px-3 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        )}
        <button onClick={() => podeAgir && setModal('visualizar')} disabled={!podeAgir}
          className="flex items-center gap-1.5 h-7 px-3 bg-ink-600 hover:bg-ink-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <Eye className="w-3.5 h-3.5" /> Visualizar
        </button>
        <BotaoExcluidos entidade="licitacoes" onAlterado={() => api.get('/contratos/licitacoes').then(r => setLicitacoes(r.data)).catch(() => {})} />
        <button onClick={() => podeAgir && setModal('contratos')} disabled={!podeAgir}
          className="flex items-center gap-1.5 h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <FileText className="w-3.5 h-3.5" /> Ver Contratos
        </button>
      </div>

      {/* ── Tabela ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ink-100 text-ink-600 text-xs select-none uppercase tracking-wider">
                {colunas.map(({ col, label, cls }) => (
                  <th key={col} className={cls} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                    {label}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={colunas.length} className="text-center py-14 text-ink-400">
                    <Gavel className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhuma licitação encontrada
                  </td>
                </tr>
              )}
              {paginadas.map(l => {
                const sel = l.id === selecionado
                return (
                  <tr key={l.id}
                    onClick={() => setSelecionado(sel ? null : l.id)}
                    onDoubleClick={() => { setSelecionado(l.id); setModal('visualizar') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-info-100 dark:bg-info-900/30 text-info-900 dark:text-info-100'
                        : 'hover:bg-ink-50 text-ink-700'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono font-medium text-brand-600 dark:text-info-400 whitespace-nowrap">
                      {l.numero_licitacao}
                      {l.registro_preco && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">SRP</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{l.modalidade || '—'}</td>
                    <td className="px-3 py-2 max-w-md truncate" title={l.objeto}>{l.objeto}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtData(l.data_abertura)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtBRL(l.valor_estimado)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{l.total_contratos || 0}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={l.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-ink-50 border-t border-ink-200 flex items-center justify-between">
          <span className="text-xs text-ink-500">
            {licSelecionada
              ? <span className="text-brand-600 dark:text-info-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {licSelecionada.numero_licitacao}</span>
              : <span className="text-ink-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <Paginacao embutido total={filtradas.length} pagina={pagina} setPagina={setPagina}
            porPagina={PER_PAGE} setPorPagina={(n) => { setPorPagina(n); setPagina(1) }} rotulo="licitação" rotuloPlural="licitações" />
        </div>
      </div>

      {/* ── Modais ── */}
      {modal === 'novo' && (
        <LicitacaoModal modo="novo" licitacao={null} onSave={incluir} onClose={() => setModal(null)} />
      )}
      {modal === 'editar' && licSelecionada && (
        <LicitacaoModal modo="editar" licitacao={licSelecionada} onSave={alterar} onClose={() => setModal(null)} />
      )}
      {modal === 'visualizar' && licSelecionada && (
        <LicitacaoModal modo="visualizar" licitacao={licSelecionada} onClose={() => setModal(null)} />
      )}
      {modal === 'contratos' && licSelecionada && (
        <LicitacaoContratosModal licitacao={licSelecionada} onClose={() => setModal(null)} />
      )}
      {modal === 'excluir' && licSelecionada && (
        <ConfirmModalLicitacao licitacao={licSelecionada} onConfirm={excluir} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

export default TabLicitacoes
