/**
 * CHANGED: matched to the new layout — 2 hero-row cards on a 3-col track
 * (was 3 cards on 4-col), one narrative-line placeholder added, and the
 * chart skeleton dropped from 3 blocks to 2 (GainLossChart was removed).
 * Keeping this in lockstep with the real layout is what keeps the loading
 * state from causing a layout shift the moment real data lands.
 */
import { Skeleton } from '@/components/ui/Skeleton';

export function TableSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[20px] border border-border bg-surface p-6 h-[140px] flex flex-col gap-3 sm:col-span-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 h-[140px] flex flex-col gap-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>

      <Skeleton className="h-4 w-72 mx-1" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 h-[300px]">
            <Skeleton className="h-4 w-40 mb-3" />
            <Skeleton className="h-56 w-full" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="h-11 border-b border-border bg-surface" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 border-b border-border last:border-b-0 flex items-center px-4 gap-4">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-16 ml-auto" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
