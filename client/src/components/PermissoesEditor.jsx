import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MODULOS } from '../utils/permissoesSchema'
import { useAuth } from '../context/AuthContext'

// Módulo de permissão → módulo contratável do município (sem entrada: sempre aparece)
const MODULO_CONTRATADO = {
  processos: 'processos', arquivo: 'processos', almoxarifado: 'almoxarifado', patrimonio: 'patrimonio',
  financeiro: 'financeiro', contratos: 'contratos', tesouraria: 'tesouraria',
}

// ── helpers ───────────────────────────────────────────────────────────────────
const getIn = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj)

const setIn = (obj, path, value) => {
  if (path.length === 1) return { ...obj, [path[0]]: value }
  return { ...obj, [path[0]]: setIn(obj?.[path[0]] ?? {}, path.slice(1), value) }
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-brand-600' : 'bg-ink-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  )
}

// ── Scope select — substitui o Toggle para ações "ver" ────────────────────────
const SCOPE_OPTIONS = [
  { value: 'none',    label: 'Bloqueado',     cls: 'bg-danger-500 text-white' },
  { value: 'propria', label: 'Só sua sec.',   cls: 'bg-info-500 text-white' },
  { value: 'todas',   label: 'Todas',         cls: 'bg-success-500 text-white' },
  { value: 'algumas', label: 'Específicas…',  cls: 'bg-amber-600 text-white' },
]

function ScopeSelect({ value, onChange }) {
  const normalized = value === false ? 'none'
    : value === 'todas'   ? 'todas'
    : value === 'algumas' ? 'algumas'
    : 'propria'

  const active = SCOPE_OPTIONS.find(o => o.value === normalized)

  return (
    <div className="relative inline-block">
      <select
        value={normalized}
        onChange={e => {
          const v = e.target.value
          onChange(v === 'none' ? false : v)
        }}
        className={`h-5 text-[10px] font-semibold pl-1.5 pr-5 rounded-sm border-0 appearance-none cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-info-400 ${active?.cls ?? 'bg-ink-200 text-ink-600'}`}
        style={{ minWidth: '82px' }}
      >
        {SCOPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[8px] opacity-60">▼</span>
    </div>
  )
}

// ── Checkboxes de secretarias para scope "Algumas" ────────────────────────────
function SecretariasCheckboxes({ secretariaIds, secretariasList, onChange }) {
  if (secretariasList.length === 0) {
    return <span className="text-[10px] text-ink-400 italic">Nenhuma secretaria disponível</span>
  }
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {secretariasList.map(s => (
        <label key={s.id} className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={(secretariaIds || []).includes(s.id)}
            onChange={e => {
              const ids = secretariaIds || []
              onChange(e.target.checked ? [...ids, s.id] : ids.filter(id => id !== s.id))
            }}
            className="w-3 h-3 accent-info-600"
          />
          <span className="text-ink-600">{s.sigla ? `${s.sigla} – ${s.nome}` : s.nome}</span>
        </label>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PermissoesEditor({ permissoes, onChange, secretariasList = [] }) {
  const [open, setOpen] = useState({})
  const { tenant } = useAuth()

  const perm = permissoes ?? {}

  // Só os módulos liberados para o município (mesma regra do menu lateral)
  const modHabilitados = tenant?.configuracoes?.modulos_habilitados
  const modulosVisiveis = MODULOS.filter(mod => {
    const contratado = MODULO_CONTRATADO[mod.key]
    if (!contratado || modHabilitados === undefined) return true
    return Array.isArray(modHabilitados) && modHabilitados.includes(contratado)
  })

  // ── leitura/escrita de ações simples (boolean) ────────────────────────────
  // Sem configuração vale o padrão da ação: ligada, exceto as com padrao:false
  // (ex.: Excluídos, que só administradores têm até alguém ligar)
  const get = (modKey, acao, ...path) => {
    const val = getIn(perm[modKey], [...path, acao.key])
    if (val === undefined) return acao.padrao !== false
    return val !== false
  }

  const set = (modKey, value, ...path) => {
    const newMod = setIn(perm[modKey] ?? {}, path, value)
    onChange({ ...perm, [modKey]: newMod })
  }

  // ── leitura/escrita de escopo de "ver" ────────────────────────────────────
  // parentPath: [] para módulos diretos, ['abaKey'] para módulos com abas
  const getVerScope = (modKey, ...parentPath) => {
    const val  = getIn(perm[modKey], [...parentPath, 'ver'])
    const secs = getIn(perm[modKey], [...parentPath, 'ver_secretarias']) || []
    if (val === false)   return { scope: false,    secretariaIds: [] }
    if (val === 'todas') return { scope: 'todas',  secretariaIds: [] }
    if (val === 'algumas') return { scope: 'algumas', secretariaIds: secs }
    return { scope: 'propria', secretariaIds: [] }
  }

  const setVerScope = (modKey, scope, secretariaIds, ...parentPath) => {
    let newMod = setIn(perm[modKey] ?? {}, [...parentPath, 'ver'], scope)
    newMod = setIn(newMod, [...parentPath, 'ver_secretarias'], scope === 'algumas' ? secretariaIds : [])
    onChange({ ...perm, [modKey]: newMod })
  }

  const setAccess = (modKey, value) => {
    onChange({ ...perm, [modKey]: { ...(perm[modKey] ?? {}), acessar: value } })
  }

  const toggle = (id) => setOpen(o => ({ ...o, [id]: !o[id] }))

  return (
    <div className="space-y-2">
      {modulosVisiveis.map(mod => {
        const isOpen = open[mod.key] ?? false
        const acessar = mod.comAcesso ? (perm[mod.key]?.acessar !== false) : true

        return (
          <div key={mod.key} className="border border-ink-200 rounded-xl overflow-hidden">
            {/* Header do módulo */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-ink-50">
              {mod.comAcesso && (
                <Toggle
                  checked={acessar}
                  onChange={v => setAccess(mod.key, v)}
                />
              )}
              <button
                type="button"
                onClick={() => toggle(mod.key)}
                className="flex-1 flex items-center justify-between text-left"
              >
                <span className="text-sm font-semibold text-ink-700">{mod.label}</span>
                {(mod.abas || mod.acoes) && (
                  <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </button>
            </div>

            {/* Body */}
            {isOpen && (
              <div className="px-4 py-3 bg-surface border-t border-ink-100 space-y-2">

                {/* Módulo com abas */}
                {mod.abas?.map(aba => {
                  const { scope: verScope, secretariaIds } = getVerScope(mod.key, aba.key)
                  return (
                    <div key={aba.key} className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-40 shrink-0 text-xs text-ink-500 font-medium">{aba.label}</span>
                        <div className="flex flex-wrap gap-3 items-center">
                          {aba.acoes.map(acao => (
                            <div key={acao.key} className="flex items-center gap-1.5">
                              {acao.key === 'ver' && aba.escopo !== false ? (
                                <ScopeSelect
                                  value={verScope}
                                  onChange={s => setVerScope(mod.key, s, s === 'algumas' ? secretariaIds : [], aba.key)}
                                />
                              ) : (
                                <Toggle checked={get(mod.key, acao, aba.key)} onChange={v => set(mod.key, v, aba.key, acao.key)} />
                              )}
                              <span className="text-xs text-ink-600">{acao.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {aba.escopo !== false && verScope === 'algumas' && (
                        <div className="ml-42 pl-1 pb-1">
                          <SecretariasCheckboxes
                            secretariaIds={secretariaIds}
                            secretariasList={secretariasList}
                            onChange={ids => setVerScope(mod.key, 'algumas', ids, aba.key)}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Módulo com ações diretas (processos, administracao) */}
                {mod.acoes && (() => {
                  const hasVer = mod.acoes.some(a => a.key === 'ver')
                  const { scope: verScope, secretariaIds } = hasVer ? getVerScope(mod.key) : { scope: 'propria', secretariaIds: [] }
                  return (
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-3 items-center">
                        {mod.acoes.map(acao => (
                          <div key={acao.key} className="flex items-center gap-1.5">
                            {acao.key === 'ver' ? (
                              <ScopeSelect
                                value={verScope}
                                onChange={s => setVerScope(mod.key, s, s === 'algumas' ? secretariaIds : [])}
                              />
                            ) : (
                              <Toggle checked={get(mod.key, acao)} onChange={v => set(mod.key, v, acao.key)} />
                            )}
                            <span className="text-xs text-ink-600">{acao.label}</span>
                          </div>
                        ))}
                      </div>
                      {hasVer && verScope === 'algumas' && (
                        <div className="pl-1 pb-1">
                          <SecretariasCheckboxes
                            secretariaIds={secretariaIds}
                            secretariasList={secretariasList}
                            onChange={ids => setVerScope(mod.key, 'algumas', ids)}
                          />
                        </div>
                      )}
                    </div>
                  )
                })()}

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
