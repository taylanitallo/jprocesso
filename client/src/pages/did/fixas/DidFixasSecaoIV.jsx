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

export default function DidFixasSecaoIV({ form, inp, didId }) {
  // Editável só na etapa atual, para quem pode preenchê-la (fluxo por etapas)
  const { editavel } = useContext(EtapaDidContext)
  const locked = !editavel

  const empenhado = form.contabil_empenhado === 'sim'
  const liquidado = form.contabil_liquidado === 'sim'
  const camposEmpenhoDisabled = locked || !empenhado
  const camposLiquidacaoDisabled = locked || !liquidado

  return (
    <SectionCard icon={Calculator} title="Seção IV - Contabilidade"
      color="bg-purple-700 text-white dark:bg-purple-900">
      <Field label="Recebido em" half>
        <RecebidoEmEtapa valor={form.contabil_recebido_em} />
      </Field>
      <Field label="Responsável" half>
        <ResponsavelEtapa valor={form.contabil_responsavel} />
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
      <Field label="Está liquidado?">
        <SimNao value={form.contabil_liquidado} onChange={inp('contabil_liquidado')} disabled={locked} />
      </Field>
      <Field label="Liquidação Nº" half>
        <Input value={form.liquidacao_numero} onChange={inp('liquidacao_numero')} disabled={camposLiquidacaoDisabled} />
      </Field>
      <Field label="Data da Liquidação" half>
        <Input type="date" value={form.data_liquidacao} onChange={inp('data_liquidacao')} disabled={camposLiquidacaoDisabled} />
      </Field>
      <Field label="Doc. Caixa" half>
        <Input value={form.doc_caixa} onChange={inp('doc_caixa')} disabled={camposLiquidacaoDisabled} />
      </Field>
    </SectionCard>
  )
}
