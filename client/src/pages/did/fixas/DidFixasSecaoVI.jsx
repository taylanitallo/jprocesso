import { Banknote, Pencil } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Field, Input, UserSelect, Checkbox, SectionCard, SecaoBotoes, alertarPendencias, ConfirmModal } from '../didShared'
import { BANCOS } from '../bancosBrasil'
import api from '../../../services/api'
import DisponivelConta, { useDisponivelConta, valorQuePesa } from '../DisponivelConta'

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

function ContaSelect({ value, onChange, disabled, onSelect }) {
  const [contas, setContas] = useState([])
  useEffect(() => {
    api.get('/organizacao/contas-bancarias?ativo=true')
      .then(({ data }) => setContas(data.contas || []))
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    onChange(e)
    if (onSelect) {
      const conta = contas.find(c => c.id === e.target.value) || null
      onSelect(conta)
    }
  }

  const cls = `input-field text-sm${disabled ? ' opacity-60 cursor-not-allowed bg-ink-50' : ''}`
  return (
    <select value={value ?? ''} onChange={handleChange} disabled={disabled} className={cls}>
      <option value="">— Selecione a conta —</option>
      {contas.map(c => (
        <option key={c.id} value={c.id}>
          {c.nome}{c.secretaria ? ` (${c.secretaria.sigla})` : ''} — {c.banco_nome || ''} Ag.{c.agencia} C/C {c.conta}{c.conta_digito ? `-${c.conta_digito}` : ''}
        </option>
      ))}
    </select>
  )
}

export default function DidFixasSecaoVI({ form, inp, chk, vliq, saving, didId, onSave, onLimpar }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => { if (didId) setLocked(true) }, [didId])

  // "Pago" salvo (seção travada mostra o que está gravado): só então o DID já está no saldo
  const pagoSalvo = useRef(form.pago)
  useEffect(() => { if (locked) pagoSalvo.current = form.pago }, [locked, form.pago])
  const situacaoConta = useDisponivelConta(form.conta_pagamento_id, didId)

  const [editarBancoCredor, setEditarBancoCredor] = useState(false)
  const [confirmarBancoCredor, setConfirmarBancoCredor] = useState(false)
  const [editarFonte, setEditarFonte] = useState(false)
  const [confirmarFonte, setConfirmarFonte] = useState(false)
  useEffect(() => { if (locked) { setEditarBancoCredor(false); setEditarFonte(false) } }, [locked])

  const salvar = async () => {
    const completo = alertarPendencias([
      { ok: !!form.tesouraria_recebido_em, label: 'Recebido em' },
      { ok: !!form.tesouraria_responsavel, label: 'Responsável' },
      { ok: !!form.conta_pagamento_id, label: 'Conta de Pagamento' },
      ...(form.pago === 'sim' ? [{ ok: !!form.data_pagamento, label: 'Data do pagamento' }] : []),
    ], 'Seção VI')
    if (!completo) return
    // Aviso (não bloqueia): o DID passa do que a conta tem disponível
    const pesa = valorQuePesa(form, pagoSalvo.current === 'sim')
    if (situacaoConta && pesa > 0 && pesa > situacaoConta.disponivel) {
      const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      const seguir = window.confirm(
        `A conta escolhida tem ` + fmt(situacaoConta.disponivel) + ` disponível e este DID é de ` + fmt(pesa) +
        `.

Deseja salvar mesmo assim?`
      )
      if (!seguir) return
    }
    const ok = await onSave?.()
    if (ok !== false) setLocked(true)
  }

  const limpar = () => { setLocked(false); onLimpar?.() }

  return (
    <>
    <SectionCard icon={Banknote} title="Seção VI - Tesouraria"
      color="bg-success-700 text-white dark:bg-success-900">

      <Field label="Recebido em" half>
        <Input type="date" value={form.tesouraria_recebido_em} onChange={inp('tesouraria_recebido_em')} disabled={locked} />
      </Field>
      <Field label="Responsável" half>
        <UserSelect value={form.tesouraria_responsavel} onChange={inp('tesouraria_responsavel')} disabled={locked} secretaria="tesouraria" />
      </Field>
      <Field label="Conta de Pagamento">
        <ContaSelect
          value={form.conta_pagamento_id}
          onChange={inp('conta_pagamento_id')}
          disabled={locked}
          onSelect={(c) => {
            inp('banco_pagador')({ target: { value: c?.banco_nome ? `${c.banco_nome}${c.banco_codigo ? ` - ${c.banco_codigo}` : ''}` : '' } })
            inp('ag_pagador')({ target: { value: c?.agencia ? `${c.agencia}${c.agencia_digito ? `-${c.agencia_digito}` : ''}` : '' } })
            inp('cc_pagador')({ target: { value: c?.conta ? `${c.conta}${c.conta_digito ? `-${c.conta_digito}` : ''}` : '' } })
          }}
        />
      </Field>

      <DisponivelConta situacao={situacaoConta} form={form} jaPago={pagoSalvo.current === 'sim'} />

      {/* Dados do pagamento */}
      <div className="col-span-2">
        <p className="text-xs font-semibold text-ink-500 mb-2 uppercase tracking-wide">
          Dados do Pagamento
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Banco</label>
            <Input value={form.banco_pagador} onChange={inp('banco_pagador')} disabled />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Ag.</label>
            <Input value={form.ag_pagador} onChange={inp('ag_pagador')} disabled />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">C/C</label>
            <Input value={form.cc_pagador} onChange={inp('cc_pagador')} disabled />
          </div>
        </div>
      </div>

      {/* Dados bancários do credor — informados na Seção I, alteráveis mediante confirmação */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
            Dados Bancários do Credor <span className="normal-case font-normal text-ink-400">(informados na Seção I)</span>
          </p>
          {!locked && !editarBancoCredor && (
            <button type="button" onClick={() => setConfirmarBancoCredor(true)}
              className="flex items-center gap-1 text-xs text-brand-600 dark:text-info-400 hover:text-brand-700 font-semibold">
              <Pencil className="w-3 h-3" /> Alterar
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Banco</label>
            <Input value={form.banco_fornecedor} onChange={inp('banco_fornecedor')} disabled={locked || !editarBancoCredor} />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Ag.</label>
            <Input value={form.ag_fornecedor} onChange={inp('ag_fornecedor')} disabled={locked || !editarBancoCredor} />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">C/C</label>
            <Input value={form.cc_fornecedor} onChange={inp('cc_fornecedor')} disabled={locked || !editarBancoCredor} />
          </div>
        </div>
      </div>

      {/* Fonte de Recurso — definida na Seção I, alterável mediante confirmação */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
            Fonte de Recurso <span className="normal-case font-normal text-ink-400">(definida na Seção I)</span>
          </p>
          {!locked && !editarFonte && (
            <button type="button" onClick={() => setConfirmarFonte(true)}
              className="flex items-center gap-1 text-xs text-brand-600 dark:text-info-400 hover:text-brand-700 font-semibold">
              <Pencil className="w-3 h-3" /> Alterar
            </button>
          )}
        </div>
        <Input value={form.fonte_recurso} onChange={inp('fonte_recurso')} disabled={locked || !editarFonte} />
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

      {/* Status de Pagamento */}
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
        {form.pago === 'sim' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-600">Data do pagamento</label>
            <Input type="date" value={form.data_pagamento || ''} onChange={inp('data_pagamento')} disabled={locked} />
          </div>
        )}
        {form.pago === 'sim' && (
          <p className="text-[11px] text-ink-500 text-center max-w-md">
            A conta é debitada pelo valor líquido nesta data. As retenções (INSS, ISS, IRRF…) ficam
            em Tesouraria › Despesas › Retenções a recolher até serem recolhidas.
          </p>
        )}
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

      <SecaoBotoes locked={locked} onAlterar={() => setLocked(false)} onSalvar={salvar} saving={saving} label="Salvar Seção VI" onLimpar={limpar} />
    </SectionCard>

    {confirmarBancoCredor && (
      <ConfirmModal
        title="Alterar dados bancários do credor?"
        message="Esses dados definem para qual conta o pagamento será enviado. Eles foram preenchidos a partir da Seção I — confirme apenas se o credor realmente informou uma conta diferente."
        confirmLabel="Sim, liberar edição"
        onConfirm={() => { setEditarBancoCredor(true); setConfirmarBancoCredor(false) }}
        onClose={() => setConfirmarBancoCredor(false)}
      />
    )}

    {confirmarFonte && (
      <ConfirmModal
        title="Alterar a Fonte de Recurso?"
        message="Este campo é o mesmo da Seção I — ao alterar aqui, a Seção I e os painéis/relatórios financeiros também vão refletir a nova fonte. Confirme apenas se a fonte de recurso realmente mudou."
        confirmLabel="Sim, liberar edição"
        onConfirm={() => { setEditarFonte(true); setConfirmarFonte(false) }}
        onClose={() => setConfirmarFonte(false)}
      />
    )}
    </>
  )
}
