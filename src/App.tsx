import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ValidationProvider } from './providers/ValidationProvider';
import { Toaster } from "@/components/ui/toaster"
import { appRoutes } from './routes/appRoutes';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback() {
  return <div style={{ color: 'red', padding: 24 }}>Something went wrong. Please check your setup.</div>;
}

function App() {
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
