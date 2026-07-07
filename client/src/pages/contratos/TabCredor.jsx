import { useState, useEffect, useRef } from 'react'
import {
  User, Activity, Building2, Check, X, AlertTriangle, Loader2,
  CheckCircle2, XCircle, FileText, Search, Edit3, Trash2, Plus,
  ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react'
import api from '../../services/api'
import { ESTADOS_BR, SectionCard, PremiumInput, PremiumSelect, ViewField, PortalDropdown } from './ContratosShared'

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
//  MODAL: FORMULÁRIO DE CREDOR (Incluir / Alterar / Visualizar) — PREMIUM
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

  const [docStatus, setDocStatus] = useState('idle')
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
    const valido = isPJ ? validarCNPJ(digits) : validarCPF(digits)
    if (!valido) { setDocStatus('error'); setDocMsg(isPJ ? 'CNPJ inválido' : 'CPF inválido'); return }
    if (isPJ) {
      setDocStatus('loading')
      debounceRef.current = setTimeout(async () => {
        try {
          const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
          if (!res.ok) throw new Error('não encontrado')
          const data = await res.json()
          setForm(p => ({ ...p, razao_social: (data.razao_social || '').toUpperCase(), nome_fantasia: (data.nome_fantasia || '').toUpperCase() }))
          setDocStatus('ok'); setDocMsg('CNPJ encontrado na Receita Federal')
        } catch {
          setDocStatus('ok'); setDocMsg('CNPJ válido — preencha os dados manualmente')
        }
      }, 400)
    } else {
      setDocStatus('ok'); setDocMsg('CPF válido')
    }
  }

  const onTipoChange = (t) => {
    if (readonly) return
    set('tipo', t); set('cnpj_cpf', ''); setDocStatus('idle'); setDocMsg('')
  }

  const salvar = () => {
    if (!form.cnpj_cpf.trim())    { alert(isPJ ? 'Informe o CNPJ.' : 'Informe o CPF.'); return }
    if (!form.razao_social.trim()) { alert(isPJ ? 'Informe a Razão Social.' : 'Informe o Nome.'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-gray-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '820px' }}>

        {/* ── Header Premium ── */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/60 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${isPJ ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-teal-500 to-emerald-600'}`}>
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {readonly ? (form.razao_social || 'Detalhes do Credor') : `Credor — ${titulo}`}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {readonly ? (form.cnpj_cpf || 'Informações completas do credor') : 'Dados do fornecedor ou prestador de serviço'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                form.status === 'ATIVO'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>{form.status || 'ATIVO'}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isPJ ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'}`}>
                {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </span>
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

            {/* Dados Principais */}
              <SectionCard icon={User} title="Dados Principais" subtitle="Identificação e situação do credor">
                <div className="space-y-4">
                  {/* Tipo de Pessoa */}
                  {!readonly && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Tipo de Pessoa</label>
                      <div className="flex gap-3">
                        {['Jurídica', 'Física'].map(t => (
                          <label key={t} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                            form.tipo === t
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300'
                          }`}>
                            <input type="radio" name="tipo_credor" value={t} checked={form.tipo === t}
                              onChange={() => onTipoChange(t)} disabled={readonly} className="sr-only" />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.tipo === t ? 'border-blue-500' : 'border-gray-300'}`}>
                              {form.tipo === t && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                            </div>
                            <span className="text-sm font-medium">Pessoa {t}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CNPJ / CPF */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">{isPJ ? 'CNPJ *' : 'CPF *'}</label>
                      {readonly
                        ? <p className="font-mono font-semibold text-gray-800 dark:text-slate-200">{form.cnpj_cpf}</p>
                        : <div className="relative">
                            <PremiumInput
                              value={form.cnpj_cpf}
                              onChange={e => onDocChange(e.target.value)}
                              placeholder={isPJ ? '00.000.000/0000-00' : '000.000.000-00'}
                              maxLength={isPJ ? 18 : 14}
                              className={`font-mono pr-10 ${docStatus === 'error' ? 'border-red-400 focus:ring-red-300' : docStatus === 'ok' ? 'border-green-400 focus:ring-green-300' : ''}`}
                              autoFocus
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {docStatus === 'loading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                              {docStatus === 'ok'      && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {docStatus === 'error'   && <XCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </div>
                      }
                      {docMsg && (
                        <p className={`text-xs mt-1 ${docStatus === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{docMsg}</p>
                      )}
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Status</label>
                      {readonly
                        ? <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${form.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{form.status}</span>
                        : <PremiumSelect value={form.status} onChange={e => set('status', e.target.value)}>
                            <option value="ATIVO">ATIVO</option>
                            <option value="INATIVO">INATIVO</option>
                          </PremiumSelect>
                      }
                    </div>
                  </div>

                  {/* Razão Social */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">{isPJ ? 'Razão Social *' : 'Nome Completo *'}</label>
                    {readonly
                      ? <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 uppercase">{form.razao_social}</p>
                      : <PremiumInput value={form.razao_social} onChange={e => set('razao_social', e.target.value.toUpperCase())}
                          placeholder={isPJ ? 'Razão social...' : 'Nome completo...'} className="uppercase font-medium" />
                    }
                  </div>

                  {isPJ && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Nome Fantasia</label>
                      {readonly
                        ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.nome_fantasia || '—'}</p>
                        : <PremiumInput value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value.toUpperCase())} placeholder="Nome fantasia..." className="uppercase" />
                      }
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Contato */}
              <SectionCard icon={Activity} title="Contato" subtitle="Informações para comunicação">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">E-mail</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.email || '—'}</p>
                      : <PremiumInput value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="email@empresa.com.br" />
                    }
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Telefone</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.telefone || '—'}</p>
                      : <PremiumInput value={form.telefone} onChange={e => set('telefone', maskPhone(e.target.value))} placeholder="(88) 0000-0000" maxLength={15} className="font-mono" />
                    }
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Celular</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.celular || '—'}</p>
                      : <PremiumInput value={form.celular} onChange={e => set('celular', maskPhone(e.target.value))} placeholder="(88) 9.9999-9999" maxLength={16} className="font-mono" />
                    }
                  </div>
                </div>
              </SectionCard>

              {/* Endereço */}
              <SectionCard icon={Building2} title="Endereço" subtitle="Localização do credor">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">CEP</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.cep || '—'}</p>
                      : <PremiumInput value={form.cep} onChange={e => set('cep', maskCEP(e.target.value))} placeholder="00000-000" maxLength={9} className="font-mono" />
                    }
                  </div>
                  <div className="col-span-8">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Logradouro</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.logradouro || '—'}</p>
                      : <PremiumInput value={form.logradouro} onChange={e => set('logradouro', e.target.value.toUpperCase())} placeholder="Rua, Av., Travessa..." className="uppercase" />
                    }
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Número</label>
                    {readonly
                      ? <p className="text-sm text-gray-700 dark:text-slate-300">{form.numero || '—'}</p>
                      : <PremiumInput value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Nº" />
                    }
                  </div>
                  <div className="col-span-9">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Complemento</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.complemento || '—'}</p>
                      : <PremiumInput value={form.complemento} onChange={e => set('complemento', e.target.value.toUpperCase())} placeholder="Complemento" className="uppercase" />
                    }
                  </div>
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Bairro</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.bairro || '—'}</p>
                      : <PremiumInput value={form.bairro} onChange={e => set('bairro', e.target.value.toUpperCase())} placeholder="Bairro" className="uppercase" />
                    }
                  </div>
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Cidade</label>
                    {readonly
                      ? <p className="text-sm uppercase text-gray-700 dark:text-slate-300">{form.cidade || '—'}</p>
                      : <PremiumInput value={form.cidade} onChange={e => set('cidade', e.target.value.toUpperCase())} placeholder="Cidade" className="uppercase" />
                    }
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">UF</label>
                    {readonly
                      ? <p className="text-sm font-mono text-gray-700 dark:text-slate-300">{form.uf || '—'}</p>
                      : <PremiumSelect value={form.uf} onChange={e => set('uf', e.target.value)}>
                          <option value="">UF</option>
                          {ESTADOS_BR.map(u => <option key={u} value={u}>{u}</option>)}
                        </PremiumSelect>
                    }
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/60 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            {credor?.id && <span>ID: <span className="font-mono">{credor.id}</span></span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all">
              {readonly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readonly && (
              <button onClick={salvar}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
                <Check className="w-4 h-4" /> Salvar Credor
              </button>
            )}
          </div>
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Excluir Credor</h3>
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-900 px-5 py-3 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4" /> Contratos vinculados</h2>
            <p className="text-xs text-slate-400 mt-0.5">Todos os contratos e atas ligados a este credor</p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info do credor */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Credor</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm mt-0.5">{credor.razao_social}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>{credor.tipo === 'Jurídica' ? 'CNPJ' : 'CPF'}: <strong className="text-gray-700 dark:text-slate-300 font-mono">{credor.cnpj_cpf}</strong></span>
            {credor.cidade && <span>Cidade: <strong className="text-gray-700 dark:text-slate-300">{credor.cidade}{credor.uf ? '/' + credor.uf : ''}</strong></span>}
          </div>
        </div>

        {/* Tabela de contratos */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {vinculados.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum contrato vinculado</p>
              <p className="text-sm mt-1">Este credor ainda não possui contratos cadastrados.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-semibold">N° Contrato</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Objeto</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Modalidade</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Valor</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Vigência</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {vinculados.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs text-gray-700 dark:text-slate-300">
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
                          ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
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
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <span className="text-xs text-gray-400">{vinculados.length} contrato(s) encontrado(s)</span>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded text-sm font-semibold transition-colors">
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
  const [syncando, setSyncando] = useState(false)

  const FILTROS_VAZIOS = { razao_social: '', cnpj_cpf: '', tipo: '', status: '' }
  const [filtros, setFiltros]             = useState(FILTROS_VAZIOS)
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_VAZIOS)
  const [selecionado, setSelecionado]     = useState(null)
  const [modal, setModal]                 = useState(null) // 'novo'|'editar'|'visualizar'|'excluir'
  const [ordenar, setOrdenar]             = useState({ col: 'razao_social', asc: true })
  const [pagina, setPagina]               = useState(1)
  const PER_PAGE_CREDOR = 15

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }))
  const pesquisar = () => { setFiltrosAtivos({ ...filtros }); setPagina(1) }
  const limparFiltros = () => { setFiltros(FILTROS_VAZIOS); setFiltrosAtivos(FILTROS_VAZIOS); setPagina(1) }

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

  const totalPags = Math.max(1, Math.ceil(credoresFiltrados.length / PER_PAGE_CREDOR))
  const credoresPaginados = credoresFiltrados.slice((pagina - 1) * PER_PAGE_CREDOR, pagina * PER_PAGE_CREDOR)

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
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir credor.')
    }
  }

  const syncDids = async () => {
    if (!confirm('Importar credores dos DIDs existentes que ainda não estão cadastrados aqui?')) return
    setSyncando(true)
    try {
      const { data } = await api.post('/contratos/sync-from-dids')
      if (data.criados > 0) {
        const novos = await api.get('/contratos/credores')
        setCredores(novos.data)
      }
      alert(`Sincronização concluída!\n✅ ${data.criados} credor(es) importado(s) dos DIDs.\n⏭ ${data.ignorados} já existiam.`)
    } catch (err) {
      alert('Erro ao sincronizar: ' + (err.response?.data?.error || err.message))
    } finally {
      setSyncando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Mini KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Credores', value: credores.length,                                  icon: User,         color: 'from-blue-500 to-indigo-600'  },
          { label: 'Ativos',         value: credores.filter(c => c.status === 'ATIVO').length, icon: CheckCircle2, color: 'from-green-500 to-emerald-600' },
          { label: 'Inativos',       value: credores.filter(c => c.status !== 'ATIVO').length, icon: XCircle,      color: 'from-gray-400 to-slate-500'   },
          { label: 'Filtrados',      value: credoresFiltrados.length,                          icon: Search,       color: 'from-purple-500 to-violet-600' },
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Razão Social / Nome</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={filtros.razao_social} onChange={e => setF('razao_social', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisar()}
                placeholder="Pesquisar por nome ou razão social" className="input-field pl-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">CNPJ / CPF</label>
            <input value={filtros.cnpj_cpf} onChange={e => setF('cnpj_cpf', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pesquisar()}
              placeholder="Pesquisar CNPJ ou CPF" className="input-field text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Tipo</label>
            <select value={filtros.tipo} onChange={e => setF('tipo', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="Jurídica">Jurídica</option>
              <option value="Física">Física</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Status</label>
            <select value={filtros.status} onChange={e => setF('status', e.target.value)} className="input-field text-sm">
              <option value="">Todos</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {credoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 dark:text-slate-500">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Nenhum credor encontrado
                  </td>
                </tr>
              )}
              {credoresPaginados.map(c => {
                const sel = c.id === selecionado
                return (
                  <tr key={c.id}
                    onClick={() => setSelecionado(sel ? null : c.id)}
                    onDoubleClick={() => { setSelecionado(c.id); setModal('contratos_credor') }}
                    className={`cursor-pointer transition-colors text-xs ${
                      sel
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{c.tipo === 'Jurídica' ? 'PJ' : 'PF'}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">
                      {c.razao_social}
                      {c.nome_fantasia && <span className="ml-1 text-gray-400 font-normal">({c.nome_fantasia})</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600 dark:text-slate-400">{c.cnpj_cpf}</td>
                    <td className="px-3 py-2">{c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—'}</td>
                    <td className="px-3 py-2">{c.telefone || c.celular || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        c.status === 'ATIVO'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {credorSelecionado
              ? <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {credorSelecionado.razao_social}</span>
              : <span className="text-gray-400">Clique para selecionar · Duplo clique para visualizar</span>}
          </span>
          <div className="flex items-center gap-4">
            {totalPags > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(1)} disabled={pagina === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: totalPags }, (_, i) => i + 1)
                  .filter(p => p >= Math.max(1, pagina - 2) && p <= Math.min(totalPags, pagina + 2))
                  .map(p => (
                    <button key={p} onClick={() => setPagina(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors ${
                      p === pagina ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}>{p}</button>
                  ))}
                <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPagina(totalPags)} disabled={pagina === totalPags} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <span className="text-xs text-gray-500">
              Foram encontrados <strong>{credoresFiltrados.length}</strong> registro(s)
              {totalPags > 1 && <> · pág. <strong>{pagina}</strong>/{totalPags}</>}
            </span>
          </div>
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
        <button onClick={syncDids} disabled={syncando}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 ml-auto">
          {syncando ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : <><RefreshCw className="w-4 h-4" /> Importar do DID</>}
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

export default TabCredor
