/**
 * Mise en forme — la copie exacte de `apps/web/src/lib/format.ts`.
 *
 * Ce petit fichier est dupliqué volontairement : il ne contient aucune règle
 * métier, seulement de la présentation, et le mutualiser obligerait le paquet
 * partagé à connaître les conventions d'affichage de chaque plateforme.
 * Les CALCULS, eux, ne sont jamais dupliqués : ils viennent de @woyofal/core.
 */

export function fcfa(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || Number.isNaN(montant)) return '—';
  return `${Math.round(montant).toLocaleString('fr-FR').replace(/ | /g, ' ')} F`;
}

export function kwh(valeur: number): string {
  const decimales = valeur >= 100 ? 0 : valeur >= 10 ? 1 : 2;
  const formate = valeur.toLocaleString('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  return `${formate.replace(/ | /g, ' ')} kWh`;
}

export function initiale(nom: string): string {
  return (nom.trim()[0] ?? '?').toUpperCase();
}

export function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function dateLongue(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
