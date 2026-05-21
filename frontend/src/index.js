import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/notification-sw.js')
      .catch((error) => {
        console.warn('Notification service worker registration failed', error);
      });
  });
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
