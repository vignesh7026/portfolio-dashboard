'use client';

import { useId } from 'react';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
}

/** Accessible hover/focus tooltip. Shows on hover OR keyboard focus — never hover-only. */
export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const id = useId();

  return (
    <span className="relative inline-flex group/tooltip focus-within:z-20 hover:z-20">
      <span aria-describedby={id} tabIndex={0} className="inline-flex rounded-sm focus:outline-none">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 w-max max-w-[220px] text-center rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary shadow-[var(--shadow-2)] opacity-0 scale-95 transition-all duration-150 ease-[var(--ease-standard)] group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 ${
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        {label}
      </span>
    </span>
  );
}
