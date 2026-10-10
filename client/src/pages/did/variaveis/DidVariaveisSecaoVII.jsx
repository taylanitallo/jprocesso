import { ClipboardCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, Textarea, Checkbox, SectionCard, SecaoBotoes, alertarPendencias } from '../didShared'

export default function DidVariaveisSecaoVII({ form, inp, chk, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.receb_ordem_recebida, label: 'A ordem foi recebida? (Sim/Não)' },
      { ok: !!form.receb_data, label: 'Data de Recebimento' },
      { ok: !!form.receb_nf_data, label: 'Data da Nota Fiscal' },
      { ok: !!form.receb_responsavel, label: 'Fiscal do Contrato / Responsável' },
      { ok: !!form.receb_cargo, label: 'Cargo / Matrícula' },
    ], 'Seção VII')
    if (!completo) return
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <SectionCard
      icon={ClipboardCheck}
      title="Seção VII - Almoxarifado (Recebimento)"
      color="bg-ink-500 text-white"
    >
      {/* Badge exclusivo */}
      <div className="col-span-2 flex items-center gap-2 -mt-1 mb-1">
        <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300
          px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-700 font-semibold">
          📊 Exclusivo — DID Contas Variáveis
        </span>
        <span className="text-xs text-ink-500">
          Fiscal do contrato atesta o recebimento dos itens
        </span>
      </div>

      {/* Ordem recebida? — controla a liberação da ordem na aba Entrada do Almoxarifado */}
      <div className="col-span-2 flex flex-col items-center gap-3 py-3 border-b border-ink-200 mb-2">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-widest">
          A ordem de compra foi recebida?
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={locked}
            onClick={() => inp('receb_ordem_recebida')({ target: { value: 'sim' } })}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors shadow-sm
              ${ form.receb_ordem_recebida === 'sim'
                ? 'bg-success-600 border-success-600 text-white'
                : 'bg-surface border-ink-300 text-ink-500 hover:border-success-500 hover:text-success-600'
              }
              ${ locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer' }`}
          >
            ✓ Sim — Recebida
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => inp('receb_ordem_recebida')({ target: { value: 'nao' } })}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors shadow-sm
              ${ form.receb_ordem_recebida === 'nao'
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-surface border-ink-300 text-ink-500 hover:border-orange-400 hover:text-orange-500'
              }
              ${ locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer' }`}
          >
            ⏳ Não recebida
          </button>
        </div>
        <p className="text-[11px] text-ink-400 text-center max-w-md">
          {form.receb_ordem_recebida === 'sim'
            ? '✓ Esta ordem ficará disponível na busca da aba Entrada do Almoxarifado.'
            : 'Enquanto não marcada como recebida, esta ordem não aparece na busca da aba Entrada do Almoxarifado.'}
        </p>
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
        <label className="block text-xs font-medium text-ink-500 mb-2">
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
        onLimpar={limpar}
      />
    </SectionCard>
  )
}
