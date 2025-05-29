
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ValidationProvider } from './providers/ValidationProvider';
import { Toaster } from "@/components/ui/toaster"
import { appRoutes } from './routes/appRoutes';

function App() {
  return (
    <div className="App">
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
    </div>
  );
}

export default App;
