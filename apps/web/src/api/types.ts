import type {
  ApplianceCategory,
  ApplianceTemplate,
  BillResult,
  ConsumptionResult,
  CostEquivalent,
  HouseholdSplit,
  PunctualEstimate,
  TariffPlan,
  TariffTier,
} from '@woyofal/core';

export type {
  ApplianceCategory,
  ApplianceTemplate,
  BillResult,
  ConsumptionResult,
  CostEquivalent,
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
    alwaysOnKwhPerMonth: number;
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
  equivalents: CostEquivalent[];
  alwaysOn: {
    kwhPerMonth: number;
    amountPerMonth: number;
    sharePercent: number;
    count: number;
    averagePricePerKwh: number;
    appliances: ApplianceCost[];
  };
  switchable: { kwhPerMonth: number; amountPerMonth: number; appliances: ApplianceCost[] };
  consumedSoFar: { kwh: number; source: 'recharges' | 'estimation' };
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
