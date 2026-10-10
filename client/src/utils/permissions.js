// Verifica permissão nested. Caminho: hasPerm(user, 'modulo', 'aba', 'acao')
// undefined = permitido (backward compat); false = negado; true = permitido.
// Admin bypassa sempre.
export const hasPerm = (user, ...path) => {
  if (!user) return false
  if (user.tipo === 'admin' || user.tipo === 'jeos') return true
  let obj = user.permissoes
  for (const key of path) {
    if (obj == null || typeof obj !== 'object') return true
    obj = obj[key]
  }
  return obj !== false
}
