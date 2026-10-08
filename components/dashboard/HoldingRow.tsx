/**
 * CHANGED (brief items 2, 3, 6):
 * - Fixed a real bug: the Particulars cell had `group-hover:text-accent` but
 *   the row itself never had the `group` class, so that hover state could
 *   never fire — dead CSS. Added `group` and a chevron that fades in on
 *   hover/focus, so the row visibly invites the click-to-drill-down
 *   interaction instead of just silently being clickable.
 * - Added `active:bg-surface-hover/80` for an instant (<16ms, CSS-only) press
 *   state, ahead of the drawer actually opening.
 */
import { memo } from 'react';
import { motion } from 'motion/react';
import { formatINR, formatNumber } from '@/lib/format';
import type { EnrichedHolding } from '@/types/holding';
import { ChevronIcon } from '@/components/ui/icons';
import { TABLE_GRID_COLUMNS } from './gridTemplate';
import {
  CmpCell,
  EarningsCell,
  ExchangeBadge,
  GainLossCell,
  PeCell,
  PortfolioPctCell,
  PresentValueCell,
} from './cells';

interface HoldingRowProps {
  holding: EnrichedHolding;
  index: number;
  onSelect: (id: string) => void;
}

function HoldingRowImpl({ holding, index, onSelect }: HoldingRowProps) {
  return (
    <motion.div
      role="row"
      layout="position"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ delay: Math.min(index, 10) * 0.065, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ backgroundColor: 'var(--surface-hover)' }}
      onClick={() => onSelect(holding.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(holding.id);
        }
      }}
      tabIndex={0}
      aria-label={`${holding.particulars}, open details`}
      className="group grid items-center border-b border-border last:border-b-0 px-4 py-2.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset active:bg-surface-hover/80"
      style={{ gridTemplateColumns: TABLE_GRID_COLUMNS }}
    >
      <span role="rowheader" className="flex items-center gap-1 font-medium text-sm truncate pr-2 group-hover:text-accent transition-colors">
        <span className="truncate">{holding.particulars}</span>
        <ChevronIcon className="w-3 h-3 -rotate-90 shrink-0 text-accent opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150" />
      </span>
      <span role="cell" className="numeric-cell text-sm text-right whitespace-nowrap">
        {formatINR(holding.purchasePrice)}
      </span>
      <span role="cell" className="numeric-cell text-sm text-right whitespace-nowrap">
        {formatNumber(holding.qty)}
      </span>
      <span role="cell" className="numeric-cell text-sm text-right whitespace-nowrap">
        {formatINR(holding.investment)}
      </span>
      <span role="cell" className="text-right whitespace-nowrap">
        <span className="flex justify-end">
          <PortfolioPctCell holding={holding} />
        </span>
      </span>
      <span role="cell" className="whitespace-nowrap">
        <ExchangeBadge holding={holding} />
      </span>
      <span role="cell" className="text-right whitespace-nowrap">
        <span className="flex justify-end">
          <CmpCell holding={holding} />
        </span>
      </span>
      <span role="cell" className="text-right whitespace-nowrap">
        <span className="flex justify-end">
          <PresentValueCell holding={holding} />
        </span>
      </span>
      <span role="cell" className="text-right whitespace-nowrap">
        <span className="flex justify-end">
          <GainLossCell holding={holding} />
        </span>
      </span>
      <span role="cell" className="text-right whitespace-nowrap">
        <span className="flex justify-end">
          <PeCell holding={holding} />
        </span>
      </span>
      <span role="cell" className="whitespace-nowrap truncate pr-2">
        <EarningsCell holding={holding} />
      </span>
    </motion.div>
  );
}

function areEqual(prev: HoldingRowProps, next: HoldingRowProps): boolean {
  const a = prev.holding;
  const b = next.holding;
  return (
    a.quote.cmp === b.quote.cmp &&
    a.quote.isStale === b.quote.isStale &&
    a.presentValue === b.presentValue &&
    a.gainLoss === b.gainLoss &&
    a.portfolioPct === b.portfolioPct &&
    a.fundamentals.peRatio === b.fundamentals.peRatio &&
    a.fundamentals.latestEarnings === b.fundamentals.latestEarnings &&
    a.fundamentals.isSuspiciousDuplicate === b.fundamentals.isSuspiciousDuplicate &&
    prev.index === next.index &&
    prev.onSelect === next.onSelect
  );
}

export const HoldingRow = memo(HoldingRowImpl, areEqual);
