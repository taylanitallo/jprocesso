// Situação da conta de pagamento escolhida no DID: saldo, o que já está reservado
// para outros DIDs, retenções a recolher e quanto sobra (disponível).
// O próprio DID não entra no comprometido (ignorar_did).
import { useEffect, useState } from 'react'
import { AlertTriangle, Wallet } from 'lucide-react'
import api from '../../services/api'

const fmt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Busca o disponível da conta (null enquanto carrega ou sem conta) */
export function useDisponivelConta(contaId, didId) {
  const [situacao, setSituacao] = useState(null)
  useEffect(() => {
    setSituacao(null)
    if (!contaId) return
    let vivo = true
    api.get(`/tesouraria/contas/${contaId}/disponivel`, { params: didId ? { ignorar_did: didId } : {} })
      .then(({ data }) => { if (vivo) setSituacao(data) })
      .catch(() => {})
    return () => { vivo = false }
  }, [contaId, didId])
  return situacao
}

/**
 * Quanto este DID tira da conta: enquanto não estiver salvo como pago, o bruto
 * (líquido + retenções); depois de salvo como pago já está no saldo e não pesa de novo.
 */
export const valorQuePesa = (form, jaPago) => (jaPago ? 0 : parseFloat(form.valor_bruto) || 0)

export default function DisponivelConta({ situacao, form, jaPago }) {
  if (!situacao) return null
  const pesa = valorQuePesa(form, jaPago)
  const sobra = situacao.disponivel - pesa
  const falta = pesa > 0 && sobra < 0

  return (
    <div className={`col-span-2 rounded-lg border px-3 py-2.5 text-xs ${falta
      ? 'border-danger-300 bg-danger-50 dark:bg-danger-900/20 dark:border-danger-700'
      : 'border-ink-200 bg-ink-50'}`}>
      <div className="flex items-center gap-1.5 font-semibold text-ink-700 mb-1.5">
        <Wallet className="w-3.5 h-3.5" /> Situação da conta
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
        <div><span className="text-ink-500">Saldo</span><p className="font-mono font-semibold text-ink-800">{fmt(situacao.saldo)}</p></div>
        <div title="DIDs com esta conta escolhida e ainda não pagos">
          <span className="text-ink-500">Outros DIDs a pagar</span>
          <p className="font-mono font-semibold text-amber-700 dark:text-amber-400">{fmt(situacao.comprometido)}</p>
        </div>
        <div title="Retenções de DIDs pagos ainda não recolhidas">
          <span className="text-ink-500">Retenções a recolher</span>
          <p className="font-mono font-semibold text-amber-700 dark:text-amber-400">{fmt(situacao.a_recolher)}</p>
        </div>
        <div><span className="text-ink-500">Disponível</span><p className={`font-mono font-bold ${situacao.disponivel < 0 ? 'text-danger-600' : 'text-success-700 dark:text-success-400'}`}>{fmt(situacao.disponivel)}</p></div>
      </div>
      {falta && (
        <p className="mt-2 flex items-start gap-1.5 text-danger-700 dark:text-danger-300 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          Este DID ({fmt(pesa)}) passa do disponível em {fmt(-sobra)}.
        </p>
      )}
    </div>
  )
}
