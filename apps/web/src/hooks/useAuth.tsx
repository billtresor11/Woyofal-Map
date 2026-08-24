import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STANDALONE } from '../api/client.js';
import { authApi, type AuthUser } from '../api/auth.js';
import { forgetGoogleSession } from '../lib/google.js';

/**
 * ---------------------------------------------------------------------------
 * SESSION UTILISATEUR
 * ---------------------------------------------------------------------------
 * Une seule source de vérité pour « qui est connecté ». Au démarrage, on
 * demande au serveur : s'il reconnaît le cookie, la personne entre directement
 * dans son foyer, sans écran de connexion ni onboarding.
 *
 * En mode démonstration (application autonome, sans serveur), la connexion
 * n'existe pas : tout le monde est « invité ».
 */

interface AuthState {
  user: AuthUser | null;
  /** true si le serveur propose la connexion Google. */
  googleEnabled: boolean;
  /** true tant que l'on ne sait pas encore si une session existe. */
  loading: boolean;
  error: string | null;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [loading, setLoading] = useState(!STANDALONE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (STANDALONE) return;
    let annule = false;
    authApi
      .session()
      .then((state) => {
        if (annule) return;
        setUser(state.user);
        setGoogleEnabled(state.googleEnabled);
      })
      .catch(() => {
        // Serveur injoignable : on laisse l'application se comporter comme
        // avant, plutôt que de bloquer sur un écran d'erreur.
        if (!annule) setGoogleEnabled(false);
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const signInWithGoogle = useCallback(async (credential: string) => {
    setError(null);
    try {
      const { user: connecte } = await authApi.loginWithGoogle(credential);
      setUser(connecte);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      forgetGoogleSession();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, googleEnabled, loading, error, signInWithGoogle, signOut }),
    [user, googleEnabled, loading, error, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return context;
}
