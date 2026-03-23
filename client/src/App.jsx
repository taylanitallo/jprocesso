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
import Registros from './pages/Registros'
import Usuarios from './pages/Usuarios'
import Almoxarifado from './pages/Almoxarifado'
import Patrimonio from './pages/Patrimonio'
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
  const token = localStorage.getItem('token')
  const subdomain = window.location.pathname.split('/')[1]

  if (loading) return null

  // Rotas de admin: verifica apenas localStorage (sem depender do contexto)
  if (requireAdmin) {
    if (!token || !isAdmin) return <Navigate to="/" replace />
    return children
  }

  if (!user) return <Navigate to={`/${subdomain}/login`} replace />

  return children
}

// Bloqueia acesso direto por URL a módulos que o usuário não tem permissão
function PermissionRoute({ children, permissao }) {
  const { user } = useAuth()
  const subdomain = window.location.pathname.split('/')[1]
  if (!permissao) return children
  if (user?.tipo === 'admin') return children
  if (!user?.permissoes?.[permissao]) return <Navigate to={`/${subdomain}`} replace />
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
  return <Navigate to={`/${subdomain}/processos/enviados`} replace />
}

function OrganizacaoRedirect() {
  const { subdomain } = useParams()
  return <Navigate to={`/${subdomain}/organizacao`} replace />
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
            <Route path="processos/entrada" element={<Processos />} />
            <Route path="processos/enviados" element={<Processos />} />
            <Route path="processos/novo" element={<NovoProcesso />} />
            <Route path="processos/:id" element={<DetalhesProcesso />} />
            <Route path="processos/:id/did" element={<FormularioDid />} />
            <Route path="enviados" element={<EnviadosRedirect />} />
            <Route path="organizacao" element={<PermissionRoute permissao="gerenciar_secretarias"><Secretarias /></PermissionRoute>} />
            <Route path="organizacao/:tab" element={<PermissionRoute permissao="gerenciar_secretarias"><Secretarias /></PermissionRoute>} />
            <Route path="secretarias" element={<OrganizacaoRedirect />} />
            <Route path="usuarios" element={<PermissionRoute permissao="gerenciar_usuarios"><Usuarios /></PermissionRoute>} />
            <Route path="almoxarifado" element={<PermissionRoute permissao="acessar_almoxarifado"><Almoxarifado /></PermissionRoute>} />
            <Route path="almoxarifado/:tab" element={<PermissionRoute permissao="acessar_almoxarifado"><Almoxarifado /></PermissionRoute>} />
            <Route path="patrimonio" element={<PermissionRoute permissao="acessar_almoxarifado"><Patrimonio /></PermissionRoute>} />
            <Route path="patrimonio/:tab" element={<PermissionRoute permissao="acessar_almoxarifado"><Patrimonio /></PermissionRoute>} />
            <Route path="financeiro" element={<PermissionRoute permissao="acessar_financeiro"><Financeiro /></PermissionRoute>} />
            <Route path="financeiro/:tab" element={<PermissionRoute permissao="acessar_financeiro"><Financeiro /></PermissionRoute>} />
            <Route path="contratos" element={<PermissionRoute permissao="acessar_contratos"><Contratos /></PermissionRoute>} />
            <Route path="contratos/:tab" element={<PermissionRoute permissao="acessar_contratos"><Contratos /></PermissionRoute>} />
            <Route path="relatorios" element={<PermissionRoute permissao="visualizar_relatorios"><Relatorios /></PermissionRoute>} />
            <Route path="configuracoes" element={<PermissionRoute permissao="gerenciar_configuracoes"><Configuracoes /></PermissionRoute>} />
            <Route path="configuracoes/:tab" element={<PermissionRoute permissao="gerenciar_configuracoes"><Configuracoes /></PermissionRoute>} />
            <Route path="registros" element={<PermissionRoute permissao="visualizar_registros"><Registros /></PermissionRoute>} />
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
