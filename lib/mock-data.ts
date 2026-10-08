import type { Fundamentals, Quote } from '@/types/holding';

/**
 * CHANGED — only ~55% of holdings now move on any given tick (was: all 26, every
 * 15s, in lockstep). Real markets don't tick every instrument every second, and
 * flashing all 26 rows at once every refresh read as noise, not signal — exactly
 * the "animation runs on every tiny update" dead weight called out in this pass.
 * Rows that don't move this tick report the same cmp, so FlashHighlight correctly
 * stays silent for them instead of flashing on a non-change.
 *
 * Demo base prices. These are NOT real market data and do not reconcile to any
 * real portfolio total — they exist purely to drive a believable, visually lively
 * mock-mode dashboard (Section 4.8 of the PRD). Every quote built from these is
 * honestly tagged `source: 'mock'`.
 */
const BASE_CMP: Record<string, number> = {
  'hdfc-bank': 1702,
  'bajaj-finance': 7100,
  'icici-bank': 742,
  'bajaj-housing': 142,
  'savani-financials': 18,

  'affle-india': 1340,
  'lti-mindtree': 5120,
  'kpit-tech': 610,
  'tata-tech': 980,
  'bls-e-services': 275,
  tanla: 985,

  dmart: 4150,
  'tata-consumer': 915,
  pidilite: 2510,

  'tata-power': 258,
  'kpi-green': 760,
  suzlon: 62,
  gensol: 410,

  'hariom-pipes': 640,
  astral: 1610,
  polycab: 3120,

  'clean-science': 1750,
  'deepak-nitrite': 2100,
  'fine-organic': 4550,
  gravita: 2380,
  'sbi-life': 1140,
};

const SUSPICIOUS_DUPLICATE_IDS = ['clean-science', 'deepak-nitrite', 'fine-organic', 'gravita'];

const FUNDAMENTALS_SEED: Record<string, { peRatio: number | null; latestEarnings: string | null }> = {
  'hdfc-bank': { peRatio: 19.8, latestEarnings: 'Q2 FY26' },
  'bajaj-finance': { peRatio: 32.1, latestEarnings: 'Q2 FY26' },
  'icici-bank': { peRatio: 17.4, latestEarnings: 'Q2 FY26' },
  'bajaj-housing': { peRatio: 28.9, latestEarnings: 'Q2 FY26' },
  'savani-financials': { peRatio: null, latestEarnings: null },

  'affle-india': { peRatio: 42.6, latestEarnings: 'Q2 FY26' },
  'lti-mindtree': { peRatio: 24.3, latestEarnings: 'Q2 FY26' },
  'kpit-tech': { peRatio: 31.7, latestEarnings: 'Q2 FY26' },
  'tata-tech': { peRatio: 45.2, latestEarnings: 'Q2 FY26' },
  'bls-e-services': { peRatio: 22.8, latestEarnings: 'Q2 FY26' },
  tanla: { peRatio: 19.1, latestEarnings: 'Q2 FY26' },

  dmart: { peRatio: 68.4, latestEarnings: 'Q2 FY26' },
  'tata-consumer': { peRatio: 29.5, latestEarnings: 'Q2 FY26' },
  pidilite: { peRatio: 52.3, latestEarnings: 'Q2 FY26' },

  'tata-power': { peRatio: 21.6, latestEarnings: 'Q2 FY26' },
  'kpi-green': { peRatio: 33.9, latestEarnings: 'Q2 FY26' },
  suzlon: { peRatio: 48.7, latestEarnings: 'Q2 FY26' },
  gensol: { peRatio: 12.4, latestEarnings: 'Q2 FY26' },

  'hariom-pipes': { peRatio: 26.5, latestEarnings: 'Q2 FY26' },
  astral: { peRatio: 54.1, latestEarnings: 'Q2 FY26' },
  polycab: { peRatio: 37.8, latestEarnings: 'Q2 FY26' },

  // Suspicious-duplicate quartet — identical P/E and earnings on purpose (Section 12.2)
  'clean-science': { peRatio: 38.4, latestEarnings: 'Q2 FY26' },
  'deepak-nitrite': { peRatio: 38.4, latestEarnings: 'Q2 FY26' },
  'fine-organic': { peRatio: 38.4, latestEarnings: 'Q2 FY26' },
  gravita: { peRatio: 38.4, latestEarnings: 'Q2 FY26' },

  // #N/A P/E + negative earnings quirk (Section 12.3)
  'sbi-life': { peRatio: null, latestEarnings: '₹-18.20 Cr (Q2 FY26)' },
};

/** Module-level so the simulated "live" price persists and random-walks across polls. */
const liveState = new Map<string, number>();
const historyState = new Map<string, number[]>();
const HISTORY_CAP = 30;

function seededJitter(id: string, tick: number): number {
  // Deterministic-ish pseudo-random walk so repeated requests feel alive, not chaotic.
  const seed = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + tick;
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

let tickCounter = 0;

export function getMockQuotes(holdingIds: string[]): Quote[] {
  tickCounter += 1;
  const asOf = new Date().toISOString();

  return holdingIds.map((id) => {
    const base = BASE_CMP[id];
    if (base === undefined) {
      return { holdingId: id, cmp: null, asOf, isStale: false, source: 'mock' as const };
    }
    const current = liveState.get(id) ?? base;
    const movesThisTick = seededJitter(id, tickCounter * 7 + 3) < 0.55;
    const rand = seededJitter(id, tickCounter);
    const direction = rand > 0.5 ? 1 : -1;
    const magnitude = (rand * 0.006) * current; // up to ~0.6% move per tick
    const next = movesThisTick ? Math.max(0.5, current + direction * magnitude) : current;
    const rounded = Math.round(next * 100) / 100;
    liveState.set(id, next);

    const history = historyState.get(id) ?? Array.from({ length: 12 }, (_, i) => {
      // backfill a believable pre-history so the very first sparkline isn't a flat dot
      const backSeed = seededJitter(id, i - 40);
      return Math.round((base * (0.985 + backSeed * 0.03)) * 100) / 100;
    });
    history.push(rounded);
    if (history.length > HISTORY_CAP) history.shift();
    historyState.set(id, history);

    return {
      holdingId: id,
      cmp: rounded,
      asOf,
      isStale: false,
      source: 'mock' as const,
      history: [...history],
    };
  });
}

export function getMockFundamentals(holdingIds: string[]): Fundamentals[] {
  const asOf = new Date().toISOString();
  return holdingIds.map((id) => {
    const seed = FUNDAMENTALS_SEED[id] ?? { peRatio: null, latestEarnings: null };
    return {
      holdingId: id,
      peRatio: seed.peRatio,
      latestEarnings: seed.latestEarnings,
      isSuspiciousDuplicate: SUSPICIOUS_DUPLICATE_IDS.includes(id),
      asOf,
      peSource: 'mock',
      earningsSource: 'mock',
    };
  });
}
