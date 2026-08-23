import React from 'react';
import ReactDOM from 'react-dom/client';
import { STANDALONE } from './api/client.js';
import { initStandalone } from './api/standalone.js';
import App from './App.js';
import './index.css';

// En mode démonstration, on ouvre directement sur un foyer rempli :
// une application vide ne montre rien de ce qu'elle sait faire.
if (STANDALONE) {
  const demoId = initStandalone();
  try {
    if (demoId && !localStorage.getItem('woyofal.householdId')) {
      localStorage.setItem('woyofal.householdId', demoId);
    }
  } catch {
    /* stockage indisponible : l'application démarre sur l'écran d'accueil */
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
