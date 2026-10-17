// Etapa personalizada do fluxo do município (Configurações › Fluxos de Processo):
// campos simples definidos na configuração, gravados em form.etapas_dados[etapaId].
import { contextoFormulario } from '../../utils/sugestaoAyla'
import { useContext } from 'react'
import { ClipboardList } from 'lucide-react'
import { Field, Input, Textarea, Checkbox, SectionCard } from './didShared'
import { EtapaDidContext, ResponsavelEtapa } from './EtapasDid'

export default function EtapaPersonalizada({ etapa, form, set }) {
  const { editavel, titulo } = useContext(EtapaDidContext)
  const locked = !editavel
  const dados = form.etapas_dados?.[etapa.id] || {}
  const mudar = (campo, valor) => set('etapas_dados', {
    ...(form.etapas_dados || {}),
    [etapa.id]: { ...dados, [campo]: valor },
  })
  const rotulo = (c) => `${c.rotulo}${c.obrigatorio ? '' : ' (opcional)'}`

  return (
    <SectionCard icon={ClipboardList} title={titulo || etapa.titulo} color="bg-teal-700 text-white dark:bg-teal-900">
      {editavel && (
        <Field label="Responsável">
          <ResponsavelEtapa />
        </Field>
      )}
      {etapa.campos.map((c) => {
        const id = `${etapa.id}-${c.campo}`
        const v = dados[c.campo]
        if (c.personalizado === 'texto') {
          return (
            <Field key={c.campo} label={rotulo(c)}>
              <Textarea value={v} onChange={e => mudar(c.campo, e.target.value)} disabled={locked} rows={4}
                sugestao={{ campo: `did.etapa.${String(c.campo).slice(0, 60)}`, rotulo: `${c.rotulo} — etapa "${titulo || etapa.titulo}" do DID`, contexto: contextoFormulario(form) }} />
            </Field>
          )
        }
        if (c.personalizado === 'data') {
          return (
            <Field key={c.campo} label={rotulo(c)} half>
              <Input type="date" id={id} value={v} onChange={e => mudar(c.campo, e.target.value)} disabled={locked} />
            </Field>
          )
        }
        if (c.personalizado === 'documento') {
          return (
            <Field key={c.campo} label={rotulo(c)} half>
              <Input id={id} value={v} onChange={e => mudar(c.campo, e.target.value)} disabled={locked} maxLength={120} />
            </Field>
          )
        }
        if (c.personalizado === 'simnao') {
          return (
            <fieldset key={c.campo} className="col-span-2">
              <legend className="block text-xs font-medium mb-1 text-ink-500">{rotulo(c)}</legend>
              <div className="flex gap-4">
                {[['sim', 'Sim'], ['nao', 'Não']].map(([val, txt]) => (
                  <label key={val} className={`flex items-center gap-2 text-sm text-ink-700${locked ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer'}`}>
                    <input type="radio" name={id} value={val} checked={v === val} disabled={locked}
                      onChange={() => mudar(c.campo, val)} className="w-4 h-4 accent-brand-600" />
                    {txt}
                  </label>
                ))}
              </div>
            </fieldset>
          )
        }
        if (c.personalizado === 'checklist') {
          const marcados = v || {}
          return (
            <fieldset key={c.campo} className="col-span-2">
              <legend className="block text-xs font-medium mb-1 text-ink-500">{rotulo(c)}</legend>
              <div className="space-y-1.5">
                {(c.itens || []).map((item, i) => (
                  <Checkbox key={i} label={item} checked={marcados[i] === true} disabled={locked}
                    onChange={e => mudar(c.campo, { ...marcados, [i]: e.target.checked })} />
                ))}
              </div>
            </fieldset>
          )
        }
        return null
      })}
    </SectionCard>
  )
}
