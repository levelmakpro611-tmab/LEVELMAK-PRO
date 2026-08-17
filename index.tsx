import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { encrypt, decrypt } from './utils/crypto';
import { initCrashReporter } from './services/crashReportService';

// Polyfill/monkeypatch localStorage to auto-encrypt sensitive keys
if (typeof window !== 'undefined' && window.localStorage) {
  const originalGetItem = window.localStorage.getItem;
  const originalSetItem = window.localStorage.setItem;
  const originalRemoveItem = window.localStorage.removeItem;

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
    try {
      if (value && shouldEncrypt(key)) {
        const encryptedValue = encrypt(value);
        originalSetItem.call(window.localStorage, key, encryptedValue);
      } else {
        originalSetItem.call(window.localStorage, key, value);
      }
    } catch (e: any) {
      console.warn(`[LocalStorage setItem Error] Quota exceeded or error for key "${key}":`, e);
      
      // 1. Quota recovery: clear non-essential telemetry & log caches
      try {
        const keysToRemove = [
          'levelmak_telemetry_queue',
          'levelmak_logs',
          'levelmak_admin_deleted_users',
          'levelmak_admin_status_overrides',
          'levelmak_admin_premium_overrides',
          'levelmak_quizzes',
          'levelmak_stories',
          'levelmak_flashcards'
        ];
        keysToRemove.forEach(k => {
          try { originalRemoveItem.call(window.localStorage, k); } catch (_) {}
        });

        const valToSet = (value && shouldEncrypt(key)) ? encrypt(value) : value;
        originalSetItem.call(window.localStorage, key, valToSet);
        return;
      } catch (_) {}

      // 2. Secondary recovery: if setting a user profile, prune non-critical arrays
      if (key.includes('user') || key.includes('quizzes') || key.includes('flashcards')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const pruned = parsed.slice(-15);
            const valToSet = shouldEncrypt(key) ? encrypt(JSON.stringify(pruned)) : JSON.stringify(pruned);
            originalSetItem.call(window.localStorage, key, valToSet);
            return;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.activities)) parsed.activities = parsed.activities.slice(0, 10);
            if (parsed.stats && Array.isArray(parsed.stats.notifications)) parsed.stats.notifications = parsed.stats.notifications.slice(0, 15);
            if (parsed.analytics && Array.isArray(parsed.analytics.studyTimeByDay)) parsed.analytics.studyTimeByDay = parsed.analytics.studyTimeByDay.slice(-30);
            const valToSet = shouldEncrypt(key) ? encrypt(JSON.stringify(parsed)) : JSON.stringify(parsed);
            originalSetItem.call(window.localStorage, key, valToSet);
            return;
          }
        } catch (_) {}
      }

      console.warn(`[LocalStorage Safe Fallback] Could not persist key "${key}", suppressed to prevent app crash.`);
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
