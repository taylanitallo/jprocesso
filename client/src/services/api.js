import axios from 'axios'

// ── Token manager — M-3: access token em memória, nunca em localStorage ───────
// Zerado a cada recarga de página; sessão é restaurada via refresh token cookie.
let _accessToken = null
export const setAccessToken   = (t) => { _accessToken = t }
export const getAccessToken   = ()  => _accessToken
export const clearAccessToken = ()  => { _accessToken = null }

// ── Instância axios ───────────────────────────────────────────────────────────
const getApiUrl = () => import.meta.env.VITE_API_URL || '/api'

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

    // subdomain não é sensível — pode ficar em localStorage
    const subdomain = localStorage.getItem('subdomain')
    if (subdomain) config.headers['x-tenant-subdomain'] = subdomain

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
  localStorage.removeItem('subdomain')
  delete api.defaults.headers.common['x-tenant-subdomain']

  const currentPath = window.location.pathname
  if (!currentPath.includes('/login')) {
    window.location.href =
      subdomain && subdomain !== 'admin' ? `/${subdomain}/login` : '/login'
  }
}

// ── Interceptor de response ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
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

      const subdomain =
        localStorage.getItem('subdomain') ||
        window.location.pathname.split('/')[1]

      try {
        const { data } = await _doRefresh()

        // M-3: novo token vai para memória
        setAccessToken(data.token)
        originalRequest.headers.Authorization = `Bearer ${data.token}`

        // Repetir requisição original com o novo token
        return api(originalRequest)
      } catch {
        _forceLogout(subdomain)
        return Promise.reject(error)
      }
    }

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
