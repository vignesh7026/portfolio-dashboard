/**
 * CHANGED (brief item 6 — cohesion audit): this section sits at the same
 * visual level as HoldingsTable (both direct children of the page's main
 * stack) but used `rounded-md` while HoldingsTable uses `rounded-xl` — a
 * corner-radius mismatch between two sibling cards, exactly the kind of
 * inconsistency this pass was asked to find. Also fixed the same stray
 * easing curve as SectorTableGroup/SectorCardGroup, and added
 * `active:scale-[0.99]` to the toggle.
 */
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { formatINR, formatNumber, formatPct } from '@/lib/format';
import type { Holding } from '@/types/holding';
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon } from '@/components/ui/icons';

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

interface RealizedHoldingsProps {
  holdings: Holding[];
}

export function RealizedHoldings({ holdings }: RealizedHoldingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sold = holdings.filter((h) => h.status === 'sold');
  if (sold.length === 0) return null;

  const rows = sold.map((h) => {
    const investment = h.purchasePrice * h.qty;
    const realized = ((h.soldPrice ?? 0) - h.purchasePrice) * h.qty;
    const pct = investment !== 0 ? (realized / investment) * 100 : null;
    return { ...h, investment, realized, pct };
  });
  const totalRealized = rows.reduce((sum, r) => sum + r.realized, 0);

  return (
    <section className="rounded-xl border border-border bg-surface shadow-[var(--shadow-1)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-hover active:scale-[0.99] transition-all duration-100 text-left"
      >
        <span className="flex items-center gap-2">
          <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.3, ease: EASE_SETTLE }} className="text-text-secondary">
            <ChevronIcon className="w-4 h-4 -rotate-90" />
          </motion.span>
          <span className="font-semibold text-sm">Realized</span>
          <span className="text-xs text-text-secondary">
            {sold.length} sold position{sold.length > 1 ? 's' : ''} · excluded from live totals
          </span>
        </span>
        <span className={`numeric-cell text-sm font-semibold ${totalRealized >= 0 ? 'text-gain' : 'text-loss'}`}>
          {totalRealized >= 0 ? '+' : ''}
          {formatINR(totalRealized)}
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
            <div className="overflow-x-auto themed-scroll">
              <table className="w-full text-sm border-t border-border">
                <thead>
                  <tr className="border-b border-border bg-surface-hover/50">
                    <th scope="col" className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Particulars
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Purchase Price
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Sold Price
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Qty
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Realized Gain/Loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors duration-100">
                      <th scope="row" className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                        {r.particulars}
                      </th>
                      <td className="px-3 py-2.5 text-right numeric-cell whitespace-nowrap">{formatINR(r.purchasePrice)}</td>
                      <td className="px-3 py-2.5 text-right numeric-cell whitespace-nowrap">{formatINR(r.soldPrice ?? null)}</td>
                      <td className="px-3 py-2.5 text-right numeric-cell whitespace-nowrap">{formatNumber(r.qty)}</td>
                      <td className={`px-3 py-2.5 text-right numeric-cell font-medium whitespace-nowrap ${r.realized >= 0 ? 'text-gain' : 'text-loss'}`}>
                        <span className="inline-flex items-center gap-1">
                          {r.realized >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
                          {formatINR(Math.abs(r.realized))}
                          <span className="opacity-75 text-xs">({formatPct(r.pct)})</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
