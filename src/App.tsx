
import { Routes, Route } from 'react-router-dom';
import { useAppInitialization } from './hooks/useAppInitialization';
import { ValidationProvider } from './providers/ValidationProvider';
import { NavigationProvider } from './contexts/NavigationContext';
import { appRoutes } from './routes/appRoutes';
import '@/styles/index';

function App() {
  useAppInitialization();

  return (
    <ValidationProvider>
      <NavigationProvider>
        <Routes>
          {appRoutes.map((route, index) => (
            <Route key={index} {...route} />
          ))}
        </Routes>
      </NavigationProvider>
    </ValidationProvider>
  );
}

export default App;
