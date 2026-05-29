import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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
