export type TabId = 'inventaire' | 'estimateur' | 'foyer';

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'inventaire', label: 'Mes appareils', emoji: '🏠' },
  { id: 'estimateur', label: 'Combien ?', emoji: '⏱️' },
  { id: 'foyer', label: 'Chez nous', emoji: '⚖️' },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="tap flex flex-1 flex-col items-center gap-0.5 py-2.5"
              aria-current={selected ? 'page' : undefined}
            >
              <span className={`text-2xl transition ${selected ? '' : 'opacity-40 grayscale'}`}>
                {tab.emoji}
              </span>
              <span
                className={`text-[11px] font-extrabold ${selected ? 'text-teal-600' : 'text-ink-muted'}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
