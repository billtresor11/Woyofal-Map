import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api } from '../api/client.js';
import type { Catalog, Summary } from '../api/types.js';

const STORAGE_KEY = 'woyofal.householdId';

interface AppState {
  householdId: string | null;
  summary: Summary | null;
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  /** Recharge le tableau de bord après chaque modification. */
  refresh: () => Promise<void>;
  selectHousehold: (id: string) => void;
  reset: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [householdId, setHouseholdId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Le catalogue ne change pas pendant la session : on le charge une fois.
  useEffect(() => {
    api
      .get<Catalog>('/api/catalog')
      .then(setCatalog)
      .catch((err: ApiError) => setError(err.message));
  }, []);

  const refresh = useCallback(async () => {
    if (!householdId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await api.get<Summary>(`/api/households/${householdId}/summary`);
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Le foyer n’existe plus (base reinitialisee) : on repart de l’accueil.
        localStorage.removeItem(STORAGE_KEY);
        setHouseholdId(null);
        setSummary(null);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue.');
      }
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const selectHousehold = useCallback((id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* mode navigation privée : on continue en memoire */
    }
    setHouseholdId(id);
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setHouseholdId(null);
    setSummary(null);
  }, []);

  const value = useMemo<AppState>(
    () => ({ householdId, summary, catalog, loading, error, refresh, selectHousehold, reset }),
    [householdId, summary, catalog, loading, error, refresh, selectHousehold, reset],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans <AppProvider>.');
  return context;
}
