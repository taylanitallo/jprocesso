import { Calculator } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, SectionCard, SecaoBotoes } from '../didShared'

export default function DidVariaveisSecaoIX({ form, inp, saving, didId, onSave }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={Calculator} title="Seção IX - Contabilidade (Liquidação)"
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.contabil_pc_recebido_em} onChange={inp('contabil_pc_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.contabil_pc_responsavel} onChange={inp('contabil_pc_responsavel')} disabled={locked} />
      </Field>
      <Field label="Auditor">
        <Input value={form.contabil_pc_auditor} onChange={inp('contabil_pc_auditor')} disabled={locked} />
      </Field>
      <Field label="Liquidação Nº" half>
        <Input value={form.contabil_pc_liquidacao_numero} onChange={inp('contabil_pc_liquidacao_numero')} disabled={locked} />
      </Field>
      <Field label="Data da Liquidação" half>
        <Input type="date" value={form.contabil_pc_data_liquidacao} onChange={inp('contabil_pc_data_liquidacao')} disabled={locked} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Contabilidade" />
    </SectionCard>
  )
}
