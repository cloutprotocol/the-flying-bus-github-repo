
import React from 'react';
import ColorGuidePage from '@/pages/Dev/ColorGuidePage';

// Development-only routes that won't be accessible in production
export const devRoutes = [
  { 
    path: "/dev/colors", 
    element: <ColorGuidePage /> 
  }
];
