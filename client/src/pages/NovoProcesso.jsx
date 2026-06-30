import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../services/api'
import {
  ArrowLeft, Save, FileText, ChevronRight, FilePlus2,
  FileCheck, Calendar, Send, AlertTriangle,
} from 'lucide-react'
import { PageHeader, SectionTitle, ActionBar } from '../components/ui'

const TIPOS_PROCESSO = [
  { value: 'Despacho',   label: 'Despacho',   descricao: 'Ato administrativo de encaminhamento ou deliberações',         icon: Send,          cor: 'text-purple-500 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/40', borda: 'hover:border-purple-400 dark:hover:border-purple-500' },
  { value: 'Did',        label: 'DID',         descricao: 'Documento de Intenção de Despesas',                            icon: FileCheck,     cor: 'text-blue-500 dark:text-blue-400',   iconBg: 'bg-blue-100 dark:bg-blue-900/40',   borda: 'hover:border-blue-400 dark:hover:border-blue-500'   },
  { value: 'Pauta',      label: 'Pauta',       descricao: 'Solicitação de processo para contratação de bens ou serviços', icon: Calendar,      cor: 'text-green-500 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/40', borda: 'hover:border-green-400 dark:hover:border-green-500' },
]

export default function NovoProcesso() {
  const { subdomain } = useParams()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tipoSelecionado, setTipoSelecionado] = useState(null)
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/processos', { ...data, tipo_processo: tipoSelecionado })
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
            <input {...register('assunto', { required: 'Assunto é obrigatório' })} type="text" className="input" placeholder={tipoSelecionado === 'Did' ? 'Ex: Locação de impressoras – Abril/2025' : ''} />
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
                {...register('did_numero', {
                  required: tipoSelecionado === 'Did' ? 'N° DID é obrigatório' : false,
                  pattern: { value: /^[0-9]+$/, message: 'Somente números são permitidos' }
                })}
                type="text"
                inputMode="numeric"
                className="input"
                placeholder="Ex: 123"
              />
              {errors.did_numero && <p className="text-red-500 text-xs mt-1">{errors.did_numero.message}</p>}
            </div>
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

