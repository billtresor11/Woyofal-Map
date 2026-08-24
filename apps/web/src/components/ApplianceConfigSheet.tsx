import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import type { Appliance, ApplianceTemplate, Member, PreviewResult, Room } from '../api/types.js';
import { duration as fmtDuration, fcfa, kwh as fmtKwh } from '../lib/format.js';
import { ApplianceIcon } from './ApplianceIcon.js';
import { Segmented, Sheet } from './ui.js';

/**
 * Écran de configuration d’un appareil.
 * Règle absolue : aucune saisie de puissance, aucun watt, aucune formule.
 * L’utilisateur répond à des questions (« Il est de quelle taille ? ») et voit
 * immédiatement l’effet en FCFA. Le calcul, lui, se fait côté serveur.
 *
 * Trois libertés y sont garanties, parce qu’aucune liste ne couvre tout :
 *   - le NOM est libre (« Congélateur de la boutique ») ;
 *   - le NOMBRE est libre (17 ampoules, pas seulement 5, 8 ou 12) ;
 *   - la FRÉQUENCE est libre (3 h 45 par jour, 5 jours sur 7).
 */

/** Paliers du curseur « jours par semaine », des plus rares aux quotidiens. */
const DAY_STEPS = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 7];

function daysLabel(days: number): string {
  if (days <= 0.25) return 'Environ une fois par mois';
  if (days <= 0.5) return 'Une fois tous les 15 jours';
  if (days >= 7) return 'Tous les jours';
  return `${days} jour${days > 1 ? 's' : ''} par semaine`;
}

export function ApplianceConfigSheet({
  open,
  template,
  existing,
  suggestedLabel,
  householdId,
  members,
  rooms,
  onClose,
  onSaved,
}: {
  open: boolean;
  template: ApplianceTemplate | null;
  existing?: Appliance | null;
  /** Nom repris de la recherche, quand l'appareil n'était pas au catalogue. */
  suggestedLabel?: string;
  householdId: string;
  members: Member[];
  rooms: Room[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState('');
  const [options, setOptions] = useState<Record<string, string>>({});
  /** `null` = fréquence sur mesure, définie aux curseurs. */
  const [usageProfileId, setUsageProfileId] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState(3);
  const [customDays, setCustomDays] = useState(7);
  const [quantity, setQuantity] = useState(1);
  const [ownership, setOwnership] = useState<'SHARED' | 'PRIVATE'>('SHARED');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  /** Personnes qui partagent l'appareil commun ; toutes par défaut. */
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open || !template) return;
    const defaults: Record<string, string> = {};
    for (const attribute of template.attributes) defaults[attribute.key] = attribute.defaultOptionId;
    setOptions(existing ? { ...defaults, ...existing.options } : defaults);
    setLabel(existing?.label ?? suggestedLabel ?? (template.isCustom ? '' : template.name));
    setQuantity(existing?.quantity ?? template.defaultQuantity ?? 1);

    // Un appareil enregistré sans profil utilisait une fréquence sur mesure.
    const custom = Boolean(existing) && !existing?.usageProfileId && !template.alwaysOn;
    setUsageProfileId(custom ? null : (existing?.usageProfileId ?? template.defaultUsageProfileId ?? null));
    setCustomHours(existing?.consumption.hoursPerDay ?? 3);
    setCustomDays(existing?.consumption.daysPerWeek ?? 7);

    setOwnership(existing?.ownership ?? 'SHARED');
    setOwnerId(existing?.ownerId ?? null);
    const stored = existing?.shares?.map((share) => share.memberId) ?? [];
    setSharedWith(stored.length > 0 ? stored : members.map((member) => member.id));
    setRoomId(existing?.roomId ?? null);
    setPreview(null);
    setError(null);
  }, [open, template, existing, suggestedLabel, members]);

  // Aperçu en direct : la valeur affichée est le COÛT AJOUTÉ à la facture.
  useEffect(() => {
    if (!open || !template) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      api
        .post<PreviewResult>(`/api/catalog/${template.id}/preview`, {
          options,
          usageProfileId: usageProfileId ?? undefined,
          quantity,
          ...(usageProfileId === null ? { hoursPerDay: customHours, daysPerWeek: customDays } : {}),
          householdId,
        })
        .then((result) => {
          if (id === requestId.current) setPreview(result);
        })
        .catch(() => undefined);
    }, 120);
    return () => clearTimeout(timer);
  }, [open, template, options, usageProfileId, customHours, customDays, quantity, householdId]);

  if (!template) return null;

  // Certaines réponses transforment l’appareil en appareil 24h/24 : la question
  // de la fréquence n’a alors plus de sens, et on la retire.
  const alwaysOn = preview?.consumption.alwaysOn ?? template.alwaysOn;
  const profiles = template.usageProfiles ?? [];

  async function save() {
    if (!template) return;
    setSaving(true);
    setError(null);
    const payload = {
      templateId: template.id,
      label: label.trim() || template.name,
      options,
      usageProfileId,
      quantity,
      ...(usageProfileId === null ? { hoursPerDay: customHours, daysPerWeek: customDays } : {}),
      ownership,
      ownerId: ownership === 'PRIVATE' ? ownerId : null,
      // Liste transmise seulement si tout le foyer n'est pas concerné.
      shares:
        ownership === 'SHARED' && sharedWith.length > 0 && sharedWith.length < members.length
          ? Object.fromEntries(sharedWith.map((id) => [id, 1]))
          : {},
      roomId,
    };
    try {
      if (existing) await api.patch(`/api/appliances/${existing.id}`, payload);
      else await api.post(`/api/households/${householdId}/appliances`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setSaving(true);
    try {
      await api.delete(`/api/appliances/${existing.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="text-2xl">{template.emoji}</span> {template.name}
        </span>
      }
      subtitle={
        template.isCustom
          ? 'Décrivez votre appareil : donnez-lui un nom et dites à quoi il ressemble.'
          : alwaysOn
            ? 'Cet appareil tourne 24h/24 : il consomme même quand vous dormez.'
            : 'Répondez à ces quelques questions, on s’occupe du calcul.'
      }
      footer={
        <div className="space-y-3">
          {error ? <p className="text-sm font-bold text-tier3">{error}</p> : null}
          <div className="flex gap-2">
            {existing ? (
              <button onClick={remove} disabled={saving} className="btn-ghost text-tier3">
                🗑️
              </button>
            ) : null}
            <button onClick={save} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Enregistrement...' : existing ? 'Mettre à jour' : 'Ajouter à mon inventaire'}
            </button>
          </div>
        </div>
      }
    >
      {/* --- Aperçu du coût ------------------------------------------------ */}
      <div className="card mb-5 flex items-center gap-4 px-4 py-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-teal-600">
          <ApplianceIcon templateId={template.id} className="h-9 w-9" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            Ce que cet appareil ajoute
          </p>
          <p className="text-3xl font-black leading-tight tabular-nums text-teal-600">
            {preview ? fcfa(preview.monthlyAmount) : '—'}
            <span className="text-base font-extrabold text-ink-soft"> / mois</span>
          </p>
          <p className="text-sm font-bold text-ink-soft">
            {preview
              ? `${fmtKwh(preview.consumption.kwhPerMonth)} par mois · ${fmtKwh(preview.consumption.kwhPerDay)} et environ ${fcfa(preview.dailyAmount)} par jour`
              : 'Calcul en cours...'}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* --- Nom : libre, pour reconnaître ses appareils d’un coup d’œil -- */}
        <div>
          <label className="mb-2 block text-base font-black">
            ✏️ Comment l’appelez-vous ?
            {!template.isCustom ? (
              <span className="ml-1 font-bold text-ink-muted">(facultatif)</span>
            ) : null}
          </label>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={template.isCustom ? 'Ex : Congélateur de la boutique' : template.name}
            maxLength={60}
            className="w-full rounded-2xl border-2 border-transparent bg-white px-4 py-3 text-base font-bold shadow-card outline-none focus:border-teal-500"
          />
        </div>

        {/* --- Caractéristiques --------------------------------------------- */}
        {template.attributes.map((attribute) => (
          <fieldset key={attribute.key}>
            <legend className="mb-2 text-base font-black">
              {attribute.emoji ? <span className="mr-1">{attribute.emoji}</span> : null}
              {attribute.question}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {attribute.options.map((option) => {
                const selected = (options[attribute.key] ?? attribute.defaultOptionId) === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setOptions((prev) => ({ ...prev, [attribute.key]: option.id }))}
                    className={`tap rounded-2xl border-2 px-3 py-3 text-left transition ${
                      selected
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-transparent bg-white shadow-card'
                    }`}
                  >
                    <span className="block text-sm font-extrabold leading-tight">
                      {option.emoji ? <span className="mr-1">{option.emoji}</span> : null}
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="mt-0.5 block text-xs font-bold text-ink-muted">
                        {option.hint}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* --- Nombre : n’importe lequel ------------------------------------ */}
        {template.allowQuantity ? (
          <div className="card px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-black">🔢 Combien en avez-vous ?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="tap h-10 w-10 shrink-0 rounded-full bg-sand-100 text-xl font-black"
                  aria-label="Un de moins"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={(event) => {
                    const next = Number(event.target.value.replace(/\D/g, ''));
                    setQuantity(Number.isFinite(next) && next > 0 ? Math.min(999, next) : 1);
                  }}
                  className="w-16 rounded-xl bg-sand-100 px-2 py-2 text-center text-xl font-black tabular-nums outline-none ring-2 ring-transparent focus:ring-teal-500"
                  aria-label="Nombre d’appareils"
                />
                <button
                  onClick={() => setQuantity((value) => Math.min(999, value + 1))}
                  className="tap h-10 w-10 shrink-0 rounded-full bg-sand-100 text-xl font-black"
                  aria-label="Un de plus"
                >
                  +
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs font-bold text-ink-muted">
              Vous pouvez saisir n’importe quel nombre en touchant le chiffre.
            </p>
          </div>
        ) : null}

        {/* --- Fréquence : profils rapides, ou réglage libre ---------------- */}
        {!alwaysOn && profiles.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-base font-black">
              ⏱️ Vous l’utilisez combien de temps ?
            </legend>
            <div className="space-y-2">
              {profiles.map((profile) => {
                const selected = usageProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => setUsageProfileId(profile.id)}
                    className={`tap flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                      selected
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-transparent bg-white shadow-card'
                    }`}
                  >
                    <span className="text-xl">{profile.emoji}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-extrabold">{profile.label}</span>
                      {profile.hint ? (
                        <span className="block text-xs font-bold text-ink-muted">{profile.hint}</span>
                      ) : null}
                    </span>
                    {selected ? <span className="text-teal-600">✓</span> : null}
                  </button>
                );
              })}

              <button
                onClick={() => setUsageProfileId(null)}
                className={`tap flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                  usageProfileId === null
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-transparent bg-white shadow-card'
                }`}
              >
                <span className="text-xl">🎚️</span>
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">Aucun ne correspond</span>
                  <span className="block text-xs font-bold text-ink-muted">
                    Je règle moi-même la durée et les jours
                  </span>
                </span>
                {usageProfileId === null ? <span className="text-teal-600">✓</span> : null}
              </button>
            </div>

            {usageProfileId === null ? (
              <div className="card mt-2 space-y-4 px-4 py-4">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-black">Combien de temps par jour ?</span>
                    <span className="text-sm font-black tabular-nums text-teal-600">
                      {fmtDuration(Math.round(customHours * 60))}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={24}
                    step={0.25}
                    value={customHours}
                    onChange={(event) => setCustomHours(Number(event.target.value))}
                    className="mt-1 w-full accent-teal-500"
                    aria-label="Durée par jour"
                  />
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-black">Combien de jours ?</span>
                    <span className="text-sm font-black text-teal-600">{daysLabel(customDays)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={DAY_STEPS.length - 1}
                    step={1}
                    value={Math.max(0, DAY_STEPS.indexOf(customDays))}
                    onChange={(event) => setCustomDays(DAY_STEPS[Number(event.target.value)] ?? 7)}
                    className="mt-1 w-full accent-teal-500"
                    aria-label="Jours par semaine"
                  />
                </div>
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {/* --- Qui paie ? ---------------------------------------------------- */}
        {members.length > 0 ? (
          <div>
            <p className="mb-2 text-base font-black">🏷️ Qui l’utilise ?</p>
            <Segmented
              value={ownership}
              onChange={(value) => setOwnership(value)}
              options={[
                { value: 'SHARED', label: 'Tout le monde' },
                { value: 'PRIVATE', label: 'Une personne' },
              ]}
            />
            {ownership === 'PRIVATE' ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setOwnerId(member.id)}
                    className={`tap chip border-2 ${
                      ownerId === member.id ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-white'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    {member.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3">
                <p className="mb-2 text-xs font-bold text-ink-muted">
                  Décochez ceux qui ne s’en servent pas : le coût sera divisé entre les
                  personnes cochées.
                </p>
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => {
                    const selected = sharedWith.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() =>
                          setSharedWith((prev) =>
                            prev.includes(member.id)
                              ? prev.filter((id) => id !== member.id)
                              : [...prev, member.id],
                          )
                        }
                        className={`tap chip border-2 ${
                          selected
                            ? 'border-teal-500 bg-teal-500/10'
                            : 'border-transparent bg-white opacity-50'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: member.color }}
                        />
                        {member.name}
                        <span className="text-teal-600">{selected ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                {sharedWith.length === 0 ? (
                  <p className="mt-2 text-xs font-bold text-tier3">
                    Personne n’est sélectionné : le coût sera partagé par tout le foyer.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* --- Pièce --------------------------------------------------------- */}
        {rooms.length > 0 ? (
          <div>
            <p className="mb-2 text-base font-black">📍 Dans quelle pièce ?</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRoomId(null)}
                className={`tap chip border-2 ${
                  roomId === null ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-white'
                }`}
              >
                Peu importe
              </button>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setRoomId(room.id)}
                  className={`tap chip border-2 ${
                    roomId === room.id ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-white'
                  }`}
                >
                  <span>{room.emoji}</span> {room.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* --- Conseils ------------------------------------------------------ */}
        {template.tips.length > 0 ? (
          <div className="rounded-2xl bg-mango-400/15 px-4 py-3">
            <p className="mb-1 text-sm font-black text-mango-600">💡 Bon à savoir</p>
            <ul className="space-y-1">
              {template.tips.map((tip) => (
                <li key={tip} className="text-sm font-bold leading-snug text-ink-soft">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
