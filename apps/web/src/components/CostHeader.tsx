import type { Summary } from '../api/types.js';
import { fcfa, kwh as fmtKwh, tierColor } from '../lib/format.js';

/**
 * En-tete de l’application : la seule chose que l’utilisateur regarde vraiment.
 * Un montant en FCFA, une jauge coloree, une phrase claire.
 * Les tranches Senelec sont ici, mais jamais nommees "algorithme" ni "tarif" :
 * elles se lisent comme un jeu de couleurs.
 */
export function CostHeader({ summary, onOpenTariff }: { summary: Summary; onOpenTariff?: () => void }) {
  const { bill, gauge, totals, equivalents, budget, dailyAmount } = summary;
  const tiers = gauge.segments.map((segment) => segment.tier);
  const scale = gauge.scaleKwh;
  const fillRatio = Math.min(1, totals.kwhPerMonth / scale);
  const current = gauge.currentTier;

  return (
    <div className="bg-gradient-to-b from-teal-600 to-teal-500 px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white/80">Facture estimée ce mois-ci</p>
          <p className="mt-0.5 text-5xl font-black tabular-nums tracking-tight">
            {fcfa(bill.totalTTC)}
          </p>
          <p className="mt-1 text-sm font-bold text-white/80">
            environ {fcfa(dailyAmount)} par jour · {fmtKwh(totals.kwhPerMonth)}
          </p>
        </div>
        <button
          onClick={onOpenTariff}
          className="tap flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl"
          aria-label="Réglages du tarif"
        >
          ⚙️
        </button>
      </div>

      {equivalents.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {equivalents.map((equivalent) => (
            <span key={equivalent.label} className="chip bg-white/15 text-white">
              {equivalent.emoji} {equivalent.count} {equivalent.label}
            </span>
          ))}
        </div>
      ) : null}

      {/* --- Jauge des tranches ------------------------------------------- */}
      <div className="mt-5">
        <div className="relative h-5 overflow-hidden rounded-full bg-white/20">
          {/* Les tranches en fond, pâles : là où l’on n’est pas encore allé. */}
          <TierBand tiers={tiers} scale={scale} opacity={0.3} />
          {/* La même bande, en couleurs vives, coupée à la consommation réelle. */}
          <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fillRatio * 100}%` }}>
            <div className="relative h-full" style={{ width: `${fillRatio > 0 ? 100 / fillRatio : 100}%` }}>
              <TierBand tiers={tiers} scale={scale} opacity={1} />
            </div>
          </div>
          <div
            className="absolute inset-y-0 flex items-center transition-[left] duration-500"
            style={{ left: `calc(${fillRatio * 100}% - 10px)` }}
          >
            <div className="h-5 w-5 rounded-full border-[3px] border-white bg-white shadow" />
          </div>
        </div>

        {/* Les seuils, places a leur vraie position sur la jauge. */}
        <div className="relative mt-1 h-5 text-xs font-bold text-white/85">
          <span className="absolute left-0">0</span>
          {tiers
            .filter((tier) => tier.toKwh !== null)
            .map((tier) => (
              <span
                key={tier.order}
                className="absolute -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${((tier.toKwh ?? 0) / scale) * 100}%` }}
              >
                {tier.toKwh} kWh
              </span>
            ))}
        </div>

        <p className="mt-3 rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold leading-snug">
          {gauge.kwhToNextTier === null ? (
            <>
              🔴 Vous êtes dans la tranche la plus chère. Chaque kWh y coûte{' '}
              {fcfa(current.pricePerKwh)}.
            </>
          ) : (
            <>
              {current.order === 1 ? '🟢' : '🟠'} Vous êtes en{' '}
              <strong>{current.label.toLowerCase()}</strong>. Encore{' '}
              <strong>{fmtKwh(gauge.kwhToNextTier)}</strong> avant que le prix n’augmente.
            </>
          )}
        </p>

        {budget ? (
          <div
            className={`mt-2 rounded-2xl px-4 py-3 text-sm font-bold ${
              budget.status === 'over'
                ? 'bg-tier3/90'
                : budget.status === 'warning'
                  ? 'bg-mango-500/90'
                  : 'bg-white/15'
            }`}
          >
            {budget.status === 'over'
              ? `😬 Vous dépassez votre budget de ${fcfa(-budget.remaining)}.`
              : budget.status === 'warning'
                ? `⚠️ Il vous reste ${fcfa(budget.remaining)} avant votre budget.`
                : `👍 Dans votre budget : il reste ${fcfa(budget.remaining)}.`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Bande coloree representant les tranches, du vert au rouge. */
function TierBand({
  tiers,
  scale,
  opacity,
}: {
  tiers: Array<{ order: number; fromKwh: number; toKwh: number | null }>;
  scale: number;
  opacity: number;
}) {
  return (
    <div className="absolute inset-0 flex">
      {tiers.map((tier) => {
        const end = tier.toKwh ?? scale;
        const width = Math.max(0, ((end - tier.fromKwh) / scale) * 100);
        return (
          <div
            key={tier.order}
            style={{ width: `${width}%`, backgroundColor: tierColor(tier.order), opacity }}
            className="h-full"
          />
        );
      })}
    </div>
  );
}
