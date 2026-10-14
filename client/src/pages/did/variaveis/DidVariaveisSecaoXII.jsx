import { BookCheck } from 'lucide-react'
import { useContext } from 'react'
import { Field, SectionCard } from '../didShared'
import { EtapaDidContext } from '../EtapasDid'

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

export default function DidVariaveisSecaoXII({ form, inp, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel, titulo } = useContext(EtapaDidContext)
  const locked = !editavel

  return (
    <SectionCard icon={BookCheck} title={titulo || 'Seção XII - Contabilidade Fechamento'}
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Processo Finalizado" half>
        <SimNao value={form.contab_fech_finalizado} onChange={inp('contab_fech_finalizado')} disabled={locked} />
      </Field>
      <Field label="Enviado para o TCE/SIM" half>
        <SimNao value={form.contab_fech_tce} onChange={inp('contab_fech_tce')} disabled={locked} />
      </Field>
    </SectionCard>
  )
}
