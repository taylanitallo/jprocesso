import axios from 'axios'

// Determinar URL da API com fallbacks inteligentes
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (import.meta.env.PROD) return 'https://jprocesso-production.up.railway.app/api'
  return '/api'
}

const api = axios.create({
  baseURL: getApiUrl(),
  // Necessário para enviar o cookie httpOnly refreshToken em todas as requisições
  // (inclui cross-origin em produção — Vercel → Railway)
  withCredentials: true,
})

// ── Interceptor de request ─────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    const subdomain = localStorage.getItem('subdomain')
    if (subdomain) config.headers['x-tenant-subdomain'] = subdomain

    return config
  },
  (error) => Promise.reject(error)
)

// ── Refresh Token — serialização de múltiplos 401 simultâneos ─────────────
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
  localStorage.removeItem('token')
  localStorage.removeItem('subdomain')
  delete api.defaults.headers.common['Authorization']
  delete api.defaults.headers.common['x-tenant-subdomain']

  const currentPath = window.location.pathname
  if (!currentPath.includes('/login')) {
    window.location.href =
      subdomain && subdomain !== 'admin' ? `/${subdomain}/login` : '/login'
  }
}

// ── Interceptor de response ────────────────────────────────────────────────
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
      // Marcar para evitar loop infinito caso o retry também retorne 401
      originalRequest._retry = true

      // Ler subdomain ANTES de limpar (usado no redirect caso refresh falhe)
      const subdomain =
        localStorage.getItem('subdomain') ||
        window.location.pathname.split('/')[1]

      try {
        const { data } = await _doRefresh()

        // Persistir e propagar novo token
        localStorage.setItem('token', data.token)
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
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

// Função para consulta pública de processos
export const consultar = async (subdomain, numeroProcesso) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/consulta-publica/${subdomain}/${numeroProcesso}`
  )
  return response.data
}

export default api
