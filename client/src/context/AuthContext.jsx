import { createContext, useContext, useState, useEffect } from 'react'
import api, { setAccessToken, clearAccessToken } from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/profile')
      setUser(data.user)
      return data.user
    } catch {
      return null
    }
  }

  useEffect(() => {
    const subdomain = localStorage.getItem('subdomain')

    // Segurança: forçar loading=false em até 5s independente do que acontecer
    const safetyTimer = setTimeout(() => setLoading(false), 5000)

    if (!subdomain) {
      clearTimeout(safetyTimer)
      setLoading(false)
      return
    }

    // Propagar subdomain para todas as requisições da instância axios
    api.defaults.headers.common['x-tenant-subdomain'] = subdomain

    // M-3: ao recarregar a página, access token não existe em memória.
    // Restaurar sessão via refresh token (httpOnly cookie) — sem tocar localStorage.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    api.post('/auth/refresh', {}, { signal: controller.signal })
      .then(({ data }) => {
        setAccessToken(data.token)
        // Buscar usuário e tenant em paralelo com o novo token em memória
        return Promise.all([
          api.get('/auth/profile'),
          fetch(`/api/tenants/info?subdomain=${subdomain}`).then(r => r.json()),
        ])
      })
      .then(([profileRes, tenantInfoData]) => {
        setUser(profileRes.data.user)
        if (tenantInfoData?.tenant) setTenant(tenantInfoData.tenant)
      })
      .catch(() => {
        clearAccessToken()
        localStorage.removeItem('subdomain')
        delete api.defaults.headers.common['x-tenant-subdomain']
      })
      .finally(() => {
        clearTimeout(timeout)
        clearTimeout(safetyTimer)
        setLoading(false)
      })

    return () => { clearTimeout(safetyTimer); clearTimeout(timeout) }
  }, [])

  const login = async (cpf, senha, subdomain) => {
    const { data } = await api.post('/auth/login', { cpf, senha, subdomain })

    // M-3: access token em memória — nunca no localStorage
    setAccessToken(data.token)
    localStorage.setItem('subdomain', data.tenant.subdominio)

    setUser(data.user)
    setTenant(data.tenant)

    api.defaults.headers.common['x-tenant-subdomain'] = data.tenant.subdominio

    return data
  }

  const logout = async () => {
    const subdomain = localStorage.getItem('subdomain')

    // Revogar refresh token no backend (cookie limpo pelo servidor)
    try {
      await api.post('/auth/logout')
    } catch {
      // Falha silenciosa — logout local sempre prossegue
    }

    clearAccessToken()
    localStorage.removeItem('subdomain')

    setUser(null)
    setTenant(null)

    delete api.defaults.headers.common['x-tenant-subdomain']

    const currentPath = window.location.pathname
    if (!currentPath.includes('/login')) {
      window.location.href =
        subdomain && subdomain !== 'admin' ? `/${subdomain}/login` : '/login'
    }
  }

  const updateTenantConfig = async (novoConf) => {
    const { data } = await api.put('/tenants/configuracoes', novoConf)
    setTenant(prev => ({ ...prev, configuracoes: data.configuracoes }))
    return data
  }

  return (
    <AuthContext.Provider value={{ user, tenant, setTenant, login, logout, loading, updateTenantConfig, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
