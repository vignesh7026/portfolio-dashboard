import type { Holding } from '@/types/holding';
import { toGoogleSymbol } from './symbolMap';

/**
 * NEW — real Google Finance P/E scraper. There is no Google Finance API;
 * Section 2 of the brief names this exact situation and asks for scraping
 * or an unofficial library. No maintained npm library does this reliably,
 * so this parses the public quote page's HTML directly.
 *
 * Two things found while building this, both worth knowing before touching
 * it:
 *
 *  1. The key-stats panel (P/E ratio, EPS, 52-week range, ...) renders as
 *     `<div class="SwQK7">P/E ratio</div><div class="dO6ijd">21.32</div>`
 *     label/value pairs — but only under the `:NSE` suffix for this
 *     portfolio's stocks (see lib/symbolMap.ts). This is undocumented,
 *     unstable markup with no semantic hooks — exactly the "may break due
 *     to site changes" risk Section 3 calls out. If Google ever renames
 *     these classes, every P/E lookup fails closed (falls back to mock,
 *     tagged as such) rather than silently returning wrong numbers.
 *
 *  2. "Latest Earnings" is NOT recoverable this way at all. Google Finance's
 *     Earnings tab is empty in the server-rendered HTML — its data loads
 *     via a separate client-side request this fetch never makes. There's no
 *     "try harder" fix for that without reverse-engineering an undocumented
 *     internal endpoint, which felt like the wrong side of the line for an
 *     unofficial source. So `latestEarnings` has no live path at all: it's
 *     always sourced from the seed data, and that's stated plainly via
 *     `earningsSource: 'mock'` rather than quietly implied to be live.
 */

const QUOTE_BASE = 'https://www.google.com/finance/quote';
const CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 7000;
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const STAT_PAIR_RE = /<div class="SwQK7">([^<]*)<\/div><div class="dO6ijd">([^<]*)<\/div>/g;

function parseStatPairs(html: string): Map<string, string> {
  const stats = new Map<string, string>();
  for (const match of html.matchAll(STAT_PAIR_RE)) {
    stats.set(match[1].trim(), match[2].trim());
  }
  return stats;
}

/** Google renders an em dash for "not applicable" metrics — same signal as our own #N/A treatment. */
function parsePeValue(raw: string | undefined): number | null {
  if (!raw || raw === '-' || raw === '—') return null;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function fetchOne(symbol: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${QUOTE_BASE}/${encodeURIComponent(symbol)}`, {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const stats = parseStatPairs(html);
    if (stats.size === 0) throw new Error('stats panel not found in response (markup likely changed)');
    return parsePeValue(stats.get('P/E ratio'));
  } finally {
    clearTimeout(timer);
  }
}

export interface GoogleFetchOutcome {
  holdingId: string;
  /** null here can mean two different things, distinguished by `error`:
   *  error === null  -> genuinely scraped, Google itself shows "—" (real #N/A)
   *  error !== null  -> the fetch/parse failed; caller should fall back */
  peRatio: number | null;
  error: string | null;
}

export async function fetchGooglePERatios(
  holdings: Pick<Holding, 'id' | 'exchange' | 'exchangeCodeRaw'>[]
): Promise<GoogleFetchOutcome[]> {
  const outcomes: GoogleFetchOutcome[] = [];

  for (let i = 0; i < holdings.length; i += CONCURRENCY) {
    const batch = holdings.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((h) => fetchOne(toGoogleSymbol(h))));

    settled.forEach((outcome, idx) => {
      const h = batch[idx];
      if (outcome.status === 'fulfilled') {
        outcomes.push({ holdingId: h.id, peRatio: outcome.value, error: null });
      } else {
        const reason = outcome.reason as Error | undefined;
        outcomes.push({ holdingId: h.id, peRatio: null, error: reason?.message ?? 'unknown error' });
      }
    });
  }

  return outcomes;
}
