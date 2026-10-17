import { useAuth } from '../context/AuthContext'

// Verifica permissão nested. Caminho: hasPerm(user, 'modulo', 'aba', 'acao')
// undefined = permitido (backward compat); false = negado; true = permitido.
// Passa direto: Administrador Jeos, e Administrador cujas permissões ainda não foram
// salvas na janela de Permissões (marca _v = 2). Os "desligados" antigos dos
// administradores vieram do modelo de cadastro, não de uma decisão de alguém.
export const VERSAO_PERMISSOES = 2
export const ignoraPermissoes = (u) => u?.tipo === 'jeos' || (u?.tipo === 'admin' && u?.permissoes?._v !== VERSAO_PERMISSOES)

export const hasPerm = (user, ...path) => {
  if (!user) return false
  if (ignoraPermissoes(user)) return true
  let obj = user.permissoes
  for (const key of path) {
    if (obj == null || typeof obj !== 'object') return true
    obj = obj[key]
  }
  return obj !== false
}

// ── Organização e Configurações: acesso ao módulo + abas ─────────────────────
// Desde que os módulos ganharam o próprio "Acesso" no editor (organizacao.acessar,
// configuracoes.acessar), valem essas chaves. Permissões salvas antes disso usam as
// antigas de Administração (gerenciar_secretarias / gerenciar_usuarios /
// gerenciar_configuracoes). Mesma regra no servidor (middleware/auth.js).
export const ABAS_ORGANIZACAO = ['entidade', 'secretarias', 'agentes', 'responsaveis', 'usuarios']

export const podeAbaOrganizacao = (user, aba) => {
  if (!user) return false
  if (ignoraPermissoes(user)) return true
  const p = user.permissoes || {}
  const acessar = p.organizacao?.acessar
  // Gestor administra os usuários da própria secretaria pelo papel
  if (aba === 'usuarios' && user.tipo === 'gestor') return acessar !== false && hasPerm(user, 'organizacao', 'usuarios', 'ver')
  if (acessar === undefined) {
    const chave = aba === 'usuarios' ? 'gerenciar_usuarios' : 'gerenciar_secretarias'
    if (p.administracao?.[chave] === false) return false
  } else if (acessar === false) return false
  return hasPerm(user, 'organizacao', aba, 'ver')
}
export const podeAbrirOrganizacao = (user) => ABAS_ORGANIZACAO.some(a => podeAbaOrganizacao(user, a))

export const podeAbrirConfiguracoes = (user) => {
  if (!user) return false
  if (ignoraPermissoes(user)) return true
  const p = user.permissoes || {}
  if (p.configuracoes?.acessar !== undefined) return p.configuracoes.acessar !== false
  return p.administracao?.gerenciar_configuracoes !== false
}

// Processos: acesso ao módulo + "Ver" (sem configuração = liberado)
export const podeAbrirProcessos = (user) => hasPerm(user, 'processos', 'acessar') && hasPerm(user, 'processos', 'ver')

// Administração › Relatórios / Registros: acesso ao grupo + a tela
export const podeAdministracao = (user, tela) => hasPerm(user, 'administracao', 'acessar') && hasPerm(user, 'administracao', tela)

// Organização › Usuários (gestor: a própria secretaria; servidor: authController › conferirGestor)
export const podeAdministrarUsuarios = (user) => podeAbaOrganizacao(user, 'usuarios')

// Módulo contratado pelo município (configuracoes.modulos_habilitados; sem a lista = todos)
export const moduloHabilitado = (tenant, modulo) => {
  const lista = tenant?.configuracoes?.modulos_habilitados
  if (lista === undefined) return true
  return Array.isArray(lista) && lista.includes(modulo)
}

/**
 * Atalho para as telas: const pode = usePode('contratos', 'licitacoes')
 * pode('criar') · pode('editar') · pode('excluir'). Sem a ação, os botões
 * correspondentes não aparecem — com só "Ver", a tela fica só de consulta.
 */
export function usePode(...base) {
  const { user } = useAuth()
  return (...acao) => hasPerm(user, ...base, ...acao)
}
