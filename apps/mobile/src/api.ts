import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Client HTTP de l'application native.
 *
 * Il parle à la MÊME API que le web, sur les mêmes routes. La différence tient
 * en un point : un téléphone ne gère pas de cookie de session comme un
 * navigateur, donc le jeton de session voyage dans un en-tête `Authorization`
 * et dort dans le trousseau sécurisé du système (Keychain sur iOS, Keystore
 * sur Android) — jamais dans un stockage en clair.
 */

const CLE_JETON = 'woyofal.session';

/** L'adresse de l'API, réglable sans recompiler (app.json ▸ extra.apiUrl). */
export function urlApi(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return extra?.apiUrl?.replace(/\/$/, '') ?? 'http://localhost:4000';
}

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let jetonEnMemoire: string | null = null;

export async function lireJeton(): Promise<string | null> {
  if (jetonEnMemoire) return jetonEnMemoire;
  try {
    jetonEnMemoire = await SecureStore.getItemAsync(CLE_JETON);
  } catch {
    // Trousseau indisponible (émulateur mal configuré) : on reste en mémoire.
    jetonEnMemoire = null;
  }
  return jetonEnMemoire;
}

export async function enregistrerJeton(jeton: string | null): Promise<void> {
  jetonEnMemoire = jeton;
  try {
    if (jeton) await SecureStore.setItemAsync(CLE_JETON, jeton);
    else await SecureStore.deleteItemAsync(CLE_JETON);
  } catch {
    /* sans trousseau, la session ne survit pas à la fermeture : acceptable */
  }
}

async function requete<T>(chemin: string, init?: RequestInit): Promise<T> {
  const jeton = await lireJeton();
  let reponse: Response;
  try {
    reponse = await fetch(`${urlApi()}${chemin}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(jeton ? { authorization: `Bearer ${jeton}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ErreurApi('Pas de connexion. Vérifiez votre réseau et réessayez.', 0);
  }

  if (reponse.status === 204) return undefined as T;

  const texte = await reponse.text();
  const corps = texte ? (JSON.parse(texte) as { message?: string }) : null;
  if (!reponse.ok) {
    throw new ErreurApi(corps?.message ?? 'Une erreur est survenue.', reponse.status);
  }
  return corps as T;
}

export const api = {
  get: <T,>(chemin: string) => requete<T>(chemin),
  post: <T,>(chemin: string, corps?: unknown) =>
    requete<T>(chemin, { method: 'POST', body: JSON.stringify(corps ?? {}) }),
  patch: <T,>(chemin: string, corps?: unknown) =>
    requete<T>(chemin, { method: 'PATCH', body: JSON.stringify(corps ?? {}) }),
  delete: <T,>(chemin: string) => requete<T>(chemin, { method: 'DELETE' }),
};
