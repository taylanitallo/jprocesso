import { ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, SectionCard, SecaoBotoes } from '../didShared'

export default function DidVariaveisSecaoIV({ form, inp, set, saving, didId, onSave, editando }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])
  useEffect(() => { setLocked(!editando) }, [editando])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={ShoppingCart} title="Seção IV - Setor de Compras (Solicitação de Empenho)"
      color="bg-orange-600 text-white dark:bg-orange-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.compras2_recebido_em} onChange={inp('compras2_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.compras2_responsavel} onChange={inp('compras2_responsavel')} disabled={locked} />
      </Field>

      <Field label="Nº Solicitação de Empenho" half>
        <Input value={form.compras2_nro_empenho_solicitacao} onChange={inp('compras2_nro_empenho_solicitacao')} disabled={locked} />
      </Field>

      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Setor de Compras" editando={editando} />
    </SectionCard>
  )
}
