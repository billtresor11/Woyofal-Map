import type {
  AllocationGroup,
  ApplianceCategory,
  ApplianceTemplate,
  BillResult,
  Bucket,
  ConsumptionResult,
  CostEquivalent,
  CreditForecast,
  HouseholdSplit,
  Lesson,
  OverflowExample,
  PunctualEstimate,
  RechargeAdvice,
  TariffPlan,
  TariffTier,
} from '@woyofal/core';

export type {
  AllocationGroup,
  ApplianceCategory,
  ApplianceTemplate,
  BillResult,
  Bucket,
  ConsumptionResult,
  CostEquivalent,
  CreditForecast,
  Lesson,
  OverflowExample,
  TariffPlan,
  TariffTier,
};

export interface Member {
  id: string;
  name: string;
  color: string;
  presenceRatio: number;
}

export interface Room {
  id: string;
  name: string;
  emoji: string;
  kind: string;
}

export interface Appliance {
  id: string;
  label: string;
  templateId: string;
  templateName: string;
  emoji: string;
  category: string;
  options: Record<string, string>;
  usageProfileId: string | null;
  quantity: number;
  ownership: 'SHARED' | 'PRIVATE';
  ownerId: string | null;
  roomId: string | null;
  isActive: boolean;
  alwaysOn: boolean;
  consumption: ConsumptionResult;
  /** Personnes qui partagent l'appareil ; vide = tout le foyer. */
  shares: Array<{ memberId: string; weight: number }>;
}

export interface ApplianceCost {
  applianceId: string;
  label: string;
  templateId: string;
  alwaysOn: boolean;
  kwhPerMonth: number;
  amountPerMonth: number;
  sharePercent: number;
}

export interface Summary {
  household: {
    id: string;
    name: string;
    tariffCode: string;
    meterType: string;
    subscribedKva: number;
    monthlyBudget: number | null;
  };
  month: string;
  plan: TariffPlan;
  totals: {
    kwhPerDay: number;
    kwhPerMonth: number;
    alwaysOnKwhPerDay: number;
    alwaysOnKwhPerMonth: number;
    switchableKwhPerDay: number;
    switchableKwhPerMonth: number;
    alwaysOnSharePercent: number;
    applianceCount: number;
    alwaysOnCount: number;
  };
  bill: BillResult;
  gauge: {
    segments: Array<{ tier: TariffTier; kwh: number; amount: number; ratio: number; reached: boolean }>;
    scaleKwh: number;
    currentTier: TariffTier;
    kwhToNextTier: number | null;
  };
  ranking: ApplianceCost[];
  alwaysOn: {
    kwhPerMonth: number;
    amountPerMonth: number;
    sharePercent: number;
    count: number;
    averagePricePerKwh: number;
    appliances: ApplianceCost[];
  };
  switchable: { kwhPerMonth: number; amountPerMonth: number; appliances: ApplianceCost[] };
  /** Ou en est le foyer dans son mois : mesuré la ou c'est possible, estimé ailleurs. */
  consumedSoFar: {
    kwh: number;
    source: 'compteur' | 'estimation' | 'mixte';
    measuredRatio: number;
    driftKwh: number | null;
    driftPercent: number | null;
    remainingKwh: number | null;
    lastReadingAt: string | null;
    segments: Array<{
      from: string;
      to: string;
      kwh: number;
      source: 'compteur' | 'estimation';
      explanation: string;
    }>;
    projectedMonthKwh: number;
    daysElapsed: number;
    daysInMonth: number;
  };
  /** Prévision du crédit restant, quand le compteur a été relevé au moins une fois. */
  credit: CreditForecast | null;
  /** Les trois seaux, remplis a hauteur du mois en cours. */
  buckets: Bucket[];
  keyFact: string;
  budget: { target: number; projected: number; remaining: number; status: 'ok' | 'warning' | 'over' } | null;
  dailyAmount: number;
  appliances: Appliance[];
  members: Member[];
  rooms: Room[];
}

export interface Catalog {
  categories: ApplianceCategory[];
  templates: ApplianceTemplate[];
}

export interface PreviewResult {
  consumption: ConsumptionResult;
  monthlyAmount: number;
  dailyAmount: number;
  yearlyAmount: number;
  tierLabel: string;
  pricePerKwh: number;
}

export interface PunctualResult {
  template: { id: string; name: string; emoji: string };
  previousKwh: number;
  estimate: PunctualEstimate;
  sessionId: string | null;
}

export interface SplitResult extends HouseholdSplit {
  basis: 'recharges' | 'estimation';
  rechargedAmount: number;
  sessions: Array<{
    id: string;
    label: string;
    memberId: string | null;
    kwh: number;
    amount: number;
    durationMinutes: number;
    occurredAt: string;
  }>;
}

// --- Compteur et recharge ----------------------------------------------------

export interface MeterReading {
  id: string;
  householdId: string;
  remainingKwh: number;
  /** Consommation reconstituée depuis le relevé précédent, si calculable. */
  consumedKwh: number | null;
  note: string | null;
  readAt: string;
  createdAt: string;
}

export interface RechargeAdviceResult extends Omit<RechargeAdvice, 'resetOn'> {
  /** Sérialisé en texte par l'API : à reconvertir avec `new Date()` si besoin. */
  resetOn: string;
  month: string;
  purchaseSource: 'achats' | 'estimation';
  consumedKwh: number;
  consumedSource: 'compteur' | 'estimation' | 'mixte';
  estimatedKwhPerDay: number;
  plan: TariffPlan;
}

export interface BulkResult {
  appliances: Appliance[];
  allocation: AllocationGroup[];
}
