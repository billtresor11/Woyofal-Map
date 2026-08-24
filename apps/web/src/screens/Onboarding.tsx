import { useState } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../hooks/useApp.js';
import { initial } from '../lib/format.js';

/** Couleurs attribuées automatiquement, dans l'ordre d'ajout. */
const COLORS = ['#F97316', '#0EA5E9', '#22C55E', '#8B5CF6', '#EC4899', '#EAB308'];

/**
 * Premier écran. Trois questions, pas une de plus : le nom du foyer, le type de
 * compteur, et qui habite la. Tout le reste se decouvre en utilisant l’application.
 */
export function Onboarding() {
  const { selectHousehold } = useApp();
  const [name, setName] = useState('');
  const [tariffCode, setTariffCode] = useState<'WOYOFAL_DPP' | 'WOYOFAL_DMP'>('WOYOFAL_DPP');
  const [people, setPeople] = useState<string[]>(['Moi']);
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const household = await api.post<{ id: string }>('/api/households', {
        name: name.trim() || 'Ma maison',
        meterType: 'PREPAID',
        tariffCode,
        subscribedKva: tariffCode === 'WOYOFAL_DMP' ? 15 : 5,
        monthlyBudget: budget ? Number(budget.replace(/\D/g, '')) : null,
        members: people
          .filter((person) => person.trim())
          .map((person) => ({ name: person.trim() })),
      });
      selectHousehold(household.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-500 px-5 pb-10 pt-[calc(env(safe-area-inset-top)+3rem)] text-white">
      <div className="mx-auto max-w-md">
        <p className="text-5xl">💡</p>
        <h1 className="mt-3 text-3xl font-black leading-tight">Woyofal Map</h1>
        <p className="mt-1 text-base font-bold text-white/85">
          Comprenez votre facture d’électricité. En FCFA, sans jargon.
        </p>

        <div className="mt-8 space-y-5 rounded-4xl bg-white p-5 text-ink shadow-card">
          <div>
            <label className="mb-2 block text-base font-black">🏠 Comment s’appelle votre maison ?</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Maison Ouakam"
              className="w-full rounded-2xl bg-sand-50 px-4 py-3 text-base font-bold outline-none ring-2 ring-transparent focus:ring-teal-500"
            />
          </div>

          <div>
            <p className="mb-2 text-base font-black">⚡ Quel compteur Woyofal ?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTariffCode('WOYOFAL_DPP')}
                className={`tap rounded-2xl border-2 px-3 py-4 text-left ${
                  tariffCode === 'WOYOFAL_DPP' ? 'border-teal-500 bg-teal-500/10' : 'border-sand-200'
                }`}
              >
                <span className="block text-2xl">🏡</span>
                <span className="mt-1 block text-sm font-extrabold">Petite puissance</span>
                <span className="block text-xs font-bold text-ink-muted">
                  Une maison ou un appartement
                </span>
              </button>
              <button
                onClick={() => setTariffCode('WOYOFAL_DMP')}
                className={`tap rounded-2xl border-2 px-3 py-4 text-left ${
                  tariffCode === 'WOYOFAL_DMP' ? 'border-teal-500 bg-teal-500/10' : 'border-sand-200'
                }`}
              >
                <span className="block text-2xl">🏘️</span>
                <span className="mt-1 block text-sm font-extrabold">Moyenne puissance</span>
                <span className="block text-xs font-bold text-ink-muted">
                  Une grande villa, 10 kVA et plus
                </span>
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-base font-black">🏷️ Qui habite ici ?</p>
            <div className="space-y-2">
              {people.map((person, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {person.trim() ? initial(person) : '?'}
                  </span>
                  <input
                    value={person}
                    onChange={(event) =>
                      setPeople((prev) =>
                        prev.map((item, i) => (i === index ? event.target.value : item)),
                      )
                    }
                    placeholder="Prénom"
                    className="flex-1 rounded-2xl bg-sand-50 px-4 py-3 text-base font-bold outline-none ring-2 ring-transparent focus:ring-teal-500"
                  />
                  {people.length > 1 ? (
                    <button
                      onClick={() => setPeople((prev) => prev.filter((_, i) => i !== index))}
                      className="tap h-11 w-11 shrink-0 rounded-full bg-sand-100 font-black text-ink-soft"
                      aria-label="Retirer"
                    >
                      −
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {people.length < 8 ? (
              <button
                onClick={() => setPeople((prev) => [...prev, ''])}
                className="mt-2 text-sm font-extrabold text-teal-600"
              >
                ➕ Ajouter une personne
              </button>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-base font-black">
              🎯 Un budget mensuel ? <span className="font-bold text-ink-muted">(facultatif)</span>
            </label>
            <input
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              inputMode="numeric"
              placeholder="Ex : 30 000 FCFA"
              className="w-full rounded-2xl bg-sand-50 px-4 py-3 text-base font-bold outline-none ring-2 ring-transparent focus:ring-teal-500"
            />
          </div>

          {error ? <p className="text-sm font-bold text-tier3">{error}</p> : null}

          <button onClick={create} disabled={saving} className="btn-primary w-full">
            {saving ? 'Création...' : "C’est parti 🚀"}
          </button>
        </div>

        <p className="mt-5 text-center text-xs font-bold leading-relaxed text-white/70">
          Vos données restent sur votre appareil et sur votre serveur. Aucune information n’est
          transmise à la Senelec.
        </p>
      </div>
    </div>
  );
}
