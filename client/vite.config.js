import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    // Sem sourcemaps em produção — impede reconstrução do código original no DevTools
    sourcemap: false,
    // Minificação com terser (ofuscação mais agressiva)
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log/warn em produção automaticamente
        drop_console: true,
        drop_debugger: true,
        // Removidas referências de código morto
        dead_code: true,
        passes: 2
      },
      mangle: {
        // Ofusca nomes de variáveis e funções
        toplevel: true
      },
      format: {
        // Remove todos os comentários do bundle final
        comments: false
      }
    },
    rollupOptions: {
      output: {
        // Nomes de chunk não-previsíveis (hash) para dificultar mapeamento
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        // Code splitting manual
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['react-query'],
          ui: ['lucide-react']
        }
      }
    }
  }
})
