import { ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, SectionCard, SecaoBotoes } from '../didShared'

export default function DidVariaveisSecaoVIII({ form, inp, set, saving, didId, onSave }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={ShoppingCart} title="Seção VIII - Setor de Compras (Ateste de NF)"
      color="bg-orange-600 text-white dark:bg-orange-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.compras3_recebido_em} onChange={inp('compras3_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.compras3_responsavel} onChange={inp('compras3_responsavel')} disabled={locked} />
      </Field>

      <Field label="Data de envio para liquidação" half>
        <Input type="date" value={form.compras3_local_entrega} onChange={inp('compras3_local_entrega')} disabled={locked} />
      </Field>

      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Setor de Compras" />
    </SectionCard>
  )
}
