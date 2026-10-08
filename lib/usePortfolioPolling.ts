/**
 * CHANGED — added `isRefreshing`, held true for a minimum of 450ms per tick even
 * though the mock fetch itself resolves almost instantly. Without this, "speed"
 * was invisible: a refresh that takes 20ms gives the UI no chance to show that
 * anything happened before the numbers just change. This is what Header.tsx's
 * "Updating…" crossfade and the countdown-ring pulse key off (brief item 3).
 *
 * CHANGED again — `degradedSources` now tracks quotes (Yahoo) and
 * fundamentals (Google) independently instead of one shared array that only
 * the quotes poll ever wrote to. Fundamentals refresh on its own, far slower
 * cadence (see fetchFundamentals below), so a Google-side scrape failure
 * would otherwise never surface in the header's degraded-status badge at
 * all.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataSourceName, Fundamentals, FundamentalsResponse, Quote, QuotesResponse } from '@/types/holding';

const QUOTES_INTERVAL_MS = 15_000;
const MARKET_CLOSED_INTERVAL_MS = 60_000;
const MIN_REFRESH_VISIBLE_MS = 450;

function isMarketHoursIST(): boolean {
  const now = new Date();
  // IST = UTC+5:30, no DST.
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  const day = new Date(now.getTime() + 330 * 60_000).getUTCDay(); // 0 Sun .. 6 Sat
  const isWeekday = day >= 1 && day <= 5;
  const afterOpen = istMinutes >= 9 * 60 + 15;
  const beforeClose = istMinutes <= 15 * 60 + 30;
  return isWeekday && afterOpen && beforeClose;
}

export interface PortfolioPollingState {
  quotes: Quote[];
  fundamentals: Fundamentals[];
  lastRefreshedAt: string | null;
  isLoading: boolean;
  /** True from the moment a refresh starts until at least MIN_REFRESH_VISIBLE_MS later. */
  isRefreshing: boolean;
  error: string | null;
  degradedSources: DataSourceName[];
  marketOpen: boolean;
  intervalMs: number;
  refreshTick: number; // bumps on every successful quote fetch — key the countdown ring on this
}

export function usePortfolioPolling(): PortfolioPollingState {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [fundamentals, setFundamentals] = useState<Fundamentals[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotesDegraded, setQuotesDegraded] = useState<DataSourceName[]>([]);
  const [fundamentalsDegraded, setFundamentalsDegraded] = useState<DataSourceName[]>([]);
  const degradedSources = useMemo(
    () => [...quotesDegraded, ...fundamentalsDegraded],
    [quotesDegraded, fundamentalsDegraded]
  );
  const [marketOpen, setMarketOpen] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalRef = useRef(QUOTES_INTERVAL_MS);
  const refreshStartedAtRef = useRef(0);

  const fetchQuotes = useCallback(async () => {
    setIsRefreshing(true);
    refreshStartedAtRef.current = Date.now();
    try {
      const res = await fetch('/api/quotes');
      if (!res.ok) throw new Error(`quotes ${res.status}`);
      const data: QuotesResponse = await res.json();
      setQuotes(data.quotes);
      setQuotesDegraded(data.degradedSources);
      setLastRefreshedAt(new Date().toISOString());
      setError(null);
      setRefreshTick((t) => t + 1);
    } catch {
      setError("Can't reach the server — showing last known data.");
    } finally {
      setIsLoading(false);
      const elapsed = Date.now() - refreshStartedAtRef.current;
      const remaining = MIN_REFRESH_VISIBLE_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => setIsRefreshing(false), remaining);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  const fetchFundamentals = useCallback(async () => {
    try {
      const res = await fetch('/api/fundamentals');
      if (!res.ok) throw new Error(`fundamentals ${res.status}`);
      const data: FundamentalsResponse = await res.json();
      setFundamentals(data.fundamentals);
      setFundamentalsDegraded(data.degradedSources);
    } catch {
      // fundamentals are slow-moving; a failed fetch just keeps whatever is in state
    }
  }, []);

  useEffect(() => {
    fetchFundamentals();

    const start = () => {
      setMarketOpen(isMarketHoursIST());
      intervalRef.current = isMarketHoursIST() ? QUOTES_INTERVAL_MS : MARKET_CLOSED_INTERVAL_MS;
      fetchQuotes();
      timerRef.current = setInterval(() => {
        setMarketOpen(isMarketHoursIST());
        fetchQuotes();
      }, intervalRef.current);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        stop();
        start();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchQuotes, fetchFundamentals]);

  return {
    quotes,
    fundamentals,
    lastRefreshedAt,
    isLoading,
    isRefreshing,
    error,
    degradedSources,
    marketOpen,
    intervalMs: intervalRef.current,
    refreshTick,
  };
}
