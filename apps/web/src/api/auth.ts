import { STANDALONE, api } from './client.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  googleEnabled: boolean;
}

/** L'utilisateur fictif du mode démonstration, où il n'y a pas de serveur. */
const GUEST: AuthState = { user: null, googleEnabled: false };

export const authApi = {
  session: (): Promise<AuthState> =>
    STANDALONE ? Promise.resolve(GUEST) : api.get<AuthState>('/api/auth/me'),

  loginWithGoogle: (credential: string) =>
    api.post<{ user: AuthUser }>('/api/auth/google', { credential }),

  logout: () => api.post<{ ok: boolean }>('/api/auth/logout'),

  /** Le foyer déjà rattaché au compte, s'il existe. */
  myHousehold: (): Promise<{ household: { id: string; name: string } | null }> =>
    STANDALONE
      ? Promise.resolve({ household: null })
      : api.get<{ household: { id: string; name: string } | null }>('/api/households/mine'),
};
