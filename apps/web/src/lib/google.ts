/**
 * ---------------------------------------------------------------------------
 * GOOGLE IDENTITY SERVICES
 * ---------------------------------------------------------------------------
 * Le script officiel de Google est chargé à la demande, uniquement sur l'écran
 * de connexion : les 40 ko ne pèsent pas sur le reste de l'application.
 *
 * Google impose son propre bouton pour la marque « Sign in with Google ». On
 * l'accueille donc dans notre carte, à notre largeur : l'écran reste le nôtre,
 * le bouton reste le leur.
 */

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
      use_fedcm_for_prompt?: boolean;
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: {
        type?: 'standard' | 'icon';
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'small' | 'medium' | 'large';
        text?: 'signin_with' | 'continue_with' | 'signup_with';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: number;
        locale?: string;
      },
    ) => void;
    prompt: () => void;
    disableAutoSelect: () => void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
/** Au-delà, on considère que Google est injoignable plutôt que de rester en attente. */
const TIMEOUT_MS = 12_000;
let loading: Promise<GoogleAccounts> | null = null;

/** Charge le script Google une seule fois, même si l'écran est rouvert. */
export function loadGoogleIdentity(): Promise<GoogleAccounts> {
  if (window.google?.accounts) return Promise.resolve(window.google.accounts);
  loading ??= new Promise<GoogleAccounts>((resolve, reject) => {
    const abandon = setTimeout(() => {
      loading = null;
      reject(new Error('Google met trop de temps à répondre. Vérifiez votre connexion.'));
    }, TIMEOUT_MS);
    const fini = <T,>(action: () => T) => {
      clearTimeout(abandon);
      return action();
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () =>
      fini(() =>
        window.google?.accounts
          ? resolve(window.google.accounts)
          : reject(new Error('Google Identity n’a pas pu démarrer.')),
      ),
    );
    script.addEventListener('error', () =>
      fini(() => {
        loading = null;
        reject(new Error('Impossible de joindre Google. Vérifiez votre connexion.'));
      }),
    );
    if (!existing) document.head.appendChild(script);
  });
  return loading;
}

/**
 * Affiche le bouton officiel dans le conteneur donné et remonte le jeton
 * d'identité dès que la personne a choisi son compte.
 */
export async function mountGoogleButton(
  container: HTMLElement,
  clientId: string,
  onCredential: (credential: string) => void,
  options: { width?: number; oneTap?: boolean } = {},
): Promise<void> {
  const accounts = await loadGoogleIdentity();
  accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,
  });
  container.replaceChildren();
  accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'filled_blue',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'left',
    locale: 'fr',
    width: Math.min(Math.max(options.width ?? container.clientWidth, 200), 400),
  });
  // Proposition discrète pour qui s'est déjà connecté sur cet appareil.
  if (options.oneTap) accounts.id.prompt();
}

/** Empêche la reconnexion automatique après une déconnexion volontaire. */
export function forgetGoogleSession(): void {
  window.google?.accounts.id.disableAutoSelect();
}
