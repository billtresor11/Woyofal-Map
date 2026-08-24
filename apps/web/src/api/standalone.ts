import {
  APPLIANCE_TEMPLATES,
  CATEGORIES,
  TARIFF_PLANS,
  balanceAllocation,
  computeConsumption,
  computeCumulativeKwh,
  computeMonthlyBill,
  computePunctualKwh,
  defaultSelection,
  estimatePunctual,
  findTemplate,
  forecastCredit,
  keyFact,
  kwhForAmount,
  marginalCost,
  planAllocation,
  projectMonthEnd,
  rankAppliances,
  rechargeAdvice,
  splitHousehold,
  sumConsumption,
  tierProgress,
  waterBuckets,
  DAYS_PER_MONTH,
  type ApplianceInput,
  type ConsumptionResult,
  type TariffPlan,
} from '@woyofal/core';

/**
 * ---------------------------------------------------------------------------
 * MODE AUTONOME (démonstration sans serveur)
 * ---------------------------------------------------------------------------
 * Cette version rejoue, dans le navigateur, exactement ce que fait l'API :
 * mêmes calculs (ils viennent du même moteur @woyofal/core), mêmes réponses.
 * Seule la persistance change : le navigateur remplace la base de données.
 *
 * Elle sert à faire essayer l'application sans rien installer. La version
 * serveur reste la vraie : elle seule permet de partager un foyer entre
 * plusieurs téléphones.
 */

const STORAGE_KEY = 'woyofal.standalone.db.v2';

interface DbHousehold {
  id: string;
  name: string;
  tariffCode: string;
  meterType: string;
  subscribedKva: number;
  monthlyBudget: number | null;
}
interface DbMember {
  id: string;
  householdId: string;
  name: string;
  color: string;
  presenceRatio: number;
}
interface DbAppliance {
  id: string;
  householdId: string;
  templateId: string;
  label: string;
  options: Record<string, string>;
  usageProfileId: string | null;
  quantity: number;
  ownership: 'SHARED' | 'PRIVATE';
  ownerId: string | null;
  roomId: string | null;
  consumption: ConsumptionResult;
  /** Personnes qui partagent l'appareil ; vide = tout le foyer. */
  shares: Record<string, number>;
  createdAt: number;
}
interface DbSession {
  id: string;
  householdId: string;
  memberId: string | null;
  templateId: string;
  label: string;
  durationMinutes: number;
  kwh: number;
  amount: number;
  occurredAt: string;
}
interface DbTopUp {
  id: string;
  householdId: string;
  amount: number;
  kwh: number;
  purchasedAt: string;
}
/** Un relevé du boîtier mural, en mode autonome comme côté serveur. */
interface DbReading {
  id: string;
  householdId: string;
  remainingKwh: number;
  consumedKwh: number | null;
  note: string | null;
  readAt: string;
  createdAt: string;
}
interface Db {
  households: DbHousehold[];
  members: DbMember[];
  appliances: DbAppliance[];
  sessions: DbSession[];
  topUps: DbTopUp[];
  readings: DbReading[];
  tariffs: Record<string, TariffPlan>;
}

const MEMBER_COLORS = ['#F97316', '#0EA5E9', '#22C55E', '#8B5CF6', '#EC4899', '#EAB308'];

function newId(): string {
  return `id${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDb(): Db {
  return {
    households: [],
    members: [],
    appliances: [],
    sessions: [],
    topUps: [],
    readings: [],
    tariffs: {},
  };
}

function read(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyDb(), ...(JSON.parse(raw) as Db) };
  } catch {
    /* navigation privée : on repart d'une base vide */
  }
  return emptyDb();
}

function write(db: Db): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* quota plein ou stockage refusé : la session reste utilisable en mémoire */
  }
}

let memory: Db | null = null;
function db(): Db {
  if (!memory) memory = read();
  return memory;
}
function save(): void {
  if (memory) write(memory);
}

function plan(code: string): TariffPlan {
  const custom = db().tariffs[code];
  if (custom) return custom;
  return TARIFF_PLANS.find((p) => p.code === code) ?? TARIFF_PLANS[0]!;
}

function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

class NotFound extends Error {
  status = 404;
}

class BadRequest extends Error {
  status = 400;
}

function household(id: string): DbHousehold {
  const found = db().households.find((h) => h.id === id);
  if (!found) throw new NotFound('Ce foyer est introuvable.');
  return found;
}

function toApplianceInput(row: DbAppliance): ApplianceInput {
  const shares = row.shares && Object.keys(row.shares).length > 0 ? row.shares : undefined;
  return {
    id: row.id,
    label: row.label,
    templateId: row.templateId,
    ownership: row.ownership,
    ownerId: row.ownerId,
    shares,
    consumption: row.consumption,
  };
}

function serializeAppliance(row: DbAppliance) {
  const template = findTemplate(row.templateId);
  return {
    id: row.id,
    label: row.label,
    templateId: row.templateId,
    templateName: template?.name ?? row.label,
    emoji: template?.emoji ?? '🔌',
    category: template?.category ?? 'numerique',
    options: row.options,
    usageProfileId: row.usageProfileId,
    quantity: row.quantity,
    ownership: row.ownership,
    ownerId: row.ownerId,
    roomId: row.roomId,
    isActive: true,
    alwaysOn: row.consumption.alwaysOn,
    consumption: row.consumption,
    shares: Object.entries(row.shares ?? {}).map(([memberId, weight]) => ({ memberId, weight })),
  };
}

function monthBounds(month: string): { start: Date; end: Date } {
  const [year, part] = month.split('-').map(Number);
  return { start: new Date(year!, part! - 1, 1), end: new Date(year!, part!, 1) };
}

/**
 * Le cumul du mois, calculé par le MÊME moteur que le serveur.
 * Le mode autonome ne réimplémente jamais un calcul : il ne fait que fournir
 * les données. C'est la seule façon d'être sûr que les deux versions disent
 * le même prix.
 */
function consumedSoFar(householdId: string, month: string, kwhPerDay: number) {
  const { start, end } = monthBounds(month);
  return computeCumulativeKwh({
    monthStart: start,
    monthEnd: end,
    readings: (db().readings ?? [])
      .filter((r) => r.householdId === householdId)
      .map((r) => ({ id: r.id, remainingKwh: r.remainingKwh, readAt: new Date(r.readAt) })),
    topUps: db()
      .topUps.filter((t) => t.householdId === householdId)
      .map((t) => ({ id: t.id, kwh: t.kwh, purchasedAt: new Date(t.purchasedAt) })),
    estimatedKwhPerDay: kwhPerDay,
  });
}

/** kWh achetés depuis le 1er : c'est eux qui fixent la tranche à l'achat. */
function purchasedSoFar(householdId: string, month: string, fallbackKwh: number) {
  const total = db()
    .topUps.filter((t) => t.householdId === householdId && t.purchasedAt.startsWith(month))
    .reduce((sum, t) => sum + t.kwh, 0);
  return total > 0
    ? { kwh: Math.round(total * 100) / 100, source: 'achats' as const }
    : { kwh: Math.round(fallbackKwh * 100) / 100, source: 'estimation' as const };
}

function buildRechargeAdvice(householdId: string, month = currentMonth()) {
  const home = household(householdId);
  const tariff = plan(home.tariffCode);
  const totals = sumConsumption(
    db()
      .appliances.filter((a) => a.householdId === householdId)
      .map(toApplianceInput)
      .map((a) => a.consumption),
  );
  const cumul = consumedSoFar(householdId, month, totals.kwhPerDay);
  const achats = purchasedSoFar(householdId, month, cumul.kwh);

  return {
    ...rechargeAdvice({
      plan: tariff,
      purchasedKwhThisMonth: achats.kwh,
      remainingKwh: cumul.remainingKwh,
      estimatedKwhPerDay: totals.kwhPerDay,
    }),
    month,
    purchaseSource: achats.source,
    consumedKwh: cumul.kwh,
    consumedSource: cumul.source,
    estimatedKwhPerDay: totals.kwhPerDay,
    plan: tariff,
  };
}

/** Enregistre un relevé et reconstitue le consommé depuis le précédent. */
function addReading(householdId: string, payload: Record<string, unknown>): DbReading {
  household(householdId);
  const remainingKwh = Number(payload.remainingKwh);
  const readAt = payload.readAt ? new Date(String(payload.readAt)) : new Date();

  const precedent = (db().readings ?? [])
    .filter((r) => r.householdId === householdId && new Date(r.readAt) < readAt)
    .sort((a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime())[0];

  let consumedKwh: number | null = null;
  if (precedent) {
    const recharges = db()
      .topUps.filter((t) => {
        const date = new Date(t.purchasedAt);
        return t.householdId === householdId && date >= new Date(precedent.readAt) && date <= readAt;
      })
      .reduce((sum, t) => sum + t.kwh, 0);
    const consomme = precedent.remainingKwh + recharges - remainingKwh;
    consumedKwh = consomme >= 0 ? Math.round(consomme * 100) / 100 : null;
  }

  const reading: DbReading = {
    id: newId(),
    householdId,
    remainingKwh,
    consumedKwh,
    note: payload.note ? String(payload.note) : null,
    readAt: readAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
  db().readings.push(reading);
  save();
  return reading;
}

/** Ajout en masse ventilé : une ligne par groupe, comme côté serveur. */
function addApplianceBulk(householdId: string, payload: Record<string, unknown>) {
  const total = Number(payload.total);
  const groupes = balanceAllocation(
    total,
    (payload.groups as Array<{ memberId: string | null; quantity: number }>) ?? [],
  );
  const verdict = planAllocation(total, groupes);
  if (!verdict.valid) throw new BadRequest(verdict.message);

  const noms = new Map(
    db()
      .members.filter((m) => m.householdId === householdId)
      .map((m) => [m.id, m.name]),
  );
  const template = findTemplate(String(payload.templateId));
  const base = payload.label ? String(payload.label) : (template?.name ?? 'Appareil');

  const appliances = groupes.map((groupe) =>
    addAppliance(householdId, {
      ...payload,
      label: groupe.memberId ? `${base} de ${noms.get(groupe.memberId) ?? ''}`.trim() : base,
      quantity: groupe.quantity,
      ownership: groupe.memberId ? 'PRIVATE' : 'SHARED',
      ownerId: groupe.memberId,
    }),
  );
  return { appliances, allocation: groupes };
}

function buildSummary(householdId: string, month = currentMonth()) {
  const home = household(householdId);
  const tariff = plan(home.tariffCode);
  const rows = db()
    .appliances.filter((a) => a.householdId === householdId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const inputs = rows.map(toApplianceInput);
  const totals = sumConsumption(inputs.map((a) => a.consumption));
  const bill = computeMonthlyBill(totals.kwhPerMonth, tariff);
  const ranking = rankAppliances(inputs, tariff);
  const energy = bill.totalTTC - bill.fixedFee;
  const alwaysOnAmount =
    totals.kwhPerMonth > 0
      ? Math.round((totals.alwaysOnKwhPerMonth / totals.kwhPerMonth) * energy)
      : 0;

  return {
    household: home,
    month,
    plan: tariff,
    totals,
    bill,
    gauge: tierProgress(totals.kwhPerMonth, tariff),
    ranking,
    alwaysOn: {
      kwhPerMonth: totals.alwaysOnKwhPerMonth,
      amountPerMonth: alwaysOnAmount,
      sharePercent: totals.alwaysOnSharePercent,
      count: totals.alwaysOnCount,
      averagePricePerKwh: bill.averagePricePerKwh,
      appliances: ranking.filter((item) => item.alwaysOn),
    },
    switchable: {
      kwhPerMonth: totals.switchableKwhPerMonth,
      amountPerMonth: Math.max(0, energy - alwaysOnAmount),
      appliances: ranking.filter((item) => !item.alwaysOn),
    },
    consumedSoFar: (() => {
      const cumul = consumedSoFar(householdId, month, totals.kwhPerDay);
      const now = new Date();
      const { start, end } = monthBounds(month);
      const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      const daysElapsed = now >= end ? days : Math.max(1, now.getDate());
      return {
        ...cumul,
        projectedMonthKwh: projectMonthEnd(cumul.kwh, totals.kwhPerDay, daysElapsed, days),
        daysElapsed,
        daysInMonth: days,
      };
    })(),
    credit: (() => {
      const cumul = consumedSoFar(householdId, month, totals.kwhPerDay);
      return cumul.remainingKwh === null
        ? null
        : forecastCredit(cumul.remainingKwh, totals.kwhPerDay);
    })(),
    buckets: waterBuckets(totals.kwhPerMonth, tariff),
    keyFact: keyFact(totals.kwhPerMonth, tariff),
    budget: home.monthlyBudget
      ? {
          target: home.monthlyBudget,
          projected: bill.totalTTC,
          remaining: home.monthlyBudget - bill.totalTTC,
          status:
            bill.totalTTC <= home.monthlyBudget * 0.85
              ? ('ok' as const)
              : bill.totalTTC <= home.monthlyBudget
                ? ('warning' as const)
                : ('over' as const),
        }
      : null,
    dailyAmount: totals.kwhPerMonth > 0 ? Math.round(energy / DAYS_PER_MONTH) : 0,
    appliances: rows.map(serializeAppliance),
    members: db().members.filter((m) => m.householdId === householdId),
    rooms: [],
  };
}

function buildSplit(householdId: string, month = currentMonth()) {
  const home = household(householdId);
  const tariff = plan(home.tariffCode);
  const members = db().members.filter((m) => m.householdId === householdId);
  const sessions = db().sessions.filter(
    (s) => s.householdId === householdId && s.occurredAt.startsWith(month),
  );
  const topUps = db().topUps.filter(
    (t) => t.householdId === householdId && t.purchasedAt.startsWith(month),
  );
  const actualKwh = topUps.reduce((sum, t) => sum + t.kwh, 0);

  const split = splitHousehold({
    month,
    members,
    appliances: db()
      .appliances.filter((a) => a.householdId === householdId)
      .map(toApplianceInput),
    punctualUsages: sessions.map((s) => ({
      id: s.id,
      label: s.label,
      memberId: s.memberId,
      kwh: s.kwh,
    })),
    plan: tariff,
    actualKwh: actualKwh > 0 ? actualKwh : undefined,
  });

  return {
    ...split,
    basis: actualKwh > 0 ? ('recharges' as const) : ('estimation' as const),
    rechargedAmount: topUps.reduce((sum, t) => sum + t.amount, 0),
    sessions,
  };
}

function addAppliance(householdId: string, body: Record<string, unknown>) {
  const template = findTemplate(String(body.templateId));
  if (!template) throw new NotFound('Cet appareil est introuvable.');
  const options = (body.options as Record<string, string>) ?? {};
  const consumption = computeConsumption(template, {
    templateId: template.id,
    options,
    usageProfileId: (body.usageProfileId as string) ?? undefined,
    quantity: body.quantity as number | undefined,
    hoursPerDay: body.hoursPerDay as number | undefined,
    daysPerWeek: body.daysPerWeek as number | undefined,
  });
  const row: DbAppliance = {
    id: newId(),
    householdId,
    templateId: template.id,
    label: (body.label as string) ?? template.name,
    options,
    usageProfileId: (body.usageProfileId as string) ?? null,
    quantity: consumption.quantity,
    ownership: body.ownership === 'PRIVATE' ? 'PRIVATE' : 'SHARED',
    ownerId: (body.ownerId as string) ?? null,
    roomId: (body.roomId as string) ?? null,
    consumption,
    shares: (body.shares as Record<string, number>) ?? {},
    createdAt: Date.now(),
  };
  db().appliances.push(row);
  save();
  return serializeAppliance(row);
}

function updateAppliance(id: string, body: Record<string, unknown>) {
  const row = db().appliances.find((a) => a.id === id);
  if (!row) throw new NotFound('Cet appareil est introuvable.');
  const template = findTemplate(row.templateId);
  if (!template) throw new NotFound('Cet appareil est introuvable.');

  row.options = (body.options as Record<string, string>) ?? row.options;
  // `null` transmis explicitement = fréquence sur mesure, sans profil prédéfini.
  if (body.usageProfileId !== undefined) row.usageProfileId = (body.usageProfileId as string) ?? null;
  if (body.label !== undefined) row.label = body.label as string;
  if (body.ownership !== undefined) row.ownership = body.ownership as 'SHARED' | 'PRIVATE';
  if (body.ownerId !== undefined) row.ownerId = (body.ownerId as string) ?? null;
  if (body.shares !== undefined) row.shares = (body.shares as Record<string, number>) ?? {};
  if (body.roomId !== undefined) row.roomId = (body.roomId as string) ?? null;
  row.consumption = computeConsumption(template, {
    templateId: template.id,
    options: row.options,
    usageProfileId: row.usageProfileId ?? undefined,
    quantity: (body.quantity as number) ?? row.quantity,
    hoursPerDay: body.hoursPerDay as number | undefined,
    daysPerWeek: body.daysPerWeek as number | undefined,
  });
  row.quantity = row.consumption.quantity;
  save();
  return serializeAppliance(row);
}

/** Foyer de démonstration : l’application ne doit jamais s’ouvrir vide. */
function seedIfEmpty(): string | null {
  const data = db();
  if (data.households.length > 0) return data.households[0]!.id;

  const home: DbHousehold = {
    id: newId(),
    name: 'Maison Démo (Dakar)',
    tariffCode: 'WOYOFAL_DPP',
    meterType: 'PREPAID',
    subscribedKva: 5,
    monthlyBudget: 35000,
  };
  data.households.push(home);

  ['Awa', 'Babacar', 'Coumba'].forEach((name, index) => {
    data.members.push({
      id: newId(),
      householdId: home.id,
      name,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length]!,
      presenceRatio: 1,
    });
  });
  const awa = data.members[0]!;

  const demo: Array<
    [string, Record<string, string>, string | undefined, 'SHARED' | 'PRIVATE', string | null, number?]
  > = [
    ['refrigerateur', { taille: 'moyen' }, undefined, 'SHARED', null],
    ['televiseur', { taille: 'p43' }, 'soir', 'SHARED', null],
    ['decodeur', {}, undefined, 'SHARED', null],
    ['box_internet', {}, undefined, 'SHARED', null],
    ['ampoules', { type: 'led' }, 'soir', 'SHARED', null, 8],
    ['ventilateur', { type: 'pied' }, 'nuit', 'SHARED', null, 2],
    ['fer_repasser', {}, 'hebdo', 'SHARED', null],
    ['machine_laver', { programme: 'froid', sechage: 'non' }, 'deux', 'SHARED', null],
    ['climatiseur', { puissance: 'cv1_5', techno: 'classique', reglage: 'moyen' }, 'nuit', 'PRIVATE', awa.id],
  ];

  for (const [templateId, options, usageProfileId, ownership, ownerId, quantity] of demo) {
    const template = findTemplate(templateId);
    if (!template) continue;
    const base = defaultSelection(template);
    const selection = {
      ...base,
      options: { ...base.options, ...options },
      usageProfileId: usageProfileId ?? base.usageProfileId,
      quantity: quantity ?? base.quantity,
    };
    data.appliances.push({
      id: newId(),
      householdId: home.id,
      templateId,
      label: template.name,
      options: selection.options,
      usageProfileId: selection.usageProfileId ?? null,
      quantity: computeConsumption(template, selection).quantity,
      ownership,
      ownerId,
      roomId: null,
      consumption: computeConsumption(template, selection),
      shares: {},
      createdAt: Date.now(),
    });
  }

  save();
  return home.id;
}

export function initStandalone(): string | null {
  const demoId = seedIfEmpty();
  // Un foyer mémorisé qui n'existe plus (base réinitialisée) renverrait l'utilisateur
  // sur une erreur : on le raccroche silencieusement à la démonstration.
  try {
    const stored = localStorage.getItem('woyofal.householdId');
    if (stored && !db().households.some((h) => h.id === stored)) {
      localStorage.removeItem('woyofal.householdId');
    }
  } catch {
    /* stockage indisponible : rien à réparer */
  }
  return demoId;
}

/**
 * Aiguillage : même contrat que l'API HTTP, en local.
 * Chaque branche correspond à une route du serveur.
 */
export async function handleStandalone<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const payload = (body ?? {}) as Record<string, unknown>;
  const match = (pattern: RegExp) => pattern.exec(path);
  const answer = (value: unknown) => value as T;

  if (method === 'GET' && path === '/api/catalog') {
    return answer({ categories: CATEGORIES, templates: APPLIANCE_TEMPLATES });
  }

  if (method === 'GET' && path === '/api/tariffs') {
    return answer({ plans: TARIFF_PLANS.map((p) => plan(p.code)) });
  }

  let m = match(/^\/api\/catalog\/([^/]+)\/preview$/);
  if (method === 'POST' && m) {
    const template = findTemplate(m[1]!);
    if (!template) throw new NotFound('Cet appareil est introuvable.');
    const consumption = computeConsumption(template, {
      templateId: template.id,
      options: (payload.options as Record<string, string>) ?? {},
      usageProfileId: (payload.usageProfileId as string) ?? undefined,
      quantity: payload.quantity as number | undefined,
      hoursPerDay: payload.hoursPerDay as number | undefined,
      daysPerWeek: payload.daysPerWeek as number | undefined,
    });
    const householdId = payload.householdId as string | undefined;
    const summary = householdId ? buildSummary(householdId) : null;
    const tariff = summary ? plan(summary.household.tariffCode) : plan('WOYOFAL_DPP');
    const bill = marginalCost(summary?.totals.kwhPerMonth ?? 0, consumption.kwhPerMonth, tariff);
    return answer({
      consumption,
      monthlyAmount: bill.totalTTC,
      dailyAmount: Math.round(bill.totalTTC / DAYS_PER_MONTH),
      yearlyAmount: bill.totalTTC * 12,
      tierLabel: bill.currentTier.label,
      pricePerKwh: bill.averagePricePerKwh,
    });
  }

  m = match(/^\/api\/tariffs\/([^/]+)$/);
  if (method === 'PATCH' && m) {
    const code = m[1]!;
    const base = plan(code);
    const tiers = (payload.tiers as Array<{ position: number; pricePerKwh?: number }>) ?? [];
    db().tariffs[code] = {
      ...base,
      source: 'Prix saisis par l’utilisateur d’après son reçu',
      tiers: base.tiers.map((tier) => {
        const update = tiers.find((t) => t.position === tier.order);
        return update?.pricePerKwh ? { ...tier, pricePerKwh: update.pricePerKwh } : tier;
      }),
    };
    save();
    return answer(db().tariffs[code]);
  }

  if (method === 'POST' && path === '/api/households') {
    const home: DbHousehold = {
      id: newId(),
      name: String(payload.name ?? 'Ma maison'),
      tariffCode: String(payload.tariffCode ?? 'WOYOFAL_DPP'),
      meterType: String(payload.meterType ?? 'PREPAID'),
      subscribedKva: Number(payload.subscribedKva ?? 5),
      monthlyBudget: (payload.monthlyBudget as number) ?? null,
    };
    db().households.push(home);
    const people = (payload.members as Array<{ name: string }>) ?? [];
    people.forEach((person, index) => {
      db().members.push({
        id: newId(),
        householdId: home.id,
        name: person.name,
        color: MEMBER_COLORS[index % MEMBER_COLORS.length]!,
        presenceRatio: 1,
      });
    });
    save();
    return answer(home);
  }

  // --- Compteur et conseil de recharge : les routes ajoutées au serveur ---
  m = match(/^\/api\/households\/([^/]+)\/readings$/);
  if (m) {
    const id = m[1]!;
    if (method === 'POST') return answer(addReading(id, payload));
    if (method === 'GET') {
      const readings = (db().readings ?? [])
        .filter((r) => r.householdId === id)
        .sort((a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime());
      return answer({ readings });
    }
  }

  m = match(/^\/api\/households\/([^/]+)\/recharge-advice$/);
  if (method === 'GET' && m) return answer(buildRechargeAdvice(m[1]!));

  m = match(/^\/api\/households\/([^/]+)\/appliances\/bulk$/);
  if (method === 'POST' && m) return answer(addApplianceBulk(m[1]!, payload));

  m = match(/^\/api\/households\/([^/]+)\/(summary|split|appliances|members|topups)$/);
  if (m) {
    const [, id, resource] = m as unknown as [string, string, string];
    if (method === 'GET' && resource === 'summary') return answer(buildSummary(id));
    if (method === 'GET' && resource === 'split') return answer(buildSplit(id));
    if (method === 'POST' && resource === 'appliances') return answer(addAppliance(id, payload));
    if (method === 'GET' && resource === 'topups') {
      return answer(db().topUps.filter((t) => t.householdId === id));
    }
    if (method === 'POST' && resource === 'members') {
      const home = household(id);
      const count = db().members.filter((x) => x.householdId === home.id).length;
      const member: DbMember = {
        id: newId(),
        householdId: id,
        name: String(payload.name),
        color: MEMBER_COLORS[count % MEMBER_COLORS.length]!,
        presenceRatio: Number(payload.presenceRatio ?? 1),
      };
      db().members.push(member);
      save();
      return answer(member);
    }
    if (method === 'POST' && resource === 'topups') {
      const home = household(id);
      const amount = Number(payload.amount);
      const kwh =
        (payload.kwh as number) ??
        kwhForAmount(amount, plan(home.tariffCode), buildSummary(id).consumedSoFar.kwh).kwh;
      const topUp: DbTopUp = {
        id: newId(),
        householdId: id,
        amount,
        kwh,
        purchasedAt: new Date().toISOString(),
      };
      db().topUps.push(topUp);
      save();
      return answer(topUp);
    }
  }

  m = match(/^\/api\/households\/([^/]+)$/);
  if (method === 'PATCH' && m) {
    const home = household(m[1]!);
    Object.assign(home, payload);
    save();
    return answer(home);
  }
  if (method === 'GET' && m) return answer(buildSummary(m[1]!));

  m = match(/^\/api\/members\/([^/]+)$/);
  if (m) {
    const member = db().members.find((x) => x.id === m![1]);
    if (!member) throw new NotFound('Ce membre est introuvable.');
    if (method === 'PATCH') {
      Object.assign(member, payload);
      save();
      return answer(member);
    }
    if (method === 'DELETE') {
      memory!.members = db().members.filter((x) => x.id !== member.id);
      save();
      return answer(undefined);
    }
  }

  m = match(/^\/api\/appliances\/([^/]+)$/);
  if (m) {
    if (method === 'PATCH') return answer(updateAppliance(m[1]!, payload));
    if (method === 'DELETE') {
      memory!.appliances = db().appliances.filter((a) => a.id !== m![1]);
      save();
      return answer(undefined);
    }
  }

  if (method === 'POST' && path === '/api/estimate/punctual') {
    const template = findTemplate(String(payload.templateId));
    if (!template) throw new NotFound('Cet appareil est introuvable.');
    const base = defaultSelection(template);
    const selection = {
      ...base,
      options: { ...base.options, ...((payload.options as Record<string, string>) ?? {}) },
    };
    const householdId = payload.householdId as string | undefined;
    const summary = householdId ? buildSummary(householdId) : null;
    const tariff = summary ? plan(summary.household.tariffCode) : plan('WOYOFAL_DPP');
    const previousKwh = summary?.consumedSoFar.kwh ?? 0;
    const minutes = Number(payload.durationMinutes);
    const kwh = computePunctualKwh(template, selection, minutes);
    const estimate = estimatePunctual(kwh, minutes, tariff, previousKwh);

    let sessionId: string | null = null;
    if (payload.save && householdId) {
      sessionId = newId();
      db().sessions.push({
        id: sessionId,
        householdId,
        memberId: (payload.memberId as string) ?? null,
        templateId: template.id,
        label: template.name,
        durationMinutes: minutes,
        kwh,
        amount: estimate.amount,
        occurredAt: new Date().toISOString(),
      });
      save();
    }
    return answer({
      template: { id: template.id, name: template.name, emoji: template.emoji },
      selection,
      previousKwh,
      estimate,
      sessionId,
    });
  }

  if (method === 'POST' && path === '/api/estimate/recharge') {
    const householdId = payload.householdId as string | undefined;
    const summary = householdId ? buildSummary(householdId) : null;
    const tariff = summary ? plan(summary.household.tariffCode) : plan('WOYOFAL_DPP');
    const previousKwh = summary?.consumedSoFar.kwh ?? 0;
    const result = kwhForAmount(Number(payload.amount), tariff, previousKwh);
    return answer({ ...result, previousKwh, planCode: tariff.code });
  }

  m = match(/^\/api\/sessions\/([^/]+)$/);
  if (method === 'DELETE' && m) {
    memory!.sessions = db().sessions.filter((s) => s.id !== m![1]);
    save();
    return answer(undefined);
  }

  throw new NotFound(`Cette action n’est pas disponible en mode démonstration (${method} ${path}).`);
}
