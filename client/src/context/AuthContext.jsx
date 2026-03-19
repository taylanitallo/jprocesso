import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

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
    const token = localStorage.getItem('token')
    const subdomain = localStorage.getItem('subdomain')

    if (token && subdomain) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.defaults.headers.common['x-tenant-subdomain'] = subdomain

      // Busca usuário e configurações do tenant em paralelo (dados frescos do servidor)
      Promise.all([
        api.get('/auth/profile'),
        fetch(`/api/tenants/info?subdomain=${subdomain}`).then(r => r.json()),
      ])
        .then(([profileRes, tenantInfoData]) => {
          setUser(profileRes.data.user)
          if (tenantInfoData?.tenant) setTenant(tenantInfoData.tenant)
        })
        .catch(() => {
          // Token inválido/expirado — limpa para evitar loop de redirect
          localStorage.removeItem('token')
          localStorage.removeItem('subdomain')
          delete api.defaults.headers.common['Authorization']
          delete api.defaults.headers.common['x-tenant-subdomain']
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (cpf, senha, subdomain) => {
    const { data } = await api.post('/auth/login', { cpf, senha, subdomain })
    
    // Só o token e subdomain ficam no localStorage (strings pequenas, sem imagens)
    localStorage.setItem('token', data.token)
    localStorage.setItem('subdomain', data.tenant.subdominio)
    
    setUser(data.user)
    setTenant(data.tenant)
    
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    api.defaults.headers.common['x-tenant-subdomain'] = data.tenant.subdominio
    
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('subdomain')
    
    setUser(null)
    setTenant(null)
    
    delete api.defaults.headers.common['Authorization']
    delete api.defaults.headers.common['x-tenant-subdomain']
  }

  const updateTenantConfig = async (novoConf) => {
    const { data } = await api.put('/tenants/configuracoes', novoConf)
    // Atualiza só em memória — banco é a fonte da verdade
    setTenant(prev => ({ ...prev, configuracoes: data.configuracoes }))
    return data
  }

  return (
    <AuthContext.Provider value={{ user, tenant, setTenant, login, logout, loading, updateTenantConfig, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
