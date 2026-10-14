import { Landmark } from 'lucide-react'
import { useContext } from 'react'
import { Field, SectionCard } from '../didShared'
import { EtapaDidContext, ResponsavelEtapa, RecebidoEmEtapa } from '../EtapasDid'

export default function DidVariaveisSecaoIII({ form, inp, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel } = useContext(EtapaDidContext)
  const locked = !editavel

  return (
    <SectionCard icon={Landmark} title="Seção III - Secretaria de Finanças"
      color="bg-teal-700 text-white dark:bg-teal-900">
      <Field label="Recebido em" half>
        <RecebidoEmEtapa valor={form.financas_recebido_em} />
      </Field>
      <Field label="Responsável" half>
        <ResponsavelEtapa valor={form.financas_responsavel} />
      </Field>
    </SectionCard>
  )
}
