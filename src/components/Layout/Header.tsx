
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import Logo from '@/components/ui/logo';
import { HeaderButtons } from '@/components/ui/header-buttons';
import MobileNavAuth from '@/components/ui/NavbarComponents/MobileNavAuth';

const Header = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link to="/" className="px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors">Home</Link>
            <Link to="/headliners" className="px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors">Headliners</Link>
            <Link to="/debates" className="px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors">Debates</Link>
            <Link to="/storyboard" className="px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors">Storyboard</Link>
            <Link to="/learning" className="px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors">Learning</Link>
          </nav>

          <div className="hidden md:flex items-center space-x-2">
            <HeaderButtons />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleNav}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
          >
            {isNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isNavOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-2">
              <Link to="/" className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">Home</Link>
              <Link to="/headliners" className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">Headliners</Link>
              <Link to="/debates" className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">Debates</Link>
              <Link to="/storyboard" className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">Storyboard</Link>
              <Link to="/learning" className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">Learning</Link>
            </nav>
            <div className="mt-4">
              <MobileNavAuth />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
