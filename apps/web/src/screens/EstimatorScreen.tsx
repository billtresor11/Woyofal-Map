import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import type { ApplianceTemplate, PunctualResult } from '../api/types.js';
import { ApplianceIcon } from '../components/ApplianceIcon.js';
import { AppliancePicker } from '../components/AppliancePicker.js';
import { Segmented, Spinner } from '../components/ui.js';
import { useApp } from '../hooks/useApp.js';
import { duration as fmtDuration, fcfa, kwh as fmtKwh } from '../lib/format.js';

const DURATIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 120, label: '2 h' },
  { minutes: 180, label: '3 h' },
  { minutes: 300, label: '5 h' },
  { minutes: 480, label: 'Une nuit' },
  { minutes: 720, label: 'Une journee' },
];

const AMOUNTS = [1000, 2000, 5000, 10000, 20000];

/**
 * ONGLET 2 - Estimateur d action ponctuelle.
 * "Combien coute 3h de PlayStation ce soir ?" - et la reponse tient compte de
 * la tranche deja atteinte dans le mois, donc du vrai prix marginal du kWh.
 */
export function EstimatorScreen() {
  const [mode, setMode] = useState<'action' | 'recharge'>('action');
  return (
    <div className="min-h-screen pb-28">
      <header className="bg-white px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <h1 className="text-2xl font-black leading-tight">Combien ca coute ?</h1>
        <p className="mt-0.5 text-sm font-bold text-ink-soft">
          Une reponse en FCFA avant d appuyer sur le bouton.
        </p>
        <div className="mt-4">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'action', label: 'Une action', emoji: '⏱️' },
              { value: 'recharge', label: 'Une recharge', emoji: '💳' },
            ]}
          />
        </div>
      </header>
      {mode === 'action' ? <ActionEstimator /> : <RechargeEstimator />}
    </div>
  );
}

function ActionEstimator() {
  const { summary, catalog, refresh } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [template, setTemplate] = useState<ApplianceTemplate | null>(null);
  const [minutes, setMinutes] = useState(180);
  const [result, setResult] = useState<PunctualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  // Suggestion de depart : la console si elle est au catalogue, sinon la clim.
  useEffect(() => {
    if (template || !catalog) return;
    const suggestion =
      catalog.templates.find((item) => item.id === 'console_jeu') ?? catalog.templates[0];
    if (suggestion) setTemplate(suggestion);
  }, [catalog, template]);

  useEffect(() => {
    if (!template || !summary) return;
    setLoading(true);
    setSavedFor(null);
    const timer = setTimeout(() => {
      api
        .post<PunctualResult>('/api/estimate/punctual', {
          templateId: template.id,
          durationMinutes: minutes,
          householdId: summary.household.id,
        })
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }, 120);
    return () => clearTimeout(timer);
  }, [template, minutes, summary]);

  async function saveSession(memberId: string | null) {
    if (!template || !summary) return;
    await api.post('/api/estimate/punctual', {
      templateId: template.id,
      durationMinutes: minutes,
      householdId: summary.household.id,
      memberId,
      save: true,
    });
    setSavedFor(memberId ?? 'shared');
    await refresh();
  }

  if (!summary) return <Spinner />;

  return (
    <div className="space-y-5 px-4 pt-5">
      <button
        onClick={() => setPickerOpen(true)}
        className="tap card flex w-full items-center gap-4 px-4 py-4 text-left"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand-100 text-teal-600">
          {template ? <ApplianceIcon templateId={template.id} className="h-8 w-8" /> : '❓'}
        </span>
        <span className="flex-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-ink-muted">
            Appareil
          </span>
          <span className="block text-lg font-black">{template?.name ?? 'Choisir un appareil'}</span>
        </span>
        <span className="text-ink-muted">▸</span>
      </button>

      <div className="card px-4 py-4">
        <p className="mb-3 text-base font-black">⏱️ Pendant combien de temps ?</p>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((item) => (
            <button
              key={item.minutes}
              onClick={() => setMinutes(item.minutes)}
              className={`tap chip border-2 px-4 ${
                minutes === item.minutes
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-transparent bg-sand-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={15}
          max={720}
          step={15}
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
          className="mt-4 w-full accent-teal-500"
          aria-label="Duree"
        />
        <p className="text-center text-sm font-extrabold text-ink-soft">{fmtDuration(minutes)}</p>
      </div>

      {result ? (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-b from-teal-600 to-teal-500 px-5 py-6 text-center text-white">
            <p className="text-sm font-bold text-white/80">
              {fmtDuration(minutes)} de {result.template.name.toLowerCase()}
            </p>
            <p className={`text-6xl font-black tabular-nums ${loading ? 'opacity-50' : ''}`}>
              {fcfa(result.estimate.amount)}
            </p>
            <p className="mt-1 text-sm font-bold text-white/80">
              {fmtKwh(result.estimate.kwh)} · {result.estimate.tierLabel}
            </p>
            {result.estimate.equivalents.length > 0 ? (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {result.estimate.equivalents.map((equivalent) => (
                  <span key={equivalent.label} className="chip bg-white/15 text-white">
                    {equivalent.emoji} {equivalent.count} {equivalent.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 px-5 py-4">
            <Fact
              emoji="📅"
              label="Si vous le faites tous les jours"
              value={`${fcfa(result.estimate.monthlyIfDaily)} / mois`}
            />
            <Fact
              emoji="🎚️"
              label="Prix reel du kWh en ce moment"
              value={`${fcfa(result.estimate.pricePerKwh)} / kWh`}
              hint={`Vous avez deja consomme environ ${fmtKwh(result.previousKwh)} ce mois-ci.`}
            />
          </div>

          <div className="border-t border-sand-200 px-5 py-4">
            <p className="mb-2 text-sm font-black">Mettre cette consommation au compte de :</p>
            <div className="flex flex-wrap gap-2">
              {summary.members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => saveSession(member.id)}
                  className={`tap chip border-2 ${
                    savedFor === member.id
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-transparent bg-sand-100'
                  }`}
                >
                  {member.emoji} {member.name} {savedFor === member.id ? '✓' : ''}
                </button>
              ))}
              <button
                onClick={() => saveSession(null)}
                className={`tap chip border-2 ${
                  savedFor === 'shared'
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-transparent bg-sand-100'
                }`}
              >
                🏠 Tout le monde {savedFor === 'shared' ? '✓' : ''}
              </button>
            </div>
            {savedFor ? (
              <p className="mt-2 text-xs font-bold text-teal-600">
                Enregistre : cette session apparaitra dans le partage du mois.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <Spinner label="Calcul en cours..." />
      )}

      <AppliancePicker
        open={pickerOpen}
        catalog={catalog}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          setTemplate(picked);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function RechargeEstimator() {
  const { summary } = useApp();
  const [amount, setAmount] = useState(5000);
  const [result, setResult] = useState<{ kwh: number; previousKwh: number } | null>(null);

  useEffect(() => {
    if (!summary) return;
    const timer = setTimeout(() => {
      api
        .post<{ kwh: number; previousKwh: number }>('/api/estimate/recharge', {
          amount,
          householdId: summary.household.id,
        })
        .then(setResult)
        .catch(() => setResult(null));
    }, 150);
    return () => clearTimeout(timer);
  }, [amount, summary]);

  if (!summary) return <Spinner />;
  const days = result && summary.totals.kwhPerDay > 0 ? result.kwh / summary.totals.kwhPerDay : 0;

  return (
    <div className="space-y-5 px-4 pt-5">
      <div className="card px-4 py-4">
        <p className="mb-3 text-base font-black">💳 Vous rechargez combien ?</p>
        <div className="flex flex-wrap gap-2">
          {AMOUNTS.map((value) => (
            <button
              key={value}
              onClick={() => setAmount(value)}
              className={`tap chip border-2 px-4 ${
                amount === value ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-sand-100'
              }`}
            >
              {fcfa(value)}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={500}
          max={50000}
          step={500}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="mt-4 w-full accent-teal-500"
          aria-label="Montant de la recharge"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-b from-teal-600 to-teal-500 px-5 py-6 text-center text-white">
          <p className="text-sm font-bold text-white/80">Avec {fcfa(amount)} vous recevez environ</p>
          <p className="text-6xl font-black tabular-nums">{result ? Math.round(result.kwh) : '—'}</p>
          <p className="text-sm font-bold text-white/80">kilowattheures</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <Fact
            emoji="🗓️"
            label="Cela devrait tenir environ"
            value={days > 0 ? `${Math.round(days)} jour${Math.round(days) > 1 ? 's' : ''}` : '—'}
            hint="D apres votre inventaire d appareils."
          />
          <Fact
            emoji="📉"
            label="Deja consomme ce mois-ci"
            value={result ? fmtKwh(result.previousKwh) : '—'}
            hint="Plus vous avez consomme, moins la recharge donne de kWh : c est l effet des tranches."
          />
        </div>
      </div>
    </div>
  );
}

function Fact({
  emoji,
  label,
  value,
  hint,
}: {
  emoji: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl">{emoji}</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-ink-soft">{label}</p>
        <p className="text-lg font-black leading-tight">{value}</p>
        {hint ? <p className="text-xs font-bold text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
