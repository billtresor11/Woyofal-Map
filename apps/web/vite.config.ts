import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const STANDALONE = process.env.VITE_STANDALONE === '1';

export default defineConfig({
  plugins: [react()],
  // Drapeau littéral : en mode serveur, tout le code de démonstration est
  // éliminé du fichier final au lieu d'être embarqué inutilement.
  define: { __STANDALONE__: JSON.stringify(STANDALONE) },
  server: {
    port: 5173,
    // Le front appelle /api : Vite renvoie vers l’API en développement.
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
