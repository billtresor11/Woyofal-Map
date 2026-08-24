import { useEffect, useRef, useState } from 'react';
import { authApi } from '../api/auth.js';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { mountGoogleButton } from '../lib/google.js';

/**
 * Écran de connexion. Une seule action possible, et rien à retenir :
 * ni mot de passe, ni code, ni formulaire.
 */
export function LoginScreen() {
  const { signInWithGoogle, error } = useAuth();
  const boutonRef = useRef<HTMLDivElement>(null);
  const [chargement, setChargement] = useState(true);
  const [probleme, setProbleme] = useState<string | null>(null);
  const [connexion, setConnexion] = useState(false);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setProbleme(null);
    (async () => {
      try {
        const { googleClientId } = await api.get<{ googleClientId: string | null }>(
          '/api/auth/config',
        );
        if (annule) return;
        if (!googleClientId) {
          setProbleme('La connexion Google n’est pas encore configurée sur ce serveur.');
          return;
        }
        if (!boutonRef.current) return;
        await mountGoogleButton(
          boutonRef.current,
          googleClientId,
          async (credential) => {
            setConnexion(true);
            try {
              await signInWithGoogle(credential);
            } finally {
              if (!annule) setConnexion(false);
            }
          },
          { width: boutonRef.current.clientWidth, oneTap: true },
        );
      } catch (err) {
        if (!annule) setProbleme(err instanceof Error ? err.message : 'Connexion indisponible.');
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, [signInWithGoogle, essai]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-teal-700 via-teal-600 to-teal-500 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-mango-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 animate-float items-center justify-center rounded-4xl bg-white/15 text-6xl">
            💡
          </div>
          <h1 className="text-4xl font-black leading-tight">Woyofal Map</h1>
          <p className="mt-2 text-base font-bold leading-snug text-white/85">
            Comprenez votre facture d’électricité.
            <br />
            En FCFA, sans jargon.
          </p>
        </div>

        <div className="rounded-4xl bg-white px-5 py-7 text-ink shadow-card">
          <h2 className="text-center text-xl font-black leading-tight">Bienvenue !</h2>
          <p className="mx-auto mt-1 max-w-xs text-center text-sm font-bold text-ink-soft">
            Connectez-vous avec Google pour retrouver votre foyer sur tous vos appareils.
          </p>

          <div className="mt-6 flex justify-center">
            {chargement ? (
              <div className="flex h-11 items-center gap-2 text-sm font-bold text-ink-muted">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-sand-200 border-t-teal-500" />
                Préparation...
              </div>
            ) : null}
            <div ref={boutonRef} className={chargement ? 'hidden' : 'w-full max-w-[320px]'} />
          </div>

          {connexion ? (
            <p className="mt-4 text-center text-sm font-extrabold text-teal-600">
              Connexion en cours...
            </p>
          ) : null}

          {probleme ?? error ? (
            <div className="mt-4 rounded-2xl bg-tier3/10 px-4 py-3 text-center">
              <p className="text-sm font-bold text-tier3">{probleme ?? error}</p>
              {probleme ? (
                <button
                  onClick={() => setEssai((n) => n + 1)}
                  className="mt-1 text-sm font-extrabold text-teal-600 underline"
                >
                  Réessayer
                </button>
              ) : null}
            </div>
          ) : null}

          <ul className="mt-6 space-y-2 border-t border-sand-200 pt-5 text-sm font-bold text-ink-soft">
            <li className="flex gap-2">
              <span>🔒</span> Aucun mot de passe à retenir.
            </li>
            <li className="flex gap-2">
              <span>📱</span> Votre foyer vous suit d’un téléphone à l’autre.
            </li>
            <li className="flex gap-2">
              <span>🙈</span> Nous ne voyons que votre nom et votre adresse e-mail.
            </li>
          </ul>
        </div>

        <p className="mt-6 text-center text-xs font-bold leading-relaxed text-white/70">
          Vos données restent sur votre serveur. Aucune information n’est transmise à la Senelec.
        </p>
      </div>
    </div>
  );
}

/** Réexport pratique : l'écran a besoin de savoir si un foyer existe déjà. */
export { authApi };
