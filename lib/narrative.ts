/**
 * NEW FILE — data storytelling (brief item 4).
 * One deterministic, rule-based sentence computed from the real sector totals —
 * not an LLM call, not decoration. Recomputed on every tick via useMemo in
 * Dashboard.tsx so it tracks the live data, never a hardcoded string.
 */
import type { PortfolioSummary, SectorGroup } from '@/types/holding';

export function buildNarrative(sectorGroups: SectorGroup[], summary: PortfolioSummary): string {
  const withPct = sectorGroups.filter((g) => g.totalGainLossPct !== null);
  if (withPct.length === 0) return 'Waiting on the first live snapshot…';

  const best = withPct.reduce((a, b) => ((b.totalGainLossPct ?? -Infinity) > (a.totalGainLossPct ?? -Infinity) ? b : a));
  const worst = withPct.reduce((a, b) => ((b.totalGainLossPct ?? Infinity) < (a.totalGainLossPct ?? Infinity) ? b : a));
  const losers = withPct.filter((g) => (g.totalGainLossPct ?? 0) < 0);
  const gainers = withPct.filter((g) => (g.totalGainLossPct ?? 0) >= 0);
  const totalPct = summary.totalGainLossPct ?? 0;

  // A single standout laggard while most of the book gains — the most actionable read.
  if (losers.length === 1 && gainers.length >= 3) {
    return `${losers[0].sector} is your biggest laggard this session, down ${Math.abs(losers[0].totalGainLossPct ?? 0).toFixed(1)}% while the rest of your portfolio gains.`;
  }

  // One sector meaningfully outrunning the overall portfolio return.
  if ((best.totalGainLossPct ?? 0) > 0 && (best.totalGainLossPct ?? 0) >= totalPct + 2) {
    return `Your ${best.sector} sector is carrying the portfolio this session, up ${(best.totalGainLossPct ?? 0).toFixed(1)}%.`;
  }

  // Majority of sectors red and the portfolio itself is down — name the worst offender.
  if (losers.length >= Math.ceil(withPct.length / 2) && totalPct < 0) {
    return `${worst.sector} is leading the pullback, down ${Math.abs(worst.totalGainLossPct ?? 0).toFixed(1)}%, as more than half your sectors slip.`;
  }

  // Fallback: a broad-strokes read, still computed from real counts.
  return totalPct >= 0
    ? `Broad-based gains — ${gainers.length} of ${withPct.length} sectors are in the green.`
    : `A mixed session — ${gainers.length} of ${withPct.length} sectors are still holding gains.`;
}
