import { Redirect } from 'expo-router';
import { useFoyer } from '../src/foyer';
import { Chargement } from '../src/ui';

/**
 * L'aiguillage d'entrée, dans le même ordre que sur le web :
 *   session en cours de vérification → attente
 *   personne connectée               → écran de connexion
 *   connectée mais sans foyer        → tunnel d'accueil
 *   connectée avec un foyer          → tableau de bord
 */
export default function Entree() {
  const { pret, utilisateur, foyerId } = useFoyer();

  if (!pret) return <Chargement texte="Un instant…" />;
  // Le test porte sur l'utilisateur seul, jamais sur la configuration du
  // serveur : sinon un serveur mal configuré ouvrirait l'application à tous.
  if (!utilisateur) return <Redirect href="/connexion" />;
  if (!foyerId) return <Redirect href="/bienvenue" />;
  return <Redirect href="/(tabs)" />;
}
