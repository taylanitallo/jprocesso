import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, FileCheck, FileDown, Eye } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useAssinatura } from '../components/assinatura/AssinaturaProvider'
import { EMPTY, DidReadOnlyContext, ConfirmModal } from './did/didShared'
import { gerarDidPDF } from './did/gerarDidPDF'
import DidFixasSecaoI from './did/fixas/DidFixasSecaoI'
import DidFixasSecaoII from './did/fixas/DidFixasSecaoII'
import DidFixasSecaoIII from './did/fixas/DidFixasSecaoIII'
import DidFixasSecaoIV from './did/fixas/DidFixasSecaoIV'
import DidFixasSecaoV from './did/fixas/DidFixasSecaoV'
import DidFixasSecaoVI from './did/fixas/DidFixasSecaoVI'
import DidFixasSecaoVII from './did/fixas/DidFixasSecaoVII'
import DidVariaveisSecaoI from './did/variaveis/DidVariaveisSecaoI'
import DidVariaveisSecaoII from './did/variaveis/DidVariaveisSecaoII'
import DidVariaveisSecaoIII from './did/variaveis/DidVariaveisSecaoIII'
import DidVariaveisSecaoIV from './did/variaveis/DidVariaveisSecaoIV'
import DidVariaveisSecaoV from './did/variaveis/DidVariaveisSecaoV'
import DidVariaveisSecaoVI from './did/variaveis/DidVariaveisSecaoVI'
import DidVariaveisSecaoVII from './did/variaveis/DidVariaveisSecaoVII'
import DidVariaveisSecaoVIII from './did/variaveis/DidVariaveisSecaoVIII'
import DidVariaveisSecaoIX from './did/variaveis/DidVariaveisSecaoIX'
import DidVariaveisSecaoX from './did/variaveis/DidVariaveisSecaoX'
import DidVariaveisSecaoXI from './did/variaveis/DidVariaveisSecaoXI'
import DidVariaveisSecaoXII from './did/variaveis/DidVariaveisSecaoXII'



function Field({ label, children, half }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className="block text-xs font-medium text-ink-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200
        bg-surface text-ink-900
        focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-hidden"
    />
  )
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      rows={3}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200
        bg-surface text-ink-900
        focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-hidden resize-none"
    />
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-700">
      <input type="checkbox" checked={!!checked} onChange={onChange}
        className="w-4 h-4 rounded-sm border-ink-300 text-brand-600 focus:ring-brand-500" />
      {label}
    </label>
  )
}

function SectionCard({ icon: Icon, title, color, children }) {
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

function ModalItensContrato({ contrato, itensDid, onConfirm, onClose }) {
  const itensContrato = contrato?.itens?.filter(it => it.descricao) || []

  const [selecao, setSelecao] = useState(() =>
    itensContrato.map(it => {
      const existente = itensDid.find(d => d.descricao === it.descricao)
      return {
        ...it,
        selecionado: !!existente,
        qtd_did: existente?.quantidade || it.quantidade || '',
        valor_unit_did: existente?.valor_unitario || it.valor_unitario || '',
      }
    })
  )

  const toggle = idx => setSelecao(p => p.map((it, i) => i === idx ? { ...it, selecionado: !it.selecionado } : it))
  const setQtd = (idx, v) => setSelecao(p => p.map((it, i) => i === idx ? { ...it, qtd_did: v } : it))
  const setVunit = (idx, v) => setSelecao(p => p.map((it, i) => i === idx ? { ...it, valor_unit_did: v } : it))

  const totalSelecionado = selecao.filter(it => it.selecionado).reduce((acc, it) => {
    const q = parseFloat(it.qtd_did) || 0
    const u = parseFloat(it.valor_unit_did) || 0
    return acc + q * u
  }, 0)

  const confirmar = () => {
    const novosItens = selecao.filter(it => it.selecionado).map(it => {
      const q = parseFloat(it.qtd_did) || 0
      const u = parseFloat(it.valor_unit_did) || 0
      return {
        _id: Date.now() + Math.random(),
        descricao: it.descricao || '',
        unidade: it.unidade || '',
        quantidade: it.qtd_did,
        valor_unitario: it.valor_unit_did,
        valor_total: q && u ? (q * u).toFixed(2) : '',
      }
    })
    onConfirm(novosItens)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between bg-ink-800 px-4 py-3 rounded-t-xl shrink-0">
          <div>
            <span className="text-sm font-semibold text-white">Selecionar Itens para o DID</span>
            {contrato && <span className="ml-3 text-xs text-ink-400 font-mono">{contrato.numero_contrato} — {contrato.tipo_contrato}</span>}
          </div>
          <button onClick={onClose} className="p-0.5 rounded-sm hover:bg-ink-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {itensContrato.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-ink-400">
            <p className="text-sm font-medium">Nenhum item encontrado no contrato.</p>
            <p className="text-xs mt-1">Adicione itens ao contrato em Contratos antes de criar o DID.</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-info-50 dark:bg-info-900/20 border-b border-info-100 dark:border-info-800 text-xs text-brand-700 dark:text-info-300 shrink-0">
              Marque os itens e informe a quantidade desejada para este DID (função de ordem de compra).
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-ink-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2 text-left font-semibold text-ink-500">Descrição</th>
                    <th className="px-3 py-2 text-center font-semibold text-ink-500 w-20">Unid.</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-32">Vlr. Unit. (R$)</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-28">Qtd. DID</th>
                    <th className="px-3 py-2 text-right font-semibold text-ink-500 w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {selecao.map((it, idx) => {
                    const q = parseFloat(it.qtd_did) || 0
                    const u = parseFloat(it.valor_unit_did) || 0
                    const sub = q * u
                    return (
                      <tr key={idx} onClick={() => toggle(idx)}
                        className={`cursor-pointer transition-colors ${it.selecionado ? 'bg-info-50 dark:bg-info-900/20' : 'hover:bg-ink-50'}`}>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={it.selecionado} onChange={() => toggle(idx)}
                            className="w-4 h-4 accent-info-600 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 text-ink-800 font-medium">{it.descricao || '—'}</td>
                        <td className="px-3 py-2 text-center text-ink-500">{it.unidade || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-ink-600">
                          {it.valor_unit_did
                            ? parseFloat(it.valor_unit_did).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                            : '—'}
                        </td>
                        <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                          <input type="number" min="0" step="any" value={it.qtd_did}
                            onChange={e => { if (!it.selecionado) toggle(idx); setQtd(idx, e.target.value) }}
                            className={`w-full px-2 py-1 text-xs rounded-sm border text-right font-mono outline-hidden
                              ${it.selecionado ? 'border-info-300 dark:border-brand-600 bg-surface focus:ring-1 focus:ring-brand-500' : 'border-ink-200 bg-ink-50 opacity-50'}`}
                            placeholder="0" />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold font-mono">
                          {sub > 0
                            ? <span className="text-brand-700 dark:text-info-400">{sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            : <span className="text-ink-400">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="border-t border-ink-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={confirmar} disabled={!selecao.some(it => it.selecionado)}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-sm text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Check className="w-4 h-4" /> Confirmar Seleção
          </button>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-ink-200 hover:bg-ink-300 text-ink-700 rounded-sm text-sm font-semibold transition-colors">
            Cancelar
          </button>
          {totalSelecionado > 0 && (
            <span className="ml-auto text-xs text-ink-500">
              {selecao.filter(it => it.selecionado).length} item(ns) · Total: <strong className="text-brand-700 dark:text-info-400">{totalSelecionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FormularioDid() {
  const { id: processoId, subdomain } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { tenant, user } = useAuth()
  const { assinar } = useAssinatura()
  // Modo somente leitura: ativado quando o processo está em outro setor/secretaria
  const readOnly = location.state?.readOnly === true

  const [gerandoPDF, setGerandoPDF] = useState(false)

  const [did, setDid]     = useState(null)
  const [form, setForm]   = useState(EMPTY)

  const handleGerarPDF = async () => {
    setGerandoPDF(true)
    try {
      await gerarDidPDF({ form, itensDid, vliq, tenant, tipoDid, processoId })
    } finally {
      setGerandoPDF(false)
    }
  }
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savingDid, setSavingDid] = useState(false)
  const [editando, setEditando] = useState(processoId === 'novo')
  const [msg, setMsg]           = useState(null) // { ok, text }
  const [processo, setProcesso] = useState(null)
  const [tipoDid, setTipoDid]   = useState('fixas')
  const [itensDid, setItensDid] = useState([{ _id: 1, descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])

  const TOTAL_SECOES = { fixas: 7, variaveis: 12 }
  // maxSecaoVisivel: quantas seções são exibidas (desbloqueio progressivo)
  // Novo DID → começa em 1 (Seção I visível, tipo sempre tem default)
  // DID existente → definido em loadDid (todas as seções)
  const [maxSecaoVisivel, setMaxSecaoVisivel] = useState(1)
  const [alterandoTipo, setAlterandoTipo] = useState(false)
  const [confirmarTrocarTipo, setConfirmarTrocarTipo] = useState(false)

  const addItemDid = () => setItensDid(p => [...p, { _id: Date.now(), descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])
  const removeItemDid = idx => setItensDid(p => p.filter((_, i) => i !== idx))
  const setItemDid = (idx, k, v) => {
    setItensDid(p => {
      const arr = [...p]
      arr[idx] = { ...arr[idx], [k]: v }
      if (k === 'quantidade' || k === 'valor_unitario') {
        const q = parseFloat(String(k === 'quantidade' ? v : arr[idx].quantidade).replace(',', '.')) || 0
        const u = parseFloat(String(k === 'valor_unitario' ? v : arr[idx].valor_unitario).replace(',', '.')) || 0
        arr[idx].valor_total = q && u ? (q * u).toFixed(2) : ''
      }
      return arr
    })
  }

  const [proximoNumero, setProximoNumero] = useState(null)

  // ── Contratos (API) ────────────────────────────────────────────────────────────────────────────
  const [secretariasApi, setSecretariasApi] = useState([])
  useEffect(() => {
    api.get('/organizacao/secretarias')
      .then(r => setSecretariasApi(r.data.secretarias || []))
      .catch(() => {})
  }, [])

  const [contratos, setContratos] = useState([])
  const [credoresStorage, setCredoresStorage] = useState([])
  useEffect(() => {
    api.get('/contratos').then(r => setContratos(r.data)).catch(() => {})
    api.get('/contratos/credores').then(r => setCredoresStorage(r.data)).catch(() => {})
  }, [])
  const [contratoSel, setContratoSel] = useState(null)
  const [buscaContrato, setBuscaContrato] = useState('')
  const [dropdownContrato, setDropdownContrato] = useState(false)
  const [modalItens, setModalItens] = useState(false)

  const contratosFiltrados = (() => {
    const q = buscaContrato.trim().toLowerCase()
    const lista = contratos.filter(c => c.status !== 'EXCLUÍDO')
    if (!q) return lista.slice(0, 12)
    return lista.filter(c =>
      (c.numero_contrato || '').toLowerCase().includes(q) ||
      (c.objeto || '').toLowerCase().includes(q)
    ).slice(0, 12)
  })()

  const getResponsavelVigente = (secretariaNomeOuSigla, dataRef) => {
    const secObj = secretariasApi.find(s => s.sigla === secretariaNomeOuSigla || s.nome === secretariaNomeOuSigla)
    if (!secObj) return ''
    const ref = dataRef ? new Date(dataRef + 'T00:00:00') : new Date()
    const vigentes = (secObj.responsaveis || []).filter(r => {
      if (!r.data_inicio) return false
      const ini = new Date(r.data_inicio + 'T00:00:00')
      const fim = r.data_fim ? new Date(r.data_fim + 'T00:00:00') : null
      return ref >= ini && (!fim || ref <= fim)
    })
    return vigentes.length > 0 ? vigentes[0].nome : ''
  }

  const selecionarContrato = (c) => {
    setContratoSel(c)
    setBuscaContrato(c.numero_contrato)
    setDropdownContrato(false)
    const credor = credoresStorage.find(cr => cr.id === c.credor_id)
    const dataRef = form.data_did || new Date().toISOString().slice(0, 10)
    const gestor = getResponsavelVigente(c.secretaria || '', dataRef)
    setForm(f => ({
      ...f,
      contrato_ref: c.numero_contrato || '',
      credor_sec1: credor?.razao_social || '',
      cnpj_cpf_credor_sec1: credor?.cnpj_cpf || '',
      objeto: c.objeto || f.objeto,
      nro_licitacao_sec1: c.numero_licitacao || '',
      tipo_licitacao_sec1: c.modalidade || '',
      valor_did: '',
      secretaria_sec1: c.secretaria || '',
      secretario_nome: gestor,
    }))
    setItensDid([{ _id: 1, descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])
  }

  const limparContrato = () => {
    setContratoSel(null)
    setBuscaContrato('')
    setForm(f => ({ ...f, contrato_ref: '', secretaria_sec1: '', secretario_nome: '' }))
  }

  // Revalidar vigência do secretário quando data_did mudar
  useEffect(() => {
    if (!form.secretaria_sec1 || !form.secretario_nome) return
    const secObj = secretariasApi.find(s => s.sigla === form.secretaria_sec1 || s.nome === form.secretaria_sec1)
    if (!secObj?.responsaveis?.length) return
    const d = form.data_did || new Date().toISOString().slice(0, 10)
    const ref = new Date(d + 'T00:00:00')
    const ainda = (secObj.responsaveis || []).some(r => {
      if (r.nome !== form.secretario_nome) return false
      const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null
      const fim = r.data_fim    ? new Date(r.data_fim    + 'T00:00:00') : null
      return !!ini && ref >= ini && (!fim || ref <= fim)
    })
    if (!ainda) set('secretario_nome', '')
  }, [form.data_did, form.secretaria_sec1])

  useEffect(() => { loadDid() }, [processoId])

  useEffect(() => {
    if (processoId === 'novo') {
      const params = user?.secretariaId ? `?secretariaId=${user.secretariaId}` : ''
      api.get(`/did/proximo-numero${params}`)
        .then(r => setProximoNumero(r.data.formatado || r.data.proximo))
        .catch(() => {})
    }
  }, [user])

  // Calcula quantas seções devem estar visíveis baseado nos dados já salvos no banco.
  // Uma seção N+1 aparece somente quando a seção N tem pelo menos um campo preenchido.
  const calcMaxSecaoVisivel = (f, tipo, itens) => {
    const temItens = itens.some(it => it.valor_total)
    // Seção I: campos obrigatórios principais
    if (!(f.credor_sec1 && f.data_did && f.objeto && temItens)) return 1
    if (tipo === 'fixas') {
      if (!(f.ci_recebido_em || f.ci_responsavel || f.despacho_ci))                           return 2
      if (!(f.financas_recebido_em || f.financas_responsavel))                                 return 3
      if (!(f.contabil_recebido_em || f.contabil_responsavel || f.empenho_numero))             return 4
      if (!(f.financas2_recebido_em || f.financas2_responsavel || f.financas2_enviado_pagamento)) return 5
      if (!(f.tesouraria_recebido_em || f.tesouraria_responsavel || f.pago))                   return 6
      return 7
    } else { // variaveis
      if (!(f.ci_recebido_em || f.ci_responsavel || f.despacho_ci))                                    return 2
      if (!(f.financas_recebido_em || f.financas_responsavel))                                          return 3
      if (!(f.compras2_recebido_em || f.compras2_responsavel || f.compras2_nro_empenho_solicitacao))    return 4
      if (!(f.contabil_recebido_em || f.contabil_responsavel || f.empenho_numero))                      return 5
      if (!(f.compras_recebido_em || f.compras_responsavel))                                            return 6
      if (!(f.receb_responsavel || f.receb_data))                                                       return 7
      if (!(f.compras3_recebido_em || f.compras3_responsavel))                                          return 8
      if (!(f.contabil_pc_recebido_em || f.contabil_pc_responsavel || f.contabil_pc_liquidacao_numero)) return 9
      if (!(f.financas2_recebido_em || f.financas2_responsavel || f.financas2_enviado_pagamento))       return 10
      if (!(f.tesouraria_recebido_em || f.tesouraria_responsavel || f.pago))                            return 11
      return 12
    }
  }

  const loadDid = async () => {
    // Sempre reseta ao mudar de processo (evita maxSecaoVisivel stale entre navegações)
    setDid(null)
    setMaxSecaoVisivel(1)
    if (processoId === 'novo') { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/did/processo/${processoId}`)
      setDid(data.did)
      setProcesso(data.did.processo)
      const tipo = data.did.tipo_did || 'fixas'
      if (data.did.tipo_did) setTipoDid(tipo)
      const itens = data.did.itens_did?.length
        ? data.did.itens_did.map((it, i) => ({ _id: i, ...it }))
        : itensDid
      if (data.did.itens_did?.length) setItensDid(itens)
      setEditando(false)
      // Constrói mergedForm primeiro (síncrono) para usá-lo em calcMaxSecaoVisivel
      const mergedForm = { ...EMPTY }
      Object.keys(EMPTY).forEach(k => {
        mergedForm[k] = data.did[k] !== undefined && data.did[k] !== null ? data.did[k] : EMPTY[k]
      })
      // Se há ordem vinculada e valor_bruto ainda zerado, usa o valor total da ordem
      if (data.did.ordem_valor_total && (!mergedForm.valor_bruto || parseFloat(mergedForm.valor_bruto) === 0)) {
        mergedForm.valor_bruto = parseFloat(data.did.ordem_valor_total).toFixed(2)
      }
      setForm(mergedForm)
      // Determina seções visíveis a partir dos dados reais do banco
      setMaxSecaoVisivel(calcMaxSecaoVisivel(mergedForm, tipo, itens))
    } catch (err) {
      if (err.response?.status === 404) {
        // Processo existe mas DID ainda não foi criado.
        // Pré-preenche numero_did com o valor digitado no NovoProcesso (via location.state).
        if (location.state?.did_numero) {
          setForm(f => ({ ...f, numero_did: String(location.state.did_numero) }))
        }
      } else {
        setMsg({ ok: false, text: 'Erro ao carregar DID' })
      }
    } finally {
      setLoading(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = k => e => set(k, e.target.value)
  const chk = k => e => set(k, e.target.checked)

  const SECAO_I_FIELDS = [
    'numero_did',
    'objeto', 'data_did', 'secretario_nome', 'secretaria_sec1', 'fonte_recurso', 'detalhes_em_anexo',
    'contrato_ref', 'credor_sec1', 'cnpj_cpf_credor_sec1', 'nro_licitacao_sec1', 'tipo_licitacao_sec1', 'valor_did',
    'mes_referencia', 'nf_sec1',
    'cert_sec1_municipal', 'cert_sec1_trabalhista', 'cert_sec1_fgts', 'cert_sec1_estadual', 'cert_sec1_federal', 'cert_sec1_simples_nac',
    'ordem_compra_id', 'ordem_ref',
  ]

  const criarProcessoSeNovo = async () => {
    if (processoId !== 'novo') return processoId
    // Abertura do processo é ato assinado eletronicamente (senha + código do app)
    const resP = await assinar({
      titulo: 'Abrir processo de DID',
      resumo: <p><strong>Objeto:</strong> {form.objeto}</p>,
      executar: (cred) => api.post('/processos', {
        assunto: form.objeto,
        descricao: form.objeto,
        interessado_nome: form.credor_sec1 || 'DID - Instrução de Despesa',
        interessado_cpf_cnpj: (form.cnpj_cpf_credor_sec1 || '').replace(/\D/g, '') || '00000000000000',
        tipo_processo: 'Did',
        prioridade: 'normal',
        ...cred,
      }),
    })
    if (!resP) throw new Error('Assinatura cancelada — o processo não foi aberto.')
    return resP.data?.processo?.id || resP.data?.id
  }

  const handleSaveSecaoI = async () => {
    if (!form.objeto.trim()) { setMsg({ ok: false, text: 'Informe o objeto do DID' }); return false }
    setSaving(true)
    try {
      const targetId = await criarProcessoSeNovo()
      const payload = { tipo_did: tipoDid, itens_did: itensDid }
      SECAO_I_FIELDS.forEach(k => { payload[k] = form[k] })
      const { data } = await api.post(`/did/processo/${targetId}`, payload)
      if (!data?.did) throw new Error('Servidor retornou resposta inválida ao salvar DID')
      setDid(data.did)
      setMsg({ ok: true, text: `Seção I — DID Nº ${data.did.numero_did} salva com sucesso!` })
      if (processoId === 'novo') {
        // primeiroSalvo: sinaliza ao loadDid que deve começar na Seção II
        navigate(`/${subdomain}/processos/${targetId}/did`, { replace: true })
        return true
      }
      // DID já existente: desbloqueia Seção II
      setMaxSecaoVisivel(prev => Math.max(prev, 2))
      setTimeout(() => setMsg(null), 4000)
      return true
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || err.message || 'Erro ao salvar Seção I' })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const targetId = await criarProcessoSeNovo()
      const { data } = await api.post(`/did/processo/${targetId}`, { ...form, tipo_did: tipoDid, itens_did: itensDid })
      if (!data?.did) throw new Error('Servidor retornou resposta inválida ao salvar DID')
      setDid(data.did)
      setMsg({ ok: true, text: `DID Nº ${data.did.numero_did} salvo com sucesso!` })
      if (processoId === 'novo') {
        navigate(`/${subdomain}/processos/${targetId}/did`, { replace: true })
        return true
      }
      setTimeout(() => setMsg(null), 4000)
      return true
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || err.message || 'Erro ao salvar Processo' })
      return false
    } finally {
      setSaving(false)
    }
  }

  // Fábrica de handlers para seções II em diante:
  // salva o DID e desbloqueia a próxima seção em caso de sucesso.
  const makeOnSave = (secaoNum) => async () => {
    const ok = await handleSave()
    if (ok !== false) setMaxSecaoVisivel(prev => Math.max(prev, secaoNum + 1))
    return ok
  }

  // Fábrica de "Limpar Seção" — zera os campos da seção e persiste no banco.
  const makeLimparSecao = (campos) => async () => {
    const patch = {}
    campos.forEach(c => { patch[c] = EMPTY[c] !== undefined ? EMPTY[c] : '' })
    setForm(prev => ({ ...prev, ...patch }))
    if (did?.id) {
      try { await api.post(`/did/processo/${processoId}`, patch) } catch { /* silently ignore */ }
    }
  }

  const handleSaveDid = async () => {
    setSavingDid(true)
    try {
      const targetId = await criarProcessoSeNovo()
      const { data } = await api.post(`/did/processo/${targetId}`, { ...form, tipo_did: tipoDid, itens_did: itensDid })
      if (!data?.did) throw new Error('Servidor retornou resposta inválida ao salvar DID')
      setDid(data.did)
      setEditando(false)
      setMsg({ ok: true, text: `DID Nº ${data.did.numero_did} salvo com sucesso!` })
      if (processoId === 'novo') {
        navigate(`/${subdomain}/processos/${targetId}/did`, { replace: true })
        return true
      }
      setTimeout(() => setMsg(null), 4000)
      return true
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || err.message || 'Erro ao salvar Processo' })
      return false
    } finally {
      setSavingDid(false)
    }
  }

  const secretariaNome = processo?.setorAtual?.secretaria?.nome || ''
  const secretariaSigla = processo?.setorAtual?.secretaria?.sigla || ''

  // Secretaria selecionada via contrato — para buscar responsáveis
  const secDidObj = secretariasApi.find(s =>
    s.sigla === form.secretaria_sec1 || s.nome === form.secretaria_sec1
  ) || null
  const dataRefDid = form.data_did || new Date().toISOString().slice(0, 10)
  const refDateDid = new Date(dataRefDid + 'T00:00:00')
  const siglaDidSec = secDidObj?.sigla || secretariaSigla || ''
  const numBase = form.numero_did || did?.numero_did || proximoNumero
  // Números novos já vêm formatados por secretaria (ex: "SEJUV-001") — exibe direto.
  // Números antigos são só o sequencial global — mantém o formato legado com a sigla ao lado.
  const numeroJaFormatado = /^[A-Za-z]+-\d+$/.test(String(numBase || ''))
  const numeroDIDFmt = !numBase
    ? 'Carregando...'
    : numeroJaFormatado
      ? `DID ${numBase}`
      : `DID ${String(numBase).padStart(3, '0')}${siglaDidSec ? ` - ${siglaDidSec}` : ''}`
  const responsaveisDid = (secDidObj?.responsaveis || []).map(r => {
    const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null
    const fim = r.data_fim    ? new Date(r.data_fim    + 'T00:00:00') : null
    return { ...r, vigente: !!ini && refDateDid >= ini && (!fim || refDateDid <= fim) }
  })

  const totalItensDid = itensDid.reduce((acc, it) => acc + (parseFloat(it.valor_total) || 0), 0)
  const temItensPreenchidos = itensDid.some(it => it.valor_total)

  // Lock de tipo: bloqueado quando DID já salvo (exceto em modo alteração)
  const tipoBloqueado = did !== null && !alterandoTipo
  // Detecta preenchimento parcial (antes de salvar)
  const hasAnyData = !!(form.objeto?.trim() || form.contrato_ref || form.credor_sec1?.trim() || temItensPreenchidos)
  const secaoILimpa = !hasAnyData

  const handleAlterarTipo = () => {
    if (!secaoILimpa) {
      setMsg({ ok: false, text: 'Limpe a Seção I antes de alterar o tipo de DID.' })
      return
    }
    setAlterandoTipo(true)
  }

  const handleTrocarTipo = async (novoTipo) => {
    if (novoTipo === tipoDid) { setAlterandoTipo(false); return }
    setTipoDid(novoTipo)
    setMaxSecaoVisivel(1)
    setAlterandoTipo(false)
    if (did?.id) {
      try {
        await api.post(`/did/processo/${processoId}`, { tipo_did: novoTipo })
        setMsg({ ok: true, text: `Tipo alterado para ${novoTipo === 'fixas' ? 'Contas Fixas' : 'Contas Variáveis'}.` })
        setTimeout(() => setMsg(null), 3000)
      } catch {
        setMsg({ ok: false, text: 'Erro ao salvar tipo de DID.' })
      }
    }
  }

  const handleLimparParaTrocar = () => {
    const novoTipo = tipoDid === 'fixas' ? 'variaveis' : 'fixas'
    setForm(EMPTY)
    setItensDid([{ _id: 1, descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])
    setTipoDid(novoTipo)
    setMaxSecaoVisivel(1)
    setConfirmarTrocarTipo(false)
  }

  // Sincroniza valor_bruto: prefere total da ordem vinculada, senão usa itens DID
  useEffect(() => {
    if (did?.ordem_valor_total && parseFloat(did.ordem_valor_total) > 0) {
      set('valor_bruto', parseFloat(did.ordem_valor_total).toFixed(2))
    } else if (totalItensDid > 0) {
      set('valor_bruto', totalItensDid.toFixed(2))
    }
  }, [totalItensDid, did?.ordem_valor_total])

  const vliq = (parseFloat(form.valor_bruto) || 0)
    - ['desconto_inss','desconto_iss','desconto_irrf','desconto_sindicato',
       'desconto_bb','desconto_caixa','desconto_pensao','desconto_outros']
      .reduce((acc, k) => acc + (parseFloat(form[k]) || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
    </div>
  )

  return (
    <DidReadOnlyContext.Provider value={readOnly}>
    <div className="space-y-4 animate-fade-in">

      {/* Banner somente leitura */}
      {readOnly && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <Eye className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Modo somente leitura — o processo está em outro setor. Você pode visualizar e gerar PDF, mas não pode editar.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="page-title">📋 {numeroDIDFmt}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FileCheck className="h-4 w-4 text-info-500" />
            <span className="text-sm font-semibold text-info-500">
              {processoId === 'novo' ? 'Novo DID' : (processo?.numero || `Processo ${processoId}`)}
              {secretariaNome ? ` · ${secretariaNome}` : ''}
            </span>
          </div>
        </div>
        {/* Botões replicados no topo */}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={handleGerarPDF} disabled={gerandoPDF || !did}
            title={!did ? 'Salve o DID antes de gerar o PDF' : 'Gerar PDF do DID'}
            className="flex items-center gap-2 px-3 py-1.5 bg-ink-700 hover:bg-ink-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {gerandoPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
          </button>
          {!readOnly && (
            <>
          <button
            type="button"
            onClick={() => setEditando(true)}
            disabled={editando}
            className="flex items-center gap-2 px-3 py-1.5 bg-warning-600 hover:bg-warning-700 dark:bg-warning-700 dark:hover:bg-warning-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            ✏️ Alterar
          </button>
          <button onClick={handleSaveDid} disabled={savingDid || !editando} className="btn-primary flex items-center gap-2 py-1.5 text-sm">
            {savingDid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingDid ? '⏳ Salvando...' : '✅ Salvar'}
          </button>
            </>
          )}
        </div>
      </div>

      {/* Mensagem feedback */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
          ${msg.ok ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                   : 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400'}`}>
          {msg.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* Tipo DID */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-ink-700">Tipo de DID</p>
          <div className="flex items-center gap-2">
            {did !== null && !alterandoTipo && (
              <>
                <span className="text-xs text-ink-500 bg-ink-100 px-2.5 py-1 rounded-full">
                  🔒 Bloqueado — DID salvo
                </span>
                {!readOnly && (
                  <button type="button" onClick={handleAlterarTipo}
                    className="text-xs text-brand-600 dark:text-info-400 hover:text-brand-700 dark:hover:text-info-300
                      flex items-center gap-1 px-2.5 py-1 rounded-lg border border-info-200 dark:border-info-700
                      hover:bg-info-50 dark:hover:bg-info-900/20 transition-colors">
                    ↺ Alterar Tipo
                  </button>
                )}
              </>
            )}
            {did !== null && alterandoTipo && (
              <button type="button" onClick={() => setAlterandoTipo(false)}
                className="text-xs text-ink-600 hover:text-ink-700
                  flex items-center gap-1 px-2.5 py-1 rounded-lg border border-ink-200
                  hover:bg-ink-50 transition-colors">
                ✕ Cancelar
              </button>
            )}
            {!tipoBloqueado && hasAnyData && (
              <button
                type="button"
                onClick={() => setConfirmarTrocarTipo(true)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300
                  flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700
                  hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                ↺ Limpar e trocar tipo
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Contas Fixas */}
          <label className={`flex items-center gap-2 ${
            tipoBloqueado || (hasAnyData && tipoDid !== 'fixas')
              ? 'opacity-50 cursor-not-allowed select-none'
              : 'cursor-pointer'
          }`}>
            <input
              type="radio" name="tipo_did" value="fixas"
              checked={tipoDid === 'fixas'}
              onChange={() => alterandoTipo ? handleTrocarTipo('fixas') : setTipoDid('fixas')}
              disabled={tipoBloqueado || (hasAnyData && tipoDid !== 'fixas')}
              className="w-4 h-4 accent-info-600"
            />
            <div>
              <span className="text-sm font-medium text-ink-800">DID Contas Fixas</span>
              <p className="text-xs text-ink-400">Valor fixo mensal · vinculado a contrato</p>
            </div>
          </label>

          {/* Contas Variáveis */}
          <label className={`flex items-center gap-2 ${
            tipoBloqueado || (hasAnyData && tipoDid !== 'variaveis')
              ? 'opacity-50 cursor-not-allowed select-none'
              : 'cursor-pointer'
          }`}>
            <input
              type="radio" name="tipo_did" value="variaveis"
              checked={tipoDid === 'variaveis'}
              onChange={() => alterandoTipo ? handleTrocarTipo('variaveis') : setTipoDid('variaveis')}
              disabled={tipoBloqueado || (hasAnyData && tipoDid !== 'variaveis')}
              className="w-4 h-4 accent-info-600"
            />
            <div>
              <span className="text-sm font-medium text-ink-800">DID Contas Variáveis</span>
              <p className="text-xs text-ink-400">Quantidade × Vlr. Unit. · inclui atestado de recebimento</p>
            </div>
          </label>
        </div>

        {alterandoTipo && (
          <p className="text-xs text-brand-600 dark:text-info-400 mt-2">
            Selecione o novo tipo de DID acima. A alteração será salva imediatamente.
          </p>
        )}
        {!tipoBloqueado && hasAnyData && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ⚠ Preenchimento em curso. Para trocar o tipo use &ldquo;Limpar e trocar tipo&rdquo; acima.
          </p>
        )}
      </div>

      {tipoDid === 'fixas' ? (
        <>
          <DidFixasSecaoI
            form={form} set={set} inp={inp}
            itensDid={itensDid} setItensDid={setItensDid} removeItemDid={removeItemDid}
            numeroDIDFmt={numeroDIDFmt}
            secretariasApi={secretariasApi}
            secDidObj={secDidObj}
            responsaveisDid={responsaveisDid}
            dataRefDid={dataRefDid}
            secretariaNome={secretariaNome}
            didId={did?.id}
            processoId={processoId}
            onSaveSecaoI={handleSaveSecaoI}
            saving={saving}
          />
          {maxSecaoVisivel >= 2 && <DidFixasSecaoII form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(2)} onLimpar={makeLimparSecao(['ci_recebido_em','ci_responsavel','despacho_ci','dotacao_numero','fonte_recurso_numero'])} />}
          {maxSecaoVisivel >= 3 && <DidFixasSecaoIII form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(3)} onLimpar={makeLimparSecao(['financas_recebido_em','financas_responsavel'])} />}
          {maxSecaoVisivel >= 4 && <DidFixasSecaoIV form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(4)} onLimpar={makeLimparSecao(['contabil_recebido_em','contabil_responsavel','contabil_auditor','empenho_numero','tipo_empenho','data_empenho','liquidacao_numero','data_liquidacao','doc_caixa'])} />}
          {maxSecaoVisivel >= 5 && <DidFixasSecaoV form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(5)} onLimpar={makeLimparSecao(['financas2_recebido_em','financas2_responsavel','financas2_enviado_pagamento'])} />}
          {maxSecaoVisivel >= 6 && <DidFixasSecaoVI form={form} inp={inp} chk={chk} vliq={vliq} saving={saving} didId={did?.id} onSave={makeOnSave(6)} onLimpar={makeLimparSecao(['tesouraria_recebido_em','tesouraria_responsavel','conta_pagamento_id','banco_pagador','ag_pagador','cc_pagador','cert_teso_municipal','cert_teso_trabalhista','cert_teso_fgts','cert_teso_estadual','cert_teso_federal','cert_teso_simples_nac','desconto_inss','desconto_iss','desconto_irrf','desconto_outros','pago','data_pagamento','doc_caixa'])} />}
          {maxSecaoVisivel >= 7 && <DidFixasSecaoVII form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(7)} onLimpar={makeLimparSecao(['contab_fech_finalizado','contab_fech_tce'])} />}
        </>
      ) : (
        <>
          <DidVariaveisSecaoI
            form={form} set={set} inp={inp}
            itensDid={itensDid} setItensDid={setItensDid} removeItemDid={removeItemDid}
            addItemDid={addItemDid} setItemDid={setItemDid}
            numeroDIDFmt={numeroDIDFmt}
            secretariasApi={secretariasApi}
            secDidObj={secDidObj}
            responsaveisDid={responsaveisDid}
            dataRefDid={dataRefDid}
            secretariaNome={secretariaNome}
            didId={did?.id}
            processoId={processoId}
            onSaveSecaoI={handleSaveSecaoI}
            saving={saving}
          />
          {maxSecaoVisivel >= 2  && <DidVariaveisSecaoII form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(2)} onLimpar={makeLimparSecao(['ci_recebido_em','ci_responsavel','despacho_ci','dotacao_numero','fonte_recurso_numero'])} />}
          {maxSecaoVisivel >= 3  && <DidVariaveisSecaoIII form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(3)} onLimpar={makeLimparSecao(['financas_recebido_em','financas_responsavel'])} />}
          {maxSecaoVisivel >= 4  && <DidVariaveisSecaoIV form={form} inp={inp} set={set} saving={saving} didId={did?.id} onSave={makeOnSave(4)} onLimpar={makeLimparSecao(['compras2_recebido_em','compras2_responsavel','compras2_nro_empenho_solicitacao'])} />}
          {maxSecaoVisivel >= 5  && <DidVariaveisSecaoV form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(5)} onLimpar={makeLimparSecao(['contabil_recebido_em','contabil_responsavel','contabil_auditor','empenho_numero','tipo_empenho','data_empenho'])} />}
          {maxSecaoVisivel >= 6  && <DidVariaveisSecaoVI form={form} inp={inp} set={set} saving={saving} didId={did?.id} onSave={makeOnSave(6)} onLimpar={makeLimparSecao(['compras_recebido_em','compras_responsavel','nro_empenho_solicitacao','local_entrega'])} />}
          {maxSecaoVisivel >= 7  && <DidVariaveisSecaoVII form={form} inp={inp} chk={chk} saving={saving} didId={did?.id} onSave={makeOnSave(7)} onLimpar={makeLimparSecao(['receb_data','receb_nf_data','receb_responsavel','receb_cargo','receb_nf_conferida','receb_qtd_conferida','receb_esp_conforme','receb_nf_enviado_compras','receb_obs'])} />}
          {maxSecaoVisivel >= 8  && <DidVariaveisSecaoVIII form={form} inp={inp} set={set} saving={saving} didId={did?.id} onSave={makeOnSave(8)} onLimpar={makeLimparSecao(['compras3_recebido_em','compras3_responsavel','compras3_local_entrega'])} />}
          {maxSecaoVisivel >= 9  && <DidVariaveisSecaoIX form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(9)} onLimpar={makeLimparSecao(['contabil_pc_recebido_em','contabil_pc_responsavel','contabil_pc_auditor','contabil_pc_liquidacao_numero','contabil_pc_data_liquidacao'])} />}
          {maxSecaoVisivel >= 10 && <DidVariaveisSecaoX form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(10)} onLimpar={makeLimparSecao(['financas2_recebido_em','financas2_responsavel','financas2_enviado_pagamento'])} />}
          {maxSecaoVisivel >= 11 && <DidVariaveisSecaoXI form={form} inp={inp} chk={chk} vliq={vliq} saving={saving} didId={did?.id} onSave={makeOnSave(11)} onLimpar={makeLimparSecao(['tesouraria_recebido_em','tesouraria_responsavel','conta_pagamento_id','banco_pagador','ag_pagador','cc_pagador','cert_teso_cnd','cert_teso_fgts','cert_teso_estadual','cert_teso_trabalhista','cert_teso_municipal','desconto_inss','desconto_iss','desconto_irrf','desconto_outros','pago','data_pagamento','doc_caixa'])} />}
          {maxSecaoVisivel >= 12 && <DidVariaveisSecaoXII form={form} inp={inp} saving={saving} didId={did?.id} onSave={makeOnSave(12)} onLimpar={makeLimparSecao(['contab_fech_finalizado','contab_fech_tce'])} />}
        </>
      )}

      {/* Indicador de próxima etapa — aparece enquanto houver seções bloqueadas */}
      {maxSecaoVisivel < (TOTAL_SECOES[tipoDid] ?? 7) && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed border-ink-200 text-center justify-center">
          <span className="text-2xl">🔒</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-ink-600">
              Seção {['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][maxSecaoVisivel]} — próxima etapa
            </p>
            <p className="text-xs text-ink-400">
              Salve a Seção {['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][maxSecaoVisivel - 1]} para liberar
            </p>
          </div>
        </div>
      )}

      {/* Salvar bottom */}
      <div className="flex justify-end gap-3 pb-6">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
          ← Voltar
        </button>
        <button type="button" onClick={handleGerarPDF} disabled={gerandoPDF || !did}
          title={!did ? 'Salve o DID antes de gerar o PDF' : 'Gerar PDF do DID'}
          className="flex items-center gap-2 px-4 py-2 bg-ink-700 hover:bg-ink-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          {gerandoPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
        </button>
        {!readOnly && (
          <>
        <button
          type="button"
          onClick={() => setEditando(true)}
          disabled={editando}
          className="flex items-center gap-2 px-4 py-2 bg-warning-600 hover:bg-warning-700 dark:bg-warning-700 dark:hover:bg-warning-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          ✏️ Alterar
        </button>
        <button onClick={handleSaveDid} disabled={savingDid || !editando} className="btn-primary flex items-center gap-2">
          {savingDid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {savingDid ? '⏳ Salvando...' : '✅ Salvar Processo'}
        </button>
          </>
        )}
      </div>
    </div>
    {confirmarTrocarTipo && (
      <ConfirmModal
        title={`Trocar para "DID Contas ${tipoDid === 'fixas' ? 'Variáveis' : 'Fixas'}"?`}
        message="Todos os dados preenchidos serão apagados."
        confirmLabel="Trocar"
        onConfirm={handleLimparParaTrocar}
        onClose={() => setConfirmarTrocarTipo(false)}
      />
    )}
    </DidReadOnlyContext.Provider>
  )
}
