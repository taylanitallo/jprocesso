import axios from 'axios'

// Determinar URL da API com fallbacks inteligentes
const getApiUrl = () => {
  // Verificar variável de ambiente Vite
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // Em produção (Vercel), usar Railway diretamente
  if (import.meta.env.PROD) {
    return 'https://jprocesso-production.up.railway.app/api'
  }

  // Em desenvolvimento, usar rota relativa (proxy do vite)
  return '/api'
}

const api = axios.create({
  baseURL: getApiUrl()
})

// Interceptor de request para adicionar headers
api.interceptors.request.use(
  (config) => {
    // Adicionar token de autenticação
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Adicionar subdomain do tenant
    const subdomain = localStorage.getItem('subdomain')
    if (subdomain) {
      config.headers['x-tenant-subdomain'] = subdomain
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Manter o subdomínio na URL ao redirecionar para login
      const currentPath = window.location.pathname
      const subdomain = currentPath.split('/')[1]
      
      localStorage.removeItem('token')
      localStorage.removeItem('subdomain')
      
      // Se já estiver na página de login, não redirecionar
      if (!currentPath.includes('/login')) {
        // Redirecionar mantendo o subdomínio
        if (subdomain && subdomain !== 'admin') {
          window.location.href = `/${subdomain}/login`
        } else {
          window.location.href = '/login'
        }
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
