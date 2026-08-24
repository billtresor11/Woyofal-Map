import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import type { TariffPlan } from '../api/types.js';
import { Sheet } from '../components/ui.js';
import { useApp } from '../hooks/useApp.js';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Réglages. Le point important : les prix Senelec sont MODIFIABLES.
 * Les grilles évoluent ; plutot que de figer des chiffres dans le code, on
 * laisse l’utilisateur recopier ceux de son reçu. L’application reste juste.
 */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { summary, refresh, reset } = useApp();
  const { user, signOut } = useAuth();
  const [plans, setPlans] = useState<TariffPlan[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get<{ plans: TariffPlan[] }>('/api/tariffs').then((data) => setPlans(data.plans));
    setBudget(summary?.household.monthlyBudget ? String(summary.household.monthlyBudget) : '');
    setSaved(false);
  }, [open, summary]);

  useEffect(() => {
    if (!summary) return;
    const next: Record<number, string> = {};
    for (const tier of summary.plan.tiers) next[tier.order] = String(tier.pricePerKwh);
    setPrices(next);
  }, [summary]);

  if (!summary) return null;

  async function changePlan(code: string) {
    await api.patch(`/api/households/${summary!.household.id}`, { tariffCode: code });
    await refresh();
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/api/households/${summary!.household.id}`, {
        monthlyBudget: budget ? Number(budget.replace(/\D/g, '')) : null,
      });
      await api.patch(`/api/tariffs/${summary!.plan.code}`, {
        source: 'Prix saisis par l’utilisateur d’après son reçu',
        tiers: Object.entries(prices).map(([position, value]) => ({
          position: Number(position),
          pricePerKwh: Number(String(value).replace(',', '.')),
        })),
      });
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Réglages"
      subtitle={summary.household.name}
      footer={
        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      }
    >
      <div className="space-y-6">
        <section>
          <p className="mb-2 text-base font-black">⚡ Mon type de compteur</p>
          <div className="space-y-2">
            {plans.map((plan) => (
              <button
                key={plan.code}
                onClick={() => changePlan(plan.code)}
                className={`tap flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left ${
                  summary.plan.code === plan.code
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-transparent bg-white shadow-card'
                }`}
              >
                <span className="text-xl">{plan.meterType === 'PREPAID' ? '💳' : '📄'}</span>
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">{plan.label}</span>
                  <span className="block text-xs font-bold text-ink-muted">{plan.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1 text-base font-black">💰 Le prix du kWh</p>
          <p className="mb-3 text-xs font-bold leading-snug text-ink-muted">
            Ces prix viennent de la grille Woyofal. Ils changent parfois : prenez votre dernier
            reçu et corrigez-les ici pour une estimation exacte.
          </p>
          <div className="space-y-2">
            {summary.plan.tiers.map((tier) => (
              <div key={tier.order} className="card flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-extrabold">{tier.label}</p>
                  <p className="text-xs font-bold text-ink-muted">
                    de {tier.fromKwh} à {tier.toKwh ?? '∞'} kWh
                  </p>
                </div>
                <input
                  value={prices[tier.order] ?? ''}
                  onChange={(event) =>
                    setPrices((prev) => ({ ...prev, [tier.order]: event.target.value }))
                  }
                  inputMode="decimal"
                  className="w-24 rounded-xl bg-sand-100 px-3 py-2 text-right text-base font-black outline-none ring-2 ring-transparent focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-ink-muted">F/kWh</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-bold text-ink-muted">
            Ces prix sont toutes taxes comprises : le total affiché est bien ce que vous payez.
          </p>
        </section>

        <section>
          <label className="mb-2 block text-base font-black">🎯 Mon budget mensuel</label>
          <input
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            inputMode="numeric"
            placeholder="Ex : 30 000"
            className="w-full rounded-2xl border-2 border-transparent bg-white px-4 py-3 text-base font-bold shadow-card outline-none focus:border-teal-500"
          />
        </section>

        {user ? (
          <section>
            <p className="mb-2 text-base font-black">👤 Mon compte</p>
            <div className="card flex items-center gap-3 px-4 py-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-500 text-lg font-black text-white">
                  {user.name.trim()[0]?.toUpperCase() ?? '?'}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{user.name}</p>
                <p className="truncate text-xs font-bold text-ink-muted">{user.email}</p>
              </div>
            </div>
            <button onClick={signOut} className="btn-ghost mt-2 w-full">
              Se déconnecter
            </button>
            <p className="mt-2 text-xs font-bold text-ink-muted">
              Votre foyer reste enregistré : il vous attendra à la prochaine connexion.
            </p>
          </section>
        ) : (
          <section>
            <p className="mb-2 text-base font-black">🧹 Repartir de zéro</p>
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="btn-ghost w-full text-tier3"
            >
              Quitter ce foyer sur cet appareil
            </button>
            <p className="mt-2 text-xs font-bold text-ink-muted">
              Les données du foyer restent sur le serveur : vous pourrez y revenir.
            </p>
          </section>
        )}

      </div>
    </Sheet>
  );
}
