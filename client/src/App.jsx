import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthProvider from './context/AuthContext'
import ThemeProvider from './context/ThemeContext'

// ── Imports estáticos — shell crítico (sempre carregado) ──────────────────────
import Layout from './components/Layout'
import Login from './pages/Login'
import LoginAdmin from './pages/LoginAdmin'
import MunicipioSelector from './pages/MunicipioSelector'
import Dashboard from './pages/Dashboard'
import ConsultaPublica from './pages/ConsultaPublica'

// ── Lazy — páginas pesadas carregadas sob demanda ─────────────────────────────
const Processos          = lazy(() => import('./pages/Processos'))
const NovoProcesso       = lazy(() => import('./pages/NovoProcesso'))
const DetalhesProcesso   = lazy(() => import('./pages/DetalhesProcesso'))
const FormularioDid      = lazy(() => import('./pages/FormularioDid'))
const Enviados           = lazy(() => import('./pages/Enviados'))
const Secretarias        = lazy(() => import('./pages/Secretarias'))
const Usuarios           = lazy(() => import('./pages/Usuarios'))
const Almoxarifado       = lazy(() => import('./pages/Almoxarifado'))
const Patrimonio         = lazy(() => import('./pages/Patrimonio'))
const Financeiro         = lazy(() => import('./pages/Financeiro'))
const Contratos          = lazy(() => import('./pages/Contratos'))
const ContratosDashboard = lazy(() => import('./pages/ContratosDashboard'))
const Relatorios         = lazy(() => import('./pages/Relatorios'))
const Configuracoes      = lazy(() => import('./pages/Configuracoes'))
const Registros          = lazy(() => import('./pages/Registros'))
const AdminTenants       = lazy(() => import('./pages/AdminTenants'))
const Arquivo            = lazy(() => import('./pages/Arquivo'))

// ── PageLoader — fallback enquanto chunk carrega ──────────────────────────────
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-[3px] border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Carregando módulo...</p>
    </div>
  )
}

// ── Guards de rota ────────────────────────────────────────────────────────────

function PrivateRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const token = localStorage.getItem('token')
  const subdomain = window.location.pathname.split('/')[1]

  if (loading) return null

  if (requireAdmin) {
    if (!token || !isAdmin) return <Navigate to="/" replace />
    return children
  }

  if (!user) return <Navigate to={`/${subdomain}/login`} replace />

  return children
}

function PermissionRoute({ children, permissao }) {
  const { user } = useAuth()
  const subdomain = window.location.pathname.split('/')[1]
  if (!permissao) return children
  if (user?.tipo === 'admin') return children
  if (!user?.permissoes?.[permissao]) return <Navigate to={`/${subdomain}`} replace />
  return children
}

function LoginRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const subdomain = location.pathname.split('/')[1]

  if (loading) return null
  if (user) return <Navigate to={`/${subdomain}`} replace />
  return <Login />
}

const RESERVED = new Set([
  'login', 'admin', 'superadmin', 'api', 'www', 'app',
  'static', 'assets', 'public', 'health', 'ping',
])

function TenantGuard() {
  const { subdomain } = useParams()
  if (RESERVED.has(subdomain?.toLowerCase())) return <Navigate to="/" replace />
  return <Outlet />
}

function EnviadosRedirect() {
  const { subdomain } = useParams()
  return <Navigate to={`/${subdomain}/processos/enviados`} replace />
}

function OrganizacaoRedirect() {
  const { subdomain } = useParams()
  return <Navigate to={`/${subdomain}/organizacao`} replace />
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<MunicipioSelector />} />

            <Route path="/superadmin" element={<LoginAdmin />} />
            <Route path="/admin" element={<Navigate to="/superadmin" replace />} />

            <Route path="/superadmin/painel" element={
              <PrivateRoute requireAdmin><AdminTenants /></PrivateRoute>
            } />
            <Route path="/admin/painel" element={<Navigate to="/superadmin/painel" replace />} />

            <Route path="/:subdomain" element={<TenantGuard />}>
              <Route path="login" element={<LoginRoute />} />
              <Route path="consulta/:numero?" element={<ConsultaPublica />} />

              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />

                {/* Processos */}
                <Route path="processos"          element={<Processos />} />
                <Route path="processos/entrada"  element={<Processos />} />
                <Route path="processos/enviados" element={<Processos />} />
                <Route path="processos/novo"     element={<NovoProcesso />} />
                <Route path="processos/:id"      element={<DetalhesProcesso />} />
                <Route path="processos/:id/did"  element={<FormularioDid />} />
                <Route path="enviados"           element={<EnviadosRedirect />} />

                {/* Arquivo de Processos */}
                <Route path="arquivo" element={<Arquivo />} />

                {/* Organização */}
                <Route path="organizacao"      element={<PermissionRoute permissao="gerenciar_secretarias"><Secretarias /></PermissionRoute>} />
                <Route path="organizacao/:tab" element={<PermissionRoute permissao="gerenciar_secretarias"><Secretarias /></PermissionRoute>} />
                <Route path="secretarias"      element={<OrganizacaoRedirect />} />

                {/* Usuários */}
                <Route path="usuarios" element={<PermissionRoute permissao="gerenciar_usuarios"><Usuarios /></PermissionRoute>} />

                {/* Almoxarifado */}
                <Route path="almoxarifado"      element={<PermissionRoute permissao="acessar_almoxarifado"><Almoxarifado /></PermissionRoute>} />
                <Route path="almoxarifado/:tab" element={<PermissionRoute permissao="acessar_almoxarifado"><Almoxarifado /></PermissionRoute>} />

                {/* Patrimônio */}
                <Route path="patrimonio"      element={<PermissionRoute permissao="acessar_almoxarifado"><Patrimonio /></PermissionRoute>} />
                <Route path="patrimonio/:tab" element={<PermissionRoute permissao="acessar_almoxarifado"><Patrimonio /></PermissionRoute>} />

                {/* Financeiro */}
                <Route path="financeiro"      element={<PermissionRoute permissao="acessar_financeiro"><Financeiro /></PermissionRoute>} />
                <Route path="financeiro/:tab" element={<PermissionRoute permissao="acessar_financeiro"><Financeiro /></PermissionRoute>} />

                {/* Contratos */}
                <Route path="contratos"           element={<PermissionRoute permissao="acessar_contratos"><Contratos /></PermissionRoute>} />
                <Route path="contratos/dashboard" element={<PermissionRoute permissao="acessar_contratos"><ContratosDashboard /></PermissionRoute>} />
                <Route path="contratos/:tab"      element={<PermissionRoute permissao="acessar_contratos"><Contratos /></PermissionRoute>} />

                {/* Admin */}
                <Route path="relatorios"          element={<PermissionRoute permissao="visualizar_relatorios"><Relatorios /></PermissionRoute>} />
                <Route path="configuracoes"       element={<PermissionRoute permissao="gerenciar_configuracoes"><Configuracoes /></PermissionRoute>} />
                <Route path="configuracoes/:tab"  element={<PermissionRoute permissao="gerenciar_configuracoes"><Configuracoes /></PermissionRoute>} />
                <Route path="registros"           element={<PermissionRoute permissao="visualizar_registros"><Registros /></PermissionRoute>} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
