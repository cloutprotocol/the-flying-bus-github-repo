
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface MainLayoutProps {
  children?: React.ReactNode;
  fullWidth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, fullWidth = false }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={`flex-grow ${fullWidth ? 'w-full' : 'container mx-auto px-4'}`}>
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
