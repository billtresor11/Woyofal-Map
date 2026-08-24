/**
 * ---------------------------------------------------------------------------
 * VENTILATION D'UN LOT D'APPAREILS
 * ---------------------------------------------------------------------------
 *
 * « J'ai 9 ampoules. » Personne ne les ajoute une par une.
 *
 * Mais en colocation, ces 9 ampoules ne se ressemblent pas : 4 éclairent le
 * salon et la cour — c'est commun —, 2 sont dans la chambre d'Awa, 3 dans
 * celle de Moussa. Sans cette ventilation, la répartition de la facture est
 * fausse, et c'est précisément ce qu'on vient chercher dans l'application.
 *
 * Ce module ne fait qu'une chose : garantir que la somme des parts retombe
 * exactement sur le total annoncé, et le dire en français quand ce n'est pas
 * le cas. Il ne décide rien à la place de l'utilisateur.
 */

/** Une part du lot : une quantité attribuée à quelqu'un, ou au foyer entier. */
export interface AllocationGroup {
  /** `null` = appareil commun, partagé par tout le foyer. */
  memberId: string | null;
  quantity: number;
}

export interface AllocationPlan {
  total: number;
  groups: AllocationGroup[];
  /** Vrai quand la somme des parts tombe juste. */
  valid: boolean;
  /** Ce qui n'est pas encore attribué (négatif = trop attribué). */
  remaining: number;
  /** Message affichable tel quel, sans jargon. */
  message: string;
}

function sum(groups: AllocationGroup[]): number {
  return groups.reduce((total, group) => total + Math.max(0, Math.round(group.quantity)), 0);
}

/** Nettoie une ventilation : entiers positifs, parts vides supprimées, doublons fusionnés. */
export function normalizeAllocation(groups: AllocationGroup[]): AllocationGroup[] {
  const fusion = new Map<string, AllocationGroup>();
  for (const group of groups) {
    const quantity = Math.max(0, Math.round(group.quantity));
    if (quantity === 0) continue;
    const key = group.memberId ?? '__commun__';
    const existant = fusion.get(key);
    if (existant) existant.quantity += quantity;
    else fusion.set(key, { memberId: group.memberId, quantity });
  }
  // Le commun d'abord : c'est ce que l'utilisateur remplit en premier.
  return [...fusion.values()].sort((a, b) => {
    if (a.memberId === null) return -1;
    if (b.memberId === null) return 1;
    return 0;
  });
}

/** Vérifie une ventilation et explique ce qui manque, le cas échéant. */
export function planAllocation(total: number, groups: AllocationGroup[]): AllocationPlan {
  const cible = Math.max(0, Math.round(total));
  const parts = normalizeAllocation(groups);
  const attribue = sum(parts);
  const remaining = cible - attribue;

  const message =
    remaining === 0
      ? cible === 1
        ? 'C’est bon.'
        : `Les ${cible} sont bien répartis.`
      : remaining > 0
        ? `Il reste ${remaining} à attribuer sur ${cible}.`
        : `Vous en avez attribué ${-remaining} de trop : vous en avez annoncé ${cible}.`;

  return { total: cible, groups: parts, valid: remaining === 0, remaining, message };
}

/**
 * Complète une ventilation incomplète en versant le reste au pot commun.
 * C'est le comportement attendu : ce qu'on n'attribue à personne appartient
 * à la maison.
 */
export function balanceAllocation(total: number, groups: AllocationGroup[]): AllocationGroup[] {
  const plan = planAllocation(total, groups);
  if (plan.remaining <= 0) return plan.groups;
  const commun = plan.groups.find((group) => group.memberId === null);
  if (commun) {
    return plan.groups.map((group) =>
      group.memberId === null ? { ...group, quantity: group.quantity + plan.remaining } : group,
    );
  }
  return [{ memberId: null, quantity: plan.remaining }, ...plan.groups];
}

/** Répartition à parts égales entre plusieurs personnes (le reste va au commun). */
export function evenAllocation(total: number, memberIds: string[]): AllocationGroup[] {
  const cible = Math.max(0, Math.round(total));
  if (memberIds.length === 0) return cible > 0 ? [{ memberId: null, quantity: cible }] : [];
  const base = Math.floor(cible / memberIds.length);
  const reste = cible - base * memberIds.length;
  const parts: AllocationGroup[] = memberIds
    .map((memberId) => ({ memberId, quantity: base }))
    .filter((group) => group.quantity > 0);
  return reste > 0 ? [{ memberId: null, quantity: reste }, ...parts] : parts;
}

/** Phrase récapitulative : « 4 en commun, 2 pour Awa, 3 pour Moussa ». */
export function describeAllocation(
  groups: AllocationGroup[],
  names: Record<string, string>,
): string {
  const parts = normalizeAllocation(groups);
  if (parts.length === 0) return 'Rien de réparti pour l’instant.';
  return parts
    .map((group) =>
      group.memberId === null
        ? `${group.quantity} en commun`
        : `${group.quantity} pour ${names[group.memberId] ?? 'quelqu’un'}`,
    )
    .join(', ');
}
