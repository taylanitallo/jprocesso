import { Pencil, Check, Loader2 } from 'lucide-react'

// ─── Constante de estado vazio do DID ────────────────────────────────────────
export const EMPTY = {
  // Seção I
  numero_did: '',
  objeto: '', data_did: '', secretario_nome: '', secretaria_sec1: '', fonte_recurso: 'PRÓPRIO', detalhes_em_anexo: false,
  contrato_ref: '', credor_sec1: '', cnpj_cpf_credor_sec1: '', nro_licitacao_sec1: '', tipo_licitacao_sec1: '', valor_did: '',
  mes_referencia: '', nf_sec1: '',
  cert_sec1_municipal: false, cert_sec1_trabalhista: false, cert_sec1_fgts: false, cert_sec1_estadual: false, cert_sec1_federal: false,
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
  empenho_numero: '', tipo_empenho: '', data_empenho: '',
  liquidacao_numero: '', data_liquidacao: '', doc_caixa: '',
  // Contabilidade Pós Compras (DID Contas Variáveis)
  contabil_pc_recebido_em: '', contabil_pc_responsavel: '', contabil_pc_auditor: '',
  contabil_pc_empenho_numero: '', contabil_pc_tipo_empenho: '', contabil_pc_data_empenho: '',
  contabil_pc_liquidacao_numero: '', contabil_pc_data_liquidacao: '', contabil_pc_doc_caixa: '',
  // Seção V (nova - após Contabilidade)
  financas2_recebido_em: '', financas2_responsavel: '', financas2_enviado_pagamento: '',
  // Seção III (Finanças original)
  financas_recebido_em: '', financas_responsavel: '',
  // Seção VI
  pago: 'nao',
  tesouraria_recebido_em: '', tesouraria_responsavel: '',
  banco_pagador: '', ag_pagador: '', cc_pagador: '',
  // Seção de Recebimento (DID Contas Variáveis)
  receb_data: '', receb_nf_data: '', receb_nf_enviado_compras: '', receb_responsavel: '', receb_cargo: '',
  receb_nf_conferida: false, receb_qtd_conferida: false, receb_esp_conforme: false, receb_obs: '',
  // Seção VII
  contab_fech_finalizado: '', contab_fech_tce: '',
  cnpj_fornecedor: '', banco_fornecedor: '', ag_fornecedor: '', cc_fornecedor: '',
  cert_teso_cnd: false, cert_teso_fgts: false,
  cert_teso_estadual: false, cert_teso_trabalhista: false, cert_teso_municipal: false,
  analisado_por: '',
  valor_bruto: '', desconto_inss: '', desconto_iss: '', desconto_irrf: '',
  desconto_sindicato: '', desconto_bb: '', desconto_caixa: '', desconto_pensao: '', desconto_outros: '',
}

// ─── Componentes UI compartilhados ────────────────────────────────────────────
export function Field({ label, children, half }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {children}
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

export function SecaoBotoes({ locked, onAlterar, onSalvar, saving, label }) {
  return (
    <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-1">
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
  )
}
