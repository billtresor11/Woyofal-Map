import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFoyer } from '../src/foyer';
import { couleurs, espaces, rayons } from '../src/theme';
import { Bouton, Erreur } from '../src/ui';

/**
 * CONNEXION — un seul bouton.
 *
 * Sur mobile, Google n'accepte plus l'ouverture de session dans une WebView :
 * il faut le navigateur du système (onglet personnalisé sur Android, vue
 * Safari sur iOS). `expo-auth-session` s'en charge, et c'est aussi ce qui
 * permet à l'utilisateur de VOIR l'adresse google.com — la seule protection
 * réelle contre une fausse page de connexion.
 *
 * On demande un `id_token` : c'est exactement ce que le serveur sait vérifier,
 * par la même route que le web (`POST /api/auth/google`).
 */

// Referme l'onglet du navigateur dès que Google a répondu.
WebBrowser.maybeCompleteAuthSession();

interface Extra {
  googleClientIdIos?: string;
  googleClientIdAndroid?: string;
  googleClientIdWeb?: string;
}

export default function Connexion() {
  const { connecter, googleActif, utilisateur } = useFoyer();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const configure = Boolean(
    extra.googleClientIdIos || extra.googleClientIdAndroid || extra.googleClientIdWeb,
  );

  const [requete, reponse, demanderConnexion] = Google.useIdTokenAuthRequest({
    iosClientId: extra.googleClientIdIos,
    androidClientId: extra.googleClientIdAndroid,
    clientId: extra.googleClientIdWeb,
    // L'application est déclarée auprès de Google avec ce schéma (app.json).
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'woyofalmap' }),
  });

  useEffect(() => {
    if (reponse?.type !== 'success') {
      if (reponse?.type === 'error') setErreur('Connexion refusée par Google.');
      setEnCours(false);
      return;
    }
    const jeton = reponse.params.id_token;
    if (!jeton) {
      setErreur('Google n’a pas renvoyé d’identité. Réessayez.');
      setEnCours(false);
      return;
    }
    connecter(jeton)
      .then(() => router.replace('/'))
      .catch((e: unknown) =>
        setErreur(e instanceof Error ? e.message : 'Connexion impossible.'),
      )
      .finally(() => setEnCours(false));
  }, [reponse, connecter]);

  // Le serveur ne demande pas de compte : on entre directement.
  useEffect(() => {
    if (!googleActif || utilisateur) router.replace('/');
  }, [googleActif, utilisateur]);

  return (
    <View style={styles.fond}>
      <Text style={styles.ampoule}>💡</Text>
      <Text style={styles.titre}>Woyofal Map</Text>
      <Text style={styles.accroche}>
        Comprenez votre facture d’électricité. En FCFA, sans jargon.
      </Text>

      <View style={styles.bas}>
        {configure ? (
          <Bouton
            titre={enCours ? 'Connexion…' : 'Continuer avec Google'}
            desactive={!requete || enCours}
            onPress={() => {
              setErreur(null);
              setEnCours(true);
              void demanderConnexion();
            }}
          />
        ) : (
          <Erreur message="La connexion Google n’est pas encore configurée pour cette application. Renseignez les identifiants dans app.json (extra.googleClientId…)." />
        )}

        {erreur ? (
          <View style={{ marginTop: espaces.m }}>
            <Erreur message={erreur} />
          </View>
        ) : null}

        <Text style={styles.mentions}>
          Nous ne recevons de Google que votre nom, votre adresse e-mail et votre photo. Aucun mot
          de passe ne transite par l’application.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    backgroundColor: couleurs.teal600,
    paddingHorizontal: espaces.xl,
    paddingTop: 96,
  },
  ampoule: { fontSize: 64 },
  titre: { color: couleurs.blanc, fontSize: 34, fontWeight: '900', marginTop: espaces.m },
  accroche: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '700',
    marginTop: espaces.s,
    lineHeight: 24,
  },
  bas: {
    marginTop: 'auto',
    marginBottom: 48,
    backgroundColor: couleurs.blanc,
    borderRadius: rayons.xl,
    padding: espaces.xl,
  },
  mentions: {
    marginTop: espaces.l,
    fontSize: 12,
    fontWeight: '700',
    color: couleurs.encreGrise,
    lineHeight: 18,
  },
});
