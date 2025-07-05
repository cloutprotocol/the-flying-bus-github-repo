import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ValidationProvider } from './providers/ValidationProvider';
import { Toaster } from "@/components/ui/toaster"
import { appRoutes } from './routes/appRoutes';
import { ThirdwebWalletProvider } from '../wallet/third-web-wallet.tsx';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback() {
  return <div style={{ color: 'red', padding: 24 }}>Wallet provider failed to initialize. Please check your .env, network, and provider setup.</div>;
}

function App() {
  return (
    <div className="App">
      <React.Suspense fallback={<div>Loading wallet provider...</div>}>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThirdwebWalletProvider>
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
          </ThirdwebWalletProvider>
        </ErrorBoundary>
      </React.Suspense>
    </div>
  );
}

export default App;
