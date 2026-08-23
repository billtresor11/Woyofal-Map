import { useEffect, useMemo, useState } from 'react';
import type { ApplianceTemplate, Catalog } from '../api/types.js';
import { ApplianceIcon } from './ApplianceIcon.js';
import { Sheet } from './ui.js';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Le menu principal du produit : une grille d’illustrations.
 * On ne demande jamais "quelle puissance ?" - on montre des objets à reconnaître.
 */
export function AppliancePicker({
  open,
  catalog,
  onClose,
  onPick,
}: {
  open: boolean;
  catalog: Catalog | null;
  onClose: () => void;
  onPick: (template: ApplianceTemplate) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  // On repart d'une grille complète à chaque ouverture : une recherche oubliée
  // donnerait l'impression que le catalogue s'est vidé.
  useEffect(() => {
    if (open) {
      setQuery('');
      setCategory(null);
    }
  }, [open]);

  const templates = useMemo(() => {
    if (!catalog) return [];
    const q = normalize(query.trim());
    return catalog.templates.filter((template) => {
      if (category && template.category !== category) return false;
      if (!q) return true;
      return normalize([template.name, ...template.keywords].join(' ')).includes(q);
    });
  }, [catalog, query, category]);

  const colorOf = (template: ApplianceTemplate) =>
    catalog?.categories.find((item) => item.id === template.category)?.color ?? '#0D9488';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Qu’avez-vous chez vous ?"
      subtitle="Touchez un appareil pour l’ajouter."
    >
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-4 bg-sand-50 px-5 pb-3 pt-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher : frigo, clim, télé..."
          className="w-full rounded-2xl border-2 border-transparent bg-white px-4 py-3 text-base font-bold shadow-card outline-none placeholder:font-bold placeholder:text-ink-muted focus:border-teal-500"
        />
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          <button
            onClick={() => setCategory(null)}
            className={`tap chip shrink-0 border-2 ${
              category === null ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-white'
            }`}
          >
            Tout
          </button>
          {catalog?.categories.map((item) => (
            <button
              key={item.id}
              onClick={() => setCategory(item.id === category ? null : item.id)}
              className={`tap chip shrink-0 border-2 ${
                category === item.id ? 'border-teal-500 bg-teal-500/10' : 'border-transparent bg-white'
              }`}
            >
              <span>{item.emoji}</span> {item.label}
            </button>
          ))}
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="py-10 text-center text-sm font-bold text-ink-muted">
          Aucun appareil ne correspond à "{query}".
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 pb-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onPick(template)}
              className="tap card flex animate-pop flex-col items-center gap-2 px-2 py-4"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${colorOf(template)}1A`, color: colorOf(template) }}
              >
                <ApplianceIcon templateId={template.id} className="h-8 w-8" />
              </span>
              <span className="text-center text-xs font-extrabold leading-tight">{template.name}</span>
              {template.alwaysOn ? (
                <span className="chip -mt-1 bg-mango-400/20 px-2 py-0.5 text-[10px] text-mango-600">
                  24h/24
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
