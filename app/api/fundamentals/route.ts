/**
 * CHANGED — genuinely scrapes Google Finance for P/E ratio (lib/google.ts)
 * instead of only ever returning mock data. `DATA_MODE=mock` forces the
 * synthetic generator; any other value (or unset) attempts live data, same
 * convention as app/api/quotes/route.ts.
 *
 * "Latest Earnings" has no live path at all — Google Finance's Earnings tab
 * loads client-side and is never present in the HTML this fetch receives
 * (confirmed during development; see the comment in lib/google.ts). So it's
 * always sourced from the seed data, honestly tagged `earningsSource:
 * 'mock'` rather than silently presented as if it were live. The
 * suspicious-duplicate quirk (four holdings sharing an identical P/E) is
 * also mock-only by construction — it's a seeded demonstration of a
 * scraping artifact, not something that would reproduce against distinct
 * real P/E values, so it's switched off once a real P/E comes back.
 */
import { NextResponse } from 'next/server';
import holdings from '@/data/holdings.json';
import { getCached, setCached } from '@/lib/cache';
import { getMockFundamentals } from '@/lib/mock-data';
import { fetchGooglePERatios } from '@/lib/google';
import type { DataSourceName, Fundamentals, FundamentalsResponse, Holding } from '@/types/holding';

const DATA_MODE: 'live' | 'mock' = process.env.DATA_MODE === 'mock' ? 'mock' : 'live';

export async function GET() {
  const all = holdings as Holding[];
  const allIds = all.map((h) => h.id);

  const cacheKey = `fundamentals:${DATA_MODE}`;
  const cached = getCached<FundamentalsResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached.value);
  }

  const mockById = new Map(getMockFundamentals(allIds).map((f) => [f.holdingId, f]));
  let fundamentals: Fundamentals[];
  const degradedSources: DataSourceName[] = [];

  if (DATA_MODE === 'mock') {
    fundamentals = allIds.map((id) => mockById.get(id)!);
  } else {
    const outcomes = await fetchGooglePERatios(all);
    const outcomeById = new Map(outcomes.map((o) => [o.holdingId, o]));
    let anyScrapeFailed = false;

    fundamentals = allIds.map((id) => {
      const mock = mockById.get(id)!;
      const outcome = outcomeById.get(id);

      if (!outcome || outcome.error !== null) {
        anyScrapeFailed = true;
        return { ...mock, peSource: 'mock', earningsSource: 'mock' };
      }

      return {
        ...mock,
        peRatio: outcome.peRatio,
        isSuspiciousDuplicate: false,
        peSource: 'live',
        earningsSource: 'mock',
      };
    });

    if (anyScrapeFailed) degradedSources.push('google');
  }

  const payload: FundamentalsResponse = { fundamentals, degradedSources };
  setCached(cacheKey, payload, 4 * 60 * 60_000, 24 * 60 * 60_000);
  return NextResponse.json(payload);
}
