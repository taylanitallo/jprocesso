import { Shield } from 'lucide-react'
import { useContext } from 'react'
import { Field, Textarea, SectionCard } from '../didShared'
import { EtapaDidContext, ResponsavelEtapa, RecebidoEmEtapa } from '../EtapasDid'

export default function DidFixasSecaoII({ form, inp, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel } = useContext(EtapaDidContext)
  const locked = !editavel

  return (
    <SectionCard icon={Shield} title="Seção II - Controle Interno"
      color="bg-indigo-700 text-white dark:bg-indigo-900">
      <Field label="Recebido em" half>
        <RecebidoEmEtapa valor={form.ci_recebido_em} />
      </Field>
      <Field label="Responsável" half>
        <ResponsavelEtapa valor={form.ci_responsavel} />
      </Field>
      <Field label="Despacho via C.I.">
        <Textarea value={form.despacho_ci} onChange={inp('despacho_ci')} disabled={locked} />
      </Field>
    </SectionCard>
  )
}
