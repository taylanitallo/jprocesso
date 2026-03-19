import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import LoginAdmin from './pages/LoginAdmin'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Processos from './pages/Processos'
import NovoProcesso from './pages/NovoProcesso'
import DetalhesProcesso from './pages/DetalhesProcesso'
import Secretarias from './pages/Secretarias'
import ConsultaPublica from './pages/ConsultaPublica'
import AdminTenants from './pages/AdminTenants'
import Enviados from './pages/Enviados'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import Usuarios from './pages/Usuarios'
import Almoxarifado from './pages/Almoxarifado'
import Financeiro from './pages/Financeiro'
import Contratos from './pages/Contratos'
import FormularioDid from './pages/FormularioDid'
import { useAuth } from './context/AuthContext'
import AuthProvider from './context/AuthContext'
import ThemeProvider from './context/ThemeContext'
import Layout from './components/Layout'

// Protege rotas privadas — aguarda loading antes de decidir
function PrivateRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const subdomain = window.location.pathname.split('/')[1]

  if (loading) return null

  if (!user) {
    return requireAdmin
      ? <Navigate to="/" replace />
      : <Navigate to={`/${subdomain}/login`} replace />
  }

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />

  return children
}

// Wrapper da rota de login — redireciona sincronamente se já autenticado (sem flash)
function LoginRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const subdomain = location.pathname.split('/')[1]

  if (loading) return null
  if (user) return <Navigate to={`/${subdomain}`} replace />
  return <Login />
}

function EnviadosRedirect() {
  const { subdomain } = useParams()
  return <Navigate to={`/${subdomain}/processos?aba=enviados`} replace />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
        {/* Área Restrita - Login Admin */}
        <Route path="/" element={<LoginAdmin />} />
        
        {/* Admin Routes - Gestão de Municípios (após login admin) */}
        <Route path="/admin" element={<PrivateRoute requireAdmin><AdminTenants /></PrivateRoute>} />
        
        {/* Rotas com subdomínio (cada município) */}
        <Route path="/:subdomain">
          <Route path="login" element={<LoginRoute />} />
          <Route path="consulta/:numero?" element={<ConsultaPublica />} />
          
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="processos" element={<Processos />} />
            <Route path="processos/novo" element={<NovoProcesso />} />
            <Route path="processos/:id" element={<DetalhesProcesso />} />
            <Route path="processos/:id/did" element={<FormularioDid />} />
            <Route path="enviados" element={<EnviadosRedirect />} />
            <Route path="secretarias" element={<Secretarias />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="almoxarifado" element={<Almoxarifado />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Route>

        {/* Redireciona qualquer rota não encontrada para a página inicial */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
