
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './providers/AuthProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { logger } from '@/utils/logger/logger'
import { LogSource } from '@/utils/logger/types'
import './styles/index'
import './App.css'

logger.info(LogSource.APP, 'Main.tsx is loading');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </AuthProvider>
  </React.StrictMode>,
)
