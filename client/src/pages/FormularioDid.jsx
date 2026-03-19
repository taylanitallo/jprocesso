import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, FileCheck, FileDown } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { EMPTY } from './did/didShared'
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
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
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
      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
        focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600
        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
        focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
    />
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
      <input type="checkbox" checked={!!checked} onChange={onChange}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-3 rounded-t-xl shrink-0">
          <div>
            <span className="text-sm font-semibold text-white">Selecionar Itens para o DID</span>
            {contrato && <span className="ml-3 text-xs text-gray-400 font-mono">{contrato.numero_contrato} — {contrato.tipo_contrato}</span>}
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-700 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {itensContrato.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-gray-400">
            <p className="text-sm font-medium">Nenhum item encontrado no contrato.</p>
            <p className="text-xs mt-1">Adicione itens ao contrato em Contratos antes de criar o DID.</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 shrink-0">
              Marque os itens e informe a quantidade desejada para este DID (função de ordem de compra).
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Descrição</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500 dark:text-gray-400 w-20">Unid.</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-32">Vlr. Unit. (R$)</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-28">Qtd. DID</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {selecao.map((it, idx) => {
                    const q = parseFloat(it.qtd_did) || 0
                    const u = parseFloat(it.valor_unit_did) || 0
                    const sub = q * u
                    return (
                      <tr key={idx} onClick={() => toggle(idx)}
                        className={`cursor-pointer transition-colors ${it.selecionado ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={it.selecionado} onChange={() => toggle(idx)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">{it.descricao || '—'}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{it.unidade || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-300">
                          {it.valor_unit_did
                            ? parseFloat(it.valor_unit_did).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                            : '—'}
                        </td>
                        <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                          <input type="number" min="0" step="any" value={it.qtd_did}
                            onChange={e => { if (!it.selecionado) toggle(idx); setQtd(idx, e.target.value) }}
                            className={`w-full px-2 py-1 text-xs rounded border text-right font-mono outline-none
                              ${it.selecionado ? 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50'}`}
                            placeholder="0" />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold font-mono">
                          {sub > 0
                            ? <span className="text-blue-700 dark:text-blue-400">{sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={confirmar} disabled={!selecao.some(it => it.selecionado)}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Check className="w-4 h-4" /> Confirmar Seleção
          </button>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-semibold transition-colors">
            Cancelar
          </button>
          {totalSelecionado > 0 && (
            <span className="ml-auto text-xs text-gray-500">
              {selecao.filter(it => it.selecionado).length} item(ns) · Total: <strong className="text-blue-700 dark:text-blue-400">{totalSelecionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
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
  const { tenant } = useAuth()

  const [gerandoPDF, setGerandoPDF] = useState(false)

  const [did, setDid]     = useState(null)
  const [form, setForm]   = useState(EMPTY)

  const handleGerarPDF = async () => {
    setGerandoPDF(true)
    try {
      await gerarDidPDF({ form, itensDid, vliq, tenant, tipoDid })
    } finally {
      setGerandoPDF(false)
    }
  }
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [editando, setEditando] = useState(processoId === 'novo')
  const [msg, setMsg]           = useState(null) // { ok, text }
  const [processo, setProcesso] = useState(null)
  const [tipoDid, setTipoDid]   = useState('fixas')
  const [itensDid, setItensDid] = useState([{ _id: 1, descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])

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
      api.get('/did/proximo-numero')
        .then(r => setProximoNumero(r.data.proximo))
        .catch(() => {})
    }
  }, [])

  const loadDid = async () => {
    if (processoId === 'novo') { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/did/processo/${processoId}`)
      setDid(data.did)
      setProcesso(data.did.processo)
      if (data.did.tipo_did) setTipoDid(data.did.tipo_did)
      if (data.did.itens_did?.length) setItensDid(data.did.itens_did.map((it, i) => ({ _id: i, ...it })))
      setEditando(false)
      setForm(prev => {
        const merged = { ...EMPTY }
        Object.keys(EMPTY).forEach(k => {
          merged[k] = data.did[k] !== undefined && data.did[k] !== null ? data.did[k] : EMPTY[k]
        })
        return merged
      })
    } catch (err) {
      if (err.response?.status !== 404) setMsg({ ok: false, text: 'Erro ao carregar DID' })
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
    'cert_sec1_municipal', 'cert_sec1_trabalhista', 'cert_sec1_fgts', 'cert_sec1_estadual', 'cert_sec1_federal',
  ]

  const criarProcessoSeNovo = async () => {
    if (processoId !== 'novo') return processoId
    const resP = await api.post('/processos', {
      assunto: form.objeto,
      descricao: form.objeto,
      interessado_nome: form.credor_sec1 || 'DID - Instrução de Despesa',
      interessado_cpf_cnpj: (form.cnpj_cpf_credor_sec1 || '').replace(/\D/g, '') || '00000000000000',
      tipo_processo: 'Did',
      prioridade: 'normal'
    })
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
      setDid(data.did)
      setEditando(false)
      setMsg({ ok: true, text: `Seção I — DID Nº ${data.did.numero_did} salva com sucesso!` })
      if (processoId === 'novo') {
        navigate(`/${subdomain}/processos/${targetId}/did`, { replace: true })
        return true
      }
      setTimeout(() => setMsg(null), 4000)
      return true
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Erro ao salvar Seção I' })
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
      setMsg({ ok: false, text: err.response?.data?.error || 'Erro ao salvar Processo' })
      return false
    } finally {
      setSaving(false)
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
  const numeroDIDFmt = numBase
    ? `DID ${String(numBase).padStart(3, '0')}${siglaDidSec ? ` - ${siglaDidSec}` : ''}`
    : 'Carregando...'
  const responsaveisDid = (secDidObj?.responsaveis || []).map(r => {
    const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null
    const fim = r.data_fim    ? new Date(r.data_fim    + 'T00:00:00') : null
    return { ...r, vigente: !!ini && refDateDid >= ini && (!fim || refDateDid <= fim) }
  })

  const totalItensDid = itensDid.reduce((acc, it) => acc + (parseFloat(it.valor_total) || 0), 0)
  const temItensPreenchidos = itensDid.some(it => it.valor_total)

  // Lock de tipo: bloqueado quando DID já salvo no banco
  const tipoBloqueado = did !== null
  // Detecta preenchimento parcial (antes de salvar)
  const hasAnyData = !!(form.objeto?.trim() || form.contrato_ref || form.credor_sec1?.trim() || temItensPreenchidos)

  const handleLimparParaTrocar = () => {
    const novoTipo = tipoDid === 'fixas' ? 'variaveis' : 'fixas'
    if (!window.confirm(
      `Trocar para "DID Contas ${novoTipo === 'fixas' ? 'Fixas' : 'Variáveis'}"?\n\nTodos os dados preenchidos serão apagados.`
    )) return
    setForm(EMPTY)
    setItensDid([{ _id: 1, descricao: '', quantidade: '', valor_unitario: '', valor_total: '' }])
    setTipoDid(novoTipo)
  }

  // Sincroniza valor_bruto com o total dos itens da Seção I
  useEffect(() => {
    if (totalItensDid > 0) {
      set('valor_bruto', totalItensDid.toFixed(2))
    }
  }, [totalItensDid])

  const vliq = (parseFloat(form.valor_bruto) || 0)
    - ['desconto_inss','desconto_iss','desconto_irrf','desconto_sindicato',
       'desconto_bb','desconto_caixa','desconto_pensao','desconto_outros']
      .reduce((acc, k) => acc + (parseFloat(form[k]) || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="page-title">📋 {numeroDIDFmt}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FileCheck className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-blue-500">
              {processoId === 'novo' ? 'Novo DID' : (processo?.numero || `Processo ${processoId}`)}
              {secretariaNome ? ` · ${secretariaNome}` : ''}
            </span>
          </div>
        </div>
        {/* Botões replicados no topo */}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={handleGerarPDF} disabled={gerandoPDF || !did}
            title={!did ? 'Salve o DID antes de gerar o PDF' : 'Gerar PDF do DID'}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {gerandoPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
          </button>
          <button
            type="button"
            onClick={() => setEditando(true)}
            disabled={editando}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            ✏️ Alterar
          </button>
          <button onClick={handleSave} disabled={saving || !editando} className="btn-primary flex items-center gap-2 py-1.5 text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? '⏳ Salvando...' : '✅ Salvar'}
          </button>
        </div>
      </div>

      {/* Mensagem feedback */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
          ${msg.ok ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                   : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
          {msg.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* Tipo DID */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de DID</p>
          {tipoBloqueado && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
              🔒 Bloqueado — DID salvo
            </span>
          )}
          {!tipoBloqueado && hasAnyData && (
            <button
              type="button"
              onClick={handleLimparParaTrocar}
              className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300
                flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700
                hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              ↺ Limpar e trocar tipo
            </button>
          )}
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
              onChange={() => setTipoDid('fixas')}
              disabled={tipoBloqueado || (hasAnyData && tipoDid !== 'fixas')}
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">DID Contas Fixas</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">Valor fixo mensal · vinculado a contrato</p>
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
              onChange={() => setTipoDid('variaveis')}
              disabled={tipoBloqueado || (hasAnyData && tipoDid !== 'variaveis')}
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">DID Contas Variáveis</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">Quantidade × Vlr. Unit. · inclui atestado de recebimento</p>
            </div>
          </label>
        </div>

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
            onSaveSecaoI={handleSaveSecaoI}
            saving={saving}
            editando={editando}
          />
          <DidFixasSecaoII form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidFixasSecaoIII form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidFixasSecaoIV form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidFixasSecaoV form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidFixasSecaoVI form={form} inp={inp} chk={chk} vliq={vliq} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidFixasSecaoVII form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
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
            onSaveSecaoI={handleSaveSecaoI}
            saving={saving}
            editando={editando}
          />
          <DidVariaveisSecaoII form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoIII form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoIV form={form} inp={inp} set={set} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoV form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoVI form={form} inp={inp} set={set} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoVII
            form={form} inp={inp} chk={chk}
            saving={saving}
            didId={did?.id}
            onSave={handleSave}
            editando={editando}
          />
          <DidVariaveisSecaoVIII form={form} inp={inp} set={set} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoIX form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoX form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoXI form={form} inp={inp} chk={chk} vliq={vliq} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
          <DidVariaveisSecaoXII form={form} inp={inp} saving={saving} didId={did?.id} onSave={handleSave} editando={editando} />
        </>
      )}

      {/* Salvar bottom */}
      <div className="flex justify-end gap-3 pb-6">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
          ← Voltar
        </button>
        <button type="button" onClick={handleGerarPDF} disabled={gerandoPDF || !did}
          title={!did ? 'Salve o DID antes de gerar o PDF' : 'Gerar PDF do DID'}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          {gerandoPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
        </button>
        <button
          type="button"
          onClick={() => setEditando(true)}
          disabled={editando}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          ✏️ Alterar
        </button>
        <button onClick={handleSave} disabled={saving || !editando} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? '⏳ Salvando...' : '✅ Salvar Processo'}
        </button>
      </div>
    </div>
  )
}
