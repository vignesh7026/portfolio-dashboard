/**
 * CHANGED (brief items 3, 5, plus the new command palette):
 * - The status line now names the actual sources ("Yahoo Finance & Google
 *   Finance") instead of a bare "Live" word — transparency about where the
 *   data comes from is now part of the primary UI, not something you only
 *   find by reading the footer in small print.
 * - Wrapped the status line in a Tooltip carrying the fuller honesty note
 *   (unofficial/undocumented endpoints, may be delayed) — present on hover
 *   or keyboard focus, not permanently on screen as a warning banner, and
 *   not hidden either. Footer.tsx's long paragraph was cut because this
 *   replaces it; see that file's comment.
 * - Added an `isRefreshing` crossfade: "Live" briefly becomes "Updating…"
 *   on every tick (held visible for a guaranteed minimum — see
 *   usePortfolioPolling.ts) so a refresh is never a silent swap.
 * - Renders the ⌘K command palette trigger in the button cluster — this is
 *   the component that actually owns Dashboard.tsx's lifted toolbar/scrub
 *   state, Header just forwards the props through to it.
 */
'use client';

import type { ComponentProps } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { formatTimeAgo } from '@/lib/format';
import { Tooltip } from '@/components/ui/Tooltip';
import type { DataSourceName } from '@/types/holding';
import { CommandPalette } from './CommandPalette';
import { RefreshCountdown } from './RefreshCountdown';

type CommandPaletteProps = ComponentProps<typeof CommandPalette>;

interface HeaderProps {
  lastRefreshedAt: string | null;
  intervalMs: number;
  refreshTick: number;
  marketOpen: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  degradedSources: DataSourceName[];
  /** "Live Data" once at least one holding's CMP actually came from Yahoo this
   * tick, else "Mock Data" — computed from real quote sources in Dashboard.tsx
   * rather than from configured intent, so it stays honest even if DATA_MODE=live
   * but every symbol happens to be falling back. */
  dataModeLabel: string;
  commandPaletteProps: CommandPaletteProps;
}

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

export function Header({
  lastRefreshedAt,
  intervalMs,
  refreshTick,
  marketOpen,
  isLoading,
  isRefreshing,
  degradedSources,
  dataModeLabel,
  commandPaletteProps,
}: HeaderProps) {
  const healthy = degradedSources.length === 0;
  const statusLabel = isRefreshing ? 'Updating' : healthy ? 'Live' : 'Degraded';

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_SETTLE }}
      className="flex flex-wrap items-center justify-between gap-4 py-7"
    >
      <div className="flex items-baseline gap-3">
        <span className="numeric-display text-lg sm:text-xl font-medium tracking-tight text-text-primary">
          Dynamic Portfolio
        </span>
        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-accent" aria-hidden="true" />
        <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
          {dataModeLabel}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <Tooltip
          side="bottom"
          label="Yahoo Finance and Google Finance are unofficial, undocumented sources — prices here can be delayed, cached, or unavailable per holding. Hover the dot next to any price or P/E to see exactly where that number came from."
        >
          <div className="text-right hidden md:block cursor-help">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary flex items-center justify-end gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                {healthy && !isRefreshing && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-60" />
                )}
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5 transition-colors duration-200"
                  style={{ background: isRefreshing ? 'var(--accent)' : healthy ? 'var(--gain)' : 'var(--stale)' }}
                />
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={statusLabel}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  {statusLabel}
                </motion.span>
              </AnimatePresence>
              <span className="normal-case tracking-normal text-text-tertiary/70">· Yahoo &amp; Google Finance</span>
            </p>
            <p className="text-xs text-text-secondary numeric-cell">
              {lastRefreshedAt ? `updated ${formatTimeAgo(lastRefreshedAt)}` : isLoading ? 'connecting…' : 'never'}
              {!marketOpen && ' · market closed'}
            </p>
          </div>
        </Tooltip>

        <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface/80 pl-3 pr-1 py-1">
          <span className="text-[11px] text-text-secondary numeric-cell">{marketOpen ? '15s' : '60s'}</span>
          <RefreshCountdown refreshTick={refreshTick} intervalMs={intervalMs} />
        </div>

        <CommandPalette {...commandPaletteProps} />
      </div>
    </motion.header>
  );
}
