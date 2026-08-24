/**
 * Les jetons de style de l'application native.
 *
 * Ce sont exactement les valeurs de `apps/web/tailwind.config.js`, recopiées
 * ici parce que React Native ne lit pas de CSS. Une seule règle : si une
 * couleur change côté web, elle change ici — sinon les deux applications
 * cessent d'être la même marque.
 */

export const couleurs = {
  sable50: '#FDF8F3',
  sable100: '#F7EDE2',
  sable200: '#EFDDCB',
  encre: '#1C1917',
  encreDouce: '#57534E',
  encreGrise: '#8A817C',
  teal500: '#0D9488',
  teal600: '#0F766E',
  teal700: '#115E59',
  mangue400: '#FBBF24',
  mangue500: '#F59E0B',
  mangue600: '#D97706',
  tranche1: '#22C55E',
  tranche2: '#F59E0B',
  tranche3: '#EF4444',
  blanc: '#FFFFFF',
};

/** Couleur d'une tranche, du vert au rouge. */
export function couleurTranche(ordre: number): string {
  return [couleurs.tranche1, couleurs.tranche2, couleurs.tranche3][ordre - 1] ?? couleurs.tranche3;
}

export const rayons = { s: 12, m: 16, l: 24, xl: 32 };
export const espaces = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 28 };

/**
 * Ombre portée. `elevation` sur Android, `shadow*` sur iOS : les deux systèmes
 * ne partagent rien, il faut les deux pour un rendu identique.
 */
export const ombreCarte = {
  shadowColor: '#1C1917',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

/** Les cinq onglets, dans l'ordre de la barre du bas. */
export const ONGLETS = [
  { nom: 'index', titre: 'Maison', emoji: '🏠' },
  { nom: 'estimateur', titre: 'Combien ?', emoji: '⏱️' },
  { nom: 'compteur', titre: 'Compteur', emoji: '🔢' },
  { nom: 'recharge', titre: 'Recharge', emoji: '🛒' },
  { nom: 'ecole', titre: 'École', emoji: '🎓' },
] as const;
