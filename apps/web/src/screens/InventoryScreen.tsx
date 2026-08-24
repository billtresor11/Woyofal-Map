import { useMemo, useState } from 'react';
import type { Appliance, ApplianceTemplate } from '../api/types.js';
import { ApplianceIcon } from '../components/ApplianceIcon.js';
import { AppliancePicker } from '../components/AppliancePicker.js';
import { ApplianceConfigSheet } from '../components/ApplianceConfigSheet.js';
import { CostHeader } from '../components/CostHeader.js';
import { EmptyState } from '../components/ui.js';
import { useApp } from '../hooks/useApp.js';
import { fcfa, initial, kwh as fmtKwh } from '../lib/format.js';

/**
 * ONGLET 1 - Inventaire visuel.
 * Deux blocs volontairement séparés :
 *   - "Ça tourne tout seul" : le socle 24h/24, invisible et incompressible ;
 *   - "Vous les allumez"    : ce sur quoi l’utilisateur peut vraiment agir.
 * C’est cette séparation qui transforme une facture subie en décisions.
 */
export function InventoryScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { summary, catalog, refresh } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [template, setTemplate] = useState<ApplianceTemplate | null>(null);
  const [editing, setEditing] = useState<Appliance | null>(null);
  const [suggestedLabel, setSuggestedLabel] = useState<string | undefined>();

  const costById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of summary?.ranking ?? []) map.set(item.applianceId, item.amountPerMonth);
    return map;
  }, [summary]);

  if (!summary) return null;

  const alwaysOn = summary.appliances.filter((appliance) => appliance.alwaysOn);
  const switchable = summary.appliances.filter((appliance) => !appliance.alwaysOn);
  const sortByCost = (a: Appliance, b: Appliance) =>
    (costById.get(b.id) ?? 0) - (costById.get(a.id) ?? 0);

  function openTemplate(picked: ApplianceTemplate, suggestedName?: string) {
    setEditing(null);
    setSuggestedLabel(suggestedName);
    setTemplate(picked);
    setPickerOpen(false);
  }

  function openExisting(appliance: Appliance) {
    const found = catalog?.templates.find((item) => item.id === appliance.templateId) ?? null;
    setEditing(appliance);
    setSuggestedLabel(undefined);
    setTemplate(found);
  }

  return (
    <div className="pb-28 lg:pb-0">
      <CostHeader summary={summary} onOpenTariff={onOpenSettings} />

      <div className="space-y-6 px-4 pt-5">
        {summary.appliances.length === 0 ? (
          <EmptyState
            emoji="🔌"
            title="Commençons par vos appareils"
            action={
              <button onClick={() => setPickerOpen(true)} className="btn-primary mt-2">
                ➕ Ajouter mon premier appareil
              </button>
            }
          >
            Touchez les objets que vous avez chez vous. Pas besoin de connaître leur puissance :
            l’application s’en occupe.
          </EmptyState>
        ) : null}

        {/* --- Le socle 24h/24 ---------------------------------------------- */}
        {alwaysOn.length > 0 ? (
          <section>
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-black leading-tight">🔁 Ça tourne tout seul</h2>
                <p className="text-sm font-bold text-ink-soft">
                  Même quand la maison est vide, 24h/24.
                </p>
                <p className="text-sm font-extrabold text-ink-soft">
                  {fmtKwh(summary.totals.alwaysOnKwhPerDay)} par jour ·{' '}
                  {fmtKwh(summary.totals.alwaysOnKwhPerMonth)} ce mois-ci
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="whitespace-nowrap text-xl font-black leading-none text-mango-600">
                  {fcfa(summary.alwaysOn.amountPerMonth)}
                </p>
                <p className="text-xs font-bold text-ink-muted">
                  {summary.alwaysOn.sharePercent}% de la facture
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {[...alwaysOn].sort(sortByCost).map((appliance) => (
                <ApplianceRow
                  key={appliance.id}
                  appliance={appliance}
                  amount={costById.get(appliance.id) ?? 0}
                  onClick={() => openExisting(appliance)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* --- Les appareils qu’on allume ----------------------------------- */}
        {switchable.length > 0 ? (
          <section>
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-black leading-tight">🎚️ Vous les allumez</h2>
                <p className="text-sm font-bold text-ink-soft">Là où vous pouvez agir.</p>
                <p className="text-sm font-extrabold text-ink-soft">
                  {fmtKwh(summary.totals.switchableKwhPerDay)} par jour ·{' '}
                  {fmtKwh(summary.totals.switchableKwhPerMonth)} ce mois-ci
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="whitespace-nowrap text-xl font-black leading-none text-teal-600">
                  {fcfa(summary.switchable.amountPerMonth)}
                </p>
                <p className="text-xs font-bold text-ink-muted">par mois</p>
              </div>
            </div>
            <div className="space-y-2">
              {[...switchable].sort(sortByCost).map((appliance) => (
                <ApplianceRow
                  key={appliance.id}
                  appliance={appliance}
                  amount={costById.get(appliance.id) ?? 0}
                  onClick={() => openExisting(appliance)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {summary.appliances.length > 0 ? (
          <p className="px-2 text-center text-xs font-bold leading-relaxed text-ink-muted">
            Estimation calculée à partir de {summary.totals.applianceCount} appareil
            {summary.totals.applianceCount > 1 ? 's' : ''} et de la grille {summary.plan.label}.
            Comparez-la à votre prochaine recharge pour l’affiner.
          </p>
        ) : null}
      </div>

      {/*
        Bouton d'ajout. Sur téléphone il flotte au-dessus de la barre d'onglets,
        à portée de pouce. Sur ordinateur, où il n'y a ni pouce ni barre basse,
        un bouton flottant se poserait en travers de la liste : il redevient
        donc un bouton normal, à la fin du contenu.
      */}
      <div className="mt-6 hidden justify-center px-4 pb-6 lg:flex">
        <button onClick={() => setPickerOpen(true)} className="btn-primary px-6">
          ➕ Ajouter un appareil
        </button>
      </div>
      <button
        onClick={() => setPickerOpen(true)}
        className="btn-primary fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-30 -translate-x-1/2 px-6 shadow-pop lg:hidden"
      >
        ➕ Ajouter un appareil
      </button>

      <AppliancePicker
        open={pickerOpen}
        catalog={catalog}
        onClose={() => setPickerOpen(false)}
        onPick={openTemplate}
      />
      <ApplianceConfigSheet
        open={template !== null}
        template={template}
        existing={editing}
        suggestedLabel={suggestedLabel}
        householdId={summary.household.id}
        members={summary.members}
        rooms={summary.rooms}
        onClose={() => {
          setTemplate(null);
          setEditing(null);
        }}
        onSaved={refresh}
      />
    </div>
  );
}

function ApplianceRow({
  appliance,
  amount,
  onClick,
}: {
  appliance: Appliance;
  amount: number;
  onClick: () => void;
}) {
  const { summary } = useApp();
  const members = summary?.members ?? [];

  /**
   * Qui porte cet appareil sur sa part de facture ?
   * Un appareil personnel n'a qu'un propriétaire ; un appareil commun est porté
   * par les personnes désignées, ou par tout le foyer si rien n'a été restreint.
   */
  const sharers =
    appliance.ownership === 'PRIVATE'
      ? members.filter((member) => member.id === appliance.ownerId)
      : appliance.shares.length > 0
        ? members.filter((member) => appliance.shares.some((s) => s.memberId === member.id))
        : members;

  return (
    <button onClick={onClick} className="tap card flex w-full items-center gap-3 px-4 py-3 text-left">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-teal-600">
        <ApplianceIcon templateId={appliance.templateId} className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-base font-extrabold">{appliance.label}</span>
          {appliance.quantity > 1 ? (
            <span className="chip bg-sand-100 px-2 py-0 text-xs">x{appliance.quantity}</span>
          ) : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-ink-muted">
          <span>
            {fmtKwh(appliance.consumption.kwhPerDay)}/jour · {fmtKwh(appliance.consumption.kwhPerMonth)}/mois
          </span>
          {sharers.length > 0 ? (
            <span
              className="flex items-center gap-1"
              title={
                appliance.ownership === 'PRIVATE'
                  ? `Appareil personnel de ${sharers[0]?.name}`
                  : `Partagé entre ${sharers.map((member) => member.name).join(', ')}`
              }
            >
              {sharers.length === 1 ? (
                <span className="chip bg-sand-100 px-2 py-0 text-[11px]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: sharers[0]!.color }}
                  />
                  {sharers[0]!.name}
                </span>
              ) : (
                <>
                  {sharers.slice(0, 5).map((member) => (
                    <span
                      key={member.id}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {initial(member.name)}
                    </span>
                  ))}
                  {sharers.length > 5 ? <span>+{sharers.length - 5}</span> : null}
                  <span className="text-[11px]">
                    {sharers.length === members.length ? 'tout le monde' : 'partagé'}
                  </span>
                </>
              )}
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-black leading-none tabular-nums">{fcfa(amount)}</span>
        <span className="text-[11px] font-bold text-ink-muted">par mois</span>
      </span>
    </button>
  );
}
