import type { ReactNode } from 'react';

type BadgeVariant = 'neutral' | 'stale' | 'unavailable' | 'warning' | 'accent' | 'mock';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-hover text-text-secondary border-border',
  stale: 'bg-stale-soft text-stale border-transparent',
  unavailable: 'bg-surface-hover text-text-secondary border-border',
  warning: 'bg-stale-soft text-stale border-transparent',
  accent: 'bg-accent-soft text-accent border-transparent',
  mock: 'bg-accent-soft text-accent border-transparent',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  icon?: ReactNode;
}

export function Badge({ children, variant = 'neutral', icon }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium leading-none ${VARIANT_CLASSES[variant]}`}
    >
      {icon}
      {children}
    </span>
  );
}
