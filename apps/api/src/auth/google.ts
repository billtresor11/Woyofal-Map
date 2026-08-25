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

/**
 * L'accès sans compte est-il toléré ?
 *
 * Vrai uniquement hors production, ou sur une démonstration publique assumée.
 * C'est le SERVEUR qui tranche, jamais l'application : le navigateur ne peut
 * pas s'auto-autoriser à entrer.
 */
export function anonymousAllowed(): boolean {
  if (authEnabled()) return false;
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_ANONYMOUS === 'true';
}

/**
 * Garde-fou de démarrage.
 *
 * Sans `GOOGLE_CLIENT_ID`, personne ne peut se connecter. L'application reste
 * alors fermée — `anonymousAllowed()` vaut faux en production, donc aucune
 * donnée de foyer n'est accessible — mais elle devient inutilisable.
 *
 * Ce cas doit hurler dans les journaux. Il ne doit PAS arrêter le serveur :
 * un processus mort ne renvoie qu'une page d'erreur de l'hébergeur, illisible
 * pour l'utilisateur comme pour celui qui déploie. Un serveur debout qui
 * affiche « la connexion n'est pas configurée » se diagnostique en dix
 * secondes, et laisse la route de santé répondre à l'hébergeur.
 *
 * Retourne `true` quand tout est en ordre, `false` quand l'application est
 * démarrée mais verrouillée faute de configuration.
 */
export function assertAuthConfigured(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (authEnabled()) return true;

  if (process.env.ALLOW_ANONYMOUS === 'true') {
    console.warn('');
    console.warn('  ⚠️  ALLOW_ANONYMOUS=true : l’application est accessible SANS connexion.');
    console.warn('');
    return true;
  }

  console.error('');
  console.error('  ⛔  GOOGLE_CLIENT_ID est absent : PERSONNE ne pourra se connecter.');
  console.error('');
  console.error('      L’application démarre quand même, mais elle reste verrouillée :');
  console.error('      aucun foyer n’est accessible sans compte.');
  console.error('');
  console.error('      Pour l’ouvrir : ajoutez la variable GOOGLE_CLIENT_ID.');
  console.error('      Marche à suivre : DEPLOY.md ▸ B4.');
  console.error('');
  console.error('      Pour une démonstration publique assumée : ALLOW_ANONYMOUS=true.');
  console.error('');
  return false;
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
