import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Process .jsx and .tsx files as JSX
      include: /\.(jsx|tsx)$/,
    })
  ],
  server: {
    hmr: {
      overlay: false
    }
  },
  // Configurações de otimização
  optimizeDeps: {
    entries: []
  },
  // Configuração do Vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.config.js',
        '**/*.config.ts'
      ]
    }
  }
})

