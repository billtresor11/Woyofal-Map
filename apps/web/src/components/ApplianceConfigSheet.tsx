import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import type { Appliance, ApplianceTemplate, Member, PreviewResult, Room } from '../api/types.js';
import { fcfa, kwh as fmtKwh } from '../lib/format.js';
import { ApplianceIcon } from './ApplianceIcon.js';
import { Segmented, Sheet } from './ui.js';

/**
 * Écran de configuration d’un appareil.
 * Regle absolue : aucune saisie de puissance, aucun watt, aucune formule.
 * L’utilisateur répond à des questions ("Il est de quelle taille ?") et voit
 * immédiatement l’effet en FCFA. Le calcul, lui, se fait cote serveur.
 */
export function ApplianceConfigSheet({
  open,
  template,
  existing,
  householdId,
  members,
  rooms,
  onClose,
  onSaved,
}: {
  open: boolean;
  template: ApplianceTemplate | null;
  existing?: Appliance | null;
  householdId: string;
  members: Member[];
  rooms: Room[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [options, setOptions] = useState<Record<string, string>>({});
  const [usageProfileId, setUsageProfileId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [ownership, setOwnership] = useState<'SHARED' | 'PRIVATE'>('SHARED');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Un attribut "nombre" gère déjà la quantité : sinon on affiche un compteur.
  const hasQuantityAttribute = useMemo(
    () => Boolean(template?.attributes.some((attribute) => attribute.key === 'nombre')),
    [template],
  );

  useEffect(() => {
    if (!open || !template) return;
    const defaults: Record<string, string> = {};
    for (const attribute of template.attributes) defaults[attribute.key] = attribute.defaultOptionId;
    setOptions(existing ? { ...defaults, ...existing.options } : defaults);
    setUsageProfileId(existing?.usageProfileId ?? template.defaultUsageProfileId);
    setQuantity(existing?.quantity ?? 1);
    setOwnership(existing?.ownership ?? 'SHARED');
    setOwnerId(existing?.ownerId ?? null);
    setRoomId(existing?.roomId ?? null);
    setError(null);
  }, [open, template, existing]);

  // Aperçu en direct : la valeur affichée est le COÛT AJOUTÉ à la facture.
  useEffect(() => {
    if (!open || !template) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      api
        .post<PreviewResult>(`/api/catalog/${template.id}/preview`, {
          options,
          usageProfileId,
          quantity: hasQuantityAttribute ? undefined : quantity,
          householdId,
        })
        .then((result) => {
          if (id === requestId.current) setPreview(result);
        })
        .catch(() => undefined);
    }, 120);
    return () => clearTimeout(timer);
  }, [open, template, options, usageProfileId, quantity, householdId, hasQuantityAttribute]);

  if (!template) return null;

  async function save() {
    if (!template) return;
    setSaving(true);
    setError(null);
    const payload = {
      templateId: template.id,
      options,
      usageProfileId,
      quantity: hasQuantityAttribute ? undefined : quantity,
      ownership,
      ownerId: ownership === 'PRIVATE' ? ownerId : null,
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
        template.alwaysOn
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
              {saving ? 'Enregistrement...' : existing ? 'Mettre à jour' : "Ajouter à mon inventaire"}
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
              ? `${fmtKwh(preview.consumption.kwhPerMonth)} par mois · environ ${fcfa(preview.dailyAmount)} par jour`
              : 'Calcul en cours...'}
          </p>
        </div>
      </div>

      {/* --- Caractéristiques ---------------------------------------------- */}
      <div className="space-y-5">
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

        {/* --- Duree d’usage ------------------------------------------------ */}
        {!template.alwaysOn && template.usageProfiles ? (
          <fieldset>
            <legend className="mb-2 text-base font-black">⏱️ Vous l’utilisez combien de temps ?</legend>
            <div className="space-y-2">
              {template.usageProfiles.map((profile) => {
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
            </div>
          </fieldset>
        ) : null}

        {/* --- Quantité ------------------------------------------------------ */}
        {template.allowQuantity && !hasQuantityAttribute ? (
          <div className="card flex items-center justify-between px-4 py-3">
            <span className="text-base font-black">🔢 Combien en avez-vous ?</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="tap h-10 w-10 rounded-full bg-sand-100 text-xl font-black"
              >
                −
              </button>
              <span className="w-6 text-center text-xl font-black tabular-nums">{quantity}</span>
              <button
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                className="tap h-10 w-10 rounded-full bg-sand-100 text-xl font-black"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        {/* --- Qui paie ? ---------------------------------------------------- */}
        {members.length > 0 ? (
          <div>
            <p className="mb-2 text-base font-black">👥 Qui l’utilise ?</p>
            <Segmented
              value={ownership}
              onChange={(value) => setOwnership(value)}
              options={[
                { value: 'SHARED', label: 'Tout le monde', emoji: '🏠' },
                { value: 'PRIVATE', label: 'Une personne', emoji: '🙋' },
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
                    <span>{member.emoji}</span> {member.name}
                  </button>
                ))}
              </div>
            ) : null}
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
