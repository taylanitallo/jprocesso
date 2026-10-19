// Tesouraria › Transferências entre contas (tela cheia).
// Lista todas as transferências com quem registrou e permite fazer uma nova:
// data, conta de origem, conta de destino, valor e observação. O valor sai do saldo
// da origem e entra no do destino (servidor: caixaService › movimentos).
// Permissões: tesouraria › transferencias › ver / criar.
import { useEffect, useState } from 'react'
import { ArrowLeftRight, ArrowRight, Plus, X, Save, Loader2, AlertTriangle } from 'lucide-react'
import api from '../../services/api'
import { usePode } from '../../utils/permissions'
import CampoSugerido from '../ui/CampoSugerido'
import { contextoFormulario, registrarTextoUsado } from '../../utils/sugestaoAyla'
import { useDisponivelConta } from '../../pages/did/DisponivelConta'
import { ContaPicker, ContaLink, PeriodoRapido, BotaoLimpar, contaLabel, fmtMoeda, fmtData } from './ContaBancaria'

const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const maskValor = (raw) => {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const valorNumero = (txt) => parseFloat(String(txt || '').replace(/\./g, '').replace(',', '.')) || 0
const fmtDataHora = (d) => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

export default function ModalTransferencias({ onClose }) {
  const pode = usePode('tesouraria', 'transferencias')
  const [contas, setContas] = useState([])
  const [lista, setLista] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erroLista, setErroLista] = useState('')
  const [filtros, setFiltros] = useState({ data_de: '', data_ate: '', conta_id: '' })
  const [nova, setNova] = useState(null) // formulário aberto

  const carregar = (f = filtros) => {
    setCarregando(true)
    setErroLista('')
    const params = {}
    if (f.data_de) params.data_de = f.data_de
    if (f.data_ate) params.data_ate = f.data_ate
    if (f.conta_id) params.conta_id = f.conta_id
    api.get('/tesouraria/transferencias', { params })
      .then(({ data }) => { setLista(data.transferencias || []); setTotal(data.total || 0) })
      .catch((err) => setErroLista(err.response?.data?.error || 'Não foi possível carregar as transferências.'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    api.get('/organizacao/contas-bancarias').then(({ data }) => setContas(data.contas || [])).catch(() => {})
    carregar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Esc fecha (primeiro o formulário, depois a tela)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') (nova ? setNova(null) : onClose()) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [nova, onClose])

  const filtrar = (patch) => { const f = { ...filtros, ...patch }; setFiltros(f); carregar(f) }
  const qtdFiltros = [filtros.data_de || filtros.data_ate, filtros.conta_id].filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 p-2 sm:p-3 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="transf-titulo">
      <div className="bg-ink-50 rounded-3xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-5 py-4 bg-surface border-b border-ink-200">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-brand-600 dark:text-info-300" />
          </div>
          <div className="min-w-0">
            <h2 id="transf-titulo" className="text-lg font-bold text-ink-900">Transferências entre contas</h2>
            <p className="text-xs text-ink-500">O valor sai da conta de origem e entra na conta de destino na data informada.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {pode('criar') && (
              <button type="button" onClick={() => setNova({ data: hoje(), conta_origem_id: '', conta_destino_id: '', valor: '', observacao: '' })}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Fazer transferência
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-5 py-3 bg-surface border-b border-ink-200 space-y-2">
          <PeriodoRapido de={filtros.data_de} ate={filtros.data_ate} onChange={(a, b) => filtrar({ data_de: a, data_ate: b })} />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="transf-de" className="block text-xs font-medium text-ink-600 mb-1">Data de</label>
              <input id="transf-de" type="date" value={filtros.data_de} onChange={e => filtrar({ data_de: e.target.value })} className="input-field text-sm" />
            </div>
            <div>
              <label htmlFor="transf-ate" className="block text-xs font-medium text-ink-600 mb-1">Data até</label>
              <input id="transf-ate" type="date" value={filtros.data_ate} onChange={e => filtrar({ data_ate: e.target.value })} className="input-field text-sm" />
            </div>
            <div className="flex-1 min-w-[260px]">
              <label htmlFor="transf-conta" className="block text-xs font-medium text-ink-600 mb-1">Conta (origem ou destino)</label>
              <ContaPicker id="transf-conta" value={filtros.conta_id} contas={contas} todasLabel="Todas as contas" onChange={id => filtrar({ conta_id: id || '' })} />
            </div>
            <BotaoLimpar ativo={qtdFiltros} onClick={() => filtrar({ data_de: '', data_ate: '', conta_id: '' })} />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-auto p-3 sm:p-5">
          <div className="bg-surface rounded-2xl border border-ink-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2 text-sm">
              <ArrowLeftRight className="w-4 h-4 text-ink-500" />
              <span className="font-semibold text-ink-800">Transferências feitas</span>
              <span className="text-xs text-ink-500">{lista.length} transferência{lista.length !== 1 ? 's' : ''} · <span className="font-semibold text-ink-700">{fmtMoeda(total)}</span></span>
            </div>
            {carregando ? (
              <p className="p-8 text-center text-sm text-ink-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</p>
            ) : erroLista ? (
              <p className="p-8 text-center text-sm text-danger-600">{erroLista}</p>
            ) : lista.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-500">Nenhuma transferência {qtdFiltros ? 'com esses filtros' : 'registrada ainda'}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Data</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Conta de origem</th>
                      <th className="px-2 py-2.5" aria-hidden="true" />
                      <th className="px-4 py-2.5 text-left font-semibold">Conta de destino</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Observação</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Feita por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {lista.map(t => (
                      <tr key={t.id} className="hover:bg-ink-50/60 align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-ink-700">{fmtData(t.data)}</td>
                        <td className="px-4 py-3"><ContaLink conta={t.origem} contaId={t.conta_origem_id} /></td>
                        <td className="px-2 py-3 text-ink-400"><ArrowRight className="w-4 h-4" aria-label="para" /></td>
                        <td className="px-4 py-3"><ContaLink conta={t.destino} contaId={t.conta_destino_id} /></td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900 whitespace-nowrap">{fmtMoeda(t.valor)}</td>
                        <td className="px-4 py-3 text-ink-600 max-w-md whitespace-pre-wrap">{t.observacao || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-ink-800">{t.usuario_nome || '—'}</p>
                          <p className="text-[11px] text-ink-500">{fmtDataHora(t.created_at || t.createdAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {nova && (
        <NovaTransferencia
          inicial={nova}
          contas={contas}
          onClose={() => setNova(null)}
          onSalvo={() => { setNova(null); carregar() }}
        />
      )}
    </div>
  )
}

function NovaTransferencia({ inicial, contas, onClose, onSalvo }) {
  const [form, setForm] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const contasAtivas = contas.filter(c => c.ativo !== false)
  const situacao = useDisponivelConta(form.conta_origem_id)
  const valor = valorNumero(form.valor)
  const semSaldo = situacao && valor > 0 && valor > (Number(situacao.saldo) || 0) + 0.004
  const origem = contas.find(c => c.id === form.conta_origem_id)
  const destino = contas.find(c => c.id === form.conta_destino_id)
  const contexto = contextoFormulario({ data: form.data, valor: form.valor ? `R$ ${form.valor}` : '' }, {
    conta_origem: origem ? contaLabel(origem) : undefined,
    conta_destino: destino ? contaLabel(destino) : undefined,
  })

  const salvar = async () => {
    setErro('')
    if (!form.data) return setErro('Informe a data da transferência.')
    if (!form.conta_origem_id) return setErro('Selecione a conta de origem.')
    if (!form.conta_destino_id) return setErro('Selecione a conta de destino.')
    if (form.conta_origem_id === form.conta_destino_id) return setErro('A conta de destino deve ser diferente da conta de origem.')
    if (!(valor > 0)) return setErro('Informe o valor da transferência.')
    setSalvando(true)
    try {
      await api.post('/tesouraria/transferencias', { ...form, valor })
      registrarTextoUsado('tesouraria.transferencia.observacao', form.observacao, contexto)
      onSalvo()
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível registrar a transferência.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="nova-transf-titulo">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xl max-h-full overflow-auto">
        <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
          <h3 id="nova-transf-titulo" className="text-base font-semibold text-ink-800 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-brand-600" /> Nova transferência
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-ink-400 hover:text-ink-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nt-data" className="block text-xs font-medium text-ink-600 mb-1">Data *</label>
              <input id="nt-data" type="date" value={form.data} onChange={e => set('data', e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label htmlFor="nt-valor" className="block text-xs font-medium text-ink-600 mb-1">Valor (R$) *</label>
              <input id="nt-valor" type="text" inputMode="numeric" value={form.valor} placeholder="0,00"
                onChange={e => set('valor', maskValor(e.target.value))} className="input-field text-sm text-right tabular-nums" />
            </div>
          </div>
          <div>
            <label htmlFor="nt-origem" className="block text-xs font-medium text-ink-600 mb-1">Conta de origem *</label>
            <ContaPicker id="nt-origem" value={form.conta_origem_id} contas={contasAtivas} onChange={id => set('conta_origem_id', id || '')} />
            {situacao && (
              <p className={`mt-1 text-xs ${semSaldo ? 'text-danger-600 font-medium' : 'text-ink-500'}`}>
                {semSaldo && <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
                Saldo atual: <strong>{fmtMoeda(situacao.saldo)}</strong> · Disponível: <strong>{fmtMoeda(situacao.disponivel)}</strong>
                {semSaldo && ' — o valor é maior que o saldo da conta'}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="nt-destino" className="block text-xs font-medium text-ink-600 mb-1">Conta de destino *</label>
            <ContaPicker id="nt-destino" value={form.conta_destino_id} contas={contasAtivas.filter(c => c.id !== form.conta_origem_id)} onChange={id => set('conta_destino_id', id || '')} />
          </div>
          <div>
            <label htmlFor="nt-obs" className="block text-xs font-medium text-ink-600 mb-1">Observação</label>
            <CampoSugerido id="nt-obs" rows={3} value={form.observacao} onChange={e => set('observacao', e.target.value)}
              campo="tesouraria.transferencia.observacao" registrarNoEnvio={false} quando="focar"
              pronto={!!(form.conta_origem_id && form.conta_destino_id)}
              rotulo="Observação da transferência entre contas bancárias da tesouraria (motivo da transferência)"
              contexto={contexto}
              className="input-field text-sm resize-none" placeholder="Motivo da transferência..." />
          </div>
          {erro && <p className="text-sm rounded-lg px-3 py-2 text-danger-700 dark:text-danger-300 bg-danger-50 dark:bg-danger-900/20">{erro}</p>}
        </div>
        <div className="px-5 py-3 border-t border-ink-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando || semSaldo} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Transferir
          </button>
        </div>
      </div>
    </div>
  )
}
