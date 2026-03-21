import { Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, Textarea, SectionCard, SecaoBotoes } from '../didShared'

export default function DidVariaveisSecaoII({ form, inp, saving, didId, onSave }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={Shield} title="Seção II - Controle Interno"
      color="bg-indigo-700 text-white dark:bg-indigo-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.ci_recebido_em} onChange={inp('ci_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.ci_responsavel} onChange={inp('ci_responsavel')} disabled={locked} />
      </Field>
      <Field label="Despacho via C.I.">
        <Textarea value={form.despacho_ci} onChange={inp('despacho_ci')} disabled={locked} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção II" />
    </SectionCard>
  )
}
