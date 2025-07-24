import React, { Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ValidationProvider } from './providers/ValidationProvider';
import { Toaster } from "@/components/ui/toaster"
import { appRoutes } from './routes/appRoutes';
import { ErrorBoundary } from 'react-error-boundary';
import { emailQueueManager } from './services/emailQueueManager';

function ErrorFallback() {
  return <div style={{ color: 'red', padding: 24 }}>Something went wrong. Please check your setup.</div>;
}

function App() {
  // Initialize email queue system on app startup
  useEffect(() => {
    const initializeEmailQueue = async () => {
      try {
        await emailQueueManager.initialize();
        console.log('Email queue system initialized');
      } catch (error) {
        console.error('Failed to initialize email queue system:', error);
        // App can still function without email queue, but emails won't be processed
      }
    };

    initializeEmailQueue();

    // Cleanup on unmount
    return () => {
      emailQueueManager.shutdown();
    };
  }, []);

  return (
    <div className="App">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AuthProvider>
          <ValidationProvider>
            <Toaster />
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                {appRoutes.map((route, index) => (
                  <Route 
                    key={index} 
                    path={route.path} 
                    element={route.element} 
                  />
                ))}
              </Routes>
            </Suspense>
          </ValidationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
