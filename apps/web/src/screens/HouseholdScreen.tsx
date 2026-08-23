import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import type { SplitResult } from '../api/types.js';
import { EmptyState, Sheet, Spinner } from '../components/ui.js';
import { useApp } from '../hooks/useApp.js';
import { fcfa, kwh as fmtKwh, monthLabel } from '../lib/format.js';

const AVATARS = ['👩🏾', '👨🏾', '👧🏾', '👦🏾', '👵🏾', '👴🏾', '🧑🏾', '👶🏾', '🧕🏾', '👨🏾‍🦱'];

/**
 * ONGLET 3 - Colocation / famille.
 * L objectif n est pas de surveiller les gens, c est d eviter la dispute de fin
 * de mois : chacun voit ce qu il doit, et surtout POURQUOI il le doit.
 */
export function HouseholdScreen() {
  const { summary, refresh } = useApp();
  const [split, setSplit] = useState<SplitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberSheet, setMemberSheet] = useState(false);
  const [topUpSheet, setTopUpSheet] = useState(false);

  const householdId = summary?.household.id;

  const loadSplit = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      setSplit(await api.get<SplitResult>(`/api/households/${householdId}/split`));
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    void loadSplit();
  }, [loadSplit, summary]);

  if (!summary) return null;

  return (
    <div className="min-h-screen pb-28">
      <header className="bg-white px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <h1 className="text-2xl font-black leading-tight">Chez nous</h1>
        <p className="mt-0.5 text-sm font-bold text-ink-soft">
          Qui paie quoi en {monthLabel(summary.month)}.
        </p>
      </header>

      <div className="space-y-5 px-4 pt-5">
        {summary.members.length === 0 ? (
          <EmptyState
            emoji="👨‍👩‍👧"
            title="Ajoutez les personnes du foyer"
            action={
              <button onClick={() => setMemberSheet(true)} className="btn-primary mt-2">
                ➕ Ajouter quelqu un
              </button>
            }
          >
            L application repartira la facture entre elles, en separant les appareils communs des
            appareils personnels.
          </EmptyState>
        ) : null}

        {loading && !split ? <Spinner /> : null}

        {split && summary.members.length > 0 ? (
          <>
            <div className="card px-5 py-5 text-center">
              <p className="text-sm font-bold text-ink-soft">Total du foyer a partager</p>
              <p className="text-4xl font-black tabular-nums">{fcfa(split.totalAmount)}</p>
              <p className="mt-1 text-sm font-bold text-ink-muted">
                {fmtKwh(split.totalKwh)} · {fcfa(split.averagePricePerKwh)} le kWh en moyenne
              </p>
              <p className="mt-2 inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-soft">
                {split.basis === 'recharges'
                  ? `Base sur vos recharges reelles (${fcfa(split.rechargedAmount)})`
                  : 'Base sur l estimation de votre inventaire'}
              </p>
            </div>

            {/* --- Repartition ---------------------------------------------- */}
            <section className="space-y-3">
              {split.members.map((member) => (
                <div key={member.memberId} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 pb-3 pt-4">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                      style={{ backgroundColor: `${member.color}22` }}
                    >
                      {member.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="text-lg font-black leading-tight">{member.name}</p>
                      <p className="text-xs font-bold text-ink-muted">
                        {member.sharePercent}% · {fmtKwh(member.kwhTotal)}
                      </p>
                    </div>
                    <p className="text-2xl font-black tabular-nums">{fcfa(member.amountToPay)}</p>
                  </div>

                  <div className="flex h-2.5 overflow-hidden bg-sand-100">
                    <div
                      className="h-full"
                      style={{
                        width: `${member.kwhTotal > 0 ? (member.kwhShared / member.kwhTotal) * 100 : 0}%`,
                        backgroundColor: '#0D9488',
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${member.kwhTotal > 0 ? (member.kwhPrivate / member.kwhTotal) * 100 : 0}%`,
                        backgroundColor: member.color,
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${member.kwhTotal > 0 ? (member.kwhPunctual / member.kwhTotal) * 100 : 0}%`,
                        backgroundColor: '#F59E0B',
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-xs font-bold text-ink-soft">
                    <span>🏠 Commun : {fmtKwh(member.kwhShared)}</span>
                    <span>🙋 Perso : {fmtKwh(member.kwhPrivate)}</span>
                    {member.kwhPunctual > 0 ? <span>⏱️ Sessions : {fmtKwh(member.kwhPunctual)}</span> : null}
                  </div>

                  <PresenceSlider
                    memberId={member.memberId}
                    initial={
                      summary.members.find((item) => item.id === member.memberId)?.presenceRatio ?? 1
                    }
                    onChanged={async () => {
                      await refresh();
                      await loadSplit();
                    }}
                  />
                </div>
              ))}
            </section>

            {split.unassignedKwh > 0.1 ? (
              <p className="px-2 text-center text-xs font-bold text-ink-muted">
                {fmtKwh(split.unassignedKwh)} ne sont attribues a personne. Ajoutez des membres pour
                les repartir.
              </p>
            ) : null}

            <div className="rounded-3xl bg-sand-100 px-4 py-4">
              <p className="mb-1 text-sm font-black">⚖️ Comment on partage</p>
              <ul className="space-y-1 text-sm font-bold leading-snug text-ink-soft">
                <li>• Les appareils communs sont partages selon le temps de presence de chacun.</li>
                <li>• Les appareils personnels sont a la charge de leur proprietaire.</li>
                <li>• Les kWh sont comptes au prix moyen du foyer, pas au prix de la derniere tranche.</li>
              </ul>
            </div>

            {split.sessions.length > 0 ? (
              <section>
                <h2 className="mb-2 text-lg font-black">⏱️ Sessions du mois</h2>
                <div className="space-y-2">
                  {split.sessions.slice(0, 8).map((session) => {
                    const member = summary.members.find((item) => item.id === session.memberId);
                    return (
                      <div key={session.id} className="card flex items-center gap-3 px-4 py-3">
                        <span className="text-xl">{member?.emoji ?? '🏠'}</span>
                        <div className="flex-1">
                          <p className="text-sm font-extrabold">{session.label}</p>
                          <p className="text-xs font-bold text-ink-muted">
                            {member?.name ?? 'Tout le monde'} · {Math.round(session.durationMinutes / 60)} h
                          </p>
                        </div>
                        <p className="font-black tabular-nums">{fcfa(session.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <div className="flex gap-2">
          <button onClick={() => setMemberSheet(true)} className="btn-ghost flex-1">
            ➕ Une personne
          </button>
          <button onClick={() => setTopUpSheet(true)} className="btn-ghost flex-1">
            💳 Une recharge
          </button>
        </div>
      </div>

      <AddMemberSheet
        open={memberSheet}
        householdId={summary.household.id}
        onClose={() => setMemberSheet(false)}
        onSaved={async () => {
          await refresh();
          await loadSplit();
        }}
      />
      <TopUpSheet
        open={topUpSheet}
        householdId={summary.household.id}
        onClose={() => setTopUpSheet(false)}
        onSaved={async () => {
          await refresh();
          await loadSplit();
        }}
      />
    </div>
  );
}

/** Le curseur de presence : "j etais la combien de temps ce mois-ci ?" */
function PresenceSlider({
  memberId,
  initial,
  onChanged,
}: {
  memberId: string;
  initial: number;
  onChanged: () => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);

  async function commit(next: number) {
    await api.patch(`/api/members/${memberId}`, { presenceRatio: next });
    onChanged();
  }

  return (
    <div className="border-t border-sand-200 px-4 py-3">
      <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
        <span>🗓️ Present ce mois-ci</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        onChange={(event) => setValue(Number(event.target.value) / 100)}
        onMouseUp={() => commit(value)}
        onTouchEnd={() => commit(value)}
        className="mt-1 w-full accent-teal-500"
        aria-label="Temps de presence"
      />
    </div>
  );
}

function AddMemberSheet({
  open,
  householdId,
  onClose,
  onSaved,
}: {
  open: boolean;
  householdId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(AVATARS[0]!);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/households/${householdId}/members`, { name: name.trim(), emoji });
      setName('');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajouter quelqu un"
      subtitle="Un colocataire, un parent, un enfant."
      footer={
        <button onClick={save} disabled={saving || !name.trim()} className="btn-primary w-full">
          Ajouter
        </button>
      }
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Son prenom"
        className="mb-4 w-full rounded-2xl border-2 border-transparent bg-white px-4 py-3 text-base font-bold shadow-card outline-none focus:border-teal-500"
      />
      <p className="mb-2 text-sm font-black">Choisir un avatar</p>
      <div className="grid grid-cols-5 gap-2">
        {AVATARS.map((item) => (
          <button
            key={item}
            onClick={() => setEmoji(item)}
            className={`tap flex h-14 items-center justify-center rounded-2xl border-2 text-2xl ${
              emoji === item ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function TopUpSheet({
  open,
  householdId,
  onClose,
  onSaved,
}: {
  open: boolean;
  householdId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(5000);
  const [kwhValue, setKwhValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post(`/api/households/${householdId}/topups`, {
        amount,
        ...(kwhValue ? { kwh: Number(kwhValue.replace(',', '.')) } : {}),
      });
      setKwhValue('');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Enregistrer une recharge"
      subtitle="Vos recharges reelles remplacent l estimation : le partage devient exact."
      footer={
        <button onClick={save} disabled={saving} className="btn-primary w-full">
          Enregistrer
        </button>
      }
    >
      <p className="mb-2 text-sm font-black">Montant paye</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {[1000, 2000, 5000, 10000, 20000].map((value) => (
          <button
            key={value}
            onClick={() => setAmount(value)}
            className={`tap chip border-2 px-4 ${
              amount === value ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-white'
            }`}
          >
            {fcfa(value)}
          </button>
        ))}
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={amount}
        onChange={(event) => setAmount(Number(event.target.value))}
        className="mb-5 w-full rounded-2xl border-2 border-transparent bg-white px-4 py-3 text-base font-bold shadow-card outline-none focus:border-teal-500"
      />
      <p className="mb-2 text-sm font-black">kWh recus (si le recu les indique)</p>
      <input
        value={kwhValue}
        onChange={(event) => setKwhValue(event.target.value)}
        placeholder="Laissez vide, on les deduira"
        inputMode="decimal"
        className="w-full rounded-2xl border-2 border-transparent bg-white px-4 py-3 text-base font-bold shadow-card outline-none focus:border-teal-500"
      />
    </Sheet>
  );
}
