import axios from 'axios'
import { progressBus } from './progressBus'

// ── Token manager — M-3: access token em memória, nunca em localStorage ───────
// Zerado a cada recarga de página; sessão é restaurada via refresh token cookie.
let _accessToken = null
export const setAccessToken   = (t) => { _accessToken = t }
export const getAccessToken   = ()  => _accessToken
export const clearAccessToken = ()  => { _accessToken = null }

// ── Contexto de autenticação (superadmin × município) ─────────────────────────
// Definido pelo endereço da página, não pelo localStorage (compartilhado entre
// abas): assim superadmin e município podem ficar logados no mesmo navegador.
const ROTAS_RESERVADAS = new Set(['', 'login', 'admin', 'superadmin', 'api', 'www', 'app', 'static', 'assets', 'public', 'health', 'ping'])
export const isAdminContext = () => window.location.pathname.startsWith('/superadmin')
export const getPageSubdomain = () => {
  const seg = window.location.pathname.split('/')[1] || ''
  return ROTAS_RESERVADAS.has(seg.toLowerCase()) ? null : seg
}
const getStoredTenantSubdomain = () => {
  const s = localStorage.getItem('subdomain')
  return s && s !== 'admin' ? s : null
}

// ── Instância axios ───────────────────────────────────────────────────────────
const getApiUrl = () => import.meta.env.VITE_API_URL || '/api'

/**
 * URL absoluta de um recurso da API para uso fora do axios (<img src>, links de
 * PDF, window.open). Em produção a API fica em outro domínio (VITE_API_URL);
 * um '/api/...' relativo apontaria para o domínio do site e falharia.
 */
export const apiUrl = (path) => `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`

const api = axios.create({
  baseURL: getApiUrl(),
  // withCredentials: envia o cookie httpOnly refreshToken em requisições cross-origin
  withCredentials: true,
})

// ── Interceptor de request ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // M-3: Authorization lido da memória — nunca do localStorage
    if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`

    // Contexto da sessão: o servidor escolhe o cookie de refresh correspondente
    const admin = isAdminContext()
    config.headers['x-auth-context'] = admin ? 'admin' : 'tenant'
    const subdomain = admin ? 'admin' : (getPageSubdomain() || getStoredTenantSubdomain())
    if (subdomain) config.headers['x-tenant-subdomain'] = subdomain

    // Progresso global — ignora refresh silencioso e download de blobs grandes
    const silent = config.url?.includes('/auth/refresh') || config._silent
    if (!silent) {
      progressBus.start()
      config.onDownloadProgress = (e) => {
        if (e.total) progressBus.advance(Math.round((e.loaded / e.total) * 90))
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── Refresh Token — serialização de múltiplos 401 simultâneos ─────────────────
// Evita múltiplos POSTs /auth/refresh disparados em paralelo:
// a primeira requisição cria a Promise; as demais aguardam a mesma.
let _refreshPromise = null

const _doRefresh = () => {
  if (!_refreshPromise) {
    _refreshPromise = api
      .post('/auth/refresh')
      .finally(() => { _refreshPromise = null })
  }
  return _refreshPromise
}

// Limpa estado de autenticação e redireciona para login
const _forceLogout = (subdomain) => {
  clearAccessToken()

  // Superadmin: encerra só a sessão admin (não mexe na do município)
  if (isAdminContext()) {
    localStorage.removeItem('token')
    localStorage.removeItem('isAdmin')
    if (window.location.pathname !== '/superadmin') window.location.href = '/superadmin'
    return
  }

  localStorage.removeItem('subdomain')
  delete api.defaults.headers.common['x-tenant-subdomain']

  const currentPath = window.location.pathname
  if (!currentPath.includes('/login')) {
    window.location.href = subdomain ? `/${subdomain}/login` : '/'
  }
}

// ── Interceptor de response ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (!response.config?._silent && !response.config?.url?.includes('/auth/refresh'))
      progressBus.done()
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Rotas de autenticação nunca entram no loop de refresh
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh')

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRoute
    ) {
      // Marca para evitar loop infinito caso o retry também retorne 401
      originalRequest._retry = true

      const subdomain = getPageSubdomain() || getStoredTenantSubdomain()

      try {
        const { data } = await _doRefresh()

        // M-3: novo token vai para memória
        setAccessToken(data.token)
        originalRequest.headers.Authorization = `Bearer ${data.token}`

        // Repetir requisição original com o novo token
        return api(originalRequest)
      } catch {
        _forceLogout(subdomain)
        progressBus.done()
        return Promise.reject(error)
      }
    }

    if (!error.config?._silent && !error.config?.url?.includes('/auth/refresh'))
      progressBus.done()
    return Promise.reject(error)
  }
)

// Consulta pública (sem autenticação)
export const consultar = async (subdomain, numeroProcesso) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/consulta-publica/${subdomain}/${numeroProcesso}`
  )
  return response.data
}

export default api
