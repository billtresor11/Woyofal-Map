import { m as motion } from 'framer-motion';

/**
 * NAVIGATION — une seule liste d'onglets, deux formes.
 *
 * Sur téléphone : une barre en bas, au niveau du pouce.
 * Sur ordinateur : une colonne à gauche, où l'œil va chercher un menu.
 *
 * Les deux lisent le même tableau `TABS` : ajouter un onglet ne se fait qu'une
 * fois, et les deux plateformes ne peuvent pas diverger.
 */

export type TabId = 'inventaire' | 'estimateur' | 'compteur' | 'recharge' | 'ecole';

interface Tab {
  id: TabId;
  /** Libellé long, pour la colonne de gauche. */
  label: string;
  /** Libellé court, pour la barre du bas où la place manque. */
  short: string;
  emoji: string;
  hint: string;
}

export const TABS: Tab[] = [
  {
    id: 'inventaire',
    label: 'Mes appareils',
    short: 'Maison',
    emoji: '🏠',
    hint: 'Ce que vous avez, et ce que ça coûte',
  },
  {
    id: 'estimateur',
    label: 'Combien ça coûte ?',
    short: 'Combien ?',
    emoji: '⏱️',
    hint: 'Le prix d’une soirée, d’une recharge',
  },
  {
    id: 'compteur',
    label: 'Mon compteur',
    short: 'Compteur',
    emoji: '🔢',
    hint: 'Recopier le boîtier pour se recaler',
  },
  {
    id: 'recharge',
    label: 'Quand recharger',
    short: 'Recharge',
    emoji: '🛒',
    hint: 'Le bon moment, le bon montant',
  },
  {
    id: 'ecole',
    label: 'L’École Woyofal',
    short: 'École',
    emoji: '🎓',
    hint: 'Comprendre les tranches en 2 minutes',
  },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
  /** Pastille d'alerte sur un onglet (crédit bas, conseil à lire). */
  badges?: Partial<Record<TabId, string>>;
}

/** La barre du bas : téléphone uniquement. */
export function BottomBar({ active, onChange, badges }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="tap relative flex flex-1 flex-col items-center gap-0.5 py-2"
              aria-current={selected ? 'page' : undefined}
            >
              <span className="relative">
                <span className={`text-2xl transition ${selected ? '' : 'opacity-40 grayscale'}`}>
                  {tab.emoji}
                </span>
                {badges?.[tab.id] ? (
                  <span className="absolute -right-1.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-tier3 ring-2 ring-white" />
                ) : null}
              </span>
              <span
                className={`text-[10px] font-extrabold leading-tight ${
                  selected ? 'text-teal-600' : 'text-ink-muted'
                }`}
              >
                {tab.short}
              </span>
              {selected ? (
                <motion.span
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute inset-x-4 top-0 h-1 rounded-full bg-teal-500"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** La colonne de gauche : à partir des grands écrans. */
export function Sidebar({
  active,
  onChange,
  badges,
  householdName,
  onOpenSettings,
  onLogout,
  userName,
}: Props & {
  householdName: string;
  onOpenSettings: () => void;
  onLogout?: () => void;
  userName?: string | null;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sand-200 bg-white px-4 py-6 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500 text-2xl">
          💡
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black leading-tight">Woyofal Map</p>
          <p className="truncate text-xs font-bold text-ink-muted">{householdName}</p>
        </div>
      </div>

      <nav className="mt-7 flex flex-col gap-1">
        {TABS.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={selected ? 'page' : undefined}
              className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                selected ? 'text-teal-700' : 'text-ink-soft hover:bg-sand-50'
              }`}
            >
              {selected ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 rounded-2xl bg-sand-100"
                />
              ) : null}
              <span className={`relative text-2xl ${selected ? '' : 'opacity-60 grayscale'}`}>
                {tab.emoji}
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">{tab.label}</span>
                <span className="block truncate text-[11px] font-bold text-ink-muted">
                  {tab.hint}
                </span>
              </span>
              {badges?.[tab.id] ? (
                <span className="relative h-2.5 w-2.5 shrink-0 rounded-full bg-tier3" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-6">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-extrabold text-ink-soft transition hover:bg-sand-50"
        >
          <span className="text-xl">⚙️</span> Réglages
        </button>
        {onLogout ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-extrabold text-ink-soft transition hover:bg-sand-50"
          >
            <span className="text-xl">🚪</span>
            <span className="min-w-0 truncate">
              Se déconnecter
              {userName ? <span className="block text-[11px] font-bold text-ink-muted">{userName}</span> : null}
            </span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
