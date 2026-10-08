import type {
  DataSourceName,
  EnrichedHolding,
  Fundamentals,
  Holding,
  PortfolioSummary,
  Quote,
  Sector,
  SectorGroup,
} from '@/types/holding';

export function calculateInvestment(holding: Pick<Holding, 'purchasePrice' | 'qty'>): number {
  return holding.purchasePrice * holding.qty;
}

export function calculatePresentValue(cmp: number | null, qty: number): number | null {
  if (cmp === null) return null;
  return cmp * qty;
}

export function calculateGainLoss(presentValue: number | null, investment: number): number | null {
  if (presentValue === null) return null;
  return presentValue - investment;
}

export function calculateGainLossPct(gainLoss: number | null, investment: number): number | null {
  if (gainLoss === null || investment === 0) return null;
  return (gainLoss / investment) * 100;
}

const SECTOR_ORDER: Sector[] = ['Financial', 'Tech', 'Consumer', 'Power', 'Pipe', 'Others'];

/** Joins static holdings with live quotes + fundamentals into render-ready rows. */
export function enrichHoldings(
  holdings: Holding[],
  quotes: Quote[],
  fundamentals: Fundamentals[]
): EnrichedHolding[] {
  const quoteById = new Map(quotes.map((q) => [q.holdingId, q]));
  const fundamentalsById = new Map(fundamentals.map((f) => [f.holdingId, f]));

  const active = holdings.filter((h) => h.status === 'active');
  const totalActiveInvestment = active.reduce((sum, h) => sum + calculateInvestment(h), 0);

  return holdings.map((holding) => {
    const investment = calculateInvestment(holding);
    const quote: Quote = quoteById.get(holding.id) ?? {
      holdingId: holding.id,
      cmp: null,
      asOf: new Date().toISOString(),
      isStale: false,
      source: 'mock',
    };
    const fundamentalsEntry: Fundamentals = fundamentalsById.get(holding.id) ?? {
      holdingId: holding.id,
      peRatio: null,
      latestEarnings: null,
      isSuspiciousDuplicate: false,
      peSource: 'mock',
      earningsSource: 'mock',
      asOf: new Date().toISOString(),
    };
    const presentValue = calculatePresentValue(quote.cmp, holding.qty);
    const gainLoss = calculateGainLoss(presentValue, investment);
    const gainLossPct = calculateGainLossPct(gainLoss, investment);
    const portfolioPct =
      holding.status === 'active' && totalActiveInvestment > 0
        ? (investment / totalActiveInvestment) * 100
        : null;

    return {
      ...holding,
      quote,
      fundamentals: fundamentalsEntry,
      investment,
      presentValue,
      gainLoss,
      gainLossPct,
      portfolioPct,
    };
  });
}

/**
 * Rolls up one sector's holdings into its subtotal row. Exported (not just
 * used by groupBySector below) so the Position Map treemap can re-derive the
 * same subtotals for a *filtered* holdings list (search/gainers/losers)
 * without duplicating this math.
 */
export function summarizeSector(sector: Sector, holdings: EnrichedHolding[]): SectorGroup {
  const totalInvestment = holdings.reduce((sum, h) => sum + h.investment, 0);
  const anyMissing = holdings.some((h) => h.presentValue === null);
  const totalPresentValue = anyMissing
    ? holdings.reduce((sum, h) => sum + (h.presentValue ?? 0), 0)
    : holdings.reduce((sum, h) => sum + (h.presentValue as number), 0);
  const totalGainLoss = totalPresentValue - totalInvestment;
  const totalGainLossPct = totalInvestment !== 0 ? (totalGainLoss / totalInvestment) * 100 : null;

  return {
    sector,
    holdings,
    totalInvestment,
    totalPresentValue,
    totalGainLoss,
    totalGainLossPct,
  };
}

/** Groups active holdings by sector with subtotals. Sold holdings never enter a group. */
export function groupBySector(enriched: EnrichedHolding[]): SectorGroup[] {
  const active = enriched.filter((h) => h.status === 'active');
  const bySector = new Map<Sector, EnrichedHolding[]>();
  for (const h of active) {
    const list = bySector.get(h.sector) ?? [];
    list.push(h);
    bySector.set(h.sector, list);
  }

  return SECTOR_ORDER.filter((s) => bySector.has(s)).map((sector) => summarizeSector(sector, bySector.get(sector)!));
}

export function calculatePortfolioTotals(holdings: Holding[] | EnrichedHolding[]): {
  totalInvestment: number;
  bySector: Record<string, { totalInvestment: number; holdings: (Holding | EnrichedHolding)[] }>;
} {
  const active = holdings.filter((h) => h.status === 'active');
  const bySector: Record<string, { totalInvestment: number; holdings: (Holding | EnrichedHolding)[] }> = {};
  for (const h of active) {
    if (!bySector[h.sector]) bySector[h.sector] = { totalInvestment: 0, holdings: [] };
    bySector[h.sector].totalInvestment += calculateInvestment(h);
    bySector[h.sector].holdings.push(h);
  }
  const totalInvestment = active.reduce((sum, h) => sum + calculateInvestment(h), 0);
  return { totalInvestment, bySector };
}

export type SortDirection = 'asc' | 'desc';

/**
 * CHANGED — this used to back a hand-rolled `sortHoldings()` (removed).
 * HoldingsTable.tsx now sorts via `@tanstack/react-table`'s own sorted row
 * model — the library the PRD recommends for table display and that was
 * previously installed but never actually used anywhere. This function is
 * the one piece of that still worth keeping as our own: it's the per-column
 * comparator value (nulls sort as -Infinity so missing data drops to one
 * end instead of throwing off numeric comparisons), passed to react-table
 * as each column's `accessorFn`.
 */
export function sortableValue(h: EnrichedHolding, key: string): number | string {
  switch (key) {
    case 'particulars':
      return h.particulars.toLowerCase();
    case 'purchasePrice':
      return h.purchasePrice;
    case 'qty':
      return h.qty;
    case 'investment':
      return h.investment;
    case 'portfolioPct':
      return h.portfolioPct ?? -Infinity;
    case 'cmp':
      return h.quote.cmp ?? -Infinity;
    case 'presentValue':
      return h.presentValue ?? -Infinity;
    case 'gainLoss':
      return h.gainLoss ?? -Infinity;
    case 'peRatio':
      return h.fundamentals.peRatio ?? -Infinity;
    default:
      return 0;
  }
}

export function filterHoldings(
  holdings: EnrichedHolding[],
  search: string,
  mode: 'all' | 'gainers' | 'losers'
): EnrichedHolding[] {
  const query = search.trim().toLowerCase();
  return holdings.filter((h) => {
    if (query && !h.particulars.toLowerCase().includes(query) && !h.exchangeCodeRaw.toLowerCase().includes(query)) {
      return false;
    }
    if (mode === 'gainers') return (h.gainLoss ?? 0) > 0;
    if (mode === 'losers') return (h.gainLoss ?? 0) < 0;
    return true;
  });
}

export function buildPortfolioSummary(
  sectorGroups: SectorGroup[],
  degradedSources: DataSourceName[]
): PortfolioSummary {
  const totalInvestment = sectorGroups.reduce((sum, g) => sum + g.totalInvestment, 0);
  const anyMissing = sectorGroups.some((g) => g.totalPresentValue === null);
  const totalPresentValue = anyMissing
    ? null
    : sectorGroups.reduce((sum, g) => sum + (g.totalPresentValue as number), 0);
  const totalGainLoss = totalPresentValue === null ? null : totalPresentValue - totalInvestment;
  const totalGainLossPct =
    totalGainLoss === null || totalInvestment === 0 ? null : (totalGainLoss / totalInvestment) * 100;

  return {
    totalInvestment,
    totalPresentValue,
    totalGainLoss,
    totalGainLossPct,
    lastRefreshedAt: new Date().toISOString(),
    degradedSources,
  };
}
