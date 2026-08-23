/** Mise en forme : partout des FCFA entiers, jamais de decimales inutiles. */

export function fcfa(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/ | /g, ' ')} F`;
}

export function fcfaLong(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}

export function kwh(value: number): string {
  if (value >= 100) return `${Math.round(value)} kWh`;
  if (value >= 10) return `${value.toFixed(1)} kWh`;
  return `${value.toFixed(2)} kWh`;
}

export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export const TIER_COLORS = ['#22C55E', '#F59E0B', '#EF4444', '#B91C1C'];

export function tierColor(order: number): string {
  return TIER_COLORS[Math.min(order - 1, TIER_COLORS.length - 1)] ?? '#EF4444';
}

export function monthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  const names = [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  ];
  const index = Number(monthPart) - 1;
  return `${names[index] ?? ''} ${year}`;
}
