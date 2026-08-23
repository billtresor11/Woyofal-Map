import { useEffect, type ReactNode } from 'react';

/** Feuille qui remonte du bas : le geste le plus naturel sur telephone. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Fermer"
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-lg animate-slide-up flex-col overflow-hidden rounded-t-4xl bg-sand-50 sm:rounded-4xl">
        <div className="flex items-start gap-3 border-b border-sand-200 bg-white px-5 pb-4 pt-3">
          <div className="flex-1">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand-200 sm:hidden" />
            {title ? <h2 className="text-xl font-black leading-tight">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="tap -mr-1 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-lg font-black text-ink-soft"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-sand-200 bg-white px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; emoji?: string }>;
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-sand-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`tap flex-1 rounded-xl px-3 py-2 text-sm font-extrabold transition ${
            value === option.value ? 'bg-white text-ink shadow-card' : 'text-ink-soft'
          }`}
        >
          {option.emoji ? <span className="mr-1">{option.emoji}</span> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  children,
  action,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="text-5xl">{emoji}</div>
      <h3 className="text-lg font-black">{title}</h3>
      {children ? <p className="max-w-xs text-sm text-ink-soft">{children}</p> : null}
      {action}
    </div>
  );
}

export function Spinner({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-ink-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-sand-200 border-t-teal-500" />
      <p className="text-sm font-bold">{label}</p>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex items-start gap-3 border-l-4 border-tier3 px-4 py-3">
      <span className="text-xl">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-ink">{message}</p>
        {onRetry ? (
          <button onClick={onRetry} className="mt-1 text-sm font-extrabold text-teal-600 underline">
            Reessayer
          </button>
        ) : null}
      </div>
    </div>
  );
}
