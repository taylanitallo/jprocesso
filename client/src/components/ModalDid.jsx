import { useState, useEffect } from 'react'
import {
  X, Plus, Save, Lock, Unlock, CheckCircle, AlertCircle,
  ChevronDown, ChevronRight, FileText, DollarSign, Loader2,
  Shield, Edit3, Check
} from 'lucide-react'
import api from '../services/api'

const STATUS_LABELS = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  fechado: 'Fechado',
  aprovado: 'Aprovado',
  cancelado: 'Cancelado'
}

const STATUS_COLORS = {
  rascunho: 'bg-gray-100 text-gray-700 border-gray-300',
  aberto: 'bg-blue-100 text-blue-700 border-blue-300',
  fechado: 'bg-orange-100 text-orange-700 border-orange-300',
  aprovado: 'bg-green-100 text-green-700 border-green-300',
  cancelado: 'bg-red-100 text-red-700 border-red-300'
}

const ENTRADA_STATUS_COLORS = {
  pendente: 'text-gray-400',
  preenchido: 'text-blue-600',
  aprovado: 'text-green-600'
}

const MESES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
]

function formatMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

export default function ModalDid({ processo, onClose }) {
  const userStr = localStorage.getItem('user')
  const currentUser = userStr ? JSON.parse(userStr) : null
  const isAdminOuGestor = ['admin', 'gestor'].includes(currentUser?.tipo)

  const [did, setDid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Estado para criação de novo DID
  const [criandoDid, setCriandoDid] = useState(false)
  const [formCriar, setFormCriar] = useState({
    objeto: '',
    periodo_referencia: `${MESES[new Date().getMonth()]}/${new Date().getFullYear()}`,
    observacoes: '',
    secretarias_participantes: []
  })
  const [secretariasDisponiveis, setSecretariasDisponiveis] = useState([])

  // Estado para edição de entradas
  const [entradaEditando, setEntradaEditando] = useState(null)
  const [formEntrada, setFormEntrada] = useState({})

  // Estado para adicionar secretaria
  const [adicionandoSecretaria, setAdicionandoSecretaria] = useState(false)
  const [novaSecretariaId, setNovaSecretariaId] = useState('')

  // ──────────────────────────────────────────────────────────
  // Carregar DID existente ou preparar criação
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    carregarDid()
    carregarSecretarias()
  }, [processo?.id])

  const carregarDid = async () => {
    setLoading(true)
    setErro('')
    try {
      const { data } = await api.get(`/did/processo/${processo.id}`)
      setDid(data)
      setCriandoDid(false)
    } catch (err) {
      if (err.response?.status === 404) {
        setCriandoDid(true)
      } else {
        setErro('Erro ao carregar DID')
      }
    } finally {
      setLoading(false)
    }
  }

  const carregarSecretarias = async () => {
    try {
      const { data } = await api.get('/organizacao/secretarias')
      setSecretariasDisponiveis(data.secretarias || [])
    } catch { /* silencioso */ }
  }

  // ──────────────────────────────────────────────────────────
  // Criar novo DID
  // ──────────────────────────────────────────────────────────
  const handleCriarDid = async (e) => {
    e.preventDefault()
    if (!formCriar.objeto.trim()) {
      setErro('Informe o objeto do DID')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const { data } = await api.post(`/did/processo/${processo.id}`, formCriar)
      setDid(data)
      setCriandoDid(false)
      setSucesso('DID criado com sucesso!')
      setTimeout(() => setSucesso(''), 4000)
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao criar DID')
    } finally {
      setSalvando(false)
    }
  }

  // ──────────────────────────────────────────────────────────
  // Iniciar edição de entrada
  // ──────────────────────────────────────────────────────────
  const iniciarEdicaoEntrada = (entrada) => {
    // Verificar permissão antes de abrir edição
    const minhaSecretariaId = currentUser?.secretariaId
    const possoEditar = isAdminOuGestor || minhaSecretariaId === entrada.secretaria_id

    if (!possoEditar) {
      setErro(`Você só pode editar a entrada da sua própria secretaria. Esta entrada pertence à ${entrada.secretaria?.nome}.`)
      setTimeout(() => setErro(''), 5000)
      return
    }

    if (['fechado', 'aprovado', 'cancelado'].includes(did?.did?.status)) {
      setErro('O DID está fechado/aprovado. Não é possível editar.')
      setTimeout(() => setErro(''), 4000)
      return
    }

    setEntradaEditando(entrada.id)
    setFormEntrada({
      descricao: entrada.descricao || '',
      quantidade: entrada.quantidade || '',
      unidade: entrada.unidade || 'UN',
      valor_unitario: entrada.valor_unitario || '',
      dotacao_orcamentaria: entrada.dotacao_orcamentaria || '',
      observacoes: entrada.observacoes || ''
    })
  }

  const cancelarEdicao = () => {
    setEntradaEditando(null)
    setFormEntrada({})
  }

  // ──────────────────────────────────────────────────────────
  // Salvar entrada
  // ──────────────────────────────────────────────────────────
  const handleSalvarEntrada = async (entradaId) => {
    setSalvando(true)
    setErro('')
    try {
      await api.put(`/did/${did.did.id}/entrada/${entradaId}`, formEntrada)
      setSucesso('Entrada salva com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
      setEntradaEditando(null)
      await carregarDid()
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar entrada')
    } finally {
      setSalvando(false)
    }
  }

  // ──────────────────────────────────────────────────────────
  // Adicionar secretaria ao DID
  // ──────────────────────────────────────────────────────────
  const handleAdicionarSecretaria = async () => {
    if (!novaSecretariaId) return
    setSalvando(true)
    setErro('')
    try {
      await api.post(`/did/${did.did.id}/entrada`, { secretaria_id: novaSecretariaId })
      setSucesso('Secretaria adicionada!')
      setTimeout(() => setSucesso(''), 3000)
      setAdicionandoSecretaria(false)
      setNovaSecretariaId('')
      await carregarDid()
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao adicionar secretaria')
    } finally {
      setSalvando(false)
    }
  }

  // ──────────────────────────────────────────────────────────
  // Alterar status do DID
  // ──────────────────────────────────────────────────────────
  const handleAlterarStatus = async (novoStatus) => {
    setSalvando(true)
    setErro('')
    try {
      await api.patch(`/did/${did.did.id}/status`, { status: novoStatus })
      setSucesso(`DID ${STATUS_LABELS[novoStatus].toLowerCase()} com sucesso!`)
      setTimeout(() => setSucesso(''), 4000)
      await carregarDid()
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao alterar status')
    } finally {
      setSalvando(false)
    }
  }

  // ──────────────────────────────────────────────────────────
  // Toggle secretaria na criação
  // ──────────────────────────────────────────────────────────
  const toggleSecretaria = (secId) => {
    setFormCriar(prev => {
      const lista = prev.secretarias_participantes
      return {
        ...prev,
        secretarias_participantes: lista.includes(secId)
          ? lista.filter(id => id !== secId)
          : [...lista, secId]
      }
    })
  }

  // ──────────────────────────────────────────────────────────
  // Calcular valor total ao digitar quantidade/valor_unitario
  // ──────────────────────────────────────────────────────────
  const valorTotalCalculado = parseFloat(
    ((parseFloat(formEntrada.quantidade) || 0) * (parseFloat(formEntrada.valor_unitario) || 0)).toFixed(2)
  )

  // Verificar se a entrada é da minha secretaria
  const minhaSecretariaId = currentUser?.secretariaId
  const podeCriarDid = isAdminOuGestor || true // qualquer usuário pode propor DID do seu processo
  const didStatus = did?.did?.status

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-5xl my-6 shadow-2xl">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                📄 DID — Documento de Intenção de Despesas
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Processo: {processo.numero}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Alertas */}
          {erro && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}
          {sucesso && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando DID...</span>
            </div>
          )}

          {/* ── FORMULÁRIO DE CRIAÇÃO ── */}
          {!loading && criandoDid && (
            <div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Este processo ainda não possui um DID. Preencha abaixo para criar.</span>
                </p>
              </div>

              <form onSubmit={handleCriarDid} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Objeto * <span className="text-xs font-normal text-gray-500">(ex: LOCAÇÃO DE IMPRESSORA)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formCriar.objeto}
                      onChange={e => setFormCriar(p => ({ ...p, objeto: e.target.value.toUpperCase() }))}
                      className="input-field uppercase"
                      placeholder="DESCREVA O OBJETO DA DESPESA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Período de Referência *
                    </label>
                    <input
                      type="text"
                      required
                      value={formCriar.periodo_referencia}
                      onChange={e => setFormCriar(p => ({ ...p, periodo_referencia: e.target.value.toUpperCase() }))}
                      placeholder="ABRIL/2026"
                      className="input-field uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Observações
                    </label>
                    <input
                      type="text"
                      value={formCriar.observacoes}
                      onChange={e => setFormCriar(p => ({ ...p, observacoes: e.target.value }))}
                      className="input-field"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                {/* Seleção de secretarias participantes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Secretarias Participantes
                    <span className="ml-2 text-xs font-normal text-gray-500">(selecione as que preencherão sua intenção)</span>
                  </label>
                  {secretariasDisponiveis.length === 0 ? (
                    <p className="text-sm text-gray-500">Carregando secretarias...</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {secretariasDisponiveis.map(sec => {
                        const selecionada = formCriar.secretarias_participantes.includes(sec.id)
                        return (
                          <label key={sec.id} className={`flex items-center space-x-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${selecionada ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                            <input
                              type="checkbox"
                              checked={selecionada}
                              onChange={() => toggleSecretaria(sec.id)}
                              className="rounded"
                            />
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{sec.sigla}</span>
                            <span className="text-xs text-gray-500 truncate">{sec.nome}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                  <button type="button" onClick={onClose} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvando} className="btn-primary flex items-center space-x-2">
                    {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span>Criar DID</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── DID EXISTENTE ── */}
          {!loading && !criandoDid && did?.did && (
            <div className="space-y-6">

              {/* Info do DID */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        {did.did.numero_did}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${STATUS_COLORS[did.did.status]}`}>
                        {STATUS_LABELS[did.did.status]}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{did.did.objeto}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Período: <strong>{did.did.periodo_referencia}</strong></p>
                    {did.did.secretariaOrigem && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Origem: <strong>{did.did.secretariaOrigem.sigla} — {did.did.secretariaOrigem.nome}</strong></p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Geral</p>
                    <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                      {formatMoeda(did.totalGeral)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(did.did.entradas || []).filter(e => e.status === 'preenchido' || e.status === 'aprovado').length}/{(did.did.entradas || []).length} secretarias preenchidas
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso de permissão */}
              {!isAdminOuGestor && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Regra de preenchimento:</strong> Cada secretaria preenche apenas sua própria linha. Você só pode editar a entrada da sua secretaria.
                  </p>
                </div>
              )}

              {/* Tabela de entradas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-indigo-600" />
                    <span>Intenções por Secretaria</span>
                  </h3>
                  {isAdminOuGestor && didStatus === 'aberto' && !adicionandoSecretaria && (
                    <button
                      onClick={() => setAdicionandoSecretaria(true)}
                      className="text-sm flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Adicionar Secretaria</span>
                    </button>
                  )}
                </div>

                {/* Adicionar secretaria (admin) */}
                {adicionandoSecretaria && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center space-x-3">
                    <select
                      value={novaSecretariaId}
                      onChange={e => setNovaSecretariaId(e.target.value)}
                      className="input-field flex-1"
                    >
                      <option value="">Selecione a secretaria...</option>
                      {secretariasDisponiveis
                        .filter(s => !(did.did.entradas || []).find(e => e.secretaria_id === s.id))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.sigla} — {s.nome}</option>
                        ))}
                    </select>
                    <button onClick={handleAdicionarSecretaria} disabled={!novaSecretariaId || salvando} className="btn-primary text-sm">
                      Adicionar
                    </button>
                    <button onClick={() => { setAdicionandoSecretaria(false); setNovaSecretariaId('') }} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Tabela de entradas */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-32">Secretaria</th>
                        <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Descrição</th>
                        <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300 w-20">Qtd</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 w-16">Un</th>
                        <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300 w-28">Vlr. Unit.</th>
                        <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300 w-28">Total</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 w-20">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(did.did.entradas || []).map((entrada) => {
                        const editando = entradaEditando === entrada.id
                        const eMinhaSecretaria = minhaSecretariaId === entrada.secretaria_id
                        const possoEditar = (isAdminOuGestor || eMinhaSecretaria) && didStatus === 'aberto'
                        const StatusIcon = entrada.status === 'preenchido' ? Check : entrada.status === 'aprovado' ? CheckCircle : null

                        return (
                          <tr
                            key={entrada.id}
                            className={`border-b dark:border-gray-700 transition-colors ${
                              eMinhaSecretaria && !isAdminOuGestor
                                ? 'bg-blue-50/40 dark:bg-blue-900/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                            }`}
                          >
                            {/* ── Linha em modo visualização ── */}
                            {!editando && (
                              <>
                                <td className="p-3">
                                  <div className="font-bold text-gray-900 dark:text-white text-xs">
                                    {entrada.secretaria?.sigla}
                                  </div>
                                  <div className={`text-xs mt-0.5 flex items-center space-x-1 ${ENTRADA_STATUS_COLORS[entrada.status]}`}>
                                    {StatusIcon && <StatusIcon className="h-3 w-3" />}
                                    <span className="capitalize">{entrada.status}</span>
                                  </div>
                                  {eMinhaSecretaria && !isAdminOuGestor && (
                                    <span className="text-xs text-blue-600 font-semibold mt-0.5 block">← Sua entrada</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {entrada.descricao ? (
                                    <span className="text-gray-800 dark:text-gray-200">{entrada.descricao}</span>
                                  ) : (
                                    <span className="text-gray-400 italic text-xs">Não preenchido</span>
                                  )}
                                  {entrada.dotacao_orcamentaria && (
                                    <div className="text-xs text-gray-400 mt-0.5">Dotação: {entrada.dotacao_orcamentaria}</div>
                                  )}
                                </td>
                                <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                                  {entrada.quantidade > 0 ? parseFloat(entrada.quantidade).toLocaleString('pt-BR') : '—'}
                                </td>
                                <td className="p-3 text-center text-gray-600 dark:text-gray-400 text-xs">
                                  {entrada.unidade || '—'}
                                </td>
                                <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                                  {entrada.valor_unitario > 0 ? formatMoeda(entrada.valor_unitario) : '—'}
                                </td>
                                <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">
                                  {entrada.valor_total > 0 ? formatMoeda(entrada.valor_total) : '—'}
                                </td>
                                <td className="p-3 text-center">
                                  {possoEditar ? (
                                    <button
                                      onClick={() => iniciarEdicaoEntrada(entrada)}
                                      className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 transition-colors"
                                      title="Editar minha entrada"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <Lock className="h-4 w-4 text-gray-300 mx-auto" title="Sem permissão para editar" />
                                  )}
                                </td>
                              </>
                            )}

                            {/* ── Linha em modo edição ── */}
                            {editando && (
                              <td colSpan={7} className="p-3 bg-indigo-50 dark:bg-indigo-900/20">
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Edit3 className="h-4 w-4 text-indigo-600" />
                                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 text-sm">
                                      Editando — {entrada.secretaria?.sigla}: {entrada.secretaria?.nome}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="md:col-span-2">
                                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Descrição</label>
                                      <input
                                        type="text"
                                        value={formEntrada.descricao}
                                        onChange={e => setFormEntrada(p => ({ ...p, descricao: e.target.value }))}
                                        className="input-field text-sm"
                                        placeholder="Detalhe a necessidade"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Quantidade</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formEntrada.quantidade}
                                        onChange={e => setFormEntrada(p => ({ ...p, quantidade: e.target.value }))}
                                        className="input-field text-sm"
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Unidade</label>
                                      <select
                                        value={formEntrada.unidade}
                                        onChange={e => setFormEntrada(p => ({ ...p, unidade: e.target.value }))}
                                        className="input-field text-sm"
                                      >
                                        {['UN', 'KG', 'L', 'M', 'CX', 'PC', 'RS', 'HR', 'MÊS', 'DIÁRIA'].map(u => (
                                          <option key={u} value={u}>{u}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Valor Unitário (R$)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formEntrada.valor_unitario}
                                        onChange={e => setFormEntrada(p => ({ ...p, valor_unitario: e.target.value }))}
                                        className="input-field text-sm"
                                        placeholder="0,00"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Total Calculado</label>
                                      <div className="input-field text-sm bg-gray-100 dark:bg-gray-600 font-bold text-indigo-700 dark:text-indigo-300">
                                        {formatMoeda(valorTotalCalculado)}
                                      </div>
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Dotação Orçamentária</label>
                                      <input
                                        type="text"
                                        value={formEntrada.dotacao_orcamentaria}
                                        onChange={e => setFormEntrada(p => ({ ...p, dotacao_orcamentaria: e.target.value }))}
                                        className="input-field text-sm"
                                        placeholder="Código da dotação"
                                      />
                                    </div>
                                    <div className="md:col-span-4">
                                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Observações</label>
                                      <input
                                        type="text"
                                        value={formEntrada.observacoes}
                                        onChange={e => setFormEntrada(p => ({ ...p, observacoes: e.target.value }))}
                                        className="input-field text-sm"
                                        placeholder="Opcional"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex space-x-2 pt-1">
                                    <button
                                      onClick={() => handleSalvarEntrada(entrada.id)}
                                      disabled={salvando}
                                      className="btn-primary text-sm flex items-center space-x-1"
                                    >
                                      {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                      <span>Salvar</span>
                                    </button>
                                    <button onClick={cancelarEdicao} className="btn-secondary text-sm">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}

                      {/* Total geral */}
                      {(did.did.entradas || []).length > 0 && (
                        <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-bold border-t-2 border-indigo-200 dark:border-indigo-700">
                          <td colSpan={5} className="p-3 text-right text-gray-700 dark:text-gray-300">
                            TOTAL GERAL
                          </td>
                          <td className="p-3 text-right text-indigo-700 dark:text-indigo-300 text-base">
                            {formatMoeda(did.totalGeral)}
                          </td>
                          <td />
                        </tr>
                      )}

                      {(did.did.entradas || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                            Nenhuma secretaria participante. {isAdminOuGestor ? 'Adicione secretarias acima.' : ''}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ações de status (admin/gestor) */}
              {isAdminOuGestor && (
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Alterar status:</span>
                  {didStatus === 'aberto' && (
                    <button
                      onClick={() => handleAlterarStatus('fechado')}
                      disabled={salvando}
                      className="flex items-center space-x-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium shadow-sm transition-all"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Fechar DID</span>
                    </button>
                  )}
                  {didStatus === 'fechado' && (
                    <>
                      <button
                        onClick={() => handleAlterarStatus('aberto')}
                        disabled={salvando}
                        className="flex items-center space-x-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium shadow-sm transition-all"
                      >
                        <Unlock className="h-4 w-4" />
                        <span>Reabrir</span>
                      </button>
                      <button
                        onClick={() => handleAlterarStatus('aprovado')}
                        disabled={salvando}
                        className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-all"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Aprovar DID</span>
                      </button>
                    </>
                  )}
                  {(didStatus === 'aprovado' || didStatus === 'rascunho') && (
                    <span className="text-sm text-gray-500 italic">
                      {didStatus === 'aprovado' ? 'DID aprovado. Nenhuma alteração permitida.' : 'Em rascunho.'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
