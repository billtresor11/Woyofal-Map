import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import type { ApplianceTemplate, Summary } from '../api/types.js';
import { ApplianceIcon } from '../components/ApplianceIcon.js';
import { Sheet } from '../components/ui.js';
import { useApp } from '../hooks/useApp.js';
import { fcfa } from '../lib/format.js';

/**
 * ---------------------------------------------------------------------------
 * TUNNEL D'ACCUEIL
 * ---------------------------------------------------------------------------
 * On ne jette personne dans un tableau de bord. Quatre étapes, une question à
 * la fois, de grandes illustrations et aucun mot technique :
 *
 *   1. Ma maison   — son nom, et le type de compteur Woyofal
 *   2. Qui habite  — les prénoms, avatars et couleurs attribués automatiquement
 *   3. Mes appareils — une grille d'illustrations, chacun affecté à quelqu'un
 *   4. C'est prêt  — la facture estimée apparaît, puis on entre dans l'app
 */

const AVATARS = ['👩🏾', '👨🏾', '👧🏾', '👦🏾', '👵🏾', '👴🏾', '🧑🏾', '🧕🏾', '👨🏾‍🦱', '👩🏾‍🦱'];
const COLORS = ['#F97316', '#0EA5E9', '#22C55E', '#8B5CF6', '#EC4899', '#EAB308', '#14B8A6', '#EF4444'];

/** Les appareils que presque tout le monde possède : la grille de départ. */
const STARTER = [
  'refrigerateur',
  'televiseur',
  'climatiseur',
  'ventilateur',
  'ampoules',
  'box_internet',
  'decodeur',
  'fer_repasser',
  'machine_laver',
  'bouilloire',
  'ordinateur',
  'console_jeu',
  'congelateur',
  'micro_ondes',
  'pompe_eau',
  'chauffe_eau',
];

interface Person {
  name: string;
  emoji: string;
  color: string;
}

interface Pick {
  templateId: string;
  /** Index de l'occupant, ou `null` pour un appareil commun. */
  ownerIndex: number | null;
}

const STEPS = ['Ma maison', 'Qui habite ici', 'Mes appareils', 'C’est prêt'];

export function Onboarding() {
  const { catalog, selectHousehold } = useApp();
  const [step, setStep] = useState(0);
  const [back, setBack] = useState(false);

  const [name, setName] = useState('');
  const [tariffCode, setTariffCode] = useState<'WOYOFAL_DPP' | 'WOYOFAL_DMP'>('WOYOFAL_DPP');
  const [people, setPeople] = useState<Person[]>([]);
  const [draft, setDraft] = useState('');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [assigning, setAssigning] = useState<ApplianceTemplate | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; summary: Summary } | null>(null);

  const templates = useMemo(() => {
    if (!catalog) return [];
    const byId = new Map(catalog.templates.map((t) => [t.id, t]));
    const starters = STARTER.map((id) => byId.get(id)).filter(Boolean) as ApplianceTemplate[];
    const custom = catalog.templates.find((t) => t.isCustom);
    return custom ? [...starters, custom] : starters;
  }, [catalog]);

  function go(next: number) {
    setBack(next < step);
    setStep(next);
  }

  function addPerson() {
    const value = draft.trim();
    if (!value || people.length >= 12) return;
    setPeople((prev) => [
      ...prev,
      {
        name: value,
        emoji: AVATARS[prev.length % AVATARS.length]!,
        color: COLORS[prev.length % COLORS.length]!,
      },
    ]);
    setDraft('');
  }

  /** Création du foyer, des occupants puis des appareils, dans cet ordre. */
  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const household = await api.post<{ id: string; members: Array<{ id: string }> }>(
        '/api/households',
        {
          name: name.trim() || 'Ma maison',
          meterType: 'PREPAID',
          tariffCode,
          subscribedKva: tariffCode === 'WOYOFAL_DMP' ? 15 : 5,
          members: people.map((person) => ({ name: person.name, emoji: person.emoji })),
        },
      );

      for (const pick of picks) {
        const owner = pick.ownerIndex === null ? null : household.members[pick.ownerIndex];
        await api.post(`/api/households/${household.id}/appliances`, {
          templateId: pick.templateId,
          ownership: owner ? 'PRIVATE' : 'SHARED',
          ownerId: owner?.id ?? null,
        });
      }

      const summary = await api.get<Summary>(`/api/households/${household.id}/summary`);
      setResult({ id: household.id, summary });
      setBack(false);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  }

  const canContinue =
    step === 0 ? name.trim().length > 0 : step === 1 ? people.length > 0 : picks.length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-teal-700 via-teal-600 to-teal-500 text-white">
      {/* Halo décoratif, discret, qui donne de la profondeur au fond. */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-mango-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-8 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <Progress step={step} />

        <div
          key={step}
          className={`flex flex-1 flex-col ${back ? 'animate-step-back' : 'animate-step-in'}`}
        >
          {step === 0 ? (
            <StepHome
              name={name}
              setName={setName}
              tariffCode={tariffCode}
              setTariffCode={setTariffCode}
            />
          ) : null}

          {step === 1 ? (
            <StepPeople
              people={people}
              draft={draft}
              setDraft={setDraft}
              onAdd={addPerson}
              onRemove={(index) => setPeople((prev) => prev.filter((_, i) => i !== index))}
            />
          ) : null}

          {step === 2 ? (
            <StepAppliances
              templates={templates}
              picks={picks}
              people={people}
              onOpen={setAssigning}
              onRemoveLast={(templateId) =>
                setPicks((prev) => {
                  const index = prev.map((p) => p.templateId).lastIndexOf(templateId);
                  return index < 0 ? prev : prev.filter((_, i) => i !== index);
                })
              }
            />
          ) : null}

          {step === 3 && result ? <StepDone summary={result.summary} /> : null}
        </div>

        {error ? (
          <p className="mb-3 rounded-2xl bg-tier3/90 px-4 py-3 text-sm font-bold">{error}</p>
        ) : null}

        {/* --- Navigation ------------------------------------------------- */}
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && step < 3 ? (
            <button
              onClick={() => go(step - 1)}
              className="tap flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-black"
              aria-label="Étape précédente"
            >
              ←
            </button>
          ) : null}

          {step < 2 ? (
            <button
              onClick={() => go(step + 1)}
              disabled={!canContinue}
              className="btn h-14 flex-1 bg-white text-lg text-teal-700 shadow-pop disabled:opacity-40"
            >
              Continuer
            </button>
          ) : null}

          {step === 2 ? (
            <button
              onClick={finish}
              disabled={!canContinue || busy}
              className="btn h-14 flex-1 bg-white text-lg text-teal-700 shadow-pop disabled:opacity-40"
            >
              {busy ? 'Un instant...' : 'Voir ma facture 🚀'}
            </button>
          ) : null}

          {step === 3 && result ? (
            <button
              onClick={() => selectHousehold(result.id)}
              className="btn h-14 flex-1 bg-white text-lg text-teal-700 shadow-pop"
            >
              Entrer dans l’application →
            </button>
          ) : null}
        </div>

        {step === 1 ? (
          <button
            onClick={() => go(2)}
            disabled={people.length === 0}
            className="mt-3 text-center text-sm font-bold text-white/70 disabled:opacity-0"
          >
            Vous pourrez en ajouter d’autres plus tard
          </button>
        ) : null}
      </div>

      {/* --- Affectation d'un appareil ------------------------------------ */}
      <Sheet
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        title={
          assigning ? (
            <span className="flex items-center gap-2">
              <span className="text-2xl">{assigning.emoji}</span> {assigning.name}
            </span>
          ) : null
        }
        subtitle="Qui l’utilise ? Vous pourrez tout affiner ensuite."
      >
        <div className="space-y-2 pb-2">
          <button
            onClick={() => {
              if (assigning) setPicks((prev) => [...prev, { templateId: assigning.id, ownerIndex: null }]);
              setAssigning(null);
            }}
            className="tap card flex w-full items-center gap-3 px-4 py-4 text-left"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/15 text-2xl">
              🏠
            </span>
            <span className="flex-1">
              <span className="block text-base font-black">Tout le monde</span>
              <span className="block text-xs font-bold text-ink-muted">
                Appareil commun, partagé à parts égales
              </span>
            </span>
          </button>

          {people.map((person, index) => (
            <button
              key={person.name + index}
              onClick={() => {
                if (assigning) setPicks((prev) => [...prev, { templateId: assigning.id, ownerIndex: index }]);
                setAssigning(null);
              }}
              className="tap card flex w-full items-center gap-3 px-4 py-4 text-left"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: `${person.color}22` }}
              >
                {person.emoji}
              </span>
              <span className="flex-1">
                <span className="block text-base font-black">{person.name}</span>
                <span className="block text-xs font-bold text-ink-muted">
                  Appareil personnel, à sa charge
                </span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Étapes
// ---------------------------------------------------------------------------

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex gap-1.5">
        {STEPS.map((label, index) => (
          <div key={label} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
              style={{ width: index <= step ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs font-black uppercase tracking-widest text-white/70">
        Étape {Math.min(step + 1, 4)} sur 4 · {STEPS[step]}
      </p>
    </div>
  );
}

function StepHome({
  name,
  setName,
  tariffCode,
  setTariffCode,
}: {
  name: string;
  setName: (value: string) => void;
  tariffCode: 'WOYOFAL_DPP' | 'WOYOFAL_DMP';
  setTariffCode: (value: 'WOYOFAL_DPP' | 'WOYOFAL_DMP') => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-24 w-24 animate-float items-center justify-center rounded-4xl bg-white/15 text-6xl">
          🏠
        </div>
        <h1 className="text-3xl font-black leading-tight">Bienvenue !</h1>
        <p className="mt-1 text-base font-bold text-white/85">
          Deux minutes, et vous saurez où part votre électricité.
        </p>
      </div>

      <label className="mb-2 block text-base font-black">Comment s’appelle votre maison ?</label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ex : Maison Ouakam"
        autoFocus
        className="mb-6 w-full rounded-2xl bg-white px-4 py-4 text-lg font-bold text-ink outline-none ring-4 ring-transparent transition focus:ring-white/40"
      />

      <p className="mb-2 text-base font-black">Quel compteur Woyofal avez-vous ?</p>
      <div className="space-y-2">
        <MeterCard
          selected={tariffCode === 'WOYOFAL_DPP'}
          onClick={() => setTariffCode('WOYOFAL_DPP')}
          emoji="🏡"
          title="Petite puissance"
          hint="Une maison ou un appartement. Le cas le plus courant."
        />
        <MeterCard
          selected={tariffCode === 'WOYOFAL_DMP'}
          onClick={() => setTariffCode('WOYOFAL_DMP')}
          emoji="🏘️"
          title="Moyenne puissance"
          hint="Une grande villa, ou plusieurs climatiseurs."
        />
      </div>
      <p className="mt-3 text-xs font-bold leading-relaxed text-white/70">
        C’est écrit sur votre reçu de recharge. Dans le doute, laissez « Petite puissance » :
        vous pourrez changer à tout moment.
      </p>
    </div>
  );
}

function MeterCard({
  selected,
  onClick,
  emoji,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap flex w-full items-center gap-4 rounded-3xl border-2 px-4 py-4 text-left transition ${
        selected ? 'border-white bg-white text-ink' : 'border-white/30 bg-white/10 text-white'
      }`}
    >
      <span className="text-4xl">{emoji}</span>
      <span className="flex-1">
        <span className="block text-lg font-black leading-tight">{title}</span>
        <span
          className={`block text-xs font-bold ${selected ? 'text-ink-muted' : 'text-white/75'}`}
        >
          {hint}
        </span>
      </span>
      {selected ? <span className="animate-check-pop text-2xl text-teal-600">✓</span> : null}
    </button>
  );
}

function StepPeople({
  people,
  draft,
  setDraft,
  onAdd,
  onRemove,
}: {
  people: Person[];
  draft: string;
  setDraft: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-24 w-24 animate-float items-center justify-center rounded-4xl bg-white/15 text-6xl">
          👨‍👩‍👧
        </div>
        <h1 className="text-3xl font-black leading-tight">Qui habite ici ?</h1>
        <p className="mt-1 text-base font-bold text-white/85">
          La facture sera partagée entre ces personnes.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onAdd()}
          placeholder="Un prénom"
          autoFocus
          className="flex-1 rounded-2xl bg-white px-4 py-4 text-lg font-bold text-ink outline-none ring-4 ring-transparent transition focus:ring-white/40"
        />
        <button
          onClick={onAdd}
          disabled={!draft.trim()}
          className="tap flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-mango-400 text-3xl font-black text-ink disabled:opacity-40"
          aria-label="Ajouter cette personne"
        >
          +
        </button>
      </div>

      {people.length === 0 ? (
        <p className="rounded-2xl bg-white/10 px-4 py-6 text-center text-sm font-bold text-white/80">
          Ajoutez au moins vous-même 🙂
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {people.map((person, index) => (
            <div
              key={person.name + index}
              style={{ animationDelay: `${index * 60}ms` }}
              className="relative animate-rise rounded-3xl bg-white/15 px-2 py-4 text-center ring-1 ring-white/25"
            >
              <span
                className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full text-3xl"
                style={{ backgroundColor: person.color }}
              >
                {person.emoji}
              </span>
              <span className="block truncate text-sm font-extrabold">{person.name}</span>
              <button
                onClick={() => onRemove(index)}
                className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-ink-soft shadow"
                aria-label={`Retirer ${person.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepAppliances({
  templates,
  picks,
  people,
  onOpen,
  onRemoveLast,
}: {
  templates: ApplianceTemplate[];
  picks: Pick[];
  people: Person[];
  onOpen: (template: ApplianceTemplate) => void;
  onRemoveLast: (templateId: string) => void;
}) {
  const countOf = (templateId: string) => picks.filter((p) => p.templateId === templateId).length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-black leading-tight">Qu’avez-vous chez vous ?</h1>
        <p className="mt-1 text-base font-bold text-white/85">
          Touchez vos appareils. On s’occupe du reste.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {templates.map((template, index) => {
          const count = countOf(template.id);
          const owners = picks
            .filter((p) => p.templateId === template.id)
            .map((p) => (p.ownerIndex === null ? '🏠' : (people[p.ownerIndex]?.emoji ?? '🏠')));

          return (
            <button
              key={template.id}
              onClick={() => onOpen(template)}
              onContextMenu={(event) => {
                event.preventDefault();
                onRemoveLast(template.id);
              }}
              style={{ animationDelay: `${index * 35}ms` }}
              className={`tap relative flex animate-rise flex-col items-center gap-1.5 rounded-3xl px-1.5 py-3.5 transition ${
                count > 0 ? 'bg-white text-teal-700' : 'bg-white/12 text-white'
              } ${template.isCustom ? 'border-2 border-dashed border-white/50' : ''}`}
            >
              <ApplianceIcon templateId={template.id} className="h-9 w-9" />
              <span className="text-center text-[11px] font-extrabold leading-tight">
                {template.name}
              </span>

              {count > 0 ? (
                <>
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] animate-check-pop items-center justify-center rounded-full bg-mango-400 px-1 text-xs font-black text-ink">
                    {count}
                  </span>
                  <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] shadow">
                    {owners.slice(0, 3).map((emoji, i) => (
                      <span key={i}>{emoji}</span>
                    ))}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs font-bold leading-relaxed text-white/70">
        {picks.length === 0
          ? 'Commencez par le réfrigérateur : il est allumé jour et nuit.'
          : `${picks.length} appareil${picks.length > 1 ? 's' : ''} ajouté${picks.length > 1 ? 's' : ''} · appui long pour en retirer un`}
      </p>
    </div>
  );
}

function StepDone({ summary }: { summary: Summary }) {
  const target = summary.bill.totalTTC;
  const [shown, setShown] = useState(0);

  // Le montant monte progressivement : le chiffre final se laisse regarder.
  useEffect(() => {
    let frame = 0;
    const total = 32;
    const timer = setInterval(() => {
      frame += 1;
      const progress = 1 - (1 - frame / total) ** 3;
      setShown(Math.round(target * progress));
      if (frame >= total) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <span className="absolute inset-0 animate-halo rounded-full bg-white/40" />
        <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white text-6xl">
          🎉
        </span>
      </div>

      <h1 className="text-3xl font-black leading-tight">Tout est prêt !</h1>
      <p className="mt-1 text-base font-bold text-white/85">Voici ce que devrait coûter ce mois-ci</p>

      <p className="mt-5 text-6xl font-black tabular-nums tracking-tight">{fcfa(shown)}</p>
      <p className="mt-1 text-base font-bold text-white/85">
        soit environ {fcfa(summary.dailyAmount)} par jour
      </p>

      <div className="mt-6 grid w-full grid-cols-2 gap-2">
        <Fact
          emoji="🔁"
          value={fcfa(summary.alwaysOn.amountPerMonth)}
          label="tournent jour et nuit"
        />
        <Fact
          emoji="🎚️"
          value={fcfa(summary.switchable.amountPerMonth)}
          label="dépendent de vous"
        />
      </div>

      <p className="mt-5 max-w-xs text-xs font-bold leading-relaxed text-white/70">
        Ce n’est qu’une estimation de départ. Elle deviendra plus juste à mesure que vous
        préciserez vos appareils.
      </p>
    </div>
  );
}

function Fact({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="rounded-3xl bg-white/12 px-3 py-4">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 text-lg font-black tabular-nums">{value}</p>
      <p className="text-[11px] font-bold leading-tight text-white/75">{label}</p>
    </div>
  );
}
