import type { Exchange, Holding } from '@/types/holding';

/**
 * NEW — this file exists because of a real data mismatch, not a hypothetical
 * one. `data/holdings.json` records every BSE holding by its numeric scrip
 * code (e.g. "532174" for ICICI Bank) — exactly how a real brokerage/Zerodha
 * export represents them. Neither Yahoo Finance's `/v8/finance/chart`
 * endpoint nor Google Finance's quote page resolves a scrip code directly:
 * confirmed empirically, `532174.BO` 404s on Yahoo while `ICICIBANK.BO`
 * resolves fine. So every BSE-coded holding needs its real ticker symbol
 * looked up once, here, rather than re-deriving it from the scrip code at
 * request time.
 *
 * Each mapping below was resolved via Yahoo's `/v1/finance/search` endpoint
 * (by company name) and confirmed against `/v8/finance/chart` during
 * development — not guessed. Two holdings are deliberately absent:
 * `savani-financials` (zero results from Yahoo's search under any name
 * variant tried — it appears to have no Yahoo coverage at all, plausibly
 * because it's a very thinly-traded micro-cap) and `lti-mindtree` (both
 * `LTIM.NS` and `LTIM.BO` 404 on the chart endpoint, and the symbol doesn't
 * resolve via search either, despite LTIMindtree being a large, liquid
 * stock — unclear why, but reproducible). Both fall through to the mock
 * fallback path in lib/yahoo.ts / lib/google.ts and are surfaced as such via
 * the per-field data-provenance dots, rather than silently guessing a ticker
 * that might be wrong for a live financial number.
 */
const TICKER_OVERRIDE: Record<string, string> = {
  'icici-bank': 'ICICIBANK',
  'bajaj-housing': 'BAJAJHFL',
  'kpit-tech': 'KPITTECH',
  'tata-tech': 'TATATECH',
  'bls-e-services': 'BLSE',
  tanla: 'TANLA',
  'tata-consumer': 'TATACONSUM',
  pidilite: 'PIDILITIND',
  'tata-power': 'TATAPOWER',
  'kpi-green': 'KPIGREEN',
  suzlon: 'SUZLON',
  gensol: 'GENSOL',
  'hariom-pipes': 'HARIOMPIPE',
  polycab: 'POLYCAB',
  'clean-science': 'CLEAN',
  'deepak-nitrite': 'DEEPAKNTR',
  'fine-organic': 'FINEORG',
  gravita: 'GRAVITA',
  'sbi-life': 'SBILIFE',

  // Sold holdings — fundamentals are still fetched for these (the
  // fundamentals route runs over every holding, not just active ones), so
  // they need tickers too even though they never need a live CMP.
  infy: 'INFY',
  'happiest-minds': 'HAPPSTMNDS',
  easemytrip: 'EASEMYTRIP',
};

function resolveTicker(h: Pick<Holding, 'id' | 'exchangeCodeRaw'>): string {
  return TICKER_OVERRIDE[h.id] ?? h.exchangeCodeRaw;
}

const YAHOO_SUFFIX: Record<Exchange, string> = { NSE: '.NS', BSE: '.BO' };

export function toYahooSymbol(h: Pick<Holding, 'id' | 'exchange' | 'exchangeCodeRaw'>): string {
  const ticker = h.exchange === 'NSE' ? h.exchangeCodeRaw : resolveTicker(h);
  return `${ticker}${YAHOO_SUFFIX[h.exchange]}`;
}

/**
 * Google Finance quote pages only reliably server-render the key-stats panel
 * (P/E ratio, EPS, ...) under the `:NSE` suffix for this portfolio's stocks —
 * confirmed empirically: `ICICIBANK:BOM` returns a full ~1.1MB page with
 * zero instances of the stats panel's markup, while `ICICIBANK:NSE` renders
 * it every time tested. So every lookup goes through `:NSE`, even for
 * holdings whose exchange in our data is BSE — all of them are in fact
 * dual-listed, which is what makes this substitution valid rather than just
 * convenient.
 */
export function toGoogleSymbol(h: Pick<Holding, 'id' | 'exchange' | 'exchangeCodeRaw'>): string {
  const ticker = h.exchange === 'NSE' ? h.exchangeCodeRaw : resolveTicker(h);
  return `${ticker}:NSE`;
}
