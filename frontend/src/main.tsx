import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

// Automatically detect environment mode
// When NODE=development (or default in dev server): uses TEST keys
// When NODE=prod or NODE=production (or built for prod): uses LIVE keys
const nodeVal = (import.meta.env.NODE || import.meta.env.VITE_NODE || '').toLowerCase().trim();
const envVal = (import.meta.env.MODE || import.meta.env.VITE_NODE_ENV || '').toLowerCase().trim();

const isProd = 
  nodeVal === 'prod' || 
  nodeVal === 'production' || 
  envVal === 'production' || 
  envVal === 'prod';

const PUBLISHABLE_KEY = isProd
  ? (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_LIVE || 
     import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_LIVE || 
     'pk_live_Y2xlcmsuYWRpdHlhMDcubWUk')
  : (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_TEST || 
     import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_TEST || 
     'pk_test_dGFsZW50ZWQtcGhvZW5peC05LmNsZXJrLmFjY291bnRzLmRldiQ');

if (import.meta.env.DEV) {
  console.log(`[Clerk Auth] Mode: ${isProd ? 'PRODUCTION (LIVE KEYS)' : 'DEVELOPMENT (TEST KEYS)'} | Key: ${PUBLISHABLE_KEY.slice(0, 10)}...`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
