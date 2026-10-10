import { ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, UserSelect, SectionCard, SecaoBotoes, alertarPendencias } from '../didShared'

export default function DidVariaveisSecaoVI({ form, inp, set, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.compras_recebido_em, label: 'Recebido em' },
      { ok: !!form.compras_responsavel, label: 'Responsável' },
      { ok: !!form.nro_empenho_solicitacao, label: 'Nº Ordem de Compra' },
      { ok: !!form.local_entrega, label: 'Local de Entrega' },
    ], 'Seção VI')
    if (!completo) return
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <SectionCard icon={ShoppingCart} title="Seção VI - Setor de Compras (Ordem de Compra)"
      color="bg-orange-600 text-white dark:bg-orange-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.compras_recebido_em} onChange={inp('compras_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <UserSelect value={form.compras_responsavel} onChange={inp('compras_responsavel')} disabled={locked} secretaria="compras" />
      </Field>

      <Field label="Nº Ordem de Compra" half>
        <Input value={form.nro_empenho_solicitacao} onChange={inp('nro_empenho_solicitacao')} disabled={locked} />
      </Field>
      <Field label="Local de Entrega" half>
        <Input value={form.local_entrega} onChange={inp('local_entrega')} disabled={locked} />
      </Field>

      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Setor de Compras" onLimpar={limpar} />
    </SectionCard>
  )
}
