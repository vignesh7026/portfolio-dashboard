/**
 * CHANGED (brief items 1, 7):
 * - The hero number now actually counts up from 0 on first load (`countUpOnMount`),
 *   instead of appearing instantly — this is the dashboard's opening beat.
 * - Cut the standalone "Total Gain / Loss" card. It said exactly what the hero's
 *   own subtitle now says, one card over — a number repeating a number that's
 *   already on screen. That fact now lives as the hero's one-line summary
 *   instead, computed live, never hardcoded (brief item 1's example line).
 * - Added `active:scale-[0.98]` to both cards — instant (<16ms, CSS-only, no
 *   JS round-trip) tactile feedback on tap, per brief item 3.
 *
 * CHANGED again — added the Portfolio Health gauge as a third card. Grid is
 * now a 4-column track (hero spans 2, Session Change and Health each span 1)
 * instead of the old 3-column/2-card layout, so the hero still reads as
 * unambiguously dominant through proportion (half the row) while leaving
 * room for the new card without cramming a 3rd thing into what was a
 * 2-slot grid.
 */
'use client';

import { motion } from 'motion/react';
import { formatINR, formatPct } from '@/lib/format';
import type { PortfolioSummary } from '@/types/holding';
import type { PortfolioHealth } from '@/lib/health';
import { ArrowDownIcon, ArrowUpIcon } from '@/components/ui/icons';
import { AnimatedNumber } from './AnimatedNumber';
import { TiltCard } from './TiltCard';
import { PortfolioHealthGauge } from './PortfolioHealthGauge';

interface SummaryCardsProps {
  summary: PortfolioSummary;
  /** Change since this browser tab started polling — see note in Dashboard.tsx. */
  sessionChange: number | null;
  sessionChangePct: number | null;
  health: PortfolioHealth;
}

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

export function SummaryCards({ summary, sessionChange, sessionChangePct, health }: SummaryCardsProps) {
  const isGain = (summary.totalGainLoss ?? 0) >= 0;
  const sessionIsGain = (sessionChange ?? 0) >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_SETTLE }}
        className="glow-border sm:col-span-2"
      >
        <TiltCard glow="var(--accent)" className="rounded-[20px] bg-surface p-6 h-full active:scale-[0.995] transition-transform duration-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Total Portfolio Value
          </p>
          <div className="mt-3 numeric-display text-4xl sm:text-5xl font-medium text-text-primary">
            <AnimatedNumber value={summary.totalPresentValue} format={formatINR} countUpOnMount />
          </div>
          <p className={`mt-3 text-sm font-medium numeric-cell flex items-center gap-1.5 ${isGain ? 'text-gain' : 'text-loss'}`}>
            {isGain ? <ArrowUpIcon className="w-3.5 h-3.5" /> : <ArrowDownIcon className="w-3.5 h-3.5" />}
            {formatINR(summary.totalGainLoss !== null ? Math.abs(summary.totalGainLoss) : null)}
            <span className="opacity-75 font-normal">({formatPct(summary.totalGainLossPct)}) overall</span>
          </p>
        </TiltCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.07, ease: EASE_SETTLE }}
      >
        <TiltCard
          glow={sessionIsGain ? 'var(--gain)' : 'var(--loss)'}
          className="group relative rounded-xl border border-border bg-surface p-5 h-full overflow-hidden active:scale-[0.98] transition-transform duration-100"
        >
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-[2px]"
            style={{ background: sessionIsGain ? 'var(--gain)' : 'var(--loss)' }}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Session Change</p>
          {sessionChange === null ? (
            <p className="mt-2.5 text-sm text-text-tertiary">Watching for the first move…</p>
          ) : (
            <>
              <div className={`mt-2.5 text-2xl font-medium numeric-cell flex items-center gap-1.5 ${sessionIsGain ? 'text-gain' : 'text-loss'}`}>
                {sessionIsGain ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                <AnimatedNumber value={Math.abs(sessionChange)} format={formatINR} />
              </div>
              <p className="mt-1.5 text-xs text-text-secondary numeric-cell">{formatPct(sessionChangePct)} since this tab opened</p>
            </>
          )}
        </TiltCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.14, ease: EASE_SETTLE }}
      >
        <PortfolioHealthGauge health={health} />
      </motion.div>
    </div>
  );
}
