import { Landmark } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, UserSelect, SectionCard, SecaoBotoes, alertarPendencias } from '../didShared'

export default function DidVariaveisSecaoIII({ form, inp, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.financas_recebido_em, label: 'Recebido em' },
      { ok: !!form.financas_responsavel, label: 'Responsável' },
    ], 'Seção III')
    if (!completo) return
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <SectionCard icon={Landmark} title="Seção III - Secretaria de Finanças"
      color="bg-teal-700 text-white dark:bg-teal-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.financas_recebido_em} onChange={inp('financas_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <UserSelect value={form.financas_responsavel} onChange={inp('financas_responsavel')} disabled={locked} secretaria="finan" />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção III" onLimpar={limpar} />
    </SectionCard>
  )
}
