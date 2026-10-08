import type { EnrichedHolding, SectorGroup } from '@/types/holding';

export interface PortfolioHealth {
  score: number | null;
  diversification: number;
  concentration: number;
  volatility: number;
  topHolding: { name: string; pct: number } | null;
  sectorCount: number;
}

/**
 * NEW — a single composite 0-100 "health" score, blending three signals that
 * no existing view (hero card, allocation pie, table) surfaces on its own:
 *
 *  - Diversification: 1 − HHI (Herfindahl-Hirschman Index) of sector
 *    investment shares. One sector owning everything → HHI 1 → score 0.
 *  - Concentration: 100 − the single largest holding's share of total
 *    investment (a stock-level check, independent of sector spread — a
 *    portfolio can be sector-diverse yet still be 40% one stock).
 *  - Volatility: 100 − the investment-weighted average coefficient of
 *    variation (stdev/mean, as a %) of each holding's recent price history
 *    (`quote.history`), scaled so this mock feed's typical ~0.5–2% tick-to-
 *    tick movement lands in a usable 0–100 band instead of pinning near 100.
 *
 * None of this is specified anywhere — "portfolio health" isn't a defined
 * metric in the PRD — so the three weights (35/35/30) and the volatility
 * scale factor (18) are judgment calls, flagged per instruction rather than
 * picked silently.
 */
export function computePortfolioHealth(sectorGroups: SectorGroup[], active: EnrichedHolding[]): PortfolioHealth {
  const totalInvestment = sectorGroups.reduce((sum, g) => sum + g.totalInvestment, 0);

  if (totalInvestment <= 0 || active.length === 0) {
    return { score: null, diversification: 0, concentration: 0, volatility: 0, topHolding: null, sectorCount: 0 };
  }

  const hhi = sectorGroups.reduce((sum, g) => sum + (g.totalInvestment / totalInvestment) ** 2, 0);
  const diversification = Math.max(0, Math.min(100, (1 - hhi) * 100));

  let topHolding: { name: string; pct: number } | null = null;
  for (const h of active) {
    const pct = (h.investment / totalInvestment) * 100;
    if (!topHolding || pct > topHolding.pct) topHolding = { name: h.particulars, pct };
  }
  const concentration = Math.max(0, Math.min(100, 100 - (topHolding?.pct ?? 0)));

  let weightedCv = 0;
  let weightTotal = 0;
  for (const h of active) {
    const history = h.quote.history;
    if (!history || history.length < 2) continue;
    const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
    if (mean <= 0) continue;
    const variance = history.reduce((sum, v) => sum + (v - mean) ** 2, 0) / history.length;
    const cv = (Math.sqrt(variance) / mean) * 100;
    weightedCv += cv * h.investment;
    weightTotal += h.investment;
  }
  const avgCv = weightTotal > 0 ? weightedCv / weightTotal : 0;
  const volatility = Math.max(0, Math.min(100, 100 - avgCv * 18));

  const score = diversification * 0.35 + concentration * 0.35 + volatility * 0.3;

  return { score, diversification, concentration, volatility, topHolding, sectorCount: sectorGroups.length };
}
