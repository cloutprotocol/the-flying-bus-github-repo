import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThirdwebProvider } from "thirdweb/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from './App';
import './styles/index.ts';
import './styles/article-content.css';
import './styles/rich-text-editor.css';
import 'react-quill/dist/quill.snow.css';
import { Toaster } from '@/components/ui/toaster';
import { client } from '../wallet/client';
import { convex } from './lib/convex';
import './utils/clearConvexAuth'; // Make clearConvexAuth available globally

// AUTO-FIX: Force clear old tokens to resolve "kid" mismatch
// This runs once per browser to ensure fresh state
if (typeof window !== 'undefined' && !localStorage.getItem('auth_key_fix_v5')) {
  console.log('🧹 [AutoFix] Starting aggressive cleanup (v5)...');

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Clear basically any Convex related key
    if (key && (
      key.startsWith('__convexAuth') ||
      key.includes('convex') ||
      key.includes('Convex') ||
      key.startsWith('auth')
    )) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(k => {
    console.log(`[AutoFix] Removing: ${k}`);
    localStorage.removeItem(k);
  });

  localStorage.setItem('auth_key_fix_v5', 'true');
  console.log(`🧹 [AutoFix] Cleared ${keysToRemove.length} tokens. Reloading in 1s...`);

  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex} storage={localStorage}>
      <ThirdwebProvider client={client}>
        <BrowserRouter>
          <App />

        </BrowserRouter>
      </ThirdwebProvider>
    </ConvexAuthProvider>
  </React.StrictMode>,
);
