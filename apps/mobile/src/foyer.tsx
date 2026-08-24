import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { ErreurApi, api, enregistrerJeton, lireJeton } from './api';
import type { Catalogue, Resume } from './types';

/**
 * L'état partagé de l'application native : qui est connecté, quel foyer,
 * et son tableau de bord.
 *
 * Même découpage que côté web (`useAuth` + `useApp`), réuni ici en un seul
 * fournisseur : sur mobile, il n'y a qu'un seul parcours et cette séparation
 * n'apporterait rien de plus que deux fichiers à ouvrir.
 */

const CLE_FOYER = 'woyofal.foyerId';

export interface Utilisateur {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

interface EtatFoyer {
  pret: boolean;
  googleActif: boolean;
  utilisateur: Utilisateur | null;
  foyerId: string | null;
  resume: Resume | null;
  catalogue: Catalogue | null;
  erreur: string | null;
  rafraichir: () => Promise<void>;
  choisirFoyer: (id: string) => Promise<void>;
  connecter: (jetonGoogle: string) => Promise<void>;
  deconnecter: () => Promise<void>;
}

const Contexte = createContext<EtatFoyer | null>(null);

export function FournisseurFoyer({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [googleActif, setGoogleActif] = useState(false);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [foyerId, setFoyerId] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /** Au lancement : sait-on qui c'est, et quel foyer ouvrir ? */
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        await lireJeton();
        const moi = await api.get<{ user: Utilisateur | null; googleEnabled: boolean }>(
          '/api/auth/me',
        );
        if (annule) return;
        setGoogleActif(moi.googleEnabled);
        setUtilisateur(moi.user);

        // Le serveur fait autorité sur le foyer d'un compte connecté ; le
        // stockage local n'est qu'un raccourci de démarrage.
        if (moi.user) {
          const mien = await api.get<{ household: { id: string } | null }>(
            '/api/households/mine',
          );
          if (!annule) await memoriserFoyer(mien.household?.id ?? null);
        } else {
          const memorise = await SecureStore.getItemAsync(CLE_FOYER).catch(() => null);
          if (!annule) setFoyerId(memorise);
        }
      } catch (e) {
        if (!annule) setErreur(e instanceof ErreurApi ? e.message : 'Serveur injoignable.');
      } finally {
        if (!annule) setPret(true);
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  useEffect(() => {
    api
      .get<Catalogue>('/api/catalog')
      .then(setCatalogue)
      .catch(() => setCatalogue(null));
  }, []);

  async function memoriserFoyer(id: string | null) {
    setFoyerId(id);
    try {
      if (id) await SecureStore.setItemAsync(CLE_FOYER, id);
      else await SecureStore.deleteItemAsync(CLE_FOYER);
    } catch {
      /* sans trousseau : la sélection ne survit pas au redémarrage */
    }
  }

  const rafraichir = useCallback(async () => {
    if (!foyerId) {
      setResume(null);
      return;
    }
    try {
      setErreur(null);
      setResume(await api.get<Resume>(`/api/households/${foyerId}/summary`));
    } catch (e) {
      // Foyer disparu (base réinitialisée) : on repart de l'accueil plutôt que
      // de laisser l'application bloquée sur une erreur.
      if (e instanceof ErreurApi && e.status === 404) {
        await memoriserFoyer(null);
        setResume(null);
      } else {
        setErreur(e instanceof Error ? e.message : 'Chargement impossible.');
      }
    }
  }, [foyerId]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const connecter = useCallback(async (jetonGoogle: string) => {
    const reponse = await api.post<{ token: string; user: Utilisateur }>('/api/auth/google', {
      credential: jetonGoogle,
    });
    await enregistrerJeton(reponse.token);
    setUtilisateur(reponse.user);
    const mien = await api.get<{ household: { id: string } | null }>('/api/households/mine');
    await memoriserFoyer(mien.household?.id ?? null);
  }, []);

  const deconnecter = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      await enregistrerJeton(null);
      await memoriserFoyer(null);
      setUtilisateur(null);
      setResume(null);
    }
  }, []);

  const valeur = useMemo<EtatFoyer>(
    () => ({
      pret,
      googleActif,
      utilisateur,
      foyerId,
      resume,
      catalogue,
      erreur,
      rafraichir,
      choisirFoyer: memoriserFoyer,
      connecter,
      deconnecter,
    }),
    [pret, googleActif, utilisateur, foyerId, resume, catalogue, erreur, rafraichir, connecter, deconnecter],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useFoyer(): EtatFoyer {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useFoyer doit être utilisé dans <FournisseurFoyer>.');
  return contexte;
}
