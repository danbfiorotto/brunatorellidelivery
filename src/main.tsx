import React from 'react'
import ReactDOM from 'react-dom/client'

// Capturar erros globais com contexto completo (arquivo, linha, coluna)
// Isso resolve o "Uncaught SyntaxError: Unexpected token 'export'" sem file:line no DevTools
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[main] window.onerror', {
    message,
    source,   // arquivo que causou o erro
    lineno,
    colno,
    errorName: error?.name,
    errorStack: error?.stack,
    timestamp: Date.now(),
  })
  return false // não suprimir o erro nativo
}

// Capturar rejeições de Promise não tratadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('[main] unhandledrejection', {
    reason: event.reason,
    reasonMessage: event.reason instanceof Error ? event.reason.message : String(event.reason),
    reasonStack: event.reason instanceof Error ? event.reason.stack : undefined,
    timestamp: Date.now(),
  })
})

// Este app não usa Service Workers — desregistrar qualquer SW instalado por extensões ou cache antigo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    console.info('[main] Service workers encontrados:', registrations.length, registrations.map(r => ({
      scope: r.scope,
      state: r.active?.state,
      scriptURL: r.active?.scriptURL,
    })))
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        console.info('[main] SW unregistered:', success, registration.scope)
      })
    }
  })
}

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App'
import './index.css'
import './i18n/config' // ✅ Inicializar i18next antes de renderizar a aplicação

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

