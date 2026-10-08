interface RefreshCountdownProps {
  refreshTick: number;
  intervalMs: number;
  paused?: boolean;
}

const RADIUS = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Pure CSS stroke sweep — no JS frame loop for a steady linear countdown. */
export function RefreshCountdown({ refreshTick, intervalMs, paused }: RefreshCountdownProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" role="img" aria-label="Time until next refresh">
      <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="2" />
      <circle
        key={refreshTick}
        cx="10"
        cy="10"
        r={RADIUS}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        style={{
          transformOrigin: '50% 50%',
          transform: 'rotate(-90deg)',
          animation: paused ? 'none' : `countdown-sweep ${intervalMs}ms linear forwards`,
          ['--countdown-circumference' as string]: CIRCUMFERENCE,
        }}
      />
    </svg>
  );
}
