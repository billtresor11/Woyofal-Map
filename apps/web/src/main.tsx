import { LazyMotion, domAnimation } from 'framer-motion';
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

// Installation sur l'écran d'accueil et consultation hors ligne.
// Inutile en mode démonstration : le fichier est déjà entièrement local.
if (!STANDALONE && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* pas de service worker : l'application fonctionne quand même */
    });
  });
}

/**
 * Framer Motion est chargé en mode « allégé » : les composants utilisent `m`
 * plutôt que `motion`, et les fonctionnalités d'animation arrivent par ce
 * fournisseur unique. On économise une bonne partie du poids de la
 * bibliothèque — ce qui compte quand l'application s'ouvre en 3G à Dakar.
 *
 * `strict` interdit l'usage accidentel de `motion.*`, qui réintroduirait tout
 * le paquet dans le fichier final sans que personne ne s'en aperçoive.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LazyMotion features={domAnimation} strict>
      <App />
    </LazyMotion>
  </React.StrictMode>,
);
