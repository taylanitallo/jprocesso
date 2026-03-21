import { Calculator } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, SectionCard, SecaoBotoes } from '../didShared'

export default function DidFixasSecaoIV({ form, inp, saving, didId, onSave }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={Calculator} title="Seção IV - Contabilidade"
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.contabil_recebido_em} onChange={inp('contabil_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.contabil_responsavel} onChange={inp('contabil_responsavel')} disabled={locked} />
      </Field>
      <Field label="Auditor">
        <Input value={form.contabil_auditor} onChange={inp('contabil_auditor')} disabled={locked} />
      </Field>
      <Field label="Empenho Nº" half>
        <Input value={form.empenho_numero} onChange={inp('empenho_numero')} disabled={locked} />
      </Field>
      <Field label="Tipo de Empenho" half>
        <select value={form.tipo_empenho} onChange={inp('tipo_empenho')} disabled={locked}
          className={`input-field text-sm${locked ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}>
          <option value="">Selecione...</option>
          <option value="ordinario">Ordinário</option>
          <option value="estimativo">Estimativo</option>
          <option value="global">Global</option>
        </select>
      </Field>
      <Field label="Data do Empenho" half>
        <Input type="date" value={form.data_empenho} onChange={inp('data_empenho')} disabled={locked} />
      </Field>
      <Field label="Liquidação Nº" half>
        <Input value={form.liquidacao_numero} onChange={inp('liquidacao_numero')} disabled={locked} />
      </Field>
      <Field label="Data da Liquidação" half>
        <Input type="date" value={form.data_liquidacao} onChange={inp('data_liquidacao')} disabled={locked} />
      </Field>
      <Field label="Doc. Caixa" half>
        <Input value={form.doc_caixa} onChange={inp('doc_caixa')} disabled={locked} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção IV" />
    </SectionCard>
  )
}
