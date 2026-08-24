import { AnimatePresence, m as motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api/client.js';
import type { RechargeAdviceResult } from '../api/types.js';
import { ErrorBanner, Spinner } from '../components/ui.js';
import { useApp } from '../hooks/useApp.js';
import { fcfa, kwh as fmtKwh } from '../lib/format.js';

/**
 * ONGLET 4 — QUAND RECHARGER.
 *
 * L'écran qui rapporte de l'argent. Il repose sur un fait que presque personne
 * n'exploite : en prépayé, la tranche s'applique au moment de l'ACHAT, sur le
 * cumul acheté depuis le 1er du mois. Acheter 20 000 F le 28 coûte donc bien
 * plus cher que 5 000 F le 28 puis 15 000 F le 2.
 *
 * L'utilisateur ne voit rien de ce raisonnement : il voit un montant, une date,
 * et une somme économisée.
 */
export function RechargeScreen() {
  const { householdId, summary } = useApp();
  const [conseil, setConseil] = useState<RechargeAdviceResult | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!householdId) return;
    try {
      setErreur(null);
      setConseil(await api.get<RechargeAdviceResult>(`/api/households/${householdId}/recharge-advice`));
    } catch (error) {
      setErreur(error instanceof ApiError ? error.message : 'Conseil indisponible.');
    }
  }, [householdId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (erreur) {
    return (
      <div className="px-4 pt-20">
        <ErrorBanner message={erreur} onRetry={charger} />
      </div>
    );
  }
  if (!conseil || !summary) return <Spinner label="Calcul du meilleur moment…" />;

  const teinte =
    conseil.strategy === 'minimum_vital'
      ? 'from-mango-600 to-mango-500'
      : conseil.strategy === 'rien_a_faire'
        ? 'from-teal-600 to-teal-500'
        : conseil.strategy === 'meilleur_moment'
          ? 'from-teal-600 to-teal-500'
          : 'from-teal-700 to-teal-600';

  return (
    <div className="pb-28 lg:pb-6">
      {/* --- Le conseil, en une phrase ----------------------------------- */}
      <motion.div
        key={conseil.strategy}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`bg-gradient-to-b ${teinte} px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white`}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="text-5xl"
        >
          {conseil.emoji}
        </motion.div>
        <h1 className="mt-2 text-2xl font-black leading-tight">{conseil.title}</h1>
        <p className="mt-2 text-sm font-bold leading-relaxed text-white/90">{conseil.message}</p>

        {conseil.recommendedAmount > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-4 rounded-3xl bg-white/15 px-5 py-4"
          >
            <p className="text-xs font-black uppercase tracking-wide text-white/70">
              À acheter aujourd’hui
            </p>
            <p className="mt-0.5 text-4xl font-black tabular-nums">
              {fcfa(conseil.recommendedAmount)}
            </p>
            <p className="text-sm font-bold text-white/85">
              soit environ {fmtKwh(conseil.recommendedKwh)}
            </p>
          </motion.div>
        ) : null}

        <p className="mt-3 text-xs font-bold text-white/70">
          Remise à zéro des tranches dans {Math.ceil(conseil.daysLeftInMonth)} jour
          {Math.ceil(conseil.daysLeftInMonth) > 1 ? 's' : ''} ·{' '}
          {conseil.currentTier.label} en cours à {fcfa(conseil.currentTier.pricePerKwh)} le kWh
        </p>
      </motion.div>

      <div className="space-y-5 px-4 pt-5">
        {/* --- Le plan en deux temps -------------------------------------- */}
        <AnimatePresence>
          {conseil.waitPlan ? (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden"
            >
              <div className="bg-tier1/15 px-5 py-4">
                <h2 className="text-lg font-black leading-tight">
                  💰 Vous pouvez garder {fcfa(conseil.waitPlan.savings)}
                </h2>
                <p className="mt-1 text-sm font-bold text-ink-soft">
                  Même quantité de courant, en deux achats au lieu d’un.
                </p>
              </div>

              <div className="space-y-3 px-5 py-4">
                <Etape
                  numero="1"
                  quand="Aujourd’hui"
                  montant={conseil.waitPlan.nowAmount}
                  kwhs={conseil.waitPlan.nowKwh}
                  detail="Juste de quoi tenir jusqu’au 1er, pas plus."
                />
                <Etape
                  numero="2"
                  quand={`Le ${new Date(conseil.resetOn).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  })}`}
                  montant={conseil.waitPlan.laterAmount}
                  kwhs={conseil.waitPlan.laterKwh}
                  detail="Les tranches sont remises à zéro : c’est le prix le plus bas."
                />

                <div className="flex items-center justify-between rounded-2xl bg-sand-50 px-4 py-3">
                  <span className="text-sm font-bold text-ink-soft">
                    Tout acheter aujourd’hui
                  </span>
                  <span className="text-base font-black tabular-nums text-ink-muted line-through">
                    {fcfa(conseil.waitPlan.allAtOnceAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-tier1/15 px-4 py-3">
                  <span className="text-sm font-black">En deux fois</span>
                  <span className="text-lg font-black tabular-nums text-teal-700">
                    {fcfa(conseil.waitPlan.nowAmount + conseil.waitPlan.laterAmount)}
                  </span>
                </div>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        {/* --- Les montants courants -------------------------------------- */}
        <section>
          <h2 className="mb-1 px-1 text-lg font-black leading-tight">
            🛒 Ce que donnent les montants habituels
          </h2>
          <p className="mb-2 px-1 text-sm font-bold text-ink-soft">
            Calculé à partir de {fmtKwh(conseil.purchasedKwhThisMonth)} déjà{' '}
            {conseil.purchaseSource === 'achats' ? 'achetés' : 'consommés'} ce mois-ci.
          </p>
          <div className="space-y-2">
            {conseil.options.map((option, index) => (
              <motion.div
                key={option.amount}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card flex items-center gap-3 px-4 py-3"
              >
                <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-sm font-black tabular-nums">
                  {fcfa(option.amount)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold">{fmtKwh(option.kwh)}</span>
                  <span className="block text-xs font-bold text-ink-muted">
                    environ {Math.floor(option.daysCovered)} jours de courant ·{' '}
                    {fcfa(option.averagePricePerKwh)} le kWh en moyenne
                  </span>
                </span>
                {option.crossesTier ? (
                  <span className="chip shrink-0 bg-mango-400/25 px-2 py-1 text-[11px] text-ink">
                    ⚠️ change de tranche
                  </span>
                ) : null}
              </motion.div>
            ))}
          </div>
        </section>

        {/* --- Pourquoi ce conseil ---------------------------------------- */}
        <section className="card px-5 py-5">
          <h2 className="text-lg font-black leading-tight">🤔 Pourquoi ce conseil</h2>
          <ul className="mt-3 space-y-2 text-sm font-bold text-ink-soft">
            <li>
              • Vos appareils consomment environ{' '}
              <strong className="text-ink">{fmtKwh(conseil.estimatedKwhPerDay)}</strong> par jour.
            </li>
            <li>
              • Pour tenir jusqu’au 1er, il vous faut{' '}
              <strong className="text-ink">{fmtKwh(conseil.kwhNeededUntilReset)}</strong>.
            </li>
            {conseil.credit ? (
              <li>
                • Il vous reste{' '}
                <strong className="text-ink">{fmtKwh(conseil.credit.remainingKwh)}</strong> sur le
                compteur, soit {Math.floor(conseil.credit.daysLeft)} jours.
              </li>
            ) : (
              <li className="text-mango-600">
                • Votre compteur n’a jamais été relevé : passez par l’onglet Compteur pour un
                conseil au kWh près.
              </li>
            )}
            <li>
              • Le 1er du mois, tout repart à{' '}
              <strong className="text-ink">{fcfa(conseil.plan.tiers[0]?.pricePerKwh ?? 0)}</strong>{' '}
              le kWh.
            </li>
          </ul>
        </section>

        <p className="px-2 pb-2 text-center text-xs font-bold leading-relaxed text-ink-muted">
          L’application ne vend rien et n’achète rien à votre place. Elle vous dit seulement
          quand votre argent achète le plus de courant.
        </p>
      </div>
    </div>
  );
}

function Etape({
  numero,
  quand,
  montant,
  kwhs,
  detail,
}: {
  numero: string;
  quand: string;
  montant: number;
  kwhs: number;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-black text-white">
        {numero}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base font-black">{quand}</span>
          <span className="whitespace-nowrap text-lg font-black tabular-nums text-teal-700">
            {fcfa(montant)}
          </span>
        </div>
        <p className="text-xs font-bold text-ink-muted">
          {fmtKwh(kwhs)} · {detail}
        </p>
      </div>
    </div>
  );
}
