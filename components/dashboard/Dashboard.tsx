/**
 * CHANGED — wires up the two new features:
 * - Time travel: alongside `trend` (aggregate value per tick), now keeps a
 *   `quotesHistory` snapshot of the full `quotes` array at the same tick,
 *   in lockstep (same push, same cap, same index). When `scrubIndex` is
 *   set, the whole pipeline (enrichHoldings → groupBySector →
 *   buildPortfolioSummary → narrative) runs on `quotesHistory[scrubIndex]`
 *   instead of live `quotes` — every downstream component is already a
 *   pure function of that data, so nothing else needed to change to make
 *   the whole dashboard "rewind."
 * - Command palette: search/filter/sort state that used to live inside
 *   HoldingsTable is lifted up here so ⌘K can drive it. Added scroll refs
 *   for the palette's "Go to…" commands.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { buildPortfolioSummary, enrichHoldings, groupBySector, type SortDirection } from '@/lib/calculations';
import { formatINR, formatPct } from '@/lib/format';
import { buildNarrative } from '@/lib/narrative';
import { computePortfolioHealth } from '@/lib/health';
import { usePortfolioPolling } from '@/lib/usePortfolioPolling';
import type { Holding, Quote } from '@/types/holding';
import type { FilterMode, SortKey } from './gridTemplate';
import { Header } from './Header';
import { Footer } from './Footer';
import { SummaryCards } from './SummaryCards';
import { AllocationChart } from './AllocationChart';
import { PortfolioTrendChart, type TrendPoint } from './PortfolioTrendChart';
import { TimeTravelBanner } from './TimeTravelBanner';
import { HoldingsTable } from './HoldingsTable';
import { RealizedHoldings } from './RealizedHoldings';
import { TableSkeleton } from './TableSkeleton';
import { HoldingDetailDrawer } from './HoldingDetailDrawer';

interface DashboardProps {
  holdings: Holding[];
}

const MAX_TREND_POINTS = 40;
const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

export function Dashboard({ holdings }: DashboardProps) {
  const {
    quotes,
    fundamentals,
    lastRefreshedAt,
    isLoading,
    isRefreshing,
    error,
    degradedSources,
    marketOpen,
    intervalMs,
    refreshTick,
  } = usePortfolioPolling();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [quotesHistory, setQuotesHistory] = useState<Quote[][]>([]);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const lastTickRef = useRef(0);

  // Table toolbar state, lifted so the command palette can drive it too.
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const tableRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const realizedRef = useRef<HTMLDivElement>(null);

  const displayQuotes = scrubIndex !== null && quotesHistory[scrubIndex] ? quotesHistory[scrubIndex] : quotes;

  const enriched = useMemo(() => enrichHoldings(holdings, displayQuotes, fundamentals), [holdings, displayQuotes, fundamentals]);
  const sectorGroups = useMemo(() => groupBySector(enriched), [enriched]);
  const summary = useMemo(() => buildPortfolioSummary(sectorGroups, degradedSources), [sectorGroups, degradedSources]);
  const selectedHolding = useMemo(() => enriched.find((h) => h.id === selectedId) ?? null, [enriched, selectedId]);
  const narrative = useMemo(() => buildNarrative(sectorGroups, summary), [sectorGroups, summary]);
  // Derives from `sectorGroups`, which is already a function of (possibly
  // scrubbed) `displayQuotes` — so the health score rewinds with everything
  // else during time travel instead of staying pinned to the live value.
  const health = useMemo(
    () => computePortfolioHealth(sectorGroups, sectorGroups.flatMap((g) => g.holdings)),
    [sectorGroups]
  );
  // Reflects what's actually flowing this tick, not configured intent — stays
  // honest even with DATA_MODE=live if every symbol happens to be falling back.
  const dataModeLabel = quotes.some((q) => q.source === 'live') ? 'Live Data' : 'Mock Data';

  // Trend/quotesHistory must always reflect LIVE data, computed separately from
  // `summary` (which can be a scrubbed view) — otherwise rewinding the dashboard
  // would corrupt the very timeline you're rewinding through.
  const liveSummary = useMemo(() => {
    const liveEnriched = enrichHoldings(holdings, quotes, fundamentals);
    return buildPortfolioSummary(groupBySector(liveEnriched), degradedSources);
  }, [holdings, quotes, fundamentals, degradedSources]);

  useEffect(() => {
    if (refreshTick === lastTickRef.current || liveSummary.totalPresentValue === null) return;
    lastTickRef.current = refreshTick;
    setQuotesHistory((prev) => {
      const next = [...prev, quotes];
      return next.length > MAX_TREND_POINTS ? next.slice(next.length - MAX_TREND_POINTS) : next;
    });
    setTrend((prev) => {
      const next = [...prev, { t: liveSummary.lastRefreshedAt, value: liveSummary.totalPresentValue as number }];
      return next.length > MAX_TREND_POINTS ? next.slice(next.length - MAX_TREND_POINTS) : next;
    });
  }, [refreshTick, liveSummary.totalPresentValue, liveSummary.lastRefreshedAt, quotes]);

  // "Session change" — tracks value since this tab started polling, from the live trend only.
  const sessionChange = trend.length > 1 ? trend[trend.length - 1].value - trend[0].value : null;
  const sessionChangePct = sessionChange !== null && trend[0].value !== 0 ? (sessionChange / trend[0].value) * 100 : null;

  const liveRegionText =
    summary.totalGainLoss !== null
      ? `Portfolio updated: total gain/loss ${formatINR(summary.totalGainLoss)}, ${formatPct(summary.totalGainLossPct)}.`
      : 'Portfolio loading.';

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
      <span aria-live="polite" className="sr-only">
        {liveRegionText}
      </span>

      <Header
        lastRefreshedAt={lastRefreshedAt}
        intervalMs={intervalMs}
        refreshTick={refreshTick}
        marketOpen={marketOpen}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        degradedSources={degradedSources}
        dataModeLabel={dataModeLabel}
        commandPaletteProps={{
          holdings: enriched,
          onSelectHolding: setSelectedId,
          filterMode,
          onFilterModeChange: setFilterMode,
          sortKey,
          sortDir,
          onSort: handleSort,
          canRewind: trend.length > 1,
          isScrubbing: scrubIndex !== null,
          onRewindToStart: () => setScrubIndex(0),
          onReturnToLive: () => setScrubIndex(null),
          sectionRefs: { table: tableRef, charts: chartsRef, realized: realizedRef },
        }}
      />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-5">
          <TimeTravelBanner
            timestamp={scrubIndex !== null ? trend[scrubIndex]?.t ?? null : null}
            tickLabel={scrubIndex !== null ? `tick ${scrubIndex + 1} of ${trend.length}` : ''}
            onReturnToLive={() => setScrubIndex(null)}
          />

          <SummaryCards summary={summary} sessionChange={sessionChange} sessionChangePct={sessionChangePct} health={health} />

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: EASE_SETTLE }}
            className="flex items-center gap-2 text-sm text-text-secondary px-1"
          >
            <span className="w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden="true" />
            {narrative}
          </motion.p>

          <motion.div
            ref={chartsRef}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28, ease: EASE_SETTLE }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <PortfolioTrendChart points={trend} scrubIndex={scrubIndex} onScrub={setScrubIndex} />
            <AllocationChart sectorGroups={sectorGroups} />
          </motion.div>

          <motion.div
            ref={tableRef}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: EASE_SETTLE }}
          >
            <HoldingsTable
              sectorGroups={sectorGroups}
              onSelectHolding={setSelectedId}
              search={search}
              onSearchChange={setSearch}
              filterMode={filterMode}
              onFilterModeChange={setFilterMode}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </motion.div>

          <motion.div
            ref={realizedRef}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: EASE_SETTLE }}
          >
            <RealizedHoldings holdings={holdings} />
          </motion.div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: EASE_SETTLE }}
      >
        <Footer />
      </motion.div>

      <HoldingDetailDrawer holding={selectedHolding} onClose={() => setSelectedId(null)} />

      <AnimatePresence>
        {error && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-border bg-surface-raised px-4 py-2.5 text-sm shadow-[var(--shadow-2)] z-50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
