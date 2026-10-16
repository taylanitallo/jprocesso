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
