import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { ArrowDownIcon, ArrowUpIcon, ClockIcon, InfoIcon, WarningIcon } from '@/components/ui/icons';
import { formatINR, formatPct, formatTimeAgo } from '@/lib/format';
import type { DataSource, EnrichedHolding } from '@/types/holding';
import { AnimatedNumber } from './AnimatedNumber';
import { FlashHighlight } from './FlashHighlight';
import { Sparkline } from './Sparkline';

/** Em dash + "data unavailable" badge — never a silent 0 or blank (Section 4.6 / 12). */
export function Unavailable({ reason }: { reason: string }) {
  return (
    <Tooltip label={reason}>
      <span className="inline-flex items-center gap-1 text-text-secondary numeric-cell">
        <span aria-hidden="true">—</span>
        <InfoIcon className="w-3 h-3 opacity-70" />
      </span>
    </Tooltip>
  );
}

/**
 * NEW — per-field data provenance. In live mode, Yahoo succeeds for most
 * holdings but not all (two confirmed gaps — see lib/symbolMap.ts), and
 * Google's P/E scrape can fail independently per-stock; "Latest Earnings"
 * is *always* mock (lib/google.ts has no live path for it at all). A single
 * page-wide "Live" badge would flatten all of that into one claim that's
 * sometimes just wrong for a given cell. This dot answers "is THIS number
 * real right now" at the one place it's actually being read.
 */
const SOURCE_LABEL: Record<DataSource, string> = {
  live: 'Live — fetched from the source just now.',
  cache: 'Cached — reused within the current refresh window.',
  mock: 'Mock fallback — the live source was unavailable for this field.',
};

const SOURCE_DOT_CLASS: Record<DataSource, string> = {
  live: 'bg-gain',
  cache: 'bg-accent',
  mock: 'bg-text-tertiary',
};

export function SourceDot({ source }: { source: DataSource }) {
  return (
    <Tooltip label={SOURCE_LABEL[source]}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${SOURCE_DOT_CLASS[source]}`} aria-hidden="true" />
    </Tooltip>
  );
}

export function StaleBadge({ asOf }: { asOf: string }) {
  return (
    <Tooltip label={`Showing cached price as of ${new Date(asOf).toLocaleTimeString('en-IN')}`}>
      <ClockIcon className="w-3 h-3 text-stale" />
    </Tooltip>
  );
}

export function CmpCell({ holding }: { holding: EnrichedHolding }) {
  const { quote } = holding;
  if (quote.cmp === null) {
    return <Unavailable reason="Price unavailable from the data source right now." />;
  }
  return (
    <span className="inline-flex items-center gap-2">
      {quote.history && quote.history.length > 1 && (
        <Sparkline data={quote.history} width={44} height={20} fill />
      )}
      <span className="inline-flex items-center gap-1.5">
        <AnimatedNumber value={quote.cmp} format={formatINR} className="numeric-cell tabular-nums" />
        <SourceDot source={quote.source} />
        {quote.isStale && <StaleBadge asOf={quote.asOf} />}
      </span>
    </span>
  );
}

export function PresentValueCell({ holding }: { holding: EnrichedHolding }) {
  if (holding.presentValue === null) {
    return <Unavailable reason="Can't compute present value without a current price." />;
  }
  return <AnimatedNumber value={holding.presentValue} format={formatINR} className="numeric-cell" />;
}

export function GainLossCell({ holding }: { holding: EnrichedHolding }) {
  if (holding.gainLoss === null) {
    return <Unavailable reason="Can't compute gain/loss without a current price." />;
  }
  const isGain = holding.gainLoss >= 0;
  const tone = isGain ? 'gain' : 'loss';
  return (
    <FlashHighlight value={holding.gainLoss} tone={tone}>
      <span className={`inline-flex flex-col ${isGain ? 'text-gain' : 'text-loss'}`}>
        <span className="inline-flex items-center gap-1 numeric-cell font-medium">
          {isGain ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {formatINR(Math.abs(holding.gainLoss))}
        </span>
        <span className="text-[11px] numeric-cell opacity-80">{formatPct(holding.gainLossPct)}</span>
      </span>
    </FlashHighlight>
  );
}

export function PeCell({ holding }: { holding: EnrichedHolding }) {
  const { fundamentals } = holding;
  if (fundamentals.peRatio === null) {
    return <Unavailable reason="P/E ratio reports #N/A at the source." />;
  }
  return (
    <span className="inline-flex items-center gap-1.5 numeric-cell">
      {fundamentals.peRatio.toFixed(1)}
      <SourceDot source={fundamentals.peSource} />
      {fundamentals.isSuspiciousDuplicate && (
        <Tooltip label="This value is identical across multiple unrelated holdings — may be a scraping artifact. Verify manually.">
          <WarningIcon className="w-3 h-3 text-stale" />
        </Tooltip>
      )}
    </span>
  );
}

export function EarningsCell({ holding }: { holding: EnrichedHolding }) {
  const { latestEarnings, earningsSource } = holding.fundamentals;
  if (latestEarnings === null) {
    return <Unavailable reason="Latest earnings figure reports #N/A at the source." />;
  }
  const isNegative = /-\s*\d/.test(latestEarnings);
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${isNegative ? 'text-loss' : 'text-text-primary'}`}>
      {latestEarnings}
      <SourceDot source={earningsSource} />
    </span>
  );
}

export function PortfolioPctCell({ holding }: { holding: EnrichedHolding }) {
  if (holding.portfolioPct === null) return <span className="text-text-secondary">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="numeric-cell text-sm">{holding.portfolioPct.toFixed(1)}%</span>
      <span className="hidden sm:inline-block w-10 h-1.5 rounded-full bg-surface-hover overflow-hidden">
        <span
          className="block h-full bg-accent rounded-full"
          style={{ width: `${Math.min(100, holding.portfolioPct)}%` }}
        />
      </span>
    </span>
  );
}

export function ExchangeBadge({ holding }: { holding: EnrichedHolding }) {
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="text-xs font-medium text-text-secondary">{holding.exchange}</span>
      <span className="text-[11px] text-text-secondary/70 numeric-cell">{holding.exchangeCodeRaw}</span>
    </span>
  );
}

export function timeAgoLabel(iso: string | null): string {
  if (!iso) return 'never';
  return formatTimeAgo(iso);
}

export { Badge };
