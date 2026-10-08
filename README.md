# Dynamic Portfolio Dashboard

A sector-grouped, live-refreshing view of a 29-holding equity portfolio (26 active, 3 realized),
built with the Next.js App Router. Fetches real CMP from Yahoo Finance and real P/E ratio from
Google Finance (both unofficial, scraped sources — see `TECHNICAL_WRITEUP.md` /
`TECHNICAL_WRITEUP.pdf` for exactly how and where that breaks down), with automatic per-field
fallback to generated mock data when a source can't resolve a given holding.

**Live demo:** https://portfolio-dashboard-psi-lake.vercel.app
**Repo:** https://github.com/vignesh7026/portfolio-dashboard

## Tech stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · Motion (motion.dev) · Recharts ·
`@tanstack/react-table`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires outbound network access for live
data; see "Data mode" below for the offline fallback.

## Data mode

**Live by default.** `app/api/quotes/route.ts` fetches CMP from Yahoo Finance
(`lib/yahoo.ts`) and `app/api/fundamentals/route.ts` fetches P/E ratio from Google Finance
(`lib/google.ts`). Every holding that either source can't resolve falls back to the mock
generator (`lib/mock-data.ts`) for that field only — never a blank cell — and is tagged
`source: 'mock'` in the API response, shown as a dot next to the value in the UI (hover it to
see exactly where that number came from). Set `DATA_MODE=mock` in `.env.local` to force the
synthetic generator everywhere, for an offline or fast demo.

Fundamentals still include two of the PRD's seeded quirks regardless of data mode: Savani
Financials' and SBI Life's missing-P/E/negative-earnings cases are part of the mock seed data
itself (used whenever that holding falls back to mock), and the Clean Science/Deepak
Nitrite/Fine Organic/Gravita suspicious-duplicate P/E is mock-only by construction — it's a
demonstration of a scraping artifact, and is switched off once a real, distinct P/E comes back
from Google for those holdings.

See `TECHNICAL_WRITEUP.md` for the specific things found while building the live integration
(symbol-mapping mismatches, which Google Finance URL suffix actually renders the stats panel,
which two holdings have no Yahoo coverage at all, and why).

## Structure

```
app/
  page.tsx                 Server Component shell — reads data/holdings.json
  api/quotes/route.ts       GET — live CMP (Yahoo) for active holdings, TTL-cached
  api/fundamentals/route.ts GET — live P/E (Google) + earnings, TTL-cached
components/
  dashboard/                SummaryCards, charts, HoldingsTable, motion primitives
  ui/                       Badge, Tooltip, Skeleton, icons
lib/
  calculations.ts           Pure functions: investment, present value, gain/loss, grouping
  cache.ts                  Minimal TTL cache (soft/hard expiry)
  yahoo.ts                  Live CMP fetcher (Yahoo Finance chart endpoint)
  google.ts                 Live P/E scraper (Google Finance quote page)
  symbolMap.ts              Scrip-code -> ticker resolution for both of the above
  mock-data.ts              Deterministic-ish mock quote/fundamentals generator (fallback path)
  usePortfolioPolling.ts     15s client poll, Page Visibility pause/resume, error state
types/holding.ts             Shared data model
data/holdings.json           Seed: 26 active + 3 sold holdings across 6 sectors
```

## Known limitations

- "Latest Earnings" has no live path via either source — see `TECHNICAL_WRITEUP.md` §1 for why.
  Always mock, always tagged as such.
- Live data depends on outbound network access to `query1.finance.yahoo.com` and
  `www.google.com/finance` from wherever this runs; if that's blocked, every symbol falls back
  to mock automatically (same code path as a per-symbol failure) rather than erroring.
- No auth, single portfolio, no write access — matches the PRD's stated non-goals.
