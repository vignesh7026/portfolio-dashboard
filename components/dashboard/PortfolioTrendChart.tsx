/**
 * CHANGED — this chart is now the time-travel scrubber. Drag (or click, or
 * arrow-key) anywhere across it and the ENTIRE dashboard — hero number,
 * sector table, allocation chart, narrative line — rewinds to that exact
 * historical tick, because they all derive from the same `quotesHistory`
 * snapshot Dashboard.tsx now keeps in lockstep with `trend`. This chart
 * doesn't do that recomputation itself; it just reports an index via
 * `onScrub` and renders the scrub line + a "you are viewing the past"
 * state. Exposed as a real slider (`role="slider"`, arrow-key stepping,
 * `aria-valuetext`) rather than a drag-only gesture, so it's not
 * mouse-only.
 *
 * Found while testing: the pointer handlers were originally on the chart's
 * own wrapper div, relying on the pointerdown/move bubbling up from inside
 * the Recharts tree — it never fired a single time (verified via
 * `aria-valuenow` staying frozen through a full drag with zero JS errors),
 * because Recharts attaches its own mouse tracking for the Tooltip/active-
 * dot and stops propagation. Fixed by putting a dedicated transparent
 * overlay on top of the chart that owns 100% of the interaction, with the
 * chart below it purely visual (`pointer-events-none`) — Recharts' own
 * Tooltip was removed since the scrub badge now does that job, tied to the
 * actual drag position instead of hover.
 */
'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { formatINR, formatTime } from '@/lib/format';

export interface TrendPoint {
  t: string;
  value: number;
}

interface PortfolioTrendChartProps {
  points: TrendPoint[];
  scrubIndex: number | null;
  onScrub: (index: number | null) => void;
}

export function PortfolioTrendChart({ points, scrubIndex, onScrub }: PortfolioTrendChartProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const isGain = last >= first;
  const data = useMemo(() => points.map((p) => ({ name: formatTime(p.t), value: p.value })), [points]);

  const isScrubbing = scrubIndex !== null && points.length > 1;
  const clampedIndex = isScrubbing ? Math.min(scrubIndex!, points.length - 1) : null;
  const scrubbedPoint = clampedIndex !== null ? points[clampedIndex] : null;
  const displayValue = scrubbedPoint ? scrubbedPoint.value : last;

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const el = overlayRef.current;
      if (!el || points.length < 2) return null;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(ratio * (points.length - 1));
    },
    [points.length]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (points.length < 2) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const idx = indexFromClientX(e.clientX);
    if (idx !== null) onScrub(idx);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const clientX = e.clientX;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const idx = indexFromClientX(clientX);
      if (idx !== null) onScrub(idx);
    });
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (points.length < 2) return;
    const current = clampedIndex ?? points.length - 1;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onScrub(Math.max(0, current - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = current + 1;
      onScrub(next >= points.length - 1 ? null : next);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onScrub(0);
    } else if (e.key === 'End' || e.key === 'Escape') {
      e.preventDefault();
      onScrub(null);
    }
  };

  const handlePct = clampedIndex !== null && points.length > 1 ? (clampedIndex / (points.length - 1)) * 100 : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Live Portfolio Value</p>
          <p className="text-xs text-text-secondary">
            {isScrubbing ? 'Drag to scrub, or press Esc to return' : "Drag to rewind this session's refresh ticks"}
          </p>
        </div>
        {isScrubbing ? (
          <button
            type="button"
            onClick={() => onScrub(null)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent active:scale-95 transition-transform"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
            Viewing {scrubbedPoint ? formatTime(scrubbedPoint.t) : ''} · Return to live
          </button>
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gain" />
          </span>
        )}
      </div>

      <div className="relative h-64 mt-1">
        {data.length > 1 ? (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isGain ? 'var(--gain)' : 'var(--loss)'} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isGain ? 'var(--gain)' : 'var(--loss)'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin - 500', 'dataMax + 500']} hide />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isGain ? 'var(--gain)' : 'var(--loss)'}
                    strokeWidth={2.25}
                    fill="url(#trendGradient)"
                    isAnimationActive
                    animationDuration={400}
                    animationEasing="ease-out"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Dedicated interactive surface — owns 100% of the pointer/keyboard
                interaction instead of relying on it bubbling up through Recharts. */}
            <div
              ref={overlayRef}
              role="slider"
              tabIndex={0}
              aria-label="Scrub portfolio value history"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, points.length - 1)}
              aria-valuenow={clampedIndex ?? points.length - 1}
              aria-valuetext={scrubbedPoint ? `${formatINR(scrubbedPoint.value)} at ${formatTime(scrubbedPoint.t)}` : 'Live'}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md cursor-ew-resize touch-none"
            >
              {handlePct !== null && (
                <div aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-accent pointer-events-none" style={{ left: `${handlePct}%` }}>
                  <span className="absolute -top-1 -left-[5px] w-[11px] h-[11px] rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]" />
                </div>
              )}

              {scrubbedPoint && (
                <div
                  aria-hidden="true"
                  className="absolute -top-1 rounded-md border border-accent/40 bg-surface-raised px-2 py-1 pointer-events-none shadow-[var(--shadow-2)]"
                  style={{ left: `${handlePct}%`, transform: `translateX(${handlePct! > 70 ? '-100%' : handlePct! < 10 ? '0%' : '-50%'})` }}
                >
                  <p className="numeric-cell text-xs font-semibold whitespace-nowrap">{formatINR(scrubbedPoint.value)}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
            <p className="text-xs">Collecting live ticks…</p>
            <p className="numeric-cell text-sm font-medium text-text-primary">{formatINR(first || null)}</p>
          </div>
        )}
      </div>

      {isScrubbing && (
        <p className="mt-2 text-xs text-text-secondary numeric-cell">
          {formatINR(displayValue)} · tick {clampedIndex! + 1} of {points.length}
        </p>
      )}
    </div>
  );
}
