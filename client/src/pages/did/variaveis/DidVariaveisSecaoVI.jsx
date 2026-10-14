import { ShoppingCart } from 'lucide-react'
import { useContext } from 'react'
import { Field, Input, SectionCard } from '../didShared'
import { EtapaDidContext, ResponsavelEtapa, RecebidoEmEtapa } from '../EtapasDid'

export default function DidVariaveisSecaoVI({ form, inp, set, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel } = useContext(EtapaDidContext)
  const locked = !editavel

  return (
    <SectionCard icon={ShoppingCart} title="Seção VI - Setor de Compras (Ordem de Compra)"
      color="bg-orange-600 text-white dark:bg-orange-900">
      <Field label="Recebido em" half>
        <RecebidoEmEtapa valor={form.compras_recebido_em} />
      </Field>
      <Field label="Responsável" half>
        <ResponsavelEtapa valor={form.compras_responsavel} />
      </Field>

      <Field label="Nº Ordem de Compra" half>
        <Input value={form.nro_empenho_solicitacao} onChange={inp('nro_empenho_solicitacao')} disabled={locked} />
      </Field>
      <Field label="Local de Entrega" half>
        <Input value={form.local_entrega} onChange={inp('local_entrega')} disabled={locked} />
      </Field>
    </SectionCard>
  )
}
