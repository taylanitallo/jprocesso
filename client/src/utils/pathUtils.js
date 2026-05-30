/**
 * Extrai o subdomínio da URL considerando o basePath /jprocesso/
 *
 * Exemplos:
 * - /jprocesso/ → null (rota raiz - MunicipioSelector)
 * - /jprocesso/teste/login → "teste"
 * - /jprocesso/municipio/processos → "municipio"
 */
export const getSubdomain = () => {
  const pathname = window.location.pathname
  const basePath = '/jprocesso/'

  // Remove basePath se existir
  let path = pathname
  if (pathname.startsWith(basePath)) {
    path = pathname.slice(basePath.length)
  }

  // Pega o primeiro segmento (subdomain)
  const segments = path.split('/').filter(s => s)
  return segments.length > 0 ? segments[0] : null
}
