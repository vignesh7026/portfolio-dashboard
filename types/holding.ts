export type Sector = 'Financial' | 'Tech' | 'Consumer' | 'Power' | 'Pipe' | 'Others';
export type Exchange = 'NSE' | 'BSE';
export type HoldingStatus = 'active' | 'sold';

/** NEW — where one field's current value actually came from, surfaced per-field
 * in the UI (data-provenance dots) instead of a single page-wide "live/mock"
 * assumption. 'cache' is reserved for a future short-TTL cache hit; the cache
 * layer currently caches whole responses rather than individual fields. */
export type DataSource = 'live' | 'cache' | 'mock';
export type DataSourceName = 'yahoo' | 'google';

/** What the investor owns. Static — only changes on a real buy/sell. */
export interface Holding {
  id: string;
  particulars: string;
  sector: Sector;
  exchangeCodeRaw: string;
  exchange: Exchange;
  purchasePrice: number;
  qty: number;
  status: HoldingStatus;
  soldPrice?: number;
}

/** What the market says right now. Refreshed every 15s. */
export interface Quote {
  holdingId: string;
  cmp: number | null;
  asOf: string;
  isStale: boolean;
  source: DataSource;
  /** Recent price history (oldest → newest), capped server-side. Powers sparklines. */
  history?: number[];
}

/**
 * Slower-moving fundamentals. `peSource`/`earningsSource` are tracked
 * independently because, in live mode, they genuinely come from different
 * places with different reliability: P/E is a real Google Finance scrape
 * that can succeed or fail per-stock, while Latest Earnings has no live path
 * at all (see lib/google.ts) and is always 'mock'.
 */
export interface Fundamentals {
  holdingId: string;
  peRatio: number | null;
  latestEarnings: string | null;
  isSuspiciousDuplicate: boolean;
  asOf: string;
  peSource: DataSource;
  earningsSource: DataSource;
}

/** One row of the rendered table — everything a row needs, pre-joined. */
export interface EnrichedHolding extends Holding {
  quote: Quote;
  fundamentals: Fundamentals;
  investment: number;
  presentValue: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  portfolioPct: number | null;
}

export interface SectorGroup {
  sector: Sector;
  holdings: EnrichedHolding[];
  totalInvestment: number;
  totalPresentValue: number | null;
  totalGainLoss: number | null;
  totalGainLossPct: number | null;
}

export interface PortfolioSummary {
  totalInvestment: number;
  totalPresentValue: number | null;
  totalGainLoss: number | null;
  totalGainLossPct: number | null;
  lastRefreshedAt: string;
  degradedSources: DataSourceName[];
}

export interface QuotesResponse {
  quotes: Quote[];
  degradedSources: DataSourceName[];
}

export interface FundamentalsResponse {
  fundamentals: Fundamentals[];
  degradedSources: DataSourceName[];
}
