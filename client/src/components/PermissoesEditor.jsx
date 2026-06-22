import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
const getIn = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj)

const setIn = (obj, path, value) => {
  if (path.length === 1) return { ...obj, [path[0]]: value }
  return { ...obj, [path[0]]: setIn(obj?.[path[0]] ?? {}, path.slice(1), value) }
}

// ── schema de módulos / abas / ações ─────────────────────────────────────────
const MODULOS = [
  {
    key: 'processos', label: 'Processos',
    acoes: [
      { key: 'ver',               label: 'Ver' },
      { key: 'criar',             label: 'Criar' },
      { key: 'editar',            label: 'Editar' },
      { key: 'excluir',           label: 'Excluir' },
      { key: 'tramitar',          label: 'Tramitar' },
      { key: 'devolver',          label: 'Devolver' },
      { key: 'concluir',          label: 'Concluir' },
      { key: 'arquivar',          label: 'Arquivar' },
      { key: 'anexar_documento',  label: 'Anexar doc.' },
      { key: 'excluir_documento', label: 'Excluir doc.' },
    ],
  },
  {
    key: 'arquivo', label: 'Ger. de Arquivos', comAcesso: true,
  },
  {
    key: 'almoxarifado', label: 'Almoxarifado', comAcesso: true,
    abas: [
      { key: 'painel',      label: 'Painel',      acoes: [{ key: 'ver', label: 'Ver' }] },
      { key: 'estoque',     label: 'Estoque',     acoes: [{ key: 'ver', label: 'Ver' }, { key: 'editar', label: 'Editar' }] },
      { key: 'entradas',    label: 'Entradas',    acoes: [{ key: 'ver', label: 'Ver' }, { key: 'registrar', label: 'Registrar' }] },
      { key: 'saidas',      label: 'Saídas',      acoes: [{ key: 'ver', label: 'Ver' }, { key: 'registrar', label: 'Registrar' }] },
      { key: 'requisicoes', label: 'Requisições', acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'aprovar', label: 'Aprovar' }, { key: 'cancelar', label: 'Cancelar' }] },
      { key: 'cotas',       label: 'Cotas',       acoes: [{ key: 'ver', label: 'Ver' }, { key: 'gerenciar', label: 'Gerenciar' }] },
      { key: 'inventario',  label: 'Inventário',  acoes: [{ key: 'ver', label: 'Ver' }, { key: 'realizar', label: 'Realizar' }] },
      { key: 'auditoria',   label: 'Auditoria',   acoes: [{ key: 'ver', label: 'Ver' }] },
    ],
  },
  {
    key: 'patrimonio', label: 'Patrimônio', comAcesso: true,
    abas: [
      { key: 'painel',        label: 'Painel',        acoes: [{ key: 'ver', label: 'Ver' }] },
      { key: 'bens',          label: 'Bens',          acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'tombamento',    label: 'Tombamento',    acoes: [{ key: 'ver', label: 'Ver' }, { key: 'realizar', label: 'Realizar' }] },
      { key: 'transferencia', label: 'Transferência', acoes: [{ key: 'ver', label: 'Ver' }, { key: 'realizar', label: 'Realizar' }] },
      { key: 'baixa',         label: 'Baixa',         acoes: [{ key: 'ver', label: 'Ver' }, { key: 'realizar', label: 'Realizar' }] },
      { key: 'inventario',    label: 'Inventário',    acoes: [{ key: 'ver', label: 'Ver' }, { key: 'realizar', label: 'Realizar' }] },
      { key: 'grupos',        label: 'Grupos',        acoes: [{ key: 'ver', label: 'Ver' }, { key: 'gerenciar', label: 'Gerenciar' }] },
    ],
  },
  {
    key: 'financeiro', label: 'Financeiro', comAcesso: true,
    abas: [
      { key: 'painel',        label: 'Painel',        acoes: [{ key: 'ver', label: 'Ver' }] },
      { key: 'processos_did', label: 'Processos DID', acoes: [{ key: 'ver', label: 'Ver' }] },
      { key: 'relatorio',     label: 'Relatório',     acoes: [{ key: 'ver', label: 'Ver' }] },
    ],
  },
  {
    key: 'contratos', label: 'Contratos', comAcesso: true,
    abas: [
      { key: 'itens',      label: 'Itens',      acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'credores',   label: 'Credores',   acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'contratos',  label: 'Contratos',  acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'ordens',     label: 'Ordens',     acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'relatorios', label: 'Relatórios', acoes: [{ key: 'ver', label: 'Ver' }] },
    ],
  },
  {
    key: 'tesouraria', label: 'Tesouraria', comAcesso: true,
    abas: [
      { key: 'contas',    label: 'Contas',    acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'receitas',  label: 'Receitas',  acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'despesas',  label: 'Despesas',  acoes: [{ key: 'ver', label: 'Ver' }, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }] },
      { key: 'relatorios', label: 'Relatórios', acoes: [{ key: 'ver', label: 'Ver' }] },
    ],
  },
  {
    key: 'administracao', label: 'Administração',
    acoes: [
      { key: 'gerenciar_usuarios',     label: 'Gerenciar Usuários' },
      { key: 'gerenciar_secretarias',  label: 'Gerenciar Organização' },
      { key: 'gerenciar_configuracoes',label: 'Configurações' },
      { key: 'visualizar_relatorios',  label: 'Relatórios' },
      { key: 'visualizar_registros',   label: 'Registros' },
    ],
  },
]

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  )
}

// ── Scope select — substitui o Toggle para ações "ver" ────────────────────────
const SCOPE_OPTIONS = [
  { value: 'none',    label: 'Bloqueado',     cls: 'bg-red-500 text-white' },
  { value: 'propria', label: 'Só sua sec.',   cls: 'bg-blue-500 text-white' },
  { value: 'todas',   label: 'Todas',         cls: 'bg-green-500 text-white' },
  { value: 'algumas', label: 'Específicas…',  cls: 'bg-amber-500 text-white' },
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
        className={`h-5 text-[10px] font-semibold pl-1.5 pr-5 rounded border-0 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${active?.cls ?? 'bg-gray-200 text-gray-600'}`}
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
    return <span className="text-[10px] text-gray-400 italic">Nenhuma secretaria disponível</span>
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
            className="w-3 h-3 accent-blue-600"
          />
          <span className="text-gray-600 dark:text-slate-400">{s.sigla ? `${s.sigla} – ${s.nome}` : s.nome}</span>
        </label>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PermissoesEditor({ permissoes, onChange, secretariasList = [] }) {
  const [open, setOpen] = useState({})

  const perm = permissoes ?? {}

  // ── leitura/escrita de ações simples (boolean) ────────────────────────────
  const get = (modKey, ...path) => {
    const val = getIn(perm[modKey], path)
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
      {MODULOS.map(mod => {
        const isOpen = open[mod.key] ?? false
        const acessar = mod.comAcesso ? (perm[mod.key]?.acessar !== false) : true

        return (
          <div key={mod.key} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {/* Header do módulo */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-slate-800">
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
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{mod.label}</span>
                {(mod.abas || mod.acoes) && (
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </button>
            </div>

            {/* Body */}
            {isOpen && (
              <div className="px-4 py-3 bg-white dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-700 space-y-2">

                {/* Módulo com abas */}
                {mod.abas?.map(aba => {
                  const { scope: verScope, secretariaIds } = getVerScope(mod.key, aba.key)
                  return (
                    <div key={aba.key} className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-28 shrink-0 text-xs text-gray-500 dark:text-slate-400 font-medium">{aba.label}</span>
                        <div className="flex flex-wrap gap-3 items-center">
                          {aba.acoes.map(acao => (
                            <div key={acao.key} className="flex items-center gap-1.5">
                              {acao.key === 'ver' ? (
                                <ScopeSelect
                                  value={verScope}
                                  onChange={s => setVerScope(mod.key, s, s === 'algumas' ? secretariaIds : [], aba.key)}
                                />
                              ) : (
                                <Toggle checked={get(mod.key, aba.key, acao.key)} onChange={v => set(mod.key, v, aba.key, acao.key)} />
                              )}
                              <span className="text-xs text-gray-600 dark:text-slate-300">{acao.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {verScope === 'algumas' && (
                        <div className="ml-30 pl-1 pb-1">
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
                              <Toggle checked={get(mod.key, acao.key)} onChange={v => set(mod.key, v, acao.key)} />
                            )}
                            <span className="text-xs text-gray-600 dark:text-slate-300">{acao.label}</span>
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
