import { Calculator } from 'lucide-react'
import { useContext } from 'react'
import { Field, Input, UserSelect, SectionCard } from '../didShared'
import { EtapaDidContext, ResponsavelEtapa, RecebidoEmEtapa } from '../EtapasDid'

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

export default function DidVariaveisSecaoIX({ form, inp, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel } = useContext(EtapaDidContext)
  const locked = !editavel

  const liquidado = form.contabil_pc_liquidado === 'sim'
  const camposLiquidacaoDisabled = locked || !liquidado

  return (
    <SectionCard icon={Calculator} title="Seção IX - Contabilidade (Liquidação)"
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Recebido em" half>
        <RecebidoEmEtapa valor={form.contabil_pc_recebido_em} />
      </Field>
      <Field label="Responsável" half>
        <ResponsavelEtapa valor={form.contabil_pc_responsavel} />
      </Field>
      <Field label="Auditor">
        <UserSelect value={form.contabil_pc_auditor} onChange={inp('contabil_pc_auditor')} disabled={locked} secretaria="contabil" />
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
    </SectionCard>
  )
}
