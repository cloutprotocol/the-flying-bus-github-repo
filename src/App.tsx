
import { Routes, Route } from 'react-router-dom';
import { useAppInitialization } from './hooks/useAppInitialization';
import { ValidationProvider } from './providers/ValidationProvider';
import { NavigationProvider } from './contexts/NavigationContext';
import { AuthProvider } from '@/providers/AuthProvider';
import { appRoutes } from './routes/appRoutes';
import '@/styles/index';

function App() {
  useAppInitialization();

  return (
    <AuthProvider>
      <ValidationProvider>
        <NavigationProvider>
          <Routes>
            {appRoutes.map((route, index) => (
              <Route key={index} {...route} />
            ))}
          </Routes>
        </NavigationProvider>
      </ValidationProvider>
    </AuthProvider>
  );
}

export default App;
