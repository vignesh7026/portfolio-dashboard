const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const inrFormatterCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

export function formatINR(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return inrFormatter.format(value);
}

export function formatINRCompact(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return inrFormatterCompact.format(value);
}

export function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return numberFormatter.format(value);
}

export function formatPct(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatTimeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
