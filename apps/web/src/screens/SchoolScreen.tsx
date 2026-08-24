import { lessons, overflowExample } from '@woyofal/core';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useApp } from '../hooks/useApp.js';
import { fcfa, kwh as fmtKwh } from '../lib/format.js';

/**
 * ONGLET 5 — L'ÉCOLE WOYOFAL.
 *
 * Le pari : quelqu'un qui COMPREND les tranches économise plus que quelqu'un
 * à qui on donne juste un chiffre. On explique donc, une bonne fois, avec la
 * seule image qui marche : trois seaux qu'on remplit dans l'ordre, et qu'on
 * vide le 1er du mois.
 *
 * Tous les chiffres viennent du moteur et de la grille réelle du foyer. Rien
 * n'est écrit en dur : si Senelec change ses prix, la leçon change avec.
 */
export function SchoolScreen() {
  const { summary } = useApp();
  const [seauOuvert, setSeauOuvert] = useState<number | null>(null);

  const exemple = useMemo(
    () => (summary ? overflowExample(summary.plan, 145, 15) : null),
    [summary],
  );
  const cours = useMemo(() => (summary ? lessons(summary.plan) : []), [summary]);

  if (!summary || !exemple) return null;
  const { buckets, totals, keyFact } = summary;

  return (
    <div className="pb-28 lg:pb-6">
      <div className="bg-gradient-to-b from-teal-600 to-teal-500 px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white">
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl"
        >
          🎓
        </motion.div>
        <h1 className="mt-2 text-2xl font-black leading-tight">L’École Woyofal</h1>
        <p className="mt-1 text-sm font-bold leading-relaxed text-white/85">
          Deux minutes pour comprendre pourquoi votre courant ne coûte pas toujours le même
          prix — et comment payer moins sans rien débrancher.
        </p>
      </div>

      <div className="space-y-6 px-4 pt-5">
        {/* --- Les trois seaux ------------------------------------------- */}
        <section>
          <h2 className="px-1 text-lg font-black leading-tight">🪣 Imaginez trois seaux</h2>
          <p className="mb-3 px-1 text-sm font-bold text-ink-soft">
            On les remplit dans l’ordre. Le premier est bon marché, le dernier n’a pas de fond.
            Touchez un seau pour comprendre.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {buckets.map((seau, index) => (
              <motion.button
                key={seau.order}
                onClick={() => setSeauOuvert(seauOuvert === seau.order ? null : seau.order)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12 }}
                whileTap={{ scale: 0.96 }}
                className={`card flex flex-col items-center gap-2 px-2 py-4 transition ${
                  seauOuvert === seau.order ? 'ring-2 ring-teal-500' : ''
                }`}
              >
                <Seau
                  couleur={seau.color}
                  remplissage={seau.fillRatio}
                  delai={0.3 + index * 0.15}
                  contenance={seau.capacityKwh}
                />

                <span className="text-center text-[11px] font-black leading-tight">
                  {fcfa(seau.pricePerKwh)}
                  <span className="block font-bold text-ink-muted">le kWh</span>
                </span>
                {seau.filledKwh > 0 ? (
                  <span className="chip bg-sand-100 px-2 py-0.5 text-[10px]">
                    {fmtKwh(seau.filledKwh)} dedans
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-ink-muted">vide</span>
                )}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {seauOuvert !== null ? (
              <motion.p
                key={seauOuvert}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-relaxed text-ink-soft shadow-card"
              >
                {buckets.find((seau) => seau.order === seauOuvert)?.sentence}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <p className="mt-3 rounded-2xl bg-teal-500/10 px-4 py-3 text-sm font-bold leading-relaxed">
            🔄 <strong>Le 1er de chaque mois, on vide les trois seaux.</strong> Vous repartez
            au tarif le plus bas, quoi qu’il se soit passé avant.
          </p>
        </section>

        {/* --- Le débordement, la seule règle qui compte ------------------- */}
        <section className="card overflow-hidden">
          <div className="bg-sand-100 px-5 py-4">
            <h2 className="text-lg font-black leading-tight">💧 Quand un seau déborde</h2>
            <p className="mt-1 text-sm font-bold text-ink-soft">
              L’erreur que tout le monde fait : croire que dépasser un seuil fait payer TOUT
              au prix fort.
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm font-bold text-ink-soft">
              Vous êtes à {exemple.fromKwh} kWh, vous en consommez {exemple.addedKwh} de plus.
            </p>

            <div className="mt-3 space-y-2">
              {exemple.steps.map((etape, index) => (
                <motion.div
                  key={etape.tierOrder}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.18 }}
                  className="flex items-center gap-3 rounded-2xl bg-sand-50 px-4 py-3"
                >
                  <span
                    className="h-9 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'][etape.tierOrder - 1],
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">
                      {fmtKwh(etape.kwh)} dans le seau {etape.tierOrder}
                    </span>
                    <span className="block text-xs font-bold text-ink-muted">
                      à {fcfa(etape.pricePerKwh)} le kWh
                    </span>
                  </span>
                  <span className="shrink-0 text-base font-black tabular-nums">
                    {fcfa(etape.amount)}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-tier1/15 px-4 py-3">
              <span className="text-sm font-black">Vous payez</span>
              <span className="text-xl font-black tabular-nums text-teal-700">
                {fcfa(exemple.total)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between px-4">
              <span className="text-xs font-bold text-ink-muted">
                Et non {fcfa(exemple.naiveTotal)}, comme on le croit souvent
              </span>
            </div>
          </div>
        </section>

        {/* --- Votre cas à vous ------------------------------------------- */}
        <section className="card border-l-4 border-teal-500 px-5 py-4">
          <h2 className="text-base font-black leading-tight">📌 Et vous, dans tout ça</h2>
          <p className="mt-1.5 text-sm font-bold leading-relaxed text-ink-soft">{keyFact}</p>
          <p className="mt-2 text-xs font-bold text-ink-muted">
            Sur la base de {fmtKwh(totals.kwhPerMonth)} par mois, calculés depuis vos{' '}
            {totals.applianceCount} appareil{totals.applianceCount > 1 ? 's' : ''}.
          </p>
        </section>

        {/* --- Les leçons -------------------------------------------------- */}
        <section>
          <h2 className="mb-2 px-1 text-lg font-black leading-tight">📚 Les six choses à savoir</h2>
          <div className="space-y-2">
            {cours.map((lecon, index) => (
              <motion.details
                key={lecon.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="card group px-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <span className="text-2xl">{lecon.emoji}</span>
                  <span className="flex-1 text-base font-extrabold">{lecon.title}</span>
                  <span className="text-ink-muted transition group-open:rotate-90">›</span>
                </summary>
                <p className="mt-2 pl-11 text-sm font-bold leading-relaxed text-ink-soft">
                  {lecon.body}
                </p>
                {lecon.action ? (
                  <p className="mt-2 ml-11 rounded-xl bg-teal-500/10 px-3 py-2 text-sm font-extrabold text-teal-700">
                    👉 {lecon.action}
                  </p>
                ) : null}
              </motion.details>
            ))}
          </div>
        </section>

        <p className="px-2 pb-2 text-center text-xs font-bold leading-relaxed text-ink-muted">
          Les prix affichés ici sont ceux de votre grille ({summary.plan.label}). Ils se mettent
          à jour tout seuls si vous les modifiez dans les réglages.
        </p>
      </div>
    </div>
  );
}

/**
 * UN SEAU.
 *
 * Dessiné en SVG plutôt qu'en CSS : le contour d'un seau est un trapèze, et un
 * trapèze découpé au `clip-path` perd sa bordure. Ici le tracé sert à la fois
 * de contour visible et de masque pour le liquide — les deux ne peuvent pas se
 * désaligner.
 */
function Seau({
  couleur,
  remplissage,
  delai,
  contenance,
}: {
  couleur: string;
  remplissage: number;
  delai: number;
  contenance: number | null;
}) {
  // Identifiant unique : deux masques de même nom se marcheraient dessus.
  const masque = `seau-${Math.round(remplissage * 1000)}-${couleur.replace('#', '')}`;
  const tracé = 'M10 10 H54 L47 82 Q46 89 39 89 H25 Q18 89 17 82 Z';
  const hauteur = 79 * Math.min(1, Math.max(0, remplissage));

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 64 96" className="h-24 w-16" role="img" aria-hidden="true">
        <defs>
          <clipPath id={masque}>
            <path d={tracé} />
          </clipPath>
        </defs>

        {/* Le liquide, qui monte depuis le fond. */}
        <motion.rect
          x="0"
          width="64"
          fill={couleur}
          opacity={0.85}
          clipPath={`url(#${masque})`}
          initial={{ height: 0, y: 89 }}
          animate={{ height: hauteur, y: 89 - hauteur }}
          transition={{ delay: delai, duration: 0.9, ease: 'easeOut' }}
        />

        {/* Le contour, par-dessus : le seau reste lisible même vide. */}
        <path d={tracé} fill="none" stroke="#1C1917" strokeOpacity="0.22" strokeWidth="3" />
        <rect x="7" y="6" width="50" height="7" rx="3.5" fill="#1C1917" fillOpacity="0.22" />
      </svg>

      <span className="mt-0.5 text-[10px] font-black text-ink-muted">
        {contenance === null ? 'sans fond' : `${contenance} kWh`}
      </span>
    </div>
  );
}
