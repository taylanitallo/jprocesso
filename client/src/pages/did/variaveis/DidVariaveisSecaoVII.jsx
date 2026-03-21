import { ClipboardCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, Textarea, Checkbox, SectionCard, SecaoBotoes } from '../didShared'

export default function DidVariaveisSecaoVII({ form, inp, chk, saving, didId, onSave }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard
      icon={ClipboardCheck}
      title="Seção VII - Almoxarifado (Recebimento)"
      color="bg-gray-500 text-white dark:bg-gray-700"
    >
      {/* Badge exclusivo */}
      <div className="col-span-2 flex items-center gap-2 -mt-1 mb-1">
        <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300
          px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-700 font-semibold">
          📊 Exclusivo — DID Contas Variáveis
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Fiscal do contrato atesta o recebimento dos itens
        </span>
      </div>

      {/* Data de Recebimento | Data da NF */}
      <Field label="Data de Recebimento" half>
        <Input
          type="date"
          value={form.receb_data}
          onChange={inp('receb_data')}
          disabled={locked}
        />
      </Field>
      <Field label="Data da Nota Fiscal" half>
        <Input
          type="date"
          value={form.receb_nf_data}
          onChange={inp('receb_nf_data')}
          disabled={locked}
        />
      </Field>

      {/* Fiscal | Cargo */}
      <Field label="Fiscal do Contrato / Responsável" half>
        <Input
          value={form.receb_responsavel}
          onChange={inp('receb_responsavel')}
          placeholder="Nome do servidor..."
          disabled={locked}
        />
      </Field>
      <Field label="Cargo / Matrícula" half>
        <Input
          value={form.receb_cargo}
          onChange={inp('receb_cargo')}
          placeholder="Ex: Fiscal de Contrato / Mat. 1234"
          disabled={locked}
        />
      </Field>

      {/* Checklist de conferência */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Conferência dos Itens Entregues
        </label>
        <div className="flex flex-wrap gap-6">
          <Checkbox
            label="Nota Fiscal conferida"
            checked={form.receb_nf_conferida}
            onChange={chk('receb_nf_conferida')}
            disabled={locked}
          />
          <Checkbox
            label="Quantidades conferidas"
            checked={form.receb_qtd_conferida}
            onChange={chk('receb_qtd_conferida')}
            disabled={locked}
          />
          <Checkbox
            label="Especificações conformes"
            checked={form.receb_esp_conforme}
            onChange={chk('receb_esp_conforme')}
            disabled={locked}
          />
        </div>
      </div>

      {/* Enviado NF para setor de compras */}
      <Field label="Enviado NF para setor de compras" half>
        <Input
          type="date"
          value={form.receb_nf_enviado_compras}
          onChange={inp('receb_nf_enviado_compras')}
          disabled={locked}
        />
      </Field>
      <div className="col-span-1" />

      {/* Observações */}
      <Field label="Observações do Recebimento">
        <Textarea
          value={form.receb_obs}
          onChange={inp('receb_obs')}
          placeholder="Observações sobre o recebimento dos itens..."
          disabled={locked}
        />
      </Field>

      <SecaoBotoes
        locked={locked}
        onAlterar={() => setLocked(false)}
        onSalvar={salvar}
        saving={saving}
        label="Salvar Atestado"
      />
    </SectionCard>
  )
}
