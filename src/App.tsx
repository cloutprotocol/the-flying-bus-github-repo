import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster />
        <Router>
          <Routes>
            <Route path="/" element={<div>Home</div>} />
            <Route path="/login" element={React.lazy(() => import('./pages/Login'))} />
            <Route path="/register" element={React.lazy(() => import('./pages/Register'))} />
            <Route path="/admin/articles" element={React.lazy(() => import('./pages/Admin/Articles'))} />
            <Route path="/admin/article/new" element={React.lazy(() => import('./pages/Admin/ArticleEditor'))} />
            <Route path="/admin/article/:articleId" element={React.lazy(() => import('./pages/Admin/ArticleEditor'))} />
            
            {/* Add the new test page route */}
            <Route path="/admin/test" element={<React.Suspense fallback={<div>Loading...</div>}>
              <AdminTestPage />
            </React.Suspense>} />
            
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;

// Add the import for the new test page at the top with other imports
const AdminTestPage = React.lazy(() => import('./pages/AdminTestPage'));
