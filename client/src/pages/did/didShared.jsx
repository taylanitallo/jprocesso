import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Pencil, Check, Loader2, RotateCcw, ChevronDown, AlertTriangle, X } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export const DidReadOnlyContext = createContext(false)

// Modal de confirmação genérico — usado antes de liberar edição de campos sensíveis
// (ex: dados bancários do credor na Tesouraria).
export function ConfirmModal({ title, message, confirmLabel = 'Confirmar', onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/40 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Constante de estado vazio do DID ────────────────────────────────────────
export const EMPTY = {
  // Seção I
  numero_did: '',
  objeto: '', data_did: '', secretario_nome: '', secretaria_sec1: '', fonte_recurso: 'PRÓPRIO', detalhes_em_anexo: false,
  contrato_ref: '', credor_sec1: '', cnpj_cpf_credor_sec1: '', nro_licitacao_sec1: '', tipo_licitacao_sec1: '', valor_did: '',
  mes_referencia: '', nf_sec1: '',
  cert_sec1_municipal: false, cert_sec1_trabalhista: false, cert_sec1_fgts: false, cert_sec1_estadual: false, cert_sec1_federal: false, cert_sec1_simples_nac: false,
  // Vínculo com Ordem de Compra
  ordem_compra_id: '', ordem_ref: '',
  // Seção II
  ci_recebido_em: '', ci_responsavel: '', despacho_ci: '', dotacao_numero: '', fonte_recurso_numero: '',
  // Seção III
  compras_recebido_em: '', compras_responsavel: '', ja_licitado: false, nro_licitacao: '',
  realizar_cotacao: false, modalidade: '', data_compras: '', responsavel_compras: '',
  nro_empenho_solicitacao: '', local_entrega: '',
  // Setor de Compras 2 (após Finanças III — DID Contas Variáveis)
  compras2_recebido_em: '', compras2_responsavel: '', compras2_ja_licitado: false,
  compras2_nro_licitacao: '', compras2_realizar_cotacao: false, compras2_modalidade: '',
  compras2_data: '', compras2_responsavel_compras: '',
  compras2_nro_empenho_solicitacao: '', compras2_local_entrega: '',
  // Setor de Compras 3 (após Recebimento — DID Contas Variáveis)
  compras3_recebido_em: '', compras3_responsavel: '', compras3_ja_licitado: false,
  compras3_nro_licitacao: '', compras3_realizar_cotacao: false, compras3_modalidade: '',
  compras3_data: '', compras3_responsavel_compras: '',
  compras3_nro_empenho_solicitacao: '', compras3_local_entrega: '',
  // Seção IV
  contabil_recebido_em: '', contabil_responsavel: '', contabil_auditor: '',
  contabil_empenhado: '', empenho_numero: '', tipo_empenho: '', data_empenho: '',
  contabil_liquidado: '', liquidacao_numero: '', data_liquidacao: '', doc_caixa: '',
  // Contabilidade Pós Compras (DID Contas Variáveis)
  contabil_pc_recebido_em: '', contabil_pc_responsavel: '', contabil_pc_auditor: '',
  contabil_pc_empenho_numero: '', contabil_pc_tipo_empenho: '', contabil_pc_data_empenho: '',
  contabil_pc_liquidado: '', contabil_pc_liquidacao_numero: '', contabil_pc_data_liquidacao: '', contabil_pc_doc_caixa: '',
  // Seção V (nova - após Contabilidade)
  financas2_recebido_em: '', financas2_responsavel: '', financas2_enviado_pagamento: '',
  // Seção III (Finanças original)
  financas_recebido_em: '', financas_responsavel: '',
  // Seção VI
  pago: 'nao',
  tesouraria_recebido_em: '', tesouraria_responsavel: '',
  banco_pagador: '', ag_pagador: '', cc_pagador: '',
  // Seção de Recebimento (DID Contas Variáveis)
  receb_ordem_recebida: '',
  receb_data: '', receb_nf_data: '', receb_nf_enviado_compras: '', receb_responsavel: '', receb_cargo: '',
  receb_nf_conferida: false, receb_qtd_conferida: false, receb_esp_conforme: false, receb_obs: '',
  // Tesouraria
  conta_pagamento_id: '',
  // Seção VII
  contab_fech_finalizado: '', contab_fech_tce: '',
  cnpj_fornecedor: '', banco_fornecedor: '', ag_fornecedor: '', cc_fornecedor: '',
  cert_teso_municipal: false, cert_teso_trabalhista: false, cert_teso_fgts: false,
  cert_teso_estadual: false, cert_teso_federal: false, cert_teso_simples_nac: false,
  analisado_por: '',
  valor_bruto: '', desconto_inss: '', desconto_iss: '', desconto_irrf: '',
  desconto_sindicato: '', desconto_bb: '', desconto_caixa: '', desconto_pensao: '', desconto_outros: '',
}

// ─── Componentes UI compartilhados ────────────────────────────────────────────
export function Field({ label, children, half, error }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className={`block text-xs font-medium mb-1 ${error ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function Input({ value, onChange, type = 'text', placeholder, disabled, ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
      {...rest}
    />
  )
}

const _userCache = {}

export function UserSelect({ value, onChange, disabled, secretaria }) {
  const { user } = useAuth()
  const [users, setUsers] = useState(null)

  useEffect(() => {
    if (!secretaria) return
    if (_userCache[secretaria]) { setUsers(_userCache[secretaria]); return }
    api.get(`/auth/users/por-secretaria?nome=${encodeURIComponent(secretaria)}`)
      .then(({ data }) => { _userCache[secretaria] = data.users || []; setUsers(data.users || []) })
      .catch(() => { _userCache[secretaria] = []; setUsers([]) })
  }, [secretaria])

  // Pré-preenche com o usuário logado (quem está preenchendo agora), só quando o campo
  // ainda está vazio — não sobrescreve um valor já salvo/escolhido.
  useEffect(() => {
    if (disabled || value || !users?.length || !user?.nome) return
    if (users.some(u => u.nome === user.nome)) onChange({ target: { value: user.nome } })
  }, [users])

  const cls = `input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`

  if (users === null) return <Input value={value} onChange={onChange} disabled placeholder="Carregando..." />
  if (!users.length)  return <Input value={value} onChange={onChange} disabled={disabled} />

  return (
    <select value={value ?? ''} onChange={onChange} disabled={disabled} className={cls}>
      <option value="">— Selecione —</option>
      {value && !users.some(u => u.nome === value) && (
        <option value={value}>{value}</option>
      )}
      {users.map(u => (
        <option key={u.id} value={u.nome}>{u.nome}</option>
      ))}
    </select>
  )
}

export function Textarea({ value, onChange, placeholder, disabled, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`input-field text-sm resize-none${disabled ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
    />
  )
}

// Verifica uma lista de campos obrigatórios antes de salvar uma seção.
// pendencias: [{ ok: boolean, label: string }]. Se algo estiver faltando,
// avisa ao usuário exatamente o que falta e bloqueia o salvamento.
export function alertarPendencias(pendencias, secaoLabel) {
  const faltando = pendencias.filter(p => !p.ok).map(p => p.label)
  if (faltando.length === 0) return true
  alert(`Preencha os campos obrigatórios antes de salvar a ${secaoLabel}:\n\n• ${faltando.join('\n• ')}`)
  return false
}

// Multi-seleção de fontes de recurso — opções vêm do cadastro do contrato,
// valor persistido como string única com os itens separados por vírgula.
export function FonteRecursoSelect({ value, onChange, options, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selecionadas = (value || '').split(',').map(s => s.trim()).filter(Boolean)

  const toggle = (opt) => {
    const jaSelecionada = selecionadas.includes(opt)
    const novas = jaSelecionada ? selecionadas.filter(f => f !== opt) : [...selecionadas, opt]
    onChange(novas.join(', '))
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => !disabled && setOpen(o => !o)} disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border text-left
          border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
          ${disabled ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}>
        <span className={`truncate ${selecionadas.length === 0 ? 'text-gray-400' : ''}`}>
          {selecionadas.length > 0 ? selecionadas.join(', ') : 'Selecione uma ou mais fontes...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>
      {open && !disabled && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {options.map((opt, i) => {
            const checked = selecionadas.includes(opt)
            return (
              <label key={i}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0">
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">{opt}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300${disabled ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer'}`}>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60" />
      {label}
    </label>
  )
}

export function SectionCard({ icon: Icon, title, color, children }) {
  return (
    <div className="card overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )
}

export function SecaoBotoes({ locked, onAlterar, onSalvar, saving, label, onLimpar }) {
  const readOnly = useContext(DidReadOnlyContext)
  if (readOnly) return null

  const handleLimpar = () => {
    if (window.confirm('Limpar todos os campos desta seção? Os dados salvos serão apagados ao salvar o formulário.')) {
      onLimpar?.()
    }
  }

  return (
    <div className="col-span-2 flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-1">
      {onLimpar ? (
        <button type="button" onClick={handleLimpar}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg text-sm font-semibold transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Limpar Seção
        </button>
      ) : <div />}
      <div className="flex gap-2">
        {locked ? (
          <button type="button" onClick={onAlterar}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Pencil className="w-3.5 h-3.5" /> Alterar
          </button>
        ) : (
          <button type="button" onClick={onSalvar} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {label}
          </button>
        )}
      </div>
    </div>
  )
}
