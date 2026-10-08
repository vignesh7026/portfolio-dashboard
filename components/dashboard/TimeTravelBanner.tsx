/**
 * NEW — shown whenever Dashboard.tsx is scrubbed to a past tick. The scrub
 * handle lives inside the trend chart card, but its effect ripples through
 * the hero number, the narrative line, the sector table and the allocation
 * chart — easy to miss that you're not looking at "now" anymore. This
 * banner makes that unambiguous everywhere else on the page, consistent
 * with this project's running principle of never showing a number without
 * being honest about what it actually is.
 */
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { formatTime } from '@/lib/format';

interface TimeTravelBannerProps {
  timestamp: string | null;
  tickLabel: string;
  onReturnToLive: () => void;
}

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

export function TimeTravelBanner({ timestamp, tickLabel, onReturnToLive }: TimeTravelBannerProps) {
  return (
    <AnimatePresence initial={false}>
      {timestamp && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3, ease: EASE_SETTLE }}
          style={{ overflow: 'hidden' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2.5">
            <p className="text-sm text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              Viewing a past snapshot from <span className="numeric-cell font-medium">{formatTime(timestamp)}</span>
              <span className="text-text-secondary">({tickLabel}) — every number below reflects that moment, not right now.</span>
            </p>
            <button
              type="button"
              onClick={onReturnToLive}
              className="shrink-0 rounded-md bg-accent text-bg text-xs font-semibold px-3 py-1.5 active:scale-95 transition-transform"
            >
              Return to live
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
