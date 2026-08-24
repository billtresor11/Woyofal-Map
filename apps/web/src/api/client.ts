/**
 * Client HTTP minimal. Une seule porte d’entree vers l’API : les erreurs
 * remontent toujours avec un message en francais, affichable tel quel.
 */
import { handleStandalone } from './standalone.js';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Mode démonstration : l'application tourne sans serveur, dans le navigateur.
 * Les appels réseau sont remplacés par le même moteur de calcul, en local.
 * Ce drapeau est remplacé à la compilation : le code inutile disparaît du fichier final.
 */
declare const __STANDALONE__: boolean;
export const STANDALONE = __STANDALONE__;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (STANDALONE) {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    try {
      return await handleStandalone<T>(method, path, body);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 400;
      throw new ApiError(error instanceof Error ? error.message : 'Erreur inconnue.', status);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      // Le cookie de session voyage avec la requête, y compris vers une autre origine.
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Pas de connexion. Vérifiez votre réseau et reessayez.", 0);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Une erreur est survenue.', response.status);
  }
  return payload as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
};
