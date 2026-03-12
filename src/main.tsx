import React from 'react'
import ReactDOM from 'react-dom/client'

// Este app não usa Service Workers — desregistrar qualquer SW instalado por extensões ou cache antigo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
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

