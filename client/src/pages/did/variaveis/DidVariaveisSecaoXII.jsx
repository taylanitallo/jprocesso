import { BookCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, SectionCard, SecaoBotoes, alertarPendencias } from '../didShared'

function SimNao({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}
    >
      <option value="">— Selecione —</option>
      <option value="sim">Sim</option>
      <option value="nao">Não</option>
    </select>
  )
}

export default function DidVariaveisSecaoXII({ form, inp, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.contab_fech_finalizado, label: 'Processo Finalizado' },
      { ok: !!form.contab_fech_tce, label: 'Enviado para o TCE/SIM' },
    ], 'Seção XII')
    if (!completo) return
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <SectionCard icon={BookCheck} title="Seção XII - Contabilidade Fechamento"
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Processo Finalizado" half>
        <SimNao value={form.contab_fech_finalizado} onChange={inp('contab_fech_finalizado')} disabled={locked} />
      </Field>
      <Field label="Enviado para o TCE/SIM" half>
        <SimNao value={form.contab_fech_tce} onChange={inp('contab_fech_tce')} disabled={locked} />
      </Field>
      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção XII" onLimpar={limpar} />
    </SectionCard>
  )
}
