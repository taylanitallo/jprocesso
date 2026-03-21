import { Landmark } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, SectionCard, SecaoBotoes } from '../didShared'

export default function DidFixasSecaoIII({ form, inp, saving, didId, onSave }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={Landmark} title="Seção III - Secretaria de Finanças"
      color="bg-teal-700 text-white dark:bg-teal-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.financas_recebido_em} onChange={inp('financas_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.financas_responsavel} onChange={inp('financas_responsavel')} disabled={locked} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção III" />
    </SectionCard>
  )
}
