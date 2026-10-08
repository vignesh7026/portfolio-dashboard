/**
 * CHANGED (brief item 6 — cohesion audit): this file had two stray easing
 * curves left over from earlier passes — the chevron rotation used
 * [0.4,0,0.2,1] (Material "standard") and the accordion height used
 * [0.2,0,0,1] (an older "emphasized" curve) — neither is the one entrance
 * curve (EASE_SETTLE, [0.16,1,0.3,1]) used everywhere else in the project.
 * Both now use it. Also added `active:scale-[0.99]` to the toggle button for
 * instant press feedback (brief item 3).
 */
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { formatINR, formatPct } from '@/lib/format';
import type { EnrichedHolding, SectorGroup } from '@/types/holding';
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon } from '@/components/ui/icons';
import { HoldingRow } from './HoldingRow';

interface SectorTableGroupProps {
  group: SectorGroup;
  visibleHoldings: EnrichedHolding[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectHolding: (id: string) => void;
}

const SECTOR_ACCENTS: Record<string, string> = {
  Financial: '#5B8DF0',
  Tech: '#8B7FD6',
  Consumer: '#D6A94F',
  Power: '#4FAE84',
  Pipe: '#C77DAD',
  Others: '#8A8D93',
};

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

export function SectorTableGroup({ group, visibleHoldings, isOpen, onToggle, onSelectHolding }: SectorTableGroupProps) {
  const isGain = (group.totalGainLoss ?? 0) >= 0;
  const accent = SECTOR_ACCENTS[group.sector] ?? '#64748B';

  return (
    <div role="rowgroup" className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-4 py-2.5 bg-surface-hover/50 hover:bg-surface-hover active:bg-surface-hover text-left transition-colors duration-150 relative overflow-hidden group active:scale-[0.99]"
      >
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-200"
          style={{ background: accent }}
        />
        <span className="flex items-center gap-2 min-w-0 pl-1.5">
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.3, ease: EASE_SETTLE }}
            className="text-text-secondary shrink-0"
          >
            <ChevronIcon className="w-4 h-4 -rotate-90" />
          </motion.span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
          <span className="font-semibold text-sm truncate">{group.sector}</span>
          <span className="text-xs text-text-secondary shrink-0">
            ({visibleHoldings.length}
            {visibleHoldings.length !== group.holdings.length ? ` of ${group.holdings.length}` : ''})
          </span>
        </span>

        <span className="flex items-center gap-4 sm:gap-6 text-xs shrink-0">
          <span className="hidden md:inline-flex flex-col items-end">
            <span className="text-text-secondary text-[10px] uppercase tracking-wide">Investment</span>
            <span className="numeric-cell font-medium">{formatINR(group.totalInvestment)}</span>
          </span>
          <span className="hidden sm:inline-flex flex-col items-end">
            <span className="text-text-secondary text-[10px] uppercase tracking-wide">Present Value</span>
            <span className="numeric-cell font-medium">{formatINR(group.totalPresentValue)}</span>
          </span>
          <span className={`inline-flex flex-col items-end ${isGain ? 'text-gain' : 'text-loss'}`}>
            <span className="text-text-secondary text-[10px] uppercase tracking-wide">Gain/Loss</span>
            <span className="inline-flex items-center gap-1 numeric-cell font-semibold">
              {isGain ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {formatINR(Math.abs(group.totalGainLoss ?? 0))}
              <span className="opacity-75 font-normal">({formatPct(group.totalGainLossPct)})</span>
            </span>
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.35, ease: EASE_SETTLE }, opacity: { duration: 0.2 } }}
            style={{ overflow: 'hidden' }}
          >
            {visibleHoldings.length === 0 ? (
              <p className="px-4 py-6 text-xs text-text-secondary text-center">No holdings match the current filter.</p>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {visibleHoldings.map((holding, i) => (
                  <HoldingRow key={holding.id} holding={holding} index={i} onSelect={onSelectHolding} />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
