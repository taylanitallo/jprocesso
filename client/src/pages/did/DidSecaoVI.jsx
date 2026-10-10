import { Banknote } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Field, Input, UserSelect, Checkbox, SectionCard, SecaoBotoes } from './didShared'
import { BANCOS } from './bancosBrasil'

function BancoSelect({ value, onChange, disabled }) {
  const [query, setQuery] = useState('')
  const q = query.toLowerCase()
  const filtrados = (!disabled && q.length >= 2)
    ? BANCOS.filter(b =>
        b.nome.toLowerCase().includes(q) ||
        b.cod.includes(q)
      ).slice(0, 10)
    : []

  function selecionar(b) {
    const texto = `${b.nome} - ${b.cod}`
    onChange({ target: { value: texto } })
    setQuery(texto)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query || value}
        onChange={e => { setQuery(e.target.value); onChange({ target: { value: e.target.value } }) }}
        disabled={disabled}
        placeholder="Digite o nome ou código..."
        className={`input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`}
      />
      {filtrados.length > 0 && (
        <ul className="absolute z-50 w-full bg-surface border border-ink-300 rounded-sm shadow-lg max-h-48 overflow-y-auto mt-0.5">
          {filtrados.map(b => (
            <li
              key={b.cod}
              onMouseDown={() => selecionar(b)}
              className="px-2 py-1 text-sm cursor-pointer hover:bg-info-50 dark:hover:bg-info-900
                         text-ink-900"
            >
              {b.nome} - {b.cod}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DidSecaoVI({ form, inp, chk, vliq, saving, didId, onSave }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  const salvar = async () => {
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  return (
    <SectionCard icon={Banknote} title="Seção VI - Tesouraria"
      color="bg-success-700 text-white dark:bg-success-900">

      <Field label="Recebido em" half>
        <Input type="date" value={form.tesouraria_recebido_em} onChange={inp('tesouraria_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <UserSelect value={form.tesouraria_responsavel} onChange={inp('tesouraria_responsavel')} disabled={locked} secretaria="tesouraria" />
      </Field>

      {/* Dados do pagamento */}
      <div className="col-span-2">
        <p className="text-xs font-semibold text-ink-500 mb-2 uppercase tracking-wide">
          Dados do Pagamento
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Banco</label>
            <BancoSelect value={form.banco_pagador} onChange={inp('banco_pagador')} disabled={locked} />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Ag.</label>
            <Input value={form.ag_pagador} onChange={inp('ag_pagador')} disabled={locked} />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">C/C</label>
            <Input value={form.cc_pagador} onChange={inp('cc_pagador')} disabled={locked} />
          </div>
        </div>
      </div>

      {/* Certidões Tesouraria */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-ink-500 mb-2">Certidões</label>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="Municipal" checked={form.cert_teso_municipal} onChange={chk('cert_teso_municipal')} disabled={locked} />
          <Checkbox label="Trabalhista" checked={form.cert_teso_trabalhista} onChange={chk('cert_teso_trabalhista')} disabled={locked} />
          <Checkbox label="FGTS" checked={form.cert_teso_fgts} onChange={chk('cert_teso_fgts')} disabled={locked} />
          <Checkbox label="Estadual" checked={form.cert_teso_estadual} onChange={chk('cert_teso_estadual')} disabled={locked} />
          <Checkbox label="Federal" checked={form.cert_teso_federal} onChange={chk('cert_teso_federal')} disabled={locked} />
          <Checkbox label="Simples Nacional" checked={form.cert_teso_simples_nac} onChange={chk('cert_teso_simples_nac')} disabled={locked} />
        </div>
      </div>
      {/* Demonstrativo de Descontos */}
      <div className="col-span-2">
        <div className="bg-ink-800 text-white text-xs font-bold px-3 py-2 rounded-t-lg uppercase tracking-wide">
          Demonstrativo de Descontos
        </div>
        <div className="border border-ink-200 rounded-b-lg p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Valor Bruto (R$)</label>
            <div className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 text-ink-700 font-mono">
              {parseFloat(form.valor_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Desconto INSS (R$)</label>
            <Input type="number" value={form.desconto_inss} onChange={inp('desconto_inss')} placeholder="0.00" disabled={locked} />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Desconto ISS (R$)</label>
            <Input type="number" value={form.desconto_iss} onChange={inp('desconto_iss')} placeholder="0.00" disabled={locked} />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Desconto IRRF (R$)</label>
            <Input type="number" value={form.desconto_irrf} onChange={inp('desconto_irrf')} placeholder="0.00" disabled={locked} />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Outros (R$)</label>
            <Input type="number" value={form.desconto_outros} onChange={inp('desconto_outros')} placeholder="0.00" disabled={locked} />
          </div>
          <div className="flex items-end">
            <div className="w-full bg-ink-50 rounded-lg px-3 py-2 border border-ink-200">
              <p className="text-xs text-ink-500 mb-0.5">Valor Líquido</p>
              <p className="text-base font-bold text-success-700 dark:text-success-400">
                R$ {vliq.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status de Pagamento (centralizado, ao final) ── */}
      <div className="col-span-2 flex flex-col items-center gap-3 py-4 border-t border-ink-200 mt-2">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-widest">
          Status de Pagamento
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={locked}
            onClick={() => inp('pago')({ target: { value: 'sim' } })}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors shadow-sm
              ${ form.pago === 'sim'
                ? 'bg-success-600 border-success-600 text-white'
                : 'bg-surface border-ink-300 text-ink-500 hover:border-success-500 hover:text-success-600'
              }
              ${ locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer' }`}
          >
            ✓ Sim — Pago
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => inp('pago')({ target: { value: 'nao' } })}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors shadow-sm
              ${ form.pago === 'nao'
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-surface border-ink-300 text-ink-500 hover:border-orange-400 hover:text-orange-500'
              }
              ${ locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer' }`}
          >
            ⏳ Não — Pendente
          </button>
        </div>
        {form.pago && (
          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold
            ${ form.pago === 'sim'
              ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            }`}>
            { form.pago === 'sim' ? '✓ Despesa paga' : '⚠ Pendente de pagamento' }
          </span>
        )}
      </div>

      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção VI" />
    </SectionCard>
  )
}
