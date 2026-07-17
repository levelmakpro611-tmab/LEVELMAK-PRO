import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { encrypt, decrypt } from './utils/crypto';
import { initCrashReporter } from './services/crashReportService';

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


// 🚨 CRASH REPORTER — Capture et envoie les erreurs par email
if (typeof window !== 'undefined') {
  initCrashReporter();
  console.log('🚀 Levelmak App Starting...');
  console.log('Platform:', window.navigator.userAgent);
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
