import {
  computeConsumption,
  computeCumulativeKwh,
  computeMonthlyBill,
  findTemplate,
  forecastCredit,
  keyFact,
  projectMonthEnd,
  rankAppliances,
  rechargeAdvice,
  splitHousehold,
  sumConsumption,
  tierProgress,
  waterBuckets,
  DAYS_PER_MONTH,
  type ApplianceInput,
  type ApplianceSelection,
  type ConsumptionResult,
  type CumulativeResult,
  type MemberInput,
} from '@woyofal/core';
import { authEnabled } from '../auth/google.js';
import type { SessionUser } from '../auth/session.js';
import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';
import { loadPlan } from './tariff.service.js';

// --- Utilitaires de date ----------------------------------------------------

export function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(month: string): { start: Date; end: Date; daysElapsed: number; days: number } {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    throw new AppError(`Mois invalide : ${month}. Format attendu : AAAA-MM.`);
  }
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const now = new Date();
  const daysElapsed =
    now >= end ? days : now < start ? 0 : Math.max(1, now.getDate());
  return { start, end, daysElapsed, days };
}

// --- Conversion base de données <-> moteur ----------------------------------

function parseOptions(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Recalcule la consommation a partir des choix de l’utilisateur.
 * Le serveur ne fait jamais confiance aux kWh envoyes par le client :
 * il rejoue le moteur avec le catalogue de référence.
 */
export function computeFromSelection(selection: ApplianceSelection): ConsumptionResult {
  const template = findTemplate(selection.templateId);
  if (!template) throw notFound(`L’appareil "${selection.templateId}"`);
  return computeConsumption(template, selection);
}

type ApplianceRow = {
  id: string;
  templateId: string;
  label: string;
  optionsJson: string;
  usageProfileId: string | null;
  quantity: number;
  ownership: string;
  ownerId: string | null;
  roomId: string | null;
  watts: number;
  dutyCycle: number;
  hoursPerDay: number;
  daysPerWeek: number;
  alwaysOn: boolean;
  kwhPerDay: number;
  kwhPerMonth: number;
  isActive: boolean;
  shares?: Array<{ memberId: string; weight: number }>;
};

function rowToConsumption(row: ApplianceRow): ConsumptionResult {
  return {
    templateId: row.templateId,
    watts: row.watts,
    quantity: row.quantity,
    hoursPerDay: row.hoursPerDay,
    daysPerWeek: row.daysPerWeek,
    dutyCycle: row.dutyCycle,
    alwaysOn: row.alwaysOn,
    kwhPerDay: row.kwhPerDay,
    kwhPerMonth: row.kwhPerMonth,
    kwhPerYear: Math.round(row.kwhPerDay * 365.25 * 1000) / 1000,
    effectiveHoursPerDay:
      Math.round(row.hoursPerDay * row.dutyCycle * (row.daysPerWeek / 7) * 100) / 100,
  };
}

export function rowToApplianceInput(row: ApplianceRow): ApplianceInput {
  const shares = row.shares?.length
    ? Object.fromEntries(row.shares.map((s) => [s.memberId, s.weight]))
    : undefined;
  return {
    id: row.id,
    label: row.label,
    templateId: row.templateId,
    ownership: row.ownership === 'PRIVATE' ? 'PRIVATE' : 'SHARED',
    ownerId: row.ownerId,
    shares,
    consumption: rowToConsumption(row),
  };
}

/** Vue "appareil" telle que la consomme l’interface. */
export function serializeAppliance(row: ApplianceRow) {
  const template = findTemplate(row.templateId);
  const consumption = rowToConsumption(row);
  return {
    id: row.id,
    label: row.label,
    templateId: row.templateId,
    templateName: template?.name ?? row.label,
    emoji: template?.emoji ?? '🔌',
    category: template?.category ?? 'numerique',
    options: parseOptions(row.optionsJson),
    usageProfileId: row.usageProfileId,
    quantity: row.quantity,
    ownership: row.ownership,
    ownerId: row.ownerId,
    roomId: row.roomId,
    isActive: row.isActive,
    alwaysOn: row.alwaysOn,
    consumption,
    shares: row.shares ?? [],
  };
}

// --- Chargement d’un foyer ---------------------------------------------------

/**
 * Charge un foyer en vérifiant qu'il appartient bien à la personne connectée.
 *
 * Un foyer qui ne lui appartient pas est traité comme inexistant : répondre
 * « interdit » révélerait qu'il existe, et permettrait de deviner les autres
 * comptes en essayant des identifiants au hasard.
 */
export async function getHouseholdOrThrow(householdId: string, user?: SessionUser | null) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      members: { orderBy: { createdAt: 'asc' } },
      rooms: { orderBy: { name: 'asc' } },
      appliances: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { shares: true },
      },
    },
  });
  if (!household) throw notFound('Ce foyer');
  assertOwner(household, user);
  return household;
}

/** Règle d'accès, appliquée partout où l'on touche à un foyer. */
export function assertOwner(
  household: { userId: string | null },
  user?: SessionUser | null,
): void {
  // Sans connexion Google configurée, l'application reste ouverte : c'est le
  // mode développement et démonstration.
  if (!authEnabled()) return;
  if (!user) throw new AppError('Connectez-vous pour accéder à votre foyer.', 401, 'UNAUTHENTICATED');
  if (household.userId !== user.id) throw notFound('Ce foyer');
}

/**
 * Reconstitue le cumul de kWh du mois a partir de ce qu'on sait de plus sûr :
 * les relevés du boîtier mural. La ou il n'y a pas de releve, on estime — et le
 * resultat le dit, plutôt que de faire passer une estimation pour une mesure.
 *
 * C'est ce cumul qui determine la tranche courante, donc le prix du kWh suivant.
 */
export async function consumedSoFar(
  householdId: string,
  month: string,
  estimatedKwhPerDay: number,
): Promise<CumulativeResult> {
  const { start, end } = monthRange(month);
  const [readings, topUps] = await Promise.all([
    prisma.meterReading.findMany({
      where: { householdId, readAt: { lt: end } },
      orderBy: { readAt: 'asc' },
    }),
    prisma.topUp.findMany({
      where: { householdId, purchasedAt: { gte: start, lt: end } },
      orderBy: { purchasedAt: 'asc' },
    }),
  ]);

  return computeCumulativeKwh({
    monthStart: start,
    monthEnd: end,
    readings: readings.map((reading) => ({
      id: reading.id,
      remainingKwh: reading.remainingKwh,
      readAt: reading.readAt,
    })),
    topUps: topUps.map((topUp) => ({
      id: topUp.id,
      kwh: topUp.kwh,
      purchasedAt: topUp.purchasedAt,
    })),
    estimatedKwhPerDay,
  });
}

/**
 * kWh ACHETÉS depuis le 1er du mois.
 *
 * En prépayé, c'est ce cumul-la — et non la consommation — qui fixe la tranche
 * appliquée a la prochaine recharge. Un foyer qui n'enregistre pas ses achats
 * n'a rien a comparer : on retombe alors sur sa consommation, en le signalant.
 */
export async function purchasedSoFar(
  householdId: string,
  month: string,
  fallbackKwh: number,
): Promise<{ kwh: number; source: 'achats' | 'estimation' }> {
  const { start, end } = monthRange(month);
  const topUps = await prisma.topUp.aggregate({
    where: { householdId, purchasedAt: { gte: start, lt: end } },
    _sum: { kwh: true },
  });
  const achete = topUps._sum.kwh ?? 0;
  if (achete > 0) return { kwh: Math.round(achete * 100) / 100, source: 'achats' };
  return { kwh: Math.round(fallbackKwh * 100) / 100, source: 'estimation' };
}

// --- Le tableau de bord ------------------------------------------------------

export async function buildSummary(
  householdId: string,
  month = currentMonth(),
  user?: SessionUser | null,
) {
  const household = await getHouseholdOrThrow(householdId, user);
  const plan = await loadPlan(household.tariffCode);

  const applianceInputs = household.appliances.map(rowToApplianceInput);
  const totals = sumConsumption(applianceInputs.map((a) => a.consumption));
  const bill = computeMonthlyBill(totals.kwhPerMonth, plan);
  const gauge = tierProgress(totals.kwhPerMonth, plan);
  const ranking = rankAppliances(applianceInputs, plan);
  const soFar = await consumedSoFar(householdId, month, totals.kwhPerDay);
  const { daysElapsed, days } = monthRange(month);

  const alwaysOnBill = computeMonthlyBill(totals.alwaysOnKwhPerMonth, plan, {
    includeFixedFee: false,
  });
  const alwaysOnAmount =
    totals.kwhPerMonth > 0
      ? Math.round(
          ((totals.alwaysOnKwhPerMonth / totals.kwhPerMonth) * (bill.totalTTC - bill.fixedFee)),
        )
      : 0;

  const budget = household.monthlyBudget
    ? {
        target: household.monthlyBudget,
        projected: bill.totalTTC,
        remaining: household.monthlyBudget - bill.totalTTC,
        status:
          bill.totalTTC <= household.monthlyBudget * 0.85
            ? ('ok' as const)
            : bill.totalTTC <= household.monthlyBudget
              ? ('warning' as const)
              : ('over' as const),
      }
    : null;

  return {
    household: {
      id: household.id,
      name: household.name,
      tariffCode: household.tariffCode,
      meterType: household.meterType,
      subscribedKva: household.subscribedKva,
      monthlyBudget: household.monthlyBudget,
    },
    month,
    plan,
    totals,
    bill,
    gauge,
    ranking,
    alwaysOn: {
      kwhPerMonth: totals.alwaysOnKwhPerMonth,
      amountPerMonth: alwaysOnAmount,
      sharePercent: totals.alwaysOnSharePercent,
      count: totals.alwaysOnCount,
      /** Même si personne n’est a la maison, cette somme part chaque mois. */
      averagePricePerKwh: alwaysOnBill.averagePricePerKwh,
      appliances: ranking.filter((item) => item.alwaysOn),
    },
    switchable: {
      kwhPerMonth: totals.switchableKwhPerMonth,
      amountPerMonth: Math.max(0, bill.totalTTC - bill.fixedFee - alwaysOnAmount),
      appliances: ranking.filter((item) => !item.alwaysOn),
    },
    /**
     * Ou en est le foyer dans son mois : le cumul (mesuré la ou c'est possible),
     * le credit restant, la projection de fin de mois. C'est ce bloc qui rend
     * l'onglet Compteur et le conseil de recharge honnêtes.
     */
    consumedSoFar: {
      kwh: soFar.kwh,
      source: soFar.source,
      measuredRatio: soFar.measuredRatio,
      driftKwh: soFar.driftKwh,
      driftPercent: soFar.driftPercent,
      remainingKwh: soFar.remainingKwh,
      lastReadingAt: soFar.lastReadingAt,
      segments: soFar.segments,
      projectedMonthKwh: projectMonthEnd(soFar.kwh, totals.kwhPerDay, daysElapsed, days),
      daysElapsed,
      daysInMonth: days,
    },
    credit:
      soFar.remainingKwh === null ? null : forecastCredit(soFar.remainingKwh, totals.kwhPerDay),
    /** Les trois seaux de l'École Woyofal, remplis a hauteur du mois en cours. */
    buckets: waterBuckets(totals.kwhPerMonth, plan),
    keyFact: keyFact(totals.kwhPerMonth, plan),
    budget,
    dailyAmount:
      totals.kwhPerMonth > 0 ? Math.round((bill.totalTTC - bill.fixedFee) / DAYS_PER_MONTH) : 0,
    appliances: household.appliances.map(serializeAppliance),
    members: household.members,
    rooms: household.rooms,
  };
}

// --- Répartition colocation --------------------------------------------------

export async function buildSplit(
  householdId: string,
  month = currentMonth(),
  user?: SessionUser | null,
) {
  const household = await getHouseholdOrThrow(householdId, user);
  const plan = await loadPlan(household.tariffCode);
  const { start, end } = monthRange(month);

  const sessions = await prisma.punctualSession.findMany({
    where: { householdId, occurredAt: { gte: start, lt: end } },
    orderBy: { occurredAt: 'desc' },
  });
  const topUps = await prisma.topUp.aggregate({
    where: { householdId, purchasedAt: { gte: start, lt: end } },
    _sum: { kwh: true, amount: true },
  });

  const members: MemberInput[] = household.members.map((member) => ({
    id: member.id,
    name: member.name,
    color: member.color,
  }));

  const actualKwh = topUps._sum.kwh && topUps._sum.kwh > 0 ? topUps._sum.kwh : undefined;

  const split = splitHousehold({
    month,
    members,
    appliances: household.appliances.map(rowToApplianceInput),
    punctualUsages: sessions.map((session) => ({
      id: session.id,
      label: session.label,
      memberId: session.memberId,
      kwh: session.kwh,
    })),
    plan,
    actualKwh,
  });

  return {
    ...split,
    basis: actualKwh ? ('recharges' as const) : ('estimation' as const),
    rechargedAmount: topUps._sum.amount ?? 0,
    sessions: sessions.map((session) => ({
      id: session.id,
      label: session.label,
      memberId: session.memberId,
      kwh: session.kwh,
      amount: session.amount,
      durationMinutes: session.durationMinutes,
      occurredAt: session.occurredAt,
    })),
  };
}

// --- Smart Recharge ----------------------------------------------------------

/**
 * Le conseil d'achat du foyer.
 *
 * Deux cumuls cohabitent, et les confondre fausserait tout :
 *   - ce qui a été CONSOMMÉ (relevés + estimation) dit quand il faut racheter ;
 *   - ce qui a été ACHETÉ depuis le 1er dit a quel prix sera le prochain kWh.
 */
export async function buildRechargeAdvice(
  householdId: string,
  month = currentMonth(),
  user?: SessionUser | null,
) {
  const household = await getHouseholdOrThrow(householdId, user);
  const plan = await loadPlan(household.tariffCode);

  const totals = sumConsumption(household.appliances.map(rowToApplianceInput).map((a) => a.consumption));
  const cumul = await consumedSoFar(householdId, month, totals.kwhPerDay);
  const achats = await purchasedSoFar(householdId, month, cumul.kwh);

  const advice = rechargeAdvice({
    plan,
    purchasedKwhThisMonth: achats.kwh,
    remainingKwh: cumul.remainingKwh,
    estimatedKwhPerDay: totals.kwhPerDay,
  });

  return {
    ...advice,
    month,
    /** D'ou vient le cumul d'achats : mesuré, ou déduit faute de mieux. */
    purchaseSource: achats.source,
    consumedKwh: cumul.kwh,
    consumedSource: cumul.source,
    estimatedKwhPerDay: totals.kwhPerDay,
    plan,
  };
}

// --- Relevés du compteur -----------------------------------------------------

/**
 * Enregistre un releve du boîtier mural et calcule, si possible, ce qui a été
 * consomme depuis le releve precedent — la seule mesure vraie de l'application.
 */
export async function recordReading(
  householdId: string,
  input: { remainingKwh: number; note?: string | null; readAt?: Date },
  user?: SessionUser | null,
) {
  const household = await getHouseholdOrThrow(householdId, user);
  const readAt = input.readAt ?? new Date();

  const precedent = await prisma.meterReading.findFirst({
    where: { householdId: household.id, readAt: { lt: readAt } },
    orderBy: { readAt: 'desc' },
  });

  let consumedKwh: number | null = null;
  if (precedent) {
    const recharges = await prisma.topUp.aggregate({
      where: { householdId: household.id, purchasedAt: { gte: precedent.readAt, lte: readAt } },
      _sum: { kwh: true },
    });
    const consomme = precedent.remainingKwh + (recharges._sum.kwh ?? 0) - input.remainingKwh;
    // Un consomme negatif signale une recharge non enregistrée : on ne stocke
    // pas un chiffre faux, on laisse le champ vide.
    consumedKwh = consomme >= 0 ? Math.round(consomme * 100) / 100 : null;
  }

  return prisma.meterReading.create({
    data: {
      householdId: household.id,
      remainingKwh: input.remainingKwh,
      consumedKwh,
      note: input.note ?? null,
      readAt,
    },
  });
}

export async function listReadings(
  householdId: string,
  user?: SessionUser | null,
  limit = 30,
) {
  const household = await getHouseholdOrThrow(householdId, user);
  return prisma.meterReading.findMany({
    where: { householdId: household.id },
    orderBy: { readAt: 'desc' },
    take: limit,
  });
}
