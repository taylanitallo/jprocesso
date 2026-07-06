import { Calculator } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, UserSelect, SectionCard, SecaoBotoes, alertarPendencias } from '../didShared'

function SimNao({ value, onChange, disabled }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}
      className={`input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}>
      <option value="">— Selecione —</option>
      <option value="sim">Sim</option>
      <option value="nao">Não</option>
    </select>
  )
}

export default function DidVariaveisSecaoIX({ form, inp, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const liquidado = form.contabil_pc_liquidado === 'sim'
  const camposLiquidacaoDisabled = locked || !liquidado

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.contabil_pc_recebido_em, label: 'Recebido em' },
      { ok: !!form.contabil_pc_responsavel, label: 'Responsável' },
      { ok: !!form.contabil_pc_liquidado, label: 'Está liquidado?' },
      { ok: !liquidado || !!form.contabil_pc_liquidacao_numero, label: 'Liquidação Nº' },
      { ok: !liquidado || !!form.contabil_pc_data_liquidacao, label: 'Data da Liquidação' },
    ], 'Seção IX')
    if (!completo) return
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <SectionCard icon={Calculator} title="Seção IX - Contabilidade (Liquidação)"
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.contabil_pc_recebido_em} onChange={inp('contabil_pc_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <UserSelect value={form.contabil_pc_responsavel} onChange={inp('contabil_pc_responsavel')} disabled={locked} secretaria="contabil" />
      </Field>
      <Field label="Auditor">
        <Input value={form.contabil_pc_auditor} onChange={inp('contabil_pc_auditor')} disabled={locked} />
      </Field>
      <Field label="Está liquidado?">
        <SimNao value={form.contabil_pc_liquidado} onChange={inp('contabil_pc_liquidado')} disabled={locked} />
      </Field>
      <Field label="Liquidação Nº" half>
        <Input value={form.contabil_pc_liquidacao_numero} onChange={inp('contabil_pc_liquidacao_numero')} disabled={camposLiquidacaoDisabled} />
      </Field>
      <Field label="Data da Liquidação" half>
        <Input type="date" value={form.contabil_pc_data_liquidacao} onChange={inp('contabil_pc_data_liquidacao')} disabled={camposLiquidacaoDisabled} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Contabilidade" onLimpar={limpar} />
    </SectionCard>
  )
}
