import type {
  ApplianceCategory,
  ApplianceTemplate,
  BillResult,
  Bucket,
  ConsumptionResult,
  CreditForecast,
  RechargeAdvice,
  TariffPlan,
  TariffTier,
} from '@woyofal/core';

/**
 * Les réponses de l'API, telles que l'application native les reçoit.
 *
 * Volontairement identiques aux types du web : c'est la même API, et si les
 * deux définitions divergeaient, l'une des deux applications se tromperait
 * sans que rien ne le signale.
 */

export type { ApplianceCategory, ApplianceTemplate, Bucket, CreditForecast, TariffPlan };

export interface Membre {
  id: string;
  name: string;
  color: string;
  presenceRatio: number;
}

export interface Appareil {
  id: string;
  label: string;
  templateId: string;
  templateName: string;
  emoji: string;
  category: string;
  quantity: number;
  ownership: 'SHARED' | 'PRIVATE';
  ownerId: string | null;
  alwaysOn: boolean;
  consumption: ConsumptionResult;
  shares: Array<{ memberId: string; weight: number }>;
}

export interface CoutAppareil {
  applianceId: string;
  label: string;
  templateId: string;
  alwaysOn: boolean;
  kwhPerMonth: number;
  amountPerMonth: number;
  sharePercent: number;
}

export interface Resume {
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
    segments: Array<{ tier: TariffTier; kwh: number; amount: number; ratio: number }>;
    scaleKwh: number;
    currentTier: TariffTier;
    kwhToNextTier: number | null;
  };
  ranking: CoutAppareil[];
  alwaysOn: { kwhPerMonth: number; amountPerMonth: number; sharePercent: number; count: number };
  switchable: { kwhPerMonth: number; amountPerMonth: number };
  consumedSoFar: {
    kwh: number;
    source: 'compteur' | 'estimation' | 'mixte';
    measuredRatio: number;
    driftKwh: number | null;
    driftPercent: number | null;
    remainingKwh: number | null;
    lastReadingAt: string | null;
    segments: Array<{ from: string; to: string; kwh: number; source: string; explanation: string }>;
    projectedMonthKwh: number;
    daysElapsed: number;
    daysInMonth: number;
  };
  credit: CreditForecast | null;
  buckets: Bucket[];
  keyFact: string;
  budget: { target: number; projected: number; remaining: number; status: string } | null;
  dailyAmount: number;
  appliances: Appareil[];
  members: Membre[];
}

export interface Releve {
  id: string;
  remainingKwh: number;
  consumedKwh: number | null;
  note: string | null;
  readAt: string;
}

export interface ConseilRecharge extends Omit<RechargeAdvice, 'resetOn'> {
  resetOn: string;
  month: string;
  purchaseSource: 'achats' | 'estimation';
  consumedKwh: number;
  consumedSource: string;
  estimatedKwhPerDay: number;
  plan: TariffPlan;
}

export interface Catalogue {
  categories: ApplianceCategory[];
  templates: ApplianceTemplate[];
}
