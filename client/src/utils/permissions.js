import { useAuth } from '../context/AuthContext'

// Verifica permissão nested. Caminho: hasPerm(user, 'modulo', 'aba', 'acao')
// undefined = permitido (backward compat); false = negado; true = permitido.
export const hasPerm = (user, ...path) => {
  if (!user) return false
  // Só o Administrador Jeos passa direto. O Administrador segue o que estiver
  // desligado no editor de permissões (sem configuração = permitido).
  if (user.tipo === 'jeos') return true
  let obj = user.permissoes
  for (const key of path) {
    if (obj == null || typeof obj !== 'object') return true
    obj = obj[key]
  }
  return obj !== false
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
