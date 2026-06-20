import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))
const [major, minor] = version.split('.')

// Patch = dias desde 01/01/2020 — incrementa automaticamente a cada deploy,
// sem precisar de commit ou script manual.
const BASE = new Date('2020-01-01').getTime()
const patch = Math.floor((Date.now() - BASE) / 86_400_000)
const buildVersion = `${major}.${minor}.${patch}`

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        passes: 2
      },
      mangle: { toplevel: true },
      format: { comments: false }
    },
    // jsPDF (~548KB) e xlsx (~402KB) são intrinsecamente grandes — carregados lazily
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        manualChunks(id) {
          // PDF — jspdf + jspdf-autotable + html2canvas (muito pesados, isolados)
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/jspdf-autotable') ||
              id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf'
          }
          // Excel — xlsx (pesado, isolado)
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx'
          }
          // React core — react, react-dom, react-router, @remix-run/router, scheduler
          // @remix-run/router é sub-dependência de react-router-dom; mantê-la aqui
          // evita a circular chunk "vendor-misc → vendor-react → vendor-misc" que
          // causava React.useState undefined em chunks lazy carregados.
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react'
          }
          // Ícones
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          // Data fetching
          if (id.includes('node_modules/react-query') ||
              id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/axios')) {
            return 'vendor-data'
          }
          // Gráficos — recharts + dependências d3 usadas por ele
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/victory-vendor') ||
              id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }
          // Utilitários pequenos
          if (id.includes('node_modules/date-fns') ||
              id.includes('node_modules/uuid') ||
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/react-qr-code')) {
            return 'vendor-utils'
          }
          // Resto do node_modules
          if (id.includes('node_modules/')) {
            return 'vendor-misc'
          }
        }
      }
    }
  }
})
