import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Save, FileText, ChevronRight, FilePlus2,
  FileCheck, Calendar, Send, AlertTriangle, Stamp, User, Building2, Route,
} from 'lucide-react'
import { PageHeader, SectionTitle, ActionBar } from '../components/ui'
import { ORIGENS_PROTOCOLO, NATUREZAS_PROTOCOLO } from '../utils/protocoloConstants'

const TIPOS_PROCESSO = [
  { value: 'Despacho',   label: 'Despacho',   descricao: 'Ato administrativo de encaminhamento ou deliberações',         icon: Send,          cor: 'text-purple-500 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/40', borda: 'hover:border-purple-400 dark:hover:border-purple-500' },
  { value: 'Did',        label: 'DID',         descricao: 'Documento de Intenção de Despesas',                            icon: FileCheck,     cor: 'text-blue-500 dark:text-blue-400',   iconBg: 'bg-blue-100 dark:bg-blue-900/40',   borda: 'hover:border-blue-400 dark:hover:border-blue-500'   },
  { value: 'Pauta',      label: 'Pauta',       descricao: 'Solicitação de processo para contratação de bens ou serviços', icon: Calendar,      cor: 'text-green-500 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/40', borda: 'hover:border-green-400 dark:hover:border-green-500' },
  { value: 'Protocolo',  label: 'Protocolo',   descricao: 'Registro e autuação de documento ou requerimento recebido',   icon: Stamp,         cor: 'text-amber-500 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40', borda: 'hover:border-amber-400 dark:hover:border-amber-500' },
]

export default function NovoProcesso() {
  const { subdomain } = useParams()
  const { user } = useAuth()
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { protocolo_origem: 'externo', protocolo_natureza: 'atendimento' }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tipoSelecionado, setTipoSelecionado] = useState(null)
  const [carregandoNumeroDid, setCarregandoNumeroDid] = useState(false)
  const [secretarias, setSecretarias] = useState([])
  const [setores, setSetores] = useState([])
  const [usuariosDestino, setUsuariosDestino] = useState([])
  const navigate = useNavigate()

  const origemProtocolo   = watch('protocolo_origem')
  const destSecretariaId  = watch('destinoSecretariaId')
  const destSetorId       = watch('destinoSetorId')

  // Pré-preenche o próximo número sequencial de DID (por secretaria) ao escolher esse tipo
  useEffect(() => {
    if (tipoSelecionado !== 'Did') return
    setCarregandoNumeroDid(true)
    const params = user?.secretariaId ? `?secretariaId=${user.secretariaId}` : ''
    api.get(`/did/proximo-numero${params}`)
      .then(({ data }) => setValue('did_numero', data.formatado || String(data.proximo)))
      .catch(() => {})
      .finally(() => setCarregandoNumeroDid(false))
  }, [tipoSelecionado, setValue, user])

  // Protocolo: carrega a árvore Secretaria → Setor → Responsável do encaminhamento
  useEffect(() => {
    if (tipoSelecionado !== 'Protocolo') return
    api.get('/organizacao/secretarias')
      .then(({ data }) => setSecretarias((data.secretarias || []).sort((a, b) => a.nome.localeCompare(b.nome))))
      .catch(() => {})
  }, [tipoSelecionado])

  useEffect(() => {
    setValue('destinoSetorId', '')
    setValue('destinoUsuarioId', '')
    setUsuariosDestino([])
    if (!destSecretariaId) { setSetores([]); return }
    api.get(`/organizacao/secretarias/${destSecretariaId}/setores`)
      .then(({ data }) => setSetores((data.setores || []).sort((a, b) => a.nome.localeCompare(b.nome))))
      .catch(() => setSetores([]))
  }, [destSecretariaId, setValue])

  useEffect(() => {
    setValue('destinoUsuarioId', '')
    if (!destSetorId) { setUsuariosDestino([]); return }
    api.get(`/organizacao/setores/${destSetorId}/usuarios`)
      .then(({ data }) => setUsuariosDestino((data.usuarios || []).sort((a, b) => a.nome.localeCompare(b.nome))))
      .catch(() => setUsuariosDestino([]))
  }, [destSetorId, setValue])

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')
    try {
      const payload = { ...data, tipo_processo: tipoSelecionado }

      if (tipoSelecionado === 'Protocolo') {
        payload.protocolo_doc = {
          origem:                data.protocolo_origem,
          natureza:              data.protocolo_natureza,
          orgao_externo:         data.protocolo_orgao_externo,
          documento_apresentado: data.protocolo_documento,
          prazo_dias:            data.protocolo_prazo_dias,
        }
        payload.destinoSetorId        = data.destinoSetorId || null
        payload.destinoUsuarioId      = data.destinoUsuarioId || null
        payload.despachoEncaminhamento = data.despachoEncaminhamento || ''
      }

      const res = await api.post('/processos', payload)
      const processoId = res.data?.processo?.id || res.data?.id
      if (processoId) {
        if (tipoSelecionado === 'Did') {
          // Vai direto ao formulário DID, passando o número digitado para pré-preencher
          navigate(`/${subdomain}/processos/${processoId}/did`, {
            state: { did_numero: data.did_numero }
          })
        } else {
          navigate(`/${subdomain}/processos/${processoId}`)
        }
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
        <PageHeader
          icon={FilePlus2}
          title="Novo Processo"
          subtitle="Selecione o tipo de processo para continuar"
          actions={
            <button onClick={() => navigate(-1)} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPOS_PROCESSO.map((tipo) => {
            const Icon = tipo.icon
            return (
              <button
                key={tipo.value}
                onClick={() => setTipoSelecionado(tipo.value)}
                className={`group card p-6 text-left border-2 border-transparent ${tipo.borda} transition-all cursor-pointer`}
              >
                <div className={`inline-flex p-3 rounded-xl mb-4 ${tipo.iconBg} transition-colors`}>
                  <Icon className={`h-8 w-8 ${tipo.cor}`} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-1">{tipo.label}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 leading-relaxed">{tipo.descricao}</p>
                <div className={`flex items-center text-sm font-semibold ${tipo.cor}`}>
                  Selecionar <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const tipoInfo = TIPOS_PROCESSO.find(t => t.value === tipoSelecionado)
  const TipoIcon = tipoInfo?.icon || FileText

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        icon={FilePlus2}
        title="Novo Processo"
        subtitle={tipoSelecionado}
        actions={
          <button onClick={() => setTipoSelecionado(null)} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <SectionTitle icon={TipoIcon} title={`Detalhes do ${tipoSelecionado}`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Assunto *</label>
            <input {...register('assunto', { required: 'Assunto é obrigatório' })} type="text" className="input" placeholder={
              tipoSelecionado === 'Did'       ? 'Ex: Locação de impressoras – Abril/2025'
            : tipoSelecionado === 'Protocolo' ? 'Ex: Requerimento de certidão negativa'
            : ''
            } />
            {errors.assunto && <p className="text-red-500 text-xs mt-1">{errors.assunto.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Descrição *</label>
            <textarea {...register('descricao', { required: 'Descrição é obrigatória' })} rows={4} className="input resize-none" placeholder="Descreva detalhadamente o processo..." />
            {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
          </div>

          {tipoSelecionado === 'Did' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">N° DID *</label>
              <input
                {...register('did_numero', { required: 'N° DID é obrigatório' })}
                type="text"
                disabled
                className="input bg-gray-50 dark:bg-slate-800 opacity-75 cursor-not-allowed"
                placeholder={carregandoNumeroDid ? 'Carregando número...' : 'Ex: SEJUV-001'}
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Número sequencial gerado automaticamente pela secretaria.
              </p>
              {errors.did_numero && <p className="text-red-500 text-xs mt-1">{errors.did_numero.message}</p>}
            </div>
          )}

          {tipoSelecionado === 'Protocolo' && (
            <>
              {/* ── Classificação do atendimento ── */}
              <div className="md:col-span-2 pt-1">
                <SectionTitle icon={Stamp} title="Classificação do Protocolo" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Origem *</label>
                <select {...register('protocolo_origem')} className="input">
                  {ORIGENS_PROTOCOLO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {ORIGENS_PROTOCOLO.find(o => o.value === origemProtocolo)?.ajuda}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Natureza do atendimento *</label>
                <select {...register('protocolo_natureza')} className="input">
                  {NATUREZAS_PROTOCOLO.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Documento apresentado</label>
                <input {...register('protocolo_documento')} type="text" className="input" placeholder="Ex: Requerimento + cópia do RG" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Prazo de atendimento (dias)</label>
                <input {...register('protocolo_prazo_dias')} type="number" min="1" max="365" className="input" placeholder="Ex: 30" />
              </div>

              {/* ── Interessado ── */}
              <div className="md:col-span-2 pt-1">
                <SectionTitle
                  icon={User}
                  title={origemProtocolo === 'interno' ? 'Servidor / Unidade Solicitante' : 'Interessado / Requerente'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  {origemProtocolo === 'interno' ? 'Nome do Servidor *' : 'Nome do Interessado *'}
                </label>
                <input {...register('interessado_nome', { required: 'Nome do interessado é obrigatório' })} type="text" className="input" placeholder="Ex: Maria da Silva" />
                {errors.interessado_nome && <p className="text-red-500 text-xs mt-1">{errors.interessado_nome.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">CPF / CNPJ</label>
                <input {...register('interessado_cpf_cnpj')} type="text" className="input" placeholder="Somente números" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">E-mail</label>
                <input {...register('interessado_email')} type="email" className="input" placeholder="exemplo@email.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Telefone</label>
                <input {...register('interessado_telefone')} type="text" className="input" placeholder="(00) 00000-0000" />
              </div>

              {origemProtocolo === 'externo' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Órgão / Empresa representada</label>
                  <input {...register('protocolo_orgao_externo')} type="text" className="input" placeholder="Preencha quando o interessado representar uma pessoa jurídica ou outro órgão" />
                </div>
              )}

              {/* ── Encaminhamento ── */}
              <div className="md:col-span-2 pt-1">
                <SectionTitle icon={Route} title="Encaminhamento" />
                <p className="text-xs text-gray-500 dark:text-slate-400 -mt-1 mb-1">
                  Opcional. Se preenchido, o protocolo já sai registrado e tramitado ao setor competente;
                  caso contrário, permanece no seu setor aguardando distribuição.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Secretaria de destino</label>
                <select {...register('destinoSecretariaId')} className="input">
                  <option value="">Manter no meu setor</option>
                  {secretarias.map(s => <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} — ${s.nome}` : s.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Setor de destino</label>
                <select {...register('destinoSetorId')} className="input" disabled={!destSecretariaId}>
                  <option value="">{destSecretariaId ? 'Selecione o setor' : 'Selecione a secretaria primeiro'}</option>
                  {setores.map(s => <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} — ${s.nome}` : s.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Responsável (opcional)</label>
                <select {...register('destinoUsuarioId')} className="input" disabled={!destSetorId}>
                  <option value="">Qualquer servidor do setor</option>
                  {usuariosDestino.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              {destSetorId && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Despacho de encaminhamento</label>
                  <textarea {...register('despachoEncaminhamento')} rows={2} className="input resize-none" placeholder="Deixe em branco para usar o despacho padrão de protocolo." />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Prioridade</label>
            <select {...register('prioridade')} className="input">
              <option value="normal">Normal</option>
              <option value="baixa">Baixa</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-slate-700/50">
          <ActionBar>
            <button type="button" onClick={() => setTipoSelecionado(null)} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Criar Processo'}
            </button>
          </ActionBar>
        </div>
      </form>
    </div>
  )
}

