
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full bg-gray-800 text-gray-200 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-medium text-lg mb-4 text-white">The Flying Bus</h3>
            <p className="text-sm text-gray-400">
              News for Kids, By Kids - A safe and engaging space where young journalists 
              can express themselves through age-appropriate news content.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-base mb-4 text-white">Categories</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/headliners" className="hover:text-white transition-colors">Headliners</Link></li>
              <li><Link to="/debates" className="hover:text-white transition-colors">Debates</Link></li>
              <li><Link to="/spice-it-up" className="hover:text-white transition-colors">Spice It Up</Link></li>
              <li><Link to="/storyboard" className="hover:text-white transition-colors">Storyboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-base mb-4 text-white">More Categories</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/neighborhood" className="hover:text-white transition-colors">In the Neighborhood</Link></li>
              <li><Link to="/learning" className="hover:text-white transition-colors">Learning</Link></li>
              <li><Link to="/school" className="hover:text-white transition-colors">School News</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-base mb-4 text-white">For Parents</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/safety" className="hover:text-white transition-colors">Safety Policy</Link></li>
              <li><Link to="/request-invitation" className="hover:text-white transition-colors">Request Invitation</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} The Flying Bus. All rights reserved.</p>
          <p className="mt-2">
            <Link to="/privacy" className="hover:text-white transition-colors mx-2">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors mx-2">Terms of Use</Link>
            <Link to="/cookie" className="hover:text-white transition-colors mx-2">Cookie Policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
