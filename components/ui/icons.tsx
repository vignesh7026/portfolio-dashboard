interface IconProps {
  className?: string;
}

/** All icons here are decorative — the real semantic signal is the number's sign or the text. */

export function ArrowUpIcon({ className = 'w-3 h-3' }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M6 10V2M6 2L2.5 5.5M6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowDownIcon({ className = 'w-3 h-3' }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M6 2v8M6 10l3.5-3.5M6 10 2.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon({ className = 'w-3 h-3' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.75V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon({ className = 'w-3 h-3' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.25v4M8 5.25v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function WarningIcon({ className = 'w-3 h-3' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2.5 14 13H2L8 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 6.5v3M8 11v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PulseDotIcon({ className = 'w-2 h-2' }: IconProps) {
  return <span className={`inline-block rounded-full bg-gain ${className}`} aria-hidden="true" />;
}
