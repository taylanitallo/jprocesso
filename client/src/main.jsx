import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from 'react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { isAdminContext, getPageSubdomain } from './services/api'
import { aplicarTemaGuardado } from './utils/tema'

// Tema do município antes do primeiro desenho (evita piscar no azul padrão)
if (!isAdminContext()) {
  let guardado = null
  try { guardado = localStorage.getItem('subdomain') } catch { /* sem localStorage */ }
  aplicarTemaGuardado(getPageSubdomain() || (guardado !== 'admin' ? guardado : null))
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
