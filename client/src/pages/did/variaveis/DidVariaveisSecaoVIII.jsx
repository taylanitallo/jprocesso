import { ShoppingCart } from 'lucide-react'
import { useContext } from 'react'
import { Field, Input, SectionCard } from '../didShared'
import { EtapaDidContext, ResponsavelEtapa, RecebidoEmEtapa } from '../EtapasDid'

export default function DidVariaveisSecaoVIII({ form, inp, set, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel, titulo } = useContext(EtapaDidContext)
  const locked = !editavel

  return (
    <SectionCard icon={ShoppingCart} title={titulo || 'Seção VIII - Setor de Compras (Ateste de NF)'}
      color="bg-orange-600 text-white dark:bg-orange-900">
      <Field label="Recebido em" half>
        <RecebidoEmEtapa valor={form.compras3_recebido_em} />
      </Field>
      <Field label="Responsável" half>
        <ResponsavelEtapa valor={form.compras3_responsavel} />
      </Field>

      <Field label="Data de envio para liquidação" half>
        <Input type="date" value={form.compras3_local_entrega} onChange={inp('compras3_local_entrega')} disabled={locked} />
      </Field>
    </SectionCard>
  )
}
