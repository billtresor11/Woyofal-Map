/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: { 50: '#FDF8F3', 100: '#F7EDE2', 200: '#EFDDCB' },
        ink: { DEFAULT: '#1C1917', soft: '#57534E', muted: '#8A817C' },
        teal: { 500: '#0D9488', 600: '#0F766E', 700: '#115E59' },
        mango: { 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
        tier1: '#22C55E',
        tier2: '#F59E0B',
        tier3: '#EF4444',
      },
      fontFamily: {
        sans: ['"Nunito"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 2px 12px -2px rgba(28, 25, 23, 0.08), 0 8px 24px -12px rgba(28, 25, 23, 0.12)',
        pop: '0 12px 32px -8px rgba(13, 148, 136, 0.35)',
      },
      keyframes: {
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pop: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        // --- Tunnel d'accueil : une étape entre par la droite, sort par la gauche.
        'step-in': {
          '0%': { opacity: '0', transform: 'translateX(28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'step-back': {
          '0%': { opacity: '0', transform: 'translateX(-28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        /** Apparition en cascade des tuiles et des avatars. */
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        /** Respiration lente d'une illustration mise en avant. */
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        /** Confirmation d'un appareil ajouté. */
        'check-pop': {
          '0%': { transform: 'scale(0)' },
          '60%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        halo: {
          '0%': { transform: 'scale(0.8)', opacity: '0.5' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        pop: 'pop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'step-in': 'step-in 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
        'step-back': 'step-back 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
        rise: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 3.5s ease-in-out infinite',
        'check-pop': 'check-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        halo: 'halo 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
