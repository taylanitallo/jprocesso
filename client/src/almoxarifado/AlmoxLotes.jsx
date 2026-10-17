import CampoSugerido from '../components/ui/CampoSugerido'
import { contextoFormulario, registrarTextoUsado } from '../utils/sugestaoAyla'
import { useState, useEffect, useCallback } from 'react'
import { usePode } from '../utils/permissions'
import {
  Plus, Package, RefreshCw, ChevronLeft, ChevronRight,
  Calendar, FileText, Truck, AlertTriangle, X, CheckCircle2,
  MapPin, Building2, Search, ClipboardList
} from 'lucide-react'
import api from '../services/api'
import { Paginacao, usePorPagina } from '../components/ui'
import LoadingBar from '../components/LoadingBar'
import AlmoxModal from './AlmoxModal'
import { fmt, fmtMoney, today } from './almoxConstants'

// ─── Badge de validade ────────────────────────────────────────────────────────
function ValidadeBadge({ data }) {
  if (!data) return <span className="text-xs text-ink-400">—</span>
  const dias = Math.ceil((new Date(data) - new Date()) / 86400000)
  const cls = dias < 0   ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
            : dias <= 30 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            :               'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {dias < 0 ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
      {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}
      {dias < 0 ? ' (vencido)' : dias <= 30 ? ` (+${dias}d)` : ''}
    </span>
  )
}

// ─── Modal: Seletor de Ordens de Compra ──────────────────────────────────────
function OrdemCompraPickerModal({ onSelect, onClose }) {
  const [ordens,   setOrdens]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [busca,    setBusca]    = useState('')
  const [filtradas, setFiltradas] = useState([])

  useEffect(() => {
    api.get('/almoxarifado/ordens-compra-disponiveis')
      .then(r => { setOrdens(r.data); setFiltradas(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!busca.trim()) { setFiltradas(ordens); return }
    const q = busca.toLowerCase()
    setFiltradas(ordens.filter(o =>
      o.numero?.toLowerCase().includes(q) ||
      o.objeto?.toLowerCase().includes(q) ||
      o.secretaria?.toLowerCase().includes(q) ||
      o.contrato?.credor?.razao_social?.toLowerCase().includes(q)
    ))
  }, [busca, ordens])

  return (
    <AlmoxModal title="Selecionar Ordem de Compra" onClose={onClose} wide>
      <div className="space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por número, objeto, fornecedor ou secretaria..."
            autoFocus
            className="w-full pl-9 pr-4 py-2 border border-ink-300 rounded-lg text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <LoadingBar label="Carregando ordens..." />
        ) : filtradas.length === 0 ? (
          <div className="text-center py-10 text-ink-400 text-sm">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {busca ? 'Nenhuma ordem encontrada para essa busca' : 'Nenhuma ordem de compra disponível para entrada'}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filtradas.map(ordem => (
              <button
                key={ordem.id}
                type="button"
                onClick={() => onSelect(ordem)}
                className="w-full text-left border border-ink-200 rounded-lg p-3 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-amber-700 dark:text-amber-400 text-sm font-mono">{ordem.numero}</span>
                      {ordem.data_emissao && (
                        <span className="text-xs text-ink-400">{new Date(ordem.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      )}
                      {ordem.secretaria && (
                        <span className="text-xs bg-info-100 dark:bg-info-900/30 text-brand-700 dark:text-info-300 px-1.5 py-0.5 rounded-sm">{ordem.secretaria}</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-600 mt-0.5 line-clamp-1">{ordem.objeto}</p>
                    {ordem.contrato?.credor && (
                      <p className="text-xs text-ink-500 mt-0.5">
                        <Truck className="inline h-3 w-3 mr-0.5" />{ordem.contrato.credor.razao_social}
                      </p>
                    )}
                    {/* Itens com saldo */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ordem.itens?.slice(0, 3).map(oi => (
                        <span key={oi.id} className="text-xs bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded-sm">
                          {oi.codigo_item ? `[${oi.codigo_item}] ` : ''}{oi.descricao?.slice(0, 30)}{oi.descricao?.length > 30 ? '…' : ''} · saldo: {oi.saldo} {oi.unidade}
                        </span>
                      ))}
                      {(ordem.itens?.length || 0) > 3 && (
                        <span className="text-xs text-ink-400">+{ordem.itens.length - 3} mais</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0 mt-1">Selecionar →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Modal: Nova Entrada (Lote) ───────────────────────────────────────────────
function NovaEntradaModal({ itens, onClose, onSave, saving, erro }) {
  const emptyForm = {
    item_id: '',
    quantidade: '',
    valor_unitario: '',
    data_entrada: today(),
    data_validade: '',
    numero_empenho: '',
    numero_nf: '',
    chave_nfe: '',
    numero_contrato: '',
    fornecedor_cnpj: '',
    fornecedor_nome: '',
    conferencia_cega_qtd: '',
    observacao: '',
    corredor: '',
    prateleira: '',
    gaveta: '',
    secretaria: '',
    // campos de ordem de compra
    ordem_id: null,
    ordem_item_id: null,
    _codigo_item: '',
    _descricao_item: '',
    _unidade_item: '',
    _saldo_item: null,
  }
  const [form, setForm] = useState(emptyForm)

  // ── Ordem de Compra ────────────────────────────────────────────────────────
  const [showPicker,   setShowPicker]   = useState(false)
  const [ordemData,    setOrdemData]    = useState(null)
  const [ordemItemSel, setOrdemItemSel] = useState('')

  const aplicarOrdem = (ordem) => {
    setOrdemData(ordem)
    setShowPicker(false)
    setOrdemItemSel('')
    setForm(f => ({
      ...f,
      ordem_id: ordem.id,
      item_id: '',
      ordem_item_id: null,
      _saldo_item: null,
      numero_contrato: ordem.contrato?.numero_contrato || f.numero_contrato,
      fornecedor_nome: ordem.contrato?.credor?.razao_social || f.fornecedor_nome,
      fornecedor_cnpj: ordem.contrato?.credor?.cnpj_cpf    || f.fornecedor_cnpj,
      secretaria:      ordem.secretaria || f.secretaria,
    }))
  }

  const selecionarOrdemItem = (ordemItemId) => {
    setOrdemItemSel(ordemItemId)
    if (!ordemItemId) {
      setForm(f => ({ ...f, item_id: '', ordem_item_id: null, _saldo_item: null, valor_unitario: '' }))
      return
    }
    const oi = ordemData?.itens?.find(i => String(i.id) === String(ordemItemId))
    if (!oi) return
    setForm(f => ({
      ...f,
      item_id:         oi.almox_item_id || '',
      ordem_item_id:   oi.id,
      _codigo_item:    oi.codigo_item   || '',
      _descricao_item: oi.descricao     || '',
      _unidade_item:   oi.unidade       || 'UN',
      _saldo_item:     oi.saldo,
      valor_unitario:  oi.valor_unitario ? String(oi.valor_unitario) : f.valor_unitario,
    }))
  }

  const limparOrdem = () => {
    setOrdemData(null); setOrdemItemSel('')
    setForm(emptyForm)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const itemSelecionado = itens.find(i => i.id === form.item_id)

  const itemOC  = ordemData?.itens?.find(i => String(i.id) === String(ordemItemSel))
  const podeEntrar = (form.item_id || form.ordem_item_id) && form.quantidade && form.data_entrada

  return (
    <AlmoxModal title="Registrar Entrada de Material" onClose={onClose} fullscreen>
      <div className="space-y-4">

        {/* ── Ordem de Compra ────────────────────────────────────────────── */}
        {showPicker && (
          <OrdemCompraPickerModal onSelect={aplicarOrdem} onClose={() => setShowPicker(false)} />
        )}
        <div className={`border rounded-lg p-3 space-y-2 ${ordemData ? 'border-success-400 dark:border-success-600 bg-success-50 dark:bg-success-900/10' : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Ordem de Compra
              {!ordemData && <span className="font-normal normal-case text-amber-500 ml-1">(opcional)</span>}
            </p>
            {!ordemData ? (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"
              >
                <Search className="h-3.5 w-3.5" />
                Buscar Ordem
              </button>
            ) : (
              <button
                type="button"
                onClick={limparOrdem}
                className="text-ink-400 hover:text-danger-500 p-1"
                title="Limpar ordem selecionada"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {ordemData && (
            <div className="space-y-2">
              {/* Card da ordem selecionada */}
              <div>
                <p className="font-semibold text-success-800 dark:text-success-300 text-sm">{ordemData.numero}</p>
                <p className="text-xs text-ink-600 line-clamp-1">{ordemData.objeto}</p>
                {ordemData.contrato?.credor && (
                  <p className="text-xs text-ink-500">
                    Fornecedor: <span className="font-medium">{ordemData.contrato.credor.razao_social}</span>
                  </p>
                )}
                {ordemData.secretaria && (
                  <p className="text-xs text-ink-500">Secretaria: {ordemData.secretaria}</p>
                )}
              </div>
              {/* Seleção do item da ordem */}
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Item da Ordem *
                </label>
                <select
                  value={ordemItemSel}
                  onChange={e => selecionarOrdemItem(e.target.value)}
                  className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-success-500"
                >
                  <option value="">Selecione o item a receber...</option>
                  {ordemData.itens.map(oi => (
                    <option key={oi.id} value={oi.id}>
                      {oi.codigo_item ? `[${oi.codigo_item}] ` : ''}{oi.descricao} — Saldo: {oi.saldo} {oi.unidade}
                    </option>
                  ))}
                </select>
                {itemOC && (
                  <p className="text-xs text-success-700 dark:text-success-400 mt-1">
                    Saldo disponível: <strong>{itemOC.saldo} {itemOC.unidade}</strong>
                    {' '}· Recebido: {itemOC.quantidade_recebida} de {itemOC.quantidade}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {erro && (
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 text-danger-700 dark:text-danger-300 rounded-lg px-4 py-2 text-sm">
            {erro}
          </div>
        )}

        {/* Item + Quantidade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink-700 mb-1">Item *</label>
            {ordemData && ordemItemSel ? (
              /* Item bloqueado pela OC */
              <div className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm bg-ink-50 text-ink-700">
                {form._codigo_item ? `[${form._codigo_item}] ` : ''}{form._descricao_item || '—'}
                <span className="ml-2 text-xs text-ink-400">(definido pela ordem)</span>
              </div>
            ) : !ordemData ? (
              <select
                value={form.item_id}
                onChange={e => {
                  const it = itens.find(i => i.id === e.target.value)
                  set('item_id', e.target.value)
                  if (it) set('valor_unitario', it.valor_unitario || '')
                }}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Selecione o item...</option>
                {itens.map(i => (
                  <option key={i.id} value={i.id}>{i.codigo} — {i.nome} ({i.unidade})</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 italic">Selecione um item da ordem acima</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Quantidade *{' '}
              {form._unidade_item ? `(${form._unidade_item})` : itemSelecionado ? `(${itemSelecionado.unidade})` : ''}
              {form._saldo_item != null && (
                <span className="ml-1 text-xs text-success-600 dark:text-success-400 font-normal">máx: {form._saldo_item}</span>
              )}
            </label>
            <input
              type="number" step="0.001" min="0.001"
              max={form._saldo_item != null ? form._saldo_item : undefined}
              value={form.quantidade}
              onChange={e => set('quantidade', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
            {form._saldo_item != null && parseFloat(form.quantidade) > form._saldo_item && (
              <p className="text-xs text-danger-600 mt-0.5">Excede o saldo da ordem ({form._saldo_item})</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Valor Unitário (R$)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.valor_unitario}
              onChange={e => set('valor_unitario', e.target.value)}
              readOnly={ordemData && ordemItemSel && !!form.valor_unitario && !!itemOC}
              className={`w-full border border-ink-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 ${
                ordemData && ordemItemSel && itemOC
                  ? 'bg-ink-50 text-ink-700'
                  : 'bg-surface text-ink-900'
              }`}
            />
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Data de Entrada *</label>
            <input
              type="date"
              value={form.data_entrada}
              onChange={e => set('data_entrada', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Data de Validade <span className="text-ink-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={form.data_validade}
              onChange={e => set('data_validade', e.target.value)}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Empenho / NF / Contrato */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Número do Empenho *</label>
            <input
              value={form.numero_empenho}
              onChange={e => set('numero_empenho', e.target.value)}
              placeholder="ex: 2026NE001234"
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Número da NF</label>
            <input
              value={form.numero_nf}
              onChange={e => set('numero_nf', e.target.value)}
              placeholder="ex: 000123"
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink-700 mb-1">Chave NF-e (44 dígitos)</label>
            <input
              value={form.chave_nfe}
              onChange={e => set('chave_nfe', e.target.value)}
              placeholder="00000000000000000000000000000000000000000000"
              maxLength={44}
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm font-mono bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Número do Contrato</label>
            <input
              value={form.numero_contrato}
              onChange={e => set('numero_contrato', e.target.value)}
              placeholder="ex: 001/2026"
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">CNPJ do Fornecedor</label>
            <input
              value={form.fornecedor_cnpj}
              onChange={e => set('fornecedor_cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Fornecedor */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Fornecedor</label>
          <input
            value={form.fornecedor_nome}
            onChange={e => set('fornecedor_nome', e.target.value)}
            placeholder="Razão social ou nome"
            className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Conferência Cega */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">
            Conferência Cega — Qtd contada <span className="text-ink-400 font-normal">(opcional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.001" min="0"
              value={form.conferencia_cega_qtd}
              onChange={e => set('conferencia_cega_qtd', e.target.value)}
              placeholder="Qtd contada fisicamente"
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
            />
            {form.conferencia_cega_qtd && form.quantidade && (
              parseFloat(form.conferencia_cega_qtd) === parseFloat(form.quantidade)
                ? <CheckCircle2 className="h-5 w-5 text-success-500 shrink-0" title="Qtds conferem" />
                : <AlertTriangle className="h-5 w-5 text-danger-500 shrink-0" title="Divergência!" />
            )}
          </div>
          {form.conferencia_cega_qtd && form.quantidade &&
            parseFloat(form.conferencia_cega_qtd) !== parseFloat(form.quantidade) && (
            <p className="text-xs text-danger-600 mt-1">
              Divergência: NF={fmt(form.quantidade)}, contado={fmt(form.conferencia_cega_qtd)}
            </p>
          )}
        </div>

        {/* Observação */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Observação</label>
          <CampoSugerido
            campo="almox.lote.observacao" registrarNoEnvio={false}
            rotulo="Observação da entrada de lote no almoxarifado (nota fiscal, conferência, armazenagem)"
            contexto={contextoFormulario(form, { item: itemSelecionado?.nome, unidade: itemSelecionado?.unidade })}
            pronto={!!form.item_id} quando="focar"
            value={form.observacao}
            onChange={e => set('observacao', e.target.value)}
            rows={2}
            className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        {/* Localização do Item no Almoxarifado */}
        <div className="border border-ink-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex items-center gap-1">
            <MapPin className="h-3 w-3 text-amber-500" /> Localização no Almoxarifado
            <span className="text-ink-400 font-normal normal-case ml-1">(opcional — atualiza o cadastro do item)</span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Corredor</label>
              <input
                value={form.corredor}
                onChange={e => set('corredor', e.target.value)}
                placeholder="Ex: A"
                maxLength={20}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Prateleira</label>
              <input
                value={form.prateleira}
                onChange={e => set('prateleira', e.target.value)}
                placeholder="Ex: 3"
                maxLength={20}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Gaveta</label>
              <input
                value={form.gaveta}
                onChange={e => set('gaveta', e.target.value)}
                placeholder="Ex: G1"
                maxLength={20}
                className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 flex items-center gap-1">
              <Building2 className="h-3 w-3 text-info-500" /> Secretaria / Departamento
            </label>
            <input
              value={form.secretaria}
              onChange={e => set('secretaria', e.target.value)}
              placeholder="Ex: Secretaria de Saúde"
              className="w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:ring-2 focus:ring-amber-500 mt-1"
            />
          </div>
        </div>

        {/* Total previsto */}
        {form.quantidade && form.valor_unitario && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2 text-sm">
            <strong>Total do lote:</strong>{' '}
            <span className="text-amber-700 dark:text-amber-300 font-semibold">
              {fmtMoney(parseFloat(form.quantidade) * parseFloat(form.valor_unitario))}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => { registrarTextoUsado('almox.lote.observacao', form.observacao, contextoFormulario(form, { item: itemSelecionado?.nome })); onSave(form) }}
            disabled={
              saving || !podeEntrar ||
              (form._saldo_item != null && parseFloat(form.quantidade) > form._saldo_item) ||
              (ordemData && !ordemItemSel)
            }
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Registrando...' : 'Registrar Entrada'}
          </button>
        </div>
      </div>
    </AlmoxModal>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AlmoxLotes() {
  // Ações conforme o editor de permissões. Só "Ver" = sem botões de ação.
  const pode = usePode('almoxarifado', 'entradas')
  const [lotes,    setLotes]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [itens,    setItens]    = useState([])
  const [novaModal,setNovaModal]= useState(false)
  const [saving,   setSaving]   = useState(false)
  const [erro,     setErro]     = useState('')
  const [filtroItem, setFiltroItem] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('true')
  const [PER_PAGE, setPerPage] = usePorPagina('almox-entradas', 30)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: PER_PAGE }
      if (filtroItem)  params.item_id = filtroItem
      if (filtroAtivo) params.ativo   = filtroAtivo
      const { data } = await api.get('/almoxarifado/lotes', { params })
      setLotes(data.lotes)
      setTotal(data.total)
    } catch { } finally { setLoading(false) }
  }, [filtroItem, filtroAtivo, PER_PAGE])

  useEffect(() => {
    api.get('/almoxarifado/itens').then(r => setItens(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const handleSave = async (form) => {
    setSaving(true); setErro('')
    try {
      await api.post('/almoxarifado/lotes', form)
      setNovaModal(false)
      load(1)
    } catch (e) {
      const d = e.response?.data
      setErro((d?.error || 'Erro ao registrar entrada') + (d?.detail ? ` — ${d.detail}` : ''))
    } finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={filtroItem}
            onChange={e => { setFiltroItem(e.target.value); setPage(1) }}
            className="border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900"
          >
            <option value="">Todos os itens</option>
            {itens.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.nome}</option>)}
          </select>
          <select
            value={filtroAtivo}
            onChange={e => { setFiltroAtivo(e.target.value); setPage(1) }}
            className="border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900"
          >
            <option value="true">Com saldo</option>
            <option value="">Todos os lotes</option>
          </select>
          <button onClick={() => load(page)} className="p-2 text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {pode('registrar') && (
          <button
            onClick={() => { setNovaModal(true); setErro('') }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova Entrada
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <LoadingBar label="Carregando lotes..." />
      ) : (
        <div className="bg-surface rounded-xl border border-ink-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                {['Item', 'Empenho / NF', 'Fornecedor', 'Entrada', 'Validade', 'Qtd Inicial', 'Saldo', 'Valor Unit.'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {lotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-ink-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Nenhum lote encontrado
                  </td>
                </tr>
              )}
              {lotes.map(lote => {
                const pct = lote.quantidade_inicial > 0
                  ? (parseFloat(lote.quantidade_atual) / parseFloat(lote.quantidade_inicial)) * 100
                  : 0
                return (
                  <tr key={lote.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900 dark:text-white text-sm">{lote.item?.nome || '—'}</p>
                      <p className="text-xs text-ink-400">{lote.item?.codigo} · {lote.item?.categoria}</p>
                    </td>
                    <td className="px-4 py-3">
                      {lote.numero_empenho && (
                        <div className="flex items-center gap-1 text-xs text-brand-600 dark:text-info-400">
                          <FileText className="h-3 w-3" /> {lote.numero_empenho}
                        </div>
                      )}
                      {lote.numero_nf && (
                        <div className="flex items-center gap-1 text-xs text-ink-500">
                          NF {lote.numero_nf}
                        </div>
                      )}
                      {lote.numero_contrato && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          Contrato {lote.numero_contrato}
                        </div>
                      )}
                      {lote.chave_nfe && (
                        <div className="text-xs text-ink-400 font-mono truncate max-w-[180px]" title={lote.chave_nfe}>
                          {lote.chave_nfe.slice(0, 12)}...
                        </div>
                      )}
                      {lote.conferencia_cega_ok === false && (
                        <div className="flex items-center gap-1 text-xs text-danger-500">
                          <AlertTriangle className="h-3 w-3" /> Diverg. cega
                        </div>
                      )}
                      {!lote.numero_empenho && !lote.numero_nf && <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lote.fornecedor_nome ? (
                        <div className="flex items-center gap-1 text-xs text-ink-600">
                          <Truck className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{lote.fornecedor_nome}</span>
                        </div>
                      ) : <span className="text-ink-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">
                      {lote.data_entrada ? new Date(lote.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ValidadeBadge data={lote.data_validade} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-ink-500">
                      {fmt(lote.quantidade_inicial)} {lote.item?.unidade}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs font-semibold text-ink-900 dark:text-white">
                        {fmt(lote.quantidade_atual)} {lote.item?.unidade}
                      </div>
                      {/* Barra de progresso do saldo */}
                      <div className="mt-1 h-1.5 bg-ink-200 rounded-full overflow-hidden w-20">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 50 ? 'bg-success-500' : pct > 15 ? 'bg-orange-400' : 'bg-danger-500'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-ink-500">
                      {fmtMoney(lote.valor_unitario)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>

          <Paginacao total={total} pagina={page} setPagina={setPage} porPagina={PER_PAGE}
            setPorPagina={(n) => { setPerPage(n); setPage(1) }} rotulo="lote" className="border-t border-ink-200" />
        </div>
      )}

      {novaModal && (
        <NovaEntradaModal
          itens={itens}
          onClose={() => setNovaModal(false)}
          onSave={handleSave}
          saving={saving}
          erro={erro}
        />
      )}
    </div>
  )
}
