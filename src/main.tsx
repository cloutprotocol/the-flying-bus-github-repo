import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThirdwebProvider } from "thirdweb/react";
import App from './App';
import './styles/index.ts';
import './styles/article-content.css';
import './styles/rich-text-editor.css';
import 'react-quill/dist/quill.snow.css';
import { Toaster } from '@/components/ui/toaster';
import { client } from '../wallet/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThirdwebProvider client={client}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </ThirdwebProvider>
  </React.StrictMode>,
);
