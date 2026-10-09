import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { hasPerm } from './utils/permissions'
import AuthProvider from './context/AuthContext'
import ThemeProvider from './context/ThemeContext'
import { setTimbrado } from './utils/timbradoStore'
import { setMargens } from './utils/margensStore'
import { subscribePDFLoading } from './utils/pdfLoadingStore'

// ── Imports estáticos — shell crítico (sempre carregado) ──────────────────────
import Layout from './components/Layout'
import GlobalProgressBar from './components/GlobalProgressBar'
import LoadingBar from './components/LoadingBar'
import SessionActivityGuard from './components/SessionActivityGuard'
import UpdateNotifier from './components/UpdateNotifier'
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
const Tesouraria         = lazy(() => import('./pages/Tesouraria'))

// ── PageLoader — fallback enquanto chunk carrega ──────────────────────────────
function PageLoader({ label = 'Carregando módulo...' }) {
  return <LoadingBar label={label} />
}

function TimbradoSync() {
  const { tenant } = useAuth()
  useEffect(() => {
    setTimbrado(
      tenant?.configuracoes?.timbrado ?? null,
      tenant?.configuracoes?.timbrado_opacity ?? 75
    )
  }, [tenant?.configuracoes?.timbrado, tenant?.configuracoes?.timbrado_opacity])
  return null
}

function MargensSync() {
  const { tenant } = useAuth()
  const mg = tenant?.configuracoes?.margens
  useEffect(() => {
    setMargens(mg ?? null)
  }, [mg])
  return null
}

function PDFLoadingOverlay() {
  const [loading, setLoading] = useState(false)
  useEffect(() => subscribePDFLoading(setLoading), [])
  if (!loading) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl px-10 py-7 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-ink-700">Gerando documento...</span>
      </div>
    </div>
  )
}

// ── Guards de rota ────────────────────────────────────────────────────────────

function PrivateRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const token = localStorage.getItem('token')
  const subdomain = window.location.pathname.split('/')[1]

  if (loading) return <PageLoader />

  if (requireAdmin) {
    if (!token || !isAdmin) return <Navigate to="/" replace />
    return children
  }

  if (!user) return <Navigate to={`/${subdomain}/login`} replace />

  return children
}

function PermissionRoute({ children, permissao, anyOf }) {
  const { user } = useAuth()
  const subdomain = window.location.pathname.split('/')[1]
  if (anyOf) {
    const permitido = anyOf.some(p => hasPerm(user, ...p.split('.')))
    if (!permitido) return <Navigate to={`/${subdomain}`} replace />
    return children
  }
  if (!permissao) return children
  const path = Array.isArray(permissao) ? permissao : permissao.split('.')
  if (!hasPerm(user, ...path)) return <Navigate to={`/${subdomain}`} replace />
  return children
}

function LoginRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const subdomain = location.pathname.split('/')[1]

  if (loading) return <PageLoader />
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

function UsuariosRedirect() {
  const { subdomain } = useParams()
  return <Navigate to={`/${subdomain}/organizacao/usuarios`} replace />
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalProgressBar />
        <TimbradoSync />
        <MargensSync />
        <PDFLoadingOverlay />
        <SessionActivityGuard />
        <UpdateNotifier />
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
                <Route path="arquivo" element={<PermissionRoute permissao="arquivo.acessar"><Arquivo /></PermissionRoute>} />

                {/* Organização */}
                <Route path="organizacao"      element={<PermissionRoute anyOf={['administracao.gerenciar_secretarias', 'administracao.gerenciar_usuarios']}><Secretarias /></PermissionRoute>} />
                <Route path="organizacao/:tab" element={<PermissionRoute anyOf={['administracao.gerenciar_secretarias', 'administracao.gerenciar_usuarios']}><Secretarias /></PermissionRoute>} />
                <Route path="secretarias"      element={<OrganizacaoRedirect />} />

                {/* Tesouraria */}
                <Route path="tesouraria"      element={<PermissionRoute permissao="tesouraria.acessar"><Tesouraria /></PermissionRoute>} />
                <Route path="tesouraria/:tab" element={<PermissionRoute permissao="tesouraria.acessar"><Tesouraria /></PermissionRoute>} />

                {/* Usuários (agora aba dentro de Organização) */}
                <Route path="usuarios" element={<UsuariosRedirect />} />

                {/* Almoxarifado */}
                <Route path="almoxarifado"      element={<PermissionRoute permissao="almoxarifado.acessar"><Almoxarifado /></PermissionRoute>} />
                <Route path="almoxarifado/:tab" element={<PermissionRoute permissao="almoxarifado.acessar"><Almoxarifado /></PermissionRoute>} />

                {/* Patrimônio */}
                <Route path="patrimonio"      element={<PermissionRoute permissao="patrimonio.acessar"><Patrimonio /></PermissionRoute>} />
                <Route path="patrimonio/:tab" element={<PermissionRoute permissao="patrimonio.acessar"><Patrimonio /></PermissionRoute>} />

                {/* Financeiro */}
                <Route path="financeiro"      element={<PermissionRoute permissao="financeiro.acessar"><Financeiro /></PermissionRoute>} />
                <Route path="financeiro/:tab" element={<PermissionRoute permissao="financeiro.acessar"><Financeiro /></PermissionRoute>} />

                {/* Contratos */}
                <Route path="contratos"           element={<PermissionRoute permissao="contratos.acessar"><Contratos /></PermissionRoute>} />
                <Route path="contratos/dashboard" element={<PermissionRoute permissao="contratos.acessar"><PermissionRoute permissao="contratos.dashboard.ver"><ContratosDashboard /></PermissionRoute></PermissionRoute>} />
                <Route path="contratos/:tab"      element={<PermissionRoute permissao="contratos.acessar"><Contratos /></PermissionRoute>} />

                {/* Admin */}
                <Route path="relatorios"          element={<PermissionRoute permissao="administracao.visualizar_relatorios"><Relatorios /></PermissionRoute>} />
                <Route path="configuracoes"       element={<PermissionRoute permissao="administracao.gerenciar_configuracoes"><Configuracoes /></PermissionRoute>} />
                <Route path="configuracoes/:tab"  element={<PermissionRoute permissao="administracao.gerenciar_configuracoes"><Configuracoes /></PermissionRoute>} />
                <Route path="registros"           element={<PermissionRoute permissao="administracao.visualizar_registros"><Registros /></PermissionRoute>} />
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
