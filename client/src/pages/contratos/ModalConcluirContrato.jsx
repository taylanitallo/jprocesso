// Contratos › Concluir contrato (assinado eletronicamente).
// Utilizado por completo: quem tem Contratos › Concluir. Com saldo sobrando: só
// gestor, administrador e Jeos, com justificativa. Servidor: contratoConclusaoController.
import { useEffect, useState } from 'react'
import { CheckCircle2, X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useAssinatura } from '../../components/assinatura/AssinaturaProvider'
import CampoSugerido from '../../components/ui/CampoSugerido'
import { registrarTextoUsado } from '../../utils/sugestaoAyla'

const JUSTIFICATIVA_MIN = 20
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ModalConcluirContrato({ contrato, onClose, onConcluido }) {
  const { user } = useAuth()
  const { assinar } = useAssinatura()
  const [saldo, setSaldo] = useState(null)
  const [erroSaldo, setErroSaldo] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api.get(`/contratos/ordens/saldo/${contrato.id}`)
      .then(({ data }) => setSaldo(data))
      .catch(() => setErroSaldo('Não foi possível calcular o saldo do contrato.'))
  }, [contrato.id])

  const restante = saldo ? Math.max(0, Math.round((saldo.saldo || 0) * 100) / 100) : 0
  const completo = !!saldo && restante <= 0.004
  const podeComSaldo = ['gestor', 'admin', 'jeos'].includes(user?.tipo)
  const bloqueado = !!saldo && !completo && !podeComSaldo
  const contexto = {
    contrato: contrato.numero_contrato, objeto: contrato.objeto, secretaria: contrato.secretaria,
    valor_contrato: saldo ? brl(saldo.valor_contrato) : undefined,
    utilizado: saldo ? brl(saldo.total_usado) : undefined,
    saldo_restante: saldo ? brl(restante) : undefined,
  }

  const concluir = async () => {
    setErro('')
    if (!completo && justificativa.trim().length < JUSTIFICATIVA_MIN) {
      return setErro(`Informe a justificativa (mínimo ${JUSTIFICATIVA_MIN} caracteres).`)
    }
    setEnviando(true)
    try {
      const r = await assinar({
        titulo: `Concluir o contrato ${contrato.numero_contrato}`,
        resumo: (
          <>
            <p><strong>Contrato:</strong> {contrato.numero_contrato}</p>
            <p><strong>Utilizado:</strong> {brl(saldo?.total_usado)} de {brl(saldo?.valor_contrato)}</p>
            {!completo && <p><strong>Saldo não utilizado:</strong> {brl(restante)}</p>}
            {!completo && <p><strong>Justificativa:</strong> {justificativa.trim().slice(0, 200)}{justificativa.trim().length > 200 ? '…' : ''}</p>}
          </>
        ),
        executar: (cred) => api.post(`/contratos/${contrato.id}/concluir`, { justificativa: justificativa.trim(), ...cred }),
      })
      if (!r) return // cancelou a assinatura
      if (!completo) registrarTextoUsado('contratos.concluir.justificativa', justificativa, contexto)
      onConcluido?.(r.data)
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível concluir o contrato.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="concluir-ctr-titulo">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-auto">
        <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
          <h3 id="concluir-ctr-titulo" className="text-base font-semibold text-ink-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success-600" /> Concluir contrato
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-ink-400 hover:text-ink-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">{contrato.numero_contrato}</p>
            <p className="text-xs text-ink-500 line-clamp-2">{contrato.objeto}</p>
          </div>

          {erroSaldo ? (
            <p className="text-sm text-danger-600">{erroSaldo}</p>
          ) : !saldo ? (
            <p className="text-sm text-ink-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Calculando o saldo…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Valor do contrato', saldo.valor_contrato], ['Utilizado', saldo.total_usado], ['Saldo', restante]].map(([r, v]) => (
                  <div key={r} className="rounded-xl border border-ink-200 px-2 py-2">
                    <p className="text-[11px] text-ink-500">{r}</p>
                    <p className="text-sm font-bold text-ink-900 tabular-nums">{brl(v)}</p>
                  </div>
                ))}
              </div>

              {/* Contrato com cotas: o que sobra em cada unidade/dotação */}
              {Array.isArray(saldo.cotas) && saldo.cotas.length > 0 && (
                <div className="rounded-xl border border-ink-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-ink-50 text-ink-500">
                      <tr><th className="px-3 py-1.5 text-left">Cota</th><th className="px-3 py-1.5 text-right">Contratado</th><th className="px-3 py-1.5 text-right">Utilizado</th><th className="px-3 py-1.5 text-right">Saldo</th></tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {saldo.cotas.map(c => (
                        <tr key={c.id}>
                          <td className="px-3 py-1.5 font-semibold text-ink-700">{c.nome}{c.dotacao && <span className="block font-normal text-[10px] text-ink-400">Dotação {c.dotacao}</span>}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{brl(c.valor_contratado)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{brl(c.valor_usado)}</td>
                          <td className={`px-3 py-1.5 text-right tabular-nums font-bold ${c.saldo > 0.004 ? 'text-amber-700' : 'text-success-700'}`}>{brl(Math.max(0, c.saldo))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {completo ? (
                <p className="text-sm rounded-lg px-3 py-2 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> Contrato utilizado por completo. Pode ser concluído.
                </p>
              ) : (
                <div className="text-sm rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    O contrato ainda tem <strong>{brl(restante)}</strong> sem ordens.{' '}
                    {podeComSaldo
                      ? 'Para concluir assim mesmo, informe a justificativa.'
                      : 'Só gestor ou administrador pode concluir um contrato que não foi utilizado por completo.'}
                  </span>
                </div>
              )}

              {!completo && podeComSaldo && (
                <div>
                  <label htmlFor="concluir-just" className="block text-xs font-medium text-ink-600 mb-1">
                    Justificativa * <span className="font-normal text-ink-400">(mínimo {JUSTIFICATIVA_MIN} caracteres)</span>
                  </label>
                  <CampoSugerido id="concluir-just" rows={4} value={justificativa} onChange={e => setJustificativa(e.target.value)}
                    campo="contratos.concluir.justificativa" registrarNoEnvio={false}
                    rotulo="Justificativa para concluir o contrato antes de utilizar todo o saldo (por que o saldo restante não será usado)"
                    contexto={contexto}
                    className="input-field text-sm resize-none" placeholder="Ex.: o evento foi realizado e não haverá novas aquisições..." />
                  <p className="text-right text-[11px] text-ink-400 mt-0.5">{justificativa.trim().length}/{JUSTIFICATIVA_MIN}</p>
                </div>
              )}
            </>
          )}

          <p className="text-[11px] text-ink-500 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            A conclusão é assinada eletronicamente. Depois de concluído, o contrato não recebe novas ordens e não pode ser alterado.
          </p>
          {erro && <p className="text-sm rounded-lg px-3 py-2 text-danger-700 dark:text-danger-300 bg-danger-50 dark:bg-danger-900/20">{erro}</p>}
        </div>

        <div className="px-5 py-3 border-t border-ink-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancelar</button>
          <button type="button" onClick={concluir} disabled={!saldo || bloqueado || enviando}
            className="text-sm px-4 py-2 rounded-lg font-semibold text-white bg-success-600 hover:bg-success-700 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Concluir e assinar
          </button>
        </div>
      </div>
    </div>
  )
}
