
import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";

// Lazy-loaded page components
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const AdminArticles = React.lazy(() => import('./pages/Admin/Articles'));
const ArticleEditor = React.lazy(() => import('./pages/Admin/ArticleEditor'));
const AdminTestPage = React.lazy(() => import('./pages/AdminTestPage'));

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/login" element={
            <Suspense fallback={<div>Loading...</div>}>
              <Login />
            </Suspense>
          } />
          <Route path="/register" element={
            <Suspense fallback={<div>Loading...</div>}>
              <Register />
            </Suspense>
          } />
          <Route path="/admin/articles" element={
            <Suspense fallback={<div>Loading...</div>}>
              <AdminArticles />
            </Suspense>
          } />
          <Route path="/admin/article/new" element={
            <Suspense fallback={<div>Loading...</div>}>
              <ArticleEditor />
            </Suspense>
          } />
          <Route path="/admin/article/:articleId" element={
            <Suspense fallback={<div>Loading...</div>}>
              <ArticleEditor />
            </Suspense>
          } />
          <Route path="/admin/test" element={
            <Suspense fallback={<div>Loading...</div>}>
              <AdminTestPage />
            </Suspense>
          } />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;
