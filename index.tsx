import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { encrypt, decrypt } from './utils/crypto';

// Polyfill/monkeypatch localStorage to auto-encrypt sensitive keys
if (typeof window !== 'undefined' && window.localStorage) {
  const originalGetItem = window.localStorage.getItem;
  const originalSetItem = window.localStorage.setItem;

  const shouldEncrypt = (key: string): boolean => {
    return key.startsWith('levelmak_') || key.startsWith('admin_') || key === 'support_email';
  };

  window.localStorage.getItem = function (key: string): string | null {
    const value = originalGetItem.call(window.localStorage, key);
    if (value && shouldEncrypt(key)) {
      return decrypt(value);
    }
    return value;
  };

  window.localStorage.setItem = function (key: string, value: string): void {
    if (value && shouldEncrypt(key)) {
      const encryptedValue = encrypt(value);
      originalSetItem.call(window.localStorage, key, encryptedValue);
    } else {
      originalSetItem.call(window.localStorage, key, value);
    }
  };
}


// GLOBAL ERROR HANDLING FOR MOBILE DEBUGGING
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error("GLOBAL ERROR:", { message, source, lineno, colno, error });
    // Optional: Alert on critical errors in development
    if (import.meta.env.DEV) {
      alert(`Global Error: ${message}`);
    }
    return false;
  };

  window.onunhandledrejection = (event) => {
    console.error("UNHANDLED REJECTION:", event.reason);
    // Optional: Alert on critical rejections
  };
  
  console.log("🚀 Levelmak App Starting...");
  console.log("Platform:", window.navigator.userAgent);
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
