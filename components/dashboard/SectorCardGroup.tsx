/**
 * CHANGED (brief item 6 — cohesion audit): chevron rotation and accordion
 * height both used an unspecified/stray easing instead of this project's one
 * entrance curve (EASE_SETTLE), the mobile counterpart of the same bug fixed
 * in SectorTableGroup.tsx. Also added `active:scale-[0.99]` to the toggle
 * (brief item 3).
 */
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { formatINR, formatPct } from '@/lib/format';
import type { EnrichedHolding, SectorGroup } from '@/types/holding';
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon } from '@/components/ui/icons';
import { HoldingCard } from './HoldingCard';

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

interface SectorCardGroupProps {
  group: SectorGroup;
  visibleHoldings: EnrichedHolding[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectHolding: (id: string) => void;
}

export function SectorCardGroup({ group, visibleHoldings, isOpen, onToggle, onSelectHolding }: SectorCardGroupProps) {
  const isGain = (group.totalGainLoss ?? 0) >= 0;

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-3 bg-surface-hover/60 hover:bg-surface-hover active:scale-[0.99] transition-all duration-100 text-left"
      >
        <span className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.3, ease: EASE_SETTLE }}
            className="text-text-secondary"
          >
            <ChevronIcon className="w-4 h-4 -rotate-90" />
          </motion.span>
          <span className="font-semibold text-sm">{group.sector}</span>
          <span className="text-xs text-text-secondary">({group.holdings.length})</span>
        </span>
        <span className={`inline-flex items-center gap-1 numeric-cell text-xs font-semibold ${isGain ? 'text-gain' : 'text-loss'}`}>
          {isGain ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {formatINR(Math.abs(group.totalGainLoss ?? 0))}
          <span className="opacity-75 font-normal">({formatPct(group.totalGainLossPct)})</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_SETTLE }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-3 grid gap-2.5 bg-bg">
              {visibleHoldings.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-4">No holdings match the current filter.</p>
              ) : (
                visibleHoldings.map((holding, i) => (
                  <HoldingCard key={holding.id} holding={holding} index={i} onSelect={onSelectHolding} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
