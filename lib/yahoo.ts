import type { Holding } from '@/types/holding';
import { toYahooSymbol } from './symbolMap';

/**
 * NEW — real Yahoo Finance CMP fetcher, replacing the mock-only data path.
 *
 * Deliberately built on the plain `/v8/finance/chart` endpoint via raw
 * `fetch`, not the `yahoo-finance2` npm package. During development,
 * `yahoo-finance2`'s `quote()`/`quoteSummary()` calls go through an
 * authenticated path (a cookie + crumb handshake against
 * `finance.yahoo.com`) that started returning `429 Too Many Requests` after
 * only a handful of calls. The chart endpoint used here needs no auth at
 * all and held up fine under the same testing — so it's both simpler and
 * more reliable for this use case. (It also conveniently returns a recent
 * daily-close history in the same response, which doubles as sparkline
 * data without a second request.)
 */

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 6000;

interface ChartApiResponse {
  chart: {
    result: [
      {
        meta: { regularMarketPrice?: number };
        indicators: { quote: [{ close?: (number | null)[] }] };
      },
    ] | null;
    error: { description: string } | null;
  };
}

async function fetchOne(symbol: string): Promise<{ price: number; history: number[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${CHART_BASE}/${encodeURIComponent(symbol)}?range=1mo&interval=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioDashboard/1.0)' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json: ChartApiResponse = await res.json();
    const result = json.chart.result?.[0];
    if (!result) throw new Error(json.chart.error?.description ?? 'empty chart result');

    const price = result.meta.regularMarketPrice;
    if (typeof price !== 'number') throw new Error('no regularMarketPrice in response');

    const history = (result.indicators.quote[0]?.close ?? []).filter(
      (v): v is number => typeof v === 'number'
    );
    return { price, history };
  } finally {
    clearTimeout(timer);
  }
}

export interface YahooFetchOutcome {
  holdingId: string;
  price: number | null;
  history: number[];
  error: string | null;
}

/**
 * Section 3 ("Rate Limiting"): fires at most CONCURRENCY requests at once
 * rather than all N in parallel. This is an unofficial endpoint with no
 * published rate-limit contract, so batching is a courtesy, not a
 * documented requirement — Promise.allSettled means one bad symbol
 * (unlisted, delisted, typo'd ticker) never takes the rest of the batch
 * down with it.
 */
export async function fetchYahooQuotes(holdings: Holding[]): Promise<YahooFetchOutcome[]> {
  const outcomes: YahooFetchOutcome[] = [];

  for (let i = 0; i < holdings.length; i += CONCURRENCY) {
    const batch = holdings.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((h) => fetchOne(toYahooSymbol(h))));

    settled.forEach((outcome, idx) => {
      const h = batch[idx];
      if (outcome.status === 'fulfilled') {
        outcomes.push({ holdingId: h.id, price: outcome.value.price, history: outcome.value.history, error: null });
      } else {
        const reason = outcome.reason as Error | undefined;
        outcomes.push({ holdingId: h.id, price: null, history: [], error: reason?.message ?? 'unknown error' });
      }
    });
  }

  return outcomes;
}
