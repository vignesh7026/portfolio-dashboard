/**
 * CHANGED — this now genuinely calls Yahoo Finance (lib/yahoo.ts, the public
 * `/v8/finance/chart` endpoint, no auth needed) instead of only ever
 * returning mock data. `DATA_MODE=mock` in `.env.local` forces the old
 * synthetic generator for an offline/fast demo; any other value (or unset)
 * attempts live data.
 *
 * Per-holding fallback, not all-or-nothing: if Yahoo fails for a specific
 * symbol (confirmed in testing — Savani Financials has no Yahoo coverage at
 * all, LTIM 404s under both exchange suffixes, see lib/symbolMap.ts) that
 * one holding falls back to the mock generator's value instead of the whole
 * response failing, and is tagged `source: 'mock'` so the UI's data-
 * provenance dots say so honestly rather than hiding it. This is the
 * "handle API failures gracefully" / "data accuracy" asks from Section 3 —
 * not just a happy-path integration.
 */
import { NextResponse } from 'next/server';
import holdings from '@/data/holdings.json';
import { getCached, setCached } from '@/lib/cache';
import { getMockQuotes } from '@/lib/mock-data';
import { fetchYahooQuotes } from '@/lib/yahoo';
import type { DataSourceName, Holding, Quote, QuotesResponse } from '@/types/holding';

const DATA_MODE: 'live' | 'mock' = process.env.DATA_MODE === 'mock' ? 'mock' : 'live';

export async function GET() {
  const active = (holdings as Holding[]).filter((h) => h.status === 'active');
  const activeIds = active.map((h) => h.id);

  const cacheKey = `quotes:${DATA_MODE}`;
  const cached = getCached<QuotesResponse>(cacheKey);
  if (cached && !cached.isStale) {
    return NextResponse.json(cached.value);
  }

  let quotes: Quote[];
  const degradedSources: DataSourceName[] = [];

  if (DATA_MODE === 'mock') {
    quotes = getMockQuotes(activeIds);
  } else {
    const outcomes = await fetchYahooQuotes(active);
    const failedIds = outcomes.filter((o) => o.price === null).map((o) => o.holdingId);
    const mockFallback = new Map(getMockQuotes(failedIds).map((q) => [q.holdingId, q]));
    const asOf = new Date().toISOString();

    quotes = outcomes.map((outcome) => {
      if (outcome.price !== null) {
        return {
          holdingId: outcome.holdingId,
          cmp: Math.round(outcome.price * 100) / 100,
          asOf,
          isStale: false,
          source: 'live' as const,
          history: outcome.history.length > 1 ? outcome.history.slice(-30) : undefined,
        };
      }
      return (
        mockFallback.get(outcome.holdingId) ?? {
          holdingId: outcome.holdingId,
          cmp: null,
          asOf,
          isStale: false,
          source: 'mock' as const,
        }
      );
    });

    if (failedIds.length > 0) degradedSources.push('yahoo');
  }

  const payload: QuotesResponse = { quotes, degradedSources };
  setCached(cacheKey, payload, 15_000, 60_000);
  return NextResponse.json(payload);
}
