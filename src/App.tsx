
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from '@/routes';
import GlobalErrorHandlers from '@/components/ErrorHandlers/GlobalErrorHandlers';
import AppInitializer from '@/components/AppInit/AppInitializer';
import '@/styles/index';
import { ValidationProvider } from './providers/ValidationProvider';

function App() {
  return (
    <ValidationProvider>
      {/* Initialize app configuration and monitoring */}
      <AppInitializer />
      
      {/* Set up global error handlers */}
      <GlobalErrorHandlers />
      
      {/* Router setup */}
      <Router>
        <AppRoutes />
      </Router>
    </ValidationProvider>
  );
}

export default App;
