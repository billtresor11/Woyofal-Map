import { OAuth2Client } from 'google-auth-library';

/**
 * ---------------------------------------------------------------------------
 * VÉRIFICATION DE L'IDENTITÉ GOOGLE
 * ---------------------------------------------------------------------------
 * Le navigateur obtient un jeton signé par Google et nous l'envoie. Nous ne
 * faisons jamais confiance à son contenu : la signature est vérifiée contre les
 * clés publiques de Google, et l'audience doit correspondre à NOTRE client.
 *
 * Sans cette vérification, n'importe qui pourrait se déclarer propriétaire du
 * foyer de quelqu'un d'autre en fabriquant un jeton.
 */

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export type GoogleVerifier = (credential: string) => Promise<GoogleIdentity>;

export class AuthError extends Error {
  statusCode = 401;
  code = 'UNAUTHENTICATED';
}

/** Identifiant du client OAuth, créé dans la Google Cloud Console. */
export function googleClientId(): string | null {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  return id ? id : null;
}

/** true quand la connexion Google est configurée, donc exigée. */
export function authEnabled(): boolean {
  return googleClientId() !== null;
}

let client: OAuth2Client | null = null;

export const verifyGoogleCredential: GoogleVerifier = async (credential) => {
  const clientId = googleClientId();
  if (!clientId) throw new AuthError('La connexion Google n’est pas configurée sur ce serveur.');

  client ??= new OAuth2Client(clientId);

  let payload;
  try {
    // verifyIdToken contrôle la signature, l'expiration, l'émetteur et l'audience.
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw new AuthError('Connexion refusée : le jeton Google n’est pas valide.');
  }

  if (!payload?.sub || !payload.email) {
    throw new AuthError('Connexion refusée : Google n’a pas transmis votre adresse.');
  }
  if (payload.email_verified === false) {
    throw new AuthError('Cette adresse Google n’est pas vérifiée.');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name?.trim() || payload.email.split('@')[0] || 'Utilisateur',
    picture: payload.picture,
  };
};
