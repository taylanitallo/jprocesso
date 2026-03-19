import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../services/api'
import { ArrowLeft, Save, FileText, ChevronRight, ClipboardList, FileCheck, Calendar, Send, Loader2, X } from 'lucide-react'
import { JAIButton } from '../components/JAI'

const TIPOS_PROCESSO = [
  { value: 'Despacho',   label: 'Despacho',   descricao: 'Ato administrativo de encaminhamento ou deliberações',          icon: Send,         cor: 'text-purple-500', bg: 'group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20', borda: 'hover:border-purple-400 dark:hover:border-purple-500' },
  { value: 'Did',        label: 'DID',         descricao: 'Documento de Intenção de Despesas',                             icon: FileCheck,    cor: 'text-blue-500',   bg: 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20',   borda: 'hover:border-blue-400 dark:hover:border-blue-500' },
  { value: 'Pauta',      label: 'Pauta',       descricao: 'Solicitação de processo para contratação de bens ou serviços',  icon: Calendar,     cor: 'text-green-500',  bg: 'group-hover:bg-green-50 dark:group-hover:bg-green-900/20', borda: 'hover:border-green-400 dark:hover:border-green-500' },
  { value: 'Requisição', label: 'Requisição',  descricao: 'Solicitação de retirada de material do Almoxarifado',           icon: ClipboardList, cor: 'text-orange-500', bg: 'group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20', borda: 'hover:border-orange-400 dark:hover:border-orange-500' },
]

const MODALIDADES = ['Pregão Eletrônico','Pregão Presencial','Concorrência','Tomada de Preços','Convite','Dispensa','Inexigibilidade','RDC','Concurso','Leilão']
const FONTE_OPTS  = ['PRÓPRIO','FEDERAL','ESTADUAL','CONVÊNIO','OUTROS']
const MESES       = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
const hoje        = () => new Date().toISOString().split('T')[0]
const mesAnoAtual = () => `${MESES[new Date().getMonth()]}/${new Date().getFullYear()}`

const DID_INIT = {
  objeto: '', periodo_referencia: mesAnoAtual(),
  empresa_fornecedor: '', cnpj_empresa: '', modalidade_licitacao: '',
  numero_contrato: '', numero_licitacao: '', fonte_recurso_tipo: 'PRÓPRIO', data_did: hoje(),
  contrato_id: null,
  secretario: '', despacho_ci: '', observacoes: '', detalhes_em_anexo: false,
}

export default function NovoProcesso() {
  const { subdomain } = useParams()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tipoSelecionado, setTipoSelecionado] = useState(null)
  const [didSubtipo, setDidSubtipo] = useState(null)  // 'fixas' | 'variadas'
  const navigate = useNavigate()

  // Estado específico do DID
  const [didForm, setDidForm] = useState(DID_INIT)
  const setD = (k, v) => setDidForm(p => ({ ...p, [k]: v }))

  // Seleção de contrato para DID
  const [semContrato, setSemContrato] = useState(false)
  const [contratoSearch, setContratoSearch] = useState('')
  const [contratoDropdownOpen, setContratoDropdownOpen] = useState(false)
  const [contratosLista] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contratos_lista') || '[]') } catch { return [] }
  })
  const [credoresLista] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contratos_credores') || '[]') } catch { return [] }
  })
  const contratosFiltrados = !didForm.contrato_id
    ? contratosLista.filter(c => {
        const q = contratoSearch.trim().toLowerCase()
        if (!q) return true
        return (c.numero_contrato || '').toLowerCase().includes(q) ||
               (c.objeto || '').toLowerCase().includes(q)
      })
    : []
  const selecionarContrato = (c) => {
    const credor = credoresLista.find(cr => cr.id === c.credor_id) || {}
    setDidForm(p => ({
      ...p,
      contrato_id:          c.id,
      empresa_fornecedor:   credor.razao_social || '',
      cnpj_empresa:         credor.cnpj_cpf || '',
      modalidade_licitacao: c.modalidade || '',
      numero_contrato:      c.numero_contrato || '',
      numero_licitacao:     c.numero_licitacao || '',
    }))
    setContratoSearch(`${c.numero_contrato}${c.objeto ? ' — ' + c.objeto : ''}`)
    setContratoDropdownOpen(false)
  }
  const limparContrato = () => {
    setContratoSearch('')
    setDidForm(p => ({ ...p, contrato_id: null, empresa_fornecedor: '', cnpj_empresa: '', modalidade_licitacao: '', numero_contrato: '', numero_licitacao: '' }))
  }

  const onSubmit = async (data) => {
    if (tipoSelecionado === 'Did') {
      if (!didForm.objeto.trim())             { setError('Informe o objeto do DID'); return }
      if (!didForm.periodo_referencia.trim()) { setError('Informe o período de referência'); return }
      // Preenche campos do processo automaticamente com dados do DID
      data.assunto              = didForm.objeto
      data.descricao            = didForm.objeto
      data.interessado_nome     = didForm.empresa_fornecedor || 'DID'
      data.interessado_cpf_cnpj = didForm.cnpj_empresa || ''
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/processos', { ...data, tipo_processo: tipoSelecionado })
      const processoId = res.data?.processo?.id || res.data?.id
      if (tipoSelecionado === 'Did' && processoId) {
        try { await api.post(`/did/processo/${processoId}`, { ...didForm, tipo_did: didSubtipo }) }
        catch (e) { console.warn('DID create failed:', e?.response?.data?.error) }
        navigate(`/${subdomain}/processos/${processoId}/did`)
      } else {
        navigate(`/${subdomain}/processos`)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao criar processo')
    } finally {
      setLoading(false)
    }
  }

  if (!tipoSelecionado) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="page-title">📋 Novo Processo</h1>
            <p className="page-subtitle">Selecione o tipo de processo para continuar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIPOS_PROCESSO.map((tipo) => {
            const Icon = tipo.icon
            return (
              <button
                key={tipo.value}
                onClick={() => { setTipoSelecionado(tipo.value); if (tipo.value === 'Did') setDidSubtipo(null) }}
                className={`group card p-6 text-left border-2 border-transparent ${tipo.borda} transition-all cursor-pointer`}
              >
                <div className={`inline-flex p-3 rounded-xl mb-4 bg-gray-100 dark:bg-gray-700 ${tipo.bg} transition-colors`}>
                  <Icon className={`h-8 w-8 ${tipo.cor}`} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{tipo.label}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{tipo.descricao}</p>
                <div className={`flex items-center text-sm font-semibold ${tipo.cor} mt-auto`}>
                  Selecionar <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Seleção de subtipo DID ─────────────────────────────────────────────
  if (tipoSelecionado === 'Did' && !didSubtipo) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setTipoSelecionado(null)} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="page-title">📋 Novo Processo — DID</h1>
            <p className="page-subtitle">Selecione o tipo de DID para continuar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
          <button
            onClick={() => setDidSubtipo('fixas')}
            className="group card p-6 text-left border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer"
          >
            <div className="inline-flex p-3 rounded-xl mb-4 bg-blue-100 dark:bg-blue-900/40">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">DID Contas Fixas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Despesas recorrentes com valor mensal fixo.<br />
              Cálculo: <span className="font-semibold">Valor Mensal × N° de Meses</span>
            </p>
            <div className="flex items-center text-sm font-semibold text-blue-600 mt-auto">
              Selecionar <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <div className="group card p-6 text-left border-2 border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed select-none">
            <div className="inline-flex p-3 rounded-xl mb-4 bg-indigo-100 dark:bg-indigo-900/40">
              <ClipboardList className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">DID Contas Variadas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Despesas com quantidades variáveis.<br />
              Cálculo: <span className="font-semibold">Quantidade × Valor Unitário</span>
            </p>
            <div className="flex items-center text-sm font-semibold text-gray-400 mt-auto">
              Em breve...
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tipoInfo = TIPOS_PROCESSO.find(t => t.value === tipoSelecionado)
  const TipoIcon = tipoInfo?.icon || FileText

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => setTipoSelecionado(null)} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="page-title">📋 Novo Processo</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TipoIcon className={`h-4 w-4 ${tipoInfo?.cor}`} />
            <span className={`text-sm font-semibold ${tipoInfo?.cor}`}>{tipoSelecionado}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Dados do Processo ─ apenas para tipos que não sejam DID ─── */}
        {tipoSelecionado !== 'Did' && (
          <div className="card p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📝 Assunto *</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input {...register('assunto', { required: 'Assunto é obrigatório' })} type="text" className="input-field" />
                    {errors.assunto && <p className="text-red-500 text-xs mt-1">{errors.assunto.message}</p>}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📝 Descrição *</label>
                <textarea {...register('descricao', { required: 'Descrição é obrigatória' })} rows={4} className="input-field resize-none" />
                {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">👤 Nome do Interessado *</label>
                <input {...register('interessado_nome', { required: 'Nome é obrigatório' })} type="text" className="input-field" />
                {errors.interessado_nome && <p className="text-red-500 text-xs mt-1">{errors.interessado_nome.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">🪪 CPF/CNPJ *</label>
                <input {...register('interessado_cpf_cnpj', { required: 'CPF/CNPJ é obrigatório' })} type="text" maxLength={14} className="input-field" />
                {errors.interessado_cpf_cnpj && <p className="text-red-500 text-xs mt-1">{errors.interessado_cpf_cnpj.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📧 E-mail</label>
                <input {...register('interessado_email')} type="email" className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📱 Telefone</label>
                <input {...register('interessado_telefone')} type="tel" maxLength={11} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">🎯 Prioridade</label>
                <select {...register('prioridade')} className="input-field">
                  <option value="normal">📄 Normal</option>
                  <option value="baixa">🔽 Baixa</option>
                  <option value="alta">🔼 Alta</option>
                  <option value="urgente">🚨 Urgente</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── DID — Seção I ────────────────────────────────────────────── */}
        {tipoSelecionado === 'Did' && (
          <div className="card p-6 space-y-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">DID — Seção I · Dados Gerais</h2>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                {didSubtipo === 'fixas' ? '📋 Contas Fixas' : '📊 Contas Variadas'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ── Seleção de Contrato ── */}
              <div className="md:col-span-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-blue-800 dark:text-blue-200">📄 Contrato Vinculado</label>
                    {didForm.contrato_id && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-0.5 rounded-full border border-green-200 dark:border-green-700 font-medium">
                        ✔ Contrato selecionado
                      </span>
                    )}
                  </div>
                  {!semContrato && (
                    <div className="relative">
                      <input
                        value={contratoSearch}
                        onChange={e => { setContratoSearch(e.target.value); setContratoDropdownOpen(true) }}
                        onFocus={() => setContratoDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setContratoDropdownOpen(false), 200)}
                        readOnly={!!didForm.contrato_id}
                        placeholder={contratosLista.length === 0 ? 'Nenhum contrato cadastrado no sistema' : 'Buscar pelo n° ou objeto do contrato...'}
                        className={`input-field pr-9 ${didForm.contrato_id ? 'bg-gray-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-medium cursor-default' : ''}`}
                      />
                      {didForm.contrato_id && (
                        <button type="button" onClick={limparContrato} title="Remover contrato selecionado"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {contratoDropdownOpen && !didForm.contrato_id && (
                        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                          {contratosFiltrados.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {contratoSearch.trim() ? 'Nenhum contrato encontrado.' : 'Nenhum contrato cadastrado.'}
                            </p>
                          ) : (
                            contratosFiltrados.map(c => (
                              <button key={c.id} type="button" onMouseDown={() => selecionarContrato(c)}
                                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors">
                                <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm">{c.numero_contrato}</span>
                                {c.objeto && <span className="ml-3 text-gray-600 dark:text-gray-400 text-sm truncate">{c.objeto}</span>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                    <input type="checkbox" checked={semContrato}
                      onChange={e => { setSemContrato(e.target.checked); if (e.target.checked) limparContrato() }}
                      className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Não tem contrato cadastrado — preencher campos manualmente</span>
                  </label>
                </div>
              </div>

              {/* Objeto */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📌 Objeto *</label>
                <div className="flex gap-2 items-center">
                  <input value={didForm.objeto} onChange={e => setD('objeto', e.target.value.toUpperCase())}
                    type="text" placeholder="Descrição do objeto desta despesa..." className="input-field uppercase flex-1" />
                  <JAIButton campo="objeto" valorAtual={didForm.objeto} onSugestao={s => setD('objeto', s.toUpperCase())} label="Ayla" />
                </div>
              </div>

              {/* Período / Data / Fonte */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📅 Período de Referência *</label>
                <input value={didForm.periodo_referencia} onChange={e => setD('periodo_referencia', e.target.value.toUpperCase())}
                  type="text" placeholder="Ex: ABRIL/2026" className="input-field uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📅 Data do DID</label>
                <input value={didForm.data_did} onChange={e => setD('data_did', e.target.value)} type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">💰 Fonte de Recurso</label>
                <select value={didForm.fonte_recurso_tipo} onChange={e => setD('fonte_recurso_tipo', e.target.value)} className="input-field">
                  {FONTE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Empresa / CNPJ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">🏢 Empresa / Fornecedor</label>
                <input value={didForm.empresa_fornecedor}
                  onChange={e => setD('empresa_fornecedor', e.target.value)}
                  readOnly={!semContrato && !!didForm.contrato_id}
                  type="text" placeholder="Razão social..." className={`input-field ${!semContrato && didForm.contrato_id ? 'bg-gray-50 dark:bg-gray-700 cursor-default' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">🪪 CNPJ / CPF da Empresa</label>
                <input value={didForm.cnpj_empresa}
                  onChange={e => setD('cnpj_empresa', e.target.value)}
                  readOnly={!semContrato && !!didForm.contrato_id}
                  type="text" placeholder="00.000.000/0000-00" className={`input-field ${!semContrato && didForm.contrato_id ? 'bg-gray-50 dark:bg-gray-700 cursor-default' : ''}`} />
              </div>

              {/* Modalidade / N° Licitação / N° Contrato */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">⚖️ Modalidade de Licitação</label>
                  {!semContrato && !!didForm.contrato_id ? (
                    <input value={didForm.modalidade_licitacao} readOnly
                      className="input-field bg-gray-50 dark:bg-gray-700 cursor-default" />
                  ) : (
                    <select value={didForm.modalidade_licitacao} onChange={e => setD('modalidade_licitacao', e.target.value)} className="input-field">
                      <option value="">Selecione...</option>
                      {MODALIDADES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">🔢 N° da Licitação</label>
                  <input value={didForm.numero_licitacao}
                    onChange={e => setD('numero_licitacao', e.target.value.toUpperCase())}
                    readOnly={!semContrato && !!didForm.contrato_id}
                    type="text" placeholder="Número do processo licitatório..." className={`input-field ${!semContrato && didForm.contrato_id ? 'bg-gray-50 dark:bg-gray-700 cursor-default' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📄 N° do Contrato / ARP</label>
                  <input value={didForm.numero_contrato}
                    onChange={e => setD('numero_contrato', e.target.value)}
                    readOnly={!semContrato && !!didForm.contrato_id}
                    type="text" placeholder="Número do contrato..." className={`input-field ${!semContrato && didForm.contrato_id ? 'bg-gray-50 dark:bg-gray-700 cursor-default' : ''}`} />
                </div>
              </div>

              {/* Secretário / Despacho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">👔 Secretário(a)</label>
                <input value={didForm.secretario} onChange={e => setD('secretario', e.target.value)}
                  type="text" placeholder="Nome do(a) secretário(a)..." className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📋 Despacho / CI</label>
                <input value={didForm.despacho_ci} onChange={e => setD('despacho_ci', e.target.value)}
                  type="text" placeholder="Referência do despacho..." className="input-field" />
              </div>

              {/* Observações */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">💬 Observações</label>
                <textarea value={didForm.observacoes} onChange={e => setD('observacoes', e.target.value)}
                  rows={2} placeholder="Observações adicionais..." className="input-field resize-none" />
                <div className="mt-1.5">
                  <JAIButton campo="observacoes" valorAtual={didForm.observacoes} onSugestao={s => setD('observacoes', s)} label="Ayla — Sugerir observação" />
                </div>
              </div>

              {/* Detalhes em Anexo */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer w-fit">
                  <input type="checkbox" checked={didForm.detalhes_em_anexo}
                    onChange={e => setD('detalhes_em_anexo', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Detalhes em Anexo</span>
                </label>
              </div>
            </div>

          </div>
        )}

        {/* ── Ações ───────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setTipoSelecionado(null)} className="btn-secondary">
            ← Voltar
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? 'Salvando...' : tipoSelecionado === 'Did' ? '✅ Criar Processo e DID' : '✅ Criar Processo'}
          </button>
        </div>
      </form>
    </div>
  )
}

