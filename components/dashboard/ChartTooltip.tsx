import { formatINR } from '@/lib/format';

interface Payload {
  name: string;
  value: number;
  color?: string;
  payload?: { fill?: string };
}

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Payload[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const resolveColor = (p: Payload) => {
    const c = p.color ?? p.payload?.fill;
    return c && !c.startsWith('url(') ? c : undefined;
  };

  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 shadow-[var(--shadow-2)] text-xs">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p, i) => {
        const color = resolveColor(p);
        const showName = payload.length > 1 && p.name !== 'value';
        return (
          <p key={`${p.name}-${i}`} className="flex items-center gap-1.5 numeric-cell">
            {color && <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
            {showName && <span className="text-text-secondary">{p.name}:</span>}
            <span className="font-medium">{formatINR(p.value)}</span>
          </p>
        );
      })}
    </div>
  );
}
