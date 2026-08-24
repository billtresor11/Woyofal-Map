import { AnimatePresence, m as motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api/client.js';
import type { MeterReading } from '../api/types.js';
import { ErrorBanner } from '../components/ui.js';
import { useApp } from '../hooks/useApp.js';
import { fcfa, kwh as fmtKwh } from '../lib/format.js';

/**
 * ONGLET 3 — LE COMPTEUR.
 *
 * Tout le reste de l'application estime. Cet écran, lui, MESURE : l'utilisateur
 * recopie le nombre affiché sur son boîtier mural, et ce nombre écrase
 * l'estimation. C'est le seul endroit où l'application accepte de se tromper
 * et se corrige.
 *
 * Écran volontairement pauvre : un grand champ, un gros bouton. Ce qu'on fait
 * ici se fait debout, dans un couloir, en regardant le compteur.
 */
export function MeterScreen() {
  const { summary, householdId, refresh } = useApp();
  const [valeur, setValeur] = useState('');
  const [historique, setHistorique] = useState<MeterReading[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const charger = useCallback(async () => {
    if (!householdId) return;
    try {
      const { readings } = await api.get<{ readings: MeterReading[] }>(
        `/api/households/${householdId}/readings`,
      );
      setHistorique(readings);
    } catch {
      setHistorique([]);
    }
  }, [householdId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (!summary) return null;
  const { consumedSoFar, credit, totals, plan, gauge } = summary;

  async function enregistrer() {
    const nombre = Number(valeur.replace(',', '.'));
    if (!Number.isFinite(nombre) || nombre < 0) {
      setErreur('Entrez le nombre affiché sur votre compteur, par exemple 47,3.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await api.post(`/api/households/${householdId}/readings`, { remainingKwh: nombre });
      setValeur('');
      setSucces(true);
      setTimeout(() => setSucces(false), 2600);
      await Promise.all([refresh(), charger()]);
    } catch (error) {
      setErreur(error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  const derive = consumedSoFar.driftPercent;

  return (
    <div className="pb-28 lg:pb-6">
      {/* --- Le crédit restant, en gros ---------------------------------- */}
      <div className="bg-gradient-to-b from-teal-600 to-teal-500 px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white">
        <p className="text-sm font-bold text-white/80">Sur votre boîtier Woyofal</p>
        {credit ? (
          <>
            <p className="mt-1 text-5xl font-black tabular-nums tracking-tight">
              {fmtKwh(credit.remainingKwh)}
            </p>
            <motion.p
              key={credit.level}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 rounded-2xl px-4 py-3 text-sm font-bold leading-snug ${
                credit.level === 'urgent'
                  ? 'bg-tier3/90'
                  : credit.level === 'bientot'
                    ? 'bg-mango-500/90'
                    : 'bg-white/15'
              }`}
            >
              {credit.level === 'urgent' ? '🚨 ' : credit.level === 'bientot' ? '⚠️ ' : '✅ '}
              {credit.message}
            </motion.p>
          </>
        ) : (
          <>
            <p className="mt-1 text-3xl font-black leading-tight">Jamais relevé</p>
            <p className="mt-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold leading-snug">
              Recopiez une fois le nombre affiché sur votre compteur : l’application saura
              exactement où vous en êtes, au lieu de le deviner.
            </p>
          </>
        )}
      </div>

      <div className="space-y-5 px-4 pt-5">
        {/* --- La saisie ------------------------------------------------- */}
        <section className="card px-5 py-5">
          <h2 className="text-lg font-black leading-tight">🔢 Que dit votre compteur ?</h2>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            Le nombre affiché sur le petit écran blanc, au mur. C’est le courant qu’il vous reste.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <input
              inputMode="decimal"
              value={valeur}
              onChange={(event) => setValeur(event.target.value)}
              placeholder="47,3"
              aria-label="kWh restants affichés sur le compteur"
              className="w-full rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-4 text-3xl font-black tabular-nums outline-none transition focus:border-teal-500"
            />
            <span className="shrink-0 text-lg font-black text-ink-muted">kWh</span>
          </div>

          {erreur ? <p className="mt-3 text-sm font-bold text-tier3">{erreur}</p> : null}

          <button
            onClick={enregistrer}
            disabled={envoi || valeur.trim() === ''}
            className="btn-primary mt-4 w-full"
          >
            {envoi ? 'Enregistrement…' : '✅ C’est ce qui est affiché'}
          </button>

          <AnimatePresence>
            {succes ? (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden rounded-2xl bg-tier1/15 px-4 py-3 text-sm font-bold text-ink"
              >
                🎯 C’est noté. Vos estimations viennent d’être recalées sur la réalité.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </section>

        {/* --- Où en est le mois ----------------------------------------- */}
        <section className="card px-5 py-5">
          <h2 className="text-lg font-black leading-tight">📅 Où en est votre mois</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat
              label="Consommé depuis le 1er"
              value={fmtKwh(consumedSoFar.kwh)}
              hint={
                consumedSoFar.source === 'compteur'
                  ? 'Mesuré sur votre compteur'
                  : consumedSoFar.source === 'mixte'
                    ? `Mesuré à ${Math.round(consumedSoFar.measuredRatio * 100)} %`
                    : 'Estimé d’après vos appareils'
              }
            />
            <Stat
              label="Prévu fin du mois"
              value={fmtKwh(consumedSoFar.projectedMonthKwh)}
              hint={`Au rythme de ${fmtKwh(totals.kwhPerDay)} par jour`}
            />
            <Stat
              label="Tranche en cours"
              value={gauge.currentTier.label}
              hint={`${fcfa(gauge.currentTier.pricePerKwh)} le kWh`}
            />
            <Stat
              label="Grille appliquée"
              value={plan.code === 'WOYOFAL_DPP' ? 'Petite puissance' : 'Moyenne puissance'}
              hint={`${plan.tiers.length} tranches`}
            />
          </div>

          {derive !== null ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold leading-snug ${
                Math.abs(derive) <= 10 ? 'bg-tier1/15' : 'bg-mango-400/20'
              }`}
            >
              {Math.abs(derive) <= 10
                ? `👌 L’application tombe juste : moins de 10 % d’écart avec votre compteur.`
                : derive > 0
                  ? `📈 Vous consommez ${derive} % de plus que ce que l’application prévoit. Il manque sans doute un appareil dans votre inventaire.`
                  : `📉 Vous consommez ${-derive} % de moins que prévu. Vos appareils tournent moins que ce qui est déclaré.`}
            </motion.div>
          ) : null}
        </section>

        {/* --- Le détail du calcul, pour qui veut vérifier ----------------- */}
        {consumedSoFar.segments.length > 0 ? (
          <section className="card px-5 py-5">
            <h2 className="text-lg font-black leading-tight">🧾 D’où vient ce chiffre</h2>
            <ul className="mt-3 space-y-2">
              {consumedSoFar.segments.map((segment, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      segment.source === 'compteur' ? 'bg-tier1' : 'bg-sand-200'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">
                      {dateCourte(segment.from)} → {dateCourte(segment.to)} ·{' '}
                      {fmtKwh(segment.kwh)}
                    </span>
                    <span className="block text-xs font-bold text-ink-muted">
                      {segment.explanation}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- L'historique ---------------------------------------------- */}
        <section>
          <h2 className="mb-2 px-1 text-lg font-black leading-tight">📖 Vos relevés</h2>
          {historique === null ? (
            <p className="px-1 text-sm font-bold text-ink-muted">Chargement…</p>
          ) : historique.length === 0 ? (
            <p className="card px-5 py-5 text-sm font-bold text-ink-soft">
              Aucun relevé pour l’instant. Le premier prend dix secondes et change tout.
            </p>
          ) : (
            <ul className="space-y-2">
              {historique.map((releve) => (
                <motion.li
                  key={releve.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-xl">
                    🔢
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-extrabold">
                      {fmtKwh(releve.remainingKwh)} restants
                    </span>
                    <span className="block text-xs font-bold text-ink-muted">
                      {dateLongue(releve.readAt)}
                      {releve.consumedKwh !== null
                        ? ` · ${fmtKwh(releve.consumedKwh)} consommés depuis le précédent`
                        : ''}
                    </span>
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        {erreur && historique === null ? <ErrorBanner message={erreur} /> : null}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-sand-50 px-3 py-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-black leading-tight tabular-nums">{value}</p>
      <p className="text-[11px] font-bold text-ink-muted">{hint}</p>
    </div>
  );
}

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function dateLongue(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
