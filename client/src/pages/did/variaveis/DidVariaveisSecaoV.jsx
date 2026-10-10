import { Calculator } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, UserSelect, SectionCard, SecaoBotoes, alertarPendencias } from '../didShared'

function SimNao({ value, onChange, disabled }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}
      className={`input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}>
      <option value="">— Selecione —</option>
      <option value="sim">Sim</option>
      <option value="nao">Não</option>
    </select>
  )
}

export default function DidVariaveisSecaoV({ form, inp, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const empenhado = form.contabil_empenhado === 'sim'
  const camposEmpenhoDisabled = locked || !empenhado

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.contabil_recebido_em, label: 'Recebido em' },
      { ok: !!form.contabil_responsavel, label: 'Responsável' },
      { ok: !!form.contabil_empenhado, label: 'Está empenhado?' },
      { ok: !empenhado || !!form.empenho_numero, label: 'Empenho Nº' },
      { ok: !empenhado || !!form.tipo_empenho, label: 'Tipo de Empenho' },
      { ok: !empenhado || !!form.data_empenho, label: 'Data do Empenho' },
    ], 'Seção V')
    if (!completo) return
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <SectionCard icon={Calculator} title="Seção V - Contabilidade (Empenho)"
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.contabil_recebido_em} onChange={inp('contabil_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <UserSelect value={form.contabil_responsavel} onChange={inp('contabil_responsavel')} disabled={locked} secretaria="contabil" />
      </Field>
      <Field label="Auditor">
        <UserSelect value={form.contabil_auditor} onChange={inp('contabil_auditor')} disabled={locked} secretaria="contabil" />
      </Field>
      <Field label="Está empenhado?">
        <SimNao value={form.contabil_empenhado} onChange={inp('contabil_empenhado')} disabled={locked} />
      </Field>
      <Field label="Empenho Nº" half>
        <Input value={form.empenho_numero} onChange={inp('empenho_numero')} disabled={camposEmpenhoDisabled} />
      </Field>
      <Field label="Tipo de Empenho" half>
        <select value={form.tipo_empenho} onChange={inp('tipo_empenho')} disabled={camposEmpenhoDisabled}
          className={`input-field text-sm${camposEmpenhoDisabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}>
          <option value="">Selecione...</option>
          <option value="ordinario">Ordinário</option>
          <option value="estimativo">Estimativo</option>
          <option value="global">Global</option>
        </select>
      </Field>
      <Field label="Data do Empenho" half>
        <Input type="date" value={form.data_empenho} onChange={inp('data_empenho')} disabled={camposEmpenhoDisabled} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção V" onLimpar={limpar} />
    </SectionCard>
  )
}
