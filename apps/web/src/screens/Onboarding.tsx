import { AnimatePresence, m as motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import type { ApplianceTemplate } from '../api/types.js';
import { ApplianceIcon } from '../components/ApplianceIcon.js';
import { useApp } from '../hooks/useApp.js';
import { initial } from '../lib/format.js';

/** Couleurs attribuées automatiquement, dans l'ordre d'ajout. */
const COLORS = ['#F97316', '#0EA5E9', '#22C55E', '#8B5CF6', '#EC4899', '#EAB308'];

/**
 * LE TUNNEL D'ACCUEIL — trois étapes, jamais deux questions à la fois.
 *
 * Le principe est celui du dévoilement progressif : à chaque écran, une seule
 * décision, et on voit d'où l'on vient et où l'on va. Quelqu'un qui n'a jamais
 * utilisé d'application de gestion doit pouvoir aller au bout sans aide.
 *
 * L'étape 3 est la plus importante : c'est là qu'on installe l'idée fondatrice
 * du produit — on ne saisit JAMAIS de watts, on touche des dessins d'objets.
 * On y ajoute donc déjà quelques appareils, pour que le tableau de bord ne soit
 * jamais vide à l'arrivée.
 */

type Etape = 1 | 2 | 3;

/** Les appareils proposés d'emblée : ceux qu'on trouve dans presque tous les foyers. */
const SUGGESTIONS = [
  'ampoules',
  'refrigerateur',
  'televiseur',
  'ventilateur',
  'box_internet',
  'climatiseur',
  'fer_repasser',
  'bouilloire',
  'machine_laver',
  'ordinateur',
  'decodeur',
  'chargeur_telephone',
];

export function Onboarding() {
  const { selectHousehold, catalog } = useApp();
  const [etape, setEtape] = useState<Etape>(1);
  const [sens, setSens] = useState<1 | -1>(1);

  // Étape 1
  const [name, setName] = useState('');
  const [tariffCode, setTariffCode] = useState<'WOYOFAL_DPP' | 'WOYOFAL_DMP'>('WOYOFAL_DPP');
  // Étape 2
  const [people, setPeople] = useState<string[]>(['Moi']);
  const [budget, setBudget] = useState('');
  // Étape 3
  const [choisis, setChoisis] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proposes = useMemo(() => {
    if (!catalog) return [];
    const parId = new Map(catalog.templates.map((template) => [template.id, template]));
    return SUGGESTIONS.map((id) => parId.get(id)).filter(
      (template): template is ApplianceTemplate => Boolean(template),
    );
  }, [catalog]);

  function aller(vers: Etape) {
    setSens(vers > etape ? 1 : -1);
    setEtape(vers);
  }

  const prenomsValides = people.filter((person) => person.trim()).length > 0;

  /**
   * Création en une transaction logique : le foyer, ses occupants, puis les
   * appareils choisis. Si un appareil échoue, on n'annule pas tout — le foyer
   * existe, l'utilisateur pourra corriger. Bloquer serait pire.
   */
  async function terminer() {
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

      for (const [templateId, quantity] of Object.entries(choisis)) {
        if (quantity <= 0) continue;
        await api
          .post(`/api/households/${household.id}/appliances`, { templateId, quantity })
          .catch(() => undefined);
      }

      selectHousehold(household.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-500 px-5 pb-10 pt-[calc(env(safe-area-inset-top)+2rem)] text-white">
      <div className="mx-auto max-w-md">
        {/* --- Repère de progression ------------------------------------- */}
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-4xl"
          >
            💡
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">Woyofal Map</p>
            <p className="text-xs font-bold text-white/75">Étape {etape} sur 3</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5">
          {([1, 2, 3] as const).map((numero) => (
            <div key={numero} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <motion.div
                initial={false}
                animate={{ width: etape >= numero ? '100%' : '0%' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-full rounded-full bg-white"
              />
            </div>
          ))}
        </div>

        {/* --- Les étapes -------------------------------------------------- */}
        <div className="relative mt-6">
          <AnimatePresence mode="wait" custom={sens}>
            <motion.div
              key={etape}
              custom={sens}
              initial={{ opacity: 0, x: sens * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: sens * -40 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              {etape === 1 ? (
                <EtapeMaison
                  name={name}
                  setName={setName}
                  tariffCode={tariffCode}
                  setTariffCode={setTariffCode}
                  onNext={() => aller(2)}
                />
              ) : null}

              {etape === 2 ? (
                <EtapeOccupants
                  people={people}
                  setPeople={setPeople}
                  budget={budget}
                  setBudget={setBudget}
                  onBack={() => aller(1)}
                  onNext={() => aller(3)}
                  valide={prenomsValides}
                />
              ) : null}

              {etape === 3 ? (
                <EtapeAppareils
                  templates={proposes}
                  choisis={choisis}
                  setChoisis={setChoisis}
                  onBack={() => aller(2)}
                  onFinish={terminer}
                  saving={saving}
                  error={error}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-5 text-center text-xs font-bold leading-relaxed text-white/70">
          Vos données restent sur votre appareil et sur votre serveur. Aucune information n’est
          transmise à la Senelec.
        </p>
      </div>
    </div>
  );
}

/** Bloc blanc commun à toutes les étapes. */
function Carte({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 rounded-4xl bg-white p-5 text-ink shadow-card">{children}</div>;
}

// --- Étape 1 : la maison et le compteur -------------------------------------

function EtapeMaison({
  name,
  setName,
  tariffCode,
  setTariffCode,
  onNext,
}: {
  name: string;
  setName: (value: string) => void;
  tariffCode: 'WOYOFAL_DPP' | 'WOYOFAL_DMP';
  setTariffCode: (value: 'WOYOFAL_DPP' | 'WOYOFAL_DMP') => void;
  onNext: () => void;
}) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-black leading-tight">
        Bienvenue ! Parlons de votre maison.
      </h1>
      <Carte>
        <div>
          <label className="mb-2 block text-base font-black">
            🏠 Comment s’appelle votre maison ?
          </label>
          <input
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex : Maison Ouakam"
            className="w-full rounded-2xl bg-sand-50 px-4 py-3 text-base font-bold outline-none ring-2 ring-transparent focus:ring-teal-500"
          />
        </div>

        <div>
          <p className="mb-1 text-base font-black">⚡ Quel compteur Woyofal ?</p>
          <p className="mb-2 text-sm font-bold text-ink-muted">
            C’est écrit sur votre facture. Dans le doute, choisissez le premier.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ChoixCompteur
              actif={tariffCode === 'WOYOFAL_DPP'}
              onClick={() => setTariffCode('WOYOFAL_DPP')}
              emoji="🏡"
              titre="Petite puissance"
              detail="Une maison ou un appartement"
            />
            <ChoixCompteur
              actif={tariffCode === 'WOYOFAL_DMP'}
              onClick={() => setTariffCode('WOYOFAL_DMP')}
              emoji="🏘️"
              titre="Moyenne puissance"
              detail="Une grande villa, 10 kVA et plus"
            />
          </div>
        </div>

        <button onClick={onNext} className="btn-primary w-full">
          Continuer →
        </button>
      </Carte>
    </>
  );
}

function ChoixCompteur({
  actif,
  onClick,
  emoji,
  titre,
  detail,
}: {
  actif: boolean;
  onClick: () => void;
  emoji: string;
  titre: string;
  detail: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`tap rounded-2xl border-2 px-3 py-4 text-left transition ${
        actif ? 'border-teal-500 bg-teal-500/10' : 'border-sand-200'
      }`}
    >
      <span className="block text-2xl">{emoji}</span>
      <span className="mt-1 block text-sm font-extrabold">{titre}</span>
      <span className="block text-xs font-bold text-ink-muted">{detail}</span>
    </motion.button>
  );
}

// --- Étape 2 : les occupants -------------------------------------------------

function EtapeOccupants({
  people,
  setPeople,
  budget,
  setBudget,
  onBack,
  onNext,
  valide,
}: {
  people: string[];
  setPeople: React.Dispatch<React.SetStateAction<string[]>>;
  budget: string;
  setBudget: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  valide: boolean;
}) {
  return (
    <>
      <h1 className="mb-1 text-2xl font-black leading-tight">Qui habite ici ?</h1>
      <p className="mb-4 text-sm font-bold text-white/85">
        Chaque prénom reçoit sa couleur. C’est ce qui permettra de partager la facture.
      </p>

      <Carte>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {people.map((person, index) => (
              <motion.div
                key={index}
                // pas de `layout` : il exigerait le moteur d'animation de mise en page
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  animate={{ backgroundColor: COLORS[index % COLORS.length] }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
                >
                  {person.trim() ? initial(person) : '?'}
                </motion.span>
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {people.length < 8 ? (
          <button
            onClick={() => setPeople((prev) => [...prev, ''])}
            className="text-sm font-extrabold text-teal-600"
          >
            ➕ Ajouter une personne
          </button>
        ) : null}

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

        <div className="flex gap-2">
          <button onClick={onBack} className="btn-ghost flex-1">
            ← Retour
          </button>
          <button onClick={onNext} disabled={!valide} className="btn-primary flex-[2]">
            Continuer →
          </button>
        </div>
      </Carte>
    </>
  );
}

// --- Étape 3 : les appareils --------------------------------------------------

function EtapeAppareils({
  templates,
  choisis,
  setChoisis,
  onBack,
  onFinish,
  saving,
  error,
}: {
  templates: ApplianceTemplate[];
  choisis: Record<string, number>;
  setChoisis: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
  error: string | null;
}) {
  const total = Object.values(choisis).filter((quantity) => quantity > 0).length;

  function basculer(template: ApplianceTemplate) {
    setChoisis((prev) => {
      const suivant = { ...prev };
      if (suivant[template.id]) delete suivant[template.id];
      else suivant[template.id] = template.defaultQuantity ?? 1;
      return suivant;
    });
  }

  function ajuster(template: ApplianceTemplate, delta: number) {
    setChoisis((prev) => {
      const actuel = prev[template.id] ?? 0;
      const suivant = Math.max(0, Math.min(99, actuel + delta));
      const copie = { ...prev };
      if (suivant === 0) delete copie[template.id];
      else copie[template.id] = suivant;
      return copie;
    });
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-black leading-tight">Qu’avez-vous chez vous ?</h1>
      <p className="mb-4 text-sm font-bold text-white/85">
        Touchez ce que vous possédez. Pas besoin de connaître la puissance : l’application s’en
        occupe. Vous pourrez tout modifier ensuite.
      </p>

      <Carte>
        <div className="grid grid-cols-3 gap-2">
          {templates.map((template, index) => {
            const quantity = choisis[template.id] ?? 0;
            const actif = quantity > 0;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 14, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.035 }}
              >
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => basculer(template)}
                  className={`tap relative flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 px-1 py-3 transition ${
                    actif ? 'border-teal-500 bg-teal-500/10' : 'border-sand-200'
                  }`}
                >
                  <ApplianceIcon
                    templateId={template.id}
                    className={`h-8 w-8 ${actif ? 'text-teal-600' : 'text-ink-muted'}`}
                  />
                  <span className="text-center text-[11px] font-extrabold leading-tight">
                    {template.name}
                  </span>
                  <AnimatePresence>
                    {actif ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-xs font-black text-white"
                      >
                        ✓
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </motion.button>

                {/* Le compteur n'apparaît que pour ce qu'on possède en plusieurs
                    exemplaires, et seulement une fois l'objet choisi. */}
                <AnimatePresence>
                  {actif && template.allowQuantity ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1 flex items-center justify-center gap-1 overflow-hidden"
                    >
                      <button
                        onClick={() => ajuster(template, -1)}
                        className="h-7 w-7 rounded-full bg-sand-100 text-sm font-black text-ink-soft"
                        aria-label={`Moins de ${template.name}`}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-black tabular-nums">
                        {quantity}
                      </span>
                      <button
                        onClick={() => ajuster(template, 1)}
                        className="h-7 w-7 rounded-full bg-sand-100 text-sm font-black text-ink-soft"
                        aria-label={`Plus de ${template.name}`}
                      >
                        +
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {error ? <p className="text-sm font-bold text-tier3">{error}</p> : null}

        <div className="flex gap-2">
          <button onClick={onBack} className="btn-ghost flex-1">
            ← Retour
          </button>
          <button onClick={onFinish} disabled={saving} className="btn-primary flex-[2]">
            {saving
              ? 'Création…'
              : total === 0
                ? 'Passer cette étape 🚀'
                : `C’est parti avec ${total} appareil${total > 1 ? 's' : ''} 🚀`}
          </button>
        </div>
      </Carte>
    </>
  );
}
