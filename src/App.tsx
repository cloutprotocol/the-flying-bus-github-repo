
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ValidationProvider } from './providers/ValidationProvider';
import { NavigationProvider } from './contexts/NavigationContext';
import { publicRoutes, protectedRoutes, fallbackRoute } from './routes';
import { LogLevel, LogSource } from '@/utils/logger/types';
import { configureLogger } from '@/utils/logger/config';
import { logger } from '@/utils/logger/logger';
import { registerPerformanceObservers } from './services/monitoringService';
import '@/styles/index';

function App() {
  useEffect(() => {
    // Configure the logger
    configureLogger({
      minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      consoleOutput: true,
      toastOutput: false,
      persistToStorage: true,
      sendToServer: true
    });
    
    // Initialize performance monitoring
    registerPerformanceObservers();
    
    logger.info(LogSource.APP, 'Application initialized', {
      version: '1.0.0',
      environment: import.meta.env.MODE,
      buildTime: new Date().toISOString()
    });
    
    // Store original console.error
    const originalError = console.error;
    
    // Override console.error to log through our system
    console.error = function(...args) {
      const isInternalError = args[0] && typeof args[0] === 'string' && 
                            args[0].includes('[LOGGER RECURSION PREVENTED]');
      
      if (isInternalError) {
        originalError.apply(console, args);
      } else {
        logger.error(LogSource.APP, 'Uncaught console error', args);
      }
    };
    
    // Setup global error handlers
    window.addEventListener('error', (event) => {
      logger.error(LogSource.APP, 'Uncaught global error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      logger.error(LogSource.APP, 'Unhandled promise rejection', {
        reason: event.reason
      });
    });
    
    return () => {
      console.error = originalError;
      window.removeEventListener('error', () => {});
      window.removeEventListener('unhandledrejection', () => {});
    };
  }, []);

  return (
    <ValidationProvider>
      <Router>
        <NavigationProvider>
          <Routes>
            {/* Public Routes */}
            {publicRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            
            {/* Protected Routes */}
            {protectedRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            
            {/* Fallback Route */}
            <Route {...fallbackRoute} />
          </Routes>
        </NavigationProvider>
      </Router>
    </ValidationProvider>
  );
}

export default App;
