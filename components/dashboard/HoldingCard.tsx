import { memo } from 'react';
import { motion } from 'motion/react';
import { formatINR, formatNumber } from '@/lib/format';
import type { EnrichedHolding } from '@/types/holding';
import { CmpCell, EarningsCell, GainLossCell, PeCell, PortfolioPctCell, PresentValueCell } from './cells';

interface HoldingCardProps {
  holding: EnrichedHolding;
  index: number;
  onSelect: (id: string) => void;
}

function HoldingCardImpl({ holding, index, onSelect }: HoldingCardProps) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay: Math.min(index, 10) * 0.065, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onSelect(holding.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(holding.id);
        }
      }}
      className="rounded-md border border-border bg-surface p-3.5 shadow-[var(--shadow-1)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{holding.particulars}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {holding.exchange} · {holding.exchangeCodeRaw}
          </p>
        </div>
        <div className="text-right">
          <GainLossCell holding={holding} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
        <Field label="CMP">
          <CmpCell holding={holding} />
        </Field>
        <Field label="Present Value">
          <PresentValueCell holding={holding} />
        </Field>
        <Field label="Investment">
          <span className="numeric-cell">{formatINR(holding.investment)}</span>
        </Field>
        <Field label="Qty">
          <span className="numeric-cell">{formatNumber(holding.qty)}</span>
        </Field>
        <Field label="Portfolio %">
          <PortfolioPctCell holding={holding} />
        </Field>
        <Field label="P/E Ratio">
          <PeCell holding={holding} />
        </Field>
        <Field label="Latest Earnings" full>
          <EarningsCell holding={holding} />
        </Field>
      </div>
    </motion.div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-text-secondary text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
      {children}
    </div>
  );
}

function areEqual(prev: HoldingCardProps, next: HoldingCardProps): boolean {
  const a = prev.holding;
  const b = next.holding;
  return (
    a.quote.cmp === b.quote.cmp &&
    a.presentValue === b.presentValue &&
    a.gainLoss === b.gainLoss &&
    a.fundamentals.peRatio === b.fundamentals.peRatio &&
    a.fundamentals.latestEarnings === b.fundamentals.latestEarnings &&
    prev.index === next.index &&
    prev.onSelect === next.onSelect
  );
}

export const HoldingCard = memo(HoldingCardImpl, areEqual);
