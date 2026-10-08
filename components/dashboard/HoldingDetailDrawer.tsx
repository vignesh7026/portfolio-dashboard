/**
 * CHANGED (brief item 2) — this is the one signature interaction, so it got the
 * obsessive pass instead of five smaller ones elsewhere:
 * - Content inside the panel now reveals in a quick stagger (price block, then
 *   the purchase-vs-current bars, then the stat grid, then earnings) instead of
 *   all snapping in at once the moment the panel starts sliding — the panel and
 *   its contents now read as one choreographed beat, not a slide plus a dump.
 * - Backdrop blur now ramps in (0 → 2px) alongside its opacity instead of
 *   appearing at full blur instantly, which reads as more deliberate.
 * - Fixed a stray easing curve on the purchase/current bars — they were using
 *   an old curve from an earlier pass instead of this project's one entrance
 *   curve (EASE_SETTLE), a real cohesion bug (brief item 6).
 * - Close button and backdrop both get instant `active:` tap feedback.
 */
'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR, formatPct } from '@/lib/format';
import type { EnrichedHolding } from '@/types/holding';
import { ArrowDownIcon, ArrowUpIcon } from '@/components/ui/icons';
import { AnimatedNumber } from './AnimatedNumber';
import { ChartTooltip } from './ChartTooltip';
import { EarningsCell, PeCell } from './cells';

interface HoldingDetailDrawerProps {
  holding: EnrichedHolding | null;
  onClose: () => void;
}

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;
const CONTENT_STAGGER = 0.07;

export function HoldingDetailDrawer({ holding, onClose }: HoldingDetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!holding) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [holding, onClose]);

  const isGain = (holding?.gainLoss ?? 0) >= 0;
  const chartData = holding?.quote.history?.map((v, i) => ({ i, value: v })) ?? [];
  const purchasePrice = holding?.purchasePrice ?? 0;
  const cmp = holding?.quote.cmp ?? 0;
  const barMax = Math.max(purchasePrice, cmp, 1) * 1.08;

  const reveal = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: 0.1 + i * CONTENT_STAGGER, ease: EASE_SETTLE },
  });

  return (
    <AnimatePresence>
      {holding && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(2px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.25, ease: EASE_SETTLE }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 active:bg-black/60"
            aria-hidden="true"
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="holding-drawer-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 38, mass: 0.9 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface-raised border-l border-border shadow-[var(--shadow-2)] overflow-y-auto themed-scroll"
          >
            <div className="sticky top-0 bg-surface-raised/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-start justify-between gap-3 z-10">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-secondary">{holding.sector}</p>
                <h2 id="holding-drawer-title" className="text-lg font-semibold mt-0.5">
                  {holding.particulars}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5 numeric-cell">
                  {holding.exchange} · {holding.exchangeCodeRaw}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="rounded-full w-8 h-8 inline-flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary active:scale-90 transition-all duration-100 shrink-0"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              <motion.div {...reveal(0)}>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-text-secondary">Current Price</p>
                    <AnimatedNumber
                      value={holding.quote.cmp}
                      format={formatINR}
                      className="numeric-cell text-3xl font-semibold"
                    />
                  </div>
                  {holding.gainLoss !== null && (
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold numeric-cell mb-1 ${isGain ? 'text-gain' : 'text-loss'}`}>
                      {isGain ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      {formatPct(holding.gainLossPct)}
                    </span>
                  )}
                </div>

                <div className="h-32 -mx-2 mt-2">
                  {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="drawerGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isGain ? 'var(--gain)' : 'var(--loss)'} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={isGain ? 'var(--gain)' : 'var(--loss)'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="i" hide />
                        <YAxis domain={['dataMin', 'dataMax']} hide />
                        <Tooltip content={<ChartTooltip />} formatter={() => null} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={isGain ? 'var(--gain)' : 'var(--loss)'}
                          strokeWidth={2}
                          fill="url(#drawerGradient)"
                          isAnimationActive
                          animationDuration={600}
                          animationEasing="ease-out"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-text-secondary">
                      Collecting live price history…
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div {...reveal(1)}>
                <p className="text-[11px] uppercase tracking-wide text-text-secondary mb-2">Purchase vs. Current</p>
                <div className="space-y-2">
                  <PriceBar label="Purchase" value={purchasePrice} max={barMax} tone="neutral" />
                  <PriceBar label="Current" value={cmp} max={barMax} tone={isGain ? 'gain' : 'loss'} />
                </div>
              </motion.div>

              <motion.div {...reveal(2)} className="grid grid-cols-2 gap-3">
                <Stat label="Investment" value={formatINR(holding.investment)} />
                <Stat label="Present Value" value={formatINR(holding.presentValue)} />
                <Stat
                  label="Gain / Loss"
                  value={`${isGain ? '+' : ''}${formatINR(holding.gainLoss)}`}
                  tone={holding.gainLoss === null ? undefined : isGain ? 'gain' : 'loss'}
                />
                <Stat label="Portfolio %" value={holding.portfolioPct !== null ? `${holding.portfolioPct.toFixed(2)}%` : '—'} />
                <Stat label="Qty" value={String(holding.qty)} />
                <Stat label="P/E Ratio" value={<PeCell holding={holding} />} />
              </motion.div>

              <motion.div {...reveal(3)}>
                <p className="text-[11px] uppercase tracking-wide text-text-secondary mb-1.5">Latest Earnings</p>
                <EarningsCell holding={holding} />
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PriceBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'neutral' | 'gain' | 'loss' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = tone === 'gain' ? 'var(--gain)' : tone === 'loss' ? 'var(--loss)' : 'var(--text-secondary)';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="numeric-cell font-medium">{formatINR(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: EASE_SETTLE }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'gain' | 'loss' }) {
  return (
    <div className="rounded-md border border-border bg-bg p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-text-secondary mb-0.5">{label}</p>
      <p className={`numeric-cell text-sm font-semibold ${tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : ''}`}>
        {value}
      </p>
    </div>
  );
}
