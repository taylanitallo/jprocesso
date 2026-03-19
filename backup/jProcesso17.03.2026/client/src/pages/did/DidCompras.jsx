import { ShoppingCart } from 'lucide-react'
import { Field, Input, SectionCard } from './didShared'

export default function DidSecaoIII({ form, inp, set }) {
  return (
    <SectionCard icon={ShoppingCart} title="III — Ao Setor de Compras"
      color="bg-orange-600 text-white dark:bg-orange-900">
      <Field label="Recebido em" half>
        <Input type="date" value={form.compras_recebido_em} onChange={inp('compras_recebido_em')} />
      </Field>
      <Field label="Responsável" half>
        <Input value={form.compras_responsavel} onChange={inp('compras_responsavel')} />
      </Field>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Situação</label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="radio" name="licitado" checked={form.ja_licitado === true}
              onChange={() => set('ja_licitado', true)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
            Já Licitado
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="radio" name="licitado" checked={form.ja_licitado === false}
              onChange={() => set('ja_licitado', false)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
            Não Licitado
          </label>
        </div>
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Realizar Cotação</label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="radio" name="cotacao" checked={form.realizar_cotacao === true}
              onChange={() => set('realizar_cotacao', true)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
            Sim
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="radio" name="cotacao" checked={form.realizar_cotacao === false}
              onChange={() => set('realizar_cotacao', false)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
            Não
          </label>
        </div>
      </div>
      <Field label="Nº Licitação" half>
        <Input value={form.nro_licitacao} onChange={inp('nro_licitacao')} />
      </Field>
      <Field label="Modalidade" half>
        <Input value={form.modalidade} onChange={inp('modalidade')} placeholder="Pregão, Tomada de Preços..." />
      </Field>
      <Field label="Data" half>
        <Input type="date" value={form.data_compras} onChange={inp('data_compras')} />
      </Field>
      <Field label="Responsável Compras" half>
        <Input value={form.responsavel_compras} onChange={inp('responsavel_compras')} />
      </Field>
      <Field label="Nº Solicitação de Empenho" half>
        <Input value={form.nro_empenho_solicitacao} onChange={inp('nro_empenho_solicitacao')} />
      </Field>
      <Field label="Local de Entrega" half>
        <Input value={form.local_entrega} onChange={inp('local_entrega')} />
      </Field>
    </SectionCard>
  )
}
