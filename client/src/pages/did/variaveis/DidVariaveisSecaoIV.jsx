import { ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, UserSelect, SectionCard, SecaoBotoes, alertarPendencias } from '../didShared'

export default function DidVariaveisSecaoIV({ form, inp, set, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.compras2_recebido_em, label: 'Recebido em' },
      { ok: !!form.compras2_responsavel, label: 'Responsável' },
      { ok: !!form.compras2_nro_empenho_solicitacao, label: 'Nº Solicitação de Empenho' },
    ], 'Seção IV')
    if (!completo) return
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <SectionCard icon={ShoppingCart} title="Seção IV - Setor de Compras (Solicitação de Empenho)"
      color="bg-orange-600 text-white dark:bg-orange-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.compras2_recebido_em} onChange={inp('compras2_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <UserSelect value={form.compras2_responsavel} onChange={inp('compras2_responsavel')} disabled={locked} secretaria="compras" />
      </Field>

      <Field label="Nº Solicitação de Empenho" half>
        <Input value={form.compras2_nro_empenho_solicitacao} onChange={inp('compras2_nro_empenho_solicitacao')} disabled={locked} />
      </Field>

      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Setor de Compras" onLimpar={limpar} />
    </SectionCard>
  )
}
