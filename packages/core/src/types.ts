/**
 * Woyofal Map - Types du domaine metier.
 *
 * Regle d'or produit : l'utilisateur ne voit JAMAIS de watts.
 * Il choisit des caractéristiques humaines ("Taille : 200 litres", "Il tourne la nuit"),
 * et ce module traduit ces choix en kWh puis en FCFA.
 */

// ---------------------------------------------------------------------------
// Catalogue d'appareils
// ---------------------------------------------------------------------------

export type ApplianceCategoryId =
  | 'froid'
  | 'confort'
  | 'salon'
  | 'cuisine'
  | 'buanderie'
  | 'numerique'
  | 'eclairage'
  | 'eau';

export interface ApplianceCategory {
  id: ApplianceCategoryId;
  label: string;
  emoji: string;
  /** Couleur d'accent (hex) utilisee par l'interface. */
  color: string;
}

/**
 * Une option de caractéristique proposee a l'utilisateur.
 * - `watts` : definit la puissance de référence (valeur absolue).
 * - `factor` : multiplie la puissance déjà calculée (classe énergétique, age...).
 * - `dutyCycle` : remplace le taux de fonctionnement réel du template.
 */
export interface AttributeOption {
  id: string;
  label: string;
  hint?: string;
  emoji?: string;
  watts?: number;
  factor?: number;
  dutyCycle?: number;
  /** Multiplie la quantité d'appareils (ex : "3 ampoules"). */
  quantity?: number;
  /** Force le mode 24h/24 (ex : decodeur laisse en veille). */
  alwaysOn?: boolean;
}

export interface ApplianceAttribute {
  key: string;
  /** Question posee a l'utilisateur, en francais simple. */
  question: string;
  label: string;
  emoji?: string;
  options: AttributeOption[];
  /** Option pre-sélectionnée : le parcours doit rester "3 clics maximum". */
  defaultOptionId: string;
}

/**
 * Profil d'usage : la seule façon pour l'utilisateur d'exprimer une duree.
 * Jamais "8 heures" en saisie libre, mais "Toute la nuit".
 */
export interface UsageProfile {
  id: string;
  label: string;
  hint?: string;
  emoji?: string;
  hoursPerDay: number;
  daysPerWeek: number;
}

export interface ApplianceTemplate {
  id: string;
  name: string;
  category: ApplianceCategoryId;
  emoji: string;
  /** Synonymes locaux pour la recherche (wolof / francais familier). */
  keywords: string[];
  /** Appareil qui tourne 24h/24 : il forme le "socle incompressible" du foyer. */
  alwaysOn: boolean;
  /** Puissance de depart en watts, avant application des caractéristiques. */
  basePowerWatts: number;
  /**
   * Taux de fonctionnement réel (0-1).
   * Un frigo est branche 24h/24 mais son compresseur ne tourne que ~40% du temps.
   */
  dutyCycle: number;
  attributes: ApplianceAttribute[];
  /** Absent pour les appareils 24h/24 (leur duree est imposee : 24h). */
  usageProfiles?: UsageProfile[];
  defaultUsageProfileId?: string;
  /** Peut-on en posseder plusieurs exemplaires identiques ? */
  allowQuantity: boolean;
  /** Conseils d'économie affiches dans la fiche appareil. */
  tips: string[];
}

// ---------------------------------------------------------------------------
// Calcul de consommation
// ---------------------------------------------------------------------------

/** Ce que l'utilisateur a réellement choisi dans l'interface. */
export interface ApplianceSelection {
  templateId: string;
  /** { attributeKey: optionId } */
  options: Record<string, string>;
  usageProfileId?: string;
  /** Surcharge manuelle (mode expert uniquement). */
  hoursPerDay?: number;
  daysPerWeek?: number;
  quantity?: number;
}

export interface ConsumptionResult {
  templateId: string;
  /** Puissance unitaire déduite (usage interne / mode expert). */
  watts: number;
  quantity: number;
  hoursPerDay: number;
  daysPerWeek: number;
  dutyCycle: number;
  alwaysOn: boolean;
  kwhPerDay: number;
  kwhPerMonth: number;
  kwhPerYear: number;
  /** Heures de fonctionnement effectives par jour (duty cycle inclus). */
  effectiveHoursPerDay: number;
}

// ---------------------------------------------------------------------------
// Tarification Senelec
// ---------------------------------------------------------------------------

export type MeterType = 'PREPAID' | 'POSTPAID';

export interface TariffTier {
  order: number;
  /** Borne basse incluse, en kWh sur la période de référence. */
  fromKwh: number;
  /** Borne haute incluse ; `null` = dernière tranche, illimitee. */
  toKwh: number | null;
  pricePerKwh: number;
  label: string;
  /** Tranche sociale exonérée de TVA. */
  vatExempt: boolean;
}

export interface TariffPlan {
  code: string;
  label: string;
  description: string;
  meterType: MeterType;
  /** Duree de la fenêtre sur laquelle les tranches se remettent a zéro. */
  periodMonths: 1 | 2;
  /** Puissance souscrite couverte par la grille (kVA). */
  minKva: number;
  maxKva: number | null;
  currency: 'FCFA';
  vatRate: number;
  /** Taxe communale sur l'électricité. */
  municipalTaxRate: number;
  /** Redevance / location compteur ramenee au mois. */
  fixedFeePerMonth: number;
  tiers: TariffTier[];
  /** Provenance des chiffres : ils doivent rester vérifiables et modifiables. */
  source: string;
  effectiveFrom: string;
}

export interface BillLine {
  tierOrder: number;
  tierLabel: string;
  kwh: number;
  pricePerKwh: number;
  amountHT: number;
  vat: number;
  amountTTC: number;
}

export interface BillResult {
  kwh: number;
  /** kWh déjà consommés dans la période avant ce calcul. */
  previousKwh: number;
  lines: BillLine[];
  energyHT: number;
  vat: number;
  municipalTax: number;
  fixedFee: number;
  totalTTC: number;
  /** Prix moyen réellement payé, tranches et taxes incluses. */
  averagePricePerKwh: number;
  currentTier: TariffTier;
  /** kWh restants avant de basculer dans la tranche suivante (null si dernière). */
  kwhToNextTier: number | null;
  nextTier: TariffTier | null;
  planCode: string;
}

// ---------------------------------------------------------------------------
// Foyer et colocation
// ---------------------------------------------------------------------------

export type Ownership = 'SHARED' | 'PRIVATE';

export interface MemberInput {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /**
   * Part de présence sur le mois (0-1).
   * Un colocataire absent 2 semaines paie moitié moins les charges communes.
   */
  presenceRatio: number;
}

export interface ApplianceInput {
  id: string;
  label: string;
  templateId: string;
  ownership: Ownership;
  /** Proprietaire pour un appareil privé. */
  ownerId?: string | null;
  /** Pondération optionnelle par membre pour un appareil commun. */
  shares?: Record<string, number>;
  consumption: ConsumptionResult;
}

export interface PunctualUsageInput {
  id: string;
  label: string;
  memberId?: string | null;
  kwh: number;
}

export interface MemberSplit {
  memberId: string;
  name: string;
  emoji: string;
  color: string;
  kwhShared: number;
  kwhPrivate: number;
  kwhPunctual: number;
  kwhTotal: number;
  sharePercent: number;
  /** Quote-part énergie, au prix moyen du foyer. */
  energyAmount: number;
  /** Quote-part des frais fixes, partagés a parts egales. */
  fixedAmount: number;
  amountToPay: number;
}

export interface HouseholdSplit {
  month: string;
  totalKwh: number;
  totalAmount: number;
  averagePricePerKwh: number;
  members: MemberSplit[];
  /** Consommation commune non affectée (aucun membre actif). */
  unassignedKwh: number;
}
