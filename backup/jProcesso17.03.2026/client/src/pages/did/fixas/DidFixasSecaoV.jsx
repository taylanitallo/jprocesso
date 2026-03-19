import { Landmark } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, SectionCard, SecaoBotoes } from '../didShared'

export default function DidFixasSecaoV({ form, inp, saving, didId, onSave, editando }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])
  useEffect(() => { setLocked(!editando) }, [editando])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={Landmark} title="Seção V - Secretaria de Finanças"
      color="bg-teal-700 text-white dark:bg-teal-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.financas2_recebido_em} onChange={inp('financas2_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.financas2_responsavel} onChange={inp('financas2_responsavel')} disabled={locked} />
      </Field>
      <Field label="Enviado para Pagamento" half>
        <Input type="date" value={form.financas2_enviado_pagamento} onChange={inp('financas2_enviado_pagamento')} disabled={locked} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção V" editando={editando} />
    </SectionCard>
  )
}
