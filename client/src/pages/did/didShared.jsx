import CampoSugerido from '../../components/ui/CampoSugerido'
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Pencil, Check, Loader2, RotateCcw, AlertTriangle, X } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export const DidReadOnlyContext = createContext(false)

// Modal de confirmação genérico — usado antes de liberar edição de campos sensíveis
// (ex: dados bancários do credor na Tesouraria).
export function ConfirmModal({ title, message, confirmLabel = 'Confirmar', onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-800">{title}</p>
            <p className="text-xs text-ink-500 mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm text-ink-400 hover:text-ink-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 bg-ink-50 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-100 font-semibold">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm">
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
  pago: 'nao', data_pagamento: '',
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
  // Respostas das etapas personalizadas do fluxo ({ [etapaId]: { [campoId]: valor } })
  etapas_dados: {},
}

// ─── Componentes UI compartilhados ────────────────────────────────────────────
export function Field({ label, children, half, error }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className={`block text-xs font-medium mb-1 ${error ? 'text-danger-500 dark:text-danger-400' : 'text-ink-500'}`}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{error}</p>}
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
      className={`input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}
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

  const cls = `input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`

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

// sugestao: { campo, rotulo, contexto } — abre o campo em branco já com um texto da Ayla
export function Textarea({ value, onChange, placeholder, disabled, rows = 3, sugestao }) {
  if (sugestao) {
    return (
      <CampoSugerido
        campo={sugestao.campo}
        rotulo={sugestao.rotulo}
        contexto={sugestao.contexto}
        rows={rows}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`input-field text-sm resize-none${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}
      />
    )
  }
  return (
    <textarea
      rows={rows}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`input-field text-sm resize-none${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}
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

// Certidões com arquivo (Tesouraria): marca a certidão e anexa o PDF/imagem. O arquivo
// fica no DID (cert_sec1_arquivos, chave certKey) e entra nos Documentos Anexados do processo.
export function CertidoesComAnexo({ itens, form, set, chk, locked, processoId }) {
  const [enviando, setEnviando] = useState({})
  const refs = useRef({})
  const arquivos = form.cert_sec1_arquivos || {}
  const semProcesso = !processoId || processoId === 'novo'

  const enviar = async (certKey, file) => {
    if (semProcesso) { alert('Salve o DID antes de anexar arquivos.'); return }
    setEnviando(p => ({ ...p, [certKey]: true }))
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post(`/did/processo/${processoId}/certidao/${certKey}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      set('cert_sec1_arquivos', data.cert_sec1_arquivos)
    } catch (err) { alert(err?.response?.data?.error || 'Erro ao fazer upload do arquivo.') }
    finally { setEnviando(p => ({ ...p, [certKey]: false })) }
  }
  const ver = async (certKey) => {
    try {
      const { data } = await api.get(`/did/processo/${processoId}/certidao/${certKey}/url`)
      window.open(data.url, '_blank')
    } catch { alert('Erro ao abrir arquivo.') }
  }
  const remover = async (certKey) => {
    if (!confirm('Remover o arquivo desta certidão? Ela fica desmarcada e o arquivo sai dos Documentos Anexados do processo.')) return
    try {
      const { data } = await api.delete(`/did/processo/${processoId}/certidao/${certKey}`)
      set('cert_sec1_arquivos', data.cert_sec1_arquivos)
      if (data.campo) set(data.campo, false) // sem o arquivo, a certidão fica desmarcada
    } catch (err) { alert(err?.response?.data?.error || 'Erro ao remover arquivo.') }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {itens.map(({ campo, certKey, label }) => {
        const arq = arquivos[certKey]
        return (
          <div key={campo} className={`rounded-lg border p-2.5 ${form[campo] ? 'border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/15' : 'border-ink-200 bg-surface'}`}>
            <div className="mb-2"><Checkbox label={label} checked={form[campo]} onChange={chk(campo)} disabled={locked} /></div>
            {arq ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink-600 truncate flex-1 min-w-0" title={arq.nome}>{arq.nome}</span>
                <button type="button" onClick={() => ver(certKey)} className="text-[11px] font-semibold text-info-600 hover:underline shrink-0">Ver</button>
                {!locked && (
                  <button type="button" onClick={() => remover(certKey)} title="Remover arquivo" className="p-0.5 rounded-sm text-danger-400 hover:bg-danger-50 shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <input ref={el => { refs.current[certKey] = el }} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { enviar(certKey, f); e.target.value = '' } }} />
                <button type="button" disabled={locked || enviando[certKey]} onClick={() => refs.current[certKey]?.click()}
                  className="text-xs text-ink-500 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  {enviando[certKey] ? 'Enviando...' : '+ Anexar arquivo'}
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2 text-sm text-ink-700${disabled ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer'}`}>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled}
        className="w-4 h-4 rounded-sm border-ink-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60" />
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
  const [confirmarLimpar, setConfirmarLimpar] = useState(false)
  if (readOnly) return null

  return (
    <div className="col-span-2 flex justify-between items-center pt-2 border-t border-ink-100 mt-1">
      {onLimpar ? (
        <button type="button" onClick={() => setConfirmarLimpar(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-50 hover:bg-danger-100 dark:bg-danger-900/20 dark:hover:bg-danger-900/40 text-danger-600 dark:text-danger-400 border border-danger-200 dark:border-danger-700 rounded-lg text-sm font-semibold transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Limpar Seção
        </button>
      ) : <div />}
      <div className="flex gap-2">
        {locked ? (
          <button type="button" onClick={onAlterar}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Pencil className="w-3.5 h-3.5" /> Alterar
          </button>
        ) : (
          <button type="button" onClick={onSalvar} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-success-600 hover:bg-success-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {label}
          </button>
        )}
      </div>

      {confirmarLimpar && (
        <ConfirmModal
          title="Limpar Seção?"
          message="Todos os campos preenchidos nesta seção serão apagados ao salvar o formulário."
          confirmLabel="Limpar"
          onConfirm={() => { onLimpar?.(); setConfirmarLimpar(false) }}
          onClose={() => setConfirmarLimpar(false)}
        />
      )}
    </div>
  )
}
