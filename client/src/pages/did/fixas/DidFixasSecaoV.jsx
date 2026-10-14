import { Landmark } from 'lucide-react'
import { useContext } from 'react'
import { Field, Input, SectionCard } from '../didShared'
import { EtapaDidContext, ResponsavelEtapa, RecebidoEmEtapa } from '../EtapasDid'

export default function DidFixasSecaoV({ form, inp, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel } = useContext(EtapaDidContext)
  const locked = !editavel

  return (
    <SectionCard icon={Landmark} title="Seção V - Secretaria de Finanças"
      color="bg-teal-700 text-white dark:bg-teal-900">
      <Field label="Recebido em" half>
        <RecebidoEmEtapa valor={form.financas2_recebido_em} />
      </Field>
      <Field label="Responsável" half>
        <ResponsavelEtapa valor={form.financas2_responsavel} />
      </Field>
      <Field label="Enviado para Pagamento" half>
        <Input type="date" value={form.financas2_enviado_pagamento} onChange={inp('financas2_enviado_pagamento')} disabled={locked} />
      </Field>
    </SectionCard>
  )
}
